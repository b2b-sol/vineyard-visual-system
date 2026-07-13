import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { parse as parseYaml } from "yaml";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const ALLOWED_SCOPES = new Set(["schema", "trace", "data", "all"]);
const args = process.argv.slice(2);
const scopeFlagIndex = args.indexOf("--scope");
const scope = scopeFlagIndex >= 0 ? args[scopeFlagIndex + 1] : "all";

if (!ALLOWED_SCOPES.has(scope)) {
  throw new Error(
    `Unknown validation scope "${scope}". Expected schema, trace, data, or all.`,
  );
}

const state = {
  assertions: 0,
  files: new Map(),
  schemas: new Map(),
  documents: new Map(),
};

function absolute(relativePath) {
  return path.join(ROOT, ...relativePath.split("/"));
}

async function readText(relativePath) {
  if (!state.files.has(relativePath)) {
    state.files.set(
      relativePath,
      await readFile(absolute(relativePath), "utf8"),
    );
  }
  return state.files.get(relativePath);
}

async function readJson(relativePath) {
  if (!state.documents.has(relativePath)) {
    const text = await readText(relativePath);
    try {
      state.documents.set(relativePath, JSON.parse(text));
    } catch (error) {
      throw new Error(`${relativePath}: invalid JSON (${error.message})`, {
        cause: error,
      });
    }
  }
  return state.documents.get(relativePath);
}

async function readYaml(relativePath) {
  if (!state.documents.has(relativePath)) {
    const text = await readText(relativePath);
    try {
      state.documents.set(relativePath, parseYaml(text));
    } catch (error) {
      throw new Error(`${relativePath}: invalid YAML (${error.message})`, {
        cause: error,
      });
    }
  }
  return state.documents.get(relativePath);
}

function assert(condition, message) {
  state.assertions += 1;
  if (!condition) {
    throw new Error(message);
  }
}

function assertUnique(values, label) {
  assert(
    new Set(values).size === values.length,
    `${label}: duplicate value detected`,
  );
}

function byId(items, label) {
  assertUnique(
    items.map((item) => item.id),
    `${label} IDs`,
  );
  return new Map(items.map((item) => [item.id, item]));
}

function formatAjvErrors(errors = []) {
  return errors
    .map(
      (error) =>
        `${error.instancePath || "/"} ${error.message}${error.params?.additionalProperty ? ` (${error.params.additionalProperty})` : ""}`,
    )
    .join("; ");
}

async function createSchemaValidator() {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const schemaDirectory = absolute("schemas");
  const schemaFiles = (await readdir(schemaDirectory))
    .filter((name) => name.endsWith(".schema.json"))
    .sort();

  for (const fileName of schemaFiles) {
    const relativePath = `schemas/${fileName}`;
    const schema = await readJson(relativePath);
    assert(
      typeof schema.$id === "string",
      `${relativePath}: schema must declare $id`,
    );
    ajv.addSchema(schema);
    state.schemas.set(fileName, schema.$id);
  }

  for (const [fileName, schemaId] of state.schemas) {
    assert(
      Boolean(ajv.getSchema(schemaId)),
      `schemas/${fileName}: could not compile schema`,
    );
  }

  return ajv;
}

function validateRecord(ajv, schemaFile, record, label) {
  const schemaId = state.schemas.get(schemaFile);
  assert(Boolean(schemaId), `Missing schema ${schemaFile}`);
  const validate = ajv.getSchema(schemaId);
  const isValid = validate(record);
  assert(
    isValid,
    `${label}: ${isValid ? "" : formatAjvErrors(validate.errors)}`,
  );
}

