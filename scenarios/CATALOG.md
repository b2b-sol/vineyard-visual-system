# Scenario catalog

The canonical catalog contains **80 substantive scenarios**: 70 workflow-specific slices and 10 cross-workflow packages. Every scenario is generated from exact full-season fixture pointers and retains event, transition, actor assignment, state, record, decision, exception, handoff, and requirement references.

## Coverage

| Dimension                    | Coverage  |
| ---------------------------- | --------- |
| Workflow families            | 10        |
| Fixture pointers             | 60 / 60   |
| Unique season events used    | 384 / 426 |
| Scenario categories          | 9 / 9     |
| Offline-grounded scenarios   | 8         |
| Exception-grounded scenarios | 43        |

## WF-001 · Seasonal planning, dispatch, execution, and verification

| Scenario                                                                               | Category               | Fixtures         | Completion     |
| -------------------------------------------------------------------------------------- | ---------------------- | ---------------- | -------------- |
| SCN-001-01 · Offline field observation reaches approval                                | offline_delayed        | FIX-002          | approved       |
| SCN-001-02 · Ambiguous block is contained, redispatched, and verified                  | blocked                | FIX-002, FIX-052 | verified       |
| SCN-001-03 · Safe partial work is accepted and verified                                | incomplete_information | FIX-003, FIX-053 | verified       |
| SCN-001-04 · Disputed completion quantities are corrected before verification          | correction             | FIX-004, FIX-054 | verified       |
| SCN-001-05 · Contract-block seasonal work is scoped and approved                       | routine                | FIX-005          | approved       |
| SCN-001-06 · Dispatch acknowledgement advances to verified actuals                     | supervisory_review     | FIX-005          | verified       |
| SCN-001-07 · End-to-end estate seasonal work package                                   | routine                | FIX-006          | verified       |
| SCN-900-05 · Heat-paused field work flows into crew time, payroll, and cost allocation | supervisory_review     | FIX-003, FIX-033 | cost_allocated |

## WF-002 · Scouting, recommendation, crop protection, and application records

| Scenario                                                           | Category           | Fixtures         | Completion            |
| ------------------------------------------------------------------ | ------------------ | ---------------- | --------------------- |
| SCN-002-01 · Scout observation becomes treatment recommendation    | routine            | FIX-010          | treatment_recommended |
| SCN-002-02 · Crop-protection lead releases a compliant application | supervisory_review | FIX-010          | scheduled             |
| SCN-002-03 · Handler applies, foreman posts, compliance reports    | routine            | FIX-010          | reported              |
| SCN-002-04 · Follow-up confirms application effectiveness          | supervisory_review | FIX-011          | effective             |
| SCN-002-05 · Wind cancels an otherwise approved application        | urgent             | FIX-007, FIX-055 | cancelled             |
| SCN-002-06 · Offline scouting reveals an REI or PHI conflict       | offline_delayed    | FIX-008, FIX-056 | cancelled             |
| SCN-002-07 · Incorrect application diary entry is corrected        | correction         | FIX-009, FIX-057 | effective             |

## WF-003 · Irrigation scheduling, fertility adjustment, and delivery verification

| Scenario                                                               | Category           | Fixtures         | Completion             |
| ---------------------------------------------------------------------- | ------------------ | ---------------- | ---------------------- |
| SCN-003-01 · Field condition becomes an irrigation recommendation      | routine            | FIX-015          | adjustment_recommended |
| SCN-003-02 · Irrigation recommendation is approved and assigned        | supervisory_review | FIX-015          | approved               |
| SCN-003-03 · Assigned irrigation is delivered and verified             | routine            | FIX-015          | verified               |
| SCN-003-04 · System malfunction interrupts and restarts irrigation     | blocked            | FIX-012, FIX-058 | verified               |
| SCN-003-05 · Late lab evidence supersedes an irrigation adjustment     | urgent             | FIX-013, FIX-059 | superseded             |
| SCN-003-06 · Offline condition evidence reaches managerial approval    | offline_delayed    | FIX-014          | approved               |
| SCN-003-07 · End-to-end irrigation package with verified water actuals | audit_historical   | FIX-016          | verified               |

