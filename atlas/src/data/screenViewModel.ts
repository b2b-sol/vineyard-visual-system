import {
  assignmentIndex,
  componentRequirementIndex,
  decisionIndex,
  eventIndex,
  getActiveAssignmentForRole,
  getAssignmentLabel,
  getComponentsForScreen,
  getFixtureEvents,
  getFixtureIdentity,
  getFixtureRecords,
  getRelatedLinks,
  getScenarioForFixture,
  notificationIndex,
  organizationRelationships,
  permissionIndex,
  recordDefinitionIndex,
  recordInstanceIndex,
  scenarioIndex,
  scopeIndex,
  syncClasses,
  type CanonicalAction,
  type CanonicalEvent,
  type PublicComponentId,
  type RecordInstance,
  type RoleAssignment,
} from "./canonical";
import type { ResolvedScreenState } from "./screenRecipes";

export interface ScreenViewModel extends ResolvedScreenState {
  scenario: ReturnType<typeof getScenarioForFixture>;
  events: ReturnType<typeof getFixtureEvents>;
  records: ReturnType<typeof getFixtureRecords>;
  identity: ReturnType<typeof getFixtureIdentity>;
  actors: ReturnType<typeof getAssignmentLabel>[];
  componentIds: PublicComponentId[];
  recordLinks: ReturnType<typeof getRelatedLinks>;
  activeEvent?: CanonicalEvent;
}

const layoutComponentPriorities: Record<
  ResolvedScreenState["recipe"]["layout"],
  PublicComponentId[]
> = {
  brief: ["CMP-001", "CMP-008", "CMP-018", "CMP-026"],
  plan: ["CMP-005", "CMP-008", "CMP-021", "CMP-022"],
  dispatch: ["CMP-001", "CMP-010", "CMP-020", "CMP-021"],
  field: ["CMP-004", "CMP-007", "CMP-020", "CMP-021"],
  evidence: ["CMP-005", "CMP-013", "CMP-014", "CMP-034"],
  labor: ["CMP-001", "CMP-008", "CMP-012", "CMP-020"],
  monitor: ["CMP-001", "CMP-008", "CMP-018", "CMP-026"],
  capture: ["CMP-007", "CMP-004", "CMP-010", "CMP-015"],
  assessment: ["CMP-008", "CMP-005", "CMP-014", "CMP-026"],
  protection: ["CMP-008", "CMP-010", "CMP-011", "CMP-033"],
  water: ["CMP-024", "CMP-008", "CMP-005", "CMP-026"],
  delivery: ["CMP-007", "CMP-022", "CMP-012", "CMP-014"],
  recovery: ["CMP-010", "CMP-011", "CMP-014", "CMP-013"],
};

const stateComponentPriorities: Record<string, PublicComponentId[]> = {
  normal: ["CMP-006", "CMP-007", "CMP-036"],
  offline: ["CMP-015", "CMP-016", "CMP-036"],
  partial: ["CMP-012", "CMP-020", "CMP-036"],
  urgent: ["CMP-010", "CMP-018", "CMP-019"],
  completion: ["CMP-014", "CMP-035", "CMP-036"],
  blocked: ["CMP-010", "CMP-011", "CMP-036"],
  stale: ["CMP-005", "CMP-017", "CMP-036"],
  corrected: ["CMP-013", "CMP-014", "CMP-034"],
  historical: ["CMP-005", "CMP-014", "CMP-035"],
  conflict: ["CMP-015", "CMP-016", "CMP-034"],
  loading: ["CMP-005", "CMP-006", "CMP-017"],
  empty: ["CMP-001", "CMP-006", "CMP-036"],
  error: ["CMP-009", "CMP-010", "CMP-034"],
  read_only: ["CMP-005", "CMP-014", "CMP-035"],
  approval_pending: ["CMP-008", "CMP-033", "CMP-018"],
  rejected: ["CMP-010", "CMP-011", "CMP-014"],
  delayed: ["CMP-015", "CMP-017", "CMP-018"],
  superseded: ["CMP-013", "CMP-014", "CMP-034"],
  incomplete_information: ["CMP-009", "CMP-010", "CMP-011"],
};

