import { execFileSync } from "node:child_process";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { parse as parseYaml } from "yaml";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const ALLOWED_SCOPES = new Set(["schema", "evidence", "trace", "data", "all"]);
const args = process.argv.slice(2);
const scopeFlagIndex = args.indexOf("--scope");
const scope = scopeFlagIndex >= 0 ? args[scopeFlagIndex + 1] : "all";

if (!ALLOWED_SCOPES.has(scope)) {
  throw new Error(
    `Unknown validation scope "${scope}". Expected schema, evidence, trace, data, or all.`,
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
    ["source/bibliography.json", "entries", "bibliography.schema.json"],
    ["source/evidence.json", "claims", "evidence-claim.schema.json"],
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
  validateRecord(
    ajv,
    "dod-matrix.schema.json",
    await readYaml("control/DOD_MATRIX.yaml"),
    "control/DOD_MATRIX.yaml",
  );

  return `compiled ${state.schemas.size} schemas and validated ${registries.length + 6} registries`;
}

async function validateEvidence() {
  const bibliography = await readJson("source/bibliography.json");
  const evidence = await readJson("source/evidence.json");
  const bibliographyIndex = byId(bibliography.entries, "bibliography");
  const evidenceIndex = byId(evidence.claims, "evidence claim");
  assertUnique(
    bibliography.entries.map((entry) => entry.url),
    "bibliography URLs",
  );

  const source = await readText(evidence.source_document.path);
  const headings = new Set(
    source
      .split(/\r?\n/)
      .map((line) => line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/)?.[1].trim())
      .filter(Boolean),
  );
  const expectedWorkflowIds = Array.from(
    { length: 10 },
    (_, index) => `WF-${String(index + 1).padStart(3, "0")}`,
  );
  const coveredWorkflowIds = new Set();
  const referencedBibliographyIds = new Set();

  for (const claim of evidence.claims) {
    assert(
      headings.has(claim.source_anchor.section_heading),
      `${claim.id}: source section heading does not resolve`,
    );
    assert(
      source.includes(claim.source_anchor.anchor_text),
      `${claim.id}: source anchor text does not resolve`,
    );
    for (const citationHandle of claim.source_citation_handles)
      assert(
        source.includes(citationHandle),
        `${claim.id}: opaque source handle ${citationHandle} is absent from the provenance report`,
      );
    assertReferenceList(
      claim.public_source_ids,
      bibliographyIndex,
      `${claim.id}.public_source_ids`,
    );
    for (const bibliographyId of claim.public_source_ids)
      referencedBibliographyIds.add(bibliographyId);
    for (const workflowId of claim.workflow_ids) {
      assert(
        expectedWorkflowIds.includes(workflowId),
        `${claim.id}: workflow ${workflowId} is outside the approved ten-family taxonomy`,
      );
      coveredWorkflowIds.add(workflowId);
    }
  }

  assert(
    expectedWorkflowIds.every((workflowId) =>
      coveredWorkflowIds.has(workflowId),
    ),
    "Normalized evidence does not cover all ten canonical workflow families",
  );
  assert(
    bibliography.entries.every((entry) =>
      referencedBibliographyIds.has(entry.id),
    ),
    "Public bibliography contains an unreferenced source",
  );
  assert(evidenceIndex.size > 0, "Evidence index is empty");

  return `validated ${evidence.claims.length} source claims, ${bibliography.entries.length} unique public sources, report anchors, provenance handles, and ten-family coverage`;
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
      source.split(/\r?\n/).some((line) => {
        const match = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
        return match?.[1].trim() === node.locator.value;
      }),
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

function gitSucceeds(args) {
  try {
    execFileSync("git", args, { cwd: ROOT, stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function assertCommitProvenance(commit, artifactPaths, label) {
  assert(
    gitSucceeds(["cat-file", "-e", `${commit}^{commit}`]),
    `${label}: commit ${commit} does not resolve`,
  );
  assert(
    gitSucceeds(["merge-base", "--is-ancestor", commit, "HEAD"]),
    `${label}: commit ${commit} is not reachable from HEAD`,
  );
  for (const artifactPath of artifactPaths)
    assert(
      gitSucceeds(["cat-file", "-e", `${commit}:${artifactPath}`]),
      `${label}: ${artifactPath} did not exist at commit ${commit}`,
    );
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
  byId(edgeDocument.edges, "trace edge");
  assertUnique(
    edgeDocument.edges.map(
      (edge) => `${edge.relationship}:${edge.from}:${edge.to}`,
    ),
    "trace edge semantics",
  );

  await Promise.all(nodeDocument.nodes.map(assertNodeLocator));

  const registryDefinitions = [
    ["workflow", "workflow-model/walking-slice.json", "workflows"],
    ["scenario", "scenarios/walking-slice.json", "scenarios"],
    ["fixture", "data/walking-slice.json", "fixtures"],
    ["screen", "screens/walking-slice.json", "screens"],
    ["component", "design-system/walking-slice-components.json", "components"],
    [
      "construction_packet",
      "construction-packets/walking-slice.json",
      "packets",
    ],
  ];
  const registries = new Map();
  const registryPaths = new Map();
  for (const [type, relativePath, key] of registryDefinitions) {
    const records = (await readJson(relativePath))[key];
    registries.set(type, byId(records, type));
    registryPaths.set(type, relativePath);
    for (const record of records) {
      const node = nodeIndex.get(record.id);
      assert(Boolean(node), `${record.id}: missing trace node`);
      assert(
        node.type === type,
        `${record.id}: trace node type must be ${type}`,
      );
      assert(
        node.path === relativePath,
        `${record.id}: trace node path differs from canonical registry`,
      );
    }
  }
  for (const node of nodeDocument.nodes.filter(
    (candidate) => candidate.type !== "evidence",
  )) {
    const registry = registries.get(node.type);
    assert(
      registry?.has(node.id),
      `${node.id}: trace node has no canonical registry record`,
    );
    assert(
      node.path === registryPaths.get(node.type),
      `${node.id}: trace node points outside its canonical registry`,
    );
  }

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
  const semanticEdges = new Set(
    edgeDocument.edges.map(
      (edge) => `${edge.relationship}:${edge.from}:${edge.to}`,
    ),
  );

  for (const edge of edgeDocument.edges) {
    assert(
      nodeIndex.has(edge.from),
      `${edge.id}: unresolved from node ${edge.from}`,
    );
    assert(nodeIndex.has(edge.to), `${edge.id}: unresolved to node ${edge.to}`);
    assert(edge.from !== edge.to, `${edge.id}: self edges are not allowed`);
    const expectedPair = expectedEdgeTypes.get(edge.relationship);
    assert(Boolean(expectedPair), `${edge.id}: unknown relationship`);
    const [expectedFrom, expectedTo] = expectedPair;
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
  for (const evidence of evidenceNodes)
    assert(
      hasCompleteChain(evidence.id, 0, new Set()),
      `${evidence.id}: no complete evidence-to-packet chain`,
    );

  const evidenceIndex = new Map(
    evidenceNodes.map((evidence) => [evidence.id, evidence]),
  );
  const workflows = registries.get("workflow");
  const scenarios = registries.get("scenario");
  const fixtures = registries.get("fixture");
  const screens = registries.get("screen");
  const components = registries.get("component");
  const packets = registries.get("construction_packet");

  const requireEdge = (relationship, from, to, label) =>
    assert(
      semanticEdges.has(`${relationship}:${from}:${to}`),
      `${label}: missing ${relationship} trace edge ${from} -> ${to}`,
    );
  const transitionKey = (transition) => {
    const from = "from" in transition ? transition.from : transition.state_from;
    const to = "to" in transition ? transition.to : transition.state_to;
    return `${from ?? "null"}->${to}`;
  };

  for (const workflow of workflows.values()) {
    assertReferenceList(
      workflow.evidence_ids,
      evidenceIndex,
      `${workflow.id}.evidence_ids`,
    );
    assertUnique(workflow.states, `${workflow.id}.states`);
    assertUnique(
      workflow.steps.map((step) => step.order),
      `${workflow.id}.step order`,
    );
    for (const evidenceId of workflow.evidence_ids)
      requireEdge("supports", evidenceId, workflow.id, workflow.id);
  }

  for (const scenario of scenarios.values()) {
    assertReferenceList(
      scenario.workflow_ids,
      workflows,
      `${scenario.id}.workflow_ids`,
    );
    const supportedTransitions = new Set(
      scenario.workflow_ids.flatMap((workflowId) =>
        workflows.get(workflowId).steps.map(transitionKey),
      ),
    );
    for (const transition of scenario.expected_transitions)
      assert(
        supportedTransitions.has(transitionKey(transition)),
        `${scenario.id}: transition ${transitionKey(transition)} is not defined by a referenced workflow`,
      );
    for (const workflowId of scenario.workflow_ids)
      requireEdge("realized_by", workflowId, scenario.id, scenario.id);
  }

  for (const fixture of fixtures.values()) {
    assertReferenceList(
      fixture.scenario_ids,
      scenarios,
      `${fixture.id}.scenario_ids`,
    );
    for (const workOrder of fixture.work_orders) {
      assert(
        workflows.has(workOrder.workflow_id),
        `${fixture.id}/${workOrder.id}: unknown workflow ${workOrder.workflow_id}`,
      );
      assert(
        fixture.scenario_ids.includes(workOrder.scenario_id),
        `${fixture.id}/${workOrder.id}: scenario is outside fixture coverage`,
      );
    }
    for (const scenarioId of fixture.scenario_ids)
      requireEdge("instantiated_by", scenarioId, fixture.id, fixture.id);
  }

  for (const screen of screens.values()) {
    assertReferenceList(
      screen.workflow_ids,
      workflows,
      `${screen.id}.workflow_ids`,
    );
    assertReferenceList(
      screen.scenario_ids,
      scenarios,
      `${screen.id}.scenario_ids`,
    );
    assertReferenceList(
      screen.fixture_ids,
      fixtures,
      `${screen.id}.fixture_ids`,
    );
    assertReferenceList(
      screen.component_ids,
      components,
      `${screen.id}.component_ids`,
    );
    const screenStateIds = new Set(
      screen.states.map((screenState) => screenState.id),
    );
    assertUnique([...screenStateIds], `${screen.id}.states`);
    assertUnique(
      screen.actions.map((action) => action.id),
      `${screen.id}.actions`,
    );
    const supportedTransitions = new Set(
      screen.workflow_ids.flatMap((workflowId) =>
        workflows.get(workflowId).steps.map(transitionKey),
      ),
    );
    for (const action of screen.actions.filter(
      (candidate) => candidate.transition,
    )) {
      assert(
        screenStateIds.has(action.transition.from),
        `${screen.id}/${action.id}: from state is not represented by the screen`,
      );
      assert(
        screenStateIds.has(action.transition.to),
        `${screen.id}/${action.id}: to state is not represented by the screen`,
      );
      assert(
        supportedTransitions.has(transitionKey(action.transition)),
        `${screen.id}/${action.id}: transition is not defined by a referenced workflow`,
      );
    }
    for (const fixtureId of screen.fixture_ids)
      requireEdge("rendered_by", fixtureId, screen.id, screen.id);
  }

  for (const component of components.values()) {
    assertReferenceList(
      component.workflow_ids,
      workflows,
      `${component.id}.workflow_ids`,
    );
    assertReferenceList(
      component.scenario_ids,
      scenarios,
      `${component.id}.scenario_ids`,
    );
    assertReferenceList(
      component.screen_ids,
      screens,
      `${component.id}.screen_ids`,
    );
    await access(absolute(component.code_path));
    for (const screenId of component.screen_ids)
      requireEdge("composed_with", screenId, component.id, component.id);
  }

  for (const packet of packets.values()) {
    assertReferenceList(
      packet.workflow_ids,
      workflows,
      `${packet.id}.workflow_ids`,
    );
    assertReferenceList(
      packet.scenario_ids,
      scenarios,
      `${packet.id}.scenario_ids`,
    );
    assertReferenceList(
      packet.fixture_ids,
      fixtures,
      `${packet.id}.fixture_ids`,
    );
    assertReferenceList(packet.screen_ids, screens, `${packet.id}.screen_ids`);
    assertReferenceList(
      packet.component_ids,
      components,
      `${packet.id}.component_ids`,
    );
    const actionIds = new Set(
      packet.screen_ids.flatMap((screenId) =>
        screens.get(screenId).actions.map((action) => action.id),
      ),
    );
    for (const interaction of packet.interaction_contract)
      assert(
        actionIds.has(interaction.action_id),
        `${packet.id}: unknown screen action ${interaction.action_id}`,
      );
    for (const componentId of packet.component_ids)
      requireEdge("specified_by", componentId, packet.id, packet.id);
  }

  const manifest = await readYaml("control/MASTER_MANIFEST.yaml");
  assert(
    deepEqual(manifest, manifestFromNodes(nodeDocument.nodes)),
    "control/MASTER_MANIFEST.yaml has drifted from control/trace-nodes.json",
  );
  const recordCount = [...registries.values()].reduce(
    (total, registry) => total + registry.size,
    0,
  );
  return `validated all ${recordCount} canonical records, ${nodeDocument.nodes.length} nodes, ${edgeDocument.edges.length} semantic edges, complete evidence chains, and generated manifest parity`;
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
      if (workOrder.actuals) {
        assert(
          workOrder.actuals.completed_acres <= block.acres,
          `${workOrder.id}: actual acreage exceeds block acreage`,
        );
        assert(
          workOrder.actuals.completed_acres <= workOrder.target_acres,
          `${workOrder.id}: actual acreage exceeds target acreage`,
        );
        if (workOrder.actuals.verified_by_person_id)
          assert(
            peopleIndex.has(workOrder.actuals.verified_by_person_id),
            `${workOrder.id}: unknown verifier`,
          );
      }
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
      const blockedEvent = workOrder.status_history.find(
        (event) => event.to === "blocked",
      );
      const resumeEvent = workOrder.status_history.find(
        (event) => event.to === "ready_to_resume",
      );
      assert(
        Boolean(blockedEvent) === Boolean(workOrder.blocker),
        `${workOrder.id}: blocked transition and blocker record must appear together`,
      );
      if (workOrder.blocker) {
        assert(
          dateValue(blockedEvent.at, `${workOrder.id}.blocked`) ===
            dateValue(
              workOrder.blocker.recorded_at,
              `${workOrder.id}.blocker.recorded_at`,
            ),
          `${workOrder.id}: blocker timestamp differs from status history`,
        );
        if (workOrder.blocker.resolved_at) {
          const recordedAt = dateValue(
            workOrder.blocker.recorded_at,
            `${workOrder.id}.blocker.recorded_at`,
          );
          const resolvedAt = dateValue(
            workOrder.blocker.resolved_at,
            `${workOrder.id}.blocker.resolved_at`,
          );
          assert(
            recordedAt < resolvedAt,
            `${workOrder.id}: blocker resolution must follow blocker report`,
          );
          assert(
            Boolean(resumeEvent),
            `${workOrder.id}: resolved blocker has no ready-to-resume transition`,
          );
          assert(
            resolvedAt <=
              dateValue(resumeEvent.at, `${workOrder.id}.ready_to_resume`),
            `${workOrder.id}: work resumed before blocker resolution`,
          );
        } else {
          assert(
            !resumeEvent,
            `${workOrder.id}: unresolved blocker cannot resume`,
          );
        }
      }
      if (workOrder.current_status === "verified") {
        assert(
          Boolean(workOrder.actuals),
          `${workOrder.id}: verified work requires actuals`,
        );
        assert(
          dateValue(
            workOrder.actuals.verified_at,
            `${workOrder.id}.actuals.verified_at`,
          ) === previousTime,
          `${workOrder.id}: verification timestamp differs from final event`,
        );
        assert(
          workOrder.actuals.completed_acres === workOrder.target_acres,
          `${workOrder.id}: verified acreage must equal target acreage`,
        );
      }

      const scenario = scenarioIndex.get(workOrder.scenario_id);
      const workflow = workflowIndex.get(workOrder.workflow_id);
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
      const workflowTransitions = new Set(
        workflow.steps.map(
          (step) => `${step.state_from ?? "null"}->${step.state_to}`,
        ),
      );
      for (const transition of actualTransitions)
        assert(
          workflowTransitions.has(transition),
          `${workOrder.id}: transition ${transition} is not defined by ${workflow.id}`,
        );
    }
  }

  return `validated ${fixtures.length} connected fixture and ${checkedEvents} chronological state events`;
}

function successfulDependency(status) {
  return new Set(["merged", "complete"]).has(status);
}

async function validateControl() {
  const registry = await readYaml("control/TASK_REGISTRY.yaml");
  const project = await readYaml("control/PROJECT_STATE.yaml");
  const taskIndex = byId(registry.tasks, "task");
  const gitMetadataAvailable = gitSucceeds([
    "rev-parse",
    "--is-inside-work-tree",
  ]);

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
        successfulDependency(taskIndex.get(dependencyId).status),
        `${task.id}: started before dependency ${dependencyId} reached a successful terminal state`,
      );
    }
  }

  for (const task of registry.tasks.filter(
    (candidate) => candidate.status === "complete",
  )) {
    assert(
      Boolean(task.completed_at),
      `${task.id}: complete task has no completed_at`,
    );
    for (const artifactPath of task.artifacts)
      await access(absolute(artifactPath));
    if (task.owner !== "owner_account")
      assert(
        Boolean(task.commit),
        `${task.id}: bot-owned complete task has no evidence commit`,
      );
    if (gitMetadataAvailable && task.commit)
      assertCommitProvenance(task.commit, task.artifacts, task.id);
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
        successfulDependency(taskIndex.get(dependencyId).status),
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
      taskIndex.get(project.last_completed_task).status === "complete",
      `PROJECT_STATE.last_completed_task ${project.last_completed_task} is not explicitly complete`,
    );
  }

  const findings = await readYaml("validation/FINDINGS.yaml");
  const gateResults = await readJson("validation/gate-results.json");
  const dodMatrix = await readYaml("control/DOD_MATRIX.yaml");
  byId(findings.findings, "finding");
  const gateResultIndex = byId(gateResults.gates, "gate result");
  const dodGateIndex = byId(dodMatrix.criteria, "Definition of Done gate");
  const expectedGateIds = Array.from({ length: 13 }, (_, index) => `G${index}`);
  assert(
    deepEqual(
      [...dodGateIndex.keys()].sort(
        (left, right) => Number(left.slice(1)) - Number(right.slice(1)),
      ),
      expectedGateIds,
    ),
    "control/DOD_MATRIX.yaml must contain exactly G0 through G12",
  );

  for (const gate of dodMatrix.criteria) {
    if (gate.status === "passed") {
      assert(
        gate.evidence.length > 0,
        `${gate.id}: passed Definition of Done gate has no evidence`,
      );
      for (const evidencePath of gate.evidence)
        await access(absolute(evidencePath));
      assert(
        gateResultIndex.get(gate.id)?.status === "passed",
        `${gate.id}: passed Definition of Done gate has no passed result record`,
      );
    }
  }
  for (const gate of gateResults.gates) {
    assert(
      dodGateIndex.has(gate.id),
      `${gate.id}: result has no DoD criterion`,
    );
    if (gate.status === "passed") {
      assert(
        dodGateIndex.get(gate.id).status === "passed",
        `${gate.id}: result passes while the DoD matrix does not`,
      );
      assert(
        gate.evidence.length > 0,
        `${gate.id}: passed result has no evidence`,
      );
      assert(
        Boolean(gate.commit_sha),
        `${gate.id}: passed result has no commit SHA`,
      );
      if (gitMetadataAvailable)
        assertCommitProvenance(gate.commit_sha, gate.evidence, gate.id);
    }
    for (const evidencePath of gate.evidence)
      await access(absolute(evidencePath));
  }

  if (project.definition_of_done_passed) {
    assert(
      dodMatrix.status === "passed",
      "Project completion requires a passed DoD matrix",
    );
    assert(
      dodMatrix.criteria.every((gate) => gate.status === "passed"),
      "Project completion requires every G0-G12 criterion to pass",
    );
    assert(
      expectedGateIds.every(
        (gateId) => gateResultIndex.get(gateId)?.status === "passed",
      ),
      "Project completion requires a passed, commit-backed result for every G0-G12 gate",
    );
    const unresolvedBlocking = findings.findings.filter(
      (finding) =>
        ["P0", "P1"].includes(finding.severity) &&
        finding.status !== "resolved",
    );
    assert(
      unresolvedBlocking.length === 0,
      "Completion gate cannot pass with unresolved P0/P1 findings",
    );
  } else {
    assert(
      dodMatrix.status !== "passed",
      "DoD matrix cannot pass while PROJECT_STATE.definition_of_done_passed is false",
    );
  }

  const provenance = gitMetadataAvailable
    ? "Git-reachable evidence-at-commit provenance"
    : "schema-level commit provenance without Git metadata";
  return `validated ${registry.tasks.length}-task acyclic registry, resumable pointers, all G0-G12 criteria, findings, and ${provenance}`;
}

async function main() {
  const summaries = [];
  summaries.push(["schema", await validateSchemas()]);
  if (["evidence", "all"].includes(scope))
    summaries.push(["evidence", await validateEvidence()]);
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
