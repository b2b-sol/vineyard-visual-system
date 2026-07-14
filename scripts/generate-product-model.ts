import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import prettier from "prettier";

import { allocateRequirementTransitions } from "./product-requirement-allocation.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

type JsonObject = Record<string, unknown>;
type Workflow = {
  id: string;
  name: string;
  purpose: string;
  roles: string[];
  states: string[];
  decisions: Array<{ id: string; question: string; owner: string }>;
  transitions: Transition[];
};
type Transition = {
  id: string;
  from: string | null;
  to: string;
  kind: string;
  owner: string;
  trigger: string;
  record_reads: string[];
  record_writes: string[];
  decision_ids: string[];
  exception_ids: string[];
};
type Scenario = {
  id: string;
  title: string;
  workflow_ids: string[];
  category: string;
  role_ids: string[];
  decision_points: string[];
  records_read: string[];
  records_created: string[];
  synthetic_fixture_refs: string[];
  expected_transitions: Array<{
    transition_id?: string;
    from: string | null;
    to: string;
    reason: string;
  }>;
  operational_steps: Array<{
    event_id: string;
    transition_id: string;
    semantic_kind: string;
    actor_assignment_id: string;
    from_state: string | null;
    to_state: string;
    record_reads: string[];
    record_writes: string[];
    exception_history_ids: string[];
    fixture_ref: {
      fixture_id: string;
      workflow_instance_id: string;
      event_id: string;
    };
  }>;
  operational_chain_ids: string[];
  record_link_ids: string[];
  requirement_ids: string[];
};

const readJson = async <T>(relativePath: string): Promise<T> =>
  JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8")) as T;

const unique = <T>(values: T[]) => [...new Set(values)];
const pad = (value: number, width = 3) => String(value).padStart(width, "0");
const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const screenNames: Record<string, string[]> = {
  "WF-001": [
    "Daily operations brief",
    "Seasonal plan",
    "Work plan detail",
    "Dispatch board",
    "Field assignment",
    "Verification and history",
  ],
  "WF-002": [
    "Monitoring queue",
    "Scout capture",
    "Pressure assessment",
    "Treatment recommendation",
    "Preflight and schedule",
    "Application execution",
  ],
  "WF-003": [
    "Water demand",
    "Condition observation",
    "Irrigation schedule builder",
    "Field delivery control",
    "Interruption recovery",
    "Resource verification",
  ],
  "WF-004": [
    "Estimate calendar",
    "Sampling plan",
    "Sample capture",
    "Estimate calculation",
    "Forecast review",
    "Revision history",
  ],
  "WF-005": [
    "Maturity board",
    "Sample chain of identity",
    "Lab result inbox",
    "Readiness assessment",
    "Pick proposal",
    "Authorization timeline",
  ],
  "WF-006": [
    "Harvest command",
    "Pick-run staging",
    "Load creation",
    "Transport tracking",
    "Intake identity",
    "Quality disposition",
    "Reconciliation workspace",
    "Settlement evidence",
  ],
  "WF-007": [
    "Labor demand",
    "Crew schedule",
    "Check-in kiosk",
    "Crew workboard",
    "Time review",
    "Payroll exception",
    "Cost allocation",
  ],
  "WF-008": [
    "Resource demand",
    "Availability check",
    "Purchase request",
    "Receiving and lot identity",
    "Staging and readiness",
    "Failure and repair",
    "Resource cost reconciliation",
  ],
  "WF-009": [
    "Grower portfolio",
    "Block identity resolution",
    "Due-diligence workspace",
    "Terms workspace",
    "Relationship health",
    "Corrective action and dispute",
    "History and renewal",
  ],
  "WF-010": [
    "Compliance coverage",
    "Requirement map",
    "Evidence workbench",
    "Gap resolution",
    "Package review",
    "Submission portal",
    "Audit findings",
    "Certification archive",
  ],
};

const captureWords = new Set([
  "capture",
  "kiosk",
  "execution",
  "assignment",
  "tracking",
  "workboard",
  "delivery",
  "receiving",
]);
const desktopWords = new Set([
  "calendar",
  "builder",
  "review",
  "workspace",
  "portfolio",
  "reconciliation",
  "coverage",
  "map",
]);

const sectionFor = (index: number, count: number) => {
  if (index === 0) return "today";
  if (index < Math.ceil(count / 3)) return "plan";
  if (index < Math.ceil((count * 2) / 3)) return "execute";
  if (index === count - 1) return "records";
  return "verify";
};

const platformFor = (name: string) => {
  const words = new Set(slugify(name).split("-"));
  if ([...captureWords].some((word) => words.has(word))) return "mobile";
  if ([...desktopWords].some((word) => words.has(word))) return "desktop";
  return "responsive";
};

const requirementProfiles = [
  {
    kind: "decision_support",
    label: "Make accountable decisions from current evidence",
    statement:
      "Present the current evidence, missing information, authority, and viable outcomes before an accountable actor commits the next workflow state.",
  },
  {
    kind: "workflow_action",
    label: "Advance only valid canonical transitions",
    statement:
      "Offer only canonical state transitions that are valid from the current state and explain why unavailable actions are denied or require escalation.",
  },
  {
    kind: "information_integrity",
    label: "Resolve stable scope and record identity",
    statement:
      "Resolve organization, property, block, contract, record version, effective time, and source identity before evidence is used for action.",
  },
  {
    kind: "exception_recovery",
    label: "Contain exceptions without losing completed work",
    statement:
      "Preserve safe partial results, record the affected scope and accountable owner, and expose a bounded recovery path without rewriting prior events.",
  },
  {
    kind: "audit_history",
    label: "Inspect attributable append-only history",
    statement:
      "Show actor, assignment, organization, occurred time, captured time, state, reason, and record versions for every material workflow event.",
  },
  {
    kind: "offline_sync",
    label: "Capture field evidence through connectivity loss",
    statement:
      "Journal permitted field actions locally with idempotency keys, disclose sync status, and reconcile conflicts without silent last-write-wins behavior.",
  },
  {
    kind: "cross_organization",
    label: "Respect cross-organization authority boundaries",
    statement:
      "Derive visibility and action authority from the active contract, organization relationship, delegated scope, sensitivity, and effective time.",
  },
  {
    kind: "compliance_control",
    label: "Keep regulated evidence defensible",
    statement:
      "Require applicable evidence, restrictions, attribution, version lineage, and approval before a regulated or certification-sensitive state advances.",
  },
  {
    kind: "information_integrity",
    label: "Correct records through explicit supersession",
    statement:
      "Create an attributable successor with a correction reason and downstream-impact review while preserving the original record and references.",
  },
  {
    kind: "workflow_action",
    label: "Close work with evidence and accountable verification",
    statement:
      "Separate reported completion from verification, reconciliation, settlement, certification, or other accountable terminal disposition.",
  },
] as const;

const domainSeeds = [
  {
    name: "Field operations",
    purpose:
      "Plan, dispatch, perform, recover, verify, and cost estate field work against stable vineyard scope.",
    workflow_ids: ["WF-001", "WF-003", "WF-007", "WF-008"],
    entities: [
      "work plan",
      "assignment",
      "crew",
      "equipment",
      "input",
      "delivery",
    ],
    owners: ["ROLE-VINEYARD-MANAGER", "ROLE-OPERATIONS-COORDINATOR"],
    seams: [
      "crop intelligence recommendations",
      "payroll export",
      "purchasing and repair vendors",
    ],
  },
  {
    name: "Crop intelligence",
    purpose:
      "Turn observations, samples, trends, forecasts, and maturity evidence into qualified operational recommendations.",
    workflow_ids: ["WF-002", "WF-003", "WF-004", "WF-005"],
    entities: [
      "observation",
      "sample",
      "laboratory result",
      "recommendation",
      "forecast",
    ],
    owners: ["ROLE-VITICULTURIST", "ROLE-VINEYARD-MANAGER"],
    seams: [
      "laboratory results",
      "weather and sensor evidence",
      "winery readiness decisions",
    ],
  },
  {
    name: "Harvest and intake",
    purpose:
      "Coordinate authorized fruit from pick staging through load identity, quality disposition, reconciliation, and settlement evidence.",
    workflow_ids: ["WF-005", "WF-006", "WF-007"],
    entities: [
      "pick authorization",
      "harvest run",
      "load",
      "weigh bill",
      "quality result",
      "settlement",
    ],
    owners: [
      "ROLE-VINEYARD-MANAGER",
      "ROLE-WINERY-INTAKE",
      "ROLE-GROWER-RELATIONS",
    ],
    seams: [
      "winery intake systems",
      "transport providers",
      "payroll and finance",
    ],
  },
  {
    name: "Partners and commercial history",
    purpose:
      "Maintain stable grower identity, contract authority, communications, disputes, delivery history, and renewal context across organizations.",
    workflow_ids: ["WF-004", "WF-005", "WF-006", "WF-009"],
    entities: [
      "organization",
      "relationship",
      "contract",
      "block alias",
      "notice",
      "dispute",
    ],
    owners: ["ROLE-GROWER-RELATIONS", "ROLE-OWNER-GENERAL-MANAGER"],
    seams: [
      "grower-owned records",
      "buyer winery systems",
      "contract and accounting systems",
    ],
  },
  {
    name: "Compliance and certification",
    purpose:
      "Map applicable obligations to attributable operational evidence and manage gaps, findings, corrective actions, and certification decisions.",
    workflow_ids: ["WF-002", "WF-003", "WF-008", "WF-010"],
    entities: [
      "requirement",
      "restriction",
      "evidence",
      "finding",
      "corrective action",
      "certification decision",
    ],
    owners: ["ROLE-COMPLIANCE-COORDINATOR", "ROLE-CERTIFIER"],
    seams: ["regulator submissions", "certifier review", "contractor evidence"],
  },
  {
    name: "Operational control and history",
    purpose:
      "Provide role-aware daily command, exceptions, notifications, sync status, immutable history, and portfolio-wide review across every workflow family.",
    workflow_ids: Array.from(
      { length: 10 },
      (_, index) => `WF-${pad(index + 1)}`,
    ),
    entities: [
      "status event",
      "exception",
      "notification",
      "sync conflict",
      "audit history",
      "saved view",
    ],
    owners: ["ROLE-VINEYARD-MANAGER", "ROLE-OWNER-GENERAL-MANAGER"],
    seams: ["identity provider", "notification delivery", "analytics export"],
  },
];

