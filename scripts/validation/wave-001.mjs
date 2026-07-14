import { createHash } from "node:crypto";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const requireComplete = process.argv.includes("--require-complete");
let assertions = 0;
const assert = (condition, message) => {
  assertions += 1;
  if (!condition) throw new Error(message);
};
const absolute = (relativePath) => path.join(ROOT, ...relativePath.split("/"));
const readJson = async (relativePath) =>
  JSON.parse(await readFile(absolute(relativePath), "utf8"));
const exists = async (relativePath) =>
  access(absolute(relativePath)).then(
    () => true,
    () => false,
  );
const digest = (contents) =>
  createHash("sha256").update(contents).digest("hex");
const digestPaths = async (relativePaths) => {
  const hash = createHash("sha256");
  for (const relativePath of relativePaths) {
    hash.update(relativePath);
    hash.update("\0");
    hash.update(await readFile(absolute(relativePath)));
    hash.update("\0");
  }
  return hash.digest("hex");
};
const sameValues = (actual, expected, label) => {
  assert(
    actual != null && typeof actual[Symbol.iterator] === "function",
    `${label}: actual value is not iterable`,
  );
  assert(
    expected != null && typeof expected[Symbol.iterator] === "function",
    `${label}: expected value is not iterable`,
  );
  const normalizedActual = [...actual].sort();
  const normalizedExpected = [...expected].sort();
  assert(
    JSON.stringify(normalizedActual) === JSON.stringify(normalizedExpected),
    `${label}: expected ${normalizedExpected.join(", ")}; received ${normalizedActual.join(", ")}`,
  );
};
const unique = (values, label) => {
  assert(new Set(values).size === values.length, `${label}: duplicate value`);
  return values;
};
const indexById = (items, label) => {
  unique(
    items.map((item) => item.id),
    `${label} IDs`,
  );
  return new Map(items.map((item) => [item.id, item]));
};
const assertReferences = (values, index, label) => {
  for (const value of values)
    assert(index.has(value), `${label}: unresolved reference ${value}`);
};
const formatAjvErrors = (errors = []) =>
  (errors ?? [])
    .map(
      (error) =>
        `${error.instancePath || "/"} ${error.message}${error.params?.additionalProperty ? ` (${error.params.additionalProperty})` : ""}`,
    )
    .join("; ");

const WAVE_SCREEN_IDS = [
  "SCR-001",
  "SCR-002",
  "SCR-003",
  "SCR-004",
  "SCR-005",
  "SCR-006",
  "SCR-039",
  "SCR-040",
  "SCR-041",
  "SCR-042",
  "SCR-043",
  "SCR-044",
  "SCR-045",
];
const WAVE_COMPONENT_IDS = [
  ...Array.from(
    { length: 22 },
    (_, index) => `CMP-${String(index + 1).padStart(3, "0")}`,
  ),
  "CMP-026",
  "CMP-033",
  "CMP-034",
  "CMP-035",
  "CMP-036",
];
const WAVE_FLOW_IDS = ["FLW-001", "FLW-007", "FLW-015"];
const WAVE_PACKET_IDS = ["PKT-002", "PKT-003", "PKT-004"];
const EXPECTED_PACKET_SCREENS = new Map([
  ["PKT-001", ["SCR-001"]],
  ["PKT-002", WAVE_SCREEN_IDS.slice(0, 6)],
  ["PKT-003", WAVE_SCREEN_IDS.slice(6, 10)],
  ["PKT-004", WAVE_SCREEN_IDS.slice(10)],
]);
const EXPECTED_STATES = new Map([
  ["SCR-001", ["normal", "offline", "partial", "urgent", "completion"]],
  ["SCR-002", ["normal", "blocked", "partial", "completion"]],
  ["SCR-003", ["normal", "blocked", "stale", "partial", "completion"]],
  ["SCR-004", ["normal", "blocked", "stale", "corrected", "completion"]],
  ["SCR-005", ["normal", "blocked", "corrected", "historical", "completion"]],
  ["SCR-006", ["normal", "stale", "corrected", "offline", "completion"]],
  ["SCR-039", ["normal", "blocked", "urgent", "historical", "completion"]],
  ["SCR-040", ["normal", "urgent", "partial", "offline", "completion"]],
  ["SCR-041", ["normal", "blocked", "urgent", "stale", "completion"]],
  ["SCR-042", ["normal", "blocked", "urgent", "conflict", "completion"]],
  ["SCR-043", ["normal", "blocked", "urgent", "loading", "completion"]],
  ["SCR-044", ["normal", "blocked", "corrected", "empty", "completion"]],
  ["SCR-045", ["normal", "urgent", "partial", "error", "completion"]],
]);

