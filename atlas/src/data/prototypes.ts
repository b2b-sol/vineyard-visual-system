import {
  fixtureIndex,
  getActionForTransition,
  getAssignmentLabel,
  getFixtureEvents,
  type CanonicalEvent,
  type Fixture,
} from "./canonical";

export interface PrototypeStep {
  event: CanonicalEvent;
  fixture: Fixture;
  lane: string;
  screenId?: string;
  actionId?: string;
  actorRoleId: string;
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
  return fixtureIds.flatMap((fixtureId) => {
    const fixture = fixtureIndex.get(fixtureId)!;
    return getFixtureEvents(fixture).map((event) => {
      const actionMatch = getActionForTransition(event.transition_id);
      return {
        event,
        fixture,
        lane: fixture.workflow_id,
        screenId: actionMatch?.screen.id,
        actionId: actionMatch?.action.id,
        actorRoleId: getAssignmentLabel(event.actor_assignment_id).roleId,
      };
    });
  });
}
