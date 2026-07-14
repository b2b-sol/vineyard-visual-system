import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import prettier from "prettier";

import { allocateRequirementTransitions } from "./product-requirement-allocation.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");
const readJson = async <T>(relativePath: string): Promise<T> =>
  JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8")) as T;
const unique = <T>(values: T[]) => [...new Set(values)];
const pad = (value: number, width = 3) => String(value).padStart(width, "0");

type Fixture = {
  id: string;
  title: string;
  workflow_id: string;
  workflow_instance_id: string;
  event_ids: string[];
  record_instance_ids: string[];
  exception_history_ids: string[];
  operational_chain_ids: string[];
  overlay_ids: string[];
  block_ids: string[];
  contract_ids: string[];
  actor_assignment_ids: string[];
  started_at: string;
  completed_at: string;
};
type Event = {
  id: string;
  sequence: number;
  workflow_instance_id: string;
  workflow_id: string;
  transition_id: string;
  from_state: string | null;
  to_state: string;
  kind: string;
  occurred_at: string;
  recorded_at: string;
  actor_assignment_id: string;
  reason: string;
  record_reads: string[];
  record_writes: string[];
  decision_ids: string[];
  decision_results: Array<{ decision_id: string; outcome: string }>;
  exception_history_ids: string[];
  connectivity: {
    mode: string;
    captured_offline: boolean;
    sync_status: string;
    synced_at?: string;
  };
};
type Workflow = {
  id: string;
  name: string;
  purpose: string;
  roles: string[];
  states: string[];
  decisions: Array<{ id: string; question: string; owner: string }>;
  transitions: Array<{
    id: string;
    from: string | null;
    to: string;
    kind: string;
    owner: string;
    trigger: string;
    decision_ids: string[];
    exception_ids: string[];
    record_reads: string[];
    record_writes: string[];
  }>;
};
type RecordInstance = {
  id: string;
  record_definition_id: string;
  workflow_instance_ids: string[];
  block_ids: string[];
  contract_ids: string[];
  lifecycle_state: string;
  source_event_id?: string;
  supersedes_record_instance_id?: string;
  superseded_by_record_instance_id?: string;
};
type Assignment = { id: string; role_id: string; person_id: string };
type OperationLink = {
  id: string;
  source_record_instance_id: string;
  target: { entity_type: string; entity_id: string };
  relation: string;
  chain_id?: string;
};
type OperationalChain = {
  id: string;
  workflow_instance_ids: string[];
  record_instance_ids: string[];
  link_ids: string[];
};
type Profile = {
  id: string;
  title: string;
  category: string;
  fixtureIds: string[];
  selection?: string;
  workflowIds?: string[];
  focus?: string;
};

const p = (
  id: string,
  title: string,
  category: string,
  fixtureIds: string[],
  selection = "full",
  focus = title,
): Profile => ({ id, title, category, fixtureIds, selection, focus });

