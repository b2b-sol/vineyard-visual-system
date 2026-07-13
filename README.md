# Vineyard Visual System

A workflow-grounded visual atlas and construction library for a vineyard information system.

The repository models vineyard operations as connected coordination loops: observation to action, plan to crew execution, application to compliance record, estimate to winery forecast, maturity to pick decision, harvest to weigh-ticket reconciliation, and field activity to time and cost reporting.

## Current status

Autonomous production is active. Bot authentication and the packet review are complete; the deterministic atlas factory is the next executable phase. Durable status lives in:

- `control/PROJECT_STATE.yaml`
- `control/TASK_REGISTRY.yaml`
- `control/DOD_MATRIX.yaml`
- `control/EXECUTION_PLAN.md`

## Product boundary

This is an implementation-grade design and reference system with simulated interactions, not production farm-management software and not legal, agronomic, labor, pesticide, certification, or contract advice.

## Source of truth

The foundational operational source is `source/Vineyard-Workflow-Discovery-report.md`. `MASTER_GOAL.md` and `DEFINITION_OF_DONE.md` define the finished result; `PACKET_REVIEW.md` records the approved execution-system refinements.

Local setup and the public atlas tour will be expanded as the factory becomes operational.
