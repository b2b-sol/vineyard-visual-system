# Workflow ontology review

## Result

WF-002 is approved at the branch checkpoint. The canonical ontology and operational visual library pass deterministic validation and independent read-only review with no open P0, P1, or P2 findings.

## Review loop

1. Two independent extractors produced structured candidates from the discovery report.
2. An adjudicator reconciled evidence identifiers, primary paths, roles, records, decisions, exceptions, overlays, and uncertainty.
3. An independent critic requested changes for disconnected states, mechanical relationships, incorrect decision placement, incomplete role layers and lifecycles, an overlay/evidence contradiction, and representative-only visuals.
4. The integrator rebuilt the operational graph and relationship model, generated complete editable visuals, expanded semantic traceability, and aligned the factory walking slice to the canonical WF-001 contract.
5. A second independent read-only review found four remaining P1 issues: misplaced WF-007 briefing provenance, retired role-layer names in two visuals, representative-only decision/exception trees, and failing formatting/currentness gates.
6. The integrator repaired those issues and added regression checks that reject incomplete role and exception/decision coverage.
7. The same independent reviewer re-ran the current branch and approved WF-002 with no open P0, P1, or P2 findings.

## Accepted model

- 10 workflow families with 235 typed transitions and explicit terminal states.
- 30 roles across ownership governance, operational middle, field execution, office support, and outside-party layers.
- 103 attributable records with 17 semantically validated lifecycle signatures.
- 40 accountable decisions and 62 exception/recovery definitions with reciprocal, non-Cartesian relationships.
- 9 cross-cutting overlays aligned to normalized evidence scope.
- 36 editable Mermaid diagrams: 10 role swimlanes, 10 state machines, 10 complete decision/exception trees, and 6 required operating views.
- 12 normalized evidence claims traced to all 10 workflows; the existing WF-001 chain continues through scenario, fixture, screen, component, and construction packet.

## Material rulings verified

- WF-002 distinguishes recommendation, approval, application-time preflight, reporting completeness, efficacy follow-up, correction, and re-recommendation.
- WF-003 uses vineyard-manager approval through DEC-024.
- WF-007 records the safety briefing on `crew_scheduled -> briefed`, reads qualification evidence, and treats briefing as assignment readiness rather than approval.
- WF-010 supports direct certification on a compliant review; noncompliance, withholding, remediation, resubmission, and DEC-094 remain corrective branches.
- OVL-006 excludes WF-004, matching EVD-012.
- Cross-workflow records such as REC-080 remain read-only outside their owning write workflow.
- Corrections and supersessions preserve predecessor evidence and never silently overwrite history.

## Validation evidence

- `npm run verify`: passed, including formatting, lint, typecheck, 20,603 semantic assertions, generator currentness, 36 Mermaid renders, 7 unit tests, production build, and repository audit.
- `npm run test:browser`: 9 passed and 1 intentional viewport-specific skip; desktop and Pixel 7 paths preserve canonical recovery, offline capture, conflict handling, and accessibility checks.
- Independent re-review: all 235 transitions current; all five role layers and 30 roles materially rendered; all 62 exceptions and 40 decisions materially rendered; no open P0, P1, or P2 findings.

The target-branch commit and G3 completion evidence are intentionally deferred until protected squash delivery and provenance reconciliation, as required by DEC-005.
