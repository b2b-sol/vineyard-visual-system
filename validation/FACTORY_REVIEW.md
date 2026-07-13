# Factory foundation review

Date: 2026-07-13

Branch: `codex/factory-foundation`

Scope: deterministic factory, walking-slice semantics, rendered product realization, CI, Pages, and repository hygiene

## Independent review outcome

Three read-only reviews examined trace/control integrity, CI/security reproducibility, and the rendered desktop/mobile product. They found one P0, eight P1/P2 issues, and one P3 portability issue. All findings are recorded with resolutions in `validation/FINDINGS.yaml`; none were waived.

The critical issue was a formally connected but materially false trace claim: SCR-001 rendered unrelated presentation data instead of FIX-001. The screen now imports the canonical fixture through a typed adapter and exposes its stable block identity, blocked acreage, actors, repair evidence, recovery events, verification, and immutable history.

## Repairs accepted

- Every canonical registry record, reference, semantic edge, source locator, and evidence-to-packet chain is validated; first-record-only validation was removed.
- The scenario, fixture, screen, and workflow use the same nine-event state chain from observation through verification.
- Fixture contracts support normal/open work and state-conditional blockers and actuals instead of requiring one resolved equipment exception.
- G0-G12 claims require a validated DoD matrix, non-empty evidence, and Git-reachable evidence-at-commit provenance; project completion requires every gate.
- SCR-001 realizes ACT-001 through ACT-004 as attributed, timestamped, append-only actions.
- Mobile field mode validates acreage, queues offline evidence, detects newer-server conflicts, and resolves without overwriting history.
- Unit and browser suites cannot pass empty; model tests cover valid open work and invalid verified work.
- Repository hygiene scans every blob locally and uses a pinned TruffleHog history scan in CI.
- Pages manual dispatch is main-only and runs the aggregate verification gate.
- Repository audit passes both a Git clone and a GitHub-style source tree without `.git` metadata.
- Quality and Pages validation receive complete history so historical evidence is provable in GitHub Actions.

## Evidence

- Desktop review: `review-exports/factory/planning-dispatch-desktop.png`
- Mobile review: `review-exports/factory/planning-dispatch-mobile.png`
- Machine checks: lint, typecheck, 18-schema validation, five unit tests, production build, and repository audit passed.
- Browser checks: nine passed, one intentional desktop skip for the mobile-only contract; both desktop Chromium and Pixel 7 passed the shared flow; no serious or critical axe violations.

## Merge recommendation

Accepted for merge after required GitHub checks pass on the exact branch commit. FACT-003 remains in progress until the main-branch Pages deployment and public smoke test succeed.
