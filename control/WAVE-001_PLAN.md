# WAVE-001 Delivery Contract

Status: accepted on 2026-07-14 and awaiting protected squash integration. This wave closes infrastructure expansion; subsequent work follows `control/WAVE-002_EXECUTION_ADJUSTMENT.md`.

## Purpose

Deliver `WF-001` seasonal planning, dispatch, execution, and verification together with `WF-007` crew scheduling, attendance, time, payroll, and cost allocation as one connected operational package. This is the first production wave and establishes the reusable production system for the remaining four waves.

## Planning review

### Keep

- The packet's vertical workflow-wave sequence, creator/critic/integrator loop, durable state, deterministic CI, and protected pull-request delivery.
- The exact canonical registries, append-only season data, default-deny permission model, Canopy Signal visual foundation, stable IDs, and source-to-packet trace graph.
- Complete responsive, accessibility, field-use, print, state, prototype, construction, and Figma-readiness evidence rather than isolated showcase screens.

### Refine

- Replace the legacy `FIX-001` planning page with a registry-backed screen renderer and fixture selector.
- Treat each screen as a typed responsibility recipe composed from stable public components, not as bespoke JSX or a generic JSON dashboard.
- Generalize construction packets, capture evidence, wave acceptance, and Figma maps into schema-validated registries with currentness checks.
- Repair abbreviated prototype paths and incorrect `WF-007` screen/action allocation before claiming rendered coverage.
- Keep labor-specific grids and panels as private compositions until repeated use proves that a new stable `CMP-*` contract is warranted.

### Explicit decisions

- The 13 wave screens are `SCR-001` through `SCR-006` and `SCR-039` through `SCR-045`.
- The public component scope is the canonical 27 IDs: `CMP-001` through `CMP-022`, `CMP-026`, and `CMP-033` through `CMP-036`.
- Canonical route form is `/screens/:screenId`; exact states and fixtures are URL-selectable with `state` and `fixture` query parameters. Prototype route form is `/prototypes/:flowId`.
- The 64 review states below are the required visibly distinct wave acceptance set. All canonical `STM-*` contracts for the 13 screens must also resolve and render; canonical-branch states remain labeled as model-only when no season event realizes them.
- `FLW-001` and `FLW-007` are the two primary clickable narratives. `FLW-015` is a linked-evidence comparison, not a falsely chronological cross-workflow story. `FLW-017` and `FLW-019` remain cross-wave links.
- Global gates G8, G9, and G10 remain pending until all production waves and integration are complete. This wave records an independently reviewed slice result.

## Required route and state inventory

| Screen  | Route              | Review states                                      |
| ------- | ------------------ | -------------------------------------------------- |
| SCR-001 | `/screens/SCR-001` | normal, offline, partial, urgent, completion       |
| SCR-002 | `/screens/SCR-002` | normal, blocked, partial, completion               |
| SCR-003 | `/screens/SCR-003` | normal, blocked, stale, partial, completion        |
| SCR-004 | `/screens/SCR-004` | normal, blocked, stale, corrected, completion      |
| SCR-005 | `/screens/SCR-005` | normal, blocked, corrected, historical, completion |
| SCR-006 | `/screens/SCR-006` | normal, stale, corrected, offline, completion      |
| SCR-039 | `/screens/SCR-039` | normal, blocked, urgent, historical, completion    |
| SCR-040 | `/screens/SCR-040` | normal, urgent, partial, offline, completion       |
| SCR-041 | `/screens/SCR-041` | normal, blocked, urgent, stale, completion         |
| SCR-042 | `/screens/SCR-042` | normal, blocked, urgent, conflict, completion      |
| SCR-043 | `/screens/SCR-043` | normal, blocked, urgent, loading, completion       |
| SCR-044 | `/screens/SCR-044` | normal, blocked, corrected, empty, completion      |
| SCR-045 | `/screens/SCR-045` | normal, urgent, partial, error, completion         |

## Canonical narratives and fixtures

- Plan through verify: `SCN-001-07`, `FIX-006`, events `EVT-00384`, `EVT-00386`, `EVT-00388`, `EVT-00391`, `EVT-00393`, `EVT-00395`, `EVT-00397`, and `EVT-00400`.
- Planning exceptions: offline `FIX-002`; stable-identity block `FIX-052`; partial completion `FIX-053`; correction lineage `FIX-054`; contract block `FIX-005`.
- Crew through cost: routine `FIX-034`; crew-short correction `FIX-032`; heat pause and rebrief `FIX-033`; cross-organization allocation `FIX-035`; historical allocation `FIX-036`.
- Linked evidence comparison only: `SCN-900-05`, `FIX-003`, and `FIX-033`.

## Architecture

1. Build normalized indexes and pure selectors over canonical operation, events, fixtures, scenarios, screens, states, flows, permissions, notifications, sync, records, decisions, and transitions.
2. Render typed screen recipes through shared public components. Components receive attributed view models and emit stable action IDs; they do not import fixtures or mutate workflow state.
3. Replay prototype actions through permission, precondition, sync, transition, and append-only event checks before adding a local simulated event.
4. Emit stable `data-*` identifiers for screen, workflow, scenario, fixture, state, component, action, transition, permission, notification, sync, event, record, and decision contracts.
5. Bind only the selected semantic and component token layers. Use CSS/container-query reflow, 52 px field controls, 44 px desktop controls, explicit status text/icons, and print-preserved identity and lineage.

## Acceptance evidence

- Thirteen high-fidelity screen compositions and complete low-fidelity workflow strips.
- Sixty-four stable review states plus resolution of every canonical `STM-*` contract owned by the 13 screens.
- Twenty-two primary captures: nine responsive routes at desktop and mobile, three mobile-only routes, and one desktop-only route; 720 by 512 reflow checks for responsive and desktop routes.
- Print acceptance for verification, time review, cost allocation, and evidence export.
- Two primary clickable prototypes with complete canonical event sequences and one linked-evidence comparison.
- Construction packets `PKT-002` through `PKT-004`, with `PKT-001` preserved.
- Token, component, screen, and prototype Figma maps with code/export and currentness validation.
- Zero serious or critical axe findings; keyboard, focus, live-region, non-color, overflow, reduced-motion, and target-size checks.
- Independent operational/UX and visual/component/accessibility critics; no unresolved P0/P1 and no accepted P2 without recorded disposition.
- `npm run verify`, the full browser suite, trace validation, capture-currentness validation, and repository audit pass.

## Sequence

1. Repair the canonical flow/model allocation and add any missing deterministic fixture evidence.
2. Add wave, packet, capture, review, and Figma schemas/manifests plus exact validators.
3. Implement selectors, permission resolution, append-only replay, stable component realizations, and screen recipes.
4. Produce the `WF-001` package, then extend the same system for `WF-007`.
5. Complete all states, prototypes, print outputs, packets, maps, captures, and trace edges.
6. Run rendered reviews, resolve findings, execute the complete verification suite, and integrate through protected GitHub delivery.
