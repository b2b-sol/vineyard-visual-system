import {
  fixtureIndex,
  getFixtureEvents,
  getStateContracts,
  screenIndex,
  stateIndex,
  type Fixture,
  type ScreenContract,
  type StateContract,
  type WaveScreenId,
} from "./canonical";
import { wave001Recipes } from "./wave001";
import { wave002Recipes } from "./wave002";

export type ScreenLayout =
  | "brief"
  | "plan"
  | "dispatch"
  | "field"
  | "evidence"
  | "labor"
  | "monitor"
  | "capture"
  | "assessment"
  | "protection"
  | "water"
  | "delivery"
  | "recovery";

export interface ScreenRecipe {
  id: WaveScreenId;
  eyebrow: string;
  headline: string;
  operatingQuestion: string;
  layout: ScreenLayout;
  primaryFixtureId: string;
  stateFixtureIds: Record<string, string>;
  highlights: [string, string, string];
}

export const productionRecipes: Record<WaveScreenId, ScreenRecipe> = {
  ...wave001Recipes,
  ...wave002Recipes,
};

export interface ResolvedScreenState {
  screen: ScreenContract;
  recipe: ScreenRecipe;
  fixture: Fixture;
  reviewState: string;
  stateContract: StateContract;
  requestedState: string;
  modelOnly: boolean;
  activeEventId?: string;
  scenarioId?: string;
  fixtureOverrideRejected: boolean;
}

export function resolveScreenState(
  screenId: WaveScreenId,
  stateValue?: string | null,
  fixtureValue?: string | null,
): ResolvedScreenState {
  const screen = screenIndex.get(screenId)!;
  const recipe = productionRecipes[screenId];
  const requestedState = stateValue || "normal";
  const explicitContract = stateValue?.startsWith("STM-")
    ? stateIndex.get(stateValue)
    : undefined;
  const validExplicitContract =
    explicitContract?.screen_id === screenId ? explicitContract : undefined;
  const reviewState = validExplicitContract?.kind ?? requestedState;
  const allowedState =
    screen.states.some((state) => state.id === reviewState) ||
    validExplicitContract;
  const normalizedState = allowedState ? reviewState : "normal";
  const candidates = getStateContracts(screenId).filter(
    (contract) => contract.kind === normalizedState,
  );
  const requestedFixture = fixtureValue
    ? fixtureIndex.get(fixtureValue)
    : undefined;
  const requestedFixtureAllowed = Boolean(
    requestedFixture && screen.fixture_ids.includes(requestedFixture.id),
  );
  const preferredFixtureId = requestedFixtureAllowed
    ? requestedFixture!.id
    : (recipe.stateFixtureIds[normalizedState] ?? recipe.primaryFixtureId);
  const operationalCandidates = candidates.filter(
    (contract) => contract.source_ref.type === "operational",
  );
  const preferredFixture = fixtureIndex.get(preferredFixtureId);
  const contextualCandidate = preferredFixture
    ? candidates
        .map((contract) => ({
          contract,
          event: getFixtureEvents(preferredFixture).find((event) =>
            screen.actions.some(
              (action) =>
                contract.available_actions.includes(action.id) &&
                action.transition?.transition_id === event.transition_id &&
                event.from_state === contract.canonical_state,
            ),
          ),
        }))
        .find((candidate) => candidate.event)
    : undefined;
  const stateContract =
    validExplicitContract ??
    operationalCandidates.find(
      (contract) => contract.source_ref.fixture_id === preferredFixtureId,
    ) ??
    contextualCandidate?.contract ??
    operationalCandidates[0] ??
    candidates[0];

  if (!stateContract) {
    throw new Error(
      `${screenId} has no canonical state contract for ${normalizedState}`,
    );
  }

  const contractFixture = stateContract.source_ref.fixture_id;
  const stateFixture = recipe.stateFixtureIds[normalizedState];
  const contextFixtureId =
    stateFixture && screen.fixture_ids.includes(stateFixture)
      ? stateFixture
      : recipe.primaryFixtureId;
  const contextFixture = fixtureIndex.get(
    requestedFixtureAllowed ? requestedFixture!.id : contextFixtureId,
  );
  const contextualEvent = contextFixture
    ? getFixtureEvents(contextFixture).find((event) =>
        screen.actions.some(
          (action) =>
            stateContract.available_actions.includes(action.id) &&
            action.transition?.transition_id === event.transition_id &&
            event.from_state === stateContract.canonical_state,
        ),
      )
    : undefined;
  const modelOnly =
    !contextualEvent &&
    ["canonical", "ui"].includes(stateContract.source_ref.type);
  const fixtureOverrideCompatible = Boolean(
    requestedFixtureAllowed &&
      ((contractFixture && requestedFixture!.id === contractFixture) ||
        contextualEvent ||
        (modelOnly && requestedFixture!.id === contextFixtureId)),
  );
  const fixtureId =
    contextualEvent && contextFixture
      ? contextFixture.id
      : contractFixture && screen.fixture_ids.includes(contractFixture)
        ? contractFixture
        : modelOnly && fixtureOverrideCompatible && requestedFixtureAllowed
          ? requestedFixture!.id
          : contextFixtureId;
  const fixture =
    fixtureIndex.get(fixtureId) ?? fixtureIndex.get(screen.fixture_ids[0])!;

  return {
    screen,
    recipe,
    fixture,
    reviewState: normalizedState,
    stateContract,
    requestedState,
    modelOnly,
    activeEventId:
      contextualEvent?.id ??
      (modelOnly ? undefined : stateContract.source_ref.event_id),
    scenarioId: contextualEvent
      ? undefined
      : modelOnly
        ? undefined
        : stateContract.source_ref.scenario_id,
    fixtureOverrideRejected: Boolean(
      fixtureValue && (!requestedFixtureAllowed || !fixtureOverrideCompatible),
    ),
  };
}
