# ci-health-drill

Payment platform CI pipeline — LU 2.11 Health Report Assignment.

## CI Health Status

| Risk Category | Severity | Count |
|---|---|---|
| Merge Safety | Critical | 2 issues |
| Validation Instability | Critical | 1 issue |
| Workflow Config Quality | High | 1 issue |
| Test Reliability | Medium | 1 issue |

## Files

| File | Purpose |
|---|---|
| `CI-HEALTH-REPORT.md` | Full five-section CI health analysis |
| `CI-HISTORY-ANALYSIS.md` | 30-run analysis table and classification |
| `.github/workflows/ci.yml` | Fixed CI workflow |
| `.github/workflows/security-scan.yml` | Re-enabled security scan |

## Fixes Applied in This PR

- `npm install` changed to `npm ci` in `ci.yml`
- Node.js version updated to 20 LTS
- Test job `needs: install` and `npm ci` steps added
- Security scan re-enabled (removed `if: false`)
- `package-lock.json` regenerated with lodash
- External HTTP call in integration test replaced with `jest.mock`
- Negative amount validation test unskipped