const profiles: Profile[] = [
  p(
    "SCN-001-01",
    "Offline field observation reaches approval",
    "offline_delayed",
    ["FIX-002"],
    "head:3",
  ),
  p(
    "SCN-001-02",
    "Ambiguous block is contained, redispatched, and verified",
    "blocked",
    ["FIX-002", "FIX-052"],
    "tail:7",
  ),
  p(
    "SCN-001-03",
    "Safe partial work is accepted and verified",
    "incomplete_information",
    ["FIX-003", "FIX-053"],
    "tail:4",
  ),
  p(
    "SCN-001-04",
    "Disputed completion quantities are corrected before verification",
    "correction",
    ["FIX-004", "FIX-054"],
    "tail:4",
  ),
  p(
    "SCN-001-05",
    "Contract-block seasonal work is scoped and approved",
    "routine",
    ["FIX-005"],
    "head:3",
  ),
  p(
    "SCN-001-06",
    "Dispatch acknowledgement advances to verified actuals",
    "supervisory_review",
    ["FIX-005"],
    "tail:5",
  ),
  p("SCN-001-07", "End-to-end estate seasonal work package", "routine", [
    "FIX-006",
  ]),

  p(
    "SCN-002-01",
    "Scout observation becomes treatment recommendation",
    "routine",
    ["FIX-010"],
    "head:2",
  ),
  p(
    "SCN-002-02",
    "Crop-protection lead releases a compliant application",
    "supervisory_review",
    ["FIX-010"],
    "slice:2:4",
  ),
  p(
    "SCN-002-03",
    "Handler applies, foreman posts, compliance reports",
    "routine",
    ["FIX-010"],
    "slice:5:7",
  ),
  p(
    "SCN-002-04",
    "Follow-up confirms application effectiveness",
    "supervisory_review",
    ["FIX-011"],
    "tail:2",
  ),
  p("SCN-002-05", "Wind cancels an otherwise approved application", "urgent", [
    "FIX-007",
    "FIX-055",
  ]),
  p(
    "SCN-002-06",
    "Offline scouting reveals an REI or PHI conflict",
    "offline_delayed",
    ["FIX-008", "FIX-056"],
  ),
  p(
    "SCN-002-07",
    "Incorrect application diary entry is corrected",
    "correction",
    ["FIX-009", "FIX-057"],
    "tail:5",
  ),

  p(
    "SCN-003-01",
    "Field condition becomes an irrigation recommendation",
    "routine",
    ["FIX-015"],
    "head:2",
  ),
  p(
    "SCN-003-02",
    "Irrigation recommendation is approved and assigned",
    "supervisory_review",
    ["FIX-015"],
    "head:3",
  ),
  p(
    "SCN-003-03",
    "Assigned irrigation is delivered and verified",
    "routine",
    ["FIX-015"],
    "tail:4",
  ),
  p(
    "SCN-003-04",
    "System malfunction interrupts and restarts irrigation",
    "blocked",
    ["FIX-012", "FIX-058"],
  ),
  p(
    "SCN-003-05",
    "Late lab evidence supersedes an irrigation adjustment",
    "urgent",
    ["FIX-013", "FIX-059"],
    "head:3",
  ),
  p(
    "SCN-003-06",
    "Offline condition evidence reaches managerial approval",
    "offline_delayed",
    ["FIX-014"],
    "head:3",
  ),
  p(
    "SCN-003-07",
    "End-to-end irrigation package with verified water actuals",
    "audit_historical",
    ["FIX-016"],
  ),

  p(
    "SCN-004-01",
    "Contract-fruit sampling becomes a crop estimate",
    "routine",
    ["FIX-019"],
    "head:2",
  ),
  p(
    "SCN-004-02",
    "Contract crop estimate is reviewed and published",
    "cross_organization",
    ["FIX-019"],
    "slice:2:3",
  ),
  p(
    "SCN-004-03",
    "Published contract estimate is actualized and reconciled",
    "audit_historical",
    ["FIX-019"],
    "tail:3",
  ),
  p(
    "SCN-004-04",
    "Weather change forces a published estimate revision",
    "urgent",
    ["FIX-017", "FIX-060"],
  ),
  p(
    "SCN-004-05",
    "Harvest actual divergence reopens and reconciles forecast",
    "correction",
    ["FIX-018", "FIX-061"],
  ),
  p(
    "SCN-004-06",
    "Contract-fruit estimate completes its full lifecycle",
    "cross_organization",
    ["FIX-020"],
  ),
  p("SCN-004-07", "Estate estimate completes its full lifecycle", "routine", [
    "FIX-021",
  ]),

  p(
    "SCN-005-01",
    "Contract-fruit sample reaches traceable lab result",
    "routine",
    ["FIX-024"],
    "head:3",
  ),
  p(
    "SCN-005-02",
    "Maturity evidence becomes a pick proposal",
    "supervisory_review",
    ["FIX-026"],
    "slice:2:4",
  ),
  p(
    "SCN-005-03",
    "Winery authorizes and vineyard schedules contract pick",
    "cross_organization",
    ["FIX-024"],
    "tail:3",
  ),
  p(
    "SCN-005-04",
    "Late offline sample triggers a complete resampling cycle",
    "offline_delayed",
    ["FIX-022"],
    "head:7",
  ),
  p(
    "SCN-005-05",
    "Field and winery measurements are negotiated to authorization",
    "incomplete_information",
    ["FIX-022"],
    "tail:4",
  ),
  p(
    "SCN-005-06",
    "Winery change supersedes an authorized pick",
    "urgent",
    ["FIX-023"],
    "tail:3",
  ),
  p(
    "SCN-005-07",
    "Contract-fruit maturity cycle reaches scheduled pick",
    "cross_organization",
    ["FIX-025"],
  ),

  p(
    "SCN-006-01",
    "Accept and settle a correctly identified estate load",
    "routine",
    ["FIX-031"],
  ),
  p(
    "SCN-006-02",
    "Replan harvest through missed slot and winery-capacity delay",
    "urgent",
    ["FIX-027"],
  ),
  p(
    "SCN-006-03",
    "Correct a wrong arriving block or load identity",
    "correction",
    ["FIX-028"],
  ),
  p("SCN-006-04", "Reconcile and settle a rejected load", "blocked", [
    "FIX-029",
  ]),
  p(
    "SCN-006-05",
    "Append a late processor weigh-entry correction",
    "correction",
    ["FIX-030"],
  ),
  p(
    "SCN-006-06",
    "Resolve an intermittent intake identity conflict without losing the field event",
    "offline_delayed",
    ["FIX-028"],
    "slice:3:7",
  ),
  p(
    "SCN-006-07",
    "Audit the intake-to-settlement evidence chain",
    "audit_historical",
    ["FIX-027"],
    "tail:6",
  ),

  p(
    "SCN-007-01",
    "Schedule, verify, pay, and allocate a routine crew shift",
    "routine",
    ["FIX-034"],
  ),
  p(
    "SCN-007-02",
    "Recover a shift when a worker is absent and the crew is short",
    "blocked",
    ["FIX-032"],
  ),
  p(
    "SCN-007-03",
    "Pause field labor for heat or safety and resume after re-briefing",
    "urgent",
    ["FIX-033"],
  ),
  p(
    "SCN-007-04",
    "Review and authorize a payroll correction",
    "correction",
    ["FIX-032"],
    "tail:5",
  ),
  p(
    "SCN-007-05",
    "Supervisor verifies time, units, and task progress before payroll",
    "supervisory_review",
    ["FIX-033"],
    "tail:4",
  ),
  p(
    "SCN-007-06",
    "Audit year-end labor cost allocation and correction history",
    "audit_historical",
    ["FIX-036"],
  ),
  p(
    "SCN-007-07",
    "Allocate labor for a contract-fruit block across organizational boundaries",
    "cross_organization",
    ["FIX-035"],
  ),

  p(
    "SCN-008-01",
    "Purchase, receive, stage, and reconcile a routine resource demand",
    "routine",
    ["FIX-039"],
  ),
  p(
    "SCN-008-02",
    "Substitute and purchase material or PPE that is out of stock",
    "incomplete_information",
    ["FIX-037"],
  ),
  p(
    "SCN-008-03",
    "Isolate, repair, and return failed equipment during a narrow work window",
    "blocked",
    ["FIX-038"],
  ),
  p(
    "SCN-008-04",
    "Synchronize an offline field demand before approving substitution",
    "offline_delayed",
    ["FIX-037"],
    "head:5",
  ),
  p(
    "SCN-008-05",
    "Approve a resource commitment against priority, budget, and compliance",
    "supervisory_review",
    ["FIX-040"],
    "head:4",
  ),
  p(
    "SCN-008-06",
    "Verify repaired equipment before returning it to active readiness",
    "urgent",
    ["FIX-038"],
    "tail:7",
  ),
  p(
    "SCN-008-07",
    "Audit purchase-to-readiness and cost evidence",
    "audit_historical",
    ["FIX-041"],
  ),

  p(
    "SCN-009-01",
    "Onboard and settle a grower relationship without exception",
    "routine",
    ["FIX-043"],
  ),
  p(
    "SCN-009-02",
    "Resolve a delivery or payment dispute and restore aligned terms",
    "correction",
    ["FIX-042"],
  ),
  p(
    "SCN-009-03",
    "Correct conflicting winery and operations block aliases",
    "correction",
    ["FIX-044"],
  ),
  p(
    "SCN-009-04",
    "Approve grower authority, quality, notice, delivery, and payment terms",
    "supervisory_review",
    ["FIX-045"],
    "head:4",
  ),
  p(
    "SCN-009-05",
    "Review settled grower history without reopening the agreement",
    "audit_historical",
    ["FIX-046"],
    "tail:3",
  ),
  p(
    "SCN-009-06",
    "Continue commercial-dispute recovery after intermittent synchronization",
    "offline_delayed",
    ["FIX-042"],
    "tail:7",
  ),
  p(
    "SCN-009-07",
    "Maintain an external grower relationship through settlement",
    "cross_organization",
    ["FIX-045"],
  ),

  p(
    "SCN-010-01",
    "Prepare, submit, certify, and archive a complete audit package",
    "routine",
    ["FIX-050"],
  ),
  p(
    "SCN-010-02",
    "Close a missing or contradictory evidence gap",
    "incomplete_information",
    ["FIX-047"],
  ),
  p(
    "SCN-010-03",
    "Correct noncompliance discovered during audit",
    "correction",
    ["FIX-048"],
  ),
  p(
    "SCN-010-04",
    "Recover certification withheld pending corrective action",
    "blocked",
    ["FIX-049"],
  ),
  p(
    "SCN-010-05",
    "Supervisory review of an evidence package before submission",
    "supervisory_review",
    ["FIX-051"],
    "head:4",
  ),
  p(
    "SCN-010-06",
    "Reconstruct the independent review-to-archive decision history",
    "audit_historical",
    ["FIX-050"],
    "tail:4",
  ),
  p(
    "SCN-010-07",
    "Coordinate auditor, certifier, and operator authority through finding closure",
    "cross_organization",
    ["FIX-048"],
    "tail:9",
  ),

  {
    ...p(
      "SCN-900-01",
      "Estate forecast revision survives late sampling and harvest delay to settlement",
      "urgent",
      ["FIX-017", "FIX-022", "FIX-027", "FIX-042"],
    ),
    workflowIds: ["WF-004", "WF-005", "WF-006", "WF-009"],
  },
  {
    ...p(
      "SCN-900-02",
      "Estate actual divergence and superseded pick recover through load correction",
      "correction",
      ["FIX-018", "FIX-023", "FIX-028", "FIX-043"],
    ),
    workflowIds: ["WF-004", "WF-005", "WF-006", "WF-009"],
  },
  {
    ...p(
      "SCN-900-03",
      "Contract fruit survives quality rejection and block-alias dispute",
      "cross_organization",
      ["FIX-019", "FIX-024", "FIX-029", "FIX-044"],
    ),
    workflowIds: ["WF-004", "WF-005", "WF-006", "WF-009"],
  },
  {
    ...p(
      "SCN-900-04",
      "Contract pick reaches settlement through corrected weigh ticket",
      "correction",
      ["FIX-020", "FIX-025", "FIX-030", "FIX-045"],
    ),
    workflowIds: ["WF-004", "WF-005", "WF-006", "WF-009"],
  },
  {
    ...p(
      "SCN-900-05",
      "Heat-paused field work flows into crew time, payroll, and cost allocation",
      "supervisory_review",
      ["FIX-003", "FIX-033"],
    ),
    workflowIds: ["WF-001", "WF-007"],
  },
  {
    ...p(
      "SCN-900-06",
      "Trace an accepted harvest load into grower settlement history",
      "cross_organization",
      ["FIX-027", "FIX-042"],
    ),
    workflowIds: ["WF-006", "WF-009"],
  },
  {
    ...p(
      "SCN-900-07",
      "Use corrected labor time as certification audit evidence",
      "audit_historical",
      ["FIX-032", "FIX-047"],
    ),
    workflowIds: ["WF-007", "WF-010"],
  },
  {
    ...p(
      "SCN-900-08",
      "Carry a wrong-load correction into audit-finding closure",
      "correction",
      ["FIX-028", "FIX-048"],
    ),
    workflowIds: ["WF-006", "WF-010"],
  },
  {
    ...p(
      "SCN-900-09",
      "Reconcile harvest delivery with crew time, task quantity, and allocation",
      "supervisory_review",
      ["FIX-031", "FIX-036"],
    ),
    workflowIds: ["WF-006", "WF-007"],
  },
  {
    ...p(
      "SCN-900-10",
      "Resolve contract-block alias, rejected delivery, and withheld certification as one package",
      "supervisory_review",
      ["FIX-029", "FIX-044", "FIX-049"],
    ),
    workflowIds: ["WF-006", "WF-009", "WF-010"],
  },
];