## WF-004 · Crop estimation and forecast revision

| Scenario                                                                                     | Category           | Fixtures                           | Completion |
| -------------------------------------------------------------------------------------------- | ------------------ | ---------------------------------- | ---------- |
| SCN-004-01 · Contract-fruit sampling becomes a crop estimate                                 | routine            | FIX-019                            | calculated |
| SCN-004-02 · Contract crop estimate is reviewed and published                                | cross_organization | FIX-019                            | published  |
| SCN-004-03 · Published contract estimate is actualized and reconciled                        | audit_historical   | FIX-019                            | reconciled |
| SCN-004-04 · Weather change forces a published estimate revision                             | urgent             | FIX-017, FIX-060                   | reconciled |
| SCN-004-05 · Harvest actual divergence reopens and reconciles forecast                       | correction         | FIX-018, FIX-061                   | reconciled |
| SCN-004-06 · Contract-fruit estimate completes its full lifecycle                            | cross_organization | FIX-020                            | reconciled |
| SCN-004-07 · Estate estimate completes its full lifecycle                                    | routine            | FIX-021                            | reconciled |
| SCN-900-01 · Estate forecast revision survives late sampling and harvest delay to settlement | urgent             | FIX-017, FIX-022, FIX-027, FIX-042 | historical |
| SCN-900-02 · Estate actual divergence and superseded pick recover through load correction    | correction         | FIX-018, FIX-023, FIX-028, FIX-043 | historical |
| SCN-900-03 · Contract fruit survives quality rejection and block-alias dispute               | cross_organization | FIX-019, FIX-024, FIX-029, FIX-044 | historical |
| SCN-900-04 · Contract pick reaches settlement through corrected weigh ticket                 | correction         | FIX-020, FIX-025, FIX-030, FIX-045 | historical |

## WF-005 · Maturity sampling, winery communication, and pick decision

| Scenario                                                                                     | Category               | Fixtures                           | Completion       |
| -------------------------------------------------------------------------------------------- | ---------------------- | ---------------------------------- | ---------------- |
| SCN-005-01 · Contract-fruit sample reaches traceable lab result                              | routine                | FIX-024                            | result_available |
| SCN-005-02 · Maturity evidence becomes a pick proposal                                       | supervisory_review     | FIX-026                            | pick_proposed    |
| SCN-005-03 · Winery authorizes and vineyard schedules contract pick                          | cross_organization     | FIX-024                            | scheduled        |
| SCN-005-04 · Late offline sample triggers a complete resampling cycle                        | offline_delayed        | FIX-022                            | result_available |
| SCN-005-05 · Field and winery measurements are negotiated to authorization                   | incomplete_information | FIX-022                            | scheduled        |
| SCN-005-06 · Winery change supersedes an authorized pick                                     | urgent                 | FIX-023                            | superseded       |
| SCN-005-07 · Contract-fruit maturity cycle reaches scheduled pick                            | cross_organization     | FIX-025                            | scheduled        |
| SCN-900-01 · Estate forecast revision survives late sampling and harvest delay to settlement | urgent                 | FIX-017, FIX-022, FIX-027, FIX-042 | historical       |
| SCN-900-02 · Estate actual divergence and superseded pick recover through load correction    | correction             | FIX-018, FIX-023, FIX-028, FIX-043 | historical       |
| SCN-900-03 · Contract fruit survives quality rejection and block-alias dispute               | cross_organization     | FIX-019, FIX-024, FIX-029, FIX-044 | historical       |
| SCN-900-04 · Contract pick reaches settlement through corrected weigh ticket                 | correction             | FIX-020, FIX-025, FIX-030, FIX-045 | historical       |

## WF-006 · Harvest planning, execution, loads, intake, quality, and reconciliation