const componentSeeds = [
  ["Work order queue", "workflow"],
  ["App shell", "navigation"],
  ["Role and scope switcher", "identity"],
  ["Block identity chip", "identity"],
  ["Record provenance panel", "record"],
  ["Workflow state rail", "status"],
  ["Transition action bar", "workflow"],
  ["Decision evidence panel", "decision"],
  ["Missing information callout", "decision"],
  ["Exception card", "exception"],
  ["Recovery checklist", "exception"],
  ["Partial scope meter", "status"],
  ["Correction lineage", "record"],
  ["Audit timeline", "record"],
  ["Offline queue indicator", "sync"],
  ["Sync conflict resolver", "sync"],
  ["Staleness badge", "sync"],
  ["Notification center", "feedback"],
  ["Escalation clock", "feedback"],
  ["Assignment roster", "workflow"],
  ["Block and row selector", "input"],
  ["Date and effective-time control", "input"],
  ["Sample chain panel", "record"],
  ["Trend chart", "data_visualization"],
  ["Forecast range", "data_visualization"],
  ["Map scope viewer", "data_visualization"],
  ["Load identity card", "identity"],
  ["Quality disposition panel", "decision"],
  ["Contract authority banner", "identity"],
  ["Evidence completeness meter", "status"],
  ["Requirement coverage matrix", "data_visualization"],
  ["Finding and corrective action", "exception"],
  ["Approval chain", "workflow"],
  ["Reconciliation comparison", "record"],
  ["Export evidence packet", "feedback"],
  ["Accessible status legend", "status"],
] as const;

const [{ workflows }, { roles }, { records }, { decisions }, scenarioDocument] =
  await Promise.all([
    readJson<{ workflows: Workflow[] }>("workflow-model/workflows.json"),
    readJson<{
      roles: Array<{ id: string; name: string; workflow_ids: string[] }>;
    }>("workflow-model/roles.json"),
    readJson<{ records: Array<{ id: string; name: string }> }>(
      "workflow-model/records.json",
    ),
    readJson<{
      decisions: Array<{ id: string; question: string; owner: string }>;
    }>("workflow-model/decisions.json"),
    readJson<{ scenarios: Scenario[] }>("scenarios/scenarios.json"),
  ]);

const scenarios = scenarioDocument.scenarios;
const workflowIndex = new Map(
  workflows.map((workflow) => [workflow.id, workflow]),
);
const recordIndex = new Map(records.map((record) => [record.id, record]));
const decisionIndex = new Map(
  decisions.map((decision) => [decision.id, decision]),
);
const scenariosByWorkflow = new Map(
  workflows.map((workflow) => [
    workflow.id,
    scenarios.filter((scenario) => scenario.workflow_ids.includes(workflow.id)),
  ]),
);

const screenSeeds = workflows.flatMap((workflow) =>
  screenNames[workflow.id].map((name, index) => ({
    id: "",
    name,
    workflow_id: workflow.id,
    workflow,
    local_index: index,
    local_count: screenNames[workflow.id].length,
  })),
);
screenSeeds.forEach((screen, index) => {
  screen.id = `SCR-${pad(index + 1)}`;
});
const screenSeedsByWorkflow = new Map(
  workflows.map((workflow) => [
    workflow.id,
    screenSeeds.filter((screen) => screen.workflow_id === workflow.id),
  ]),
);

const scenarioTransitionIds = (scenario: Scenario, workflowId?: string) =>
  unique(
    scenario.operational_steps
      .filter(
        (step) =>
          !workflowId || step.transition_id.startsWith(`TRN-${workflowId}-`),
      )
      .map((step) => step.transition_id),
  );

const realizedTransitionsByWorkflow = new Map(
  workflows.map((workflow) => [
    workflow.id,
    workflow.transitions.filter((transition) =>
      (scenariosByWorkflow.get(workflow.id) ?? []).some((scenario) =>
        scenarioTransitionIds(scenario, workflow.id).includes(transition.id),
      ),
    ),
  ]),
);

const transitionsByScreenId = new Map<string, Transition[]>();
for (const workflow of workflows) {
  const localScreens = screenSeedsByWorkflow.get(workflow.id) ?? [];
  const realized = realizedTransitionsByWorkflow.get(workflow.id) ?? [];
  const realizedIds = new Set(realized.map((transition) => transition.id));
  const unrealized = workflow.transitions.filter(
    (transition) => !realizedIds.has(transition.id),
  );
  localScreens.forEach((screen) => transitionsByScreenId.set(screen.id, []));
  realized.forEach((transition, index) => {
    const screen =
      localScreens[
        Math.min(
          localScreens.length - 1,
          Math.floor((index * localScreens.length) / realized.length),
        )
      ];
    transitionsByScreenId.get(screen.id)!.push(transition);
  });
  unrealized.forEach((transition) => {
    const canonicalIndex = workflow.transitions.findIndex(
      (candidate) => candidate.id === transition.id,
    );
    const screen =
      localScreens[
        Math.min(
          localScreens.length - 1,
          Math.floor(
            (canonicalIndex * localScreens.length) /
              workflow.transitions.length,
          ),
        )
      ];
    transitionsByScreenId.get(screen.id)!.push(transition);
  });
  for (const screen of localScreens)
    transitionsByScreenId
      .get(screen.id)!
      .sort(
        (left, right) =>
          workflow.transitions.indexOf(left) -
          workflow.transitions.indexOf(right),
      );
}

const screenIdByTransition = new Map(
  [...transitionsByScreenId.entries()].flatMap(([screenId, transitions]) =>
    transitions.map((transition) => [transition.id, screenId] as const),
  ),
);

const notificationIdByTransition = new Map<string, string>();
let notificationOrdinal = 0;
for (const workflow of workflows)
  for (const transition of workflow.transitions) {
    notificationOrdinal += 1;
    notificationIdByTransition.set(
      transition.id,
      `NOT-${pad(notificationOrdinal)}`,
    );
  }

const notificationContractFor = (
  workflow: Workflow,
  transition: Transition,
) => {
  const urgent =
    transition.exception_ids.length > 0 ||
    [
      "blocked",
      "delayed",
      "disputed",
      "noncompliant",
      "correction_required",
      "certification_withheld",
      "paused",
      "rejected",
    ].some((state) => transition.to.includes(state));
  const completion = workflow.states.at(-1) === transition.to;
  const severity = urgent ? "urgent" : completion ? "information" : "attention";
  return {
    id: notificationIdByTransition.get(transition.id)!,
    workflow_ids: [workflow.id],
    trigger_transition_ids: [transition.id],
    severity,
    recipient_role_ids: unique([
      transition.owner,
      ...transition.decision_ids
        .map((decisionId) => decisionIndex.get(decisionId)?.owner)
        .filter((roleId): roleId is string => Boolean(roleId)),
    ]),
    canonical_channel: "in_app",
    delivery_channels: urgent
      ? ["in_app", "push", "sms"]
      : completion
        ? ["in_app", "email"]
        : ["in_app", "push", "email"],
    acknowledgement: urgent
      ? "accountable_owner"
      : completion
        ? "none"
        : "recipient",
    escalation_after_minutes: urgent ? 30 : completion ? null : 240,
    bundle_policy: urgent ? "never_bundle" : "bundle",
    dedupe_key: `${workflow.id}:${transition.id}:scope:record`,
    resolution_condition: urgent
      ? `The record leaves ${transition.to} through an accountable canonical recovery or safe terminal disposition.`
      : `The accountable recipient acknowledges ${transition.id}, or a later canonical transition makes the notice informational history.`,
  };
};

const requirements = workflows.flatMap((workflow, workflowOffset) => {
  const localScenarios = scenariosByWorkflow.get(workflow.id) ?? [];
  const realizedTransitions =
    realizedTransitionsByWorkflow.get(workflow.id) ?? [];
  if (realizedTransitions.length === 0)
    throw new Error(`${workflow.id}: no scenario-realized transitions`);
  const allocations = allocateRequirementTransitions(
    realizedTransitions,
    workflow.id,
    workflow.states.at(-1)!,
  );
  return requirementProfiles.map((profile, profileIndex) => {
    const id = `REQ-${pad(workflowOffset * requirementProfiles.length + profileIndex + 1)}`;
    const selectedTransitions = allocations[profileIndex];
    const realizesCorrection = selectedTransitions.some(
      (transition) =>
        ["correction", "supersession"].includes(transition.kind) ||
        [transition.from, transition.to].some((state) =>
          /correct|supersed|revision|amend/.test(state ?? ""),
        ),
    );
    const effectiveProfile =
      profileIndex === 8 && !realizesCorrection
        ? {
            kind: "information_integrity",
            label: "Preserve authoritative record versions",
            statement:
              "Capture the exact source, actor, effective time, and base version for new evidence so a later correction can create an attributable successor without mutating history.",
          }
        : profile;
    const selectedTransitionIds = new Set(
      selectedTransitions.map((transition) => transition.id),
    );
    const linkedScenarios = localScenarios.filter(
      (scenario) =>
        scenario.requirement_ids.includes(id) &&
        scenarioTransitionIds(scenario, workflow.id).some((transitionId) =>
          selectedTransitionIds.has(transitionId),
        ),
    );
    if (linkedScenarios.length === 0)
      throw new Error(`${id}: no exact motivating scenario`);
    const scenario_ids = linkedScenarios.map((scenario) => scenario.id);
    const screen_ids = unique(
      selectedTransitions.map((transition) => {
        const screenId = screenIdByTransition.get(transition.id);
        if (!screenId) throw new Error(`${id}: no screen for ${transition.id}`);
        return screenId;
      }),
    );
    const decision_ids = unique(
      selectedTransitions.flatMap((transition) => transition.decision_ids),
    );
    const record_ids = unique(
      selectedTransitions.flatMap((transition) => [
        ...transition.record_reads,
        ...transition.record_writes,
      ]),
    );
    const role_ids = unique([
      ...selectedTransitions.map((transition) => transition.owner),
      ...decision_ids.map((decisionId) => decisionIndex.get(decisionId)?.owner),
    ]).filter((roleId): roleId is string => Boolean(roleId));
    return {
      id,
      title: `${workflow.id}: ${effectiveProfile.label}`,
      kind: effectiveProfile.kind,
      priority: [0, 1, 2, 3, 5, 7, 9].includes(profileIndex) ? "P0" : "P1",
      statement: `${effectiveProfile.statement} In ${workflow.name.toLowerCase()}, this contract applies to ${selectedTransitions.map((transition) => `${transition.from ?? "entry"} → ${transition.to}`).join(" and ")}.`,
      workflow_ids: [workflow.id],
      scenario_ids,
      role_ids,
      record_ids,
      decision_ids,
      transition_ids: selectedTransitions.map((transition) => transition.id),
      screen_ids,
      acceptance_criteria: [
        `Given a referenced full-season fixture, the interface resolves ${selectedTransitions.map((transition) => transition.id).join(" and ")} without inventing an unsupported state change.`,
        `The actor, authority, record inputs, generated evidence, effective time, and immutable audit consequence remain inspectable before and after the action.`,
        `A denied, offline, stale, corrected, or conflicting attempt receives an explicit recovery path and never silently overwrites canonical history.`,
      ],
      classification: "product_decision",
      status: "approved",
    };
  });
});

