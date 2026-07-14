# Salvage report

The visual-atlas/product-definition program was cancelled during WAVE-002. The accepted WAVE-001 baseline and all in-progress WAVE-002 files are preserved in the shutdown checkpoint; no post-cancellation repair, polishing, or validation was performed.

## Best directly useful material

### Workflow, annual-cycle, role, and handoff diagrams

These are editable Mermaid sources. Open any `.mmd` file in a Mermaid-capable editor to view or export SVG/PNG. `workflow-model/visuals/README.md` is the complete indexed list; `npm run generate:workflow-visuals` regenerates the canonical sources.

- `workflow-model/visuals/annual-calendar.mmd` — annual vineyard operating calendar.
- `workflow-model/visuals/operating-model.mmd` — end-to-end vineyard operating model.
- `workflow-model/visuals/roles-interaction-map.mmd` — cross-role interaction map.
- `workflow-model/visuals/handoff-information-map.mmd` — information and responsibility handoffs.
- `workflow-model/visuals/estate-grown-vs-contract-fruit.mmd` — estate/contract-fruit operating comparison.
- `workflow-model/visuals/certification-overlay.mmd` — certification overlay across operations.
- `workflow-model/visuals/wf-001-role-swimlane.mmd` — seasonal planning, dispatch, execution, and verification.
- `workflow-model/visuals/wf-006-role-swimlane.mmd` — harvest planning through intake and reconciliation.
- `workflow-model/visuals/wf-007-role-swimlane.mmd` — crew scheduling through payroll and cost allocation.
- `workflow-model/visuals/wf-001-state-machine.mmd`, `wf-006-state-machine.mmd`, and `wf-007-state-machine.mmd` — the strongest corresponding lifecycle views.
- `workflow-model/visuals/wf-001-exception-decision-tree.mmd`, `wf-006-exception-decision-tree.mmd`, and `wf-007-exception-decision-tree.mmd` — the strongest exception/recovery views.

Supporting editable product maps are in `product-structure/visuals/navigation-map.mmd`, `screen-map.mmd`, `offline-sync.mmd`, `permission-resolution.mmd`, and `domain-map.mmd`.

### Accepted visual direction

The selected direction is **Canopy Signal / sunlit fieldbook**, recorded as accepted at 92/100 in `validation/visual-direction-review.md`. Open the PNGs directly:

- `validation/visual-direction-renders/canopy-signal-harvest-command.png` — desktop harvest command view.
- `validation/visual-direction-renders/canopy-signal-field-interruption.png` — mobile urgent interruption view.
- `validation/visual-direction-renders/canopy-signal-reconciliation.png` — desktop reconciliation view.

The Field Ledger and Vintage Control Room PNGs in the same directory are comparison explorations, not the selected direction.

### Accepted desktop and mobile screens

The complete accepted WAVE-001 set is `validation/wave-001-renders/primary/cap-w001-001.png` through `cap-w001-022.png`. Exact routes and viewport sizes are recorded in the adjacent `.capture.json` sidecars and in `validation/wave-001-captures.json`. Particularly useful representatives are:

- `validation/wave-001-renders/primary/cap-w001-001.png` — desktop seasonal planning/dispatch baseline (`SCR-001`).
- `validation/wave-001-renders/primary/cap-w001-009.png` — mobile field execution baseline (`SCR-005`).
- `validation/wave-001-renders/primary/cap-w001-010.png` — desktop verification/history view (`SCR-006`).
- `validation/wave-001-renders/primary/cap-w001-012.png` — desktop labor-demand view (`SCR-039`).
- `validation/wave-001-renders/primary/cap-w001-016.png` — mobile crew check-in view (`SCR-041`).
- `validation/wave-001-renders/primary/cap-w001-017.png` — mobile field workboard (`SCR-042`).
- `validation/wave-001-renders/primary/cap-w001-019.png` — desktop payroll-correction view (`SCR-044`).
- `validation/wave-001-renders/primary/cap-w001-021.png` — desktop cost-allocation view (`SCR-045`).

Two earlier but focused accepted walking-slice renders remain useful at `review-exports/factory/planning-dispatch-desktop.png` and `review-exports/factory/planning-dispatch-mobile.png`.

### Interactive prototypes

The strongest accepted flows are `FLW-001`, `FLW-007`, and linked-evidence comparison `FLW-015`. They can be viewed on the published atlas:

- `https://b2b-sol.github.io/vineyard-visual-system/#/prototypes/FLW-001`
- `https://b2b-sol.github.io/vineyard-visual-system/#/prototypes/FLW-007`
- `https://b2b-sol.github.io/vineyard-visual-system/#/prototypes/FLW-015`

For local viewing, run `npm ci` and `npm run dev`, then open the same hash routes. No dedicated prototype screenshot files were committed; the 22 accepted screen captures above are the available static product evidence. The acceptance summary is `validation/WAVE-001-REVIEW.md` and its structured record is `validation/wave-001-review.json`.

## Infrastructure or unfinished work

- `control/`, `schemas/`, `scripts/validation/`, registry JSON, generated trace mappings, and most files under `validation/` are operating infrastructure or evidence rather than presentation deliverables.
- `design-system/`, `construction-packets/`, `figma/`, and `production-waves/` contain reusable foundations and handoff material, but the cancelled multi-wave program did not complete its planned final consolidation.
- The uncommitted-at-cancellation WAVE-002 source, data, styles, tests, and planning changes preserved by this checkpoint are unfinished and unverified. They must not be represented as accepted visual output.
- WAVE-001 is the last accepted product baseline. `validation/WAVE-001-REVIEW.md` is the authoritative human-readable acceptance record.