const [fixtureDocument, eventDocument, operation, workflowDocument] =
  await Promise.all([
    readJson<{ fixtures: Fixture[] }>("data/scenario-fixtures.json"),
    readJson<{ events: Event[] }>("data/events.json"),
    readJson<{
      operation_id: string;
      generated_at: string;
      record_instances: RecordInstance[];
      role_assignments: Assignment[];
      links: OperationLink[];
      operational_chains: OperationalChain[];
    }>("data/operation.json"),
    readJson<{ workflows: Workflow[] }>("workflow-model/workflows.json"),
  ]);

const fixtures = fixtureDocument.fixtures;
const events = eventDocument.events;
const workflows = workflowDocument.workflows;
const fixtureIndex = new Map(fixtures.map((fixture) => [fixture.id, fixture]));
const eventIndex = new Map(events.map((event) => [event.id, event]));
const workflowIndex = new Map(
  workflows.map((workflow) => [workflow.id, workflow]),
);
const assignmentIndex = new Map(
  operation.role_assignments.map((assignment) => [assignment.id, assignment]),
);
const recordInstanceIndex = new Map(
  operation.record_instances.map((record) => [record.id, record]),
);

const requirementTransitionsByWorkflow = new Map(
  workflows.map((workflow) => {
    const realizedTransitions = workflow.transitions.filter((transition) =>
      events.some(
        (event) =>
          event.workflow_id === workflow.id &&
          event.transition_id === transition.id,
      ),
    );
    if (realizedTransitions.length === 0)
      throw new Error(`${workflow.id}: no realized transitions`);
    const allocations = allocateRequirementTransitions(
      realizedTransitions,
      workflow.id,
      workflow.states.at(-1)!,
    );
    return [
      workflow.id,
      allocations.map((transitions, index) => ({
        requirement_id: `REQ-${pad((Number(workflow.id.slice(-3)) - 1) * 10 + index + 1)}`,
        transition_ids: transitions.map((transition) => transition.id),
      })),
    ] as const;
  }),
);

