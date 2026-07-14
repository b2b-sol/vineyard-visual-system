# Product structure instructions

This directory defines the product contract between the operational ontology and the rendered atlas.

## Non-negotiable grounding

- Start from canonical workflows, transitions, decisions, roles, records, exceptions, overlays, and deterministic season fixtures.
- Keep source-to-workflow-to-scenario-to-requirement-to-screen traceability explicit and machine-checkable.
- A screen exists to support a consequential operational decision, handoff, recovery, or accountable completion; do not create decorative or generic dashboard inventory.
- Every consequential action names its canonical transition, permission rule, audit event, and sync class.
- Preserve append-only history. Corrections and supersessions must never rewrite prior evidence.

## Coverage

- Cover all ten workflow families and all nine scenario categories.
- Model normal, urgent, blocked, partial, corrected, historical, offline, stale, conflict, and completion behavior wherever relevant.
- Treat responsive desktop and field mobile as connected responsibilities, not duplicated views.
- Resolve permissions from role, organization relationship, scope, record state, transition ownership, delegation, sensitivity, and effective time. Deny consequential actions by default.
- Notifications are consequences of state transitions, never substitutes for canonical state.

## Artifact rules

- Canonical artifacts are structured JSON and editable Mermaid; Markdown is explanatory.
- Generated registries must be reproducible from `scripts/generate-product-model.ts` and checked for drift in CI.
- Stable IDs are permanent once merged: `REQ-*`, `SCR-*`, `FLW-*`, `PERM-*`, `NOT-*`, `SYNC-*`, and `STM-*`.
- Any change to a generated artifact starts in the generator and must preserve semantic validation.

## Review standard

Review product structure for operational authority, actual record evidence, state integrity, offline/conflict recovery, cross-organization boundaries, accessibility implications, and downstream buildability. Counts are coverage floors, not a substitute for substance.
