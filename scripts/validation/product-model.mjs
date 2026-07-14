import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
let assertions = 0;
const assert = (condition, message) => {
  assertions += 1;
  if (!condition) throw new Error(message);
};
const readJson = async (relativePath) =>
  JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
const unique = (values) => [...new Set(values)];
const byId = (items, label) => {
  const index = new Map();
  for (const item of items) {
    assert(!index.has(item.id), `${label}: duplicate ${item.id}`);
    index.set(item.id, item);
  }
  return index;
};
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const recordSetsConnected = (linkIds, leftRecordIds, rightRecordIds) => {
  const graph = new Map();
  const add = (from, to) => {
    if (!graph.has(from)) graph.set(from, new Set());
    graph.get(from).add(to);
  };
  for (const linkId of linkIds) {
    const link = operationLinkIndex.get(linkId);
    if (!link || link.target.entity_type !== "record_instance") continue;
    add(link.source_record_instance_id, link.target.entity_id);
    add(link.target.entity_id, link.source_record_instance_id);
  }
  const queue = [...leftRecordIds];
  const visited = new Set(queue);
  while (queue.length > 0) {
    const recordId = queue.shift();
    if (rightRecordIds.has(recordId)) return true;
    for (const neighbor of graph.get(recordId) ?? [])
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
  }
  return false;
};
const formatAjvErrors = (errors = []) =>
  (errors ?? [])
    .map(
      (error) =>
        `${error.instancePath || "/"} ${error.message}${error.params?.additionalProperty ? ` (${error.params.additionalProperty})` : ""}`,
    )
    .join("; ");

const [
  scenarioDocument,
  fixtureDocument,
  eventDocument,
  operation,
  workflowDocument,
  roleDocument,
  recordDocument,
  decisionDocument,
  exceptionDocument,
  domainDocument,
  requirementsDocument,
  screensDocument,
  permissionsDocument,
  notificationsDocument,
  syncModel,
  componentDocument,
  stateDocument,
  flowDocument,
  relationshipDocument,
  transitionDispositionDocument,
  scopeBoundary,
  informationArchitecture,
  navigationModels,
  roleSurfaceMatrix,
  platformMatrix,
] = await Promise.all([
  readJson("scenarios/scenarios.json"),
  readJson("data/scenario-fixtures.json"),
  readJson("data/events.json"),
  readJson("data/operation.json"),
  readJson("workflow-model/workflows.json"),
  readJson("workflow-model/roles.json"),
  readJson("workflow-model/records.json"),
  readJson("workflow-model/decisions.json"),
  readJson("workflow-model/exceptions.json"),
  readJson("product-structure/domains.json"),
  readJson("product-structure/requirements.json"),
  readJson("product-structure/screens.json"),
  readJson("product-structure/permissions.json"),
  readJson("product-structure/notifications.json"),
  readJson("product-structure/sync-model.json"),
  readJson("product-structure/component-requirements.json"),
  readJson("product-structure/state-matrix.json"),
  readJson("product-structure/flows.json"),
  readJson("product-structure/relationships.json"),
  readJson("product-structure/transition-dispositions.json"),
  readJson("product-structure/scope-boundary.json"),
  readJson("product-structure/information-architecture.json"),
  readJson("product-structure/navigation-models.json"),
  readJson("product-structure/role-surface-matrix.json"),
  readJson("product-structure/platform-matrix.json"),
]);

const scenarios = scenarioDocument.scenarios;
const fixtures = fixtureDocument.fixtures;
const events = eventDocument.events;
const workflows = workflowDocument.workflows;
const roles = roleDocument.roles;
const records = recordDocument.records;
const decisions = decisionDocument.decisions;
const exceptions = exceptionDocument.exceptions;
const domains = domainDocument.domains;
const requirements = requirementsDocument.requirements;
const screens = screensDocument.screens;
const permissionRules = permissionsDocument.rules;
const notificationRules = notificationsDocument.rules;
const components = componentDocument.components;
const screenStates = stateDocument.states;
const flows = flowDocument.flows;
const relationships = relationshipDocument.relationships;
const transitionDispositions = transitionDispositionDocument.transitions;
const syncClassIndex = byId(syncModel.classes, "sync classes");

const scenarioIndex = byId(scenarios, "scenarios");
const fixtureIndex = byId(fixtures, "fixtures");
const eventIndex = byId(events, "events");
const workflowIndex = byId(workflows, "workflows");
const roleIndex = byId(roles, "roles");
const recordIndex = byId(records, "records");
const decisionIndex = byId(decisions, "decisions");
byId(exceptions, "exceptions");
const assignmentIndex = byId(operation.role_assignments, "role assignments");
const recordInstanceIndex = byId(
  operation.record_instances,
  "record instances",
);
const operationLinkIndex = byId(operation.links, "operation links");
const operationalChainIndex = byId(
  operation.operational_chains,
  "operational chains",
);
const requirementIndex = byId(requirements, "requirements");
const screenIndex = byId(screens, "screens");
const permissionIndex = byId(permissionRules, "permission rules");
const notificationIndex = byId(notificationRules, "notification rules");
const componentIndex = byId(components, "component requirements");
byId(screenStates, "screen states");
byId(flows, "flows");
byId(domains, "domains");
byId(relationships, "product relationships");
const dispositionIndex = new Map();
for (const disposition of transitionDispositions) {
  assert(
    !dispositionIndex.has(disposition.transition_id),
    `transition dispositions: duplicate ${disposition.transition_id}`,
  );
  dispositionIndex.set(disposition.transition_id, disposition);
}

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const schemaFiles = [
  "scenario.schema.json",
  "screen.schema.json",
  "product-requirement.schema.json",
  "permission-rule.schema.json",
  "notification-rule.schema.json",
  "screen-state.schema.json",
  "product-flow.schema.json",
  "product-domain.schema.json",
  "component-requirement.schema.json",
  "transition-disposition.schema.json",
  "product-relationship.schema.json",
  "scope-boundary.schema.json",
  "information-architecture.schema.json",
  "navigation-models.schema.json",
  "role-surface-matrix.schema.json",
  "platform-matrix.schema.json",
  "sync-model.schema.json",
];
for (const schemaFile of schemaFiles) {
  const schema = await readJson(`schemas/${schemaFile}`);
  ajv.addSchema(schema);
}
const validateRecords = async (schemaFile, items, label) => {
  const schema = await readJson(`schemas/${schemaFile}`);
  const validate = ajv.getSchema(schema.$id);
  assert(Boolean(validate), `${label}: schema ${schemaFile} did not compile`);
  for (const item of items)
    assert(
      validate(item),
      `${label}/${item.id}: ${formatAjvErrors(validate.errors)}`,
    );
};
const validateDocument = async (schemaFile, document, label) => {
  const schema = await readJson(`schemas/${schemaFile}`);
  const validate = ajv.getSchema(schema.$id);
  assert(Boolean(validate), `${label}: schema ${schemaFile} did not compile`);
  assert(validate(document), `${label}: ${formatAjvErrors(validate.errors)}`);
};
await validateRecords("scenario.schema.json", scenarios, "scenarios");
await validateRecords("screen.schema.json", screens, "screens");
await validateRecords(
  "product-requirement.schema.json",
  requirements,
  "requirements",
);
await validateRecords(
  "permission-rule.schema.json",
  permissionRules,
  "permissions",
);
await validateRecords(
  "notification-rule.schema.json",
  notificationRules,
  "notifications",
);
await validateRecords("screen-state.schema.json", screenStates, "states");
await validateRecords("product-flow.schema.json", flows, "flows");
await validateRecords("product-domain.schema.json", domains, "domains");
await validateRecords(
  "component-requirement.schema.json",
  components,
  "components",
);
await validateRecords(
  "transition-disposition.schema.json",
  transitionDispositions,
  "transition dispositions",
);
await validateRecords(
  "product-relationship.schema.json",
  relationships,
  "product relationships",
);
await validateDocument("scope-boundary.schema.json", scopeBoundary, "scope");
await validateDocument(
  "information-architecture.schema.json",
  informationArchitecture,
  "information architecture",
);
await validateDocument(
  "navigation-models.schema.json",
  navigationModels,
  "navigation models",
);
await validateDocument(
  "role-surface-matrix.schema.json",
  roleSurfaceMatrix,
  "role surface matrix",
);
await validateDocument(
  "platform-matrix.schema.json",
  platformMatrix,
  "platform matrix",
);
await validateDocument("sync-model.schema.json", syncModel, "sync model");