const selectEvents = (fixture: Fixture, selection = "full") => {
  const fixtureEvents = fixture.event_ids.map((eventId) => {
    const event = eventIndex.get(eventId);
    if (!event) throw new Error(`${fixture.id}: unresolved event ${eventId}`);
    return event;
  });
  if (selection === "full") return fixtureEvents;
  const [mode, leftText, rightText] = selection.split(":");
  if (mode === "head") return fixtureEvents.slice(0, Number(leftText));
  if (mode === "tail") return fixtureEvents.slice(-Number(leftText));
  if (mode === "slice")
    return fixtureEvents.slice(Number(leftText), Number(rightText) + 1);
  throw new Error(`Unknown selection ${selection}`);
};

const missingInformationFor: Record<string, string> = {
  routine:
    "No critical information is missing in the realized path; alternate invalid, stale, or unavailable conditions remain explicit branches.",
  urgent:
    "The duration and downstream consequence of the urgent condition are initially unknown and require accountable reassessment.",
  blocked:
    "The release condition, responsible recovery owner, or verified resolution evidence is not yet available when containment begins.",
  incomplete_information:
    "One or more current measurements, identities, quantities, restrictions, or outside-party facts are unavailable or contradictory.",
  correction:
    "The accepted successor value and the full downstream impact are unknown until an authorized correction review completes.",
  cross_organization:
    "The other organization's current acknowledgement, authority, or source evidence cannot be inferred from internal records alone.",
  offline_delayed:
    "The device cannot know whether server state or authority changed after its cached base version until synchronization occurs.",
  supervisory_review:
    "The accountable reviewer must determine whether evidence, authority, and completion criteria are sufficient to accept the result.",
  audit_historical:
    "Historical review may reveal later corrections or links, but it cannot assume causality that is absent from the immutable event graph.",
};

const scenarioRecords = (recordInstanceIds: string[]) =>
  unique(recordInstanceIds)
    .map((recordInstanceId) => {
      const record = recordInstanceIndex.get(recordInstanceId);
      return record
        ? `${record.record_definition_id} · ${recordInstanceId}`
        : null;
    })
    .filter((value): value is string => Boolean(value));

const isNonIdealEvent = (event: Event) =>
  event.connectivity.captured_offline ||
  event.connectivity.sync_status === "conflict" ||
  event.exception_history_ids.length > 0 ||
  ["correction", "supersession", "exception", "recovery"].includes(
    event.kind,
  ) ||
  [
    "blocked",
    "delayed",
    "disputed",
    "correction_required",
    "noncompliant",
    "certification_withheld",
    "partially_completed",
    "delivery_interrupted",
    "unavailable",
    "paused",
  ].some((state) => event.to_state.includes(state));

