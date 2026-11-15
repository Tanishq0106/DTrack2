# Gate 2 Test Plan

## Independent oracle
`fixtures/groundTruth.json` holds a simulated GPS track (lat/lon/timestamp points) that stands in for an authoritative reference log — in a real trial this file is replaced by output from the phone's OS-level location service or a second logging device, captured on the *same* physical walk/drive as the app-under-test. The app's own reported positions are never used to validate themselves (Section 4 of the frozen contract).

## Executable fixtures
- `fixtures/groundTruth.json` — reference track, area "A" (first spatially disjoint zone)
- `fixtures/groundTruth_areaB.json` — reference track, area "B" (second disjoint zone), used for AC-4 coverage

## Unit tests (`__tests__/`)
- `locationService.test.js` — verifies the capture wrapper emits `{ lat, lon, timestamp }` records and handles a permission-denied path without crashing (supports H5/N5: no silent failure)
- `accuracyOracle.test.js` — the independent oracle: computes distance (Haversine) between candidate and ground-truth points and asserts against a placeholder AC-1 threshold; run once per disjoint area to produce AC-4 coverage

## Resource profile
Battery % and network bytes are sampled immediately before and after a fixed-duration (e.g. 10-minute) tracking session using OS-level counters, recorded in `docs/BASELINES_TEMPLATE.md`. This is a **measurement**, not an optimization, per the frozen contract's scope boundary.

## Failure log
Every dropped/failed location update (permission revoked, network unreachable, backend 5xx) is appended to a failure log (`backend/failure.log` at runtime) rather than being silently discarded — this is the evidence for the mandatory negative test in the Assurance stage.

## Baseline values to report
See `docs/BASELINES_TEMPLATE.md` — filled in from real device/session data, not fixture data, once the app is run on an actual phone.