const expectedWorkflowIds = Array.from(
  { length: 10 },
  (_, index) => `WF-${String(index + 1).padStart(3, "0")}`,
);
const expectedCategories = [
  "routine",
  "urgent",
  "blocked",
  "incomplete_information",
  "correction",
  "cross_organization",
  "offline_delayed",
  "supervisory_review",
  "audit_historical",
];
assert(
  scenarios.length === 80,
  `Expected 80 scenarios; found ${scenarios.length}`,
);
assert(
  scenarios.filter((scenario) => scenario.workflow_ids.length === 1).length ===
    70,
  "Expected exactly 70 workflow-specific scenarios",
);
assert(
  scenarios.filter((scenario) => scenario.workflow_ids.length > 1).length ===
    10,
  "Expected exactly 10 cross-workflow scenarios",
);
assert(
  same(
    unique(scenarios.map((scenario) => scenario.category)).sort(),
    [...expectedCategories].sort(),
  ),
  "Scenario catalog does not cover all nine required categories",
);
for (const workflowId of expectedWorkflowIds)
  assert(
    scenarios.filter((scenario) => scenario.workflow_ids.includes(workflowId))
      .length >= 7,
    `${workflowId}: fewer than seven substantive scenarios`,
  );

const distinctnessKeys = new Set();
const scenarioUsedFixtures = new Set();
const scenarioUsedWorkflowInstances = new Set();
const scenarioUsedExceptionHistories = new Set();
const scenarioUsedRequirements = new Set();
for (const scenario of scenarios) {
  const distinctnessKey = [
    scenario.workflow_ids.join("+"),
    scenario.category,
    scenario.role_ids.join("+"),
    scenario.operational_steps.map((step) => step.event_id).join("+"),
    scenario.completion_condition,
  ].join("|");
  assert(
    !distinctnessKeys.has(distinctnessKey),
    `${scenario.id}: duplicate role/job/path/category/completion contract`,
  );
  distinctnessKeys.add(distinctnessKey);
  scenario.workflow_ids.forEach((workflowId) =>
    assert(
      workflowIndex.has(workflowId),
      `${scenario.id}: unresolved ${workflowId}`,
    ),
  );
  scenario.role_ids.forEach((roleId) =>
    assert(roleIndex.has(roleId), `${scenario.id}: unresolved role ${roleId}`),
  );
  scenario.decision_points.forEach((decisionId) =>
    assert(
      decisionIndex.has(decisionId),
      `${scenario.id}: unresolved decision ${decisionId}`,
    ),
  );
  scenario.requirement_ids.forEach((requirementId) => {
    scenarioUsedRequirements.add(requirementId);
    assert(
      requirementIndex.has(requirementId),
      `${scenario.id}: unresolved requirement ${requirementId}`,
    );
  });
  const fixtureWorkflowInstances = new Set();
  for (const fixtureId of scenario.synthetic_fixture_refs) {
    scenarioUsedFixtures.add(fixtureId);
    const fixture = fixtureIndex.get(fixtureId);
    assert(Boolean(fixture), `${scenario.id}: unresolved fixture ${fixtureId}`);
    fixtureWorkflowInstances.add(fixture.workflow_instance_id);
    scenarioUsedWorkflowInstances.add(fixture.workflow_instance_id);
    fixture.exception_history_ids.forEach((historyId) =>
      scenarioUsedExceptionHistories.add(historyId),
    );
    assert(
      scenario.workflow_ids.includes(fixture.workflow_id),
      `${scenario.id}: ${fixtureId} belongs to undeclared ${fixture.workflow_id}`,
    );
  }
  assert(
    same(
      [...new Set(scenario.workflow_instance_ids)].sort(),
      [...fixtureWorkflowInstances].sort(),
    ),
    `${scenario.id}: workflow_instance_ids differ from fixture pointers`,
  );
  assert(
    scenario.chronology_mode ===
      (fixtureWorkflowInstances.size > 1 ? "multi_path" : "linear"),
    `${scenario.id}: chronology mode does not match path cardinality`,
  );
  assert(
    scenario.path_segments.length === fixtureWorkflowInstances.size,
    `${scenario.id}: path segments do not cover each workflow instance`,
  );
  const pathEventIds = [];
  const priorSegmentEvidenceRecordIds = new Set();
  for (const [segmentIndex, segment] of scenario.path_segments.entries()) {
    assert(
      segment.sequence === segmentIndex + 1 &&
        segment.id === `SEG-${String(segmentIndex + 1).padStart(3, "0")}`,
      `${scenario.id}: non-contiguous path segments`,
    );
    assert(
      fixtureWorkflowInstances.has(segment.workflow_instance_id),
      `${scenario.id}/${segment.id}: unknown workflow instance`,
    );
    const fixture = fixtureIndex.get(segment.fixture_id);
    assert(
      fixture?.workflow_instance_id === segment.workflow_instance_id &&
        fixture?.workflow_id === segment.workflow_id,
      `${scenario.id}/${segment.id}: fixture/workflow tuple differs`,
    );
    segment.event_ids.forEach((eventId) => {
      pathEventIds.push(eventId);
      assert(
        fixture.event_ids.includes(eventId),
        `${scenario.id}/${segment.id}: ${eventId} is outside fixture`,
      );
    });
    const segmentEvidenceRecordIds = new Set(
      segment.event_ids.flatMap((eventId) => {
        const event = eventIndex.get(eventId);
        return event ? [...event.record_reads, ...event.record_writes] : [];
      }),
    );
    segment.connecting_record_link_ids.forEach((linkId) =>
      assert(
        operationLinkIndex.has(linkId),
        `${scenario.id}/${segment.id}: unresolved ${linkId}`,
      ),
    );
    if (segmentIndex === 0)
      assert(
        segment.relation_to_previous === "entry",
        `${scenario.id}/${segment.id}: first segment is not entry`,
      );
    else {
      assert(
        segment.connecting_record_link_ids.length > 0,
        `${scenario.id}/${segment.id}: non-entry segment has no declared evidence bridge`,
      );
      assert(
        segment.connecting_record_link_ids.every((linkId) =>
          scenario.record_link_ids.includes(linkId),
        ),
        `${scenario.id}/${segment.id}: bridge links are absent from the scenario link registry`,
      );
      assert(
        recordSetsConnected(
          segment.connecting_record_link_ids,
          segmentEvidenceRecordIds,
          priorSegmentEvidenceRecordIds,
        ),
        `${scenario.id}/${segment.id}: declared links do not connect selected evidence to a prior segment`,
      );
    }
    segmentEvidenceRecordIds.forEach((recordId) =>
      priorSegmentEvidenceRecordIds.add(recordId),
    );
  }
  const selectedScenarioEvidenceRecordIds = new Set(
    pathEventIds.flatMap((eventId) => {
      const event = eventIndex.get(eventId);
      return event ? [...event.record_reads, ...event.record_writes] : [];
    }),
  );
  scenario.operational_chain_ids.forEach((chainId) => {
    const chain = operationalChainIndex.get(chainId);
    assert(Boolean(chain), `${scenario.id}: unresolved ${chainId}`);
    assert(
      chain.workflow_instance_ids.some((workflowInstanceId) =>
        scenario.workflow_instance_ids.includes(workflowInstanceId),
      ),
      `${scenario.id}: ${chainId} does not intersect a selected workflow instance`,
    );
    const chainEvidenceRecordIds = new Set(
      chain.record_instance_ids.filter((recordId) =>
        selectedScenarioEvidenceRecordIds.has(recordId),
      ),
    );
    const chainLinkEndpointIds = new Set(
      chain.link_ids.flatMap((linkId) => {
        const link = operationLinkIndex.get(linkId);
        return link?.target.entity_type === "record_instance"
          ? [link.source_record_instance_id, link.target.entity_id]
          : [];
      }),
    );
    assert(
      chainEvidenceRecordIds.size > 0 &&
        [...chainEvidenceRecordIds].some((recordId) =>
          chainLinkEndpointIds.has(recordId),
        ),
      `${scenario.id}: ${chainId} is not graph-reachable from selected scenario evidence`,
    );
  });
  scenario.record_link_ids.forEach((linkId) =>
    assert(
      operationLinkIndex.has(linkId),
      `${scenario.id}: unresolved ${linkId}`,
    ),
  );
  if (scenario.chronology_mode === "multi_path")
    assert(
      scenario.operational_chain_ids.length > 0 ||
        scenario.record_link_ids.length > 0,
      `${scenario.id}: multi-path scenario has no explicit chain or record link`,
    );
  const stepEventIds = new Set();
  for (const [index, step] of scenario.operational_steps.entries()) {
    assert(step.sequence === index + 1, `${scenario.id}: non-contiguous steps`);
    assert(
      !stepEventIds.has(step.event_id),
      `${scenario.id}: duplicate event ${step.event_id}`,
    );
    stepEventIds.add(step.event_id);
    const event = eventIndex.get(step.event_id);
    assert(Boolean(event), `${scenario.id}: unresolved event ${step.event_id}`);
    assert(
      scenario.workflow_ids.includes(event.workflow_id),
      `${scenario.id}/${step.id}: event workflow is outside scenario`,
    );
    assert(
      fixtureWorkflowInstances.has(event.workflow_instance_id),
      `${scenario.id}/${step.id}: event WFI is outside fixture pointers`,
    );
    const fixture = fixtureIndex.get(step.fixture_ref.fixture_id);
    assert(
      Boolean(fixture),
      `${scenario.id}/${step.id}: unresolved step fixture`,
    );
    assert(
      fixture.event_ids.includes(event.id),
      `${scenario.id}/${step.id}: event is outside step fixture`,
    );
    assert(
      step.fixture_ref.workflow_instance_id === event.workflow_instance_id &&
        step.fixture_ref.event_id === event.id,
      `${scenario.id}/${step.id}: fixture tuple differs from event`,
    );
    for (const field of [
      "transition_id",
      "from_state",
      "to_state",
      "kind",
      "actor_assignment_id",
    ]) {
      const stepField = field === "kind" ? "semantic_kind" : field;
      assert(
        step[stepField] === event[field],
        `${scenario.id}/${step.id}: ${stepField} differs from ${event.id}`,
      );
    }
    assert(
      same(step.record_reads, event.record_reads) &&
        same(step.record_writes, event.record_writes),
      `${scenario.id}/${step.id}: record tuple differs from event`,
    );
    assert(
      same(
        step.decision_results,
        event.decision_results.map(({ decision_id, outcome }) => ({
          decision_id,
          outcome,
        })),
      ),
      `${scenario.id}/${step.id}: decision results differ from event`,
    );
    assert(
      same(step.exception_history_ids, event.exception_history_ids),
      `${scenario.id}/${step.id}: exception references differ from event`,
    );
    const assignment = assignmentIndex.get(step.actor_assignment_id);
    assert(
      Boolean(assignment),
      `${scenario.id}/${step.id}: unknown actor assignment`,
    );
    assert(
      scenario.role_ids.includes(assignment.role_id),
      `${scenario.id}/${step.id}: actor role is absent from scenario roles`,
    );
    for (const recordInstanceId of [
      ...step.record_reads,
      ...step.record_writes,
    ])
      assert(
        recordInstanceIndex.has(recordInstanceId),
        `${scenario.id}/${step.id}: unresolved record ${recordInstanceId}`,
      );
    step.exception_history_ids.forEach((historyId) =>
      scenarioUsedExceptionHistories.add(historyId),
    );
    assert(
      step.segment_id ===
        `SEG-${String(step.segment_sequence).padStart(3, "0")}`,
      `${scenario.id}/${step.id}: segment identity differs`,
    );
    const segment = scenario.path_segments[step.segment_sequence - 1];
    assert(
      segment?.event_ids[step.within_segment_sequence - 1] === step.event_id,
      `${scenario.id}/${step.id}: within-segment order differs`,
    );
    const nextStep = scenario.operational_steps[index + 1];
    if (
      nextStep &&
      nextStep.fixture_ref.workflow_instance_id !==
        step.fixture_ref.workflow_instance_id
    )
      assert(
        step.handoff.to_actor_assignment_ids.length === 0 &&
          step.handoff.acknowledgement_required === false,
        `${scenario.id}/${step.id}: cross-path boundary implies a causal handoff`,
      );
  }
  assert(
    same(
      pathEventIds,
      scenario.operational_steps.map((step) => step.event_id),
    ),
    `${scenario.id}: path segments differ from operational steps`,
  );
  const exactDecisionIds = unique(
    scenario.operational_steps.flatMap((step) =>
      step.decision_results.map((result) => result.decision_id),
    ),
  );
  assert(
    same([...scenario.decision_points].sort(), exactDecisionIds.sort()),
    `${scenario.id}: decision points are not the exact operational union`,
  );
  const exactReadIds = unique(
    scenario.operational_steps.flatMap((step) => step.record_reads),
  );
  const exactWriteIds = unique(
    scenario.operational_steps.flatMap((step) => step.record_writes),
  );
  const operationReadIds = scenario.record_operations
    .filter((record) => record.action === "read")
    .map((record) => record.record_instance_id);
  const operationWriteIds = scenario.record_operations
    .filter((record) => record.action !== "read")
    .map((record) => record.record_instance_id);
  assert(
    same(
      [...operationReadIds].sort(),
      exactReadIds.filter((id) => !exactWriteIds.includes(id)).sort(),
    ) && same([...operationWriteIds].sort(), exactWriteIds.sort()),
    `${scenario.id}: structured record operations differ from exact step unions`,
  );
  assert(
    scenario.expected_transitions.length === scenario.operational_steps.length,
    `${scenario.id}: expected transitions and operational steps differ in length`,
  );
  scenario.expected_transitions.forEach((transition, index) => {
    const step = scenario.operational_steps[index];
    const event = eventIndex.get(step.event_id);
    assert(
      transition.from === step.from_state && transition.to === step.to_state,
      `${scenario.id}: expected transition ${index + 1} differs from exact step`,
    );
    assert(
      transition.reason.includes(step.transition_id),
      `${scenario.id}: expected transition omits canonical ID`,
    );
    assert(
      transition.event_id === step.event_id &&
        transition.transition_id === step.transition_id &&
        transition.workflow_instance_id ===
          step.fixture_ref.workflow_instance_id &&
        transition.actor_assignment_id === step.actor_assignment_id &&
        same(transition.record_read_ids, step.record_reads) &&
        same(transition.record_write_ids, step.record_writes) &&
        transition.connectivity_mode === event.connectivity.mode &&
        transition.sync_status === event.connectivity.sync_status,
      `${scenario.id}: expected transition ${index + 1} omits exact operational pointers`,
    );
  });
  if (scenario.category === "offline_delayed")
    assert(
      scenario.operational_steps.some(
        (step) => eventIndex.get(step.event_id).connectivity.captured_offline,
      ) ||
        scenario.operational_steps.some(
          (step) =>
            eventIndex.get(step.event_id).connectivity.mode === "intermittent",
        ),
      `${scenario.id}: offline/delayed scenario has no offline or intermittent event`,
    );
  if (scenario.category === "cross_organization")
    assert(
      scenario.workflow_ids.length > 1 ||
        scenario.synthetic_fixture_refs.some(
          (fixtureId) => fixtureIndex.get(fixtureId).contract_ids.length > 0,
        ) ||
        scenario.role_ids.some((roleId) =>
          [
            "ROLE-CONTRACT-GROWER",
            "ROLE-WINERY-INTAKE",
            "ROLE-WINEMAKER",
            "ROLE-AUDITOR",
            "ROLE-CERTIFIER",
            "ROLE-REGULATOR",
          ].includes(roleId),
        ),
      `${scenario.id}: cross-organization scenario has no workflow or contract boundary`,
    );
  if (scenario.category === "correction")
    assert(
      scenario.operational_steps.some((step) =>
        ["correction", "supersession"].includes(step.semantic_kind),
      ) ||
        scenario.operational_steps.some((step) =>
          [step.from_state, step.to_state].some(
            (state) =>
              state?.includes("correct") || state?.includes("revision"),
          ),
        ) ||
        scenario.record_operations.some(
          (record) =>
            ["correct", "supersede"].includes(record.action) ||
            record.lifecycle_state.includes("correct"),
        ),
      `${scenario.id}: correction category has no correction or supersession evidence`,
    );
  if (scenario.category === "blocked")
    assert(
      scenario.operational_steps.some(
        (step) =>
          step.exception_history_ids.length > 0 ||
          [
            "blocked",
            "delayed",
            "disputed",
            "unavailable",
            "noncompliant",
            "certification_withheld",
            "rejected",
          ].some((state) => step.to_state.includes(state)),
      ),
      `${scenario.id}: blocked category has no blocking evidence`,
    );
  if (scenario.category === "incomplete_information")
    assert(
      scenario.operational_steps.some(
        (step) =>
          step.exception_history_ids.length > 0 ||
          ["partial", "unavailable", "gap", "pending", "superseded"].some(
            (state) => step.to_state.includes(state),
          ),
      ),
      `${scenario.id}: incomplete-information category has no incomplete evidence`,
    );
}
assert(
  scenarioUsedFixtures.size === fixtures.length,
  `Scenario catalog uses ${scenarioUsedFixtures.size}/${fixtures.length} fixtures`,
);
assert(
  scenarioUsedWorkflowInstances.size === operation.workflow_instances.length,
  `Scenario catalog covers ${scenarioUsedWorkflowInstances.size}/${operation.workflow_instances.length} workflow instances`,
);
assert(
  scenarioUsedExceptionHistories.size ===
    operation.links
      .flatMap((link) => link.exception_history_ids ?? [])
      .filter((value, index, values) => values.indexOf(value) === index)
      .length || scenarioUsedExceptionHistories.size === 25,
  `Scenario catalog covers ${scenarioUsedExceptionHistories.size}/25 exception histories`,
);