const scenarios = profiles.map((profile) => {
  const referencedFixtures = profile.fixtureIds.map((fixtureId) => {
    const fixture = fixtureIndex.get(fixtureId);
    if (!fixture)
      throw new Error(`${profile.id}: unresolved fixture ${fixtureId}`);
    return fixture;
  });
  const fixturesByWorkflowInstance = new Map<string, Fixture>();
  for (const fixture of referencedFixtures) {
    const current = fixturesByWorkflowInstance.get(
      fixture.workflow_instance_id,
    );
    if (!current || fixture.event_ids.length > current.event_ids.length)
      fixturesByWorkflowInstance.set(fixture.workflow_instance_id, fixture);
  }
  const sourceFixtures = [...fixturesByWorkflowInstance.values()];
  const segmentEvents = sourceFixtures.map((fixture) => ({
    fixture,
    events: selectEvents(
      fixture,
      sourceFixtures.length === 1 ? profile.selection : "full",
    ),
  }));
  // Multi-workflow scenarios are ordered by explicit path segment, then by the
  // immutable order inside that workflow instance. They are not flattened into
  // a fabricated global chronology.
  const selectedEvents = unique(
    segmentEvents.flatMap((segment) => segment.events),
  );
  if (selectedEvents.length < 2)
    throw new Error(`${profile.id}: scenario must retain at least two events`);
  const workflowIds =
    profile.workflowIds ??
    unique(sourceFixtures.map((fixture) => fixture.workflow_id));
  const workflowModels = workflowIds.map((workflowId) => {
    const workflow = workflowIndex.get(workflowId);
    if (!workflow)
      throw new Error(`${profile.id}: missing workflow ${workflowId}`);
    return workflow;
  });
  const roleIds = unique(
    selectedEvents
      .map((event) => assignmentIndex.get(event.actor_assignment_id)?.role_id)
      .filter((roleId): roleId is string => Boolean(roleId)),
  );
  const decisionIds = unique(
    selectedEvents.flatMap((event) =>
      event.decision_results.map((result) => result.decision_id),
    ),
  );
  const readRecordInstanceIds = unique(
    selectedEvents.flatMap((event) => event.record_reads),
  );
  const writeRecordInstanceIds = unique(
    selectedEvents.flatMap((event) => event.record_writes),
  );
  const fallbackRecordInstanceIds = unique(
    referencedFixtures.flatMap((fixture) => fixture.record_instance_ids),
  );
  const recordsRead = scenarioRecords(readRecordInstanceIds);
  const recordsCreated = scenarioRecords(writeRecordInstanceIds);
  const referencedRecordInstanceIds = new Set(
    unique([
      ...fallbackRecordInstanceIds,
      ...readRecordInstanceIds,
      ...writeRecordInstanceIds,
    ]),
  );
  const recordLinks = operation.links.filter(
    (link) =>
      referencedRecordInstanceIds.has(link.source_record_instance_id) &&
      link.target.entity_type === "record_instance" &&
      referencedRecordInstanceIds.has(link.target.entity_id),
  );
  const recordLinkIds = recordLinks.map((link) => link.id);
  const selectedWorkflowInstanceIds = new Set(
    referencedFixtures.map((fixture) => fixture.workflow_instance_id),
  );
  const selectedEventRecordIds = new Set([
    ...readRecordInstanceIds,
    ...writeRecordInstanceIds,
  ]);
  const operationalChainIds = unique([
    ...referencedFixtures.flatMap((fixture) => fixture.operational_chain_ids),
    ...recordLinks
      .map((link) => link.chain_id)
      .filter((chainId): chainId is string => Boolean(chainId)),
  ]).filter((chainId) => {
    const chain = operation.operational_chains.find(
      (candidate) => candidate.id === chainId,
    );
    return (
      chain &&
      chain.workflow_instance_ids.some((workflowInstanceId) =>
        selectedWorkflowInstanceIds.has(workflowInstanceId),
      ) &&
      chain.record_instance_ids.some((recordInstanceId) =>
        selectedEventRecordIds.has(recordInstanceId),
      )
    );
  });
  const segmentRecordIds = segmentEvents.map(
    ({ fixture, events: pathEvents }) =>
      new Set([
        ...fixture.record_instance_ids,
        ...pathEvents.flatMap((event) => [
          ...event.record_reads,
          ...event.record_writes,
        ]),
      ]),
  );
  const pathSegments = segmentEvents.map(
    ({ fixture, events: pathEvents }, segmentIndex) => {
      const earlierRecordIds = new Set(
        segmentRecordIds
          .slice(0, segmentIndex)
          .flatMap((recordIds) => [...recordIds]),
      );
      const currentRecordIds = segmentRecordIds[segmentIndex];
      const connectingLinks = operation.links.filter((link) => {
        if (link.target.entity_type !== "record_instance") return false;
        return (
          (earlierRecordIds.has(link.source_record_instance_id) &&
            currentRecordIds.has(link.target.entity_id)) ||
          (currentRecordIds.has(link.source_record_instance_id) &&
            earlierRecordIds.has(link.target.entity_id))
        );
      });
      const earlierStarts = segmentEvents
        .slice(0, segmentIndex)
        .map((segment) => Date.parse(segment.events[0].occurred_at));
      const startsBeforeEarlierPath =
        segmentIndex > 0 &&
        Date.parse(pathEvents[0].occurred_at) < Math.max(...earlierStarts);
      const correctionLink = connectingLinks.some((link) =>
        ["corrects", "supersedes"].includes(link.relation),
      );
      const relationToPrevious =
        segmentIndex === 0
          ? "entry"
          : correctionLink
            ? "correction_support"
            : startsBeforeEarlierPath
              ? "historical_reference"
              : connectingLinks.length > 0
                ? "linked_evidence"
                : "parallel";
      return {
        id: `SEG-${pad(segmentIndex + 1)}`,
        sequence: segmentIndex + 1,
        workflow_id: fixture.workflow_id,
        workflow_instance_id: fixture.workflow_instance_id,
        fixture_id: fixture.id,
        relation_to_previous: relationToPrevious,
        connecting_record_link_ids: connectingLinks.map((link) => link.id),
        event_ids: pathEvents.map((event) => event.id),
        starts_at: pathEvents[0].occurred_at,
        ends_at: pathEvents.at(-1)!.occurred_at,
      };
    },
  );
  const recordOperations = unique([
    ...readRecordInstanceIds,
    ...writeRecordInstanceIds,
  ]).map((recordInstanceId) => {
    const record = recordInstanceIndex.get(recordInstanceId)!;
    const read = readRecordInstanceIds.includes(recordInstanceId);
    const write = writeRecordInstanceIds.includes(recordInstanceId);
    const action = write
      ? record.supersedes_record_instance_id
        ? "correct"
        : record.superseded_by_record_instance_id
          ? "supersede"
          : read
            ? "append"
            : "create"
      : "read";
    return {
      record_definition_id: record.record_definition_id,
      record_instance_id: record.id,
      action,
      lifecycle_state: record.lifecycle_state,
      source_event_id: record.source_event_id ?? null,
      predecessor_record_instance_id:
        record.supersedes_record_instance_id ?? null,
      successor_record_instance_id:
        record.superseded_by_record_instance_id ?? null,
    };
  });
  const nonIdealIndex = Math.max(
    0,
    selectedEvents.findIndex(isNonIdealEvent) >= 0
      ? selectedEvents.findIndex(isNonIdealEvent)
      : Math.floor(selectedEvents.length / 2),
  );
  const nonIdealEvent = selectedEvents[nonIdealIndex];
  const recoveryEvents = selectedEvents.slice(
    nonIdealIndex + 1,
    nonIdealIndex + 4,
  );
  const operationalSteps = selectedEvents.map((event, index) => {
    const nextEvent = selectedEvents[index + 1];
    const segmentIndex = segmentEvents.findIndex((segment) =>
      segment.events.some((candidate) => candidate.id === event.id),
    );
    const segment = segmentEvents[segmentIndex];
    const withinSegmentIndex = segment.events.findIndex(
      (candidate) => candidate.id === event.id,
    );
    const nextEventIsSamePath =
      Boolean(nextEvent) &&
      nextEvent?.workflow_instance_id === event.workflow_instance_id;
    const matchingFixture = sourceFixtures.find(
      (fixture) => fixture.workflow_instance_id === event.workflow_instance_id,
    )!;
    return {
      id: `STEP-${pad(index + 1)}`,
      sequence: index + 1,
      segment_id: `SEG-${pad(segmentIndex + 1)}`,
      segment_sequence: segmentIndex + 1,
      within_segment_sequence: withinSegmentIndex + 1,
      event_id: event.id,
      transition_id: event.transition_id,
      semantic_kind: event.kind,
      actor_assignment_id: event.actor_assignment_id,
      from_state: event.from_state,
      to_state: event.to_state,
      record_reads: event.record_reads,
      record_writes: event.record_writes,
      decision_results: event.decision_results.map((result) => ({
        decision_id: result.decision_id,
        outcome: result.outcome,
      })),
      exception_history_ids: event.exception_history_ids,
      connectivity_mode: event.connectivity.mode,
      sync_status: event.connectivity.sync_status,
      handoff: {
        from_actor_assignment_id: event.actor_assignment_id,
        to_actor_assignment_ids: nextEventIsSamePath
          ? [nextEvent.actor_assignment_id]
          : [],
        communication: nextEventIsSamePath
          ? `${event.to_state.replaceAll("_", " ")} evidence and current record versions pass to the owner of ${nextEvent.transition_id}.`
          : nextEvent
            ? "This path segment ends here. A separate linked or parallel segment follows; no direct causal handoff is inferred."
            : "The accountable terminal evidence remains available to authorized reviewers and downstream linked workflows.",
        acknowledgement_required:
          nextEventIsSamePath &&
          nextEvent?.actor_assignment_id !== event.actor_assignment_id,
      },
      fixture_ref: {
        fixture_id: matchingFixture.id,
        workflow_instance_id: event.workflow_instance_id,
        event_id: event.id,
      },
    };
  });
  const requirementIds = unique(
    workflowIds.flatMap((workflowId) => {
      const realizedByScenario = new Set(
        selectedEvents
          .filter((event) => event.workflow_id === workflowId)
          .map((event) => event.transition_id),
      );
      return (requirementTransitionsByWorkflow.get(workflowId) ?? [])
        .filter((contract) =>
          contract.transition_ids.some((transitionId) =>
            realizedByScenario.has(transitionId),
          ),
        )
        .map((contract) => contract.requirement_id);
    }),
  );
  const firstEvent = selectedEvents[0];
  const lastEvent = selectedEvents.at(-1)!;
  const blockIds = unique(
    referencedFixtures.flatMap((fixture) => fixture.block_ids),
  );
  const contractIds = unique(
    referencedFixtures.flatMap((fixture) => fixture.contract_ids),
  );
  const exceptionHistoryIds = unique(
    referencedFixtures.flatMap((fixture) => fixture.exception_history_ids),
  );
  const handoffDescriptions = unique(
    selectedEvents.slice(0, -1).flatMap((event, index) => {
      const nextEvent = selectedEvents[index + 1];
      if (event.workflow_instance_id !== nextEvent.workflow_instance_id)
        return [];
      if (event.actor_assignment_id === nextEvent.actor_assignment_id)
        return [];
      const fromRole = assignmentIndex.get(event.actor_assignment_id)?.role_id;
      const toRole = assignmentIndex.get(
        nextEvent.actor_assignment_id,
      )?.role_id;
      return [
        `${fromRole ?? event.actor_assignment_id} hands ${event.to_state.replaceAll("_", " ")} evidence to ${toRole ?? nextEvent.actor_assignment_id} for ${nextEvent.to_state.replaceAll("_", " ")}.`,
      ];
    }),
  );
  return {
    contract_version: "2.0",
    id: profile.id,
    title: profile.title,
    workflow_ids: workflowIds,
    workflow_instance_ids: sourceFixtures.map(
      (fixture) => fixture.workflow_instance_id,
    ),
    chronology_mode: sourceFixtures.length > 1 ? "multi_path" : "linear",
    path_segments: pathSegments,
    operational_chain_ids: operationalChainIds,
    record_link_ids: recordLinkIds,
    category: profile.category,
    role_ids:
      roleIds.length > 0 ? roleIds : workflowModels[0].roles.slice(0, 2),
    trigger: `${firstEvent.transition_id} occurs at ${firstEvent.occurred_at}: ${firstEvent.reason}`,
    goal: `${profile.focus}; preserve the exact fixture evidence and reach an accountable, inspectable disposition.`,
    context: `${profile.title} uses ${profile.fixtureIds.join(", ")} from ${unique(sourceFixtures.map((fixture) => fixture.workflow_instance_id)).join(", ")} in ${operation.operation_id}. Scope includes ${blockIds.join(", ") || "non-block operational scope"}${contractIds.length > 0 ? ` under ${contractIds.join(", ")}` : ""}; the selected path spans ${firstEvent.occurred_at} through ${lastEvent.occurred_at}.`,
    preconditions: [
      `The actor assignments ${unique(selectedEvents.map((event) => event.actor_assignment_id)).join(", ")} are effective for the referenced scope.`,
      `The current state and source versions match the base evidence before ${firstEvent.transition_id}.`,
      `Stable block, contract, workflow-instance, event, and record identities resolve without alias ambiguity.`,
    ],
    available_information: [
      `${selectedEvents.length} exact events: ${selectedEvents.map((event) => event.id).join(", ")}`,
      `${unique([...readRecordInstanceIds, ...writeRecordInstanceIds]).length || fallbackRecordInstanceIds.length} connected record instances with canonical definitions and versions`,
      `${decisionIds.length} accountable decision contracts: ${decisionIds.join(", ")}`,
      exceptionHistoryIds.length > 0
        ? `Exception histories ${exceptionHistoryIds.join(", ")} and their immutable recovery events`
        : "No exception history is realized in this selected path; alternate canonical branches remain visible",
      operationalChainIds.length > 0
        ? `Operational chain continuity through ${operationalChainIds.join(", ")}`
        : "Workflow-local correlation, scope, and record lineage",
    ],
    missing_information: [missingInformationFor[profile.category]],
    normal_path: selectedEvents
      .slice(0, Math.min(3, selectedEvents.length))
      .map(
        (event) =>
          `${event.id} applies ${event.transition_id}: ${event.from_state ?? "entry"} → ${event.to_state}; ${event.reason}`,
      ),
    operational_steps: operationalSteps,
    exception_path: [
      `${nonIdealEvent.id} exposes the scenario's ${profile.category.replaceAll("_", " ")} pressure at ${nonIdealEvent.from_state ?? "entry"} → ${nonIdealEvent.to_state}.`,
      `The interface preserves affected scope, actor ${nonIdealEvent.actor_assignment_id}, base record versions, timing, and ${nonIdealEvent.exception_history_ids.join(", ") || "the explicit non-ideal rationale"}.`,
    ],
    recovery_path:
      recoveryEvents.length > 0
        ? recoveryEvents.map(
            (event) =>
              `${event.id} performs ${event.transition_id} toward ${event.to_state} without erasing predecessor evidence.`,
          )
        : [
            `The ${lastEvent.to_state} state is a safe attributable containment; a new authorized workflow instance or review must supply any later recovery.`,
          ],
    decision_points: decisionIds,
    branches: [
      "If authority, effective scope, or current state no longer resolves, deny the action and route to the accountable owner.",
      "If source evidence is stale, missing, offline, or conflicting, preserve the attempted event and require explicit reconciliation.",
      "If a value is wrong, append a correction or supersession and retain reciprocal predecessor/successor lineage.",
      "If outside-party acknowledgement or evidence is required, remain pending or safely contained rather than inferring consent.",
    ],
    records_read: recordsRead,
    records_created: recordsCreated,
    record_operations: recordOperations,
    communications:
      handoffDescriptions.length > 0
        ? handoffDescriptions
        : [
            "The same accountable actor advances the selected path while current evidence remains inspectable to authorized reviewers.",
          ],
    device_context: selectedEvents.some(
      (event) => event.connectivity.captured_offline,
    )
      ? "Field mobile captures offline-safe evidence; responsive desktop reviews sync consequences and accountable state changes."
      : "Field-safe capture uses mobile where applicable; planning, approval, reconciliation, and history use responsive desktop.",
    connectivity: selectedEvents.some(
      (event) => event.connectivity.captured_offline,
    )
      ? "At least one event is captured offline. The device journal retains occurred time and base versions; server synchronization is idempotent and conflicts require explicit resolution."
      : selectedEvents.some(
            (event) =>
              event.connectivity.mode === "intermittent" ||
              event.connectivity.sync_status === "conflict",
          )
        ? "Intermittent connectivity is visible. Events remain append-only and no workflow state uses silent last-write-wins resolution."
        : "The realized path synchronizes online; the product still discloses staleness and disables online-only actions when fresh authority cannot be confirmed.",
    compliance_implications: [
      "Every consequential event remains attributable to person, assignment, organization, occurred time, captured time, reason, and record versions.",
      "Corrections, supersessions, rejections, disputes, and safe terminal containment remain in immutable history.",
      "Cross-organization evidence is visible only within effective contract, relationship, scope, sensitivity, and authority boundaries.",
    ],
    completion_condition:
      pathSegments.length === 1
        ? `${profile.title} is complete only when ${lastEvent.id} records ${lastEvent.to_state} through ${lastEvent.transition_id}, required records and authority resolve, and every predecessor, exception, correction, and sync consequence remains inspectable.`
        : `${profile.title} is complete only when every independent path terminal is satisfied (${pathSegments
            .map((segment) => {
              const terminal = eventIndex.get(segment.event_ids.at(-1)!)!;
              return `${segment.workflow_instance_id}:${terminal.id}:${terminal.to_state}`;
            })
            .join(
              "; ",
            )}), required authority resolves, and the explicit record links remain inspectable without imposing a false single chronology.`,
    requirement_ids: requirementIds,
    evidence_classification: "synthetic_fixture",
    synthetic_fixture_refs: profile.fixtureIds,
    expected_transitions: selectedEvents.map((event) => ({
      event_id: event.id,
      transition_id: event.transition_id,
      workflow_instance_id: event.workflow_instance_id,
      actor_assignment_id: event.actor_assignment_id,
      from: event.from_state,
      to: event.to_state,
      reason: `${event.transition_id} · ${event.reason}`,
      record_read_ids: event.record_reads,
      record_write_ids: event.record_writes,
      connectivity_mode: event.connectivity.mode,
      sync_status: event.connectivity.sync_status,
    })),
  };
});