async function makeAjv() {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const schemaNames = (await readdir(absolute("schemas")))
    .filter((fileName) => fileName.endsWith(".schema.json"))
    .sort();
  for (const schemaName of schemaNames)
    ajv.addSchema(await readJson(`schemas/${schemaName}`));
  return ajv;
}

function validateWith(ajv, schemaName, value, label) {
  const id = `https://vineyard-visual-system.dev/schemas/${schemaName}`;
  const validate = ajv.getSchema(id);
  assert(Boolean(validate), `${label}: schema ${schemaName} did not compile`);
  const valid = validate(value);
  assert(valid, `${label}: ${formatAjvErrors(validate.errors)}`);
}

function collectTokens(node, inheritedType, segments = [], tokens = []) {
  if (!node || typeof node !== "object" || Array.isArray(node)) return tokens;
  const type = node.$type ?? inheritedType;
  if (Object.hasOwn(node, "$value")) {
    tokens.push({ token_path: segments.join("."), type });
    return tokens;
  }
  for (const [key, value] of Object.entries(node))
    if (!key.startsWith("$"))
      collectTokens(value, type, [...segments, key], tokens);
  return tokens;
}

async function validateImplementationEntry(entry, canonicalStatus) {
  if (entry.status === "pending") {
    assert(
      entry.source_sha256 === null,
      `${entry.id}: pending map cannot claim a source digest`,
    );
    return;
  }
  assert(
    await exists(entry.code_path),
    `${entry.id}: implemented code path is missing`,
  );
  const source = await readFile(absolute(entry.code_path), "utf8");
  const exportPattern = new RegExp(
    `(?:export\\s+(?:function|const|class)\\s+${entry.export_name}\\b|export\\s*\\{[^}]*\\b${entry.export_name}\\b)`,
  );
  assert(
    exportPattern.test(source),
    `${entry.id}: ${entry.code_path} does not export ${entry.export_name}`,
  );
  if (entry.artifact_type === "component") {
    assert(
      source.includes(entry.id),
      `${entry.id}: implemented source does not emit or bind its stable component ID`,
    );
    if (canonicalStatus !== undefined)
      assert(
        canonicalStatus === "implemented",
        `${entry.id}: Figma map is implemented while canonical component status is ${canonicalStatus}`,
      );
  }
  assert(
    digest(source) === entry.source_sha256,
    `${entry.id}: source digest is stale`,
  );
}