export function visibleComponentIds(model: ScreenViewModel) {
  const declared = model.componentIds.filter(
    (componentId) => componentId !== "CMP-002",
  );
  const stateIndex = Math.max(
    0,
    model.screen.states.findIndex((state) => state.id === model.reviewState),
  );
  const stateCount = Math.max(1, model.screen.states.length);
  const stateShard = declared.filter(
    (_, componentIndex) => componentIndex % stateCount === stateIndex,
  );
  const responsibilityOrder =
    model.screen.platform === "mobile" || model.recipe.layout === "field"
      ? (["CMP-007", "CMP-004", "CMP-003", "CMP-006"] as PublicComponentId[])
      : (["CMP-003", "CMP-004", "CMP-006", "CMP-007"] as PublicComponentId[]);
  const ordered = [
    ...responsibilityOrder,
    ...layoutComponentPriorities[model.recipe.layout],
    ...(stateComponentPriorities[model.reviewState] ??
      stateComponentPriorities.normal),
    ...stateShard,
  ];
  return [...new Set(ordered)].filter((componentId) =>
    declared.includes(componentId),
  );
}

export function createScreenViewModel(
  resolved: ResolvedScreenState,
): ScreenViewModel {
  const fixtureEvents = getFixtureEvents(resolved.fixture);
  const activeEvent = resolved.activeEventId
    ? eventIndex.get(resolved.activeEventId)
    : undefined;
  const activeEventIndex = activeEvent
    ? fixtureEvents.findIndex((event) => event.id === activeEvent.id)
    : -1;
  const events = resolved.modelOnly
    ? []
    : activeEventIndex >= 0
      ? fixtureEvents.slice(0, activeEventIndex + 1)
      : activeEvent
        ? [activeEvent]
        : [];
  const relatedRecordIds = new Set(
    events.flatMap((event) => [...event.record_reads, ...event.record_writes]),
  );
  const fixtureRecords = getFixtureRecords(resolved.fixture);
  const records = resolved.modelOnly
    ? fixtureRecords
    : fixtureRecords.filter((record) => relatedRecordIds.has(record.id));
  const scenario = resolved.scenarioId
    ? scenarioIndex.get(resolved.scenarioId)
    : resolved.modelOnly
      ? undefined
      : getScenarioForFixture(resolved.screen, resolved.fixture.id);
  return {
    ...resolved,
    scenario,
    events,
    records,
    activeEvent,
    identity: getFixtureIdentity(resolved.fixture),
    actors: resolved.fixture.actor_assignment_ids.map(getAssignmentLabel),
    componentIds: getComponentsForScreen(resolved.screen.id).map(
      (component) => component.id,
    ),
    recordLinks: getRelatedLinks(records.map((record) => record.id)),
  };
}

export function componentName(componentId: PublicComponentId) {
  return componentRequirementIndex.get(componentId)?.name ?? componentId;
}

export function recordName(record: RecordInstance) {
  return (
    recordDefinitionIndex.get(record.record_definition_id)?.name ??
    record.record_definition_id
  );
}

interface QuantityFact {
  value: number;
  unit_id: string;
  qualifier?: string;
}

