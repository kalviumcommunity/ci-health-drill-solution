# CI-HEALTH-REPORT.md

**Repository:** ci-health-drill  
**Analyst:** Senior Reliability Engineer (Solution Reference)  
**Analysis Period:** Most recent 30 CI runs (≈ 8 weeks)  
**Report Date:** 2026-05-27  

---

## Section 1 — Executive Summary

This report covers **30 CI pipeline runs** from the most recent month of activity on the `ci-health-drill` repository. During that period, the pipeline recorded a **failure rate above 40%** — a threshold that indicates the CI system can no longer be trusted as a reliable quality gate.

The analysis identified **5 distinct risk items** across four categories:

| Priority | Count | Category |
|---|---|---|
| Critical | 2 | Merge Safety, Validation Instability |
| High | 2 | Merge Safety, Workflow Config Quality |
| Medium | 1 | Test Reliability |

**Two Critical risks** were identified:
1. **Merge Safety** — the security scan workflow has been disabled for 8 weeks via `if: false`, meaning all pushes to `main` during this period bypassed vulnerability scanning entirely.
2. **Validation Instability** — the integration-test job fails non-deterministically due to a real external HTTP call to `httpstat.us`, meaning green runs cannot be trusted as genuine validation of payment logic.

This report contains **8 recommendations**, of which **3 are Priority 1** (must be resolved before the next production release).

---

## Section 2 — Workflow Observations

### Observation 1 — Validation Instability (CRITICAL)

**Finding:**  
The `processPayment.test.js` integration test makes a live HTTP request to an external endpoint (`https://httpstat.us/200?sleep=100`) inside the CI pipeline. This test job fails non-deterministically — not due to any code change, but due to network latency, rate-limiting, or the external service being unavailable.

**Evidence:**  
- Run `#7` failed with no corresponding code change to payment logic. The error logged was:
  ```
  Error: connect ETIMEDOUT — GET https://httpstat.us/200?sleep=100
  ```
- Run `#12` failed identically with:
  ```
  Error: socket hang up — https://httpstat.us/200?sleep=100
  ```
- Runs `#3`, `#8`, `#15` passed the identical test with no code changes between any of these runs.
- The test uses `https.get()` with no mock, stub, or interceptor:
  ```js
  test('payment gateway responds successfully', (done) => {
    https
      .get('https://httpstat.us/200?sleep=100', (res) => {
        expect(res.statusCode).toBe(200);
        done();
      })
      .on('error', done);
  }, 10000);
  ```
- At time of analysis, the test had already been `test.skip`-ped in the source file, confirming awareness of the problem but no structural fix was applied.

**Impact:**  
Green runs cannot be trusted as genuine validation of payment processing logic. Engineers cannot distinguish between "the payment code is correct" and "the external HTTP endpoint responded in time." A flaky gate is worse than no gate — it trains engineers to re-run CI until they get a passing result.

---

### Observation 2 — Merge Safety: Security Scan Disabled (CRITICAL)

**Finding:**  
The `security-scan.yml` workflow has been disabled via an `if: false` conditional on the only job in the file. This means the workflow triggers on every push to `main`, but immediately skips the scan job and records a false-green result.

**Evidence:**  
- The workflow file at `.github/workflows/security-scan.yml` contains:
  ```yaml
  jobs:
    scan:
      runs-on: ubuntu-latest
      if: false    # Disabled — still broken, will fix in v1.1
  ```
- The `if: false` was introduced in commit `af8ec1c` with message:
  ```
  temp: disable scan until fixed
  ```
- The commit timestamp shows this was pushed **approximately 8 weeks ago**. No follow-up commit has re-enabled it.
- `git log --oneline` confirms the disabling commit:
  ```
  af8ec1c temp: disable scan until fixed
  ```

**Impact:**  
**8 weeks of pushes to `main` have not been scanned for dependency vulnerabilities.** Any high-severity vulnerability introduced via a dependency update during this window (e.g., in `lodash`, `jest`, or transitive packages) would have reached production undetected. The security scan exists precisely to catch such issues; its silent disablement provides false assurance of security.

---

### Observation 3 — Merge Safety: Direct Commits to Main Without PR (HIGH)

**Finding:**  
At least 6 commits are visible in the `main` branch commit graph that were pushed directly — with no associated pull request number and no evidence of peer review or CI validation on a feature branch.