async function validateSchemas() {
  const ajv = await createSchemaValidator();
  const registries = [
    ["workflow-model/walking-slice.json", "workflows", "workflow.schema.json"],
    ["scenarios/walking-slice.json", "scenarios", "scenario.schema.json"],
    ["data/walking-slice.json", "fixtures", "fixture.schema.json"],
    ["screens/walking-slice.json", "screens", "screen.schema.json"],
    [
      "design-system/walking-slice-components.json",
      "components",
      "component.schema.json",
    ],
    [
      "construction-packets/walking-slice.json",
      "packets",
      "construction-packet.schema.json",
    ],
    ["control/trace-nodes.json", "nodes", "trace-node.schema.json"],
    ["control/trace-edges.json", "edges", "trace-edge.schema.json"],
  ];

  for (const [relativePath, key, schemaFile] of registries) {
    const document = await readJson(relativePath);
    assert(
      document.schema_version === "1.0",
      `${relativePath}: unsupported schema_version`,
    );
    assert(
      Array.isArray(document[key]) && document[key].length > 0,
      `${relativePath}: ${key} must be a non-empty array`,
    );
    document[key].forEach((record, index) =>
      validateRecord(
        ajv,
        schemaFile,
        record,
        `${relativePath}#/${key}/${index}`,
      ),
    );
  }

  validateRecord(
    ajv,
    "task-registry.schema.json",
    await readYaml("control/TASK_REGISTRY.yaml"),
    "control/TASK_REGISTRY.yaml",
  );
  validateRecord(
    ajv,
    "project-state.schema.json",
    await readYaml("control/PROJECT_STATE.yaml"),
    "control/PROJECT_STATE.yaml",
  );
  validateRecord(
    ajv,
    "manifest.schema.json",
    await readYaml("control/MASTER_MANIFEST.yaml"),
    "control/MASTER_MANIFEST.yaml",
  );
  validateRecord(
    ajv,
    "findings.schema.json",
    await readYaml("validation/FINDINGS.yaml"),
    "validation/FINDINGS.yaml",
  );
  validateRecord(
    ajv,
    "gate-results.schema.json",
    await readJson("validation/gate-results.json"),
    "validation/gate-results.json",
  );

  return `compiled ${state.schemas.size} schemas and validated ${registries.length + 5} registries`;
}

function containsJsonId(value, targetId) {
  if (Array.isArray(value))
    return value.some((item) => containsJsonId(item, targetId));
  if (!value || typeof value !== "object") return false;
  if (value.id === targetId) return true;
  return Object.values(value).some((item) => containsJsonId(item, targetId));
}

async function assertNodeLocator(node) {
  await access(absolute(node.path));
  if (node.locator.kind === "heading") {
    const source = await readText(node.path);
    assert(
      source.includes(node.locator.value),
      `${node.id}: heading locator not found in ${node.path}`,
    );
    return;
  }
  const document = await readJson(node.path);
  assert(
    containsJsonId(document, node.locator.value),
    `${node.id}: JSON ID locator ${node.locator.value} not found in ${node.path}`,
  );
}

function manifestFromNodes(nodes) {
  return {
    schema_version: "1.0",
    generated_from: "control/trace-nodes.json",
    artifact_count: nodes.length,
    artifacts: nodes.map((node) => ({
      id: node.id,
      type: node.type,
      title: node.title,
      path: node.path,
      locator: `${node.locator.kind}:${node.locator.value}`,
      status: node.status,
    })),
  };
}

function deepEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function assertReferenceList(values, index, label) {
  for (const value of values) {
    assert(index.has(value), `${label}: unresolved reference ${value}`);
  }
}