const requirementsByWorkflow = new Map(
  workflows.map((workflow) => [
    workflow.id,
    requirements.filter((requirement) =>
      requirement.workflow_ids.includes(workflow.id),
    ),
  ]),
);

const policyActionKindFor = (transition: Transition) => {
  if (transition.kind === "correction") return "correct";
  if (transition.kind === "supersession") return "supersede";
  if (
    transition.kind === "recovery" ||
    ["blocked", "delayed", "interrupted", "disputed", "noncompliant"].some(
      (part) => transition.from?.includes(part),
    )
  )
    return "resolve";
  return "advance";
};

const permissionRuleIdFor = (workflowId: string, actionKind: string) => {
  const base = (Number(workflowId.slice(-3)) - 1) * 6;
  const offset =
    {
      inspect: 1,
      advance: 2,
      resolve: 3,
      correct: 4,
      supersede: 5,
      deny: 6,
    }[actionKind] ?? 6;
  return `PERM-${pad(base + offset)}`;
};

const permissionRules = workflows.flatMap((workflow) => {
  const common = {
    workflow_ids: [workflow.id],
    organization_relationships: [
      "same_organization",
      ...(new Set(["WF-004", "WF-005", "WF-006", "WF-009"]).has(workflow.id)
        ? ["contract_grower" as const, "buyer_winery" as const]
        : []),
    ],
    effective_time_rule:
      "Role assignment, delegation, contract, and managed scope must all be effective when the action occurs.",
  };
  const inspectRule = {
    id: permissionRuleIdFor(workflow.id, "inspect"),
    effect: "allow",
    action_kind: "inspect",
    transition_ids: [],
    grants: [],
    role_ids: workflow.roles,
    scope_rule:
      "Read access is limited to records intersecting the actor's effective organization, contract, property, block, or assigned work scope.",
    record_state_rule:
      "Current and historical versions are visible; sensitivity filters may redact personnel or commercial fields.",
    delegation_rule:
      "Read delegation may widen managed scope only through an attributable, time-bounded assignment.",
    sensitivity: workflow.id === "WF-007" ? "personnel" : "operational",
    evidence_required: ["effective role assignment", "resolved scope identity"],
    audit_event: `permission.${workflow.id.toLowerCase().replaceAll("-", "")}.inspect`,
    denial_copy:
      "This record is outside your effective organization, contract, or delegated scope.",
    ...common,
  };
  const mutationRules = ["advance", "resolve", "correct", "supersede"].map(
    (actionKind) => {
      const transitions = workflow.transitions.filter(
        (transition) => policyActionKindFor(transition) === actionKind,
      );
      const owners = unique(transitions.map((transition) => transition.owner));
      return {
        id: permissionRuleIdFor(workflow.id, actionKind),
        effect: "allow",
        action_kind: actionKind,
        transition_ids: transitions.map((transition) => transition.id),
        grants: transitions.map((transition) => ({
          transition_id: transition.id,
          role_ids: [transition.owner],
          delegation: ["approval", "verification", "reconciliation"].includes(
            transition.kind,
          )
            ? "forbidden"
            : "explicit_assignment",
        })),
        role_ids: owners.length > 0 ? owners : workflow.roles,
        scope_rule:
          "The actor must own the exact transition or hold an explicit effective assignment for the affected operational scope.",
        record_state_rule:
          actionKind === "correct" || actionKind === "supersede"
            ? "The accepted action creates an attributable successor and preserves reciprocal predecessor lineage."
            : "The current server state and source record versions must match the exact transition precondition.",
        delegation_rule:
          "Delegation is evaluated per transition grant and never inferred from broad workflow visibility or edit access.",
        sensitivity: new Set(["WF-006", "WF-009"]).has(workflow.id)
          ? "commercial"
          : actionKind === "correct" || actionKind === "supersede"
            ? "regulated"
            : "operational",
        evidence_required: [
          "current state",
          "transition owner",
          "record version",
          "effective scope",
          ...(actionKind === "correct" || actionKind === "supersede"
            ? ["correction reason", "successor version"]
            : []),
        ],
        audit_event: `permission.${workflow.id.toLowerCase().replaceAll("-", "")}.${actionKind}`,
        denial_copy:
          "The exact transition grant, current state, effective scope, or required evidence did not resolve; request accountable review.",
        ...common,
      };
    },
  );
  const denyRule = {
    id: permissionRuleIdFor(workflow.id, "deny"),
    effect: "deny",
    action_kind: "advance",
    transition_ids: workflow.transitions.map((transition) => transition.id),
    grants: [],
    role_ids: workflow.roles,
    scope_rule:
      "This fallback applies whenever no exact allow grant resolves every contextual authorization dimension.",
    record_state_rule:
      "Unknown, stale, conflicting, superseded, or out-of-sequence state prevents consequential mutation.",
    delegation_rule:
      "No inferred, expired, transitive, or cross-organization delegation can override default denial.",
    sensitivity: "operational",
    evidence_required: ["denial reason", "missing authorization dimensions"],
    audit_event: `permission.${workflow.id.toLowerCase().replaceAll("-", "")}.deny`,
    denial_copy:
      "Action denied by default because one or more authority, scope, state, delegation, sensitivity, or time conditions did not resolve.",
    ...common,
  };
  return [inspectRule, ...mutationRules, denyRule];
});

const inferSemanticKind = (transition: Transition) => {
  const allowed = new Set([
    "observation",
    "recommendation",
    "approval",
    "assignment",
    "acknowledgement",
    "execution",
    "completion",
    "verification",
    "reconciliation",
    "correction",
    "supersession",
    "recovery",
  ]);
  if (allowed.has(transition.kind)) return transition.kind;
  if (transition.to.includes("correct")) return "correction";
  if (transition.to.includes("supersed")) return "supersession";
  if (transition.to.includes("verif")) return "verification";
  if (transition.to.includes("reconcil") || transition.to === "settled")
    return "reconciliation";
  if (
    ["complete", "completed", "effective", "certified", "archived"].some(
      (part) => transition.to.includes(part),
    )
  )
    return "completion";
  if (
    ["blocked", "delayed", "interrupted", "disputed", "noncompliant"].some(
      (part) => transition.from?.includes(part),
    )
  )
    return "recovery";
  return "execution";
};

const actionKindFor = (transition: Transition) => {
  return policyActionKindFor(transition);
};

const categoryToStateKind: Record<string, string> = {
  urgent: "urgent",
  blocked: "blocked",
  incomplete_information: "stale",
  correction: "corrected",
  cross_organization: "conflict",
  offline_delayed: "offline",
  supervisory_review: "partial",
  audit_historical: "historical",
  routine: "normal",
};

const allStateKinds = [
  "urgent",
  "blocked",
  "partial",
  "corrected",
  "historical",
  "offline",
  "stale",
  "conflict",
  "loading",
  "empty",
  "error",
  "read_only",
  "approval_pending",
  "rejected",
  "superseded",
  "delayed",
  "incomplete_information",
] as const;

const syncClassIdFor = (workflow: Workflow, transition: Transition) => {
  const semanticKind = inferSemanticKind(transition);
  if (
    [
      "approval",
      "verification",
      "reconciliation",
      "correction",
      "supersession",
    ].includes(semanticKind) ||
    [
      "accepted",
      "rejected",
      "submitted",
      "settled",
      "certified",
      "archived",
      "aligned",
      "payroll_accepted",
    ].some((state) => transition.to.includes(state)) ||
    (workflow.id === "WF-006" &&
      (transition.from === "quality_pending" ||
        ["accepted", "rejected", "downgraded"].includes(transition.to))) ||
    new Set(["WF-009", "WF-010"]).has(workflow.id)
  )
    return "SYNC-003";
  if (
    ["observation", "acknowledgement", "execution", "exception"].includes(
      semanticKind,
    )
  )
    return "SYNC-001";
  return "SYNC-002";
};