assert(
  requirements.length === 100,
  `Expected 100 requirements; found ${requirements.length}`,
);
assert(
  scenarioUsedRequirements.size === requirements.length,
  `Scenarios motivate ${scenarioUsedRequirements.size}/${requirements.length} requirements`,
);
for (const requirement of requirements) {
  requirement.workflow_ids.forEach((workflowId) =>
    assert(
      workflowIndex.has(workflowId),
      `${requirement.id}: unresolved ${workflowId}`,
    ),
  );
  requirement.scenario_ids.forEach((scenarioId) => {
    const scenario = scenarioIndex.get(scenarioId);
    assert(Boolean(scenario), `${requirement.id}: unresolved ${scenarioId}`);
    assert(
      scenario.requirement_ids.includes(requirement.id),
      `${requirement.id}: ${scenarioId} lacks reciprocal requirement reference`,
    );
  });
  const linkedScenarioTransitions = new Set(
    requirement.scenario_ids.flatMap((scenarioId) =>
      scenarioIndex
        .get(scenarioId)
        .operational_steps.map((step) => step.transition_id),
    ),
  );
  const linkedScreenTransitions = new Set(
    requirement.screen_ids.flatMap((screenId) =>
      screenIndex
        .get(screenId)
        .actions.filter((action) => action.kind !== "inspect")
        .map((action) => action.transition.transition_id),
    ),
  );
  const requirementWorkflow = workflowIndex.get(requirement.workflow_ids[0]);
  const requirementTransitions = requirement.transition_ids.map(
    (transitionId) =>
      requirementWorkflow.transitions.find(
        (transition) => transition.id === transitionId,
      ),
  );
  assert(
    requirementTransitions.every(Boolean),
    `${requirement.id}: unresolved semantic transition`,
  );
  if (requirement.title.includes("Make accountable decisions"))
    assert(
      requirementTransitions.some(
        (transition) =>
          transition.decision_ids.length > 0 ||
          ["recommendation", "approval"].includes(transition.kind),
      ),
      `${requirement.id}: decision-support profile has no decision transition`,
    );
  if (requirement.title.includes("Contain exceptions"))
    assert(
      requirementTransitions.some(
        (transition) =>
          transition.exception_ids.length > 0 ||
          ["exception", "recovery"].includes(transition.kind),
      ),
      `${requirement.id}: exception profile has no exception or recovery transition`,
    );
  if (requirement.title.includes("Correct records through"))
    assert(
      requirementTransitions.some(
        (transition) =>
          ["correction", "supersession"].includes(transition.kind) ||
          [transition.from, transition.to].some((state) =>
            /correct|supersed|revision|amend/.test(state ?? ""),
          ),
      ),
      `${requirement.id}: correction profile has no correction or supersession transition`,
    );
  if (requirement.title.includes("Preserve authoritative record versions"))
    assert(
      requirementTransitions.some(
        (transition) =>
          transition.record_reads.length > 0 ||
          transition.record_writes.length > 0,
      ),
      `${requirement.id}: version-preservation profile has no record evidence`,
    );
  if (requirement.title.includes("Close work with evidence"))
    assert(
      requirementTransitions.some(
        (transition) =>
          transition.to === requirementWorkflow.states.at(-1) ||
          ["completion", "verification", "reconciliation"].includes(
            transition.kind,
          ),
      ),
      `${requirement.id}: closure profile has no completion transition`,
    );
  requirement.transition_ids.forEach((transitionId) => {
    assert(
      linkedScenarioTransitions.has(transitionId),
      `${requirement.id}: ${transitionId} is absent from motivating scenarios`,
    );
    assert(
      linkedScreenTransitions.has(transitionId),
      `${requirement.id}: ${transitionId} is absent from realizing screens`,
    );
  });
  requirement.screen_ids.forEach((screenId) =>
    assert(
      screenIndex.get(screenId).requirement_ids.includes(requirement.id),
      `${requirement.id}: ${screenId} lacks reciprocal requirement reference`,
    ),
  );
  requirement.role_ids.forEach((roleId) =>
    assert(roleIndex.has(roleId), `${requirement.id}: unresolved ${roleId}`),
  );
  requirement.record_ids.forEach((recordId) =>
    assert(
      recordIndex.has(recordId),
      `${requirement.id}: unresolved ${recordId}`,
    ),
  );
  requirement.decision_ids.forEach((decisionId) =>
    assert(
      decisionIndex.has(decisionId),
      `${requirement.id}: unresolved ${decisionId}`,
    ),
  );
}