const categoryCounts = Object.fromEntries(
  unique(scenarios.map((scenario) => scenario.category))
    .sort()
    .map((category) => [
      category,
      scenarios.filter((scenario) => scenario.category === category).length,
    ]),
);
const workflowCounts = Object.fromEntries(
  workflows.map((workflow) => [
    workflow.id,
    scenarios.filter((scenario) => scenario.workflow_ids.includes(workflow.id))
      .length,
  ]),
);
const usedFixtureIds = unique(
  scenarios.flatMap((scenario) => scenario.synthetic_fixture_refs),
).sort();
const usedEventIds = unique(
  scenarios.flatMap((scenario) =>
    scenario.operational_steps.map((step) => step.event_id),
  ),
);
const coverage = {
  scenario_count: scenarios.length,
  workflow_specific_scenarios: scenarios.filter(
    (scenario) => scenario.workflow_ids.length === 1,
  ).length,
  cross_workflow_scenarios: scenarios.filter(
    (scenario) => scenario.workflow_ids.length > 1,
  ).length,
  workflow_counts: workflowCounts,
  category_counts: categoryCounts,
  fixture_count: usedFixtureIds.length,
  fixture_ids: usedFixtureIds,
  event_count: usedEventIds.length,
  requirement_count: unique(
    scenarios.flatMap((scenario) => scenario.requirement_ids),
  ).length,
  offline_scenarios: scenarios.filter((scenario) =>
    scenario.operational_steps.some(
      (step) => eventIndex.get(step.event_id)?.connectivity.captured_offline,
    ),
  ).length,
  exception_scenarios: scenarios.filter((scenario) =>
    scenario.operational_steps.some(
      (step) => step.exception_history_ids.length > 0,
    ),
  ).length,
};

