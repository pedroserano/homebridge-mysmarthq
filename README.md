# homebridge-smarthq

A Homebridge plugin for **GE Home Appliances (SmartHQ)** that exposes your WiFi-connected GE appliances to Apple HomeKit via the [SmartHQ](https://www.geappliances.com/connect) cloud API.

---

## Supported Appliances

| Appliance | HomeKit Services |
|---|---|
| Refrigerator | Temperature sensors (fridge + freezer), door contact sensors, ice maker switch |
| Oven / Range | Temperature sensor per cavity, on/off monitoring, remote off command |
| Dishwasher | Cycle active switch (read-only), door contact sensor, rinse-aid-low occupancy sensor |
| Washer | Cycle active switch, door contact sensor, door lock |
| Dryer | Cycle active switch, door contact sensor |
| Air Conditioner | HeaterCooler service: active, temperature, fan speed, mode (cool/heat/fan) |

> **Safety note:** Oven accessories only allow turning the oven **off** remotely. Remote ignition is intentionally blocked.

---

## Requirements

- **Node.js** ≥ 18.0.0
- **Homebridge** ≥ 1.6.0
- A GE SmartHQ account with at least one connected appliance
- You must have accepted the Terms of Use at **https://accounts.brillion.geappliances.com**

---

## Installation

```bash
npm install -g homebridge-smarthq
```

Or via Homebridge UI → Plugins → search `homebridge-smarthq`.

---

## Configuration

Add to your Homebridge `config.json`:

```json
{
  "platforms": [
    {
      "platform": "SmartHQ",
      "name": "SmartHQ",
      "username": "your@email.com",
      "password": "yourpassword",
      "region": "US",
      "refreshInterval": 30,
      "debug": false
    }
  ]
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `username` | string | **required** | SmartHQ account email |
| `password` | string | **required** | SmartHQ account password |
| `region` | `"US"` or `"EU"` | `"US"` | Your account region |
| `refreshInterval` | number | `30` | Polling fallback interval in seconds (10–300) |
| `debug` | boolean | `false` | Enable verbose WebSocket logging |

---

## Architecture

```
Homebridge
  └── SmartHQPlatform (src/platform.ts)
        ├── SmartHQAuthClient (src/api/authClient.ts)
        │     OAuth2 ROPC flow → access_token + refresh_token → WSS token
        │     Endpoints: https://accounts.brillion.geappliances.com
        │
        ├── SmartHQClient (src/api/wsClient.ts)
        │     Persistent WebSocket connection to SmartHQ cloud
        │     - Subscribes to each appliance on connect
        │     - Maintains local ERD state cache
        │     - Emits 'erdUpdate' events for real-time push updates
        │     - Auto-reconnects with exponential back-off
        │
        └── Accessories (src/accessories/)
              RefrigeratorAccessory
              OvenAccessory
              DishwasherAccessory
              LaundryAccessory
              AirConditionerAccessory
```

### API Protocol

The SmartHQ API uses three transport layers (only WebSocket is implemented here):

1. **REST** — poll `GET /v1/appliances/{id}/erd/{erdCode}` — not used (too slow)
2. **WebSocket "MQTT"** — subscribe to appliance, receive push ERD updates ✅
3. **XMPP** — deprecated and removed from gehomesdk

All device properties are represented as **ERD codes** (hex, e.g. `0x1004`) with values encoded as hex strings (no `0x` prefix, e.g. `"003c"` = 60).

### Authentication Flow

```
POST /oauth2/login  (username + password)
  → 302 redirect with ?code=XXXX

POST /oauth2/token  (code + client_id + client_secret)
  → { access_token, refresh_token, expires_in }

GET  /v1/websocket  (Bearer access_token)
  → { endpoint: "wss://...", token: "..." }

WSS  wss://api.brillion.geappliances.com/v1/websocket?access_token=...
  → subscribe to appliances, receive ERD updates
```

Tokens are refreshed automatically before expiry. The WebSocket reconnects with exponential back-off (5s → 10s → 20s → ... → 60s max).

---

## Building from Source

```bash
git clone https://github.com/you/homebridge-smarthq
cd homebridge-smarthq
npm install
npm run build       # compiles TypeScript → dist/
npm run watch       # watch mode for development
```

---

## Adding a New Appliance Type

1. Add ERD codes to `src/api/erdCodes.ts`
2. Create `src/accessories/myAppliance.ts` extending `BaseAccessory`
   - Implement `setupServices()` — add HomeKit Services
   - Implement `onErdUpdate(erd, value)` — handle incoming state
3. Add a `case` in `SmartHQPlatform.createAccessory()` in `src/platform.ts`

### Figuring out ERD codes for your appliance

Install `gehomesdk` and run the appliance data logger:

```bash
pip install gehomesdk
gehome-appliance-data -u your@email.com -p password -r US
```

This logs all ERD codes and values as they change — useful for mapping hex codes to real appliance functions.

---

## Troubleshooting

**Authentication fails:**
- Verify credentials at https://accounts.brillion.geappliances.com
- Accept the Terms of Use on that page — this is required

**Appliances don't appear:**
- Enable `debug: true` in config and check Homebridge logs
- Ensure appliances are visible in the official SmartHQ app
- Try removing cached accessories: stop Homebridge, delete the `.homebridge/accessories/cachedAccessories` file, restart

**Values not updating:**
- The WebSocket uses cloud push — check internet connectivity
- Polling fallback runs every `refreshInterval` seconds
- Some older appliances only support the REST API and won't push updates

---

## License

MIT — see LICENSE