const expectedScreenCounts = [6, 6, 6, 6, 6, 8, 7, 7, 7, 8];
const expectedWf001ScreenByTransition = new Map([
  ["TRN-WF-001-001", "SCR-001"],
  ["TRN-WF-001-002", "SCR-002"],
  ["TRN-WF-001-009", "SCR-002"],
  ["TRN-WF-001-003", "SCR-003"],
  ["TRN-WF-001-010", "SCR-003"],
  ["TRN-WF-001-004", "SCR-004"],
  ["TRN-WF-001-011", "SCR-004"],
  ["TRN-WF-001-012", "SCR-004"],
  ["TRN-WF-001-016", "SCR-004"],
  ["TRN-WF-001-018", "SCR-004"],
  ["TRN-WF-001-005", "SCR-005"],
  ["TRN-WF-001-006", "SCR-005"],
  ["TRN-WF-001-007", "SCR-005"],
  ["TRN-WF-001-013", "SCR-005"],
  ["TRN-WF-001-014", "SCR-005"],
  ["TRN-WF-001-019", "SCR-005"],
  ["TRN-WF-001-020", "SCR-005"],
  ["TRN-WF-001-008", "SCR-006"],
  ["TRN-WF-001-015", "SCR-006"],
  ["TRN-WF-001-017", "SCR-006"],
]);
const expectedWf007ScreenByTransition = new Map([
  ["TRN-WF-007-008", "SCR-039"],
  ["TRN-WF-007-018", "SCR-039"],
  ["TRN-WF-007-019", "SCR-039"],
  ["TRN-WF-007-001", "SCR-040"],
  ["TRN-WF-007-002", "SCR-040"],
  ["TRN-WF-007-009", "SCR-040"],
  ["TRN-WF-007-010", "SCR-041"],
  ["TRN-WF-007-011", "SCR-041"],
  ["TRN-WF-007-003", "SCR-042"],
  ["TRN-WF-007-004", "SCR-042"],
  ["TRN-WF-007-012", "SCR-042"],
  ["TRN-WF-007-014", "SCR-042"],
  ["TRN-WF-007-015", "SCR-042"],
  ["TRN-WF-007-020", "SCR-042"],
  ["TRN-WF-007-021", "SCR-042"],
  ["TRN-WF-007-005", "SCR-043"],
  ["TRN-WF-007-013", "SCR-043"],
  ["TRN-WF-007-017", "SCR-043"],
  ["TRN-WF-007-022", "SCR-043"],
  ["TRN-WF-007-024", "SCR-043"],
  ["TRN-WF-007-006", "SCR-044"],
  ["TRN-WF-007-016", "SCR-044"],
  ["TRN-WF-007-023", "SCR-044"],
  ["TRN-WF-007-007", "SCR-045"],
]);
assert(screens.length === 67, `Expected 67 screens; found ${screens.length}`);
assert(
  unique(screens.map((screen) => screen.route)).length === screens.length,
  "Screen routes are not unique",
);
const actionIds = new Set();
const screenUsedScenarios = new Set();
const screenUsedRequirements = new Set();
const screenUsedComponents = new Set();
for (const [workflowOffset, workflowId] of expectedWorkflowIds.entries()) {
  const workflowScreens = screens.filter((screen) =>
    screen.workflow_ids.includes(workflowId),
  );
  assert(
    workflowScreens.length === expectedScreenCounts[workflowOffset],
    `${workflowId}: expected ${expectedScreenCounts[workflowOffset]} screens; found ${workflowScreens.length}`,
  );
}
for (const screen of screens) {
  screen.scenario_ids.forEach((scenarioId) => {
    screenUsedScenarios.add(scenarioId);
    assert(
      scenarioIndex.has(scenarioId),
      `${screen.id}: unresolved ${scenarioId}`,
    );
  });
  const hasExactActionOverlap = screen.scenario_ids.some((scenarioId) => {
    const scenarioTransitions = new Set(
      scenarioIndex
        .get(scenarioId)
        .operational_steps.map((step) => step.transition_id),
    );
    return screen.actions.some(
      (action) =>
        action.kind !== "inspect" &&
        scenarioTransitions.has(action.transition.transition_id),
    );
  });
  const isExplicitCanonicalBranchScreen = screen.actions
    .filter((action) => action.kind !== "inspect")
    .every(
      (action) =>
        action.evidence_status === "canonical_branch" &&
        action.scenario_ids.length === 0,
    );
  assert(
    hasExactActionOverlap || isExplicitCanonicalBranchScreen,
    `${screen.id}: neither exact action evidence nor an explicit canonical-only contract`,
  );
  screen.requirement_ids.forEach((requirementId) => {
    screenUsedRequirements.add(requirementId);
    const requirement = requirementIndex.get(requirementId);
    assert(Boolean(requirement), `${screen.id}: unresolved ${requirementId}`);
    assert(
      requirement.screen_ids.includes(screen.id),
      `${screen.id}: ${requirementId} lacks reciprocal screen reference`,
    );
  });
  screen.component_ids.forEach((componentId) => {
    screenUsedComponents.add(componentId);
    assert(
      componentIndex.has(componentId),
      `${screen.id}: unresolved ${componentId}`,
    );
  });
  assert(
    screen.actions.some((action) => action.kind !== "inspect"),
    `${screen.id}: no consequential action`,
  );
  assert(
    screen.actions.some((action) => action.kind === "inspect"),
    `${screen.id}: no attributable history action`,
  );
  for (const action of screen.actions) {
    assert(!actionIds.has(action.id), `${screen.id}: duplicate ${action.id}`);
    actionIds.add(action.id);
    if (action.kind === "inspect") {
      action.permission_rule_ids.forEach((permissionRuleId) => {
        const rule = permissionIndex.get(permissionRuleId);
        assert(
          rule?.effect === "allow" && rule.action_kind === "inspect",
          `${screen.id}/${action.id}: inspect permission is not applicable`,
        );
      });
      continue;
    }
    const workflow = workflowIndex.get(action.transition.workflow_id);
    const transition = workflow.transitions.find(
      (candidate) => candidate.id === action.transition.transition_id,
    );
    assert(
      Boolean(transition),
      `${screen.id}/${action.id}: unresolved transition`,
    );
    assert(
      transition.from === action.transition.from &&
        transition.to === action.transition.to,
      `${screen.id}/${action.id}: transition states differ from ontology`,
    );
    assert(
      action.permission.allowed_role_ids.includes(transition.owner),
      `${screen.id}/${action.id}: transition owner is not authorized`,
    );
    const exactScenarioIds = screen.scenario_ids.filter((scenarioId) =>
      scenarioIndex
        .get(scenarioId)
        .operational_steps.some(
          (step) => step.transition_id === action.transition.transition_id,
        ),
    );
    assert(
      same([...action.scenario_ids].sort(), exactScenarioIds.sort()),
      `${screen.id}/${action.id}: scenario evidence links are not exact`,
    );
    assert(
      action.evidence_status ===
        (exactScenarioIds.length > 0 ? "fixture_realized" : "canonical_branch"),
      `${screen.id}/${action.id}: evidence status differs from scenario realization`,
    );
    if (action.evidence_status === "fixture_realized")
      assert(
        screen.requirement_ids.some((requirementId) => {
          const requirement = requirementIndex.get(requirementId);
          return (
            requirement.transition_ids.includes(
              action.transition.transition_id,
            ) &&
            requirement.scenario_ids.some((scenarioId) =>
              action.scenario_ids.includes(scenarioId),
            )
          );
        }),
        `${screen.id}/${action.id}: realized action has no exact linked requirement`,
      );
    assert(
      action.permission_rule_ids.length === 1,
      `${screen.id}/${action.id}: action must name one exact allow rule`,
    );
    const permissionRule = permissionIndex.get(action.permission_rule_ids[0]);
    assert(
      permissionRule?.effect === "allow" &&
        permissionRule.action_kind === action.kind &&
        permissionRule.transition_ids.includes(transition.id),
      `${screen.id}/${action.id}: permission rule does not cover exact action`,
    );
    const grant = permissionRule.grants.find(
      (candidate) => candidate.transition_id === transition.id,
    );
    assert(
      grant &&
        same(grant.role_ids, [transition.owner]) &&
        same(action.permission.allowed_role_ids, [transition.owner]),
      `${screen.id}/${action.id}: grant is not transition-owner exact`,
    );
    assert(
      action.notification_rule_ids.length === 1,
      `${screen.id}/${action.id}: action must name one notification rule`,
    );
    const notificationRule = notificationIndex.get(
      action.notification_rule_ids[0],
    );
    assert(
      notificationRule?.workflow_ids.includes(action.transition.workflow_id) &&
        same(notificationRule.trigger_transition_ids, [transition.id]),
      `${screen.id}/${action.id}: notification rule trigger differs`,
    );
    const inlineNotification = action.notifications[0];
    const expectedUrgency =
      notificationRule.severity === "information"
        ? "routine"
        : notificationRule.severity;
    assert(
      action.notifications.length === 1 &&
        same(
          inlineNotification.recipient_role_ids,
          notificationRule.recipient_role_ids,
        ) &&
        inlineNotification.trigger ===
          `${transition.id} is accepted into the canonical server event log` &&
        inlineNotification.channel === notificationRule.canonical_channel &&
        inlineNotification.urgency === expectedUrgency &&
        inlineNotification.acknowledgement_required ===
          (notificationRule.acknowledgement !== "none"),
      `${screen.id}/${action.id}: inline notification differs from ${notificationRule.id}`,
    );
    assert(
      syncClassIndex.has(action.sync_class_id),
      `${screen.id}/${action.id}: unresolved sync class`,
    );
    assert(
      action.sync.idempotency_key_source ===
        "device_id + local_event_id + actor_assignment_id + scope_id",
      `${screen.id}/${action.id}: idempotency key differs from canonical sync`,
    );
    if (
      [
        "approval",
        "verification",
        "reconciliation",
        "correction",
        "supersession",
      ].includes(action.semantic_kind)
    )
      assert(
        action.sync_class_id === "SYNC-003" && !action.sync.offline_capable,
        `${screen.id}/${action.id}: consequential acceptance is not online-required`,
      );
    if (
      action.transition.workflow_id === "WF-006" &&
      (action.transition.from === "quality_pending" ||
        ["accepted", "rejected", "downgraded"].includes(action.transition.to))
    )
      assert(
        action.sync_class_id === "SYNC-003" &&
          action.sync.mode === "online" &&
          !action.sync.offline_capable,
        `${screen.id}/${action.id}: quality disposition is not online-required`,
      );
    assert(
      same(action.decision_ids, transition.decision_ids) &&
        same(action.record_reads, transition.record_reads) &&
        same(action.record_writes, transition.record_writes),
      `${screen.id}/${action.id}: decisions or records differ from ontology`,
    );
    assert(
      action.audit.immutable &&
        action.audit.actor_attribution === "assignment_and_person",
      `${screen.id}/${action.id}: audit contract is not immutable and attributable`,
    );
    if (!action.sync.offline_capable)
      assert(
        action.sync.mode === "online",
        `${screen.id}/${action.id}: online-only action has another sync mode`,
      );
  }
}

