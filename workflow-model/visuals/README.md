# Generated workflow visuals

Generator version: `1.0.0`

These editable Mermaid sources are deterministically generated from the canonical workflow-model JSON registries. Regenerate them after canonical model changes; direct edits to generated files will be overwritten.

```powershell
npm run generate:workflow-visuals
npm run validate:workflow-visuals
```

## Coverage

| Category                     |  Count | Definition-of-Done floor |
| ---------------------------- | -----: | -----------------------: |
| Role swimlanes               |     10 |                       10 |
| State machines               |     10 |                        8 |
| Exception and decision trees |     10 |                       10 |
| Required operational visuals |      6 |          6 named visuals |
| **Total**                    | **36** |                          |

## Source integrity

The manifest records SHA-256 hashes for every canonical input. Visual IDs, paths, source references, category counts, and Mermaid declarations are validated by the generator's `--check` mode.

## Role swimlanes

- [VIS-WF-001-SWIMLANE · WF-001 · Seasonal planning, dispatch, execution, and verification · Role swimlane](./wf-001-role-swimlane.mmd)
- [VIS-WF-002-SWIMLANE · WF-002 · Scouting, recommendation, crop protection, and application records · Role swimlane](./wf-002-role-swimlane.mmd)
- [VIS-WF-003-SWIMLANE · WF-003 · Irrigation scheduling, fertility adjustment, and delivery verification · Role swimlane](./wf-003-role-swimlane.mmd)
- [VIS-WF-004-SWIMLANE · WF-004 · Crop estimation and forecast revision · Role swimlane](./wf-004-role-swimlane.mmd)
- [VIS-WF-005-SWIMLANE · WF-005 · Maturity sampling, winery communication, and pick decision · Role swimlane](./wf-005-role-swimlane.mmd)
- [VIS-WF-006-SWIMLANE · WF-006 · Harvest planning, execution, loads, intake, quality, and reconciliation · Role swimlane](./wf-006-role-swimlane.mmd)
- [VIS-WF-007-SWIMLANE · WF-007 · Crew scheduling, attendance, time, payroll, and cost allocation · Role swimlane](./wf-007-role-swimlane.mmd)
- [VIS-WF-008-SWIMLANE · WF-008 · Materials, purchasing, equipment readiness, and repair · Role swimlane](./wf-008-role-swimlane.mmd)
- [VIS-WF-009-SWIMLANE · WF-009 · Grower onboarding, contract-fruit coordination, and relationship history · Role swimlane](./wf-009-role-swimlane.mmd)
- [VIS-WF-010-SWIMLANE · WF-010 · Certification, audit preparation, corrective action, and evidence · Role swimlane](./wf-010-role-swimlane.mmd)

## State machines

- [VIS-WF-001-STATE-MACHINE · WF-001 · Seasonal planning, dispatch, execution, and verification · State machine](./wf-001-state-machine.mmd)
- [VIS-WF-002-STATE-MACHINE · WF-002 · Scouting, recommendation, crop protection, and application records · State machine](./wf-002-state-machine.mmd)
- [VIS-WF-003-STATE-MACHINE · WF-003 · Irrigation scheduling, fertility adjustment, and delivery verification · State machine](./wf-003-state-machine.mmd)
- [VIS-WF-004-STATE-MACHINE · WF-004 · Crop estimation and forecast revision · State machine](./wf-004-state-machine.mmd)
- [VIS-WF-005-STATE-MACHINE · WF-005 · Maturity sampling, winery communication, and pick decision · State machine](./wf-005-state-machine.mmd)
- [VIS-WF-006-STATE-MACHINE · WF-006 · Harvest planning, execution, loads, intake, quality, and reconciliation · State machine](./wf-006-state-machine.mmd)
- [VIS-WF-007-STATE-MACHINE · WF-007 · Crew scheduling, attendance, time, payroll, and cost allocation · State machine](./wf-007-state-machine.mmd)
- [VIS-WF-008-STATE-MACHINE · WF-008 · Materials, purchasing, equipment readiness, and repair · State machine](./wf-008-state-machine.mmd)
- [VIS-WF-009-STATE-MACHINE · WF-009 · Grower onboarding, contract-fruit coordination, and relationship history · State machine](./wf-009-state-machine.mmd)
- [VIS-WF-010-STATE-MACHINE · WF-010 · Certification, audit preparation, corrective action, and evidence · State machine](./wf-010-state-machine.mmd)

## Exception and decision trees

- [VIS-WF-001-EXCEPTION-TREE · WF-001 · Seasonal planning, dispatch, execution, and verification · Exception and decision tree](./wf-001-exception-decision-tree.mmd)
- [VIS-WF-002-EXCEPTION-TREE · WF-002 · Scouting, recommendation, crop protection, and application records · Exception and decision tree](./wf-002-exception-decision-tree.mmd)
- [VIS-WF-003-EXCEPTION-TREE · WF-003 · Irrigation scheduling, fertility adjustment, and delivery verification · Exception and decision tree](./wf-003-exception-decision-tree.mmd)
- [VIS-WF-004-EXCEPTION-TREE · WF-004 · Crop estimation and forecast revision · Exception and decision tree](./wf-004-exception-decision-tree.mmd)
- [VIS-WF-005-EXCEPTION-TREE · WF-005 · Maturity sampling, winery communication, and pick decision · Exception and decision tree](./wf-005-exception-decision-tree.mmd)
- [VIS-WF-006-EXCEPTION-TREE · WF-006 · Harvest planning, execution, loads, intake, quality, and reconciliation · Exception and decision tree](./wf-006-exception-decision-tree.mmd)
- [VIS-WF-007-EXCEPTION-TREE · WF-007 · Crew scheduling, attendance, time, payroll, and cost allocation · Exception and decision tree](./wf-007-exception-decision-tree.mmd)
- [VIS-WF-008-EXCEPTION-TREE · WF-008 · Materials, purchasing, equipment readiness, and repair · Exception and decision tree](./wf-008-exception-decision-tree.mmd)
- [VIS-WF-009-EXCEPTION-TREE · WF-009 · Grower onboarding, contract-fruit coordination, and relationship history · Exception and decision tree](./wf-009-exception-decision-tree.mmd)
- [VIS-WF-010-EXCEPTION-TREE · WF-010 · Certification, audit preparation, corrective action, and evidence · Exception and decision tree](./wf-010-exception-decision-tree.mmd)

## Required operational visuals

- [VIS-OPERATING-MODEL · Vineyard operating model](./operating-model.mmd)
- [VIS-ANNUAL-CALENDAR · Annual vineyard operating calendar](./annual-calendar.mmd)
- [VIS-ROLES-INTERACTION · Roles interaction map](./roles-interaction-map.mmd)
- [VIS-HANDOFF-INFORMATION · Handoff and information map](./handoff-information-map.mmd)
- [VIS-ESTATE-CONTRACT-COMPARISON · Estate-grown versus contract-fruit comparison](./estate-grown-vs-contract-fruit.mmd)
- [VIS-CERTIFICATION-OVERLAY · Certification regime overlay](./certification-overlay.mmd)