| Scenario                                                                                                | Category           | Fixtures                           | Completion     |
| ------------------------------------------------------------------------------------------------------- | ------------------ | ---------------------------------- | -------------- |
| SCN-006-01 · Accept and settle a correctly identified estate load                                       | routine            | FIX-031                            | settled        |
| SCN-006-02 · Replan harvest through missed slot and winery-capacity delay                               | urgent             | FIX-027                            | settled        |
| SCN-006-03 · Correct a wrong arriving block or load identity                                            | correction         | FIX-028                            | settled        |
| SCN-006-04 · Reconcile and settle a rejected load                                                       | blocked            | FIX-029                            | settled        |
| SCN-006-05 · Append a late processor weigh-entry correction                                             | correction         | FIX-030                            | settled        |
| SCN-006-06 · Resolve an intermittent intake identity conflict without losing the field event            | offline_delayed    | FIX-028                            | reconciled     |
| SCN-006-07 · Audit the intake-to-settlement evidence chain                                              | audit_historical   | FIX-027                            | settled        |
| SCN-900-01 · Estate forecast revision survives late sampling and harvest delay to settlement            | urgent             | FIX-017, FIX-022, FIX-027, FIX-042 | historical     |
| SCN-900-02 · Estate actual divergence and superseded pick recover through load correction               | correction         | FIX-018, FIX-023, FIX-028, FIX-043 | historical     |
| SCN-900-03 · Contract fruit survives quality rejection and block-alias dispute                          | cross_organization | FIX-019, FIX-024, FIX-029, FIX-044 | historical     |
| SCN-900-04 · Contract pick reaches settlement through corrected weigh ticket                            | correction         | FIX-020, FIX-025, FIX-030, FIX-045 | historical     |
| SCN-900-06 · Trace an accepted harvest load into grower settlement history                              | cross_organization | FIX-027, FIX-042                   | historical     |
| SCN-900-08 · Carry a wrong-load correction into audit-finding closure                                   | correction         | FIX-028, FIX-048                   | archived       |
| SCN-900-09 · Reconcile harvest delivery with crew time, task quantity, and allocation                   | supervisory_review | FIX-031, FIX-036                   | cost_allocated |
| SCN-900-10 · Resolve contract-block alias, rejected delivery, and withheld certification as one package | supervisory_review | FIX-029, FIX-044, FIX-049          | archived       |

## WF-007 · Crew scheduling, attendance, time, payroll, and cost allocation

| Scenario                                                                                | Category           | Fixtures         | Completion     |
| --------------------------------------------------------------------------------------- | ------------------ | ---------------- | -------------- |
| SCN-007-01 · Schedule, verify, pay, and allocate a routine crew shift                   | routine            | FIX-034          | cost_allocated |
| SCN-007-02 · Recover a shift when a worker is absent and the crew is short              | blocked            | FIX-032          | cost_allocated |
| SCN-007-03 · Pause field labor for heat or safety and resume after re-briefing          | urgent             | FIX-033          | cost_allocated |
| SCN-007-04 · Review and authorize a payroll correction                                  | correction         | FIX-032          | cost_allocated |
| SCN-007-05 · Supervisor verifies time, units, and task progress before payroll          | supervisory_review | FIX-033          | cost_allocated |
| SCN-007-06 · Audit year-end labor cost allocation and correction history                | audit_historical   | FIX-036          | cost_allocated |
| SCN-007-07 · Allocate labor for a contract-fruit block across organizational boundaries | cross_organization | FIX-035          | cost_allocated |
| SCN-900-05 · Heat-paused field work flows into crew time, payroll, and cost allocation  | supervisory_review | FIX-003, FIX-033 | cost_allocated |
| SCN-900-07 · Use corrected labor time as certification audit evidence                   | audit_historical   | FIX-032, FIX-047 | archived       |
| SCN-900-09 · Reconcile harvest delivery with crew time, task quantity, and allocation   | supervisory_review | FIX-031, FIX-036 | cost_allocated |

## WF-008 · Materials, purchasing, equipment readiness, and repair

| Scenario                                                                              | Category               | Fixtures | Completion         |
| ------------------------------------------------------------------------------------- | ---------------------- | -------- | ------------------ |
| SCN-008-01 · Purchase, receive, stage, and reconcile a routine resource demand        | routine                | FIX-039  | cost_reconciled    |
| SCN-008-02 · Substitute and purchase material or PPE that is out of stock             | incomplete_information | FIX-037  | cost_reconciled    |
| SCN-008-03 · Isolate, repair, and return failed equipment during a narrow work window | blocked                | FIX-038  | cost_reconciled    |
| SCN-008-04 · Synchronize an offline field demand before approving substitution        | offline_delayed        | FIX-037  | purchase_requested |
| SCN-008-05 · Approve a resource commitment against priority, budget, and compliance   | supervisory_review     | FIX-040  | ordered            |
| SCN-008-06 · Verify repaired equipment before returning it to active readiness        | urgent                 | FIX-038  | cost_reconciled    |
| SCN-008-07 · Audit purchase-to-readiness and cost evidence                            | audit_historical       | FIX-041  | cost_reconciled    |