let actionCounter = 0;
const screens = screenSeeds.map((seed) => {
  const workflow = seed.workflow;
  const localScenarios = scenariosByWorkflow.get(workflow.id) ?? [];
  const selectedTransitions = transitionsByScreenId.get(seed.id) ?? [];
  const selectedTransitionIds = new Set(
    selectedTransitions.map((transition) => transition.id),
  );
  const assignedScenarios = localScenarios.filter((scenario) =>
    scenarioTransitionIds(scenario, workflow.id).some((transitionId) =>
      selectedTransitionIds.has(transitionId),
    ),
  );
  if (assignedScenarios.length === 0)
    throw new Error(`${seed.id}: no exact fixture-realized scenario`);
  const workflowRequirements = requirementsByWorkflow.get(workflow.id) ?? [];
  const requirement_ids = workflowRequirements
    .filter(
      (requirement) =>
        requirement.screen_ids.includes(seed.id) &&
        requirement.transition_ids.some((transitionId) =>
          selectedTransitionIds.has(transitionId),
        ),
    )
    .map((requirement) => requirement.id);
  const fixture_ids = unique(
    assignedScenarios.flatMap((scenario) => scenario.synthetic_fixture_refs),
  );
  const consequentialActions = selectedTransitions.map((transition) => {
    actionCounter += 1;
    const kind = actionKindFor(transition);
    const semanticKind = inferSemanticKind(transition);
    const matchingScenarioIds = assignedScenarios
      .filter((scenario) =>
        scenarioTransitionIds(scenario, workflow.id).includes(transition.id),
      )
      .map((scenario) => scenario.id);
    const permissionRuleId = permissionRuleIdFor(workflow.id, kind);
    const notificationRuleId = notificationIdByTransition.get(transition.id)!;
    const notificationRule = notificationContractFor(workflow, transition);
    const syncClassId = syncClassIdFor(workflow, transition);
    return {
      id: `ACT-${pad(actionCounter)}`,
      label: `${semanticKind === "recovery" ? "Resolve" : "Record"} ${transition.to.replaceAll("_", " ")}`,
      kind,
      semantic_kind: semanticKind,
      scenario_ids: matchingScenarioIds,
      evidence_status:
        matchingScenarioIds.length > 0
          ? "fixture_realized"
          : "canonical_branch",
      permission_rule_ids: [permissionRuleId],
      notification_rule_ids: [notificationRuleId],
      sync_class_id: syncClassId,
      transition: {
        workflow_id: workflow.id,
        transition_id: transition.id,
        from: transition.from,
        to: transition.to,
      },
      permission: {
        allowed_role_ids: [transition.owner],
        scope_match: new Set(["WF-004", "WF-005", "WF-006", "WF-009"]).has(
          workflow.id,
        )
          ? "cross_organization_contract"
          : "managed_scope",
        denied_behavior:
          "Keep the record read-only, name the unmet authority or state condition, and offer accountable escalation.",
        delegation: ["approval", "verification", "reconciliation"].includes(
          semanticKind,
        )
          ? "forbidden"
          : "explicit_assignment",
      },
      notifications: [
        {
          recipient_role_ids: notificationRule.recipient_role_ids,
          trigger: `${transition.id} is accepted into the canonical server event log`,
          channel: notificationRule.canonical_channel,
          urgency:
            notificationRule.severity === "information"
              ? "routine"
              : notificationRule.severity,
          acknowledgement_required: notificationRule.acknowledgement !== "none",
        },
      ],
      sync: {
        mode:
          syncClassId === "SYNC-003"
            ? "online"
            : syncClassId === "SYNC-001"
              ? "local_first"
              : "queueable",
        offline_capable: syncClassId !== "SYNC-003",
        conflict_policy:
          "Append the device event, compare base version and current server state, and require explicit reconciliation when they diverge.",
        idempotency_key_source:
          "device_id + local_event_id + actor_assignment_id + scope_id",
      },
      decision_ids: transition.decision_ids,
      record_reads: transition.record_reads,
      record_writes: transition.record_writes,
      audit: {
        event_kind: `workflow.${semanticKind}`,
        actor_attribution: "assignment_and_person",
        immutable: true,
        reason_required: ["correction", "supersession", "recovery"].includes(
          semanticKind,
        ),
        records_snapshot: true,
      },
    };
  });
  actionCounter += 1;
  const actions = [
    ...consequentialActions,
    {
      id: `ACT-${pad(actionCounter)}`,
      label: "Inspect attributable history",
      kind: "inspect",
      scenario_ids: assignedScenarios.map((scenario) => scenario.id),
      evidence_status: "fixture_realized",
      permission_rule_ids: [permissionRuleIdFor(workflow.id, "inspect")],
      notification_rule_ids: [],
      sync_class_id: "SYNC-001",
    },
  ];
  const extraKinds = unique(
    assignedScenarios.map(
      (scenario) => categoryToStateKind[scenario.category] ?? "normal",
    ),
  ).filter((kind) => !["normal", "completion"].includes(kind));
  const stateKinds = unique([
    "normal",
    ...extraKinds.slice(0, 2),
    allStateKinds[screenSeeds.indexOf(seed) % allStateKinds.length],
    "completion",
  ]);
  const recordIds = unique(
    selectedTransitions.flatMap((transition) => [
      ...transition.record_reads,
      ...transition.record_writes,
    ]),
  );
  return {
    contract_version: "2.0",
    id: seed.id,
    name: seed.name,
    platform: platformFor(seed.name),
    workflow_ids: [workflow.id],
    scenario_ids: assignedScenarios.map((scenario) => scenario.id),
    fixture_ids,
    requirement_ids,
    primary_role_ids: unique(
      selectedTransitions.map((transition) => transition.owner),
    ),
    review_role_ids: workflow.roles,
    information_architecture: {
      section: sectionFor(seed.local_index, seed.local_count),
      navigation_label: seed.name,
      parent_route: `/workflows/${workflow.id.toLowerCase()}`,
    },
    purpose: `${seed.name} supports ${workflow.name.toLowerCase()} by making current scope, evidence, authority, state, and accountable next actions explicit.`,
    primary_decision:
      workflow.decisions[seed.local_index % workflow.decisions.length].question,
    data_shown:
      recordIds.length > 0
        ? recordIds.map(
            (recordId) =>
              `${recordId} · ${recordIndex.get(recordId)?.name ?? "Canonical record"}`,
          )
        : [
            "Stable scope, canonical state, actor attribution, and transition prerequisites",
          ],
    actions,
    entry_points: unique([
      sectionFor(seed.local_index, seed.local_count) === "today"
        ? "Role-aware daily brief"
        : `${workflow.name} workspace`,
      "Notification deep link",
      "Stable record or block identity link",
    ]),
    exit_points: unique([
      `Next canonical state after ${selectedTransitions[0].id}`,
      "Attributable record history",
      "Accountable exception or approval queue",
    ]),
    states: stateKinds.map((kind) => ({
      id: kind,
      kind,
      description:
        kind === "normal"
          ? "Current evidence and authority resolve; valid actions are available for the canonical state."
          : kind === "completion"
            ? "The responsible actor can inspect terminal evidence, verification, and immutable history."
            : `The ${kind} condition is explicit, non-color-coded, attributable, and paired with a bounded recovery path.`,
    })),
    permission_behavior:
      "Consequential actions are denied by default and resolve from role, organization relationship, scope, state, transition ownership, delegation, sensitivity, and effective time.",
    offline_behavior:
      "Permitted field actions journal locally with visible sync state; online-only approvals remain disabled, and conflicts append evidence for explicit reconciliation.",
    validation_behavior:
      "The client and server both validate current state, source versions, required records, authority, effective time, units, and correction lineage before accepting an action.",
    component_ids: [] as string[],
    route: `/workflows/${workflow.id.toLowerCase()}/${slugify(seed.name)}`,
    figma_frame_name: `${seed.id} · ${seed.name} · ${platformFor(seed.name)}`,
  };
});

const componentAppliesToScreen = (
  componentId: string,
  screen: (typeof screens)[number],
) => {
  const name = screen.name.toLowerCase();
  const workflowId = screen.workflow_ids[0];
  const consequential = screen.actions.filter(
    (action) => action.kind !== "inspect",
  );
  const hasSemantic = (...kinds: string[]) =>
    consequential.some(
      (action) =>
        "semantic_kind" in action && kinds.includes(action.semantic_kind),
    );
  const hasScenarioCategory = (...categories: string[]) =>
    screen.scenario_ids.some((scenarioId) =>
      categories.includes(
        scenarios.find((scenario) => scenario.id === scenarioId)?.category ??
          "",
      ),
    );
  switch (componentId) {
    case "CMP-001":
      return /(queue|board|command|demand|portfolio|coverage|brief)/.test(name);
    case "CMP-002":
    case "CMP-003":
    case "CMP-004":
    case "CMP-005":
    case "CMP-006":
    case "CMP-007":
    case "CMP-014":
    case "CMP-036":
      return true;
    case "CMP-008":
      return consequential.some(
        (action) => "decision_ids" in action && action.decision_ids.length > 0,
      );
    case "CMP-009":
      return hasScenarioCategory("incomplete_information") || /gap/.test(name);
    case "CMP-010":
      return (
        hasScenarioCategory("urgent", "blocked") ||
        /exception|failure/.test(name)
      );
    case "CMP-011":
      return hasSemantic("recovery") || /recovery|corrective/.test(name);
    case "CMP-012":
      return (
        hasScenarioCategory("supervisory_review") ||
        /progress|workboard/.test(name)
      );
    case "CMP-013":
      return hasSemantic("correction", "supersession");
    case "CMP-015":
      return consequential.some(
        (action) =>
          "sync_class_id" in action && action.sync_class_id !== "SYNC-003",
      );
    case "CMP-016":
      return hasScenarioCategory("offline_delayed") || /sync/.test(name);
    case "CMP-017":
      return hasScenarioCategory("offline_delayed", "audit_historical");
    case "CMP-018":
    case "CMP-019":
      return /(today|brief|queue|command|exception|health)/.test(name);
    case "CMP-020":
      return workflowId === "WF-007" || /crew|assignment|dispatch/.test(name);
    case "CMP-021":
      return new Set(["WF-001", "WF-002", "WF-003", "WF-004", "WF-005"]).has(
        workflowId,
      );
    case "CMP-022":
      return /(plan|schedule|calendar|effective|timeline|authorization)/.test(
        name,
      );
    case "CMP-023":
      return new Set(["WF-004", "WF-005", "WF-010"]).has(workflowId);
    case "CMP-024":
      return /(trend|forecast|maturity|estimate|condition)/.test(name);
    case "CMP-025":
      return workflowId === "WF-004" || /forecast|estimate/.test(name);
    case "CMP-026":
      return new Set(["WF-001", "WF-002", "WF-003", "WF-004"]).has(workflowId);
    case "CMP-027":
      return (
        workflowId === "WF-006" && /load|transport|intake|harvest/.test(name)
      );
    case "CMP-028":
      return (
        workflowId === "WF-006" && /quality|intake|reconciliation/.test(name)
      );
    case "CMP-029":
      return new Set(["WF-004", "WF-005", "WF-006", "WF-009"]).has(workflowId);
    case "CMP-030":
    case "CMP-031":
      return workflowId === "WF-010";
    case "CMP-032":
      return (
        new Set(["WF-009", "WF-010"]).has(workflowId) ||
        /corrective|finding/.test(name)
      );
    case "CMP-033":
      return hasSemantic("approval", "verification");
    case "CMP-034":
      return (
        hasSemantic("reconciliation") ||
        /reconciliation|settlement|cost/.test(name)
      );
    case "CMP-035":
      return /(evidence|history|archive|review|settlement)/.test(name);
    default:
      return false;
  }
};

