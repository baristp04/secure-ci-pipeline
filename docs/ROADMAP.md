# Secure CI Pipeline for GitHub Repositories: Weekly Roadmap (Node.js)

## Project summary

An automated CI security gate for GitHub repositories. On every push and pull request, secret scanning, SAST and SCA (dependency) checks run. If a risk is found, required status checks and protected workflow files block the merge.

**Attacker:** A malicious or compromised contributor who can open PRs but cannot write directly to protected branches; or an external attacker who publishes a malicious package or compromises a third-party dependency or GitHub Action.

**Attacker goal:** Plant a persistent backdoor in `main`, steal secrets (API keys, tokens), disable or bypass security controls to slip in a vulnerable or malicious package.

## Working method

- A new attack is attempted every week. If a gap is found, a defense is added to the pipeline. Attacks from previous weeks are re-run (regression).
- An `attacks/weekN/` folder is created in the repo. Each attack is stored as a script or PR template.
- Each attack is opened as a PR/issue labeled `attack-week-N`. The result (blocked / passed) and the countermeasure taken are recorded there. The instructor can follow it as a contributor.
- Target application: a small **Express** app (REST API, a few routes, a data layer) with `package.json` + `package-lock.json`.

## Safety boundaries

- Work only in your own repo.
- Secrets must be fake/canary. Do not use real keys.
- **Do not publish** malicious package simulations to the **real npm registry**. Use a local registry (Verdaccio).
- Beacons/canaries must be only a harmless local request or log line.

## Week 1: Setup and baseline

**Attack:** Direct push to `main`, merge without approval, merging a PR with no review on your own.

**Preparation:**
- Sample code with an Express app, a few outdated dependencies and a fake secret.
- Basic workflow: `npm ci`, `eslint`, tests (Jest or `node --test`).

**Defense:**
- Branch ruleset: PR required, at least 1 review, no force push.
- `CODEOWNERS` file.
- Use `npm ci` (lockfile-faithful install).

## Week 2: Secret leakage

**Attack:** Adding a fake API key/token to a PR. Variants: plain text, base64, split string, `.env` file, embedded in an old commit, inside a `package.json` script.

**Defense:**
- **Gitleaks** (or TruffleHog) in the workflow, scanning the entire history (`fetch-depth: 0`).
- GitHub **push protection** and secret scanning.
- `.env` protection via `.gitignore`; local scanning with **husky** + a pre-commit hook.
- Make Gitleaks a required check.

## Week 3: Vulnerable code (SAST)

**Attack:** Slipping in the following patterns via PRs:
- `eval()`, `new Function()`, `child_process.exec` with user input
- NoSQL/SQL injection (queries built by string concatenation)
- Path traversal (`fs.readFile` + user input)
- Prototype pollution (`Object.assign`/`merge` with unchecked input)
- Weak crypto (`md5`, fixed IV), hardcoded passwords, tokens from `Math.random()`
- Obfuscated variants of these (indirect calls, dynamic loading via `require`, building function names by string concatenation)

**Defense:**
- **CodeQL** (JavaScript/TypeScript)
- **Semgrep** (`p/javascript`, `p/nodejs`, `p/owasp-top-ten` + your own custom rules)
- **eslint-plugin-security** and **eslint-plugin-no-unsanitized**
- Make all of them required checks.

## Week 4: Vulnerable dependency (SCA)

**Attack:** A PR that adds a package version with a known CVE. Editing the lockfile by hand. Changing `package.json` without updating the lockfile.

**Defense:**
- `npm audit --audit-level=high` (a failure condition in CI)
- **OSV-Scanner**
- **dependency-review-action** (blocks a newly added vulnerable package in the PR)
- **Dependabot** (`npm` ecosystem)
- Consistency check between `package.json` and `package-lock.json` (`npm ci` already fails on a mismatch)

## Week 5: Disabling security controls

