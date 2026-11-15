# Gate 2 Baseline Values (fill in from real device sessions)

| Metric | Area A | Area B | Notes |
|---|---|---|---|
| **AC-1** Location accuracy (median / p95, meters) | TBD | TBD | Haversine distance vs `groundTruth*.json` |
| **AC-2** Update latency (median / worst-case, seconds) | TBD | — | capture timestamp → customer-app render timestamp |
| **AC-3** Battery drain (%/hour) | TBD | — | OS battery API, 10-min session extrapolated |
| **AC-3** Bandwidth (MB/hour) | TBD | — | OS network usage counters |
| **AC-4** Independent-area coverage (%) | (Area A pass/fail) | (Area B pass/fail) | % of areas meeting the AC-1 target |

## Negative test result (mandatory)
| Scenario | Expected | Observed | Pass/Fail |
|---|---|---|---|
| Backend unreachable mid-session | Update logged to failure log, no crash, customer app shows "stale" indicator rather than a frozen-but-unlabeled position | TBD | TBD |

## Gate 2 decision
- [ ] All four AC baselines recorded
- [ ] Negative test passes
- [ ] Decision: **Accept / Revise / Stop** (per Operation node) — TBD