**Evidence:**  
The following commits on `main` show hotfix/chore/fix patterns consistent with direct pushes, with no PR reference:

| Commit Hash | Message |
|---|---|
| `0d9287c` | `fix: quick auth patch` |
| `fbd120d` | `hotfix: urgent payment fix` |
| `4a70974` | `chore: bump version to 1.0.1` |
| `30516e1` | `fix: add debug logging to validate amount` |
| `4bcd7a9` | `refactor: clean up validate amount comments` |
| `555475f` | `ci: recheck token validation` |

None of these commits reference a PR number (e.g., `(#12)`) and none show a merge commit structure from a feature branch. This is consistent with `git push origin main` without an open pull request.

**Impact:**  
Code has reached `main` without peer review or CI validation on at least **6 occasions**. The `hotfix: urgent payment fix` commit is particularly concerning — changes to payment processing logic bypassed all automated and human review gates.

---

### Observation 4 — Workflow Configuration Quality: Test Job Sequencing and npm install (HIGH)

**Finding:**  
The CI workflow defines two jobs — `install` and `test` — but the `test` job has no `needs: install` declaration and no `npm ci` step. As a result:
1. Both jobs are dispatched in parallel to fresh runner machines.
2. The `test` job runner has no `node_modules/` directory.
3. When `npm test` executes, Jest is not found, and the job fails immediately.

**Evidence:**  
The original `ci.yml` contains:
```yaml
jobs:
  install:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '16'    # EOL as of September 2023
      - run: npm install        # Non-reproducible: resolves to latest compatible versions

  test:
    runs-on: ubuntu-latest
    # Problem: missing `needs: install` — runs in parallel on a fresh machine
    steps:
      - uses: actions/checkout@v4
      - run: npm test           # Problem: no `npm ci` before test, node_modules missing
```

The `test` job fails with:
```
sh: 1: jest: not found
```
This is logged in runs where the `install` job itself completed successfully, proving the issue is the fresh runner environment, not a code problem.

Additionally, the `install` job uses `npm install` (non-deterministic, resolves to latest within semver range) instead of `npm ci` (deterministic, requires lockfile, fails on mismatch).

**Impact:**  
Test results are unreliable even when the underlying code is correct. A developer cannot determine from a red CI run whether their code is broken or whether the pipeline is misconfigured. This has likely masked real regressions behind infrastructure noise across many runs.

---

## Section 3 — Risk Analysis Table

| Observation | Risk Category | Severity |
|---|---|---|
| Integration test external HTTP call flakiness | Validation Instability | **Critical** |
| Security scan disabled for 8 weeks | Merge Safety | **Critical** |
| 6 direct commits to main without PR | Merge Safety | **High** |
| Workflow sequencing and npm install vs npm ci | Workflow Config Quality | **High** |
| Skipped test for negative amount validation | Test Reliability | **Medium** |

---

## Section 4 — Corrective Actions

### Priority 1 Recommendations (Must fix before next production release)

**P1-1: Re-enable the security scan workflow**  
- **Change type:** Engineering  
- **Target file:** `.github/workflows/security-scan.yml`  
- **Action:** Remove `if: false` from the `scan` job. Add the security scan as a required status check in the repository's branch protection settings so it cannot be bypassed on future PRs.  
- **Expected outcome:** All pushes to `main` will be scanned for high-severity dependency vulnerabilities. Any `npm audit` finding at `--audit-level=high` will block the merge.

**P1-2: Enable branch protection rules on main**  
- **Change type:** Process / Repository configuration  
- **Target:** GitHub repository settings → Branches → Branch protection rules  
- **Action:** Require 2 approving reviews, require all CI status checks to pass (CI workflow + security scan), and disallow direct pushes to `main`.  
- **Expected outcome:** Direct commits to `main` are blocked at the platform level. All code changes must travel through a pull request with peer review and CI validation before merging.

**P1-3: Replace external HTTP call in integration tests with a mock**  
- **Change type:** Engineering  
- **Target file:** `src/payments/processPayment.test.js`  
- **Action:** Replace the live `https.get('https://httpstat.us/200?sleep=100', ...)` call with `jest.mock('https', ...)` returning a deterministic mock response. The test should validate that the `processPayment` function correctly handles the response, not that a third-party endpoint is reachable.  
- **Expected outcome:** Flake rate for the integration test drops to 0%. CI results become deterministic — a passing run means the code is correct, not that `httpstat.us` happened to respond quickly.

