# Visual direction review — VIS-FND-001

Status: selected and mechanically accepted  
Decision: `DEC-013`  
Selected thesis: **Canopy Signal / sunlit fieldbook**

## Outcome

Canopy Signal is the global visual foundation at **92/100**. It combines bright-field instrumentation with Field Ledger's cadastral parcel grammar and append-only record layers. The synthesis is a deliberate constraint: without persistent block identity, survey geometry, exact record IDs, and visible lineage, Canopy Signal would regress toward generic agritech.

Field Ledger remains a reserve source for provenance, correction, history, and parcel language. Vintage Control Room remains contextual inspiration for intake, quality, audit, and a possible future low-light mode. Neither is a global theme.

## Comparable lighthouse set

Every direction uses the same React structure, semantic content, exact fixture values, state, and action availability. Only visual-language variables change.

| Lighthouse         | Exact trace                                                                      | Acceptance pressure                                                                        | Renders     |
| ------------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------- |
| Field interruption | `SCR-016` · `SCN-003-04` · `FIX-012` · `WF-003` · `EVT-00049` · `TRN-WF-003-013` | Full-sun scanning, 52 px controls, urgent containment, evidence density, explicit recovery | 390 × 844   |
| Harvest command    | `SCR-031` · `SCN-006-02` · `FIX-027` · `WF-006` · `EVT-00221` · `TRN-WF-006-024` | Dense lanes, clocks, delayed state, load identity, authority, next action                  | 1440 × 1024 |
| Reconciliation     | `SCR-037` · `SCN-006-06` · `FIX-028` · `WF-006` · `EVT-00280` · `TRN-WF-006-027` | Cross-organization identity, predecessor/successor evidence, correction, future history    | 1440 × 1024 |

The nine committed renders are in `validation/visual-direction-renders/`. Canonical implementation is `atlas/src/pages/VisualDirectionsPage.tsx`, `atlas/src/visual-directions.css`, and `design-system/tokens/vineyard.tokens.json`; PNGs are review evidence only.

## Weighted score

| Criterion                           |  Weight | Field Ledger | Canopy Signal | Vintage Control Room |
| ----------------------------------- | ------: | -----------: | ------------: | -------------------: |
| Operational fidelity                |      20 |           18 |        **19** |                   16 |
| Outdoor readability                 |      15 |            9 |        **14** |                    6 |
| Information density and hierarchy   |      15 |           12 |        **14** |                   12 |
| Accessibility                       |      15 |           12 |        **14** |                   12 |
| Field-to-office continuity          |      12 |           11 |        **11** |                    8 |
| Vineyard distinctiveness            |      15 |       **14** |            12 |               **14** |
| Figma and editable-system readiness |       8 |            7 |         **8** |                    6 |
| **Total**                           | **100** |       **83** |        **92** |               **74** |

Acceptance requires at least 85 total, at least 80% of every criterion weight, and no hard rejection. Canopy Signal is the only direction that clears all floors. Field Ledger fails the outdoor floor; Vintage Control Room fails outdoor, continuity, and editable-system floors.

## What each direction proved

### Field Ledger

Strongest expression of record lineage, stable parcel identity, attributable correction, and institutional memory. Its warm mineral field and fine survey rules produce a distinctly vineyard-specific system without photography. The mobile comparison showed that muted fine-line language is too fragile as a universal outdoor base, even after the rendered variant was corrected to pass WCAG contrast.

### Canopy Signal

Strongest daylight hierarchy, control clarity, density, and field/office continuity. Near-black and mineral surfaces carry identity and evidence; vine, water, amber, clay, and grape are bounded semantic roles rather than decorative series. Parcel boundaries, stable block IDs, event rails, and predecessor/successor structure supply the vineyard specificity.

### Vintage Control Room

Strongest contextual gravity for night harvest, intake, quality, and audit. The high-contrast header and forensic plum/steel language work well at reconciliation, but the global dark surround creates an avoidable outdoor and cross-workflow burden. A future low-light mode requires independent workflow evidence and must not become a cosmetic dark theme.

## Automated evidence

- `npm run validate:tokens`: 110 DTCG 2025.10 tokens, 10 contrast pairs, 714 assertions.
- Contrast results range from 5.41:1 to 16.07:1 for recorded text pairs; focus is 6.81:1 against the base surface.
- `npm run test:visual-directions`: 12 passed, 10 intentionally skipped by viewport project.
- All nine routes have zero serious or critical axe findings.
- Status signals include text + SVG symbol; no acceptance state relies on color alone.
- Mobile consequential controls are at least 52 CSS px; desktop controls are at least 44 CSS px.
- The selected route consumes generated `ref.*`, `sys.*`, and `component.*` variables; component aliases resolve only through semantics, preserve alias references in generated CSS, and carry stable `CMP-*` and Figma metadata.
- Every PNG has source-digested capture evidence recording its exact route, viewport, scroll position, top-content geometry, and—on mobile—urgent-alert and accountable-action visibility. The validator rejects stale or mispositioned captures.
- The 390 × 844 field composition keeps the product identity, urgent interruption, and accountable recovery action visible at initial load while the evidence body remains keyboard-scrollable.
- Selected reconciliation reflows at a 720 × 512 CSS viewport, equivalent to 200% of the 1440-wide review surface, without page-level horizontal overflow.
- `npm run validate:visual-directions`: 175 assertions verify score math, criterion and hard-rejection outcomes, selection uniqueness, exact canonical trace references, render inventory, source-digest currentness, capture geometry, and exact PNG dimensions.

## Independent review inputs

- The visual-direction critic established weighted floors and recommended Canopy Signal only as a “sunlit fieldbook” synthesis.
- The lighthouse architect selected exact interrupted, delayed, and disputed states rather than normal-path glamour screens.
- The token-system critic identified manual CSS drift, unsupported font weights, missing density modes, and the need for DTCG 2025.10 structures and currentness checks.
- A final foundation critic identified token-to-screen drift, flattened alias output, incomplete component metadata, and mispositioned mobile captures. Each finding was corrected at the source and added to deterministic validation before re-review.

## Rejected alternatives and constraints

- No global dark mode in this phase.
- Amber, clay, grape, and brass never carry text or state alone.
- Green and water are not adjacent categorical distinctions without labels, symbols, or patterns.
- Photography and generated mood references do not enter the product runtime as identity crutches.
- The serif is reserved for major identity and workflow titles; tables, controls, evidence, and field actions use the UI sans stack with tabular numerals.
- Future components must alias semantic tokens and cite a proven `CMP-*` contract; speculative component tokens are not added.

## Open follow-through

VIS-FND-001 establishes the foundation, not the complete component library. Production waves must extract component aliases from approved workflow packages, migrate remaining legacy atlas literals to semantic tokens, exercise print and map/chart patterns, and reconsider low-light mode only after actual night-harvest acceptance evidence.