for (const screen of screens)
  screen.component_ids = componentSeeds
    .map((_, index) => `CMP-${pad(index + 1)}`)
    .filter((componentId) => componentAppliesToScreen(componentId, screen));

const notifications = workflows.flatMap((workflow) =>
  workflow.transitions.map((transition) =>
    notificationContractFor(workflow, transition),
  ),
);
let stateCounter = 0;
const stateMatrix = screens.flatMap((screen) => {
  const workflow = workflowIndex.get(screen.workflow_ids[0])!;
  const consequential = screen.actions.filter(
    (action) => action.kind !== "inspect",
  );
  const inspectActions = screen.actions.filter(
    (action) => action.kind === "inspect",
  );
  const makeState = (
    kind: string,
    canonicalState: string | null,
    sourceRef: JsonObject,
    availableConsequential: typeof consequential,
  ) => {
    stateCounter += 1;
    const available = [...inspectActions, ...availableConsequential];
    const availableIds = new Set(available.map((action) => action.id));
    const blocked = consequential.filter(
      (action) => !availableIds.has(action.id),
    );
    const permissionRuleIds = unique([
      ...available.flatMap((action) =>
        "permission_rule_ids" in action ? action.permission_rule_ids : [],
      ),
      ...(blocked.length > 0 ? [permissionRuleIdFor(workflow.id, "deny")] : []),
    ]);
    const constrained = blocked.length > 0;
    return {
      id: `STM-${pad(stateCounter, 4)}`,
      screen_id: screen.id,
      kind,
      canonical_state: canonicalState,
      source_ref: sourceRef,
      trigger:
        kind === "normal"
          ? `The canonical record is in ${canonicalState ?? "entry"}; current scope, evidence versions, and actor authority resolve.`
          : kind === "completion"
            ? "The workflow reaches its accountable terminal disposition with required evidence present."
            : `The screen detects or receives a ${kind.replaceAll("_", " ")} condition for its active scope.`,
      information_priority: [
        `Name the ${kind.replaceAll("_", " ")} condition and affected operational scope`,
        "Show current server state, record versions, actor, effective time, and immutable predecessor evidence",
        constrained
          ? "Explain which action is blocked and the exact recovery or escalation owner"
          : "Expose the valid next action and evidence required for accountable completion",
      ],
      available_actions: available.map((action) => action.id),
      blocked_actions: blocked.map((action) => action.id),
      permission_rule_ids: permissionRuleIds,
      sync_behavior:
        kind === "offline"
          ? "Retain the device journal and disclose pending sync; never imply server acceptance before reconciliation."
          : kind === "conflict"
            ? "Preserve both device and server events and require an attributable resolution or successor correction."
            : "Use the current server event log and disclose any pending local journal entries for this scope.",
      audit_behavior:
        "State presentation and any user response retain actor, assignment, organization, record versions, occurred time, captured time, and reason.",
      recovery: constrained
        ? `Keep consequential actions unavailable until the ${kind.replaceAll("_", " ")} condition is resolved, corrected, or escalated by an authorized owner.`
        : "Advance only through the displayed canonical transition and return to attributable history after acceptance.",
      accessibility_announcement: `${screen.name}: ${kind.replaceAll("_", " ")} state. Scope, consequence, and available recovery are announced before actions.`,
    };
  };

  const normalContracts = unique(
    consequential.map((action) =>
      "transition" in action ? action.transition.from : null,
    ),
  ).map((canonicalState) => {
    const available = consequential.filter(
      (action) =>
        "transition" in action && action.transition.from === canonicalState,
    );
    const example = available[0];
    const exampleScenario =
      example && "scenario_ids" in example
        ? scenarios.find((scenario) =>
            example.scenario_ids.includes(scenario.id),
          )
        : undefined;
    const exampleStep = exampleScenario?.operational_steps.find(
      (step) =>
        "transition" in example &&
        step.transition_id === example.transition.transition_id &&
        step.from_state === canonicalState,
    );
    return makeState(
      "normal",
      canonicalState,
      exampleScenario && exampleStep
        ? {
            type: "operational",
            scenario_id: exampleScenario.id,
            fixture_id: exampleStep.fixture_ref.fixture_id,
            event_id: exampleStep.event_id,
            rationale:
              "Exact full-season event realizes this canonical current-state action set.",
          }
        : {
            type: "canonical",
            scenario_id: null,
            fixture_id: null,
            event_id: null,
            rationale:
              "The ontology defines this branch, but the current 2026 fixture set does not realize it.",
          },
      available,
    );
  });

  const conditionContracts = screen.states
    .map((state) => state.kind)
    .filter((kind) => !["normal", "completion"].includes(kind))
    .map((kind) => {
      const sourceScenario = screen.scenario_ids
        .map((scenarioId) =>
          scenarios.find((scenario) => scenario.id === scenarioId),
        )
        .find(
          (scenario) =>
            scenario &&
            (categoryToStateKind[scenario.category] ?? "normal") === kind,
        );
      const sourceStep = sourceScenario?.operational_steps.find((step) =>
        consequential.some(
          (action) =>
            "transition" in action &&
            action.transition.transition_id === step.transition_id,
        ),
      );
      const canonicalState = sourceStep?.to_state ?? null;
      const available = sourceStep
        ? consequential.filter(
            (action) =>
              "transition" in action &&
              action.transition.from === canonicalState,
          )
        : [];
      return makeState(
        kind,
        canonicalState,
        sourceScenario && sourceStep
          ? {
              type: "operational",
              scenario_id: sourceScenario.id,
              fixture_id: sourceStep.fixture_ref.fixture_id,
              event_id: sourceStep.event_id,
              rationale: `${sourceScenario.id} realizes the ${kind.replaceAll("_", " ")} condition on this screen.`,
            }
          : {
              type: "ui",
              scenario_id: null,
              fixture_id: null,
              event_id: null,
              rationale: `${kind.replaceAll("_", " ")} is a product-system presentation state rather than a claimed operational event for this screen.`,
            },
        available,
      );
    });

  const terminalState = workflow.states.at(-1)!;
  const completionActions = consequential.filter(
    (action) =>
      "transition" in action &&
      action.transition.from === terminalState &&
      ["correct", "supersede"].includes(action.kind),
  );
  const completionContract = makeState(
    "completion",
    terminalState,
    {
      type: "canonical",
      scenario_id: null,
      fixture_id: null,
      event_id: null,
      rationale:
        "The workflow terminal state permits inspection and only an explicit canonical correction or supersession from that state.",
    },
    completionActions,
  );
  return [...normalContracts, ...conditionContracts, completionContract];
});

const actionLocationByTransition = new Map<
  string,
  {
    screen: (typeof screens)[number];
    action: (typeof screens)[number]["actions"][number];
  }
>();
for (const screen of screens)
  for (const action of screen.actions)
    if (action.kind !== "inspect" && "transition" in action)
      actionLocationByTransition.set(action.transition.transition_id, {
        screen,
        action,
      });

const nonIdealStep = (step: Scenario["operational_steps"][number]) =>
  ["correction", "supersession", "recovery", "exception"].includes(
    step.semantic_kind,
  ) ||
  [
    "blocked",
    "delayed",
    "disputed",
    "correction_required",
    "noncompliant",
    "certification_withheld",
    "paused",
    "rejected",
    "partially_completed",
  ].some((state) => step.to_state.includes(state));

const makeFlowStep = (
  scenario: Scenario,
  step: Scenario["operational_steps"][number],
  intent: string,
  outcome: string,
) => {
  const location = actionLocationByTransition.get(step.transition_id);
  if (!location)
    throw new Error(`${scenario.id}: no action for ${step.transition_id}`);
  const workflow = workflowIndex.get(location.screen.workflow_ids[0])!;
  const transition = workflow.transitions.find(
    (candidate) => candidate.id === step.transition_id,
  )!;
  return {
    screen_id: location.screen.id,
    action_id: location.action.id,
    actor_role_id: transition.owner,
    scenario_id: scenario.id,
    fixture_id: step.fixture_ref.fixture_id,
    event_id: step.event_id,
    transition_id: step.transition_id,
    record_instance_ids: unique([...step.record_reads, ...step.record_writes]),
    intent,
    outcome,
  };
};

