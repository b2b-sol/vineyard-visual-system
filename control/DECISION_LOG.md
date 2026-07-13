# Decision Log

Use `DEC-###` identifiers. Record date, context, decision, alternatives, rationale, affected artifacts, and reversibility.

## DEC-001 — Vertical production waves

- Date: 2026-07-13
- Context: The packet's serial phases delay data-grounded rendered learning and make cross-artifact drift likely.
- Decision: Preserve evidence and ontology ordering, then deliver five complete vertical workflow waves with per-wave review and validation.
- Alternatives: Retain the original waterfall; build the atlas before the domain model.
- Rationale: Complete slices expose workflow, data, UX, component, traceability, and rendering defects while they remain cheap to correct.
- Affected artifacts: `PACKET_REVIEW.md`, `control/EXECUTION_PLAN.md`, `control/TASK_REGISTRY.yaml`.
- Reversibility: Medium; wave boundaries may change without weakening gates.

## DEC-002 — Canonical product and operating baseline

- Date: 2026-07-13
- Context: Regional, unit, time, tenancy, offline, accessibility, and Figma assumptions were implicit.
- Decision: Use a 2026 California North Coast composite in Pacific time; US customary units with useful SI equivalents; a static Pages atlas with simulated PWA/offline behavior; WCAG 2.2 AA plus field-use criteria; structured Figma-ready exports without requiring a live Figma file.
- Alternatives: Region-neutral placeholder data; production backend; live Figma dependency.
- Rationale: A concrete shared operating history produces coherent screens and test fixtures while keeping the artifact public and reproducible.
- Affected artifacts: synthetic data, atlas, validation, Figma bundle, construction packets.
- Reversibility: High through configuration and fixture regeneration.

## DEC-003 — Normalized trace and evidence graph

- Date: 2026-07-13
- Context: A single wide CSV cannot represent many-to-many provenance and coverage.
- Decision: Canonical traceability uses node and edge registries; human matrices and CSVs are generated views.
- Alternatives: Continue with the wide CSV as canonical storage.
- Rationale: Graph validation can detect missing IDs, forbidden orphans, broken chains, supersession, and change impact.
- Affected artifacts: control registries, validators, atlas traceability views, completion audit.
- Reversibility: Low after production data accumulates.

## DEC-004 — Counts are coverage floors

- Date: 2026-07-13
- Context: Raw DoD counts can be gamed with trivial duplicates.
- Decision: Counts pass only when artifacts have unique purpose, valid trace links, representative fixture data, applicable state coverage, and rendered or review evidence.
- Alternatives: File-count-only completion checks.
- Rationale: Completion quality and usefulness matter more than mechanical volume.
- Affected artifacts: DoD matrix, audit scripts, completion report.
- Reversibility: Low; this strengthens rather than changes the product objective.
