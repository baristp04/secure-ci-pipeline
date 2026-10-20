# Secure CI Pipeline for GitHub Repositories

Term project for the Software Vulnerability and Security course. A CI security gate for GitHub repositories, hardened step by step.

Every week an attack is attempted against the repo in the attacker role, then a security layer that blocks that attack is added to the pipeline. Attacks from previous weeks are re-run as regression tests. Weekly plan: [docs/ROADMAP.md](docs/ROADMAP.md).

## Attacker model

- **Who:** A malicious or compromised contributor who can open PRs but cannot write directly to protected branches; or an external attacker coming in through a malicious package / compromised GitHub Action.
- **Goal:** Plant a persistent backdoor in `main`, steal secrets, disable or bypass security controls.

## Target application

A small in-memory Express inventory API:

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/items` | All items |
| GET | `/items/:id` | Single item (404 if missing) |
| POST | `/items` | Creates an item from `{ "name": "Bolt", "quantity": 10 }` |

The repo **intentionally** contains vulnerabilities (old packages, a fake secret). List: [BASELINE.md](BASELINE.md).

## Setup

The development environment is provided by [devenv](https://devenv.sh) (Node 22, gitleaks, semgrep, osv-scanner, actionlint, zizmor). `devenv.nix` lives one directory above this repo.

```sh
cd ..            # directory containing devenv.nix
devenv shell
cd secure-ci-pipeline
npm ci
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Starts the API with `--watch` (port: `PORT` env, `--port` argument, or 3000) |
| `npm start` | Starts the API |
| `npm test` | Runs tests with `node --test` |
| `npm run lint` | ESLint |

The devenv shell also provides `scan-secrets`, `scan-sast`, `scan-deps`, `lint-workflows` and `check-all`. These will be wired into CI in later weeks.

## Repo protection (Week 1)

- CI: [.github/workflows/ci.yml](.github/workflows/ci.yml), the `build-and-test` job (`npm ci`, lint, test). Required status check.
- [.github/CODEOWNERS](.github/CODEOWNERS): mandatory owner review for workflows and `package.json` / `package-lock.json`.
- `main` ruleset: [docs/main-ruleset.json](docs/main-ruleset.json). PR required, 1 approval, CODEOWNERS approval, stale approvals dismissed, `build-and-test` required, force push and deletion forbidden.

## Attacks

Each week's attack description and results live under `attacks/weekN/`. Week 1: [attacks/week1/README.md](attacks/week1/README.md).

## Safety boundaries

Work only happens in this repo. Secrets are fake. Malicious package simulations are never published to the real npm (local Verdaccio only).