## WF-009 · Grower onboarding, contract-fruit coordination, and relationship history

| Scenario                                                                                                | Category           | Fixtures                           | Completion |
| ------------------------------------------------------------------------------------------------------- | ------------------ | ---------------------------------- | ---------- |
| SCN-009-01 · Onboard and settle a grower relationship without exception                                 | routine            | FIX-043                            | historical |
| SCN-009-02 · Resolve a delivery or payment dispute and restore aligned terms                            | correction         | FIX-042                            | historical |
| SCN-009-03 · Correct conflicting winery and operations block aliases                                    | correction         | FIX-044                            | historical |
| SCN-009-04 · Approve grower authority, quality, notice, delivery, and payment terms                     | supervisory_review | FIX-045                            | aligned    |
| SCN-009-05 · Review settled grower history without reopening the agreement                              | audit_historical   | FIX-046                            | historical |
| SCN-009-06 · Continue commercial-dispute recovery after intermittent synchronization                    | offline_delayed    | FIX-042                            | historical |
| SCN-009-07 · Maintain an external grower relationship through settlement                                | cross_organization | FIX-045                            | historical |
| SCN-900-01 · Estate forecast revision survives late sampling and harvest delay to settlement            | urgent             | FIX-017, FIX-022, FIX-027, FIX-042 | historical |
| SCN-900-02 · Estate actual divergence and superseded pick recover through load correction               | correction         | FIX-018, FIX-023, FIX-028, FIX-043 | historical |
| SCN-900-03 · Contract fruit survives quality rejection and block-alias dispute                          | cross_organization | FIX-019, FIX-024, FIX-029, FIX-044 | historical |
| SCN-900-04 · Contract pick reaches settlement through corrected weigh ticket                            | correction         | FIX-020, FIX-025, FIX-030, FIX-045 | historical |
| SCN-900-06 · Trace an accepted harvest load into grower settlement history                              | cross_organization | FIX-027, FIX-042                   | historical |
| SCN-900-10 · Resolve contract-block alias, rejected delivery, and withheld certification as one package | supervisory_review | FIX-029, FIX-044, FIX-049          | archived   |

## WF-010 · Certification, audit preparation, corrective action, and evidence

| Scenario                                                                                                | Category               | Fixtures                  | Completion |
| ------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------- | ---------- |
| SCN-010-01 · Prepare, submit, certify, and archive a complete audit package                             | routine                | FIX-050                   | archived   |
| SCN-010-02 · Close a missing or contradictory evidence gap                                              | incomplete_information | FIX-047                   | archived   |
| SCN-010-03 · Correct noncompliance discovered during audit                                              | correction             | FIX-048                   | archived   |
| SCN-010-04 · Recover certification withheld pending corrective action                                   | blocked                | FIX-049                   | archived   |
| SCN-010-05 · Supervisory review of an evidence package before submission                                | supervisory_review     | FIX-051                   | submitted  |
| SCN-010-06 · Reconstruct the independent review-to-archive decision history                             | audit_historical       | FIX-050                   | archived   |
| SCN-010-07 · Coordinate auditor, certifier, and operator authority through finding closure              | cross_organization     | FIX-048                   | archived   |
| SCN-900-07 · Use corrected labor time as certification audit evidence                                   | audit_historical       | FIX-032, FIX-047          | archived   |
| SCN-900-08 · Carry a wrong-load correction into audit-finding closure                                   | correction             | FIX-028, FIX-048          | archived   |
| SCN-900-10 · Resolve contract-block alias, rejected delivery, and withheld certification as one package | supervisory_review     | FIX-029, FIX-044, FIX-049 | archived   |