---

### Priority 2 Recommendations (Fix in the next sprint)

**P2-1: Add `needs: install` to test job and run `npm ci` in test job steps**  
- **Change type:** Engineering  
- **Target file:** `.github/workflows/ci.yml`  
- **Action:** Add `needs: install` to the `test` job definition. Add `npm ci` as a step in the `test` job before `npm test`.  
- **Expected outcome:** The test job reliably has `node_modules/` available. `jest: not found` failures are eliminated.

**P2-2: Upgrade Node.js version from 16 to 20 LTS**  
- **Change type:** Engineering  
- **Target file:** `.github/workflows/ci.yml`  
- **Action:** Change `node-version: '16'` to `node-version: '20'` in both workflow jobs.  
- **Expected outcome:** The pipeline runs on a supported, security-patched Node.js version. Node 16 reached end-of-life in September 2023 and no longer receives security updates.

**P2-3: Fix `package-lock.json` sync — run `npm install` to include lodash**  
- **Change type:** Engineering  
- **Action:** Run `npm install` locally to regenerate `package-lock.json` with the `lodash` dependency included. Commit the updated lockfile.  
- **Expected outcome:** `npm ci` succeeds in CI without a lockfile sync error. Dependency resolution is deterministic and auditable.

---

### Priority 3 Recommendations (Address in backlog)

**P3-1: Implement and unskip the negative amount validation test**  
- **Change type:** Engineering  
- **Target file:** `src/utils/validateAmount.test.js`  
- **Action:** Unskip the `test.skip('rejects negative amounts')` test. Verify that `validateAmount.js` handles negative amounts (the current implementation does handle it via `amount <= 0`). Commit the unskipped test.  
- **Expected outcome:** The negative amount edge case is covered in the test suite. All 7 `validateAmount` tests run and pass.

**P3-2: Add `--audit-level=moderate` to the security scan command**  
- **Change type:** Engineering  
- **Target file:** `.github/workflows/security-scan.yml`  
- **Action:** Add a second `npm audit --audit-level=moderate` step after the existing `--audit-level=high` step (or replace high with moderate to catch a broader set of vulnerabilities).  
- **Expected outcome:** The security scan catches medium-severity vulnerabilities in addition to high-severity ones, providing broader dependency vulnerability coverage.

---

## Section 5 — Reliability Evidence

### GitHub Actions Run References

The following run-level evidence was collected from the GitHub Actions tab for the `ci-health-drill` repository:

**Failing test job runs (Validation Instability — External HTTP call):**
- Run artifacts confirm `processPayment.test.js` integration test failures originating from `https://httpstat.us/200?sleep=100` with `ETIMEDOUT` and `socket hang up` errors on runs with no corresponding code change.
- Reference: `https://github.com/kalviumcommunity/ci-health-drill/actions` → filter by `CI` workflow → identify runs with ✗ on the `test` job.

**Security scan disabled (`if: false`):**
- File reference: [`.github/workflows/security-scan.yml`, line 10](file:///Users/sriman/Developer/Projects/Internship/devops%20solution%20/ci-health-drill/.github/workflows/security-scan.yml#L10)
- The `if: false` condition causes the `scan` job to be skipped on every run, producing a misleading green status.
- Disabling commit: `af8ec1c` — `"temp: disable scan until fixed"` — visible in `git log --oneline`.

**Direct commits to main (no PR):**
- Commits `0d9287c`, `fbd120d`, `4a70974`, `30516e1`, `4bcd7a9`, `555475f` are all present on `main` with no merge commit parent and no PR reference in the commit message.
- Reference: `https://github.com/kalviumcommunity/ci-health-drill/commits/main` — none of these commits show a pull request link in the GitHub commit graph.

**Workflow sequencing failure (`jest: not found`):**
- The `test` job runs on a fresh `ubuntu-latest` runner without `node_modules/`. When `npm test` runs, the shell cannot locate the `jest` binary.
- This is visible in the Actions run logs as: `sh: 1: jest: not found` with exit code 127, independent of whether the `install` job succeeded.

---

*This report was produced as the instructor reference solution for LU 2.11. All observations are backed by artifacts visible in the repository commit graph, workflow files, and GitHub Actions run logs.*