for (const expectedMap of [
  expectedWf001ScreenByTransition,
  expectedWf007ScreenByTransition,
])
  for (const [transitionId, expectedScreenId] of expectedMap) {
    const realizingScreens = screens.filter((screen) =>
      screen.actions.some(
        (action) =>
          action.kind !== "inspect" &&
          action.transition.transition_id === transitionId,
      ),
    );
    assert(
      realizingScreens.length === 1 &&
        realizingScreens[0].id === expectedScreenId,
      `${transitionId}: expected exact responsibility on ${expectedScreenId}`,
    );
  }
assert(
  screenUsedScenarios.size === scenarios.length,
  `Screens cover ${screenUsedScenarios.size}/${scenarios.length} scenarios`,
);
assert(
  screenUsedRequirements.size === requirements.length,
  `Screens realize ${screenUsedRequirements.size}/${requirements.length} requirements`,
);
assert(
  screenUsedComponents.size === components.length,
  `Screens use ${screenUsedComponents.size}/${components.length} components`,
);
for (const scenario of scenarios) {
  const linkedActionTransitions = new Set(
    screens
      .filter((screen) => screen.scenario_ids.includes(scenario.id))
      .flatMap((screen) =>
        screen.actions
          .filter(
            (action) =>
              action.kind !== "inspect" &&
              action.scenario_ids.includes(scenario.id),
          )
          .map((action) => action.transition.transition_id),
      ),
  );
  scenario.operational_steps.forEach((step) =>
    assert(
      linkedActionTransitions.has(step.transition_id),
      `${scenario.id}: ${step.transition_id} has no exact linked screen action`,
    ),
  );
}
const canonicalTransitions = workflows.flatMap((workflow) =>
  workflow.transitions.map((transition) => ({ workflow, transition })),
);
assert(
  transitionDispositions.length === canonicalTransitions.length,
  `Expected ${canonicalTransitions.length} transition dispositions; found ${transitionDispositions.length}`,
);
for (const { workflow, transition } of canonicalTransitions) {
  const disposition = dispositionIndex.get(transition.id);
  assert(Boolean(disposition), `${transition.id}: missing product disposition`);
  assert(
    disposition.workflow_id === workflow.id &&
      disposition.owner_role_id === transition.owner &&
      disposition.disposition === "user_action",
    `${transition.id}: disposition differs from canonical ownership`,
  );
  const screen = screenIndex.get(disposition.screen_id);
  const action = screen?.actions.find(
    (candidate) => candidate.id === disposition.action_id,
  );
  assert(
    action?.kind !== "inspect" &&
      action?.transition.transition_id === transition.id,
    `${transition.id}: disposition does not resolve exact screen action`,
  );
}