const flows = workflows.map((workflow, workflowOffset) => {
  const localScenarios = (scenariosByWorkflow.get(workflow.id) ?? []).filter(
    (scenario) => scenario.workflow_ids.length === 1,
  );
  const scenario = [...localScenarios].sort(
    (left, right) =>
      right.operational_steps.length - left.operational_steps.length ||
      left.id.localeCompare(right.id),
  )[0];
  const path = scenario.operational_steps;
  const exceptionIndex = Math.max(
    0,
    path.findIndex(nonIdealStep) >= 0
      ? path.findIndex(nonIdealStep)
      : Math.floor(path.length / 2),
  );
  const entry = makeFlowStep(
    scenario,
    path[0],
    "Open exact current work and its stable scope",
    `${path[0].event_id} exposes the attributable ${path[0].to_state} state`,
  );
  const normal = path
    .slice(0, Math.min(3, path.length))
    .map((step) =>
      makeFlowStep(
        scenario,
        step,
        `Perform ${step.transition_id} from the current canonical state`,
        `${step.event_id} records ${step.from_state ?? "entry"} → ${step.to_state}`,
      ),
    );
  const exception = makeFlowStep(
    scenario,
    path[exceptionIndex],
    "Contain the exact non-ideal state and preserve accepted evidence",
    `${path[exceptionIndex].event_id} remains attributable and bounded`,
  );
  const recoveryStep = path[Math.min(path.length - 1, exceptionIndex + 1)];
  const recovery = makeFlowStep(
    scenario,
    recoveryStep,
    "Apply the next exact recovery or accountable disposition",
    `${recoveryStep.event_id} advances only through ${recoveryStep.transition_id}`,
  );
  const completionStep = path.at(-1)!;
  const completion = makeFlowStep(
    scenario,
    completionStep,
    "Confirm terminal evidence and immutable lineage",
    `${completionStep.event_id} records the scenario terminal ${completionStep.to_state}`,
  );
  const usedSteps = [entry, ...normal, exception, recovery, completion];
  return {
    id: `FLW-${pad(workflowOffset + 1)}`,
    title: `${scenario.title}: exact operational interaction flow`,
    workflow_ids: [workflow.id],
    scenario_ids: [scenario.id],
    fixture_ids: scenario.synthetic_fixture_refs,
    operational_chain_ids: scenario.operational_chain_ids,
    record_link_ids: scenario.record_link_ids,
    platforms: unique(
      usedSteps.map(
        (step) =>
          screens.find((screen) => screen.id === step.screen_id)!.platform,
      ),
    ),
    entry_points: [entry],
    normal_path: normal,
    exception_path: [exception],
    recovery_path: [recovery],
    completion_path: [completion],
    screen_ids: unique(usedSteps.map((step) => step.screen_id)),
    handoff_role_ids: unique([
      ...usedSteps.map((step) => step.actor_role_id),
      ...workflow.roles,
    ]),
    offline_behavior:
      "Each step uses its action's canonical SYNC class; field capture may journal locally, while commitments and terminal authority require current server acceptance.",
  };
});

const crossScenarios = scenarios.filter(
  (scenario) => scenario.workflow_ids.length > 1,
);
crossScenarios.forEach((scenario, index) => {
  const path = scenario.operational_steps;
  const segmentFirsts = unique(
    path.map((step) => step.fixture_ref.workflow_instance_id),
  ).map((workflowInstanceId) =>
    path.find(
      (step) => step.fixture_ref.workflow_instance_id === workflowInstanceId,
    )!,
  );
  const segmentTerminals = unique(
    path.map((step) => step.fixture_ref.workflow_instance_id),
  ).map((workflowInstanceId) =>
    path
      .filter(
        (step) => step.fixture_ref.workflow_instance_id === workflowInstanceId,
      )
      .at(-1)!,
  );
  const exceptionIndex = Math.max(
    0,
    path.findIndex(nonIdealStep) >= 0
      ? path.findIndex(nonIdealStep)
      : Math.floor(path.length / 2),
  );
  const entry = makeFlowStep(
    scenario,
    segmentFirsts[0],
    "Open the first explicit workflow path and its stable evidence",
    `${segmentFirsts[0].event_id} anchors the first independent path segment`,
  );
  const normal = segmentFirsts.map((step) =>
    makeFlowStep(
      scenario,
      step,
      "Open a separately ordered workflow segment",
      `${step.event_id} begins a path connected only by the declared record links or operational chain`,
    ),
  );
  const exceptionStep = path[exceptionIndex];
  const exception = makeFlowStep(
    scenario,
    exceptionStep,
    "Contain the exact cross-workflow discrepancy",
    `${exceptionStep.event_id} stays independent from other path chronologies`,
  );
  const recoveryStep = path[Math.min(path.length - 1, exceptionIndex + 1)];
  const recovery = makeFlowStep(
    scenario,
    recoveryStep,
    "Append the exact recovery, correction, or successor evidence",
    `${recoveryStep.event_id} preserves the predecessor and declared boundary links`,
  );
  const completions = segmentTerminals.map((step) =>
    makeFlowStep(
      scenario,
      step,
      "Confirm this path segment's own terminal evidence",
      `${step.event_id} satisfies ${step.fixture_ref.workflow_instance_id} without flattening chronology`,
    ),
  );
  const usedSteps = [entry, ...normal, exception, recovery, ...completions];
  flows.push({
    id: `FLW-${pad(workflows.length + index + 1)}`,
    title: `${scenario.title}: linked multi-path evidence flow`,
    workflow_ids: scenario.workflow_ids,
    scenario_ids: [scenario.id],
    fixture_ids: scenario.synthetic_fixture_refs,
    operational_chain_ids: scenario.operational_chain_ids,
    record_link_ids: scenario.record_link_ids,
    platforms: unique(
      usedSteps.map(
        (step) =>
          screens.find((screen) => screen.id === step.screen_id)!.platform,
      ),
    ),
    entry_points: [entry],
    normal_path: normal,
    exception_path: [exception],
    recovery_path: [recovery],
    completion_path: completions,
    screen_ids: unique(usedSteps.map((step) => step.screen_id)),
    handoff_role_ids: unique([
      ...usedSteps.map((step) => step.actor_role_id),
      ...scenario.role_ids,
    ]),
    offline_behavior:
      "Offline source evidence may synchronize later, but cross-organization commitments use current server authority and only explicit record links or chains connect path segments.",
  });
});

const domains = domainSeeds.map((domain, index) => ({
  id: `DOM-${pad(index + 1, 2)}`,
  name: domain.name,
  purpose: domain.purpose,
  workflow_ids: domain.workflow_ids,
  primary_entity_types: domain.entities,
  accountable_role_ids: domain.owners,
  screen_ids: screens
    .filter((screen) =>
      screen.workflow_ids.some((workflowId) =>
        domain.workflow_ids.includes(workflowId),
      ),
    )
    .map((screen) => screen.id),
  integration_seams: domain.seams,
}));

const componentRequirements = componentSeeds.map(([name, category], index) => {
  const id = `CMP-${pad(index + 1)}`;
  const referencedScreens = screens.filter((screen) =>
    screen.component_ids.includes(id),
  );
  if (referencedScreens.length === 0)
    throw new Error(`${id}: component need mapping resolved no screen`);
  const screen_ids = referencedScreens.map((screen) => screen.id);
  const categoryPurpose: Record<string, string> = {
    workflow:
      "Expose exact transition ownership, preconditions, evidence, and canonical next-state consequences.",
    navigation:
      "Preserve role, scope, location, and history context while users move between operational responsibilities.",
    identity:
      "Keep stable block, organization, contract, load, and actor identity visible at consequential boundaries.",
    record:
      "Present immutable record versions, provenance, corrections, comparisons, and reciprocal lineage.",
    status:
      "Communicate operational state, completeness, urgency, and progress through redundant non-color cues.",
    decision:
      "Structure current evidence, missing facts, accountable authority, and explicit decision outcomes.",
    exception:
      "Contain non-ideal scope, name the owner and clock, and expose only bounded recovery actions.",
    sync: "Disclose device journal, server acceptance, staleness, conflict, and idempotent reconciliation state.",
    feedback:
      "Deliver attributable notification, escalation, acknowledgement, and export consequences without interrupting unrelated work.",
    input:
      "Capture stable scope, values, units, and effective time with validation before consequential submission.",
    data_visualization:
      "Make comparison, uncertainty, coverage, and trend evidence inspectable without encoding meaning by color alone.",
  };
  const categoryAccessibility: Record<string, string> = {
    workflow:
      "Actions are keyboard reachable, announce owner and state consequence, and expose disabled reasons before activation.",
    navigation:
      "Landmarks, current location, scope changes, and focus restoration are programmatically identified.",
    identity:
      "Stable identifiers and aliases are textual, copyable, and announced before any scope switch.",
    record:
      "Version order, predecessor/successor relations, and changes are available as structured text and tables.",
    status:
      "Status uses text, icon, shape, and live-region announcements; motion and color are never required to understand it.",
    decision:
      "Evidence groups have headings, missing facts are enumerated, and the decision consequence is announced on confirmation.",
    exception:
      "Urgency, affected scope, blocked actions, owner, and recovery steps are announced in that order.",
    sync: "Pending, accepted, stale, and conflict states use polite live regions and never steal focus during background sync.",
    feedback:
      "Notifications are navigable by severity and time; urgent acknowledgement remains operable by keyboard and touch.",
    input:
      "Labels, units, formats, errors, and correction guidance are associated with controls and persist after validation.",
    data_visualization:
      "Every chart has a structured table or summary, named axes and units, and a non-color representation of series and thresholds.",
  };
  return {
    id,
    name,
    category,
    purpose: `${name}: ${categoryPurpose[category]}`,
    screen_ids,
    required_variants: unique([
      "desktop",
      "mobile",
      category === "exception" || category === "sync"
        ? "high_consequence"
        : category === "data_visualization"
          ? "dense_evidence"
          : "standard",
    ]),
    required_states: unique([
      "normal",
      "disabled",
      ...(category === "exception" || category === "sync"
        ? ["urgent", "conflict", "resolved"]
        : category === "decision"
          ? ["incomplete", "ready", "denied"]
          : category === "record"
            ? ["current", "corrected", "superseded", "historical"]
            : ["loading", "error"]),
    ]),
    accessibility_contract: categoryAccessibility[category],
    figma_key: `vineyard/${category.replaceAll("_", "-")}/${slugify(name)}`,
    status: index === 0 ? "implemented" : "planned",
  };
});

