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

## DEC-005 — Protected squash delivery with target-branch provenance

- Date: 2026-07-13
- Context: Strict evidence validation exposed that branch-local commits disappear from the target history after a squash merge.
- Decision: Main is protected by PR-only squash delivery, exact quality/audit/browser checks, linear history, deletion and force-push blocks, resolved review threads, and an all-green merge queue. Evidence commits are reconciled to the immutable target-branch squash commit after integration.
- Alternatives: Preserve every feature commit with merge commits; weaken provenance reachability; avoid squash delivery.
- Rationale: This retains clean public history and mechanically provable evidence without treating unreachable feature-branch SHAs as durable provenance.
- Affected artifacts: repository ruleset 18897256, `control/TASK_REGISTRY.yaml`, `validation/gate-results.json`, and `scripts/validation/validate.mjs`.
- Reversibility: Medium; the merge method can change if target-branch provenance rules change with it.

## DEC-006 — Canonical ontology as the executable product contract

- Date: 2026-07-13
- Context: The factory walking slice and the initial visual generator retained simplified or representative behavior after the richer ontology was adjudicated.
- Decision: `workflow-model/workflows.json` and its reciprocal registries are the executable workflow contract. Scenarios, fixtures, screen actions, tests, and visual packages validate against its explicit transitions and owners. Workflow-phase trace coverage is stage-aware, but G5 cannot pass until every evidence node has a complete evidence-to-packet chain.
- Alternatives: Preserve a separate simplified workflow contract for the atlas; allow representative-only decision and exception trees; delay trace normalization until final integration.
- Rationale: One operational truth prevents approval, acknowledgement, recovery, provenance, and authority semantics from drifting between source, model, data, screens, tests, and handoff artifacts.
- Affected artifacts: canonical workflow registries, generated visuals, trace registries, WF-001 walking slice, validators, and future scenario/data generation.
- Reversibility: Low; downstream production waves will rely on these stable identifiers and transition semantics.

## DEC-007 — Deterministic append-only season graph

- Date: 2026-07-13
- Context: Representative fixtures cannot prove cross-workflow continuity, corrected history, offline recovery, contract-fruit handoffs, or harvest-to-settlement traceability across a complete operating season.
- Decision: Generate one connected 2026 North Coast composite season from a fixed seed. Keep operational identities stable, record every workflow state change as an append-only event, preserve corrections and supersession rather than rewriting history, and connect shared records through explicit typed links and operational chains. The existing walking slice remains a small regression fixture.
- Alternatives: Hand-author disconnected examples; replace the walking slice; generate nondeterministic samples at test time; flatten the season into current-state snapshots.
- Rationale: A reproducible event graph gives every later scenario, screen, prototype, audit, and Figma handoff a coherent source of truth while keeping failures reviewable in version control.
- Affected artifacts: `data/operation.json`, `data/events.json`, `data/exceptions.json`, `scripts/generate-data.ts`, data schemas, semantic validators, and later scenario and screen fixtures.
- Reversibility: Medium; the seed and generator can evolve through explicit versions without changing stable canonical ontology identifiers.

## DEC-008 — State-aware synthetic evidence and causal record contracts

- Date: 2026-07-13
- Context: Structurally valid generated data can still mislead product work when facts appear before they are knowable, links reverse causal direction, corrections change only metadata, or workflow descriptions omit the records required to realize their states.
- Decision: Treat the synthetic season as an executable knowledge-time graph. Event measurements derive from current transition access; supports, documents, and fulfills links point forward in effective time; corrections and supersessions preserve substantive attributable deltas; named cases must connect to the identities and recovery windows they claim; and canonical state transitions must declare the records their descriptions require. WF-004 actualization therefore reads REC-029 and writes REC-033, while reconciliation reads REC-029 and REC-033 and writes REC-034.
- Alternatives: Validate structure and counts only; allow completed snapshots on every event; keep record semantics outside the canonical transition contract.
- Rationale: Scenarios and screens will inherit these fixtures directly, so truthful availability, authority, chronology, identity, and reconciliation matter more than plausible-looking volume.
- Affected artifacts: `workflow-model/workflows.json`, `scripts/refine-workflow-ontology.mjs`, `scripts/generate-data.ts`, full-season data schemas and validators, `validation/DATA_REVIEW.md`, and downstream scenario fixtures.
- Reversibility: Low for the semantic rules; individual synthetic values and coverage cases remain regenerable.