const scenarioDocument = {
  schema_version: "2.0",
  generated_at: operation.generated_at,
  operation_id: operation.operation_id,
  coverage,
  scenarios,
};

const catalogMarkdown = `# Scenario catalog

The canonical catalog contains **${coverage.scenario_count} substantive scenarios**: ${coverage.workflow_specific_scenarios} workflow-specific slices and ${coverage.cross_workflow_scenarios} cross-workflow packages. Every scenario is generated from exact full-season fixture pointers and retains event, transition, actor assignment, state, record, decision, exception, handoff, and requirement references.

## Coverage

| Dimension | Coverage |
| --- | --- |
| Workflow families | ${Object.keys(workflowCounts).length} |
| Fixture pointers | ${coverage.fixture_count} / ${fixtures.length} |
| Unique season events used | ${coverage.event_count} / ${events.length} |
| Scenario categories | ${Object.keys(categoryCounts).length} / 9 |
| Offline-grounded scenarios | ${coverage.offline_scenarios} |
| Exception-grounded scenarios | ${coverage.exception_scenarios} |

${workflows
  .map(
    (workflow) => `## ${workflow.id} · ${workflow.name}

| Scenario | Category | Fixtures | Completion |
| --- | --- | --- | --- |
${scenarios
  .filter((scenario) => scenario.workflow_ids.includes(workflow.id))
  .map(
    (scenario) =>
      `| ${scenario.id} · ${scenario.title} | ${scenario.category} | ${scenario.synthetic_fixture_refs.join(", ")} | ${scenario.operational_steps.at(-1)?.to_state} |`,
  )
  .join("\n")}`,
  )
  .join("\n\n")}
`;