interface MoneyFact {
  amount: number;
  currency: string;
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function factAt(record: RecordInstance, path: string[]) {
  let value: unknown = record.facts;
  for (const key of path) value = objectValue(value)?.[key];
  return value;
}

function quantityAt(record: RecordInstance, path: string[]) {
  const value = objectValue(factAt(record, path));
  return typeof value?.value === "number" && typeof value.unit_id === "string"
    ? (value as unknown as QuantityFact)
    : undefined;
}

function moneyAt(record: RecordInstance, path: string[]) {
  const value = objectValue(factAt(record, path));
  return typeof value?.amount === "number" && typeof value.currency === "string"
    ? (value as unknown as MoneyFact)
    : undefined;
}

const unitLabels: Record<string, string> = {
  "UNT-001": "ac",
  "UNT-007": "hr",
  "UNT-008": "people",
  "UNT-013": "%",
};

export interface DerivedMeasure {
  label: string;
  accepted: number;
  total: number;
  unit: string;
  sourceRecordIds: string[];
}

export function derivePartialMeasure(model: ScreenViewModel) {
  for (const record of model.records) {
    const completed = quantityAt(record, [
      "partial_completion_history",
      "completed_area",
    ]);
    const total = quantityAt(record, [
      "partial_completion_history",
      "final_completed_area",
    ]);
    if (completed && total && completed.unit_id === total.unit_id) {
      return {
        label: "Accepted field scope",
        accepted: completed.value,
        total: total.value,
        unit: unitLabels[total.unit_id] ?? total.unit_id,
        sourceRecordIds: [record.id],
      } satisfies DerivedMeasure;
    }
  }

  if (model.screen.id === "SCR-040" || model.screen.id === "SCR-041") {
    const roster = model.records
      .map((record) => ({
        record,
        value: quantityAt(record, [
          "definition_evidence",
          "rostered_worker_count",
        ]),
      }))
      .find((item) => item.value);
    const qualified = model.records
      .map((record) => ({
        record,
        value: quantityAt(record, [
          "definition_evidence",
          "current_qualification_count",
        ]),
      }))
      .find((item) => item.value);
    if (roster?.value && qualified?.value) {
      return {
        label: "Qualified crew coverage",
        accepted: Math.min(qualified.value.value, roster.value.value),
        total: roster.value.value,
        unit: "people",
        sourceRecordIds: [roster.record.id, qualified.record.id],
      } satisfies DerivedMeasure;
    }
  }

  for (const record of model.records) {
    const payable =
      quantityAt(record, ["facts", "payable_time"]) ??
      quantityAt(record, ["workflow_metrics", "payable_time"]);
    const attendance = quantityAt(record, ["domain_details", "attendance"]);
    if (payable && attendance && payable.unit_id === attendance.unit_id) {
      return {
        label: "Accepted payable time",
        accepted: payable.value,
        total: attendance.value,
        unit: unitLabels[payable.unit_id] ?? payable.unit_id,
        sourceRecordIds: [record.id],
      } satisfies DerivedMeasure;
    }
  }

  return undefined;
}

export interface ReconciliationMeasure {
  label: string;
  source: number;
  result?: number;
  unit: string;
  sourceRecordIds: string[];
}

export function deriveReconciliationMeasure(model: ScreenViewModel) {
  if (model.modelOnly) return undefined;

  const payroll = model.records
    .map((record) => ({
      record,
      value: moneyAt(record, ["domain_details", "amount_owed"]),
    }))
    .find((item) => item.value);
  const allocation = model.records
    .map((record) => ({
      record,
      value: moneyAt(record, ["domain_details", "allocated_cost"]),
    }))
    .find((item) => item.value);
  if (payroll?.value) {
    return {
      label: "Accepted labor / block allocation",
      source: payroll.value.amount,
      result:
        allocation?.value?.currency === payroll.value.currency
          ? allocation.value.amount
          : undefined,
      unit: payroll.value.currency,
      sourceRecordIds: [
        payroll.record.id,
        ...(allocation ? [allocation.record.id] : []),
      ],
    } satisfies ReconciliationMeasure;
  }

  for (const record of model.records) {
    const target = quantityAt(record, ["domain_details", "target_area"]);
    const completed = quantityAt(record, ["domain_details", "completed_area"]);
    if (target && completed && target.unit_id === completed.unit_id) {
      return {
        label: "Planned / reported field scope",
        source: target.value,
        result: completed.value,
        unit: unitLabels[target.unit_id] ?? target.unit_id,
        sourceRecordIds: [record.id],
      } satisfies ReconciliationMeasure;
    }
  }
  return undefined;
}

export function getCorrectionLineage(model: ScreenViewModel) {
  return model.recordLinks
    .filter((link) => ["corrects", "supersedes"].includes(link.relation))
    .map((link) => ({
      linkId: link.id,
      relation: link.relation,
      predecessor: recordInstanceIndex.get(link.target.entity_id),
      successor: recordInstanceIndex.get(link.source_record_instance_id),
    }))
    .filter((entry) => entry.predecessor && entry.successor);
}

export function getActionTrace(action: CanonicalAction) {
  const permissionId = action.permission_rule_ids[0];
  const notificationId = action.notification_rule_ids[0];
  return {
    "data-action-id": action.id,
    "data-transition-id": action.transition?.transition_id,
    "data-permission-id": permissionId,
    "data-notification-id": notificationId,
    "data-sync-id": action.sync_class_id,
    "data-decision-ids": action.decision_ids?.join(" ") || undefined,
  };
}

export type AuthorityDisposition = "inspect" | "append" | "queue" | "deny";

export interface AuthorityResult {
  allowed: boolean;
  disposition: AuthorityDisposition;
  reason: string;
  permissionId?: string;
  assignmentId?: string;
  scopeId?: string;
  transitionId?: string;
  evidenceRecordIds: string[];
}

export interface AuthorityContext {
  screen: ScreenViewModel["screen"];
  fixture: ScreenViewModel["fixture"];
  records: RecordInstance[];
  currentState: string | null;
  availableActionIds: string[];
  blockedActionIds: string[];
  occurredAt: string;
  reviewState: string;
  actorAssignmentId?: string;
  connectivityMode?: string;
  capturedOffline?: boolean;
}

function authorityContext(model: ScreenViewModel): AuthorityContext {
  return {
    screen: model.screen,
    fixture: model.fixture,
    records: model.records,
    currentState: model.stateContract.canonical_state,
    availableActionIds: model.stateContract.available_actions,
    blockedActionIds: model.stateContract.blocked_actions,
    occurredAt:
      model.activeEvent?.occurred_at ?? model.fixture.anchor.occurred_at,
    reviewState: model.reviewState,
    actorAssignmentId: undefined,
    connectivityMode:
      model.activeEvent?.connectivity.mode ??
      model.fixture.anchor.connectivity.mode,
    capturedOffline:
      model.activeEvent?.connectivity.captured_offline ??
      model.fixture.anchor.connectivity.captured_offline,
  };
}

function assignmentIsEffective(
  assignment: RoleAssignment,
  roleId: string,
  occurredAt: string,
) {
  const instant = Date.parse(occurredAt);
  const starts = Date.parse(`${assignment.starts_on}T00:00:00Z`);
  const ends = assignment.ends_on
    ? Date.parse(`${assignment.ends_on}T23:59:59Z`)
    : Number.POSITIVE_INFINITY;
  return (
    assignment.role_id === roleId &&
    assignment.status === "active" &&
    instant >= starts &&
    instant <= ends
  );
}

function resolveScope(assignment: RoleAssignment, context: AuthorityContext) {
  const workflowId = context.screen.workflow_ids[0];
  return assignment.scope_ids
    .map((scopeId) => scopeIndex.get(scopeId))
    .find(
      (scope) =>
        scope?.status === "active" &&
        scope.workflow_ids.includes(workflowId) &&
        (scope.type === "operation" ||
          context.fixture.block_ids.some((blockId) =>
            scope.entity_ids.includes(blockId),
          )),
    );
}

function organizationResolves(
  assignment: RoleAssignment,
  relationships: string[],
  context: AuthorityContext,
) {
  if (!relationships.length) return true;
  const targetOrganizationIds = new Set(
    context.records.flatMap((record) => record.organization_ids ?? []),
  );
  const blockOrganization = getFixtureIdentity(context.fixture).organization
    ?.id;
  if (blockOrganization) targetOrganizationIds.add(blockOrganization);
  if (!targetOrganizationIds.size) return false;
  if (
    relationships.includes("same_organization") &&
    targetOrganizationIds.has(assignment.organization_id)
  ) {
    return true;
  }
  return organizationRelationships.some(
    (relationship) =>
      relationship.status === "active" &&
      relationships.includes(relationship.type) &&
      ((relationship.from_organization_id === assignment.organization_id &&
        targetOrganizationIds.has(relationship.to_organization_id)) ||
        (relationship.to_organization_id === assignment.organization_id &&
          targetOrganizationIds.has(relationship.from_organization_id))),
  );
}

function denied(
  reason: string,
  action: CanonicalAction,
  evidenceRecordIds: string[] = [],
): AuthorityResult {
  return {
    allowed: false,
    disposition: "deny",
    reason,
    transitionId: action.transition?.transition_id,
    evidenceRecordIds,
  };
}

export function resolveActionAuthority(
  action: CanonicalAction,
  roleId: string,
  modelOrContext: ScreenViewModel | AuthorityContext,
): AuthorityResult {
  const context =
    "stateContract" in modelOrContext
      ? authorityContext(modelOrContext)
      : modelOrContext;
  const evidenceRecordIds = context.records.map((record) => record.id);
  if (context.blockedActionIds.includes(action.id)) {
    return denied(
      `${action.id} is explicitly blocked by the selected state contract.`,
      action,
      evidenceRecordIds,
    );
  }
  if (!context.availableActionIds.includes(action.id)) {
    return denied(
      `${action.id} is not available from the selected state contract.`,
      action,
      evidenceRecordIds,
    );
  }

  const assignment = context.actorAssignmentId
    ? assignmentIndex.get(context.actorAssignmentId)
    : getActiveAssignmentForRole(roleId, context.occurredAt);
  if (
    !assignment ||
    !assignmentIsEffective(assignment, roleId, context.occurredAt)
  ) {
    return denied(
      `${roleId} has no effective attributable assignment at this event time.`,
      action,
      evidenceRecordIds,
    );
  }

  const scope = resolveScope(assignment, context);
  if (!scope) {
    return denied(
      `${assignment.id} has no active scope covering this workflow and vineyard identity.`,
      action,
      evidenceRecordIds,
    );
  }

  const transitionId = action.transition?.transition_id;
  if (action.kind !== "inspect") {
    if (!action.transition || action.transition.from !== context.currentState) {
      return denied(
        `Expected ${action.transition?.from ?? "entry"}; current state is ${context.currentState ?? "entry"}. Refresh or select an in-sequence recovery.`,
        action,
        evidenceRecordIds,
      );
    }
    if (context.capturedOffline && action.sync_class_id === "SYNC-003") {
      return denied(
        "This commitment is online-required; preserve the draft and reconnect before acceptance.",
        action,
        evidenceRecordIds,
      );
    }
  }

  const recordDefinitionIds = new Set(
    context.records.map((record) => record.record_definition_id),
  );
  const missingDefinitions = (action.record_reads ?? []).filter(
    (definitionId) => !recordDefinitionIds.has(definitionId),
  );
  if (action.kind !== "inspect" && missingDefinitions.length) {
    return denied(
      `Required evidence is unresolved: ${missingDefinitions.join(", ")}.`,
      action,
      evidenceRecordIds,
    );
  }

  for (const permissionId of action.permission_rule_ids) {
    const permission = permissionIndex.get(permissionId);
    if (
      !permission ||
      permission.effect !== "allow" ||
      permission.action_kind !== action.kind ||
      !permission.workflow_ids.includes(context.screen.workflow_ids[0]) ||
      !organizationResolves(
        assignment,
        permission.organization_relationships,
        context,
      )
    ) {
      continue;
    }
    if (action.kind === "inspect") {
      if (!permission.role_ids.includes(roleId)) continue;
      return {
        allowed: true,
        disposition: "inspect",
        reason: `${assignment.id} resolves ${permission.id} within ${scope.id}; attributable history remains read-only.`,
        permissionId,
        assignmentId: assignment.id,
        scopeId: scope.id,
        evidenceRecordIds,
      };
    }
    const grant = permission.grants.find(
      (candidate) =>
        candidate.transition_id === transitionId &&
        candidate.role_ids.includes(roleId),
    );
    if (!grant) continue;
    if (grant.delegation === "explicit_assignment" && !assignment) continue;
    return {
      allowed: true,
      disposition:
        context.capturedOffline || context.connectivityMode === "offline"
          ? "queue"
          : "append",
      reason: `${assignment.id} resolves the exact ${transitionId} grant in ${permission.id}, active scope ${scope.id}, current state, and required evidence.`,
      permissionId,
      assignmentId: assignment.id,
      scopeId: scope.id,
      transitionId,
      evidenceRecordIds,
    };
  }

  const denialCopy = action.permission_rule_ids
    .map((permissionId) => permissionIndex.get(permissionId)?.denial_copy)
    .find(Boolean);
  return denied(
    denialCopy ??
      `${roleId} has no exact allow grant. Default-deny keeps this action read-only.`,
    action,
    evidenceRecordIds,
  );
}

export function canRolePerform(
  action: CanonicalAction,
  roleId: string,
  model: ScreenViewModel,
) {
  return resolveActionAuthority(action, roleId, model).allowed;
}

export function actionExplanation(
  action: CanonicalAction,
  roleId: string,
  model: ScreenViewModel,
) {
  return resolveActionAuthority(action, roleId, model).reason;
}

export function notificationFor(action: CanonicalAction) {
  return action.notification_rule_ids
    .map((id) => notificationIndex.get(id))
    .filter((item) => Boolean(item));
}

export function syncClassFor(action: CanonicalAction) {
  return syncClasses.find((item) => item.id === action.sync_class_id);
}

export function decisionsFor(action: CanonicalAction) {
  return (action.decision_ids ?? [])
    .map((id) => decisionIndex.get(id))
    .filter((item) => Boolean(item));
}

export const statePresentation: Record<
  string,
  { symbol: string; title: string; detail: string; tone: string }
> = {
  normal: {
    symbol: "✓",
    title: "Ready with current evidence",
    detail:
      "Scope, authority, and server state resolve for the next bounded action.",
    tone: "positive",
  },
  offline: {
    symbol: "↧",
    title: "Offline journal active",
    detail:
      "Permitted field evidence queues locally; approvals remain online-only.",
    tone: "informative",
  },
  partial: {
    symbol: "½",
    title: "Partial scope preserved",
    detail:
      "Accepted work remains valid while the unfinished scope keeps an owner and clock.",
    tone: "notice",
  },
  urgent: {
    symbol: "!",
    title: "Action window is closing",
    detail:
      "The accountable owner must disposition this record before the operating window changes.",
    tone: "critical",
  },
  completion: {
    symbol: "✓",
    title: "Terminal evidence accepted",
    detail:
      "Completion, verification, and immutable history are available for inspection.",
    tone: "positive",
  },
  blocked: {
    symbol: "×",
    title: "Work held at a named boundary",
    detail:
      "No consequential action is available until the blocker and recovery owner resolve.",
    tone: "critical",
  },
  stale: {
    symbol: "↻",
    title: "Newer server evidence exists",
    detail:
      "Refresh the base version before acting; the older evidence remains inspectable.",
    tone: "notice",
  },
  corrected: {
    symbol: "↳",
    title: "Correction appended",
    detail:
      "The prior version remains immutable and is linked to its attributable successor.",
    tone: "revision",
  },
  historical: {
    symbol: "◷",
    title: "Historical snapshot · read only",
    detail: "This effective-time view cannot mutate current operating state.",
    tone: "neutral",
  },
  conflict: {
    symbol: "⇄",
    title: "Device and server states differ",
    detail:
      "Both events are retained; reconciliation is required before a successor is accepted.",
    tone: "critical",
  },
  loading: {
    symbol: "…",
    title: "Rebuilding attributable time evidence",
    detail:
      "Identity and scope remain visible while linked records are assembled.",
    tone: "informative",
  },
  empty: {
    symbol: "○",
    title: "No unresolved payroll exceptions",
    detail:
      "The cleared queue remains paired with the filters and effective period inspected.",
    tone: "positive",
  },
  error: {
    symbol: "!",
    title: "Model-only allocation variance",
    detail:
      "This validation branch demonstrates containment for non-balancing totals; no operational variance is asserted for the context fixture.",
    tone: "critical",
  },
  read_only: {
    symbol: "◷",
    title: "Accepted record is read only",
    detail:
      "Current evidence remains inspectable; change requires an explicit correction or supersession.",
    tone: "neutral",
  },
  approval_pending: {
    symbol: "◇",
    title: "Recommendation awaits accountable approval",
    detail:
      "Evidence is assembled, but assignment and delivery remain unavailable until online authority resolves.",
    tone: "notice",
  },
  rejected: {
    symbol: "×",
    title: "Adjustment rejected with reason",
    detail:
      "The prior recommendation remains visible while the owner prepares a safer or better-supported successor.",
    tone: "critical",
  },
  delayed: {
    symbol: "◷",
    title: "Delivery evidence is delayed",
    detail:
      "Field evidence is retained with its effective time; verification waits for synchronized actuals.",
    tone: "notice",
  },
  superseded: {
    symbol: "↳",
    title: "Later evidence supersedes this plan",
    detail:
      "The original decision stays immutable and linked to the accountable successor.",
    tone: "revision",
  },
  incomplete_information: {
    symbol: "?",
    title: "Restart evidence is incomplete",
    detail:
      "The affected scope stays contained until repair, remaining set, owner, and safe restart conditions resolve.",
    tone: "critical",
  },
};

export function presentationFor(screenId: string, state: string) {
  if (state === "error" && screenId !== "SCR-045") {
    return {
      symbol: "!",
      title: "Release evidence is incomplete",
      detail:
        "The application stays held until the missing condition, restriction, or authority evidence resolves.",
      tone: "critical",
    };
  }
  if (state === "empty" && screenId !== "SCR-044") {
    return {
      symbol: "○",
      title: "No follow-up action is due",
      detail:
        "The inspected scope remains paired with its accepted report and effective-time filters.",
      tone: "positive",
    };
  }
  return statePresentation[state] ?? statePresentation.normal;
}

export function formatMoment(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  }).format(new Date(value));
}