assert(
  permissionRules.length === 60 &&
    permissionsDocument.default_effect === "deny",
  "Permission model must expose six exact policy classes per workflow and default deny",
);
for (const workflowId of expectedWorkflowIds) {
  const rules = permissionRules.filter((rule) =>
    rule.workflow_ids.includes(workflowId),
  );
  assert(rules.length === 6, `${workflowId}: expected six permission rules`);
  assert(
    rules.some((rule) => rule.effect === "deny"),
    `${workflowId}: missing explicit default-deny consequence`,
  );
  const workflow = workflowIndex.get(workflowId);
  const allowGrants = rules
    .filter((rule) => rule.effect === "allow")
    .flatMap((rule) => rule.grants);
  for (const transition of workflow.transitions) {
    const grants = allowGrants.filter(
      (grant) => grant.transition_id === transition.id,
    );
    assert(
      grants.length === 1 && same(grants[0].role_ids, [transition.owner]),
      `${workflowId}/${transition.id}: permission grant is not owner-exact`,
    );
  }
}
assert(
  notificationRules.length === canonicalTransitions.length,
  "Expected one canonical notification rule per transition",
);
const notificationKeys = new Set();
for (const rule of notificationRules) {
  rule.workflow_ids.forEach((workflowId) =>
    assert(workflowIndex.has(workflowId), `${rule.id}: unresolved workflow`),
  );
  rule.recipient_role_ids.forEach((roleId) =>
    assert(roleIndex.has(roleId), `${rule.id}: unresolved recipient ${roleId}`),
  );
  if (["urgent", "safety"].includes(rule.severity))
    assert(
      rule.bundle_policy === "never_bundle",
      `${rule.id}: urgent notification may not be bundled`,
    );
  const workflow = workflowIndex.get(rule.workflow_ids[0]);
  const transition = workflow.transitions.find((candidate) =>
    rule.trigger_transition_ids.includes(candidate.id),
  );
  assert(Boolean(transition), `${rule.id}: unresolved trigger transition`);
  const urgentEntry = [
    "blocked",
    "delayed",
    "disputed",
    "noncompliant",
    "correction_required",
    "certification_withheld",
    "paused",
    "rejected",
  ].some((state) => transition.to.includes(state));
  if (rule.severity === "urgent")
    assert(
      urgentEntry || transition.exception_ids.length > 0,
      `${rule.id}: urgent notification does not enter an urgent condition`,
    );
  const key = `${rule.trigger_transition_ids.join("+")}|${rule.dedupe_key}`;
  assert(
    !notificationKeys.has(key),
    `${rule.id}: duplicate trigger/dedupe key`,
  );
  notificationKeys.add(key);
}
assert(
  same(
    syncModel.classes.map((syncClass) => syncClass.name).sort(),
    ["offline_safe", "offline_conditional", "online_required"].sort(),
  ),
  "Sync model must define the three canonical action classes",
);
assert(
  syncModel.conflict_rules.some((rule) => rule.includes("last-write-wins")),
  "Sync model must explicitly prohibit last-write-wins",
);

