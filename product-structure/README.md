# Product structure

This directory is the machine-readable product contract for the Vineyard Visual System. It connects the canonical operational model and deterministic season to requirements, screens, permissions, sync behavior, notifications, interaction flows, and downstream component and construction work. Exact event, transition, actor, record, policy, and action pointers are canonical; narrative similarity is not accepted as traceability.

The source of truth is generated deterministically from the workflow ontology, scenario catalog, and season fixture pointers. Run:

```sh
npm run generate:product
npm run validate:product
```

The current product architecture contains 80 scenarios, 100 requirements, 67 registered screens, 235 canonical transition dispositions, 60 permission rules, 235 notification rules, 471 screen-state contracts, 20 exact interaction flows, and 36 component contracts.

## Canonical registries

- `domains.json` — bounded product domains and workflow ownership
- `scope-boundary.json` — included responsibilities, explicit exclusions, and integration seams
- `information-architecture.json` — stable entities, views, routes, and relationships
- `navigation-models.json` — role-aware desktop and mobile navigation
- `role-surface-matrix.json` — role-to-surface responsibility and handoff map
- `platform-matrix.json` — mobile, desktop, responsive, print, and offline responsibility
- `transition-dispositions.json` — one explicit product disposition and exact screen/action owner for every canonical transition
- `permissions.json` — default-deny, transition-specific grants and contextual authorization rules
- `notifications.json` — one stable consequence rule per transition, including escalation, bundling, acknowledgement, and deduplication
- `sync-model.json` — stable action sync classes, device journal, server log, conflict policy, idempotency, and reconciliation
- `requirements.json` — stable requirements derived from exact realized transition partitions
- `screens.json` — the complete registered screen inventory and its exact actions
- `relationships.json` — action-specific typed connections among requirements, screens, policies, records, roles, and workflows
- `state-matrix.json` — canonical-current-state and non-ideal specifications with disjoint available and blocked actions
- `flows.json` — exact event-to-transition-to-action entry, normal, exception, recovery, and completion paths
- `component-requirements.json` — semantic component contracts for downstream visual-system work
- `visuals/` — editable maps generated from the same registries

The companion scenario catalog in `../scenarios/scenarios.json` preserves independent path segments for cross-workflow and historical evidence. A segment boundary is never treated as a direct handoff unless an operational chain or record link explicitly establishes that relationship.

## Design boundary

These artifacts define what the product must make understandable and actionable. Visual direction, token design, component implementation, high-fidelity screens, prototypes, and construction packets remain downstream. Product structure may name required components, but it does not prescribe a visual style.
