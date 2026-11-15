# dtrack — CP1 Gate 2 vertical slice

Reference implementation for the frozen CP1 contract (see `cp1_gate1_engineering_contract.md`):
driver location capture → backend relay → customer map render.

## Run it

1. **Backend:**
   ```
   cd backend
   npm install
   npm start        # listens on :3000
   ```
2. **App:**
   ```
   npm install
   # set your Mapbox token, e.g.:
   # export EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.xxxx  (also add to .env for Expo to pick up)
   npm start         # Expo dev server; open on Driver and Customer routes
   ```
   `App.js` now creates an order (via `POST /orders`) before mounting either screen, and passes its `orderId`/`token` down as props — both screens need that token for every backend call.

3. **Tests:**
   ```
   npm test
   ```
   Runs `locationService.test.js` (adaptive tracker + failure path), `accuracyOracle.test.js` (independent AC-1 oracle).

4. **Gate 3 comparison harness:**
   ```
   node scripts/compareBaselineVsCandidate.js [numChanges] [pollIntervalMs]
   ```
   Creates its own order, runs baseline polling and candidate push side by side, writes raw evidence to `docs/gate3-raw-results/`.

## Where the evidence lives
- Gate 2: `docs/TRADEOFF_ANALYSIS.md`, `docs/TEST_PLAN.md`, `docs/BASELINES_TEMPLATE.md`
- Gate 3: `docs/GATE3_EXPERIMENT_DESIGN.md`, `docs/GATE3_RESULTS_TEMPLATE.md`, raw runs in `docs/gate3-raw-results/`
- Gate 4: `docs/GATE4_INTEGRATION_DESIGN.md` — interface contracts, degraded-mode behavior, recovery proof checklist
- Runtime logs: `backend/failure.log` (dropped/invalid/unauthorized events), `backend/telemetry.log` (client + server events)

## What's deliberately still open
Location updates remain poll-based on the customer side (push is proven out for status in Gate 3; extending it to location is a natural Gate 5-or-later step). The ETA destination is hardcoded rather than pulled from a real order/address flow.
