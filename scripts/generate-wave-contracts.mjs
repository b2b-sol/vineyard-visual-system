import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import prettier from "prettier";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");
const readJson = async (relativePath) =>
  JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
const exists = async (relativePath) =>
  access(path.join(ROOT, relativePath)).then(
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
    hash.update(await readFile(path.join(ROOT, relativePath)));
    hash.update("\0");
  }
  return hash.digest("hex");
};
const unique = (values) => [...new Set(values)];
const byId = (items) => new Map(items.map((item) => [item.id, item]));
const titleCase = (value) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const exportName = (name) =>
  name
    .replace(/[^A-Za-z0-9]+(.)/g, (_, letter) => letter.toUpperCase())
    .replace(/^[a-z]/, (letter) => letter.toUpperCase())
    .replaceAll("-", "");

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
const REVIEW_STATES = new Map([
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
const PRIMARY_FIXTURES = new Map([
  ["SCR-001", "FIX-006"],
  ["SCR-002", "FIX-006"],
  ["SCR-003", "FIX-006"],
  ["SCR-004", "FIX-053"],
  ["SCR-005", "FIX-002"],
  ["SCR-006", "FIX-053"],
  ["SCR-039", "FIX-032"],
  ["SCR-040", "FIX-033"],
  ["SCR-041", "FIX-033"],
  ["SCR-042", "FIX-033"],
  ["SCR-043", "FIX-033"],
  ["SCR-044", "FIX-032"],
  ["SCR-045", "FIX-033"],
]);

const [
  screenDocument,
  componentDocument,
  flowDocument,
  stateMatrixDocument,
  legacyPacketDocument,
  tokenDocument,
] = await Promise.all([
  readJson("product-structure/screens.json"),
  readJson("product-structure/component-requirements.json"),
  readJson("product-structure/flows.json"),
  readJson("product-structure/state-matrix.json"),
  readJson("construction-packets/walking-slice.json"),
  readJson("design-system/tokens/vineyard.tokens.json"),
]);
const screenIndex = byId(screenDocument.screens);
const componentIndex = byId(componentDocument.components);
const flowIndex = byId(flowDocument.flows);
const waveScreens = WAVE_SCREEN_IDS.map((id) => screenIndex.get(id));

function stateSourcesFor(screenId) {
  return REVIEW_STATES.get(screenId).map((state) => {
    const contracts = stateMatrixDocument.states.filter(
      (contract) => contract.screen_id === screenId && contract.kind === state,
    );
    if (contracts.length === 0)
      throw new Error(
        `${screenId}/${state}: review state requires an explicit fixture-realized or canonical-branch state-matrix contract`,
      );
    return {
      state,
      evidence_status: contracts.some(
        (contract) => contract.source_ref.type === "operational",
      )
        ? "fixture_realized"
        : "model_only",
      state_matrix_ids: contracts.map((contract) => contract.id),
    };
  });
}

function recordsForScreens(screenIds, field) {
  return unique(screenIds.flatMap((id) => screenIndex.get(id)[field]));
}

function makePacket({
  id,
  title,
  purpose,
  screenIds,
  initial,
  exception,
  recovery,
  terminal,
  testBase,
}) {
  const screens = screenIds.map((screenId) => screenIndex.get(screenId));
  const actions = screens.flatMap((screen) => screen.actions);
  const roles = unique(
    screens.flatMap((screen) => [
      ...screen.primary_role_ids,
      ...screen.review_role_ids,
    ]),
  );
  const states = unique(
    screens.flatMap((screen) => screen.states.map((state) => state.id)),
  );
  return {
    id,
    title,
    purpose,
    workflow_ids: recordsForScreens(screenIds, "workflow_ids"),
    scenario_ids: recordsForScreens(screenIds, "scenario_ids"),
    fixture_ids: recordsForScreens(screenIds, "fixture_ids"),
    screen_ids: screenIds,
    component_ids: recordsForScreens(screenIds, "component_ids"),
    roles,
    preconditions: [
      "Every operational record resolves through stable organization, property, block, and person identifiers.",
      "Consequential actions use current default-deny permission, transition, notification, and sync contracts.",
      "Accepted history is append-only; corrections and supersessions retain reciprocal predecessor and successor lineage.",
      "Fixture, scenario, state, actor, record, and event identifiers remain visible at review boundaries.",
    ],
    state_contract: {
      initial,
      exception,
      recovery,
      terminal,
      history_policy:
        "Append attributable events and reciprocal correction or supersession lineage; never overwrite an accepted observation, assignment, execution, completion, time, payroll, or allocation fact.",
    },
    permission_contract: roles.map((roleId) => {
      const allowed = unique(
        actions
          .filter((action) =>
            action.permission?.allowed_role_ids?.includes(roleId),
          )
          .map((action) => action.label),
      );
      return {
        role_id: roleId,
        may:
          allowed.length > 0
            ? allowed
            : [
                "Inspect attributable records and workflow history within assigned scope",
              ],
        may_not: [
          "Exercise an action without an explicit permission rule and matching scope",
          "Erase accepted history or act as another person",
        ],
      };
    }),
    data_contract: {
      required_entities: [
        "organization",
        "person_and_assignment",
        "stable_block_identity",
        "workflow_instance",
        "state_event",
        "record_instance",
        "exception_history",
      ],
      stable_identifiers: [
        "organization.id",
        "person.id",
        "role_assignment.id",
        "block.stable_identity",
        "workflow_instance.id",
        "event.id",
        "record_instance.id",
      ],
      audit_fields: [
        "event.occurred_at",
        "event.actor_person_id",
        "event.role_assignment_id",
        "event.transition_id",
        "event.reason",
        "event.connectivity",
      ],
    },
    interaction_contract: actions.map((action) => ({
      action_id: action.id,
      precondition:
        action.kind === "inspect"
          ? "The actor can view the exact record and organization scope."
          : `The actor satisfies ${action.permission_rule_ids.join(", ")} and the current state is ${action.transition.from ?? "entry"}.`,
      result:
        action.kind === "inspect"
          ? "The attributable current record and immutable history are visible."
          : `The workflow advances through ${action.transition.transition_id} to ${action.transition.to}.`,
      audit_event:
        action.kind === "inspect"
          ? "No workflow state mutation; preserve the inspected record identity."
          : `Append ${action.audit.event_kind} with actor, assignment, timestamp, reason policy, record snapshot, and idempotency key.`,
    })),
    copy_contract: {
      status_labels: Object.fromEntries(
        states.map((state) => [state, titleCase(state)]),
      ),
      error_messages: [
        "This action is unavailable because current authority or scope does not match the record.",
        "The record changed elsewhere; review the newer event before retrying.",
        "Required evidence is incomplete. Accepted facts remain unchanged.",
        "Offline work is queued with its original actor and capture time; no server fact was overwritten.",
      ],
    },
    dependencies: [
      "Canonical product registries under product-structure/",
      "Connected synthetic operation, events, records, and scenario fixtures under data/",
      "Canopy Signal DTCG tokens and generated CSS",
      "Default-deny permission, notification, and synchronization registries",
      "Wave-001 screen, component, capture, review, and Figma manifests",
    ],
    acceptance_criteria: [
      `Every ${screenIds.join(", ")} route resolves its canonical scenario, fixture, state, action, permission, transition, event, and record identifiers.`,
      "Normal, urgent, blocked, partial, corrected, historical, offline, stale, conflict, loading, empty, error, and completion states appear where allocated by the wave contract.",
      "Every consequential action is default-deny, names its disabled reason, and appends rather than rewrites accepted history.",
      "Desktop and field surfaces preserve the same stable identity, state, accountable owner, effective time, and lineage.",
      "Keyboard, focus, target-size, live-region, non-color, reduced-motion, overflow, print, and axe checks pass for the packet scope.",
      `Direct screen-to-packet trace edges resolve every ${id} screen without relying on an unrelated component edge.`,
    ],
    test_cases: [
      {
        id: `TEST-${testBase + 1}`,
        category: "normal",
        assertion:
          "The primary fixture advances only through canonical transitions with exact actor and event attribution.",
      },
      {
        id: `TEST-${testBase + 2}`,
        category: "exception",
        assertion:
          "Blocked or urgent work preserves accepted evidence, affected scope, owner, clock, and bounded recovery.",
      },
      {
        id: `TEST-${testBase + 3}`,
        category: "recovery",
        assertion:
          "Recovery appends a new event and retains the original exception, partial fact, or predecessor record.",
      },
      {
        id: `TEST-${testBase + 4}`,
        category: "permission",
        assertion:
          "An actor without an explicit matching permission rule sees a disabled action and cannot mutate state.",
      },
      {
        id: `TEST-${testBase + 5}`,
        category: "accessibility",
        assertion:
          "State, urgency, disabled reason, progress, and lineage remain understandable without color or pointer input.",
      },
      {
        id: `TEST-${testBase + 6}`,
        category: "responsive",
        assertion:
          "Canonical desktop, mobile, 200-percent-equivalent reflow, and print targets preserve operational meaning without page overflow.",
      },
      {
        id: `TEST-${testBase + 7}`,
        category: "data",
        assertion:
          "Rendered values resolve to connected fixture events and records rather than disconnected sample copy.",
      },
    ],
    figma_mapping: {
      frame_name: `${id} · ${title}`,
      component_names: recordsForScreens(screenIds, "component_ids").map(
        (componentId) => componentIndex.get(componentId).figma_key,
      ),
      stable_node_key: `figma-ready:${id}:${screenIds.join("+")}`,
    },
  };
}

const packetDocument = {
  schema_version: "1.0",
  packets: [
    legacyPacketDocument.packets[0],
    makePacket({
      id: "PKT-002",
      title: "Seasonal plan, dispatch, field execution, and verification",
      purpose:
        "Specify the complete responsive and field execution package from a daily operational brief through approved seasonal work, dispatch, acknowledgement, completion, correction, verification, and immutable history.",
      screenIds: WAVE_SCREEN_IDS.slice(0, 6),
      initial: "observed",
      exception: "blocked",
      recovery: "assigned",
      terminal: "verified",
      testBase: 100,
    }),
    makePacket({
      id: "PKT-003",
      title: "Crew demand, schedule, check-in, and field workboard",
      purpose:
        "Specify a connected labor planning and field package from demand and crew scheduling through attributable check-in, briefing, heat or safety pause, rebriefing, work resumption, and completion evidence.",
      screenIds: WAVE_SCREEN_IDS.slice(6, 10),
      initial: "crew_scheduled",
      exception: "paused",
      recovery: "rebriefed",
      terminal: "work_completed",
      testBase: 200,
    }),
    makePacket({
      id: "PKT-004",
      title: "Time review, payroll exception, and cost allocation",
      purpose:
        "Specify supervisory review of attributable crew time, append-only payroll correction, cross-organization authority, and final cost allocation without flattening the connected field-work evidence.",
      screenIds: WAVE_SCREEN_IDS.slice(10),
      initial: "time_submitted",
      exception: "payroll_exception",
      recovery: "corrected",
      terminal: "cost_allocated",
      testBase: 300,
    }),
  ],
};

const regionDefinitions = [
  ["context", new Set(["navigation"])],
  ["identity", new Set(["identity", "input"])],
  ["decision", new Set(["decision", "data_visualization"])],
  ["workflow", new Set(["workflow"])],
  [
    "continuity",
    new Set(["record", "status", "exception", "sync", "feedback"]),
  ],
];
const lowFidelityStrips = waveScreens.map((screen, screenIndexValue) => ({
  screen_id: screen.id,
  sequence: screenIndexValue + 1,
  platform: screen.platform,
  responsibility: screen.purpose,
  ordered_regions: regionDefinitions
    .map(([kind, categories], regionIndex) => ({
      id: `REG-${String(regionIndex + 1).padStart(2, "0")}`,
      kind,
      responsibility:
        kind === "context"
          ? "Orient the actor to current work and navigation."
          : kind === "identity"
            ? "Keep stable scope, actor, and effective time explicit."
            : kind === "decision"
              ? "Present the evidence needed for the primary decision."
              : kind === "workflow"
                ? "Expose accountable state and permitted next actions."
                : "Preserve status, exception, sync, notification, and record lineage.",
      component_ids: screen.component_ids.filter((componentId) =>
        categories.has(componentIndex.get(componentId).category),
      ),
    }))
    .filter((region) => region.component_ids.length > 0),
  state_slots: REVIEW_STATES.get(screen.id),
}));

function collectTokens(node, inheritedType, segments = [], tokens = []) {
  if (!node || typeof node !== "object" || Array.isArray(node)) return tokens;
  const type = node.$type ?? inheritedType;
  if (Object.hasOwn(node, "$value")) {
    tokens.push({
      token_path: segments.join("."),
      figma_variable: segments.join("/"),
      collection: "Vineyard Foundations",
      type,
    });
    return tokens;
  }
  for (const [key, value] of Object.entries(node))
    if (!key.startsWith("$"))
      collectTokens(value, type, [...segments, key], tokens);
  return tokens;
}
const tokenSourcePaths = [
  "design-system/tokens/vineyard.tokens.json",
  "design-system/tokens/vineyard.css",
];
const tokenMap = {
  schema_version: "1.0",
  map_type: "tokens",
  status: "implemented",
  collection: "Vineyard Foundations",
  source_paths: tokenSourcePaths,
  source_digest: await digestPaths(tokenSourcePaths),
  tokens: collectTokens(tokenDocument, undefined),
};

async function implementationStatus(
  codePath,
  expectedExport,
  contractId,
  canonicalStatus,
) {
  if (canonicalStatus && canonicalStatus !== "implemented")
    return { status: "pending", source_sha256: null };
  if (!(await exists(codePath)))
    return { status: "pending", source_sha256: null };
  const contents = await readFile(path.join(ROOT, codePath), "utf8");
  const exportPattern = new RegExp(
    `(?:export\\s+(?:function|const|class)\\s+${expectedExport}\\b|export\\s*\\{[^}]*\\b${expectedExport}\\b)`,
  );
  return exportPattern.test(contents) &&
    (!contractId || contents.includes(contractId))
    ? { status: "implemented", source_sha256: digest(contents) }
    : { status: "pending", source_sha256: null };
}

const componentEntries = [];
const componentExportNames = new Map([
  ["CMP-001", "WorkOrderQueue"],
  ["CMP-002", "OperationalAppShell"],
  ["CMP-003", "RoleScopeSwitcher"],
  ["CMP-004", "BlockIdentityChip"],
  ["CMP-005", "RecordProvenancePanel"],
  ["CMP-006", "WorkflowStateRail"],
  ["CMP-007", "TransitionActionBar"],
  ["CMP-008", "DecisionEvidencePanel"],
  ["CMP-009", "MissingInformationCallout"],
  ["CMP-010", "ExceptionCard"],
  ["CMP-011", "RecoveryChecklist"],
  ["CMP-012", "PartialScopeMeter"],
  ["CMP-013", "CorrectionLineage"],
  ["CMP-014", "AuditTimeline"],
  ["CMP-015", "OfflineQueueIndicator"],
  ["CMP-016", "SyncConflictResolver"],
  ["CMP-017", "StalenessBadge"],
  ["CMP-018", "NotificationCenter"],
  ["CMP-019", "EscalationClock"],
  ["CMP-020", "AssignmentRoster"],
  ["CMP-021", "BlockRowSelector"],
  ["CMP-022", "EffectiveTimeControl"],
  ["CMP-026", "MapScopeViewer"],
  ["CMP-033", "ApprovalChain"],
  ["CMP-034", "ReconciliationComparison"],
  ["CMP-035", "ExportEvidencePacket"],
  ["CMP-036", "AccessibleStatusLegend"],
]);
for (const componentId of WAVE_COMPONENT_IDS) {
  const component = componentIndex.get(componentId);
  const name =
    componentExportNames.get(component.id) ?? exportName(component.name);
  const codePath = "atlas/src/components/production/PublicComponents.tsx";
  componentEntries.push({
    artifact_type: "component",
    id: component.id,
    figma_name: component.figma_key.split("/").map(titleCase).join("/"),
    stable_key: `figma-ready:${component.id}`,
    code_path: codePath,
    export_name: name,
    ...(await implementationStatus(
      codePath,
      name,
      component.id,
      component.status,
    )),
    figma_key: component.figma_key,
    screen_ids: component.screen_ids.filter((screenId) =>
      WAVE_SCREEN_IDS.includes(screenId),
    ),
  });
}
const componentMap = {
  schema_version: "1.0",
  map_type: "components",
  components: componentEntries,
};

const screenImplementation = await implementationStatus(
  "atlas/src/pages/ProductionScreenPage.tsx",
  "ProductionScreenPage",
);
const screenMap = {
  schema_version: "1.0",
  map_type: "screens",
  screens: waveScreens.map((screen) => ({
    artifact_type: "screen",
    id: screen.id,
    figma_name: `${screen.id} · ${screen.name} · ${screen.platform}`,
    stable_key: `figma-ready:${screen.id}`,
    code_path: "atlas/src/pages/ProductionScreenPage.tsx",
    export_name: "ProductionScreenPage",
    ...screenImplementation,
    route: `/screens/${screen.id}`,
    states: REVIEW_STATES.get(screen.id),
  })),
};
const prototypeImplementation = await implementationStatus(
  "atlas/src/pages/PrototypePage.tsx",
  "PrototypePage",
);
const prototypeMap = {
  schema_version: "1.0",
  map_type: "prototypes",
  prototypes: WAVE_FLOW_IDS.map((flowId) => {
    const flow = flowIndex.get(flowId);
    return {
      artifact_type: "prototype",
      id: flow.id,
      figma_name: `${flow.id} · ${flow.title}`,
      stable_key: `figma-ready:${flow.id}`,
      code_path: "atlas/src/pages/PrototypePage.tsx",
      export_name: "PrototypePage",
      ...prototypeImplementation,
      route: `/prototypes/${flow.id}`,
      screen_ids: flow.screen_ids,
      sequence_source: "product-structure/flows.json",
    };
  }),
};

const captureSourcePaths = [
  "scripts/generate-wave-contracts.mjs",
  "product-structure/screens.json",
  "product-structure/component-requirements.json",
  "product-structure/flows.json",
  "product-structure/notifications.json",
  "product-structure/permissions.json",
  "product-structure/state-matrix.json",
  "product-structure/sync-model.json",
  "data/scenario-fixtures.json",
  "data/events.json",
  "data/operation.json",
  "scenarios/scenarios.json",
  "workflow-model/decisions.json",
  "workflow-model/records.json",
  "design-system/tokens/vineyard.tokens.json",
  "atlas/src/App.tsx",
  "atlas/src/styles.css",
  "atlas/src/components/production/PublicComponents.tsx",
  "atlas/src/components/production/types.ts",
  "atlas/src/data/canonical.ts",
  "atlas/src/data/screenViewModel.ts",
  "atlas/src/data/wave001.ts",
  "atlas/src/pages/ProductionScreenPage.tsx",
  "atlas/src/pages/PrototypePage.tsx",
];
const captureSpecs = [];
for (const screen of waveScreens) {
  const viewports =
    screen.platform === "responsive"
      ? [
          { name: "desktop", width: 1440, height: 1024 },
          { name: "mobile", width: 390, height: 844 },
        ]
      : screen.platform === "mobile"
        ? [{ name: "mobile", width: 390, height: 844 }]
        : [{ name: "desktop", width: 1440, height: 1024 }];
  for (const viewport of viewports) captureSpecs.push({ screen, viewport });
}
const captureSourcesPresent = (
  await Promise.all(captureSourcePaths.map((sourcePath) => exists(sourcePath)))
).every(Boolean);
const currentCaptureDigest = captureSourcesPresent
  ? await digestPaths(captureSourcePaths)
  : null;
const captures = [];
for (const [index, { screen, viewport }] of captureSpecs.entries()) {
  const id = `CAP-W001-${String(index + 1).padStart(3, "0")}`;
  const basePath = `validation/wave-001-renders/primary/${id.toLowerCase()}`;
  const artifactPath = `${basePath}.png`;
  const metadataPath = `${basePath}.capture.json`;
  const metadataPresent = await exists(metadataPath);
  const metadata = metadataPresent ? await readJson(metadataPath) : null;
  const complete =
    (await exists(artifactPath)) &&
    metadataPresent &&
    currentCaptureDigest &&
    metadata.source_digest === currentCaptureDigest &&
    metadata.id === id &&
    metadata.screen_id === screen.id &&
    metadata.route ===
      `/screens/${screen.id}?state=normal&fixture=${PRIMARY_FIXTURES.get(screen.id)}` &&
    metadata.viewport?.width === viewport.width &&
    metadata.viewport?.height === viewport.height;
  if (complete) {
    const artifact = await readFile(path.join(ROOT, artifactPath));
    captures.push({
      id,
      screen_id: screen.id,
      route: `/screens/${screen.id}?state=normal&fixture=${PRIMARY_FIXTURES.get(screen.id)}`,
      state: "normal",
      fixture_id: PRIMARY_FIXTURES.get(screen.id),
      viewport,
      status: "complete",
      artifact_path: artifactPath,
      metadata_path: metadataPath,
      artifact_sha256: digest(artifact),
      source_digest: metadata.source_digest,
      generated_at: metadata.generated_at,
      commit_sha: metadata.commit_sha,
    });
  } else {
    captures.push({
      id,
      screen_id: screen.id,
      route: `/screens/${screen.id}?state=normal&fixture=${PRIMARY_FIXTURES.get(screen.id)}`,
      state: "normal",
      fixture_id: PRIMARY_FIXTURES.get(screen.id),
      viewport,
      status: "pending",
      artifact_path: null,
      metadata_path: null,
      artifact_sha256: null,
      source_digest: null,
      generated_at: null,
      commit_sha: null,
    });
  }
}
const captureManifest = {
  schema_version: "1.0",
  wave_id: "WAVE-001",
  source_paths: captureSourcePaths,
  captures,
};

const review = (await exists("validation/wave-001-review.json"))
  ? await readJson("validation/wave-001-review.json")
  : null;
const implementationComplete = [
  ...componentMap.components,
  ...screenMap.screens,
  ...prototypeMap.prototypes,
].every((entry) => entry.status === "implemented");
const capturesComplete = captures.every(
  (capture) => capture.status === "complete",
);
const waveStatus =
  implementationComplete && capturesComplete && review?.status === "passed"
    ? "complete"
    : implementationComplete && capturesComplete
      ? "review"
      : implementationComplete
        ? "implementation_ready"
        : "contract_ready";
const waveManifest = {
  schema_version: "1.0",
  id: "WAVE-001",
  title: "Seasonal work and labor-to-cost operations",
  status: waveStatus,
  workflow_ids: ["WF-001", "WF-007"],
  screen_ids: WAVE_SCREEN_IDS,
  public_component_ids: WAVE_COMPONENT_IDS,
  flow_ids: WAVE_FLOW_IDS,
  construction_packet_ids: ["PKT-002", "PKT-003", "PKT-004"],
  state_inventory: waveScreens.map((screen) => ({
    screen_id: screen.id,
    route: `/screens/${screen.id}`,
    platform: screen.platform,
    review_states: REVIEW_STATES.get(screen.id),
    state_sources: stateSourcesFor(screen.id),
    fixture_ids: screen.fixture_ids,
  })),
  low_fidelity_strips: lowFidelityStrips,
  evidence_contract: {
    capture_manifest: "validation/wave-001-captures.json",
    review_record: "validation/wave-001-review.json",
    figma_maps: [
      "figma/token-map.json",
      "figma/component-map.json",
      "figma/screen-map.json",
      "figma/prototype-map.json",
    ],
    primary_capture_count: 22,
    reflow_viewport: { width: 720, height: 512, equivalent_zoom_percent: 200 },
    print_screen_ids: ["SCR-006", "SCR-043", "SCR-045"],
  },
};

const outputs = new Map([
  ["construction-packets/packets.json", packetDocument],
  ["production-waves/wave-001.json", waveManifest],
  ["figma/token-map.json", tokenMap],
  ["figma/component-map.json", componentMap],
  ["figma/screen-map.json", screenMap],
  ["figma/prototype-map.json", prototypeMap],
  ["validation/wave-001-captures.json", captureManifest],
]);

const renderedOutputs = new Map();
for (const [relativePath, document] of outputs) {
  renderedOutputs.set(
    relativePath,
    await prettier.format(JSON.stringify(document), { parser: "json" }),
  );
}

if (checkOnly) {
  const stale = [];
  for (const [relativePath, expected] of renderedOutputs) {
    const actual = await readFile(path.join(ROOT, relativePath), "utf8").catch(
      () => null,
    );
    if (actual !== expected) stale.push(relativePath);
  }
  if (stale.length > 0)
    throw new Error(
      `Wave-001 generated contracts are stale: ${stale.join(", ")}`,
    );
  console.log(
    `✓ Wave-001 generated contracts are current (${outputs.size} files)`,
  );
} else {
  for (const [relativePath, contents] of renderedOutputs) {
    await mkdir(path.dirname(path.join(ROOT, relativePath)), {
      recursive: true,
    });
    await writeFile(path.join(ROOT, relativePath), contents, "utf8");
  }
  console.log(`✓ generated Wave-001 contracts (${outputs.size} files)`);
}
