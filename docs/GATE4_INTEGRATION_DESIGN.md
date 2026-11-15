# CP2 Gate 4 — Complete Operable System

**Objective (O4):** Connect the evidence path (reference + contribution), the user/operator interface, configuration, security/safety controls, telemetry, degraded mode, and recovery into one operating system — and add the AI ETA/route feature plus battery/bandwidth optimization.

## What's new since Gate 3

| Area | Gate 2/3 state | Gate 4 state |
|---|---|---|
| Location capture | Fixed high-accuracy, fixed interval | `AdaptiveTracker` (`src/services/locationService.js`) switches to a lower-power mode after the driver has been stationary for `config.location.stationaryAfterMs` |
| ETA/routing | None | `src/services/etaService.js` — Mapbox Directions API, with an automatic haversine-based fallback if the API is disabled, unreachable, or errors |
| Security | Order IDs guessable, no access control | Every order gets a bearer token at creation (`POST /orders`); all location/status endpoints and the Socket.IO `joinOrder` handshake require it |
| Telemetry | Only a local failure log | `POST /telemetry` on the backend + `backend/telemetry.log`, plus `ORDER_CREATED` and `SOCKET_UNAUTHORIZED` events already wired in |
| Degraded mode | Customer showed a "stale" banner if location was old | Adds a separate backend-health check (`GET /health`, `checkBackendHealth()`) so "backend is down" is distinguishable from "this order has no data yet"; ETA degrades to the fallback estimate instead of failing; status falls back from push to polling if the socket can't connect |
| Recovery | None (a failed push was just dropped) | `src/services/api.js` retries a failed location push on the backoff schedule in `config.network.locationPushRetryBackoffMs` before giving up and logging it |
| Configuration | Scattered magic numbers per file | Centralized in `src/config.js` — one place to read or tune every interval/threshold |

## Interface contracts (frozen for Gate 4)

| Endpoint / event | Auth | Purpose |
|---|---|---|
| `POST /orders` | none (issues the credential) | Creates an order, returns `{ orderId, token }` |
| `GET /health` | none | Liveness check for degraded-mode detection |
| `POST /telemetry` | none | Client-side event ingestion |
| `POST /orders/:id/location` | Bearer token | Driver pushes a location reading |
| `GET /orders/:id/location` | Bearer token | Customer reads the latest location |
| `POST /orders/:id/status` | Bearer token | Sets order status, triggers the Socket.IO push |
| `GET /orders/:id/status` | Bearer token | Baseline polling read of status |
| Socket.IO `joinOrder` | `{ orderId, token }` payload, validated server-side | Subscribes a client to that order's `statusUpdate` events; emits `joinError` on rejection |

## Degraded-mode behavior, by failure

| Failure | Behavior |
|---|---|
| Backend unreachable | `checkBackendHealth()` fails → red banner distinct from the stale-location banner; app keeps showing last-known data rather than blanking |
| Location push fails | Retried on `[1s, 3s, 8s]` backoff before being logged as exhausted; no single blip drops data |
| Status socket won't connect | `subscribeStatus`'s `onError` callback triggers a fallback to `pollStatus` — same status feature, degraded mechanism |
| Directions API fails/disabled | `getEta` falls back to a haversine + assumed-average-speed estimate, tagged `source: 'fallback'` so the UI (and any evidence report) can distinguish it from a real routed ETA |
| Invalid/missing token | 401 from REST, `joinError` from the socket — logged as `UNAUTHORIZED` / `SOCKET_UNAUTHORIZED` in the failure log |

## Recovery proof
Run the app through a session where you (a) briefly stop the backend and restart it, (b) toggle Wi-Fi off/on on the phone mid-session, and (c) let the driver stand still long enough to trigger the stationary tracking mode. Capture: the red backend-health banner appearing and clearing, at least one retried-then-succeeded location push in the console log, and `trackingMode` visibly switching to `stationary` on the Driver screen. That three-part capture is the recovery evidence this gate asks for — save the screen recording/logs alongside the Final Gate's demonstration video.