**Attack:** Modifying the workflow file in a PR:
- Deleting the security job
- Adding `continue-on-error: true`
- Evading triggers with `paths-ignore` / `branches-ignore`
- Renaming the job so the required check is left "pending/skipped"
- Adding an `if: false` condition

**Defense:**
- **CODEOWNERS** + mandatory review for `.github/workflows/` and security config files
- Make a single **"gate" job** that aggregates all checks required (a skipped state does not count as success)
- Workflow linting with **actionlint** and **zizmor**
- Make sure the required check is bound to the correct GitHub App/job

## Week 6: Stealing secrets via CI

**Attack:**
- Checking out and running PR code inside `pull_request_target`
- **Script injection** via the PR title, branch name or commit message (`${{ github.event.pull_request.title }}` directly in `run:`)
- Attempting to print a secret to the log or send it to an external address
- Attempting to access secrets from a fork PR

**Defense:**
- Minimal `permissions:` (default `contents: read`)
- Pass user input through `env:`, never embed it directly in `run:`
- Do not run untrusted code in `pull_request_target`
- Environment + required reviewer, approval for fork PR runs
- Use **OIDC** instead of long-lived secrets where possible
- **zizmor** catches this class of issues

## Week 7: Compromised GitHub Action

**Attack:** Simulate a workflow pulling a compromised action by moving the tag (`v1`) of a fake action you control to a malicious commit.

**Defense:**
- Pin actions to the full **commit SHA** (**pinact**)
- Controlled updates with Dependabot (`github-actions` ecosystem)
- Action **allowlist** in repo/org settings
- Runner egress control with **step-security/harden-runner**
- Verification with **OpenSSF Scorecard**

## Week 8: Malicious npm package

**Attack (simulated on a local Verdaccio registry):**
- **Typosquatting** (a lookalike name instead of `lodash`)
- **Dependency confusion** (a higher version with the same name as an internal package)
- A harmless canary beacon at install time via a **`preinstall`/`postinstall` script**
- Pointing the `resolved` URL in the lockfile at the attacker's registry (**lockfile injection**)

**Defense:**
- `npm ci --ignore-scripts` (explicitly allow scripts for required packages)
- **lockfile-lint** (allowed hosts and https only, integrity hash required)
- Scoped packages and `.npmrc` to enforce a single, correct registry
- `npm audit signatures` (provenance and signature verification)
- **Socket** or similar malicious package behavior analysis
- SBOM generation with **@cyclonedx/cyclonedx-npm**

## Week 9: Persistent backdoor

**Attack:**
- A sneaky change split across several small, innocent-looking PRs
- Compromised contributor account simulation
- Adding a hidden workflow, deploy key or webhook
- Pushing a new commit to a PR after review (post-approval change)

**Defense:**
- **Signed commit** requirement
- Dismiss old approvals when a new commit arrives (dismiss stale approvals)
- Disabling admin bypass, "last push approval" requirement
- Mandatory CODEOWNER review on critical files (workflows, `package.json`, config)
- Audit log and deploy key/webhook list review

## Week 10: Final red-team

**Attack:** Chain the previous attacks. Example chain: slip in a vulnerable dependency, bypass the workflow check, exfiltrate the secret. Also try a new variant you have not seen before.

**Defense and wrap-up:**
- Close the remaining gaps
- False positive tuning (rule exceptions documented)
- A short **threat model** in the README and a table showing which attack is blocked by which control
- Re-run all `attacks/` scenarios one final time

## Cumulative defense summary

| Layer | Tools |
|---|---|
| Secret scanning | Gitleaks, push protection, husky |
| SAST | CodeQL, Semgrep, eslint-plugin-security |
| SCA | npm audit, OSV-Scanner, dependency-review, Dependabot |
| Workflow security | actionlint, zizmor, pinact, harden-runner |
| Supply chain | lockfile-lint, `--ignore-scripts`, `npm audit signatures`, SBOM |
| Repo protection | Ruleset, CODEOWNERS, signed commits, required "gate" check |
