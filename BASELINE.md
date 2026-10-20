# Baseline Vulnerabilities (Intentionally Left In)

This repo starts with known vulnerabilities for teaching purposes. Each one should be caught by the control added in the corresponding week. **All of them are intentional, do not fix them**: they stay as targets until that week's defense is in place.

| # | Vulnerability | File:line | Why it was chosen | Caught in week / tool |
|---|---|---|---|---|
| 1 | Fake hardcoded API key `sk_test_FAKE_NOT_A_REAL_KEY_0000` | `src/config.js:9` | The most common real-world leak (key embedded in code). The value is clearly fake. | Week 2: Gitleaks (**note:** the default gitleaks rules do not catch this value; tested on 2026-10-20 with `gitleaks dir src`: "no leaks found". A custom rule will be needed.) Week 3: Semgrep hardcoded-secret rules. |
| 2 | `lodash@4.17.20` | `package.json:19`, `package-lock.json` | The most widely used package in the Node ecosystem, with well-documented CVEs: CVE-2021-23337 (`_.template` command injection, high), CVE-2020-28500 (ReDoS) and newer prototype pollution advisories. It is actually used in the code (`src/app.js:20`, `_.pick`), so it cannot be dismissed as an "unused package". | Week 4: `npm audit` (high), OSV-Scanner, dependency-review |
| 3 | `minimist@1.2.5` | `package.json:20`, `package-lock.json` | CVE-2021-44906 prototype pollution, **critical**. A classic supply chain example (a transitive dependency of many tools). Used in the code (`src/config.js:3`, `--port` argument). | Week 4: `npm audit` (critical), OSV-Scanner, Dependabot |
| 3b | `.env` is missing from `.gitignore`, so a `.env` file can be committed by accident | `.gitignore` | Attack surface for the Week 2 `.env` leak attack. | Week 2: `.gitignore` protection + Gitleaks + pre-commit hook |
| 4 | Actions referenced by tag instead of SHA (`actions/checkout@v4`, `actions/setup-node@v4`) | `.github/workflows/ci.yml:15-16` | Tags are movable; compromised action scenario. | Week 5: zizmor; Week 7: pinact |
| 5 | `actions/checkout` defaults to `persist-credentials: true` | `.github/workflows/ci.yml:15` | The token stays on the runner disk and later steps can read it. | Week 5-6: zizmor (`artipacked`) |
| 6 | No single "gate" job; checks can be bypassed by modifying the workflow file | `.github/workflows/ci.yml` | Week 5 attack surface. | Week 5: gate job + CODEOWNERS |

`npm audit --omit=dev` result (2026-10-20): `2 vulnerabilities (1 high, 1 critical)`.

In Week 1, CI runs **only** `npm ci`, lint and test. None of the above breaks CI right now; this is a deliberate choice.
