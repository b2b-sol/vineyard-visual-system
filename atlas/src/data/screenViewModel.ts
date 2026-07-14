import {
  componentRequirementIndex,
  decisionIndex,
  getAssignmentLabel,
  getComponentsForScreen,
  getFixtureEvents,
  getFixtureIdentity,
  getFixtureRecords,
  getRelatedLinks,
  getScenarioForFixture,
  notificationIndex,
  permissionIndex,
  recordDefinitionIndex,
  syncClasses,
  type CanonicalAction,
  type PublicComponentId,
  type RecordInstance,
} from "./canonical";
import type { ResolvedScreenState } from "./wave001";

export interface ScreenViewModel extends ResolvedScreenState {
  scenario: ReturnType<typeof getScenarioForFixture>;
  events: ReturnType<typeof getFixtureEvents>;
  records: ReturnType<typeof getFixtureRecords>;
  identity: ReturnType<typeof getFixtureIdentity>;
  actors: ReturnType<typeof getAssignmentLabel>[];
  componentIds: PublicComponentId[];
  recordLinks: ReturnType<typeof getRelatedLinks>;
}

export function createScreenViewModel(
  resolved: ResolvedScreenState,
): ScreenViewModel {
  const events = getFixtureEvents(resolved.fixture);
  const records = getFixtureRecords(resolved.fixture);
  return {
    ...resolved,
    scenario: getScenarioForFixture(resolved.screen, resolved.fixture.id),
    events,
    records,
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

export function canRolePerform(action: CanonicalAction, roleId: string) {
  return action.permission_rule_ids.some((permissionId) => {
    const permission = permissionIndex.get(permissionId);
    return (
      permission?.effect === "allow" && permission.role_ids.includes(roleId)
    );
  });
}

export function actionExplanation(action: CanonicalAction, roleId: string) {
  const permission = permissionIndex.get(action.permission_rule_ids[0]);
  if (canRolePerform(action, roleId)) {
    return `${roleId} is inside ${permission?.id ?? "the canonical rule"}; acceptance appends an attributable event.`;
  }
  return (
    permission?.denied_behavior ??
    `${roleId} has no explicit allow rule. Default-deny keeps this action read-only.`
  );
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
    title: "Allocation does not balance",
    detail:
      "Accepted labor total and block allocations differ; export and closeout are disabled.",
    tone: "critical",
  },
};

export function formatMoment(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  }).format(new Date(value));
}
