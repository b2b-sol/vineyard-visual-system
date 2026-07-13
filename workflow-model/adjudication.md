# Workflow ontology adjudication

## Decision

The canonical model preserves the ten workflow-family IDs and names in `control/EXECUTION_PLAN.md`. Candidate A supplied the stronger operational depth, exact source-anchor excerpts, exception detail, and record inventory. Candidate B supplied useful distinctions around assignment acknowledgement, cross-organization boundaries, offline provenance, and certification constraints. The canonical result combines those strengths without copying either candidate's unsupported evidence identifiers or treating an optional failure branch as a mandatory happy path.

The source report remains evidence, not a universal SOP. Each workflow therefore retains its source classification, confidence, limitations through field-validation questions, and explicit organizational authority uncertainty.

## Evidence adjudication

Candidate A incorrectly assigned every workflow to `EVD-001`. Candidate B used the intended family-specific claims for several workflows but also referenced undefined claims `EVD-013` through `EVD-018`. Canonical mappings use only `EVD-001` through `EVD-012` and follow the workflow assignments in `source/evidence.json`: the family-specific claim is primary, `EVD-011` supplies stable-identity requirements, and `EVD-012` is added only to families explicitly covered by the hazard/exception claim.

| Workflow | Canonical evidence        | Classification   | Confidence  |
| -------- | ------------------------- | ---------------- | ----------- |
| WF-001   | EVD-001, EVD-011, EVD-012 | strong_inference | medium-high |
| WF-002   | EVD-002, EVD-011, EVD-012 | confirmed_source | high        |
| WF-003   | EVD-003, EVD-011, EVD-012 | strong_inference | medium-high |
| WF-004   | EVD-004, EVD-011          | confirmed_source | high        |
| WF-005   | EVD-005, EVD-011, EVD-012 | confirmed_source | high        |
| WF-006   | EVD-006, EVD-011, EVD-012 | confirmed_source | high        |
| WF-007   | EVD-007, EVD-011, EVD-012 | strong_inference | medium      |
| WF-008   | EVD-008, EVD-011, EVD-012 | strong_inference | medium      |
| WF-009   | EVD-009, EVD-011, EVD-012 | strong_inference | medium-high |
| WF-010   | EVD-010, EVD-011          | confirmed_source | high        |

## Material disagreements and rulings