const informationArchitecture = {
  schema_version: "1.0",
  principles: [
    "Stable scope identity precedes workflow state and actions.",
    "Today is role-aware; records and history remain entity-centered and durable.",
    "Exceptions are filtered views over canonical workflow state, not a parallel task system.",
    "Desktop plans and supervises; mobile executes and captures; both share the same event and record contracts.",
    "Cross-organization views reveal authority and provenance at every handoff.",
  ],
  global_sections: [
    {
      id: "today",
      label: "Today",
      route: "/today",
      purpose:
        "Role-aware priorities, clocks, pending acknowledgements, and sync consequences",
    },
    {
      id: "plan",
      label: "Plan",
      route: "/plan",
      purpose:
        "Seasonal, daily, crop, labor, resource, forecast, and evidence planning",
    },
    {
      id: "execute",
      label: "Execute",
      route: "/execute",
      purpose:
        "Assigned field and operational actions with offline-safe capture",
    },
    {
      id: "verify",
      label: "Verify",
      route: "/verify",
      purpose:
        "Approvals, verification, reconciliation, acceptance, and certification",
    },
    {
      id: "records",
      label: "Records",
      route: "/records",
      purpose:
        "Stable block, contract, work, sample, load, evidence, and audit lineage",
    },
    {
      id: "exceptions",
      label: "Exceptions",
      route: "/exceptions",
      purpose:
        "Blocked, delayed, stale, conflict, correction, dispute, and corrective-action queues",
    },
    {
      id: "administration",
      label: "Administration",
      route: "/administration",
      purpose:
        "Organizations, roles, scope, delegation, integrations, and policy",
    },
  ],
  entity_routes: [
    "organizations/:organizationId",
    "properties/:propertyId",
    "blocks/:blockId",
    "contracts/:contractId",
    "workflows/:workflowId/instances/:workflowInstanceId",
    "records/:recordInstanceId",
    "exceptions/:exceptionHistoryId",
    "people/:personId/assignments/:assignmentId",
  ],
  screen_routes: screens.map((screen) => ({
    screen_id: screen.id,
    route: screen.route,
    section: screen.information_architecture.section,
    parent_route: screen.information_architecture.parent_route,
  })),
};

const navigationModels = {
  schema_version: "1.0",
  desktop: {
    shell:
      "Persistent global section rail, scoped context header, work area, and non-modal sync/notification status",
    default_entry: "/today",
    patterns: [
      "global section",
      "workflow workspace",
      "entity history",
      "cross-scope comparison",
      "exception queue",
    ],
  },
  mobile: {
    shell:
      "Today, assignments, capture, exceptions, and sync queue with explicit current scope",
    default_entry: "/today",
    patterns: [
      "next assignment",
      "single-field capture",
      "scan/select identity",
      "offline journal",
      "handoff acknowledgement",
    ],
  },
  role_entries: roles.map((role) => {
    const roleScreens = screens.filter(
      (screen) =>
        screen.primary_role_ids.includes(role.id) ||
        screen.review_role_ids.includes(role.id),
    );
    return {
      role_id: role.id,
      home_route: "/today",
      workflow_ids: role.workflow_ids,
      primary_screen_ids: roleScreens.map((screen) => screen.id),
      exception_route: `/exceptions?role=${role.id}`,
    };
  }),
};

const roleSurfaceMatrix = {
  schema_version: "1.0",
  rows: roles.flatMap((role) =>
    role.workflow_ids.map((workflowId) => {
      const relevantScreens = screens.filter(
        (screen) =>
          screen.workflow_ids.includes(workflowId) &&
          (screen.primary_role_ids.includes(role.id) ||
            screen.review_role_ids.includes(role.id) ||
            screen.actions.some(
              (action) =>
                "permission" in action &&
                action.permission.allowed_role_ids.includes(role.id),
            )),
      );
      return {
        role_id: role.id,
        workflow_id: workflowId,
        responsibility:
          relevantScreens.length > 0 ? "act_and_review" : "inspect_and_handoff",
        desktop_screen_ids: relevantScreens
          .filter((screen) => screen.platform !== "mobile")
          .map((screen) => screen.id),
        mobile_screen_ids: relevantScreens
          .filter((screen) => screen.platform !== "desktop")
          .map((screen) => screen.id),
        permission_rule_ids: permissionRules
          .filter(
            (rule) =>
              rule.workflow_ids.includes(workflowId) &&
              rule.role_ids.includes(role.id),
          )
          .map((rule) => rule.id),
      };
    }),
  ),
};

const platformMatrix = {
  schema_version: "1.0",
  responsibilities: {
    mobile: [
      "assignment acknowledgement",
      "identity confirmation",
      "field capture",
      "safe partial reporting",
      "offline journal",
      "exception escalation",
    ],
    desktop: [
      "multi-scope planning",
      "comparison",
      "approval",
      "cross-organization review",
      "reconciliation",
      "evidence packaging",
    ],
    responsive: [
      "daily brief",
      "workflow detail",
      "record history",
      "notifications",
      "exception recovery",
    ],
    print: [
      "field instruction",
      "posting",
      "transport affidavit",
      "audit evidence index",
    ],
  },
  screens: screens.map((screen) => ({
    screen_id: screen.id,
    primary_platform: screen.platform,
    mobile_responsibility:
      screen.platform === "desktop"
        ? "read_only_summary_and_deep_link"
        : "full_or_bounded_action",
    desktop_responsibility:
      screen.platform === "mobile"
        ? "supervisory_monitor_and_history"
        : "full_planning_and_review",
    offline_class: screen.actions.some(
      (action) =>
        "sync_class_id" in action && action.sync_class_id === "SYNC-001",
    )
      ? "offline_safe"
      : screen.actions.some(
            (action) =>
              "sync_class_id" in action && action.sync_class_id === "SYNC-002",
          )
        ? "offline_conditional"
        : "online_required",
  })),
};

const scopeBoundary = {
  schema_version: "1.0",
  objective:
    "Make vineyard operations understandable, actionable, attributable, recoverable, and visually buildable from seasonal intent through evidence-backed closure.",
  included: [
    "Workflow planning, dispatch, execution, verification, and exception recovery",
    "Scouting, crop protection, irrigation, forecast, maturity, harvest, labor, materials, growers, and certification",
    "Stable estate and contract-fruit scope identity with block aliases and lineage",
    "Role, organization, contract, scope, state, delegation, sensitivity, and time-aware permissions",
    "Append-only events, corrections, supersessions, offline journals, conflicts, notifications, audit history, and evidence exports",
    "Responsive desktop supervision and mobile field capture against one canonical model",
  ],
  excluded: [
    "General ledger, bank settlement, tax filing, and complete ERP functionality",
    "Payroll calculation, benefits administration, and employment-system-of-record ownership",
    "Laboratory instrumentation control or authoritative LIMS ownership",
    "Weather forecasting, sensor telemetry ingestion infrastructure, and agronomic model training",
    "Contract authoring legal advice, e-signature system-of-record ownership, and payment rails",
    "Regulator or certifier decision systems; the product prepares and exchanges evidence but does not impersonate outside authority",
  ],
  integration_seams: [
    {
      system: "identity_provider",
      direction: "inbound",
      contract:
        "people, organization membership, and authentication assertions",
    },
    {
      system: "weather_and_sensors",
      direction: "inbound",
      contract: "timestamped observations with source and quality metadata",
    },
    {
      system: "laboratory",
      direction: "bidirectional",
      contract:
        "sample identity, custody status, results, units, and correction lineage",
    },
    {
      system: "payroll_and_finance",
      direction: "outbound",
      contract:
        "verified time, cost allocation, delivery, adjustment, and settlement evidence",
    },
    {
      system: "winery_intake",
      direction: "bidirectional",
      contract:
        "slot, load identity, weight, quality disposition, correction, and receipt evidence",
    },
    {
      system: "regulator_and_certifier",
      direction: "bidirectional",
      contract:
        "versioned submissions, acknowledgements, findings, and certification decisions",
    },
  ],
};

const syncModel = {
  schema_version: "1.0",
  authority: {
    server_event_log:
      "Canonical append-only ordering, authorization, record-version lineage, and accepted workflow state",
    device_journal:
      "Durable local intent and evidence captured before server acknowledgement",
    projection:
      "Rebuildable current-state and query views derived from accepted events",
  },
  classes: [
    {
      id: "SYNC-001",
      name: "offline_safe",
      permits: [
        "observation",
        "acknowledgement",
        "execution evidence",
        "partial result",
        "exception report",
        "photo or note attachment",
      ],
      constraints:
        "Actor assignment and scope were cached while effective; action cannot assert approval, acceptance, reconciliation, settlement, or certification.",
    },
    {
      id: "SYNC-002",
      name: "offline_conditional",
      permits: [
        "assignment detail edits",
        "completion report",
        "correction draft",
        "sample custody handoff",
        "load creation",
      ],
      constraints:
        "Queue locally but require current server state, base record versions, authority, and duplicate detection before acceptance.",
    },
    {
      id: "SYNC-003",
      name: "online_required",
      permits: [
        "approval",
        "verification",
        "cross-organization authorization",
        "quality disposition",
        "reconciliation",
        "settlement",
        "submission",
        "certification",
      ],
      constraints:
        "Disable consequential commitment until fresh server state, effective authority, and all required evidence resolve.",
    },
  ],
  idempotency:
    "Every device event uses device_id + local_event_id + actor_assignment_id + scope_id; retries return the existing server event.",
  conflict_rules: [
    "Never discard a device event because the server state advanced; retain it as evidence with conflict status.",
    "Never use last-write-wins for workflow state, quantities, identity, authority, restrictions, or correction lineage.",
    "Auto-merge only disjoint attachments or notes that do not change canonical state or record meaning.",
    "When base state or version differs, require an authorized actor to accept as successor, attach as historical evidence, reapply to current scope, or reject with reason.",
    "A resolved conflict emits its own immutable event and reciprocal predecessor/successor references where records change.",
  ],
  stale_policy:
    "Display data age, source age, last successful sync, and impacted decisions. Disable actions whose evidence freshness window or authority lease has expired.",
};

const transitionDispositions = workflows.flatMap((workflow) =>
  workflow.transitions.map((transition) => {
    const location = actionLocationByTransition.get(transition.id);
    if (!location)
      throw new Error(`${transition.id}: missing product disposition`);
    const scenarioIds =
      "scenario_ids" in location.action ? location.action.scenario_ids : [];
    return {
      transition_id: transition.id,
      workflow_id: workflow.id,
      owner_role_id: transition.owner,
      disposition: "user_action",
      screen_id: location.screen.id,
      action_id: location.action.id,
      scenario_ids: scenarioIds,
      fixture_evidence_status:
        scenarioIds.length > 0 ? "fixture_realized" : "canonical_only",
      rationale:
        scenarioIds.length > 0
          ? "The transition is exposed as an exact action and realized by the listed full-season scenarios."
          : "The transition remains a canonical user action even though the current deterministic season does not realize this alternate branch.",
    };
  }),
);

