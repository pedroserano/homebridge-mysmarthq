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
export interface SmartHQCredentials {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    wssUrl: string;
    wssToken: string;
}
export interface ApplianceInfo {
    applianceId: string;
    applianceType: string;
    nickname: string;
    modelNumber: string;
    serialNumber: string;
}
export declare class SmartHQAuthClient {
    private readonly username;
    private readonly password;
    private readonly region;
    private readonly http;
    private readonly authBase;
    private readonly apiBase;
    private readonly wssBase;
    private credentials;
    constructor(username: string, password: string, region?: string);
    private getAuthorizationCode;
    private exchangeCodeForTokens;
    private getWssCredentials;
    login(): Promise<SmartHQCredentials>;
    refreshAccessToken(): Promise<SmartHQCredentials>;
    getValidCredentials(): Promise<SmartHQCredentials>;
    getAppliances(accessToken: string): Promise<ApplianceInfo[]>;
}
