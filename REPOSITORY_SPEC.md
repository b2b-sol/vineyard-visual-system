# Repository and Visual Factory Specification

## Default implementation stack

Codex may update versions after checking current compatibility. Preserve the architecture unless a recorded decision justifies change.

- React
- TypeScript
- Vite or an equivalent static-site build system
- React Router
- CSS variables and structured design tokens
- Mermaid for source diagrams, exported to SVG
- SVG for canonical icons and maps/symbols
- JSON/YAML/CSV registries and synthetic data
- AJV or equivalent JSON Schema validation
- Vitest for unit and model tests
- Playwright for browser, screenshot, responsive, and accessibility checks
- A proven accessibility checker such as axe integrated into Playwright
- GitHub Pages for the public atlas

Avoid unnecessary server infrastructure. The completed atlas should build as a static site.

## Target repository layout

```text
.github/
  workflows/
.codex/
  config.toml
  agents/
AGENTS.md
README.md
LICENSE
NOTICE.md
control/
source/
workflow-model/
scenarios/
product-structure/
data/
atlas/
  src/
  public/
  tests/
  AGENTS.md
design-system/
  tokens/
  components/
  icons/
  maps/
  charts/
  AGENTS.md
screens/
prototypes/
figma/
construction-packets/
validation/
schemas/
templates/
prompts/
scripts/
review-exports/
```

## Visual Atlas routes

See `VISUAL_ATLAS_SPEC.md`.

## GitHub workflows

Create at least:

### `ci.yml`

Triggers:

- `pull_request`
- `merge_group`
- `push` to `main`

Checks:

- install lockfile-resolved dependencies
- formatting/linting
- TypeScript
- schema validation
- unit tests
- production build
- link and identifier checks

### `visual-validation.yml`

- Playwright browser suite
- representative screenshot generation or comparison
- responsive smoke tests
- accessibility checks
- required artifact coverage

### `repository-audit.yml`

- task/manifest consistency
- traceability graph has no forbidden orphans
- Definition of Done machine checks
- no accidental secrets or absolute local paths
- no unresolved P0/P1 findings

### `pages.yml`

Build and deploy GitHub Pages from the static atlas. Use least-privilege workflow permissions.

## Initial governance rollout

Before requiring status checks, allow the first bot-owned scaffold commit and first CI run. Then configure a `main` ruleset requiring:

- pull requests
- required CI checks
- merge queue
- no human approval requirement
- squash merge
- deletion of merged branches

Ensure required workflows listen to `merge_group` so the queue receives checks.

## Issue and task tracking

Use repository Issues, labels, milestones, and the machine-readable task registry. An organization Project is optional and should be created only if `tiklebot` has the necessary organization permission; it is not a completion dependency.

## Package and dependency policy

- Use lockfiles.
- Prefer stable, maintained packages.
- Avoid paid API dependencies.
- Keep generated outputs reproducible.
- Store large binary review artifacts selectively; use compressed formats and avoid needless repository growth.
- Keep canonical source structured and text-diffable.

## Public-repository hygiene

- No secrets
- No private paths or usernames
- No credential logs
- No copied proprietary assets without rights
- Include attribution/notice for third-party references and libraries
- Use an appropriate permissive license for original repository code and content
