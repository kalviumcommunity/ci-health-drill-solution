# CI-HISTORY-ANALYSIS.md

**Repository:** ci-health-drill  
**Analysis Period:** 30 most recent CI runs  
**Analyst:** Senior Reliability Engineer (Solution Reference)  

---

## 30-Run Analysis Table

| Run # | Trigger Commit | Branch | Workflow | Result | Failure Category | Flaky / Consistent |
|---|---|---|---|---|---|---|
| 1 | `0311ceb` — initial platform setup | main | CI | ✗ FAIL | jest: not found (no npm ci in test job) | Consistent |
| 2 | `fbd120d` — hotfix: urgent payment fix | main | CI | ✗ FAIL | jest: not found | Consistent |
| 3 | `fbd120d` — hotfix: urgent payment fix | main | Security Scan | ✓ SKIP | if: false — scan disabled | Consistent |
| 4 | `0d9287c` — fix: quick auth patch | main | CI | ✗ FAIL | jest: not found | Consistent |
| 5 | `4a70974` — chore: bump version to 1.0.1 | main | CI | ✗ FAIL | jest: not found | Consistent |
| 6 | `4a70974` — chore: bump version to 1.0.1 | main | Security Scan | ✓ SKIP | if: false — scan disabled | Consistent |
| 7 | `af8ec1c` — temp: disable scan until fixed | main | CI | ✗ FAIL | External HTTP timeout (ETIMEDOUT) | Flaky |
| 8 | `af8ec1c` — temp: disable scan until fixed | main | Security Scan | ✓ SKIP | if: false — scan disabled | Consistent |
| 9 | `30516e1` — fix: add debug logging | main | CI | ✓ PASS | — | — |
| 10 | `30516e1` — fix: add debug logging | main | Security Scan | ✓ SKIP | if: false — scan disabled | Consistent |
| 11 | `4bcd7a9` — refactor: clean up comments | main | CI | ✓ PASS | — | — |
| 12 | `555475f` — ci: recheck token validation | main | CI | ✗ FAIL | External HTTP socket hang up | Flaky |
| 13 | `555475f` — ci: recheck token validation | main | Security Scan | ✓ SKIP | if: false — scan disabled | Consistent |
| 14 | `f51f14a` — ci: verify payment flow | main | CI | ✗ FAIL | jest: not found | Consistent |
| 15 | `f51f14a` — ci: verify payment flow | main | Security Scan | ✓ SKIP | if: false — scan disabled | Consistent |
| 16 | `af8ec1c` — re-run same commit | main | CI | ✓ PASS | — | — |
| 17 | `22d3b40` — fix: re-enable gateway test | main | CI | ✗ FAIL | External HTTP ETIMEDOUT | Flaky |
| 18 | `22d3b40` — fix: re-enable gateway test | main | Security Scan | ✓ SKIP | if: false — scan disabled | Consistent |
| 19 | `2d90333` — chore: improve payment logging | main | CI | ✓ PASS | — | — |
| 20 | `2d90333` — chore: improve payment logging | main | Security Scan | ✓ SKIP | if: false — scan disabled | Consistent |
| 21 | `2294e50` — fix: note stricter token validation | main | CI | ✗ FAIL | jest: not found (re-run triggers new runner) | Consistent |
| 22 | `2294e50` — fix: note stricter token validation | main | Security Scan | ✓ SKIP | if: false — scan disabled | Consistent |
| 23 | `e497451` — docs: add newline to readme | main | CI | ✓ PASS | — | — |
| 24 | `e497451` — docs: add newline to readme | main | Security Scan | ✓ SKIP | if: false — scan disabled | Consistent |
| 25 | `8850966` — fix: document edge cases | main | CI | ✗ FAIL | External HTTP rate limit (429 response) | Flaky |
| 26 | `8850966` — fix: document edge cases | main | Security Scan | ✓ SKIP | if: false — scan disabled | Consistent |
| 27 | `aea721e` — update: skip flaky gateway test | main | CI | ✓ PASS | — | — |
| 28 | `aea721e` — update: skip flaky gateway test | main | Security Scan | ✓ SKIP | if: false — scan disabled | Consistent |
| 29 | `2abfb08` — first commit (re-init) | main | CI | ✓ PASS | — | — |
| 30 | `2abfb08` — first commit (re-init) | main | Security Scan | ✓ SKIP | if: false — scan disabled | Consistent |

---

## Failure Rate Calculation

| Metric | Value |
|---|---|
| Total runs analyzed | 30 |
| Genuine PASS | 8 |
| FAIL (genuine failure) | 13 |
| SKIP (security scan — if: false) | 9 |
| Overall failure rate (FAIL / total) | **43.3%** |
| Failure rate excluding security scan SKIP | **13 / 21 = 61.9%** |

> **Note:** The 9 Security Scan runs recorded as SKIP are not genuine passes — they are silently skipped due to `if: false`. If counted as failures (scan did not execute), the effective failure/non-completion rate is **22/30 = 73.3%**.

---

## Failure Classification

### Consistent Failures (infrastructure/config — always fail)

| Failure Type | Root Cause | Affected Runs |
|---|---|---|
| `jest: not found` (exit 127) | `test` job runs on fresh runner with no `node_modules`; missing `needs: install` and `npm ci` | #1, #2, #4, #5, #14, #21 |
| Security scan silently skipped | `if: false` in `security-scan.yml` | #3, #6, #8, #10, #13, #15, #18, #20, #22, #24, #26, #28, #30 |

### Flaky Failures (non-deterministic — depend on external state)

| Failure Type | Root Cause | Affected Runs |
|---|---|---|
| `ETIMEDOUT` — `https://httpstat.us/200?sleep=100` | External HTTP call in integration test; network latency in CI runner | #7, #17 |
| `socket hang up` — `https://httpstat.us` | External HTTP service dropped connection mid-request | #12 |
| HTTP 429 rate limit from `httpstat.us` | External HTTP service rate-limited the CI runner IP | #25 |

---

## Summary of Risk Classification

| Category | Risk | Severity |
|---|---|---|
| Validation Instability | Integration test non-determinism via external HTTP | Critical |
| Merge Safety | Security scan disabled via `if: false` for 8 weeks | Critical |
| Merge Safety | 6+ direct commits to `main` without PR | High |
| Workflow Config Quality | Missing `needs: install`, `npm ci`, outdated Node 16 | High |
| Test Reliability | Skipped negative amount validation test | Medium |

---

*This analysis table was reconstructed from the GitHub Actions run log and the repository commit graph. Run numbers are assigned sequentially from oldest to most recent within the 30-run window.*
