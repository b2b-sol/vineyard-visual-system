# Autonomous Quality Gates

## Gate 0 — authentication safety

- Owner authority verified
- Public repository created
- `tiklebot` invited as admin
- Owner-phase checkpoint written
- Implementation not started under owner identity
- Bot identity and admin permission verified before initial commit

## Gate 1 — factory integrity

- Atlas builds locally
- Schemas validate sample records
- Manifest and traceability validators run
- Playwright can render and capture a sample page
- CI and Pages workflows pass
- Governance rules configured after check names exist

## Gate 2 — workflow fidelity

- Two independent source extractions completed
- Adjudication completed
- All priority workflows represented
- Roles, records, decisions, handoffs, exceptions, and confidence included
- No unsupported claims silently labeled as source facts
- Workflow-fidelity score at least 90/100 with no critical finding

## Gate 3 — scenario and product coverage

- Scenario categories covered where applicable
- Every screen traces to a scenario
- Every scenario traces to a workflow
- Product intervention rationale exists
- Mobile/desktop division is explicit
- No orphan major requirements

## Gate 4 — data realism

- One connected synthetic operation drives all visuals
- Referential integrity passes
- Event chronology is coherent
- Messy exception cases exist
- Screens avoid lorem ipsum and disconnected placeholders

## Gate 5 — interaction quality

- Complete end-to-end flow exists for each priority workflow family
- Normal and non-ideal states are designed
- Interaction critic finds no unresolved critical usability problem
- Mobile field tasks are feasible at touch sizes and constrained attention
- Desktop operations support dense repeated review

## Gate 6 — visual system quality

- Three visual directions created and scored
- One direction selected with recorded rationale
- Tokens and components reproduce final screens
- No major visual drift across workflow packages
- Distinctiveness test passes
- Contact sheets and comparison reviews exist

## Gate 7 — rendered implementation

- Production build passes
- Browser smoke and responsive tests pass
- Accessibility automated checks pass with no serious/critical violations
- Navigation and links pass
- Required screenshots are current
- Print/export views render correctly where required

## Gate 8 — Figma readiness

- DTCG token export validates
- Component, screen, prototype, and asset maps are complete
- SVG and preview exports exist
- MCP handoff and migration checklist exist
- No required artifact exists only as a flat image

## Gate 9 — construction readiness

- Construction packets cover every buildable priority workflow slice
- Packets contain state, permissions, data, copy, interactions, dependencies, and acceptance criteria
- A separate agent can understand the packet without rereading the whole project

## Gate 10 — completion audit

Run an independent Sol completion auditor in read-only mode. Completion requires:

- all machine checks green
- no open P0 or P1 finding
- no unresolved internal blocker
- Definition of Done matrix fully satisfied
- public Pages URL works
- final completion report names residual field-validation questions without confusing them with incomplete deliverables

## Severity

- `P0`: prevents safe or meaningful use; blocks completion
- `P1`: major workflow, traceability, rendering, or design-system failure; blocks completion
- `P2`: important quality defect; resolve unless explicitly waived with rationale
- `P3`: polish or future enhancement
