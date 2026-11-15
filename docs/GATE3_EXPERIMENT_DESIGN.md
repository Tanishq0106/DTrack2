# CP2 Gate 3 — Experiment Design
**Objective (O3):** Engineer and prove the differentiating contribution — efficient real-time status updates to customers — and compare it against O2 (the Gate 2 reference: REST polling) under the same evidence and resource envelope.

## Baseline (O2) vs Candidate (O3)

| | Baseline — REST polling | Candidate — WebSocket push |
|---|---|---|
| Mechanism | Customer app calls `GET /orders/:id/status` every N seconds (same pattern as Gate 2's location polling) | Customer app opens a Socket.IO connection, joins a room for the order, and receives a `statusUpdate` event the moment the backend emits one |
| Where it lives | `src/services/statusService.js` → `pollStatus()` | `src/services/statusService.js` → `subscribeStatus()` |
| Backend | `GET /orders/:orderId/status` | Socket.IO `statusUpdate` event, room-scoped per order |

**Same evidence, same resource envelope:** both approaches are measured against the *same sequence* of simulated status changes, over the *same session duration*, hitting the *same backend instance* — so any latency/bandwidth difference is attributable to the mechanism, not to different test conditions.

## Metrics
- **Latency:** time between a status change happening on the backend and each client (polling vs push) observing it
- **Bandwidth (proxy):** total request/message count × approximate payload size over the session, for each approach
- **Failure rate:** missed or delayed updates under degraded conditions

## Ablations / sensitivity / controlled experiments
- **A1 — Polling interval sensitivity:** baseline run at 1s, 3s, 10s intervals — expected trade-off: shorter interval improves latency but increases bandwidth roughly linearly
- **A2 — Push reconnection robustness:** candidate with vs without reconnection/backoff logic, under a simulated connection drop mid-session
- **A3 — Update frequency sensitivity:** both approaches under low-frequency (1 status change/session) vs high-frequency (rapid status churn) conditions

## Traceability
Each run's raw output is saved under `docs/gate3-raw-results/<timestamp>.json` (see `scripts/compareBaselineVsCandidate.js`). Every claim in the final Gate 3 report must cite the specific raw-results file it's drawn from — this is what "trace from each claim to its acceptance result" requires.

## Defensible conclusion criteria (fill in with real thresholds before the final run)
- Candidate is accepted if: median push latency < baseline's best-interval (1s) latency, **and** candidate bandwidth is lower than baseline at the 3s interval (the interval Gate 2 already established as the working default)
- If candidate wins on latency but loses on bandwidth (or vice versa), report it as an explicit trade-off rather than a one-sided win — per the frozen contract's evenhandedness expectation for CP2 evidence