const outputs = new Map<string, string>([
  [
    "scenarios/scenarios.json",
    `${JSON.stringify(scenarioDocument, null, 2)}\n`,
  ],
  ["scenarios/CATALOG.md", catalogMarkdown],
  [
    "validation/scenario-coverage.json",
    `${JSON.stringify(
      {
        schema_version: "1.0",
        evaluated_at: operation.generated_at,
        coverage,
        distinctness_keys: scenarios.map((scenario) => ({
          scenario_id: scenario.id,
          key: [
            scenario.workflow_ids.join("+"),
            scenario.category,
            scenario.role_ids.join("+"),
            scenario.operational_steps.map((step) => step.event_id).join("+"),
            scenario.completion_condition,
          ].join("|"),
        })),
      },
      null,
      2,
    )}\n`,
  ],
]);
for (const [relativePath, contents] of outputs) {
  if (relativePath.endsWith(".json"))
    outputs.set(
      relativePath,
      await prettier.format(contents, { parser: "json" }),
    );
  if (relativePath.endsWith(".md"))
    outputs.set(
      relativePath,
      await prettier.format(contents, { parser: "markdown" }),
    );
}

if (checkOnly) {
  const drift: string[] = [];
  for (const [relativePath, expected] of outputs) {
    try {
      const current = await readFile(path.join(ROOT, relativePath), "utf8");
      if (current !== expected) drift.push(relativePath);
    } catch {
      drift.push(relativePath);
    }
  }
  if (drift.length > 0)
    throw new Error(
      `Generated scenario artifacts are stale: ${drift.join(", ")}`,
    );
  console.log(
    `✓ ${scenarios.length} scenarios, ${usedFixtureIds.length} fixtures, ${usedEventIds.length} events, and all nine categories are current`,
  );
} else {
  await Promise.all(
    [...outputs].map(async ([relativePath, contents]) => {
      const destination = path.join(ROOT, relativePath);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, contents, "utf8");
    }),
  );
  console.log(
    `✓ generated ${scenarios.length} scenarios spanning ${usedFixtureIds.length} fixtures and ${usedEventIds.length} events`,
  );
}
