# Connected Synthetic Season Review

Status: **Approved**  
Task: `DATA-001`  
Review date: 2026-07-13  
Decision: No unresolved P0 or P1 findings

## Reviewed scope

The review covered the deterministic `OPR-001` season in `data/operation.json`, `data/events.json`, and `data/exceptions.json`; its schemas and generator; the canonical workflow contracts it implements; and the generated coverage evidence in `validation/data-coverage.json`.

The season is a fictional 2026 California North Coast composite. It is product-test data, not agronomic, labor, pesticide, certification, legal, accounting, or commercial advice.

## Review method

DATA-001 used a creator–critic–integrator loop:

1. The creator built the operation, append-only event ledger, exception histories, generator, schemas, and coverage report.
2. The parent integrator added schema validation, semantic graph invariants, definition-specific fact contracts, causal chronology, seasonal plausibility, correction and supersession rules, chain reconciliation, named-case checks, currentness checks, and negative unit tests.
3. An independent read-only critic repeatedly replayed the generated season and rejected candidates that were structurally valid but operationally false.
4. The generator was repaired at source after every rejection; checked-in JSON was never hand-corrected.
5. The critic reran all cumulative findings against the final frozen candidate and approved it with no unresolved P0/P1 findings.

## Rejected candidates and material repairs

Early candidates were rejected for cross-scope record reuse, records that preceded their evidence, generic facts, short artificial timelines, nonreciprocal recovery histories, false record-link semantics, one result standing in for several decisions, and contract chains that did not represent distinct growers.

Later candidates were rejected for subtler truth defects:

- Soil, tissue, equipment, transport, labor, and audit records inherited facts from the wrong operational families.
- Supersession changed metadata rather than authoritative values, and corrected weigh cases lacked real predecessor/successor lineage.
- Crop-estimate and maturity work occurred in implausible dormant-season windows.
- Causal record links pointed backward in time or reversed authorization direction.
- Weigh bills, delivery tonnage, and settlement amounts described different quantities.
- Events exposed final measurements before the workflow produced them.
- The flagship changed-block case cited a different block's alias history.
- Harvest actuals were missing from three actualized crop-estimate workflows.
- The canonical WF-004 actualization and reconciliation transitions described harvest actuals but omitted their record read/write contracts.

These defects and their repairs are recorded as `FIND-026` through `FIND-041` in `validation/FINDINGS.yaml`.

## Final inventory

| Measure                               |                         Final result |
| ------------------------------------- | -----------------------------------: |
| Organizations                         |                                    9 |
| Properties                            |                                    4 |
| Blocks active in the season           |                             12 of 12 |
| Contracts active in the season        |                               3 of 3 |
| Canonical roles assigned              |                             30 of 30 |
| Workflow instances                    |                                   50 |
| State events                          |                                  426 |
| Canonical record definitions realized |                           103 of 103 |
| Record instances                      |                                  506 |
| Attributable record corrections       |                                   12 |
| Substantive reciprocal supersessions  |                                    4 |
| Difficult exception histories         |                                   25 |
| Canonical decisions exercised         |                             40 of 40 |
| Overlays applied                      |                               9 of 9 |
| Causal cross-workflow record links    |                                  116 |
| Harvest-to-settlement chains          | 4: two estate and two contract-fruit |
| Months represented                    |                                   12 |
| Offline events / workflows            |                               10 / 5 |
| Conflict events / workflows           |                                5 / 5 |

The final season includes 40 multi-day workflow instances, 18 instances lasting at least one week, and a longest workflow duration of 111 days. The four harvest chains reconcile stable identity, authorization, load, weight, delivery, quality, contract context, and settlement evidence.

## Acceptance evidence

- `npm run validate:data`: passed with 20,150 assertions.
- `npm run validate:data-current`: deterministic output matches the generator and current canonical source hashes.
- `npm run validate:workflow-model-current`: passed after the WF-004 record-contract repair.
- `npm run validate:workflow-visuals`: all 36 editable diagrams are current.
- `npm run typecheck`: passed.
- `npm run lint`: passed with zero warnings.
- `npm run test:unit`: 21 of 21 tests passed, including negative tests for reference, chronology, authority, correction, multi-decision, link, unit, supersession, future-knowledge, and harvest-actual failures.
- Independent cumulative critic replay: approved with zero remaining problems and no unresolved P0/P1 findings.

## Residual risk and use constraints

The data is deliberately broad enough to drive product scenarios and rendered states, but it is not a production operational database and does not establish jurisdiction-specific compliance or commercial rules. Later product work must preserve event time, record version, assignment authority, stable identity, source confidence, correction lineage, and the explicit distinction between simulated integrations and product-owned state.

Any future generator change must be followed by currentness, semantic validation, unit tests, and an impact review of named cases and operational chains. Count growth alone is not evidence of better coverage.
