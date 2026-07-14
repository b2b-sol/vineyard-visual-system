import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import prettier from "prettier";
import YAML from "yaml";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");
const readJson = async (relativePath) =>
  JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));

const [
  evidenceDocument,
  workflowDocument,
  scenarioDocument,
  fullFixtureDocument,
  requirementDocument,
  screenDocument,
  componentDocument,
  packetDocument,
] = await Promise.all([
  readJson("source/evidence.json"),
  readJson("workflow-model/workflows.json"),
  readJson("scenarios/scenarios.json"),
  readJson("data/scenario-fixtures.json"),
  readJson("product-structure/requirements.json"),
  readJson("product-structure/screens.json"),
  readJson("product-structure/component-requirements.json"),
  readJson("construction-packets/packets.json"),
]);

const evidence = evidenceDocument.claims;
const workflows = workflowDocument.workflows;
const scenarios = scenarioDocument.scenarios;
const fixtures = fullFixtureDocument.fixtures;
const requirements = requirementDocument.requirements;
const screens = screenDocument.screens;
const components = componentDocument.components;
const packets = packetDocument.packets;
const evidenceIndex = new Map(evidence.map((claim) => [claim.id, claim]));

const nodes = [
  ...evidence.map((claim) => ({
    id: claim.id,
    type: "evidence",
    title: claim.title,
    path: claim.source_anchor.path,
    locator: {
      kind: "heading",
      value: claim.source_anchor.section_heading,
    },
    classification: claim.classification,
    status: "approved",
  })),
  ...workflows.map((workflow) => ({
    id: workflow.id,
    type: "workflow",
    title: workflow.name,
    path: "workflow-model/workflows.json",
    locator: { kind: "json_id", value: workflow.id },
    classification: workflow.classification,
    status: "approved",
  })),
  ...scenarios.map((scenario) => ({
    id: scenario.id,
    type: "scenario",
    title: scenario.title,
    path: "scenarios/scenarios.json",
    locator: { kind: "json_id", value: scenario.id },
    classification: scenario.evidence_classification,
    status: "approved",
  })),
  ...fixtures.map((fixture) => ({
    id: fixture.id,
    type: "fixture",
    title: fixture.title,
    path: "data/scenario-fixtures.json",
    locator: { kind: "json_id", value: fixture.id },
    classification: "synthetic_fixture",
    status: "approved",
  })),
  ...requirements.map((requirement) => ({
    id: requirement.id,
    type: "requirement",
    title: requirement.title,
    path: "product-structure/requirements.json",
    locator: { kind: "json_id", value: requirement.id },
    classification: requirement.classification,
    status: requirement.status,
  })),
  ...screens.map((screen) => ({
    id: screen.id,
    type: "screen",
    title: screen.name,
    path: "product-structure/screens.json",
    locator: { kind: "json_id", value: screen.id },
    classification: "implementation_contract",
    status: "approved",
  })),
  ...components.map((component) => ({
    id: component.id,
    type: "component",
    title: component.name,
    path: "product-structure/component-requirements.json",
    locator: { kind: "json_id", value: component.id },
    classification: "implementation_contract",
    status: component.status === "implemented" ? "approved" : "review",
  })),
  ...packets.map((packet) => ({
    id: packet.id,
    type: "construction_packet",
    title: packet.title,
    path: "construction-packets/packets.json",
    locator: { kind: "json_id", value: packet.id },
    classification: "implementation_contract",
    status: "approved",
  })),
];

const semanticEdges = [];
const addEdge = (from, to, relationship, rationale) =>
  semanticEdges.push({ from, to, relationship, rationale });

for (const workflow of workflows)
  for (const evidenceId of workflow.evidence_ids) {
    const claim = evidenceIndex.get(evidenceId);
    if (!claim)
      throw new Error(`${workflow.id}: unresolved evidence ${evidenceId}`);
    addEdge(
      evidenceId,
      workflow.id,
      "supports",
      `${claim.title} supplies ${claim.classification.replaceAll("_", " ")} evidence for this workflow family.`,
    );
  }
