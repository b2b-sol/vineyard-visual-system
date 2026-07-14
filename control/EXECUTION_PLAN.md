# Live Execution Plan

## Canonical workflow families

| ID     | Family                                                                   |
| ------ | ------------------------------------------------------------------------ |
| WF-001 | Seasonal planning, dispatch, execution, and verification                 |
| WF-002 | Scouting, recommendation, crop protection, and application records       |
| WF-003 | Irrigation scheduling, fertility adjustment, and delivery verification   |
| WF-004 | Crop estimation and forecast revision                                    |
| WF-005 | Maturity sampling, winery communication, and pick decision               |
| WF-006 | Harvest planning, execution, loads, intake, quality, and reconciliation  |
| WF-007 | Crew scheduling, attendance, time, payroll, and cost allocation          |
| WF-008 | Materials, purchasing, equipment readiness, and repair                   |
| WF-009 | Grower onboarding, contract-fruit coordination, and relationship history |
| WF-010 | Certification, audit preparation, corrective action, and evidence        |

Cross-cutting overlays: stable block identity; exceptions/escalation; permissions/approval; notification; offline/synchronization/conflict; seasonal hazards; correction/supersession/history.

## Five production waves

1. Plan, dispatch, crew execution, verification, time, and cost.
2. Scout, recommend, protect, irrigate, fertilize, and record restrictions.
3. Estimate, sample, forecast, communicate, and decide pick timing.
4. Harvest, transport, identify loads, weigh, assess quality, and reconcile.
5. Stage materials/equipment, coordinate growers, certify, audit, correct, and resolve cross-cutting exceptions.

## Per-wave acceptance loop

Beginning with WAVE-002, use the accepted WAVE-001 foundation without expanding it: choose the key user task -> compose the complete rendered workflow -> walk normal, exception, and recovery paths on desktop and mobile -> resolve visual and task-review findings -> package construction and Figma handoff evidence -> integrate.

Rendered visual review and task-based walkthroughs are the primary quality mechanism. Machine checks confirm foundation health but do not substitute for a coherent human-visible result. The governing reset is `control/WAVE-002_EXECUTION_ADJUSTMENT.md`.

## Durable gates

- G0 authentication
- G1 control integrity
- G2 deterministic factory
- G3 evidence and workflow fidelity
- G4 scenario and data integrity
- G5 product/action/permission traceability
- G6 interaction coverage
- G7 visual-system quality
- G8 vertical-wave acceptance
- G9 construction and Figma readiness
- G10 integrated validation
- G11 completion audit
- G12 public release

Every gate must reference evidence tied to a commit SHA. Numeric coverage without substantive purpose, valid links, and rendered evidence fails.
