# WAVE-002 Deliverable-First Plan

Status: in progress from protected `main` commit `c1c589f0dd3bec37284e0866cbfd36e77f9d6500` on 2026-07-14.

## Outcome

Deliver the complete human-visible operating package for `WF-002` scouting, recommendation, crop protection, and application records and `WF-003` irrigation scheduling, fertility adjustment, delivery, interruption recovery, and verification.

The foundation freeze in `control/WAVE-002_EXECUTION_ADJUSTMENT.md` governs this wave. No new schema, validator, registry, contract layer, or generated cross-reference is planned. Existing screen, state, fixture, action, permission, sync, notification, component, prototype, packet, Figma, browser, CI, and trace surfaces will be reused.

## Canonical screen inventory

| Workflow | Screens                     | Primary responsibility                                                                                                        |
| -------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `WF-002` | `SCR-007` through `SCR-012` | monitoring queue, field capture, pressure assessment, treatment recommendation, preflight and schedule, application execution |
| `WF-003` | `SCR-013` through `SCR-018` | water demand, condition observation, schedule building, field delivery, interruption recovery, resource verification          |

All 56 declared review states will render and remain selectable. The stored review set will emphasize 24 decisive desktop and mobile views while the browser walkthrough exercises every declared state.

## Task walkthroughs

1. Walk routine scouting through accepted application evidence using `FIX-010`, preserving `EVT-00136` through `EVT-00145` across `SCR-007` through `SCR-012`.
2. Walk the wind go/no-go decision in `FLW-002` using `FIX-007` and `FIX-055`, ending in an attributable cancellation rather than inventing a recovery.
3. Walk offline scouting and the REI or PHI containment path using `FIX-008` and `FIX-056`, with explicit device journal, restriction window, and safe next action.
4. Walk incorrect diary correction using `FIX-009` and `FIX-057`, preserving the predecessor and corrected report.
5. Walk routine irrigation and fertility delivery using `FIX-015`, keeping soil, plant, weather, schedule, volume, nutrient, and verification evidence connected.
6. Walk the complete malfunction and restart narrative in `FLW-003` using `FIX-012` and `FIX-058`, including containment, redispatch, resumed delivery, and verification.
7. Walk late lab evidence and supersession using `FIX-013` and `FIX-059`, plus offline-delayed and historical responsibilities through `FIX-014` and `FIX-016`.

## Visual composition

- Scouting and pressure views use a fieldbook queue, mapped scope, threshold evidence, and treatment-choice hierarchy.
- Protection views use a restriction-first go/no-go board, visible REI/PHI and weather clocks, and mobile execution controls above the fold.
- Irrigation views use a water-balance evidence band, condition trend, schedule lanes, valve/set responsibility, and delivered-versus-planned proof.
- Recovery views use an incident-to-safe-restart split with immutable evidence and an explicit accountable next action.
- Mobile screens place identity, connectivity, safety/restriction context, and an enabled canonical action inside the initial viewport.
- Shared Canopy Signal tokens and public components remain consistent, while screen-specific composition prevents a repeated dashboard template.

## Acceptance evidence

- Twelve high-fidelity canonical screens and all 56 declared review states.
- Two clickable canonical prototypes: `FLW-002` and `FLW-003`.
- Twenty-four primary rendered views spanning routine, urgent, blocked, offline, conflict, corrected, delayed, rejected, incomplete, superseded, completion, desktop, and field-mobile responsibilities.
- Complete keyboard, responsive, print where operationally useful, reduced-motion, non-color, target-size, and WCAG A/AA browser review.
- Existing construction-packet and Figma maps extended for these screens, prototypes, and the already-canonical `CMP-024` trend chart.
- Independent operational/UX and visual/component/accessibility review passes with no unresolved P0/P1 and no undisposed P2.
- `npm run verify`, full browser walkthroughs, repository audit, and protected GitHub checks pass.

## Sequence

1. Extend the existing production renderer and recipes to the 12 canonical screens without changing the frozen model.
2. Compose `WF-002` and `WF-003` task-specific layouts, then make mobile actionability and exception recovery explicit.
3. Reuse the existing prototype replay for `FLW-002` and `FLW-003`; extend existing packet and Figma artifacts.
4. Render every declared state, save the 24-view primary review set, and conduct task-based creator-critic review.
5. Resolve findings, run the complete verification suite, and integrate through the protected merge queue.