for (const scenario of scenarios) {
  for (const workflowId of scenario.workflow_ids)
    addEdge(
      workflowId,
      scenario.id,
      "realized_by",
      `${scenario.id} exercises canonical decisions, states, records, handoffs, non-ideal pressure, recovery, and completion for ${workflowId}.`,
    );
  for (const fixtureId of scenario.synthetic_fixture_refs)
    addEdge(
      scenario.id,
      fixtureId,
      "instantiated_by",
      `${fixtureId} supplies exact full-season workflow-instance, event, record, actor, exception, scope, and timing pointers for ${scenario.id}.`,
    );
  for (const requirementId of scenario.requirement_ids)
    addEdge(
      scenario.id,
      requirementId,
      "motivates",
      `${scenario.id} provides fixture-backed operational pressure and acceptance evidence for ${requirementId}.`,
    );
}
for (const requirement of requirements)
  for (const screenId of requirement.screen_ids)
    addEdge(
      requirement.id,
      screenId,
      "implemented_by",
      `${screenId} exposes the evidence, authority, state, action, audit, and recovery behavior required by ${requirement.id}.`,
    );
for (const screen of screens) {
  for (const fixtureId of screen.fixture_ids)
    addEdge(
      fixtureId,
      screen.id,
      "rendered_by",
      `${screen.id} renders the exact identity, evidence, state, exception, sync, and completion consequences referenced by ${fixtureId}.`,
    );
  for (const componentId of screen.component_ids)
    addEdge(
      screen.id,
      componentId,
      "composed_with",
      `${componentId} provides a reusable semantic interaction contract needed by ${screen.id}.`,
    );
}
for (const packet of packets)
  for (const screenId of packet.screen_ids)
    addEdge(
      screenId,
      packet.id,
      "documented_in",
      `${packet.id} specifies the complete screen responsibility, state, permission, data, interaction, copy, validation, responsive, accessibility, and Figma handoff contract for ${screenId}.`,
    );
for (const packet of packets)
  for (const componentId of packet.component_ids)
    addEdge(
      componentId,
      packet.id,
      "specified_by",
      `${packet.id} fixes the component semantics, state, permissions, data, interaction, copy, validation, and Figma mapping for ${componentId}.`,
    );

const edgeKeys = new Set();
for (const edge of semanticEdges) {
  const key = `${edge.relationship}:${edge.from}:${edge.to}`;
  if (edgeKeys.has(key)) throw new Error(`Duplicate trace edge ${key}`);
  edgeKeys.add(key);
}
const edges = semanticEdges.map((edge, index) => ({
  id: `EDGE-${String(index + 1).padStart(4, "0")}`,
  ...edge,
}));

const nodeDocument = { schema_version: "1.0", nodes };
const edgeDocument = { schema_version: "1.0", edges };
const manifest = {
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
const manifestContents = await prettier.format(YAML.stringify(manifest), {
  parser: "yaml",
});

const outputs = [
  ["control/trace-nodes.json", `${JSON.stringify(nodeDocument, null, 2)}\n`],
  ["control/trace-edges.json", `${JSON.stringify(edgeDocument, null, 2)}\n`],
  ["control/MASTER_MANIFEST.yaml", manifestContents],
];

if (checkOnly) {
  const drift = [];
  for (const [relativePath, expected] of outputs) {
    const current = await readFile(path.join(ROOT, relativePath), "utf8");
    if (current !== expected) drift.push(relativePath);
  }
  if (drift.length)
    throw new Error(`Generated trace artifacts are stale: ${drift.join(", ")}`);
  console.log(
    `✓ ${nodes.length} trace nodes and ${edges.length} edges are current`,
  );
} else {
  await Promise.all(
    outputs.map(([relativePath, contents]) =>
      writeFile(path.join(ROOT, relativePath), contents, "utf8"),
    ),
  );
  console.log(
    `✓ generated ${nodes.length} trace nodes and ${edges.length} edges`,
  );
}
