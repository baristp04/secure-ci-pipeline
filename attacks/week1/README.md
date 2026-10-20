# Week 1 Attack: Bypassing the protected branch

**Attacker:** A contributor who can open PRs but should not have direct write access to `main`.
**Goal:** Get code into `main` without going through review and CI.
**Defense:** `main` ruleset (`docs/main-ruleset.json`) + `.github/CODEOWNERS` + required check `build-and-test`.

## Scenarios to try

| # | Scenario | Expected result | Blocking rule |
|---|---|---|---|
| 1 | Direct `git push` to `main` | **Should be blocked** (push rejected, `GH013: Repository rule violations`) | `pull_request` rule |
| 2 | `git push --force` to `main` (rewriting history) | **Should be blocked** | `non_fast_forward` |
| 3 | Deleting the `main` branch (`git push origin :main`) | **Should be blocked** | `deletion` |
| 4 | Opening a PR and merging without approval | **Should be blocked** (Merge button disabled) | `pull_request` → 1 approval |
| 5 | Approving your own PR | **Should be blocked** (GitHub does not let an author approve their own PR) | GitHub rule + `pull_request` |
| 6 | Pushing a new commit to a PR after approval, then merging | **Should be blocked** (approval is dismissed, re-approval required) | `dismiss_stale_reviews_on_push` |
| 7 | Merging a change to `.github/workflows/` or `package.json` with approval from a non-CODEOWNER | **Should be blocked** | `require_code_owner_review` |
| 8 | Merging while CI is red (e.g. a broken test) | **Should be blocked** | `required_status_checks: build-and-test` |

## Results

<!-- For each scenario: date, account used, command/steps, actual result (blocked/passed), screenshot or error output, and the related PR/issue link if any (attack-week-1 label). -->

| # | Date | Account | Actual result | Evidence |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |
| 6 | | | | |
| 7 | | | | |
| 8 | | | | |

## Observations / open issues