| Topic                      | Candidate A                                                                                                               | Candidate B                                                                                                  | Canonical ruling                                                                                                                                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| State vocabulary           | Rich but sometimes used `approved`, `authorized`, `effective`, and record outcomes inconsistently.                        | Clearer acknowledgement, stale, disputed, correction, and supersession states.                               | States are domain-specific but stages retain the shared ontology: observation, recommendation, approval, assignment, execution, completion, verification, reconciliation, correction, supersession.                                 |
| Primary paths              | Some paths made correction or failure mandatory, especially crew/payroll, equipment, grower, and certification workflows. | Some paths skipped required record or decision distinctions and also mixed normal and exception transitions. | Each ordered step list is one internally continuous primary path. Optional blocked, partial, stale, disputed, rejected, repair, corrective-action, and resubmission branches live in the exception registry with explicit recovery. |
| Assignment acknowledgement | Dispatch moved directly from assignment to execution.                                                                     | Foreman acknowledgement was explicit.                                                                        | Retained for WF-001 because changed or stale field instructions are consequential; it remains assignment, not approval or execution.                                                                                                |
| Crop protection record     | Application, posting, reporting, and efficacy follow-up were distinct.                                                    | Application moved directly to a single recorded state.                                                       | Retained A's more defensible chain because worker posting, regulatory/buyer diary, and efficacy verification are separate obligations.                                                                                              |
| Irrigation authority       | Adjustment could move from recommendation to assignment without explicit approval.                                        | Manager approval was explicit.                                                                               | Added an approval step while recording that delegated authority remains a field-validation question.                                                                                                                                |
| Equipment repair           | Failure and repair appeared inline after a readiness path with a disconnected transition.                                 | Repair was mostly represented as states and exceptions.                                                      | Procurement/readiness is the primary path; failure, safe partial work, substitution, repair, and return-to-service verification are explicit exception/recovery records.                                                            |
| Grower coordination        | Relationship correction appeared mandatory before settlement.                                                             | Amendment and exception states were richer.                                                                  | Normal onboarding-to-history remains continuous; missing history, identity conflict, amendment, corrective action, dispute, suspension, and cross-org reconciliation are optional branches.                                         |
| Certification              | The ordered path assumed every audit created a corrective action.                                                         | Corrective action was also embedded in the main sequence.                                                    | The normal path can certify directly; findings, withheld certification, remediation, resubmission, and independent verification are explicit recovery branches and never self-approved.                                             |
| Overlays                   | Seven packet-level cross-cutting overlays.                                                                                | Nine overlays, including estate/contract boundary and certification regime constraints.                      | Retained the seven execution-plan overlays and added those two evidence-backed domain overlays because the source report treats them as operational modifiers, not merely workflow-10 details.                                      |
| Role aliases               | `PESTICIDE-HANDLER`, `HARVEST-CREW-LEADER`, `TRANSPORTATION`, and `LAB`.                                                  | `APPLICATOR`, `HARVEST-LEAD`, `DRIVER`, and `LAB-TECH`.                                                      | Retained A's source-nearer role IDs to avoid unsupported narrowing; role actions and organizational scope are separately attributable.                                                                                              |

## Explicit ontology decisions

- Stable identity is an effective-dated record with aliases, predecessor/successor links, provenance, and an unresolved-conflict state; it is not a mutable block name.
- Observation does not authorize action. Recommendation does not approve it. Approval does not assign it. Assignment does not prove execution. Completion does not prove verification.
- Reconciliation compares records across operational, compliance, payroll, cost, delivery, or settlement contexts. Correction creates an attributable successor value. Supersession changes which version is current without erasing history.
- A single person may hold multiple roles, but each consequential action records the role, organization, authority source, effective time, and evidence used.
- Cross-organization handoffs preserve both parties, their record versions, acknowledgements, decision rights, deadlines, and disputes.
- Offline or delayed capture preserves observed, captured, and synchronized time plus source version. Conflicts require accountable resolution and never silently overwrite a newer decision or restriction.
- Hazards and urgent events can preempt the calendar, but they do not erase safe partial work, worker restrictions, commercial consequences, or subsequent reconciliation.
- The model does not invent screens, channels, thresholds, legal universals, or organization-specific approval limits.

## Registry scope

- `workflows.json`: 10 evidence-backed workflow families, schema-compatible objects, primary transitions, decisions, records, handoffs, and field questions.
- `roles.json`: every referenced role with organizational layer, responsibility, authority uncertainty, inputs, outputs, evidence, and workflow coverage.
- `records.json`: every record named by a workflow with stable IDs, provenance, lifecycle, correction policy, evidence, and related records.
- `decisions.json`: every embedded workflow decision with transition context, required inputs, records, evidence, and source anchors.
- `exceptions.json`: every workflow exception with affected scope, accountable owner, escalation, recovery actions/states, closure evidence, and downstream reconciliation.
- `overlays.json`: stable identity, exception/escalation, permission, notification, offline/conflict, hazards, historical truth, organization boundary, and certification constraints.

## Validation performed

The adjudication check validates all ten workflow objects against `schemas/workflow.schema.json`; enforces unique workflow, role, record, decision, exception, and overlay IDs; verifies every workflow role, decision, record, evidence claim, step owner, transition state, and overlay workflow reference; requires contiguous ordered primary paths; confirms every source anchor is present in the full source report; and confirms all ten primary evidence claims map back to their declared workflow in `source/evidence.json`.