async function main() {
  const ajv = await makeAjv();
  const [
    wave,
    packetDocument,
    tokenMap,
    componentMap,
    screenMap,
    prototypeMap,
    captureManifest,
    review,
    workflowDocument,
    scenarioDocument,
    fullFixtureDocument,
    legacyFixtureDocument,
    screenDocument,
    componentDocument,
    flowDocument,
    roleDocument,
    traceDocument,
    tokenDocument,
    stateMatrixDocument,
    legacyScreenDocument,
  ] = await Promise.all([
    readJson("production-waves/wave-001.json"),
    readJson("construction-packets/packets.json"),
    readJson("figma/token-map.json"),
    readJson("figma/component-map.json"),
    readJson("figma/screen-map.json"),
    readJson("figma/prototype-map.json"),
    readJson("validation/wave-001-captures.json"),
    readJson("validation/wave-001-review.json"),
    readJson("workflow-model/workflows.json"),
    readJson("scenarios/scenarios.json"),
    readJson("data/scenario-fixtures.json"),
    readJson("data/walking-slice.json"),
    readJson("product-structure/screens.json"),
    readJson("product-structure/component-requirements.json"),
    readJson("product-structure/flows.json"),
    readJson("workflow-model/roles.json"),
    readJson("control/trace-edges.json"),
    readJson("design-system/tokens/vineyard.tokens.json"),
    readJson("product-structure/state-matrix.json"),
    readJson("screens/walking-slice.json"),
  ]);

  validateWith(
    ajv,
    "wave-manifest.schema.json",
    wave,
    "production-waves/wave-001.json",
  );
  validateWith(
    ajv,
    "construction-packet-registry.schema.json",
    packetDocument,
    "construction-packets/packets.json",
  );
  validateWith(
    ajv,
    "figma-token-map.schema.json",
    tokenMap,
    "figma/token-map.json",
  );
  componentMap.components.forEach((entry, index) =>
    validateWith(
      ajv,
      "figma-map-entry.schema.json",
      entry,
      `figma/component-map.json#/components/${index}`,
    ),
  );
  screenMap.screens.forEach((entry, index) =>
    validateWith(
      ajv,
      "figma-map-entry.schema.json",
      entry,
      `figma/screen-map.json#/screens/${index}`,
    ),
  );
  prototypeMap.prototypes.forEach((entry, index) =>
    validateWith(
      ajv,
      "figma-map-entry.schema.json",
      entry,
      `figma/prototype-map.json#/prototypes/${index}`,
    ),
  );
  validateWith(
    ajv,
    "wave-capture-manifest.schema.json",
    captureManifest,
    "validation/wave-001-captures.json",
  );
  validateWith(
    ajv,
    "wave-review.schema.json",
    review,
    "validation/wave-001-review.json",
  );

  const workflowIndex = indexById(workflowDocument.workflows, "workflow");
  const scenarioIndex = indexById(scenarioDocument.scenarios, "scenario");
  const fixtureIndex = indexById(
    [...legacyFixtureDocument.fixtures, ...fullFixtureDocument.fixtures],
    "fixture",
  );
  const screenIndex = indexById(screenDocument.screens, "screen");
  const componentIndex = indexById(componentDocument.components, "component");
  const flowIndex = indexById(flowDocument.flows, "flow");
  const roleIndex = indexById(roleDocument.roles, "role");
  const packetIndex = indexById(packetDocument.packets, "construction packet");
  const stateMatrixIndex = indexById(
    stateMatrixDocument.states,
    "state-matrix contract",
  );
  const legacyScreenIndex = indexById(
    legacyScreenDocument.screens,
    "legacy walking-slice screen",
  );

  assert(wave.id === "WAVE-001", "Wave manifest must identify WAVE-001");
  sameValues(wave.workflow_ids, ["WF-001", "WF-007"], "Wave workflows");
  sameValues(wave.screen_ids, WAVE_SCREEN_IDS, "Wave screens");
  sameValues(
    wave.public_component_ids,
    WAVE_COMPONENT_IDS,
    "Wave public components",
  );
  sameValues(wave.flow_ids, WAVE_FLOW_IDS, "Wave flows");
  sameValues(
    wave.construction_packet_ids,
    WAVE_PACKET_IDS,
    "Wave construction packets",
  );
  assertReferences(wave.workflow_ids, workflowIndex, "Wave workflow IDs");
  assertReferences(wave.screen_ids, screenIndex, "Wave screen IDs");
  assertReferences(
    wave.public_component_ids,
    componentIndex,
    "Wave component IDs",
  );
  assertReferences(wave.flow_ids, flowIndex, "Wave flow IDs");
  assertReferences(
    wave.construction_packet_ids,
    packetIndex,
    "Wave packet IDs",
  );

  const stateIndex = indexById(
    wave.state_inventory.map((state) => ({ ...state, id: state.screen_id })),
    "wave state inventory",
  );
  const stripIndex = indexById(
    wave.low_fidelity_strips.map((strip) => ({
      ...strip,
      id: strip.screen_id,
    })),
    "low-fidelity strip",
  );
  sameValues(
    stateIndex.keys(),
    WAVE_SCREEN_IDS,
    "Wave state inventory screens",
  );
  sameValues(stripIndex.keys(), WAVE_SCREEN_IDS, "Low-fidelity strip screens");
  for (const [sequence, screenId] of WAVE_SCREEN_IDS.entries()) {
    const canonical = screenIndex.get(screenId);
    const stateContract = stateIndex.get(screenId);
    const strip = stripIndex.get(screenId);
    assert(
      stateContract.route === `/screens/${screenId}`,
      `${screenId}: canonical wave route drift`,
    );
    assert(
      stateContract.platform === canonical.platform,
      `${screenId}: platform differs from product screen`,
    );
    sameValues(
      stateContract.review_states,
      EXPECTED_STATES.get(screenId),
      `${screenId} review states`,
    );
    sameValues(
      stateContract.state_sources.map((source) => source.state),
      EXPECTED_STATES.get(screenId),
      `${screenId} review state-source labels`,
    );
    for (const source of stateContract.state_sources) {
      assertReferences(
        source.state_matrix_ids,
        stateMatrixIndex,
        `${screenId}/${source.state}.state_matrix_ids`,
      );
      const contracts = source.state_matrix_ids.map((id) =>
        stateMatrixIndex.get(id),
      );
      assert(
        contracts.every(
          (contract) =>
            contract.screen_id === screenId && contract.kind === source.state,
        ),
        `${screenId}/${source.state}: state-matrix references differ from the review state`,
      );
      const operational = contracts.filter(
        (contract) => contract.source_ref.type === "operational",
      );
      if (source.evidence_status === "fixture_realized") {
        assert(
          operational.length > 0,
          `${screenId}/${source.state}: fixture-realized label has no operational state contract`,
        );
        for (const contract of operational) {
          assert(
            contract.source_ref.scenario_id &&
              contract.source_ref.fixture_id &&
              contract.source_ref.event_id,
            `${contract.id}: operational source requires scenario, fixture, and event`,
          );
          assert(
            fixtureIndex.has(contract.source_ref.fixture_id),
            `${contract.id}: operational fixture does not resolve`,
          );
        }
      } else {
        assert(
          contracts.every(
            (contract) =>
              ["canonical", "ui"].includes(contract.source_ref.type) &&
              contract.source_ref.scenario_id === null &&
              contract.source_ref.fixture_id === null &&
              contract.source_ref.event_id === null &&
              /does not realize|model-only|canonical branch|product-system presentation|workflow terminal/i.test(
                contract.source_ref.rationale,
              ),
          ),
          `${screenId}/${source.state}: model-only state must be an explicit canonical or UI projection with no fabricated fixture evidence`,
        );
      }
    }
    for (const canonicalState of canonical.states)
      assert(
        stateMatrixDocument.states.some(
          (contract) =>
            contract.screen_id === screenId &&
            contract.kind === canonicalState.id,
        ),
        `${screenId}/${canonicalState.id}: canonical product state lacks a state-matrix contract`,
      );
    sameValues(
      stateContract.fixture_ids,
      canonical.fixture_ids,
      `${screenId} fixture allocation`,
    );
    assertReferences(
      stateContract.fixture_ids,
      fixtureIndex,
      `${screenId}.fixture_ids`,
    );
    assert(
      strip.sequence === sequence + 1,
      `${screenId}: low-fidelity sequence is not canonical`,
    );
    assert(
      strip.platform === canonical.platform,
      `${screenId}: strip platform differs from product screen`,
    );
    assert(
      strip.responsibility === canonical.purpose,
      `${screenId}: strip responsibility differs from product screen`,
    );
    sameValues(
      strip.state_slots,
      EXPECTED_STATES.get(screenId),
      `${screenId} strip state slots`,
    );
    unique(
      strip.ordered_regions.map((region) => region.id),
      `${screenId} strip region IDs`,
    );
    const stripComponents = strip.ordered_regions.flatMap(
      (region) => region.component_ids,
    );
    unique(stripComponents, `${screenId} strip components`);
    sameValues(
      stripComponents,
      canonical.component_ids,
      `${screenId} strip component allocation`,
    );
  }
  assert(
    wave.state_inventory.reduce(
      (total, screen) => total + screen.review_states.length,
      0,
    ) === 64,
    "Wave manifest must contain exactly 64 review states",
  );

  sameValues(
    packetIndex.keys(),
    ["PKT-001", ...WAVE_PACKET_IDS],
    "Construction packet registry",
  );
  const legacyPacket = (
    await readJson("construction-packets/walking-slice.json")
  ).packets[0];
  assert(
    JSON.stringify(packetIndex.get("PKT-001")) === JSON.stringify(legacyPacket),
    "PKT-001 differs from the preserved walking-slice packet",
  );
  const traceSemantics = new Set(
    traceDocument.edges.map(
      (edge) => `${edge.relationship}:${edge.from}:${edge.to}`,
    ),
  );
  for (const packet of packetDocument.packets) {
    sameValues(
      packet.screen_ids,
      EXPECTED_PACKET_SCREENS.get(packet.id),
      `${packet.id} screen allocation`,
    );
    assertReferences(
      packet.workflow_ids,
      workflowIndex,
      `${packet.id}.workflow_ids`,
    );
    assertReferences(
      packet.scenario_ids,
      scenarioIndex,
      `${packet.id}.scenario_ids`,
    );
    assertReferences(
      packet.fixture_ids,
      fixtureIndex,
      `${packet.id}.fixture_ids`,
    );
    assertReferences(packet.screen_ids, screenIndex, `${packet.id}.screen_ids`);
    assertReferences(
      packet.component_ids,
      componentIndex,
      `${packet.id}.component_ids`,
    );
    assertReferences(packet.roles, roleIndex, `${packet.id}.roles`);
    const packetActions = new Set(
      packet.screen_ids.flatMap((screenId) =>
        (packet.id === "PKT-001"
          ? legacyScreenIndex.get(screenId)
          : screenIndex.get(screenId)
        ).actions.map((action) => action.id),
      ),
    );
    for (const interaction of packet.interaction_contract)
      assert(
        packetActions.has(interaction.action_id),
        `${packet.id}: interaction ${interaction.action_id} is outside the packet screens`,
      );
    for (const screenId of packet.screen_ids)
      assert(
        traceSemantics.has(`documented_in:${screenId}:${packet.id}`),
        `${packet.id}: missing direct screen-to-packet trace ${screenId}`,
      );
  }
  sameValues(
    unique(
      WAVE_PACKET_IDS.flatMap(
        (packetId) => packetIndex.get(packetId).screen_ids,
      ),
    ),
    WAVE_SCREEN_IDS,
    "Wave packet screen coverage",
  );

  assert(
    tokenMap.status === "implemented",
    "Figma token map must describe the implemented Canopy Signal source",
  );
  assert(
    await Promise.all(
      tokenMap.source_paths.map((sourcePath) => exists(sourcePath)),
    ).then((results) => results.every(Boolean)),
    "Figma token map source path is missing",
  );
  assert(
    (await digestPaths(tokenMap.source_paths)) === tokenMap.source_digest,
    "Figma token map source digest is stale",
  );
  const canonicalTokens = collectTokens(tokenDocument, undefined);
  const canonicalTokenIndex = new Map(
    canonicalTokens.map((token) => [token.token_path, token]),
  );
  unique(
    tokenMap.tokens.map((token) => token.token_path),
    "Figma token paths",
  );
  sameValues(
    tokenMap.tokens.map((token) => token.token_path),
    canonicalTokenIndex.keys(),
    "Figma token coverage",
  );
  for (const token of tokenMap.tokens) {
    assert(
      token.figma_variable === token.token_path.replaceAll(".", "/"),
      `${token.token_path}: Figma variable path drift`,
    );
    assert(
      token.type === canonicalTokenIndex.get(token.token_path).type,
      `${token.token_path}: Figma type drift`,
    );
  }

  assert(
    componentMap.schema_version === "1.0" &&
      componentMap.map_type === "components",
    "Invalid Figma component map envelope",
  );
  const figmaComponentIndex = indexById(
    componentMap.components,
    "Figma component",
  );
  sameValues(
    figmaComponentIndex.keys(),
    WAVE_COMPONENT_IDS,
    "Figma component map coverage",
  );
  for (const componentId of WAVE_COMPONENT_IDS) {
    const canonical = componentIndex.get(componentId);
    const entry = figmaComponentIndex.get(componentId);
    assert(
      entry.artifact_type === "component",
      `${componentId}: wrong Figma artifact type`,
    );
    assert(
      entry.figma_key === canonical.figma_key,
      `${componentId}: Figma key differs from canonical component`,
    );
    sameValues(
      entry.screen_ids,
      canonical.screen_ids.filter((screenId) =>
        WAVE_SCREEN_IDS.includes(screenId),
      ),
      `${componentId} Figma screen support`,
    );
    await validateImplementationEntry(entry, canonical.status);
  }

  assert(
    screenMap.schema_version === "1.0" && screenMap.map_type === "screens",
    "Invalid Figma screen map envelope",
  );
  const figmaScreenIndex = indexById(screenMap.screens, "Figma screen");
  sameValues(
    figmaScreenIndex.keys(),
    WAVE_SCREEN_IDS,
    "Figma screen map coverage",
  );
  for (const screenId of WAVE_SCREEN_IDS) {
    const entry = figmaScreenIndex.get(screenId);
    assert(
      entry.artifact_type === "screen",
      `${screenId}: wrong Figma artifact type`,
    );
    assert(
      entry.route === `/screens/${screenId}`,
      `${screenId}: Figma route drift`,
    );
    sameValues(
      entry.states,
      EXPECTED_STATES.get(screenId),
      `${screenId} Figma states`,
    );
    await validateImplementationEntry(entry);
  }

  assert(
    prototypeMap.schema_version === "1.0" &&
      prototypeMap.map_type === "prototypes",
    "Invalid Figma prototype map envelope",
  );
  const figmaPrototypeIndex = indexById(
    prototypeMap.prototypes,
    "Figma prototype",
  );
  sameValues(
    figmaPrototypeIndex.keys(),
    WAVE_FLOW_IDS,
    "Figma prototype map coverage",
  );
  for (const flowId of WAVE_FLOW_IDS) {
    const entry = figmaPrototypeIndex.get(flowId);
    const canonical = flowIndex.get(flowId);
    assert(
      entry.artifact_type === "prototype",
      `${flowId}: wrong Figma artifact type`,
    );
    assert(
      entry.route === `/prototypes/${flowId}`,
      `${flowId}: prototype route drift`,
    );
    sameValues(
      entry.screen_ids,
      canonical.screen_ids,
      `${flowId} sequence screen references`,
    );
    assertReferences(entry.screen_ids, screenIndex, `${flowId}.screen_ids`);
    await validateImplementationEntry(entry);
  }

  assert(
    captureManifest.wave_id === "WAVE-001",
    "Capture manifest must identify WAVE-001",
  );
  assert(
    captureManifest.captures.length === 22,
    "Capture manifest must contain exactly 22 primary captures",
  );
  unique(
    captureManifest.captures.map((capture) => capture.id),
    "Wave capture IDs",
  );
  unique(
    captureManifest.captures.map(
      (capture) => `${capture.screen_id}:${capture.viewport.name}`,
    ),
    "Wave capture screen/viewports",
  );
  const expectedViewportCounts = new Map(
    WAVE_SCREEN_IDS.map((screenId) => [
      screenId,
      screenIndex.get(screenId).platform === "responsive" ? 2 : 1,
    ]),
  );
  for (const screenId of WAVE_SCREEN_IDS)
    assert(
      captureManifest.captures.filter(
        (capture) => capture.screen_id === screenId,
      ).length === expectedViewportCounts.get(screenId),
      `${screenId}: wrong primary capture count`,
    );
  const sourcePathsPresent = (
    await Promise.all(
      captureManifest.source_paths.map((sourcePath) => exists(sourcePath)),
    )
  ).every(Boolean);
  const currentSourceDigest = sourcePathsPresent
    ? await digestPaths(captureManifest.source_paths)
    : null;
  const listedArtifacts = new Set();
  for (const capture of captureManifest.captures) {
    const screen = screenIndex.get(capture.screen_id);
    assert(
      Boolean(screen),
      `${capture.id}: unknown screen ${capture.screen_id}`,
    );
    assert(
      EXPECTED_STATES.get(capture.screen_id).includes(capture.state),
      `${capture.id}: state is outside screen contract`,
    );
    assert(
      screen.fixture_ids.includes(capture.fixture_id),
      `${capture.id}: fixture is outside screen contract`,
    );
    assert(
      capture.route ===
        `/screens/${capture.screen_id}?state=${capture.state}&fixture=${capture.fixture_id}`,
      `${capture.id}: capture URL is not stable`,
    );
    if (capture.status === "pending") continue;
    assert(
      sourcePathsPresent,
      `${capture.id}: currentness source path is missing`,
    );
    assert(
      capture.source_digest === currentSourceDigest,
      `${capture.id}: capture source digest is stale`,
    );
    assert(
      await exists(capture.artifact_path),
      `${capture.id}: PNG is missing`,
    );
    assert(
      await exists(capture.metadata_path),
      `${capture.id}: metadata is missing`,
    );
    const artifact = await readFile(absolute(capture.artifact_path));
    assert(
      digest(artifact) === capture.artifact_sha256,
      `${capture.id}: PNG digest is stale`,
    );
    const metadata = await readJson(capture.metadata_path);
    for (const field of [
      "id",
      "screen_id",
      "route",
      "state",
      "fixture_id",
      "source_digest",
      "generated_at",
      "commit_sha",
    ])
      assert(
        metadata[field] === capture[field],
        `${capture.id}: metadata ${field} differs from manifest`,
      );
    assert(
      metadata.viewport?.width === capture.viewport.width &&
        metadata.viewport?.height === capture.viewport.height,
      `${capture.id}: metadata viewport differs from manifest`,
    );
    assert(
      Number.isFinite(metadata.geometry?.scroll_height) &&
        Number.isFinite(metadata.geometry?.viewport_height),
      `${capture.id}: metadata lacks scroll geometry`,
    );
    listedArtifacts.add(capture.artifact_path);
    listedArtifacts.add(capture.metadata_path);
  }
  const primaryDirectory = "validation/wave-001-renders/primary";
  if (await exists(primaryDirectory)) {
    const actualPrimaryFiles = (await readdir(absolute(primaryDirectory)))
      .filter(
        (fileName) =>
          fileName.endsWith(".png") || fileName.endsWith(".capture.json"),
      )
      .map((fileName) => `${primaryDirectory}/${fileName}`);
    sameValues(
      actualPrimaryFiles,
      listedArtifacts,
      "Primary capture directory currentness",
    );
  }

  sameValues(
    review.critics.map((critic) => critic.discipline),
    ["operational_ux", "visual_component_accessibility"],
    "Wave review disciplines",
  );
  unique(
    review.findings.map((finding) => finding.id),
    "Wave review findings",
  );
  if (review.status === "passed") {
    assert(
      review.critics.every(
        (critic) =>
          critic.status === "passed" && critic.reviewer && critic.completed_at,
      ),
      "Passed wave review requires two attributed passed critics",
    );
    assert(
      review.acceptance.status === "passed" &&
        review.acceptance.accepted_by &&
        review.acceptance.accepted_at,
      "Passed wave review requires attributed acceptance",
    );
    assert(
      review.findings.every(
        (finding) => finding.status === "resolved" || finding.severity === "P3",
      ),
      "Passed wave review has unresolved P0/P1/P2 findings",
    );
  }

  const implementationMaps = [
    ...componentMap.components,
    ...screenMap.screens,
    ...prototypeMap.prototypes,
  ];
  const shouldBeComplete = requireComplete || wave.status === "complete";
  if (shouldBeComplete) {
    assert(
      wave.status === "complete",
      "Complete validation requires wave status complete",
    );
    assert(
      componentDocument.components
        .filter((component) => WAVE_COMPONENT_IDS.includes(component.id))
        .every((component) => component.status === "implemented"),
      "Complete validation requires every canonical public component status implemented",
    );
    assert(
      implementationMaps.every((entry) => entry.status === "implemented"),
      "Complete validation requires every Figma code/export map implemented",
    );
    assert(
      captureManifest.captures.every(
        (capture) => capture.status === "complete",
      ),
      "Complete validation requires all 22 primary captures current",
    );
    assert(
      review.status === "passed",
      "Complete validation requires passed independent review",
    );
    const appSource = await readFile(absolute("atlas/src/App.tsx"), "utf8");
    assert(
      appSource.includes("/screens/:screenId"),
      "Complete validation requires the canonical screen route in App.tsx",
    );
    assert(
      appSource.includes("/prototypes/:flowId"),
      "Complete validation requires the canonical prototype route in App.tsx",
    );
  } else {
    assert(
      wave.status !== "complete",
      "Contract validation cannot silently accept a complete wave without complete evidence",
    );
  }

  console.log(
    `✓ WAVE-001: ${wave.screen_ids.length} screens, ${wave.public_component_ids.length} components, 64 review states, ${wave.low_fidelity_strips.length} low-fidelity strips, ${packetDocument.packets.length} packets, ${tokenMap.tokens.length} tokens, ${captureManifest.captures.length} primary captures (${captureManifest.captures.filter((capture) => capture.status === "complete").length} complete), ${assertions} assertions${requireComplete ? "; complete mode" : ""}`,
  );
}

main().catch((error) => {
  console.error(`✗ WAVE-001 validation failed: ${error.message}`);
  process.exitCode = 1;
});
