# Gate 3 Results — Baseline (Polling) vs Candidate (Push)

## Sandbox verification run (proves the harness works — not the real Gate 3 evidence)
Source: `docs/gate3-raw-results/sample-sandbox-run.json`, 6 simulated status changes, 3s poll interval, run against the local backend (not a real device/network).

| | Baseline — polling | Candidate — push |
|---|---|---|
| Status changes observed | 2 of 6 | 6 of 6 |
| Median latency | 456 ms | 3 ms |
| Mean latency | 447 ms | 6.3 ms |
| Bandwidth proxy (bytes) | 360 | 840 |

**Early read (sandbox only, not yet real-device evidence):** push wins decisively on latency and, more importantly, on *completeness* — polling at 3s intervals missed 4 of 6 rapid status changes entirely because they happened faster than the poll could catch, while push caught every one. Bandwidth is higher for push in this short/rapid-change run; per the experiment design's A3 ablation, this trade-off should be re-checked at realistic status-change frequencies (real orders change status maybe 4-5 times over 20-40 minutes, not 6 times in 6 seconds) — polling's bandwidth advantage may shrink or disappear once send frequency is realistic, since push only sends on actual changes while polling sends on a fixed timer regardless of whether anything changed.

## Real Gate 3 run (fill in after running on real devices / real network conditions)

| | Baseline — polling (best interval: ___s) | Candidate — push |
|---|---|---|
| Status changes observed | | |
| Median latency | | |
| Mean latency | | |
| Bandwidth proxy (bytes) | | |
| Failure rate (degraded network) | | |

**A1 — polling interval sensitivity (1s / 3s / 10s):** TBD
**A2 — push reconnection robustness:** TBD
**A3 — realistic update-frequency comparison:** TBD

## Conclusion
- [ ] Candidate accepted / rejected / accepted-with-tradeoff (per criteria in GATE3_EXPERIMENT_DESIGN.md)
- Raw evidence file(s) this conclusion is traced to: ___