async function validateTrace() {
  const nodeDocument = await readJson("control/trace-nodes.json");
  const edgeDocument = await readJson("control/trace-edges.json");
  const nodeIndex = byId(nodeDocument.nodes, "trace node");
  const edgeIndex = byId(edgeDocument.edges, "trace edge");
  assert(
    edgeIndex.size === edgeDocument.edges.length,
    "Trace edge index is incomplete",
  );

  await Promise.all(nodeDocument.nodes.map(assertNodeLocator));

  const expectedEdgeTypes = new Map([
    ["supports", ["evidence", "workflow"]],
    ["realized_by", ["workflow", "scenario"]],
    ["instantiated_by", ["scenario", "fixture"]],
    ["rendered_by", ["fixture", "screen"]],
    ["composed_with", ["screen", "component"]],
    ["specified_by", ["component", "construction_packet"]],
  ]);
  const incoming = new Map(nodeDocument.nodes.map((node) => [node.id, 0]));
  const outgoing = new Map(nodeDocument.nodes.map((node) => [node.id, []]));

  for (const edge of edgeDocument.edges) {
    assert(
      nodeIndex.has(edge.from),
      `${edge.id}: unresolved from node ${edge.from}`,
    );
    assert(nodeIndex.has(edge.to), `${edge.id}: unresolved to node ${edge.to}`);
    assert(edge.from !== edge.to, `${edge.id}: self edges are not allowed`);
    const [expectedFrom, expectedTo] = expectedEdgeTypes.get(edge.relationship);
    assert(
      nodeIndex.get(edge.from).type === expectedFrom,
      `${edge.id}: ${edge.relationship} must start at ${expectedFrom}`,
    );
    assert(
      nodeIndex.get(edge.to).type === expectedTo,
      `${edge.id}: ${edge.relationship} must end at ${expectedTo}`,
    );
    incoming.set(edge.to, incoming.get(edge.to) + 1);
    outgoing.get(edge.from).push(edge.to);
  }

  for (const node of nodeDocument.nodes) {
    if (node.type !== "evidence")
      assert(
        incoming.get(node.id) > 0,
        `${node.id}: orphan node has no incoming trace edge`,
      );
    if (node.type !== "construction_packet")
      assert(
        outgoing.get(node.id).length > 0,
        `${node.id}: orphan node has no outgoing trace edge`,
      );
  }

  const expectedTypes = [
    "evidence",
    "workflow",
    "scenario",
    "fixture",
    "screen",
    "component",
    "construction_packet",
  ];
  function hasCompleteChain(nodeId, typeIndex, visited) {
    const node = nodeIndex.get(nodeId);
    if (!node || node.type !== expectedTypes[typeIndex] || visited.has(nodeId))
      return false;
    if (typeIndex === expectedTypes.length - 1) return true;
    const nextVisited = new Set(visited).add(nodeId);
    return outgoing
      .get(nodeId)
      .some((nextId) => hasCompleteChain(nextId, typeIndex + 1, nextVisited));
  }
  const evidenceNodes = nodeDocument.nodes.filter(
    (node) => node.type === "evidence",
  );
  assert(
    evidenceNodes.some((node) => hasCompleteChain(node.id, 0, new Set())),
    "Trace graph has no complete evidence-to-packet chain",
  );

  const workflow = (await readJson("workflow-model/walking-slice.json"))
    .workflows[0];
  const scenario = (await readJson("scenarios/walking-slice.json"))
    .scenarios[0];
  const fixture = (await readJson("data/walking-slice.json")).fixtures[0];
  const screen = (await readJson("screens/walking-slice.json")).screens[0];
  const component = (
    await readJson("design-system/walking-slice-components.json")
  ).components[0];
  const packet = (await readJson("construction-packets/walking-slice.json"))
    .packets[0];

  assertReferenceList(
    workflow.evidence_ids,
    nodeIndex,
    `${workflow.id}.evidence_ids`,
  );
  assert(
    scenario.workflow_ids.includes(workflow.id),
    `${scenario.id}: missing workflow ${workflow.id}`,
  );
  assert(
    fixture.scenario_ids.includes(scenario.id),
    `${fixture.id}: missing scenario ${scenario.id}`,
  );
  assert(
    screen.workflow_ids.includes(workflow.id) &&
      screen.scenario_ids.includes(scenario.id) &&
      screen.fixture_ids.includes(fixture.id),
    `${screen.id}: workflow/scenario/fixture trace is incomplete`,
  );
  assert(
    component.workflow_ids.includes(workflow.id) &&
      component.scenario_ids.includes(scenario.id) &&
      component.screen_ids.includes(screen.id),
    `${component.id}: workflow/scenario/screen trace is incomplete`,
  );
  assert(
    packet.workflow_ids.includes(workflow.id) &&
      packet.scenario_ids.includes(scenario.id) &&
      packet.fixture_ids.includes(fixture.id),
    `${packet.id}: upstream trace is incomplete`,
  );
  assert(
    packet.screen_ids.includes(screen.id) &&
      packet.component_ids.includes(component.id),
    `${packet.id}: screen/component trace is incomplete`,
  );
  await access(absolute(component.code_path));

  const workflowStates = new Set(workflow.states);
  for (const action of screen.actions) {
    if (action.transition) {
      assert(
        workflowStates.has(action.transition.from),
        `${screen.id}/${action.id}: unknown from state ${action.transition.from}`,
      );
      assert(
        workflowStates.has(action.transition.to),
        `${screen.id}/${action.id}: unknown to state ${action.transition.to}`,
      );
    }
  }
  const actionIds = new Set(screen.actions.map((action) => action.id));
  for (const interaction of packet.interaction_contract) {
    assert(
      actionIds.has(interaction.action_id),
      `${packet.id}: unknown screen action ${interaction.action_id}`,
    );
  }

  const manifest = await readYaml("control/MASTER_MANIFEST.yaml");
  assert(
    deepEqual(manifest, manifestFromNodes(nodeDocument.nodes)),
    "control/MASTER_MANIFEST.yaml has drifted from control/trace-nodes.json",
  );
  return `validated ${nodeDocument.nodes.length} nodes, ${edgeDocument.edges.length} edges, one complete semantic chain, and generated manifest parity`;
}