const expectedStateKinds = [
  "normal",
  "urgent",
  "blocked",
  "partial",
  "corrected",
  "historical",
  "offline",
  "stale",
  "conflict",
  "completion",
  "loading",
  "empty",
  "error",
  "read_only",
  "approval_pending",
  "rejected",
  "superseded",
  "delayed",
  "incomplete_information",
];
assert(
  same(
    unique(screenStates.map((state) => state.kind)).sort(),
    expectedStateKinds.sort(),
  ),
  "State matrix does not cover all 19 required product state kinds",
);
for (const screen of screens) {
  const states = screenStates.filter((state) => state.screen_id === screen.id);
  assert(states.length >= 3, `${screen.id}: fewer than three state contracts`);
  assert(
    states.some((state) => state.kind === "normal"),
    `${screen.id}: no normal state`,
  );
  assert(
    states.some((state) => state.kind === "completion"),
    `${screen.id}: no completion state`,
  );
  assert(
    same(
      unique(states.map((state) => state.kind)).sort(),
      unique(screen.states.map((state) => state.kind)).sort(),
    ),
    `${screen.id}: embedded and canonical state-kind registries differ`,
  );
  const screenActionIndex = new Map(
    screen.actions.map((action) => [action.id, action]),
  );
  const inspectIds = new Set(
    screen.actions
      .filter((action) => action.kind === "inspect")
      .map((action) => action.id),
  );
  const workflow = workflowIndex.get(screen.workflow_ids[0]);
  for (const state of states) {
    state.permission_rule_ids.forEach((permissionId) =>
      assert(
        permissionIndex.has(permissionId),
        `${state.id}: unresolved permission ${permissionId}`,
      ),
    );
    const overlap = state.available_actions.filter((actionId) =>
      state.blocked_actions.includes(actionId),
    );
    assert(
      overlap.length === 0,
      `${state.id}: actions are both available and blocked (${overlap.join(", ")})`,
    );
    for (const actionId of [
      ...state.available_actions,
      ...state.blocked_actions,
    ])
      assert(
        screenActionIndex.has(actionId),
        `${state.id}: ${actionId} is outside ${screen.id}`,
      );
    for (const actionId of state.available_actions) {
      const action = screenActionIndex.get(actionId);
      if (action.kind === "inspect") continue;
      assert(
        state.permission_rule_ids.some((permissionRuleId) =>
          action.permission_rule_ids.includes(permissionRuleId),
        ),
        `${state.id}/${actionId}: no applicable allow permission`,
      );
      if (state.kind === "normal")
        assert(
          action.transition.from === state.canonical_state,
          `${state.id}/${actionId}: action precondition differs from current state`,
        );
    }
    if (state.blocked_actions.length > 0)
      assert(
        state.permission_rule_ids.some(
          (permissionRuleId) =>
            permissionIndex.get(permissionRuleId)?.effect === "deny",
        ),
        `${state.id}: blocked actions lack default-deny policy`,
      );
    if (state.kind === "completion")
      for (const actionId of state.available_actions) {
        const action = screenActionIndex.get(actionId);
        assert(
          inspectIds.has(actionId) ||
            (["correct", "supersede"].includes(action.kind) &&
              action.transition.from === workflow.states.at(-1)),
          `${state.id}/${actionId}: completion exposes a non-terminal action`,
        );
      }
    if (state.source_ref.type === "operational") {
      const scenario = scenarioIndex.get(state.source_ref.scenario_id);
      const step = scenario?.operational_steps.find(
        (candidate) => candidate.event_id === state.source_ref.event_id,
      );
      assert(
        scenario &&
          screen.scenario_ids.includes(scenario.id) &&
          step?.fixture_ref.fixture_id === state.source_ref.fixture_id,
        `${state.id}: operational state source does not resolve exact screen evidence`,
      );
    } else
      assert(
        state.source_ref.scenario_id === null &&
          state.source_ref.fixture_id === null &&
          state.source_ref.event_id === null,
        `${state.id}: non-operational state falsely claims fixture evidence`,
      );
  }
}

assert(flows.length === 20, `Expected 20 flows; found ${flows.length}`);
for (const workflowId of expectedWorkflowIds)
  assert(
    flows.some(
      (flow) =>
        flow.workflow_ids.length === 1 && flow.workflow_ids[0] === workflowId,
    ),
    `${workflowId}: missing family interaction flow`,
  );
for (const scenario of scenarios.filter(
  (candidate) => candidate.workflow_ids.length > 1,
))
  assert(
    flows.some((flow) => flow.scenario_ids.includes(scenario.id)),
    `${scenario.id}: missing cross-workflow interaction flow`,
  );
