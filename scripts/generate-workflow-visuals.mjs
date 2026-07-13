import { createHash } from "node:crypto";
import {
  access,
  mkdir,
  readFile,
  readdir,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import prettier from "prettier";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const OUTPUT_DIRECTORY = path.join(ROOT, "workflow-model", "visuals");
const GENERATOR_VERSION = "1.0.0";
const CHECK_ONLY = process.argv.includes("--check");
const ALLOW_STEP_TRANSITION_FALLBACK = process.argv.includes(
  "--allow-step-transition-fallback",
);

const SOURCE_PATHS = [
  "workflow-model/workflows.json",
  "workflow-model/roles.json",
  "workflow-model/records.json",
  "workflow-model/decisions.json",
  "workflow-model/exceptions.json",
  "workflow-model/overlays.json",
];

const REQUIRED_SPECIAL_VISUALS = [
  "VIS-OPERATING-MODEL",
  "VIS-ANNUAL-CALENDAR",
  "VIS-ROLES-INTERACTION",
  "VIS-HANDOFF-INFORMATION",
  "VIS-ESTATE-CONTRACT-COMPARISON",
  "VIS-CERTIFICATION-OVERLAY",
];

function absolute(relativePath) {
  return path.join(ROOT, ...relativePath.split("/"));
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(absolute(relativePath), "utf8"));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function safeId(value, prefix = "N") {
  const normalized = String(value)
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
  return /^[A-Z]/.test(normalized) ? normalized : `${prefix}_${normalized}`;
}

function label(value, maxLength = 120) {
  const normalized = String(value ?? "")
    .normalize("NFC")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/&/g, "and")
    .replace(/["`<>{}|]/g, "'")
    .replaceAll("[", "'")
    .replaceAll("]", "'")
    .replace(/\s+/g, " ")
    .trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
}

function humanize(value) {
  return label(
    String(value)
      .replaceAll("_", " ")
      .replace(/\b\w/g, (character) => character.toUpperCase()),
  );
}

function stateTransitionLabel(value) {
  return label(value, 90).replace(/[:;]/g, " -");
}

function quotedNode(id, text) {
  return `${id}["${label(text)}"]`;
}

function decisionNode(id, text) {
  return `${id}{"${label(text)}"}`;
}

function diagramHeader(id, title, sources) {
  const populatedSources = sources.filter((item) => item.ids.length > 0);
  return [
    `%% visual_id: ${id}`,
    `%% title: ${label(title, 180)}`,
    `%% generator: scripts/generate-workflow-visuals.mjs@${GENERATOR_VERSION}`,
    `%% sources: ${populatedSources.map((source) => `${source.path}#${source.ids.join(",")}`).join("; ")}`,
    "%% Regenerate after canonical JSON changes; this Mermaid source remains plain-text and editable.",
  ];
}

function source(pathName, ids) {
  return { path: pathName, ids: unique(ids).sort() };
}

function createVisual({
  id,
  category,
  title,
  fileName,
  diagramType,
  content,
  sources,
  workflowIds = [],
  roleIds = [],
  recordIds = [],
  decisionIds = [],
  exceptionIds = [],
  overlayIds = [],
}) {
  const populatedSources = sources.filter((item) => item.ids.length > 0);
  return {
    id,
    category,
    title,
    path: `workflow-model/visuals/${fileName}`,
    diagram_type: diagramType,
    source_refs: populatedSources,
    workflow_ids: unique(workflowIds).sort(),
    role_ids: unique(roleIds).sort(),
    record_ids: unique(recordIds).sort(),
    decision_ids: unique(decisionIds).sort(),
    exception_ids: unique(exceptionIds).sort(),
    overlay_ids: unique(overlayIds).sort(),
    content: `${content.trimEnd()}\n`,
  };
}

function workflowFileStem(workflow) {
  return workflow.id.toLowerCase();
}

function buildSwimlane(workflow, roleIndex) {
  const id = `VIS-${workflow.id}-SWIMLANE`;
  const sources = [
    source("workflow-model/workflows.json", [workflow.id]),
    source("workflow-model/roles.json", workflow.roles),
  ];
  const steps = [...workflow.steps].sort(
    (left, right) => left.order - right.order,
  );
  const roleIds = unique(workflow.roles);
  const lines = [
    ...diagramHeader(id, `${workflow.id} role swimlane`, sources),
    "flowchart LR",
    `  ${quotedNode("START", `${workflow.id} · Trigger`)}`,
    `  ${quotedNode("END", `${workflow.id} · Output and accountable closure`)}`,
  ];

  for (const roleId of roleIds) {
    const roleName = roleIndex.get(roleId)?.name ?? roleId;
    lines.push(
      `  subgraph LANE_${safeId(roleId)}["${label(`${roleId} · ${roleName}`)}"]`,
    );
    lines.push("    direction TB");
    const ownedSteps = steps.filter((item) => item.owner === roleId);
    for (const step of ownedSteps) {
      const stepId = `STEP_${String(step.order).padStart(2, "0")}`;
      lines.push(
        `    ${quotedNode(stepId, `${String(step.order).padStart(2, "0")} · ${humanize(step.stage)} · ${step.description}`)}`,
      );
    }
    if (ownedSteps.length === 0) {
      lines.push(
        `    ${quotedNode(`PARTICIPANT_${safeId(roleId)}`, "Participant through inputs, handoffs, approvals, exceptions, or downstream records; no canonical owned step")}`,
      );
    }
    lines.push("  end");
  }

  if (steps.length > 0) {
    lines.push(
      `  START -->|${label(steps[0].state_to ?? "begin")}| STEP_${String(steps[0].order).padStart(2, "0")}`,
    );
    for (let index = 0; index < steps.length - 1; index += 1) {
      const current = steps[index];
      const next = steps[index + 1];
      lines.push(
        `  STEP_${String(current.order).padStart(2, "0")} -->|${label(next.state_to ?? next.stage)}| STEP_${String(next.order).padStart(2, "0")}`,
      );
    }
    lines.push(
      `  STEP_${String(steps.at(-1).order).padStart(2, "0")} -->|${label(steps.at(-1).state_to ?? "close")}| END`,
    );
  }

  return createVisual({
    id,
    category: "role_swimlane",
    title: `${workflow.id} · ${workflow.name} · Role swimlane`,
    fileName: `${workflowFileStem(workflow)}-role-swimlane.mmd`,
    diagramType: "flowchart",
    content: lines.join("\n"),
    sources,
    workflowIds: [workflow.id],
    roleIds,
    decisionIds: steps.flatMap((step) => step.decision_ids ?? []),
  });
}

function workflowTransitions(workflow) {
  const hasCanonicalTransitions =
    Array.isArray(workflow.transitions) && workflow.transitions.length > 0;
  const hasTerminalStates =
    Array.isArray(workflow.terminal_states) &&
    workflow.terminal_states.length > 0;

  if (hasCanonicalTransitions && hasTerminalStates) {
    return workflow.transitions.map((transition, index) => {
      const from = transition.from ?? transition.state_from ?? null;
      const to = transition.to ?? transition.state_to ?? null;
      if (!to) {
        throw new Error(
          `${workflow.id}.transitions[${index}] has no to/state_to value.`,
        );
      }
      const transitionId =
        transition.id ??
        `TRN-${workflow.id}-${String(index + 1).padStart(3, "0")}`;
      const transitionDescription =
        transition.label ??
        transition.name ??
        transition.trigger ??
        transition.reason ??
        transition.event ??
        transition.kind ??
        `Canonical transition ${index + 1}`;
      return {
        ...transition,
        from,
        to,
        text: `${transitionId} · ${humanize(transition.kind ?? "transition")} · ${transitionDescription}`,
      };
    });
  }

  if (!ALLOW_STEP_TRANSITION_FALLBACK) {
    throw new Error(
      `${workflow.id} must define non-empty canonical transitions and terminal_states before final visuals can be generated. Use --allow-step-transition-fallback only during ontology development.`,
    );
  }

  return [...workflow.steps]
    .sort((left, right) => left.order - right.order)
    .map((step) => ({
      from: step.state_from,
      to: step.state_to,
      text: `${String(step.order).padStart(2, "0")} · ${humanize(step.stage)}`,
      decision_ids: step.decision_ids ?? [],
      exception_ids: [],
    }));
}

function buildStateMachine(workflow, workflowExceptions) {
  const id = `VIS-${workflow.id}-STATE-MACHINE`;
  const canonicalTransitions = workflowTransitions(workflow);
  const referencedExceptionIds = unique(
    canonicalTransitions.flatMap((transition) => [
      ...(transition.exception_ids ?? []),
      transition.exception_id,
    ]),
  );
  const referencedDecisionIds = unique(
    canonicalTransitions.flatMap((transition) => [
      ...(transition.decision_ids ?? []),
      transition.decision_id,
    ]),
  );
  const referencedRecordIds = unique(
    canonicalTransitions.flatMap((transition) => [
      ...(transition.record_reads ?? []),
      ...(transition.record_writes ?? []),
    ]),
  );
  const selectedExceptions = workflowExceptions.filter((exception) =>
    referencedExceptionIds.includes(exception.id),
  );
  const sources = [
    source("workflow-model/workflows.json", [workflow.id]),
    source(
      "workflow-model/exceptions.json",
      selectedExceptions.map((exception) => exception.id),
    ),
    source("workflow-model/records.json", referencedRecordIds),
  ];
  const transitions = [];
  const usedStates = new Set();

  for (const transition of canonicalTransitions) {
    if (transition.from) usedStates.add(transition.from);
    if (transition.to) usedStates.add(transition.to);
    transitions.push({
      from: transition.from,
      to: transition.to,
      text: transition.text,
    });
  }

  const lines = [
    ...diagramHeader(id, `${workflow.id} state machine`, sources),
    "stateDiagram-v2",
  ];
  for (const state of [...usedStates].sort()) {
    lines.push(`  state "${humanize(state)}" as ${safeId(`STATE_${state}`)}`);
  }
  for (const transition of transitions) {
    const from = transition.from ? safeId(`STATE_${transition.from}`) : "[*]";
    const to = transition.to ? safeId(`STATE_${transition.to}`) : "[*]";
    lines.push(
      `  ${from} --> ${to} : ${stateTransitionLabel(transition.text)}`,
    );
  }
  for (const terminalState of workflow.terminal_states ?? []) {
    if (!usedStates.has(terminalState)) {
      throw new Error(
        `${workflow.id}.terminal_states references ${terminalState}, which is absent from canonical transitions.`,
      );
    }
    lines.push(
      `  ${safeId(`STATE_${terminalState}`)} --> [*] : Canonical terminal state`,
    );
  }

  return createVisual({
    id,
    category: "state_machine",
    title: `${workflow.id} · ${workflow.name} · State machine`,
    fileName: `${workflowFileStem(workflow)}-state-machine.mmd`,
    diagramType: "stateDiagram-v2",
    content: lines.join("\n"),
    sources,
    workflowIds: [workflow.id],
    roleIds: workflow.roles,
    recordIds: referencedRecordIds,
    decisionIds: referencedDecisionIds,
    exceptionIds: referencedExceptionIds,
  });
}

function buildExceptionTree(
  workflow,
  workflowExceptions,
  workflowDecisions,
  roleIndex,
) {
  const primaryException = workflowExceptions[0];
  if (!primaryException) {
    throw new Error(
      `${workflow.id} has no canonical exception for its decision tree.`,
    );
  }

  const id = `VIS-${workflow.id}-EXCEPTION-TREE`;
  const selectedDecisions = workflowDecisions;
  const treeRecordIds = unique([
    ...workflowExceptions.flatMap((exception) => exception.record_ids ?? []),
    ...selectedDecisions.flatMap((decision) => decision.record_ids ?? []),
  ]);
  const sources = [
    source("workflow-model/workflows.json", [workflow.id]),
    source(
      "workflow-model/exceptions.json",
      workflowExceptions.map((exception) => exception.id),
    ),
    source(
      "workflow-model/decisions.json",
      selectedDecisions.map((decision) => decision.id),
    ),
    source("workflow-model/records.json", treeRecordIds),
  ];
  const ownerName =
    roleIndex.get(primaryException.accountable_owner)?.name ??
    primaryException.accountable_owner;
  const lines = [
    ...diagramHeader(id, `${workflow.id} exception and decision tree`, sources),
    "flowchart TD",
    `  ${quotedNode("ROOT", `${workflow.id} · ${workflow.name}`)}`,
    `  ${quotedNode("TRIGGER", `${primaryException.id} · ${primaryException.name} · ${primaryException.trigger}`)}`,
    `  ${decisionNode("SCOPE", "Are affected scope, safe partial results, and authority explicit?")}`,
    `  ${quotedNode("HOLD", `Block and escalate · ${primaryException.accountable_owner} · ${ownerName}`)}`,
    `  ${quotedNode("RETAIN", "Retain unaffected and safely completed scope with attribution")}`,
    "  ROOT --> TRIGGER",
    "  TRIGGER --> SCOPE",
    "  SCOPE -->|No| HOLD",
    "  SCOPE -->|Yes| RETAIN",
  ];

  const recoveryActions = primaryException.recovery_actions.slice(0, 4);
  recoveryActions.forEach((action, index) => {
    lines.push(
      `  ${quotedNode(`RECOVERY_${index + 1}`, `${index + 1} · ${action}`)}`,
    );
  });
  if (recoveryActions.length > 0) {
    lines.push("  HOLD --> RECOVERY_1");
    lines.push("  RETAIN --> RECOVERY_1");
    for (let index = 1; index < recoveryActions.length; index += 1) {
      lines.push(`  RECOVERY_${index} --> RECOVERY_${index + 1}`);
    }
  }

  const decisionJoin = recoveryActions.length
    ? `RECOVERY_${recoveryActions.length}`
    : "RETAIN";
  for (const [decisionIndex, decision] of selectedDecisions.entries()) {
    const decisionId = `DECISION_${decisionIndex + 1}`;
    lines.push(
      `  ${decisionNode(decisionId, `${decision.id} · ${decision.question}`)}`,
    );
    lines.push(
      primaryException.decisions.includes(decision.id)
        ? `  ${decisionJoin} -. accountable decision .-> ${decisionId}`
        : `  ROOT -. registered authority .-> ${decisionId}`,
    );
    decision.outcomes.forEach((outcome, outcomeIndex) => {
      const outcomeId = `D${decisionIndex + 1}_OUTCOME_${outcomeIndex + 1}`;
      lines.push(`  ${quotedNode(outcomeId, outcome)}`);
      lines.push(
        `  ${decisionId} -->|Outcome ${outcomeIndex + 1}| ${outcomeId}`,
      );
    });
  }

  lines.push(
    `  ${quotedNode("EVIDENCE", `Closure evidence · ${primaryException.closure_evidence.slice(0, 4).join(" · ")}`)}`,
    `  ${decisionNode("RECONCILED", "Are recovery, disposition, and downstream records reconciled?")}`,
    `  ${quotedNode("CORRECT", "Correction required · preserve prior state and reason")}`,
    `  ${quotedNode("CLOSE", `Recover as ${primaryException.recovery_states.slice(0, 5).map(humanize).join(" / ")}`)}`,
  );
  if (selectedDecisions.length > 0) {
    selectedDecisions.forEach((decision, decisionIndex) => {
      decision.outcomes.forEach((_outcome, outcomeIndex) => {
        lines.push(
          `  D${decisionIndex + 1}_OUTCOME_${outcomeIndex + 1} --> EVIDENCE`,
        );
      });
    });
  } else {
    lines.push(`${decisionJoin} --> EVIDENCE`);
  }
  lines.push(
    "  EVIDENCE --> RECONCILED",
    "  RECONCILED -->|No| CORRECT",
    "  CORRECT --> EVIDENCE",
    "  RECONCILED -->|Yes| CLOSE",
  );
  for (const [exceptionIndex, exception] of workflowExceptions
    .slice(1)
    .entries()) {
    const exceptionNumber = exceptionIndex + 2;
    const exceptionNode = `EXCEPTION_${exceptionNumber}`;
    const recoveryNode = `EXCEPTION_${exceptionNumber}_RECOVERY`;
    lines.push(
      `  ${quotedNode(exceptionNode, `${exception.id} · ${exception.name} · ${exception.trigger}`)}`,
      `  ${quotedNode(recoveryNode, `${exception.interrupted_states.map(humanize).join(" / ")} to ${exception.recovery_states.map(humanize).join(" / ")} · preserve scope and reconcile closure evidence`)}`,
      `  ROOT --> ${exceptionNode}`,
      `  ${exceptionNode} --> ${recoveryNode}`,
      `  ${recoveryNode} --> EVIDENCE`,
    );
    for (const decisionId of exception.decisions) {
      const decisionIndex = selectedDecisions.findIndex(
        (decision) => decision.id === decisionId,
      );
      if (decisionIndex >= 0)
        lines.push(
          `  ${exceptionNode} -. accountable decision .-> DECISION_${decisionIndex + 1}`,
        );
    }
  }

  return createVisual({
    id,
    category: "exception_decision_tree",
    title: `${workflow.id} · ${workflow.name} · Exception and decision tree`,
    fileName: `${workflowFileStem(workflow)}-exception-decision-tree.mmd`,
    diagramType: "flowchart",
    content: lines.join("\n"),
    sources,
    workflowIds: [workflow.id],
    roleIds: unique([
      ...workflowExceptions.flatMap((exception) => [
        exception.accountable_owner,
        ...exception.escalation_roles,
      ]),
      ...selectedDecisions.flatMap((decision) => decision.role_ids ?? []),
    ]),
    recordIds: treeRecordIds,
    decisionIds: selectedDecisions.map((decision) => decision.id),
    exceptionIds: workflowExceptions.map((exception) => exception.id),
  });
}

function buildOperatingModel(workflows, roles, overlays) {
  const id = "VIS-OPERATING-MODEL";
  const identityOverlay = overlays.find((overlay) => overlay.id === "OVL-001");
  const layers = new Map();
  for (const role of roles) {
    const collection = layers.get(role.layer) ?? [];
    collection.push(role);
    layers.set(role.layer, collection);
  }
  const sources = [
    source(
      "workflow-model/workflows.json",
      workflows.map((workflow) => workflow.id),
    ),
    source(
      "workflow-model/roles.json",
      roles.map((role) => role.id),
    ),
    source(
      "workflow-model/overlays.json",
      identityOverlay ? [identityOverlay.id] : [],
    ),
  ];
  const layerOrder = [
    "ownership_governance",
    "operational_middle",
    "field_execution",
    "office_support",
    "outside_party",
  ];
  const lines = [
    ...diagramHeader(id, "Vineyard operating model", sources),
    "flowchart TB",
    `  ${quotedNode("IDENTITY", `${identityOverlay?.id ?? "OVL-001"} · Stable block identity and alias history`)}`,
    `  ${quotedNode("COORDINATION", `${workflows.length} accountable workflow families · plan, decide, assign, execute, verify, reconcile`)}`,
    `  ${quotedNode("TRUTH", "Durable operating truth · records, provenance, corrections, and historical context")}`,
  ];

  for (const layer of layerOrder) {
    const members = [...(layers.get(layer) ?? [])].sort((left, right) =>
      left.id.localeCompare(right.id),
    );
    const layerId = safeId(`LAYER_${layer}`);
    lines.push(`  subgraph ${layerId}["${humanize(layer)}"]`);
    lines.push(
      `    ${quotedNode(`${layerId}_ROLES`, `${members.length} accountable roles`)}`,
    );
    for (const member of members) {
      const memberId = safeId(`OPERATING_${member.id}`);
      lines.push(
        `    ${quotedNode(memberId, `${member.id} · ${member.name}`)}`,
        `    ${layerId}_ROLES --- ${memberId}`,
      );
    }
    lines.push("  end");
  }

  lines.push(
    "  LAYER_OWNERSHIP_GOVERNANCE_ROLES -->|delegated authority and risk limits| LAYER_OPERATIONAL_MIDDLE_ROLES",
    "  LAYER_OPERATIONAL_MIDDLE_ROLES -->|approved block work and current constraints| LAYER_FIELD_EXECUTION_ROLES",
    "  LAYER_FIELD_EXECUTION_ROLES -->|actuals, observations, exceptions, proof| LAYER_OPERATIONAL_MIDDLE_ROLES",
    "  LAYER_OPERATIONAL_MIDDLE_ROLES -->|verified records and reconciliation requests| LAYER_OFFICE_SUPPORT_ROLES",
    "  LAYER_OFFICE_SUPPORT_ROLES -->|financial, payroll, purchasing, and compliance evidence| LAYER_OWNERSHIP_GOVERNANCE_ROLES",
    "  LAYER_OUTSIDE_PARTY_ROLES -->|requirements, commitments, results| LAYER_OPERATIONAL_MIDDLE_ROLES",
    "  LAYER_OPERATIONAL_MIDDLE_ROLES -->|evidence, reconciliation, correction| LAYER_OUTSIDE_PARTY_ROLES",
    "  IDENTITY --> COORDINATION",
    "  COORDINATION --> LAYER_OWNERSHIP_GOVERNANCE_ROLES",
    "  COORDINATION --> LAYER_OPERATIONAL_MIDDLE_ROLES",
    "  COORDINATION --> LAYER_FIELD_EXECUTION_ROLES",
    "  COORDINATION --> LAYER_OFFICE_SUPPORT_ROLES",
    "  COORDINATION --> LAYER_OUTSIDE_PARTY_ROLES",
    "  LAYER_OWNERSHIP_GOVERNANCE_ROLES --> TRUTH",
    "  LAYER_OPERATIONAL_MIDDLE_ROLES --> TRUTH",
    "  LAYER_FIELD_EXECUTION_ROLES --> TRUTH",
    "  LAYER_OFFICE_SUPPORT_ROLES --> TRUTH",
    "  LAYER_OUTSIDE_PARTY_ROLES --> TRUTH",
    "  TRUTH -. informs the next decision .-> COORDINATION",
  );

  return createVisual({
    id,
    category: "required_operational",
    title: "Vineyard operating model",
    fileName: "operating-model.mmd",
    diagramType: "flowchart",
    content: lines.join("\n"),
    sources,
    workflowIds: workflows.map((workflow) => workflow.id),
    roleIds: roles.map((role) => role.id),
    overlayIds: identityOverlay ? [identityOverlay.id] : [],
  });
}

function buildAnnualCalendar(workflows) {
  const id = "VIS-ANNUAL-CALENDAR";
  const sources = [
    source(
      "workflow-model/workflows.json",
      workflows.map((workflow) => workflow.id),
    ),
  ];
  const seasonOrder = [
    "preseason",
    "dormancy",
    "delayed_dormancy",
    "budbreak",
    "rapid_shoot_growth",
    "bloom",
    "fruit_set",
    "crop_estimation",
    "lag_phase",
    "veraison",
    "preharvest",
    "harvest",
    "postharvest",
  ];
  const persistentOrder = [
    "year_round",
    "annual_planning",
    "application_season",
    "audit_window",
  ];
  const allSeasons = new Set(
    workflows.flatMap((workflow) => workflow.seasonality),
  );
  const unknown = [...allSeasons]
    .filter(
      (season) =>
        !seasonOrder.includes(season) && !persistentOrder.includes(season),
    )
    .sort();
  const stageKeys = [...seasonOrder, ...unknown].filter((season) =>
    allSeasons.has(season),
  );
  const persistentKeys = persistentOrder.filter((season) =>
    allSeasons.has(season),
  );
  const stageWorkflowIds = (season) =>
    workflows
      .filter((workflow) => workflow.seasonality.includes(season))
      .map((workflow) => workflow.id)
      .join(" · ");
  const lines = [
    ...diagramHeader(id, "Annual vineyard operating calendar", sources),
    "flowchart LR",
    '  subgraph SEASONAL_CYCLE["Seasonal operating cycle"]',
    "    direction LR",
  ];
  stageKeys.forEach((season) => {
    lines.push(
      `    ${quotedNode(safeId(`SEASON_${season}`), `${humanize(season)} · ${stageWorkflowIds(season)}`)}`,
    );
  });
  for (let index = 0; index < stageKeys.length - 1; index += 1) {
    lines.push(
      `    ${safeId(`SEASON_${stageKeys[index]}`)} --> ${safeId(`SEASON_${stageKeys[index + 1]}`)}`,
    );
  }
  if (stageKeys.length > 1) {
    lines.push(
      `    ${safeId(`SEASON_${stageKeys.at(-1)}`)} -. next season .-> ${safeId(`SEASON_${stageKeys[0]}`)}`,
    );
  }
  lines.push("  end");
  lines.push('  subgraph PERSISTENT["Persistent and overlay windows"]');
  lines.push("    direction TB");
  persistentKeys.forEach((season) => {
    lines.push(
      `    ${quotedNode(safeId(`WINDOW_${season}`), `${humanize(season)} · ${stageWorkflowIds(season)}`)}`,
    );
  });
  lines.push("  end");
  if (stageKeys.length > 0) {
    persistentKeys.forEach((season) => {
      lines.push(
        `  ${safeId(`WINDOW_${season}`)} -. constrains .-> ${safeId(`SEASON_${stageKeys[Math.floor(stageKeys.length / 2)]}`)}`,
      );
    });
  }

  return createVisual({
    id,
    category: "required_operational",
    title: "Annual vineyard operating calendar",
    fileName: "annual-calendar.mmd",
    diagramType: "flowchart",
    content: lines.join("\n"),
    sources,
    workflowIds: workflows.map((workflow) => workflow.id),
  });
}

function buildRolesInteraction(workflows, roles) {
  const id = "VIS-ROLES-INTERACTION";
  const sources = [
    source(
      "workflow-model/workflows.json",
      workflows.map((workflow) => workflow.id),
    ),
    source(
      "workflow-model/roles.json",
      roles.map((role) => role.id),
    ),
  ];
  const edges = new Map();
  for (const workflow of workflows) {
    const ownerSequence = workflow.steps
      .map((step) => step.owner)
      .filter(Boolean);
    for (let index = 0; index < ownerSequence.length - 1; index += 1) {
      const from = ownerSequence[index];
      const to = ownerSequence[index + 1];
      if (from === to) continue;
      const key = `${from}|${to}`;
      const workflowIds = edges.get(key) ?? [];
      workflowIds.push(workflow.id);
      edges.set(key, workflowIds);
    }
  }

  const layerOrder = [
    "ownership_governance",
    "operational_middle",
    "field_execution",
    "office_support",
    "outside_party",
  ];
  const lines = [
    ...diagramHeader(id, "Roles interaction map", sources),
    "flowchart LR",
  ];
  for (const layer of layerOrder) {
    const members = roles
      .filter((role) => role.layer === layer)
      .sort((left, right) => left.id.localeCompare(right.id));
    lines.push(
      `  subgraph ${safeId(`ROLE_LAYER_${layer}`)}["${humanize(layer)}"]`,
    );
    lines.push("    direction TB");
    for (const role of members) {
      lines.push(
        `    ${quotedNode(safeId(role.id), `${role.name} · ${role.workflow_ids.join(" · ")}`)}`,
      );
    }
    lines.push("  end");
  }
  for (const [key, workflowIds] of [...edges.entries()].sort(
    ([left], [right]) => left.localeCompare(right),
  )) {
    const [from, to] = key.split("|");
    lines.push(
      `  ${safeId(from)} -->|${unique(workflowIds).sort().join(" · ")}| ${safeId(to)}`,
    );
  }

  return createVisual({
    id,
    category: "required_operational",
    title: "Roles interaction map",
    fileName: "roles-interaction-map.mmd",
    diagramType: "flowchart",
    content: lines.join("\n"),
    sources,
    workflowIds: workflows.map((workflow) => workflow.id),
    roleIds: roles.map((role) => role.id),
  });
}

function buildHandoffInformation(workflows) {
  const id = "VIS-HANDOFF-INFORMATION";
  const sources = [
    source(
      "workflow-model/workflows.json",
      workflows.map((workflow) => workflow.id),
    ),
  ];
  const lines = [
    ...diagramHeader(id, "Handoff and information map", sources),
    "flowchart TB",
  ];
  for (const workflow of workflows) {
    const workflowId = safeId(workflow.id);
    lines.push(
      `  subgraph MAP_${workflowId}["${label(`${workflow.id} · ${workflow.name}`)}"]`,
    );
    lines.push("    direction LR");
    lines.push(
      `    ${quotedNode(`${workflowId}_INPUTS`, `Inputs · ${workflow.inputs.slice(0, 3).join(" · ")}`)}`,
      `    ${quotedNode(`${workflowId}_WORK`, `Accountable workflow · ${workflow.id}`)}`,
      `    ${quotedNode(`${workflowId}_HANDOFFS`, `Handoffs · ${workflow.handoffs.slice(0, 3).join(" · ")}`)}`,
      `    ${quotedNode(`${workflowId}_RECORDS`, `Records · ${workflow.records.slice(0, 4).join(" · ")}`)}`,
      `    ${quotedNode(`${workflowId}_OUTPUTS`, `Outputs · ${workflow.outputs.slice(0, 3).join(" · ")}`)}`,
      `    ${workflowId}_INPUTS --> ${workflowId}_WORK --> ${workflowId}_HANDOFFS --> ${workflowId}_RECORDS --> ${workflowId}_OUTPUTS`,
    );
    lines.push("  end");
  }

  return createVisual({
    id,
    category: "required_operational",
    title: "Handoff and information map",
    fileName: "handoff-information-map.mmd",
    diagramType: "flowchart",
    content: lines.join("\n"),
    sources,
    workflowIds: workflows.map((workflow) => workflow.id),
    roleIds: unique(workflows.flatMap((workflow) => workflow.roles)),
  });
}

function buildEstateContractComparison(workflows, roles, overlays) {
  const id = "VIS-ESTATE-CONTRACT-COMPARISON";
  const overlay = overlays.find((item) => item.id === "OVL-008");
  if (!overlay)
    throw new Error("OVL-008 is required for the contract-fruit comparison.");
  const roleIndex = new Map(roles.map((role) => [role.id, role]));
  const estateRoleIds = [
    "ROLE-VINEYARD-MANAGER",
    "ROLE-VITICULTURIST",
    "ROLE-FOREMAN",
    "ROLE-OPERATIONS-COORDINATOR",
    "ROLE-FIELD-CREW",
    "ROLE-COMPLIANCE-COORDINATOR",
    "ROLE-FINANCE",
  ].filter((roleId) => overlay.role_ids.includes(roleId));
  const contractRoleIds = [
    "ROLE-GROWER-RELATIONS",
    "ROLE-CONTRACT-GROWER",
    "ROLE-WINEMAKER",
    "ROLE-WINERY-INTAKE",
    "ROLE-TRANSPORTATION",
  ].filter((roleId) => overlay.role_ids.includes(roleId));
  const names = (roleIds) =>
    roleIds.map((roleId) => roleIndex.get(roleId)?.name ?? roleId).join(" · ");
  const sources = [
    source("workflow-model/overlays.json", [overlay.id]),
    source("workflow-model/roles.json", [...estateRoleIds, ...contractRoleIds]),
    source("workflow-model/workflows.json", overlay.applies_to),
  ];
  const lines = [
    ...diagramHeader(
      id,
      "Estate-grown versus contract-fruit comparison",
      sources,
    ),
    "flowchart TB",
    `  ${quotedNode("BOUNDARY", `${overlay.id} · ${overlay.name} · ${overlay.operational_rule}`)}`,
    '  subgraph ESTATE["Estate-grown route"]',
    "    direction TB",
    `    ${quotedNode("ESTATE_AUTHORITY", `Authority routes inward · ${names(estateRoleIds)}`)}`,
    `    ${quotedNode("ESTATE_HANDOFF", "Block work, verification, and correction remain attributable inside the operating organization")}`,
    "    ESTATE_AUTHORITY --> ESTATE_HANDOFF",
    "  end",
    '  subgraph CONTRACT["Contract-fruit route"]',
    "    direction TB",
    `    ${quotedNode("CONTRACT_AUTHORITY", `Both organizations remain explicit · ${names(contractRoleIds)}`)}`,
    `    ${quotedNode("CONTRACT_HANDOFF", "Requirements, decision rights, messages, evidence, delivery, and settlement cross the boundary")}`,
    "    CONTRACT_AUTHORITY --> CONTRACT_HANDOFF",
    "  end",
    `  ${quotedNode("SHARED_IDENTITY", "Shared invariant · stable block identity, aliases, effective dates, and accountable contacts")}`,
    `  ${quotedNode("WORKFLOWS", `Boundary-sensitive workflows · ${overlay.applies_to.join(" · ")}`)}`,
    `  ${quotedNode("RECORDS", `Required records · ${overlay.required_records.join(" · ")}`)}`,
    `  ${decisionNode("EXCEPTION", `Boundary exception · ${overlay.exceptions.join(" / ")}`)}`,
    `  ${quotedNode("RECOVERY", `Recovery · ${overlay.recovery.join(" · ")}`)}`,
    "  BOUNDARY --> ESTATE_AUTHORITY",
    "  BOUNDARY --> CONTRACT_AUTHORITY",
    "  ESTATE_HANDOFF --> SHARED_IDENTITY",
    "  CONTRACT_HANDOFF --> SHARED_IDENTITY",
    "  SHARED_IDENTITY --> WORKFLOWS --> RECORDS --> EXCEPTION",
    "  EXCEPTION -->|Raised| RECOVERY",
    "  EXCEPTION -->|None| RECORDS",
    "  RECOVERY --> RECORDS",
  ];

  return createVisual({
    id,
    category: "required_operational",
    title: "Estate-grown versus contract-fruit comparison",
    fileName: "estate-grown-vs-contract-fruit.mmd",
    diagramType: "flowchart",
    content: lines.join("\n"),
    sources,
    workflowIds: overlay.applies_to,
    roleIds: [...estateRoleIds, ...contractRoleIds],
    exceptionIds: overlay.exception_ids,
    decisionIds: overlay.decision_ids,
    overlayIds: [overlay.id],
  });
}

function buildCertificationOverlay(workflows, roles, overlays) {
  const id = "VIS-CERTIFICATION-OVERLAY";
  const overlay = overlays.find((item) => item.id === "OVL-009");
  if (!overlay)
    throw new Error("OVL-009 is required for the certification overlay.");
  const roleIndex = new Map(roles.map((role) => [role.id, role]));
  const accountableRoleIds = [
    "ROLE-COMPLIANCE-COORDINATOR",
    "ROLE-CERTIFIER",
    "ROLE-AUDITOR",
    "ROLE-VINEYARD-MANAGER",
  ].filter((roleId) => overlay.role_ids.includes(roleId));
  const sources = [
    source("workflow-model/overlays.json", [overlay.id]),
    source("workflow-model/roles.json", accountableRoleIds),
    source("workflow-model/workflows.json", overlay.applies_to),
  ];
  const recordGroups = [
    overlay.required_records.slice(0, 3),
    overlay.required_records.slice(3, 6),
    overlay.required_records.slice(6),
  ].filter((group) => group.length > 0);
  const lines = [
    ...diagramHeader(id, "Certification overlay", sources),
    "flowchart LR",
    `  ${quotedNode("SCOPE", `${overlay.id} · Applicable regime, block scope, and requirement version`)}`,
    `  ${quotedNode("PRECHECK", `Pre-work constraints · ${recordGroups[0]?.join(" · ") ?? "current requirements"}`)}`,
    `  ${quotedNode("EXECUTION", `Point-of-work proof · ${recordGroups[1]?.join(" · ") ?? "execution evidence"}`)}`,
    `  ${quotedNode("EVIDENCE", `Audit-ready record · ${recordGroups[2]?.join(" · ") ?? "audit link"}`)}`,
    `  ${decisionNode("GAP", `Certification exception · ${overlay.exceptions.join(" / ")}`)}`,
    `  ${quotedNode("CORRECTIVE", `Corrective path · ${overlay.recovery.join(" · ")}`)}`,
    `  ${quotedNode("AUTHORITY", `Accountable review · ${accountableRoleIds.map((roleId) => roleIndex.get(roleId)?.name ?? roleId).join(" · ")}`)}`,
    `  ${quotedNode("STATUS", `Certification status retained across ${overlay.applies_to.join(" · ")}`)}`,
    "  SCOPE --> PRECHECK --> EXECUTION --> EVIDENCE --> GAP",
    "  GAP -->|Gap found| CORRECTIVE --> AUTHORITY --> STATUS",
    "  GAP -->|Evidence complete| AUTHORITY",
    "  STATUS -. requirement and decision history .-> SCOPE",
  ];

  return createVisual({
    id,
    category: "required_operational",
    title: "Certification regime overlay",
    fileName: "certification-overlay.mmd",
    diagramType: "flowchart",
    content: lines.join("\n"),
    sources,
    workflowIds: overlay.applies_to,
    roleIds: accountableRoleIds,
    exceptionIds: overlay.exception_ids,
    decisionIds: overlay.decision_ids,
    overlayIds: [overlay.id],
  });
}

function validateVisuals(visuals, sourceIndexes, canonical) {
  const ids = visuals.map((visual) => visual.id);
  const paths = visuals.map((visual) => visual.path);
  if (new Set(ids).size !== ids.length)
    throw new Error("Visual IDs are not unique.");
  if (new Set(paths).size !== paths.length)
    throw new Error("Visual paths are not unique.");

  const counts = Object.fromEntries(
    [
      "role_swimlane",
      "state_machine",
      "exception_decision_tree",
      "required_operational",
    ].map((category) => [
      category,
      visuals.filter((visual) => visual.category === category).length,
    ]),
  );
  if (counts.role_swimlane < 10)
    throw new Error(
      `Expected at least 10 role swimlanes; found ${counts.role_swimlane}.`,
    );
  if (counts.state_machine < 8)
    throw new Error(
      `Expected at least 8 state machines; found ${counts.state_machine}.`,
    );
  if (counts.exception_decision_tree < 10)
    throw new Error(
      `Expected at least 10 exception/decision trees; found ${counts.exception_decision_tree}.`,
    );
  for (const requiredId of REQUIRED_SPECIAL_VISUALS) {
    if (!ids.includes(requiredId))
      throw new Error(`Missing required visual ${requiredId}.`);
  }

  for (const visual of visuals) {
    const diagramLine = visual.content
      .split("\n")
      .find((line) => !line.startsWith("%%") && line.trim());
    if (
      !/^(flowchart (LR|RL|TB|BT|TD)|stateDiagram-v2)$/.test(diagramLine ?? "")
    ) {
      throw new Error(
        `${visual.id}: unsupported or missing Mermaid declaration.`,
      );
    }
    for (const line of visual.content.split("\n")) {
      const quoteCount = [...line].filter(
        (character) => character === '"',
      ).length;
      if (quoteCount % 2 !== 0)
        throw new Error(
          `${visual.id}: unbalanced quoted label on line: ${line}`,
        );
    }
    for (const reference of visual.source_refs) {
      const index = sourceIndexes.get(reference.path);
      if (!index)
        throw new Error(`${visual.id}: unknown source ${reference.path}.`);
      for (const referenceId of reference.ids) {
        if (!index.has(referenceId)) {
          throw new Error(
            `${visual.id}: ${referenceId} is not present in ${reference.path}.`,
          );
        }
      }
    }

    const typedReferences = [
      ["workflow_ids", "workflow-model/workflows.json"],
      ["role_ids", "workflow-model/roles.json"],
      ["record_ids", "workflow-model/records.json"],
      ["decision_ids", "workflow-model/decisions.json"],
      ["exception_ids", "workflow-model/exceptions.json"],
      ["overlay_ids", "workflow-model/overlays.json"],
    ];
    for (const [field, sourcePath] of typedReferences) {
      const index = sourceIndexes.get(sourcePath);
      for (const referenceId of visual[field]) {
        if (!index.has(referenceId)) {
          throw new Error(
            `${visual.id}: ${field} contains unresolved ${referenceId}.`,
          );
        }
      }
    }
  }

  for (const workflow of canonical.workflows) {
    const tree = visuals.find(
      (visual) => visual.id === `VIS-${workflow.id}-EXCEPTION-TREE`,
    );
    const expectedDecisionIds = canonical.decisions
      .filter((decision) => decision.workflow_id === workflow.id)
      .map((decision) => decision.id)
      .sort();
    const expectedExceptionIds = canonical.exceptions
      .filter((exception) => exception.workflow_ids.includes(workflow.id))
      .map((exception) => exception.id)
      .sort();
    if (
      JSON.stringify(tree?.decision_ids ?? []) !==
        JSON.stringify(expectedDecisionIds) ||
      JSON.stringify(tree?.exception_ids ?? []) !==
        JSON.stringify(expectedExceptionIds)
    )
      throw new Error(
        `${workflow.id}: exception/decision tree does not cover its complete canonical package.`,
      );
  }

  const operatingModel = visuals.find(
    (visual) => visual.id === "VIS-OPERATING-MODEL",
  );
  const rolesInteraction = visuals.find(
    (visual) => visual.id === "VIS-ROLES-INTERACTION",
  );
  for (const role of canonical.roles) {
    if (!operatingModel?.content.includes(role.name))
      throw new Error(`VIS-OPERATING-MODEL omits ${role.id} (${role.name}).`);
    if (!rolesInteraction?.content.includes(safeId(role.id)))
      throw new Error(`VIS-ROLES-INTERACTION omits ${role.id}.`);
  }

  return counts;
}

function manifestVisual(visual) {
  const record = { ...visual };
  delete record.content;
  return record;
}

function buildReadme(manifest) {
  const labels = {
    role_swimlane: "Role swimlanes",
    state_machine: "State machines",
    exception_decision_tree: "Exception and decision trees",
    required_operational: "Required operational visuals",
  };
  const lines = [
    "# Generated workflow visuals",
    "",
    `Generator version: \`${manifest.generator_version}\``,
    "",
    "These editable Mermaid sources are deterministically generated from the canonical workflow-model JSON registries. Regenerate them after canonical model changes; direct edits to generated files will be overwritten.",
    "",
    "```powershell",
    "npm run generate:workflow-visuals",
    "npm run validate:workflow-visuals",
    "```",
    "",
    "## Coverage",
    "",
    "| Category | Count | Definition-of-Done floor |",
    "| --- | ---: | ---: |",
    `| Role swimlanes | ${manifest.counts.role_swimlane} | 10 |`,
    `| State machines | ${manifest.counts.state_machine} | 8 |`,
    `| Exception and decision trees | ${manifest.counts.exception_decision_tree} | 10 |`,
    `| Required operational visuals | ${manifest.counts.required_operational} | 6 named visuals |`,
    `| **Total** | **${manifest.visual_count}** | |`,
    "",
    "## Source integrity",
    "",
    "The manifest records SHA-256 hashes for every canonical input. Visual IDs, paths, source references, category counts, and Mermaid declarations are validated by the generator's `--check` mode.",
    "",
  ];

  for (const category of Object.keys(labels)) {
    lines.push(`## ${labels[category]}`, "");
    for (const visual of manifest.visuals.filter(
      (item) => item.category === category,
    )) {
      lines.push(
        `- [${visual.id} · ${visual.title}](./${path.basename(visual.path)})`,
      );
    }
    lines.push("");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

async function buildArtifacts() {
  const [
    workflowDocument,
    roleDocument,
    recordDocument,
    decisionDocument,
    exceptionDocument,
    overlayDocument,
  ] = await Promise.all(SOURCE_PATHS.map(readJson));
  const workflows = workflowDocument.workflows;
  const roles = roleDocument.roles;
  const records = recordDocument.records;
  const decisions = decisionDocument.decisions;
  const exceptions = exceptionDocument.exceptions;
  const overlays = overlayDocument.overlays;
  const roleIndex = new Map(roles.map((role) => [role.id, role]));
  const sourceIndexes = new Map([
    [
      "workflow-model/workflows.json",
      new Set(workflows.map((item) => item.id)),
    ],
    ["workflow-model/roles.json", new Set(roles.map((item) => item.id))],
    ["workflow-model/records.json", new Set(records.map((item) => item.id))],
    [
      "workflow-model/decisions.json",
      new Set(decisions.map((item) => item.id)),
    ],
    [
      "workflow-model/exceptions.json",
      new Set(exceptions.map((item) => item.id)),
    ],
    ["workflow-model/overlays.json", new Set(overlays.map((item) => item.id))],
  ]);

  const visuals = [];
  for (const workflow of workflows) {
    const workflowExceptions = exceptions.filter((exception) =>
      exception.workflow_ids.includes(workflow.id),
    );
    const workflowDecisions = decisions.filter(
      (decision) => decision.workflow_id === workflow.id,
    );
    visuals.push(
      buildSwimlane(workflow, roleIndex),
      buildStateMachine(workflow, workflowExceptions),
      buildExceptionTree(
        workflow,
        workflowExceptions,
        workflowDecisions,
        roleIndex,
      ),
    );
  }
  visuals.push(
    buildOperatingModel(workflows, roles, overlays),
    buildAnnualCalendar(workflows),
    buildRolesInteraction(workflows, roles),
    buildHandoffInformation(workflows),
    buildEstateContractComparison(workflows, roles, overlays),
    buildCertificationOverlay(workflows, roles, overlays),
  );

  const counts = validateVisuals(visuals, sourceIndexes, {
    workflows,
    roles,
    decisions,
    exceptions,
  });
  const sourceFiles = [];
  for (const sourcePath of SOURCE_PATHS) {
    const content = await readFile(absolute(sourcePath), "utf8");
    sourceFiles.push({ path: sourcePath, sha256: sha256(content) });
  }
  const manifest = {
    schema_version: "1.0",
    generator_version: GENERATOR_VERSION,
    generator: "scripts/generate-workflow-visuals.mjs",
    deterministic: true,
    source_files: sourceFiles,
    counts,
    visual_count: visuals.length,
    required_special_visual_ids: REQUIRED_SPECIAL_VISUALS,
    visuals: visuals.map(manifestVisual),
  };
  const files = new Map(
    visuals.map((visual) => [path.basename(visual.path), visual.content]),
  );
  files.set(
    "manifest.json",
    await prettier.format(JSON.stringify(manifest), { parser: "json" }),
  );
  files.set(
    "README.md",
    await prettier.format(buildReadme(manifest), { parser: "markdown" }),
  );
  return { files, manifest };
}

async function compareGenerated(files) {
  const differences = [];
  for (const [fileName, expected] of files) {
    const filePath = path.join(OUTPUT_DIRECTORY, fileName);
    try {
      const actual = await readFile(filePath, "utf8");
      if (actual !== expected) differences.push(`${fileName} differs`);
    } catch {
      differences.push(`${fileName} is missing`);
    }
  }
  let existing = [];
  try {
    existing = await readdir(OUTPUT_DIRECTORY);
  } catch {
    differences.push("workflow-model/visuals is missing");
  }
  const expectedNames = new Set(files.keys());
  for (const fileName of existing.filter(
    (name) => name.endsWith(".mmd") && !expectedNames.has(name),
  )) {
    differences.push(`${fileName} is an unexpected generated Mermaid file`);
  }
  if (differences.length > 0) {
    throw new Error(
      `Generated workflow visuals are stale:\n- ${differences.join("\n- ")}`,
    );
  }
}

async function writeGenerated(files) {
  await mkdir(OUTPUT_DIRECTORY, { recursive: true });
  let previousManifest;
  try {
    previousManifest = JSON.parse(
      await readFile(path.join(OUTPUT_DIRECTORY, "manifest.json"), "utf8"),
    );
  } catch {
    previousManifest = null;
  }
  const expectedNames = new Set(files.keys());
  for (const previous of previousManifest?.visuals ?? []) {
    const fileName = path.basename(previous.path ?? "");
    if (
      fileName.endsWith(".mmd") &&
      !expectedNames.has(fileName) &&
      path.dirname(previous.path) === "workflow-model/visuals"
    ) {
      await unlink(path.join(OUTPUT_DIRECTORY, fileName)).catch(() => {});
    }
  }
  for (const [fileName, content] of files) {
    await writeFile(path.join(OUTPUT_DIRECTORY, fileName), content, "utf8");
  }
}

async function main() {
  for (const sourcePath of SOURCE_PATHS) await access(absolute(sourcePath));
  const { files, manifest } = await buildArtifacts();
  if (CHECK_ONLY) {
    await compareGenerated(files);
    console.log(
      `✓ workflow visuals current: ${manifest.visual_count} diagrams (${manifest.counts.role_swimlane} swimlanes, ${manifest.counts.state_machine} state machines, ${manifest.counts.exception_decision_tree} exception/decision trees, ${manifest.counts.required_operational} required operational visuals)`,
    );
    return;
  }
  await writeGenerated(files);
  console.log(
    `✓ generated ${manifest.visual_count} editable Mermaid diagrams in workflow-model/visuals`,
  );
}

main().catch((error) => {
  console.error(`✗ workflow visual generation failed: ${error.message}`);
  process.exitCode = 1;
});
