"use strict";
/**
 * SmartHQ Authentication Client
 *
 * Implements the OAuth2 flow used by the GE SmartHQ API:
 *   1. POST credentials → authorization code
 *   2. Exchange code → access_token + refresh_token
 *   3. Exchange access_token → WSS endpoint + ws_token
 *
 * Base URL: https://accounts.brillion.geappliances.com
 * EU Base:  https://accounts.brillion.geappliances.eu
 *
 * All ERD values are hex strings without "0x" prefix, JSON-encoded.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartHQAuthClient = void 0;
const axios_1 = __importDefault(require("axios"));
// ─── Constants ────────────────────────────────────────────────────────────────
const AUTH_URLS = {
    US: 'https://accounts.brillion.geappliances.com',
    EU: 'https://accounts.brillion.geappliances.eu',
};
const API_URLS = {
    US: 'https://api.brillion.geappliances.com',
    EU: 'https://api.brillion.geappliances.eu',
};
const WSS_URLS = {
    US: 'wss://api.brillion.geappliances.com/v1/websocket',
    EU: 'wss://api.brillion.geappliances.eu/v1/websocket',
};
// Client ID used by the official SmartHQ mobile app (reverse engineered)
const CLIENT_ID = 'HiXmMfBjZzxpNGgqbdVaqvKEkwCQROuJVEuT6AQ0gSE=';
const CLIENT_SECRET = 'gDuTkRHOI0itUW1v0ikO7C4GEnDuZ5oi0xKkfRJQXJdcRm7nVh6a3Ye91wdVpRjT';
const REDIRECT_URI = 'brillion://auth/callback';
// ─── Auth Client ──────────────────────────────────────────────────────────────
class SmartHQAuthClient {
    constructor(username, password, region = 'US') {
        this.username = username;
        this.password = password;
        this.region = region;
        this.credentials = null;
        this.authBase = AUTH_URLS[region] ?? AUTH_URLS['US'];
        this.apiBase = API_URLS[region] ?? API_URLS['US'];
        this.wssBase = WSS_URLS[region] ?? WSS_URLS['US'];
        this.http = axios_1.default.create({ timeout: 15000 });
    }
    // ── Step 1: Get OAuth2 authorization code via ROPC (Resource Owner Password) ──
    async getAuthorizationCode() {
        const url = `${this.authBase}/oauth2/auth`;
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: CLIENT_ID,
            redirect_uri: REDIRECT_URI,
            access_type: 'offline',
            scope: 'openid',
        });
        // Step 1a: GET the auth page to obtain the CSRF/session cookies
        const authPageResp = await this.http.get(`${url}?${params}`, {
            maxRedirects: 0,
            validateStatus: s => s < 400,
        });
        // Step 1b: POST credentials to the login endpoint
        const loginUrl = `${this.authBase}/oauth2/login`;
        const formData = new URLSearchParams({
            client_id: CLIENT_ID,
            redirect_uri: REDIRECT_URI,
            response_type: 'code',
            access_type: 'offline',
            scope: 'openid',
            username: this.username,
            password: this.password,
        });
        const cookie = (authPageResp.headers['set-cookie'] ?? [])
            .map((c) => c.split(';')[0])
            .join('; ');
        const loginResp = await this.http.post(loginUrl, formData.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookie,
            },
            maxRedirects: 0,
            validateStatus: s => s === 302 || s === 200,
        });
        // Code is in the Location header: brillion://auth/callback?code=XXXXX
        const location = loginResp.headers['location'] ?? '';
        const match = location.match(/[?&]code=([^&]+)/);
        if (!match) {
            throw new Error(`SmartHQ auth failed: no code in redirect. Status=${loginResp.status} Location=${location}`);
        }
        return decodeURIComponent(match[1]);
    }
    // ── Step 2: Exchange code for tokens ─────────────────────────────────────────
    async exchangeCodeForTokens(code) {
        const url = `${this.authBase}/oauth2/token`;
        const body = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: REDIRECT_URI,
        });
        const resp = await this.http.post(url, body.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const { access_token, refresh_token, expires_in } = resp.data;
        if (!access_token)
            throw new Error('SmartHQ token exchange failed: no access_token');
        return {
            accessToken: access_token,
            refreshToken: refresh_token,
            expiresIn: expires_in ?? 3600,
        };
    }
    // ── Step 3: Get WSS endpoint and ws_token from the REST API ──────────────────
    async getWssCredentials(accessToken) {
        const url = `${this.apiBase}/v1/websocket`;
        const resp = await this.http.get(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        const wssEndpoint = resp.data?.endpoint ?? this.wssBase;
        const wssToken = resp.data?.token ?? accessToken;
        return { wssUrl: wssEndpoint, wssToken };
    }
    // ── Public: Full login flow ───────────────────────────────────────────────────
    async login() {
        const code = await this.getAuthorizationCode();
        const { accessToken, refreshToken, expiresIn } = await this.exchangeCodeForTokens(code);
        const { wssUrl, wssToken } = await this.getWssCredentials(accessToken);
        this.credentials = {
            accessToken,
            refreshToken,
            expiresAt: Date.now() + (expiresIn - 60) * 1000,
            wssUrl,
            wssToken,
        };
        return this.credentials;
    }
    // ── Token refresh ─────────────────────────────────────────────────────────────
    async refreshAccessToken() {
        if (!this.credentials?.refreshToken)
            throw new Error('No refresh token available');
        const url = `${this.authBase}/oauth2/token`;
        const body = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: this.credentials.refreshToken,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
        });
        const resp = await this.http.post(url, body.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const { access_token, refresh_token, expires_in } = resp.data;
        const { wssUrl, wssToken } = await this.getWssCredentials(access_token);
        this.credentials = {
            accessToken: access_token,
            refreshToken: refresh_token ?? this.credentials.refreshToken,
            expiresAt: Date.now() + (expires_in - 60) * 1000,
            wssUrl,
            wssToken,
        };
        return this.credentials;
    }
    async getValidCredentials() {
        if (!this.credentials)
            return this.login();
        if (Date.now() >= this.credentials.expiresAt)
            return this.refreshAccessToken();
        return this.credentials;
    }
    // ── REST: Fetch appliance list ────────────────────────────────────────────────
    async getAppliances(accessToken) {
        const url = `${this.apiBase}/v1/appliances`;
        const resp = await this.http.get(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        // Response is an array of appliance objects
        const items = resp.data?.items ?? resp.data ?? [];
        return items.map(item => ({
            applianceId: item.applianceId ?? item.mac_addr ?? '',
            applianceType: item.applianceType ?? '0x00',
            nickname: item.nickname ?? item.name ?? 'GE Appliance',
            modelNumber: item.modelNumber ?? '',
            serialNumber: item.serialNumber ?? '',
        }));
    }
}
exports.SmartHQAuthClient = SmartHQAuthClient;