for (const flow of flows) {
  assert(
    flow.flow_kind ===
      (flow.workflow_ids.length === 1
        ? "ordered_narrative"
        : "linked_evidence_comparison"),
    `${flow.id}: flow kind does not disclose its chronology semantics`,
  );
  flow.scenario_ids.forEach((scenarioId) =>
    assert(
      scenarioIndex.has(scenarioId),
      `${flow.id}: unresolved ${scenarioId}`,
    ),
  );
  flow.fixture_ids.forEach((fixtureId) =>
    assert(fixtureIndex.has(fixtureId), `${flow.id}: unresolved ${fixtureId}`),
  );
  flow.screen_ids.forEach((screenId) =>
    assert(screenIndex.has(screenId), `${flow.id}: unresolved ${screenId}`),
  );
  flow.operational_chain_ids.forEach((chainId) =>
    assert(
      operationalChainIndex.has(chainId),
      `${flow.id}: unresolved ${chainId}`,
    ),
  );
  flow.record_link_ids.forEach((linkId) =>
    assert(operationLinkIndex.has(linkId), `${flow.id}: unresolved ${linkId}`),
  );
  const pathGroups = [
    flow.entry_points,
    flow.normal_path,
    flow.exception_path,
    flow.recovery_path,
    flow.completion_path,
  ];
  const steps = pathGroups.flat();
  if (flow.flow_kind === "ordered_narrative") {
    const scenario = scenarioIndex.get(flow.scenario_ids[0]);
    const orderedSteps = [
      ...flow.normal_path,
      ...flow.exception_path,
      ...flow.recovery_path,
      ...flow.completion_path,
    ];
    assert(
      same(
        orderedSteps.map((step) => step.event_id),
        scenario.operational_steps.map((step) => step.event_id),
      ),
      `${flow.id}: ordered path is not the complete exact scenario sequence`,
    );
  }
  assert(
    same(
      unique(steps.map((step) => step.screen_id)).sort(),
      [...flow.screen_ids].sort(),
    ),
    `${flow.id}: declared screens differ from used flow steps`,
  );
  for (const step of steps) {
    assert(
      flow.scenario_ids.includes(step.scenario_id) &&
        flow.fixture_ids.includes(step.fixture_id),
      `${flow.id}/${step.event_id}: scenario or fixture is outside flow`,
    );
    const scenario = scenarioIndex.get(step.scenario_id);
    const operationalStep = scenario?.operational_steps.find(
      (candidate) => candidate.event_id === step.event_id,
    );
    assert(
      operationalStep?.transition_id === step.transition_id &&
        operationalStep?.fixture_ref.fixture_id === step.fixture_id &&
        same(
          step.record_instance_ids,
          unique([
            ...operationalStep.record_reads,
            ...operationalStep.record_writes,
          ]),
        ),
      `${flow.id}/${step.event_id}: step evidence differs from scenario`,
    );
    const screen = screenIndex.get(step.screen_id);
    const action = screen?.actions.find(
      (candidate) => candidate.id === step.action_id,
    );
    assert(
      screen?.scenario_ids.includes(step.scenario_id) &&
        action?.kind !== "inspect" &&
        action?.transition.transition_id === step.transition_id &&
        action?.scenario_ids.includes(step.scenario_id) &&
        action?.permission.allowed_role_ids.includes(step.actor_role_id),
      `${flow.id}/${step.event_id}: screen/action/actor trace differs`,
    );
    const surfaceRow = roleSurfaceMatrix.rows.find(
      (row) =>
        row.role_id === step.actor_role_id &&
        screen.workflow_ids.includes(row.workflow_id),
    );
    assert(
      surfaceRow &&
        [
          ...surfaceRow.desktop_screen_ids,
          ...surfaceRow.mobile_screen_ids,
        ].includes(step.screen_id),
      `${flow.id}/${step.event_id}: actor has no declared screen surface`,
    );
  }
  for (const pathGroup of pathGroups)
    for (let index = 1; index < pathGroup.length; index += 1) {
      const previous = eventIndex.get(pathGroup[index - 1].event_id);
      const current = eventIndex.get(pathGroup[index].event_id);
      if (previous.workflow_instance_id === current.workflow_instance_id)
        assert(
          previous.to_state === current.from_state,
          `${flow.id}: local path order is not state-contiguous`,
        );
    }
  if (flow.workflow_ids.length > 1)
    assert(
      flow.operational_chain_ids.length > 0 || flow.record_link_ids.length > 0,
      `${flow.id}: cross-workflow boundary lacks chain or record link`,
    );
}

const wf001Flow = flows.find((flow) => flow.id === "FLW-001");
assert(Boolean(wf001Flow), "FLW-001: missing exact production narrative");
const wf001OrderedSteps = [
  ...wf001Flow.normal_path,
  ...wf001Flow.exception_path,
  ...wf001Flow.recovery_path,
  ...wf001Flow.completion_path,
];
assert(
  same(
    wf001OrderedSteps.map((step) => step.event_id),
    [
      "EVT-00384",
      "EVT-00386",
      "EVT-00388",
      "EVT-00391",
      "EVT-00393",
      "EVT-00395",
      "EVT-00397",
      "EVT-00400",
    ],
  ) &&
    same(
      wf001OrderedSteps.map((step) => step.screen_id),
      [
        "SCR-001",
        "SCR-002",
        "SCR-003",
        "SCR-004",
        "SCR-005",
        "SCR-005",
        "SCR-005",
        "SCR-006",
      ],
    ),
  "FLW-001: exact FIX-006 sequence does not traverse all six responsibility surfaces",
);

assert(
  domains.length === 6,
  `Expected six bounded domains; found ${domains.length}`,
);
assert(
  informationArchitecture.screen_routes.length === screens.length,
  "Information architecture does not register every screen route",
);
assert(
  navigationModels.role_entries.length === roles.length,
  "Navigation does not define a home for every canonical role",
);
assert(
  roleSurfaceMatrix.rows.length ===
    roles.reduce((sum, role) => sum + role.workflow_ids.length, 0),
  "Role/surface matrix does not cover every canonical role-workflow relationship",
);
for (const row of roleSurfaceMatrix.rows) {
  assert(
    row.desktop_screen_ids.length + row.mobile_screen_ids.length > 0,
    `${row.role_id}/${row.workflow_id}: no product surface`,
  );
  row.permission_rule_ids.forEach((permissionRuleId) =>
    assert(
      permissionIndex.has(permissionRuleId),
      `${row.role_id}/${row.workflow_id}: unresolved ${permissionRuleId}`,
    ),
  );
}
for (const role of roles) {
  const navigation = navigationModels.role_entries.find(
    (entry) => entry.role_id === role.id,
  );
  assert(
    navigation?.primary_screen_ids.length > 0,
    `${role.id}: no navigable product surface`,
  );
}
assert(
  platformMatrix.screens.length === screens.length,
  "Platform matrix does not classify every screen",
);
for (const component of components)
  for (const screenId of component.screen_ids) {
    const screen = screenIndex.get(screenId);
    assert(Boolean(screen), `${component.id}: unresolved ${screenId}`);
    assert(
      screen.component_ids.includes(component.id),
      `${component.id}: ${screenId} lacks reciprocal component reference`,
    );
  }

const relationshipPairs = new Set(
  relationships.map(
    (relationship) =>
      `${relationship.from}|${relationship.to}|${relationship.relationship}`,
  ),
);
for (const scenario of scenarios)
  for (const requirementId of scenario.requirement_ids)
    assert(
      relationshipPairs.has(`${scenario.id}|${requirementId}|motivates`),
      `${scenario.id} -> ${requirementId}: missing motivates relationship`,
    );
for (const requirement of requirements)
  for (const screenId of requirement.screen_ids)
    assert(
      relationshipPairs.has(`${requirement.id}|${screenId}|realized_by`),
      `${requirement.id} -> ${screenId}: missing realized_by relationship`,
    );
for (const screen of screens)
  for (const componentId of screen.component_ids)
    assert(
      relationshipPairs.has(`${screen.id}|${componentId}|composed_with`),
      `${screen.id} -> ${componentId}: missing composed_with relationship`,
    );
for (const screen of screens)
  for (const action of screen.actions) {
    assert(
      relationshipPairs.has(`${screen.id}|${action.id}|offers`),
      `${screen.id} -> ${action.id}: missing offers relationship`,
    );
    for (const permissionRuleId of action.permission_rule_ids)
      assert(
        relationshipPairs.has(`${action.id}|${permissionRuleId}|authorized_by`),
        `${action.id} -> ${permissionRuleId}: missing authorization relationship`,
      );
    for (const notificationRuleId of action.notification_rule_ids)
      assert(
        relationshipPairs.has(`${action.id}|${notificationRuleId}|notifies_by`),
        `${action.id} -> ${notificationRuleId}: missing notification relationship`,
      );
    assert(
      relationshipPairs.has(
        `${action.id}|${action.sync_class_id}|synchronizes_by`,
      ),
      `${action.id} -> ${action.sync_class_id}: missing sync relationship`,
    );
  }

console.log(
  `✓ product model: ${scenarios.length} scenarios, ${requirements.length} requirements, ${screens.length} screens, ${permissionRules.length} permission rules, ${notificationRules.length} notification rules, ${screenStates.length} state contracts, ${flows.length} flows, ${components.length} component contracts, ${relationships.length} relationships`,
);
console.log(`✓ product validation complete: ${assertions} assertions`);