function dateValue(value, label) {
  const parsed = Date.parse(value);
  assert(Number.isFinite(parsed), `${label}: invalid timestamp ${value}`);
  return parsed;
}

async function validateData() {
  const fixtures = (await readJson("data/walking-slice.json")).fixtures;
  const workflowIndex = byId(
    (await readJson("workflow-model/walking-slice.json")).workflows,
    "workflow",
  );
  const scenarioIndex = byId(
    (await readJson("scenarios/walking-slice.json")).scenarios,
    "scenario",
  );
  let checkedEvents = 0;

  for (const fixture of fixtures) {
    const organizationIndex = byId(
      fixture.organizations,
      `${fixture.id} organization`,
    );
    const peopleIndex = byId(fixture.people, `${fixture.id} person`);
    const blockIndex = byId(fixture.blocks, `${fixture.id} block`);
    const observationIndex = byId(
      fixture.observations,
      `${fixture.id} observation`,
    );
    byId(fixture.work_orders, `${fixture.id} work order`);
    assertUnique(
      fixture.blocks.map((block) => block.stable_identity),
      `${fixture.id} stable block identities`,
    );
    assertReferenceList(
      fixture.scenario_ids,
      scenarioIndex,
      `${fixture.id}.scenario_ids`,
    );

    for (const person of fixture.people)
      assert(
        organizationIndex.has(person.organization_id),
        `${person.id}: unknown organization ${person.organization_id}`,
      );
    for (const block of fixture.blocks) {
      assert(
        organizationIndex.has(block.organization_id),
        `${block.id}: unknown organization ${block.organization_id}`,
      );
      assertUnique(
        block.aliases.map((alias) => `${alias.system}:${alias.value}`),
        `${block.id} aliases`,
      );
    }
    for (const observation of fixture.observations) {
      assert(
        blockIndex.has(observation.block_id),
        `${observation.id}: unknown block ${observation.block_id}`,
      );
      assert(
        peopleIndex.has(observation.observer_person_id),
        `${observation.id}: unknown observer ${observation.observer_person_id}`,
      );
    }

    for (const workOrder of fixture.work_orders) {
      assert(
        workflowIndex.has(workOrder.workflow_id),
        `${workOrder.id}: unknown workflow ${workOrder.workflow_id}`,
      );
      assert(
        scenarioIndex.has(workOrder.scenario_id),
        `${workOrder.id}: unknown scenario ${workOrder.scenario_id}`,
      );
      assert(
        fixture.scenario_ids.includes(workOrder.scenario_id),
        `${workOrder.id}: scenario is outside fixture coverage`,
      );
      assert(
        blockIndex.has(workOrder.block_id),
        `${workOrder.id}: unknown block ${workOrder.block_id}`,
      );
      assert(
        observationIndex.has(workOrder.source_observation_id),
        `${workOrder.id}: unknown observation ${workOrder.source_observation_id}`,
      );
      assert(
        observationIndex.get(workOrder.source_observation_id).block_id ===
          workOrder.block_id,
        `${workOrder.id}: observation and work order block identities differ`,
      );
      assertReferenceList(
        workOrder.assignee_person_ids,
        peopleIndex,
        `${workOrder.id}.assignee_person_ids`,
      );
      const block = blockIndex.get(workOrder.block_id);
      assert(
        workOrder.target_acres <= block.acres,
        `${workOrder.id}: target acreage exceeds block acreage`,
      );
      assert(
        workOrder.actuals.completed_acres <= block.acres,
        `${workOrder.id}: actual acreage exceeds block acreage`,
      );
      assert(
        workOrder.actuals.completed_acres <= workOrder.target_acres,
        `${workOrder.id}: actual acreage exceeds target acreage`,
      );
      assertUnique(
        workOrder.status_history.map((event) => event.id),
        `${workOrder.id} event IDs`,
      );

      let previousTime = -Infinity;
      let previousStatus = null;
      let previousReportedAcres = 0;
      for (const [index, event] of workOrder.status_history.entries()) {
        const eventTime = dateValue(event.at, `${workOrder.id}/${event.id}`);
        assert(
          eventTime > previousTime,
          `${workOrder.id}: status history is not strictly chronological at ${event.id}`,
        );
        assert(
          event.from === previousStatus,
          `${workOrder.id}/${event.id}: expected from=${previousStatus}, received ${event.from}`,
        );
        assert(
          peopleIndex.has(event.actor_person_id),
          `${workOrder.id}/${event.id}: unknown actor ${event.actor_person_id}`,
        );
        if (event.reported_acres !== undefined) {
          assert(
            event.reported_acres >= previousReportedAcres,
            `${workOrder.id}/${event.id}: reported acreage regressed`,
          );
          assert(
            event.reported_acres <= workOrder.target_acres,
            `${workOrder.id}/${event.id}: reported acreage exceeds target`,
          );
          previousReportedAcres = event.reported_acres;
        }
        if (index === 0)
          assert(
            event.from === null,
            `${workOrder.id}: initial event must start from null`,
          );
        previousTime = eventTime;
        previousStatus = event.to;
        checkedEvents += 1;
      }
      assert(
        previousStatus === workOrder.current_status,
        `${workOrder.id}: current_status does not match final event`,
      );
      assert(
        dateValue(
          workOrder.blocker.recorded_at,
          `${workOrder.id}.blocker.recorded_at`,
        ) <
          dateValue(
            workOrder.blocker.resolved_at,
            `${workOrder.id}.blocker.resolved_at`,
          ),
        `${workOrder.id}: blocker resolution must follow blocker report`,
      );
      const blockedEvent = workOrder.status_history.find(
        (event) => event.to === "blocked",
      );
      const resumeEvent = workOrder.status_history.find(
        (event) => event.to === "ready_to_resume",
      );
      assert(
        Boolean(blockedEvent && resumeEvent),
        `${workOrder.id}: blocked recovery events are incomplete`,
      );
      assert(
        dateValue(blockedEvent.at, `${workOrder.id}.blocked`) ===
          dateValue(workOrder.blocker.recorded_at, `${workOrder.id}.blocker`),
        `${workOrder.id}: blocker timestamp differs from status history`,
      );
      assert(
        dateValue(
          workOrder.blocker.resolved_at,
          `${workOrder.id}.blocker.resolved_at`,
        ) <= dateValue(resumeEvent.at, `${workOrder.id}.ready_to_resume`),
        `${workOrder.id}: work resumed before blocker resolution`,
      );
      assert(
        dateValue(
          workOrder.actuals.verified_at,
          `${workOrder.id}.actuals.verified_at`,
        ) === previousTime,
        `${workOrder.id}: verification timestamp differs from final event`,
      );
      assert(
        peopleIndex.has(workOrder.actuals.verified_by_person_id),
        `${workOrder.id}: unknown verifier`,
      );
      if (workOrder.current_status === "verified") {
        assert(
          workOrder.actuals.completed_acres === workOrder.target_acres,
          `${workOrder.id}: verified acreage must equal target acreage`,
        );
      }

      const scenario = scenarioIndex.get(workOrder.scenario_id);
      const actualTransitions = workOrder.status_history.map(
        (event) => `${event.from ?? "null"}->${event.to}`,
      );
      const expectedTransitions = scenario.expected_transitions.map(
        (event) => `${event.from ?? "null"}->${event.to}`,
      );
      assert(
        deepEqual(actualTransitions, expectedTransitions),
        `${workOrder.id}: fixture history does not realize ${scenario.id} expected transitions`,
      );
    }
  }

  return `validated ${fixtures.length} connected fixture and ${checkedEvents} chronological state events`;
}

