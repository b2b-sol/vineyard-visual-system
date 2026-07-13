import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import YAML from "yaml";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const readJson = async (relativePath) =>
  JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));

const evidence = (await readJson("source/evidence.json")).claims;
const workflows = (await readJson("workflow-model/workflows.json")).workflows;
const existingNodes = (await readJson("control/trace-nodes.json")).nodes;
const existingEdges = (await readJson("control/trace-edges.json")).edges;

const evidenceIndex = new Map(evidence.map((claim) => [claim.id, claim]));
const evidenceNodes = evidence.map((claim) => ({
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
}));
const workflowNodes = workflows.map((workflow) => ({
  id: workflow.id,
  type: "workflow",
  title: workflow.name,
  path: "workflow-model/workflows.json",
  locator: { kind: "json_id", value: workflow.id },
  classification: workflow.classification,
  status: "approved",
}));
const downstreamNodes = existingNodes.filter(
  (node) => !["evidence", "workflow"].includes(node.type),
);
const nodes = [...evidenceNodes, ...workflowNodes, ...downstreamNodes];

const supportEdges = workflows.flatMap((workflow) =>
  workflow.evidence_ids.map((evidenceId) => {
    const claim = evidenceIndex.get(evidenceId);
    if (!claim)
      throw new Error(`${workflow.id}: unresolved evidence ${evidenceId}`);
    return {
      from: evidenceId,
      to: workflow.id,
      relationship: "supports",
      rationale: `${claim.title} supplies ${claim.classification.replaceAll("_", " ")} evidence for this workflow family.`,
    };
  }),
);
const downstreamEdges = existingEdges
  .filter((edge) => edge.relationship !== "supports")
  .map((edge) => {
    const edgeWithoutId = { ...edge };
    delete edgeWithoutId.id;
    return edgeWithoutId;
  });
const edges = [...supportEdges, ...downstreamEdges].map((edge, index) => ({
  id: `EDGE-${String(index + 1).padStart(3, "0")}`,
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

const outputs = [
  ["control/trace-nodes.json", `${JSON.stringify(nodeDocument, null, 2)}\n`],
  ["control/trace-edges.json", `${JSON.stringify(edgeDocument, null, 2)}\n`],
  ["control/MASTER_MANIFEST.yaml", YAML.stringify(manifest)],
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
