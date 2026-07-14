# WAVE-001 canonical model repair

## Result

The production-wave product model now assigns every `WF-007` transition to the screen that owns the operational responsibility, preserves the existing `ACT-*` identities, and exposes complete ordered narratives for `FLW-001` and `FLW-007`. `FLW-015` is explicitly a linked-evidence comparison; it does not imply a single chronology across its two workflow instances.

## Exact evidence decisions

- `FLW-001` uses all eight `FIX-006` events from `EVT-00384` through `EVT-00400` in canonical state order.
- `FLW-007` uses all ten `FIX-033` events from `EVT-00097` through `EVT-00106`, including heat pause, rebrief, resumed work, time verification, payroll acceptance, and cost allocation.
- `FIX-035` retains its existing event IDs while `EVT-00301` and `EVT-00302` provide a short offline-capture and later-sync case for crew scheduling and briefing.
- `FIX-033` retains its existing event IDs while the heat-pause event `EVT-00100` provides an explicitly resolved sync-conflict case on the crew workboard.
- `FIX-032` remains the exact correction-lineage case.

## Explicit model-only branches

The expanded check-in and start-work transitions `TRN-WF-007-010` and `TRN-WF-007-011` have no event in the approved full-season fixture set. `SCR-041` therefore carries approved workflow fixture context while both actions remain `canonical_branch` with empty action-level scenario evidence. Late contractor review (`TRN-WF-007-024`) is handled the same way. No event, scenario, or fixture evidence was fabricated, and no existing stable event ID was shifted.

The product validator accepts a canonical-only screen only when every consequential action is explicitly labeled `canonical_branch` and has no claimed scenario realization. Exact transition-to-screen responsibility and the two complete wave narratives are separately enforced.

The 13 screens retain the approved 64 curated review states exactly. Their canonical state matrix remains at 93 contracts: alternative `working` actions on `SCR-042` and alternative `time_submitted` actions on `SCR-043` retain distinct precondition projections, with each projection labeled from exact operational evidence or canonical-only source as appropriate.