const relationships: Array<JsonObject> = [];
let relationshipCounter = 0;
const addRelationship = (
  from: string,
  to: string,
  relationship: string,
  rationale: string,
) => {
  relationshipCounter += 1;
  relationships.push({
    id: `PRL-${pad(relationshipCounter, 4)}`,
    from,
    to,
    relationship,
    rationale,
  });
};
for (const scenario of scenarios)
  for (const requirementId of scenario.requirement_ids)
    addRelationship(
      scenario.id,
      requirementId,
      "motivates",
      `${scenario.id} supplies fixture-backed operational pressure and acceptance evidence for ${requirementId}.`,
    );
for (const requirement of requirements)
  for (const screenId of requirement.screen_ids)
    addRelationship(
      requirement.id,
      screenId,
      "realized_by",
      `${screenId} exposes the decision, evidence, state, and action contract required by ${requirement.id}.`,
    );
for (const screen of screens) {
  for (const componentId of screen.component_ids)
    addRelationship(
      screen.id,
      componentId,
      "composed_with",
      `${componentId} provides a reusable semantic interaction needed by ${screen.id}.`,
    );
  for (const action of screen.actions) {
    addRelationship(
      screen.id,
      action.id,
      "offers",
      `${screen.id} exposes ${action.id} within current-state, evidence, and authority constraints.`,
    );
    if ("permission_rule_ids" in action)
      for (const permissionRuleId of action.permission_rule_ids)
        addRelationship(
          action.id,
          permissionRuleId,
          "authorized_by",
          `${action.id} resolves the exact transition grant in ${permissionRuleId}.`,
        );
    if ("notification_rule_ids" in action)
      for (const notificationRuleId of action.notification_rule_ids)
        addRelationship(
          action.id,
          notificationRuleId,
          "notifies_by",
          `${action.id} emits its canonical notification consequence through ${notificationRuleId}.`,
        );
    if ("sync_class_id" in action)
      addRelationship(
        action.id,
        action.sync_class_id,
        "synchronizes_by",
        `${action.id} uses the canonical acceptance and replay contract in ${action.sync_class_id}.`,
      );
  }
}

const mermaidId = (id: string) => id.replaceAll("-", "_");
const domainMap = [
  "flowchart LR",
  ...domains.map((domain) => `  ${mermaidId(domain.id)}["${domain.name}"]`),
  ...workflows.map(
    (workflow) =>
      `  ${mermaidId(workflow.id)}["${workflow.id} · ${workflow.name}"]`,
  ),
  ...domains.flatMap((domain) =>
    domain.workflow_ids.map(
      (workflowId) => `  ${mermaidId(domain.id)} --> ${mermaidId(workflowId)}`,
    ),
  ),
  "",
].join("\n");
const navigationMap = [
  "flowchart TD",
  '  TODAY["Today · role-aware command"]',
  '  PLAN["Plan"]',
  '  EXECUTE["Execute"]',
  '  VERIFY["Verify"]',
  '  RECORDS["Records and history"]',
  '  EXCEPTIONS["Exceptions and recovery"]',
  '  ADMIN["Administration"]',
  "  TODAY --> PLAN",
  "  PLAN --> EXECUTE",
  "  EXECUTE --> VERIFY",
  "  VERIFY --> RECORDS",
  "  EXECUTE --> EXCEPTIONS",
  "  EXCEPTIONS --> EXECUTE",
  "  ADMIN -. scope and authority .-> TODAY",
  "",
].join("\n");
const permissionMap = [
  "flowchart LR",
  '  ACTOR["Actor assignment"] --> REL["Organization relationship"]',
  '  REL --> SCOPE["Effective scope"]',
  '  SCOPE --> STATE["Current state and versions"]',
  '  STATE --> OWNER["Transition owner"]',
  '  OWNER --> DELEGATION["Delegation"]',
  '  DELEGATION --> SENSITIVITY["Sensitivity"]',
  '  SENSITIVITY --> TIME["Effective time"]',
  '  TIME -->|all resolve| ALLOW["Allow and append audit event"]',
  '  TIME -->|any unresolved| DENY["Default deny with reason and escalation"]',
  "",
].join("\n");
const syncMap = [
  "sequenceDiagram",
  "  participant U as Field user",
  "  participant D as Device journal",
  "  participant S as Server event log",
  "  participant R as Reconciliation",
  "  U->>D: Capture action with base state and versions",
  "  D-->>U: Show pending local evidence",
  "  D->>S: Retry idempotently when connected",
  "  S->>S: Validate authority, state, scope, and evidence",
  "  alt compatible",
  "    S-->>D: Accept canonical event",
  "    D-->>U: Show synchronized state",
  "  else divergent",
  "    S-->>R: Preserve event as conflict evidence",
  "    R-->>U: Require accept, attach, reapply, or reject with reason",
  "    R->>S: Append resolution and any successor lineage",
  "  end",
  "",
].join("\n");
const screenMap = [
  "flowchart LR",
  ...workflows.map(
    (workflow) => `  ${mermaidId(workflow.id)}["${workflow.id}"]`,
  ),
  ...screens.map(
    (screen) => `  ${mermaidId(screen.id)}["${screen.id} · ${screen.name}"]`,
  ),
  ...screens.map(
    (screen) =>
      `  ${mermaidId(screen.workflow_ids[0])} --> ${mermaidId(screen.id)}`,
  ),
  "",
].join("\n");

const wrap = (key: string, value: unknown) => ({
  schema_version: "1.0",
  [key]: value,
});
const visualManifest = {
  schema_version: "1.0",
  visuals: [
    {
      id: "PRD-VIS-001",
      path: "product-structure/visuals/domain-map.mmd",
      title: "Product domain map",
      source_ids: domains.map((domain) => domain.id),
    },
    {
      id: "PRD-VIS-002",
      path: "product-structure/visuals/navigation-map.mmd",
      title: "Global navigation map",
      source_ids: informationArchitecture.global_sections.map(
        (section) => section.id,
      ),
    },
    {
      id: "PRD-VIS-003",
      path: "product-structure/visuals/permission-resolution.mmd",
      title: "Contextual permission resolution",
      source_ids: permissionRules.map((rule) => rule.id),
    },
    {
      id: "PRD-VIS-004",
      path: "product-structure/visuals/offline-sync.mmd",
      title: "Offline sync and conflict recovery",
      source_ids: syncModel.classes.map((syncClass) => syncClass.id),
    },
    {
      id: "PRD-VIS-005",
      path: "product-structure/visuals/screen-map.mmd",
      title: "Workflow-to-screen map",
      source_ids: screens.map((screen) => screen.id),
    },
  ],
};

const outputs = new Map<string, string>([
  [
    "product-structure/domains.json",
    `${JSON.stringify(wrap("domains", domains), null, 2)}\n`,
  ],
  [
    "product-structure/scope-boundary.json",
    `${JSON.stringify(scopeBoundary, null, 2)}\n`,
  ],
  [
    "product-structure/information-architecture.json",
    `${JSON.stringify(informationArchitecture, null, 2)}\n`,
  ],
  [
    "product-structure/navigation-models.json",
    `${JSON.stringify(navigationModels, null, 2)}\n`,
  ],
  [
    "product-structure/role-surface-matrix.json",
    `${JSON.stringify(roleSurfaceMatrix, null, 2)}\n`,
  ],
  [
    "product-structure/platform-matrix.json",
    `${JSON.stringify(platformMatrix, null, 2)}\n`,
  ],
  [
    "product-structure/permissions.json",
    `${JSON.stringify({ schema_version: "1.0", default_effect: "deny", resolution_dimensions: ["role", "organization_relationship", "scope", "record_state", "transition_owner", "delegation", "sensitivity", "effective_time"], rules: permissionRules }, null, 2)}\n`,
  ],
  [
    "product-structure/notifications.json",
    `${JSON.stringify({ schema_version: "1.0", canonical_state_source: "server_event_log", rules: notifications }, null, 2)}\n`,
  ],
  [
    "product-structure/transition-dispositions.json",
    `${JSON.stringify(wrap("transitions", transitionDispositions), null, 2)}\n`,
  ],
  [
    "product-structure/sync-model.json",
    `${JSON.stringify(syncModel, null, 2)}\n`,
  ],
  [
    "product-structure/requirements.json",
    `${JSON.stringify(wrap("requirements", requirements), null, 2)}\n`,
  ],
  [
    "product-structure/screens.json",
    `${JSON.stringify(wrap("screens", screens), null, 2)}\n`,
  ],
  [
    "screens/screens.json",
    `${JSON.stringify(wrap("screens", screens), null, 2)}\n`,
  ],
  [
    "product-structure/component-requirements.json",
    `${JSON.stringify(wrap("components", componentRequirements), null, 2)}\n`,
  ],
  [
    "product-structure/relationships.json",
    `${JSON.stringify(wrap("relationships", relationships), null, 2)}\n`,
  ],
  [
    "product-structure/state-matrix.json",
    `${JSON.stringify({ schema_version: "1.0", state_kind_coverage: unique(stateMatrix.map((state) => state.kind)).sort(), states: stateMatrix }, null, 2)}\n`,
  ],
  [
    "product-structure/flows.json",
    `${JSON.stringify(wrap("flows", flows), null, 2)}\n`,
  ],
  ["product-structure/visuals/domain-map.mmd", domainMap],
  ["product-structure/visuals/navigation-map.mmd", navigationMap],
  ["product-structure/visuals/permission-resolution.mmd", permissionMap],
  ["product-structure/visuals/offline-sync.mmd", syncMap],
  ["product-structure/visuals/screen-map.mmd", screenMap],
  [
    "product-structure/visuals/manifest.json",
    `${JSON.stringify(visualManifest, null, 2)}\n`,
  ],
]);
for (const [relativePath, contents] of outputs)
  if (relativePath.endsWith(".json"))
    outputs.set(
      relativePath,
      await prettier.format(contents, { parser: "json" }),
    );

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
      `Generated product artifacts are stale: ${drift.join(", ")}`,
    );
  console.log(
    `✓ ${requirements.length} requirements, ${screens.length} screens, ${stateMatrix.length} state contracts, ${flows.length} flows, and ${relationships.length} relationships are current`,
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
    `✓ generated ${requirements.length} requirements, ${screens.length} screens, ${stateMatrix.length} state contracts, ${flows.length} flows, ${componentRequirements.length} component contracts, and ${relationships.length} relationships`,
  );
}
