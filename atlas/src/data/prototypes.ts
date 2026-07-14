import {
  assignmentIndex,
  fixtureIndex,
  flowIndex,
  getActionForTransition,
  getAssignmentLabel,
  getFixtureEvents,
  recordInstanceIndex,
  screenIndex,
  waveStateContracts,
  type CanonicalAction,
  type CanonicalEvent,
  type Fixture,
  type ScreenContract,
} from "./canonical";
import {
  notificationFor,
  resolveActionAuthority,
  type AuthorityResult,
} from "./screenViewModel";

export interface PrototypeStep {
  event: CanonicalEvent;
  fixture: Fixture;
  lane: string;
  screen: ScreenContract;
  action: CanonicalAction;
  screenId: string;
  actionId: string;
  actorRoleId: string;
  stateContractId?: string;
}

export interface PrototypeReplayState {
  currentState: string | null;
  appendedEventIds: string[];
}

export type ReplayBoundary =
  "canonical" | "wrong_actor" | "stale_base" | "offline" | "conflict";

export interface PrototypeAppendResult {
  allowed: boolean;
  status: "appended" | "denied";
  reason: string;
  authority: AuthorityResult;
  nextState: PrototypeReplayState;
  actorAssignmentId: string;
  actorRoleId: string;
  evidenceRecordIds: string[];
  notificationIds: string[];
  precondition: string;
  appendPolicy: "append_only";
}

function flowStepMap(flowId: string) {
  const flow = flowIndex.get(flowId);
  const steps = flow
    ? [
        ...flow.entry_points,
        ...flow.normal_path,
        ...flow.exception_path,
        ...flow.recovery_path,
        ...flow.completion_path,
      ]
    : [];
  return new Map(steps.map((step) => [step.event_id, step]));
}

export function buildPrototypeSteps(flowId: string): PrototypeStep[] {
  const fixtureIds =
    flowId === "FLW-001"
      ? ["FIX-006"]
      : flowId === "FLW-007"
        ? ["FIX-033"]
        : flowId === "FLW-015"
          ? ["FIX-003", "FIX-033"]
          : [];
  const mappedSteps = flowStepMap(flowId);
  return fixtureIds.flatMap((fixtureId) => {
    const fixture = fixtureIndex.get(fixtureId)!;
    return getFixtureEvents(fixture).map((event) => {
      const flowStep = mappedSteps.get(event.id);
      const fallback = getActionForTransition(event.transition_id);
      const screen = flowStep
        ? screenIndex.get(flowStep.screen_id)
        : fallback?.screen;
      const action = flowStep
        ? screen?.actions.find(
            (candidate) => candidate.id === flowStep.action_id,
          )
        : fallback?.action;
      if (!screen || !action) {
        throw new Error(
          `${flowId} cannot allocate ${event.id}/${event.transition_id} to an exact screen action`,
        );
      }
      return {
        event,
        fixture,
        lane: fixture.workflow_id,
        screen,
        action,
        screenId: screen.id,
        actionId: action.id,
        actorRoleId: getAssignmentLabel(event.actor_assignment_id).roleId,
        stateContractId: waveStateContracts.find(
          (contract) =>
            contract.screen_id === screen.id &&
            contract.source_ref.event_id === event.id,
        )?.id,
      };
    });
  });
}

export function initialReplayState(): PrototypeReplayState {
  return { currentState: null, appendedEventIds: [] };
}

function boundaryRole(step: PrototypeStep) {
  const exactRoles = new Set(
    step.action.permission_rule_ids.flatMap(() => [step.actorRoleId]),
  );
  return (
    step.screen.review_role_ids.find((roleId) => !exactRoles.has(roleId)) ??
    "ROLE-FINANCE"
  );
}

function deniedAuthority(step: PrototypeStep, reason: string): AuthorityResult {
  return {
    allowed: false,
    disposition: "deny",
    reason,
    transitionId: step.event.transition_id,
    evidenceRecordIds: [
      ...new Set([...step.event.record_reads, ...step.event.record_writes]),
    ],
  };
}

export function validatePrototypeAppend(
  step: PrototypeStep,
  replay: PrototypeReplayState,
  boundary: ReplayBoundary = "canonical",
): PrototypeAppendResult {
  const evidenceRecordIds = [
    ...new Set([...step.event.record_reads, ...step.event.record_writes]),
  ];
  const records = evidenceRecordIds
    .map((recordId) => recordInstanceIndex.get(recordId))
    .filter((record): record is NonNullable<typeof record> => Boolean(record));
  const actorRoleId =
    boundary === "wrong_actor" ? boundaryRole(step) : step.actorRoleId;
  const actorAssignment =
    boundary === "wrong_actor"
      ? [...assignmentIndex.values()].find(
          (assignment) => assignment.role_id === actorRoleId,
        )
      : assignmentIndex.get(step.event.actor_assignment_id);
  const currentState =
    boundary === "stale_base" ? "stale_client_base" : replay.currentState;
  const precondition = `${step.event.from_state ?? "entry"} → ${step.event.to_state}`;

  let authority: AuthorityResult;
  if (replay.appendedEventIds.includes(step.event.id)) {
    authority = deniedAuthority(
      step,
      `${step.event.id} already exists in the replay journal; append-only policy forbids overwrite.`,
    );
  } else if (boundary === "conflict") {
    authority = deniedAuthority(
      step,
      "Device and server bases conflict; both events remain preserved until attributable reconciliation.",
    );
  } else if (currentState !== step.event.from_state) {
    authority = deniedAuthority(
      step,
      `Stale or out-of-sequence base: replay is ${currentState ?? "entry"}, but ${step.event.id} requires ${step.event.from_state ?? "entry"}.`,
    );
  } else if (
    step.action.transition?.transition_id !== step.event.transition_id
  ) {
    authority = deniedAuthority(
      step,
      `The allocated action does not own ${step.event.transition_id}.`,
    );
  } else {
    authority = resolveActionAuthority(step.action, actorRoleId, {
      screen: step.screen,
      fixture: step.fixture,
      records,
      currentState,
      availableActionIds: [step.action.id],
      blockedActionIds: [],
      occurredAt: step.event.occurred_at,
      reviewState: "prototype_replay",
      actorAssignmentId: actorAssignment?.id,
      connectivityMode:
        boundary === "offline" ? "offline" : step.event.connectivity.mode,
      capturedOffline:
        boundary === "offline" || step.event.connectivity.captured_offline,
    });
  }

  const allowed = authority.allowed;
  return {
    allowed,
    status: allowed ? "appended" : "denied",
    reason: authority.reason,
    authority,
    nextState: allowed
      ? {
          currentState: step.event.to_state,
          appendedEventIds: [...replay.appendedEventIds, step.event.id],
        }
      : replay,
    actorAssignmentId: actorAssignment?.id ?? "unresolved",
    actorRoleId,
    evidenceRecordIds,
    notificationIds: notificationFor(step.action).map((notice) => notice!.id),
    precondition,
    appendPolicy: "append_only",
  };
}

export function replayAcceptedPrefix(
  steps: PrototypeStep[],
  acceptedCount: number,
) {
  let state = initialReplayState();
  for (const step of steps.slice(0, acceptedCount)) {
    const result = validatePrototypeAppend(step, state);
    if (!result.allowed) return { state, failure: result };
    state = result.nextState;
  }
  return { state };
}