function successfulTerminal(status) {
  return new Set(["validated", "merged", "complete"]).has(status);
}

async function validateControl() {
  const registry = await readYaml("control/TASK_REGISTRY.yaml");
  const project = await readYaml("control/PROJECT_STATE.yaml");
  const taskIndex = byId(registry.tasks, "task");

  for (const task of registry.tasks) {
    for (const dependencyId of task.depends_on) {
      assert(
        taskIndex.has(dependencyId),
        `${task.id}: unresolved dependency ${dependencyId}`,
      );
      assert(
        dependencyId !== task.id,
        `${task.id}: task cannot depend on itself`,
      );
    }
  }

  const visiting = new Set();
  const visited = new Set();
  function visit(taskId, pathIds) {
    if (visiting.has(taskId))
      throw new Error(
        `Task dependency cycle: ${[...pathIds, taskId].join(" -> ")}`,
      );
    if (visited.has(taskId)) return;
    visiting.add(taskId);
    const task = taskIndex.get(taskId);
    task.depends_on.forEach((dependencyId) =>
      visit(dependencyId, [...pathIds, taskId]),
    );
    visiting.delete(taskId);
    visited.add(taskId);
  }
  registry.tasks.forEach((task) => visit(task.id, []));
  assert(
    visited.size === registry.tasks.length,
    "Task dependency graph traversal was incomplete",
  );

  const startedStatuses = new Set([
    "in_progress",
    "review",
    "revise",
    "validated",
    "merged",
    "complete",
  ]);
  for (const task of registry.tasks.filter((candidate) =>
    startedStatuses.has(candidate.status),
  )) {
    for (const dependencyId of task.depends_on) {
      assert(
        successfulTerminal(taskIndex.get(dependencyId).status),
        `${task.id}: started before dependency ${dependencyId} reached a successful terminal state`,
      );
    }
  }

  if (project.next_task === null) {
    assert(
      project.definition_of_done_passed,
      "PROJECT_STATE.next_task may be null only after Definition of Done passes",
    );
  } else {
    const nextId = project.next_task.match(
      /^([A-Z]+(?:-[A-Z]+)*-[0-9]{3})\b/,
    )?.[1];
    assert(
      Boolean(nextId),
      "PROJECT_STATE.next_task must begin with a task ID",
    );
    assert(
      taskIndex.has(nextId),
      `PROJECT_STATE.next_task points to unknown task ${nextId}`,
    );
    const nextTask = taskIndex.get(nextId);
    const executableStatuses = new Set([
      "planned",
      "ready",
      "in_progress",
      "review",
      "revise",
    ]);
    assert(
      executableStatuses.has(nextTask.status),
      `PROJECT_STATE.next_task ${nextId} is not executable (${nextTask.status})`,
    );
    for (const dependencyId of nextTask.depends_on) {
      assert(
        successfulTerminal(taskIndex.get(dependencyId).status),
        `PROJECT_STATE.next_task ${nextId} has incomplete dependency ${dependencyId}`,
      );
    }
    assert(
      project.current_phase === nextTask.phase,
      `PROJECT_STATE.current_phase ${project.current_phase} differs from ${nextId} phase ${nextTask.phase}`,
    );
    if (nextTask.branch)
      assert(
        project.active_branch === nextTask.branch,
        `PROJECT_STATE.active_branch differs from ${nextId}.branch`,
      );
  }

  if (project.last_completed_task !== null) {
    assert(
      taskIndex.has(project.last_completed_task),
      `PROJECT_STATE.last_completed_task points to unknown task ${project.last_completed_task}`,
    );
    assert(
      successfulTerminal(taskIndex.get(project.last_completed_task).status),
      `PROJECT_STATE.last_completed_task ${project.last_completed_task} is not complete`,
    );
  }

  const findings = await readYaml("validation/FINDINGS.yaml");
  const gateResults = await readJson("validation/gate-results.json");
  byId(findings.findings, "finding");
  byId(gateResults.gates, "gate result");
  for (const gate of gateResults.gates) {
    for (const evidencePath of gate.evidence)
      await access(absolute(evidencePath));
  }
  const completionPassed = gateResults.gates.some(
    (gate) => ["G10", "G11"].includes(gate.id) && gate.status === "passed",
  );
  if (completionPassed) {
    const unresolvedBlocking = findings.findings.filter(
      (finding) =>
        ["P0", "P1"].includes(finding.severity) &&
        finding.status !== "resolved",
    );
    assert(
      unresolvedBlocking.length === 0,
      "Completion gate cannot pass with unresolved P0/P1 findings",
    );
  }

  return `validated ${registry.tasks.length}-task acyclic registry, resumable pointers, findings, and gate evidence`;
}

async function main() {
  const summaries = [];
  summaries.push(["schema", await validateSchemas()]);
  if (["trace", "all"].includes(scope))
    summaries.push(["trace", await validateTrace()]);
  if (["data", "all"].includes(scope))
    summaries.push(["data", await validateData()]);
  if (scope === "all") summaries.push(["control", await validateControl()]);

  for (const [name, summary] of summaries) console.log(`✓ ${name}: ${summary}`);
  console.log(
    `✓ validation complete: ${state.assertions} assertions (${scope})`,
  );
}

main().catch((error) => {
  console.error(`✗ validation failed (${scope}): ${error.message}`);
  process.exitCode = 1;
});
