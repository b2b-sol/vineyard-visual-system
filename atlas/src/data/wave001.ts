import {
  fixtureIndex,
  getStateContracts,
  screenIndex,
  stateIndex,
  type Fixture,
  type ScreenContract,
  type StateContract,
  type WaveScreenId,
  WAVE_001_SCREEN_IDS,
} from "./canonical";

export interface ScreenRecipe {
  id: WaveScreenId;
  eyebrow: string;
  headline: string;
  operatingQuestion: string;
  layout: "brief" | "plan" | "dispatch" | "field" | "evidence" | "labor";
  primaryFixtureId: string;
  stateFixtureIds: Record<string, string>;
  highlights: [string, string, string];
}

export const wave001Recipes: Record<WaveScreenId, ScreenRecipe> = {
  "SCR-001": {
    id: "SCR-001",
    eyebrow: "Today · evidence before motion",
    headline: "Route today’s vineyard work from current field evidence",
    operatingQuestion: "What needs attention before crews move?",
    layout: "brief",
    primaryFixtureId: "FIX-006",
    stateFixtureIds: {
      offline: "FIX-002",
      partial: "FIX-003",
      urgent: "FIX-005",
      completion: "FIX-006",
    },
    highlights: ["Current signal", "Decision owner", "Dispatch consequence"],
  },
  "SCR-002": {
    id: "SCR-002",
    eyebrow: "Season · intent into bounded work",
    headline: "Shape the season plan without losing block identity",
    operatingQuestion:
      "Which approved intent is ready to become assigned work?",
    layout: "plan",
    primaryFixtureId: "FIX-006",
    stateFixtureIds: {
      blocked: "FIX-052",
      partial: "FIX-053",
      completion: "FIX-006",
    },
    highlights: ["Season objective", "Block scope", "Approval boundary"],
  },
  "SCR-003": {
    id: "SCR-003",
    eyebrow: "Work plan · executable scope",
    headline: "Turn an approved plan into accountable field work",
    operatingQuestion: "Is scope complete enough to execute and verify?",
    layout: "plan",
    primaryFixtureId: "FIX-006",
    stateFixtureIds: {
      blocked: "FIX-052",
      stale: "FIX-003",
      partial: "FIX-053",
      completion: "FIX-006",
    },
    highlights: ["Rows and acreage", "Crew and window", "Proof required"],
  },
  "SCR-004": {
    id: "SCR-004",
    eyebrow: "Dispatch · constraint-aware release",
    headline: "Release only work whose scope, owner, and clock resolve",
    operatingQuestion: "What can be assigned now, and what must remain held?",
    layout: "dispatch",
    primaryFixtureId: "FIX-002",
    stateFixtureIds: {
      blocked: "FIX-052",
      stale: "FIX-003",
      corrected: "FIX-053",
      completion: "FIX-003",
    },
    highlights: ["Ready lane", "Held lane", "Recovery owner"],
  },
  "SCR-005": {
    id: "SCR-005",
    eyebrow: "Field · one assignment at a time",
    headline: "Carry stable scope and recovery rules into the rows",
    operatingQuestion:
      "Can the crew act safely, prove progress, and stop cleanly?",
    layout: "field",
    primaryFixtureId: "FIX-004",
    stateFixtureIds: {
      blocked: "FIX-052",
      corrected: "FIX-054",
      historical: "FIX-054",
      completion: "FIX-054",
    },
    highlights: ["Block and rows", "Field instruction", "Offline proof"],
  },
  "SCR-006": {
    id: "SCR-006",
    eyebrow: "Verify · immutable closeout",
    headline: "Compare planned scope, field actuals, and accepted evidence",
    operatingQuestion:
      "Is completion defensible, corrected, and ready to close?",
    layout: "evidence",
    primaryFixtureId: "FIX-054",
    stateFixtureIds: {
      stale: "FIX-003",
      corrected: "FIX-054",
      offline: "FIX-003",
      completion: "FIX-054",
    },
    highlights: ["Planned", "Reported", "Verified"],
  },
  "SCR-039": {
    id: "SCR-039",
    eyebrow: "Labor · demand before names",
    headline: "Match vineyard demand to qualified, available crew capacity",
    operatingQuestion: "Where will labor shortfall change the operating plan?",
    layout: "labor",
    primaryFixtureId: "FIX-032",
    stateFixtureIds: {
      blocked: "FIX-032",
      urgent: "FIX-032",
      historical: "FIX-047",
      completion: "FIX-032",
    },
    highlights: ["Demand hours", "Qualified capacity", "Coverage risk"],
  },
  "SCR-040": {
    id: "SCR-040",
    eyebrow: "Crew schedule · bounded commitment",
    headline: "Build a crew schedule that survives field change",
    operatingQuestion: "Who is committed, briefed, and ready for which scope?",
    layout: "dispatch",
    primaryFixtureId: "FIX-034",
    stateFixtureIds: {
      urgent: "FIX-033",
      partial: "FIX-032",
      offline: "FIX-033",
      completion: "FIX-034",
    },
    highlights: ["Crew roster", "Effective window", "Briefing status"],
  },
  "SCR-041": {
    id: "SCR-041",
    eyebrow: "Check-in · identity at the field edge",
    headline: "Confirm the right people, scope, and briefing before work",
    operatingQuestion: "Is every arrival attributable and cleared to begin?",
    layout: "field",
    primaryFixtureId: "FIX-034",
    stateFixtureIds: {
      blocked: "FIX-032",
      urgent: "FIX-033",
      stale: "FIX-033",
      completion: "FIX-034",
    },
    highlights: ["Crew identity", "Qualification", "Safety brief"],
  },
  "SCR-042": {
    id: "SCR-042",
    eyebrow: "Workboard · live crew state",
    headline: "Keep work, breaks, quantities, and safety state coherent",
    operatingQuestion: "What is the crew doing now, and what can happen next?",
    layout: "field",
    primaryFixtureId: "FIX-034",
    stateFixtureIds: {
      blocked: "FIX-032",
      urgent: "FIX-033",
      conflict: "FIX-033",
      completion: "FIX-034",
    },
    highlights: ["Current task", "Safety clock", "Recorded quantity"],
  },
  "SCR-043": {
    id: "SCR-043",
    eyebrow: "Time review · explain every interval",
    headline: "Review labor time against attendance, breaks, and work evidence",
    operatingQuestion: "Can a supervisor defend every submitted interval?",
    layout: "evidence",
    primaryFixtureId: "FIX-033",
    stateFixtureIds: {
      blocked: "FIX-032",
      urgent: "FIX-033",
      loading: "FIX-033",
      completion: "FIX-033",
    },
    highlights: ["Attendance", "Break ledger", "Supervisor proof"],
  },
  "SCR-044": {
    id: "SCR-044",
    eyebrow: "Payroll · accountable exception",
    headline: "Resolve pay exceptions without rewriting accepted history",
    operatingQuestion:
      "What changed, who can correct it, and what remains owed?",
    layout: "evidence",
    primaryFixtureId: "FIX-032",
    stateFixtureIds: {
      blocked: "FIX-032",
      corrected: "FIX-032",
      empty: "FIX-032",
      completion: "FIX-032",
    },
    highlights: ["Submitted time", "Exception reason", "Correction lineage"],
  },
  "SCR-045": {
    id: "SCR-045",
    eyebrow: "Cost · block-level reconciliation",
    headline: "Allocate accepted labor cost back to stable vineyard scope",
    operatingQuestion:
      "Do time, quantity, organization, and block totals reconcile?",
    layout: "evidence",
    primaryFixtureId: "FIX-033",
    stateFixtureIds: {
      urgent: "FIX-033",
      partial: "FIX-033",
      error: "FIX-033",
      completion: "FIX-033",
    },
    highlights: ["Accepted labor", "Allocation basis", "Balanced total"],
  },
};

export interface ResolvedScreenState {
  screen: ScreenContract;
  recipe: ScreenRecipe;
  fixture: Fixture;
  reviewState: string;
  stateContract?: StateContract;
  requestedState: string;
  modelOnly: boolean;
}

export function resolveScreenState(
  screenId: WaveScreenId,
  stateValue?: string | null,
  fixtureValue?: string | null,
): ResolvedScreenState {
  const screen = screenIndex.get(screenId)!;
  const recipe = wave001Recipes[screenId];
  const requestedState = stateValue || "normal";
  const stateContract = stateValue?.startsWith("STM-")
    ? stateIndex.get(stateValue)
    : undefined;
  const reviewState = stateContract?.kind ?? requestedState;
  const allowedState =
    screen.states.some((state) => state.id === reviewState) || stateContract;
  const normalizedState = allowedState ? reviewState : "normal";
  const contractFixture = stateContract?.source_ref.fixture_id;
  const stateFixture = recipe.stateFixtureIds[normalizedState];
  const requestedFixture = fixtureValue
    ? fixtureIndex.get(fixtureValue)
    : undefined;
  const requestedFixtureAllowed =
    requestedFixture && screen.fixture_ids.includes(requestedFixture.id);
  const fixtureId = requestedFixtureAllowed
    ? requestedFixture.id
    : contractFixture && screen.fixture_ids.includes(contractFixture)
      ? contractFixture
      : stateFixture && screen.fixture_ids.includes(stateFixture)
        ? stateFixture
        : recipe.primaryFixtureId;
  const fixture =
    fixtureIndex.get(fixtureId) ?? fixtureIndex.get(screen.fixture_ids[0])!;

  return {
    screen,
    recipe,
    fixture,
    reviewState: normalizedState,
    stateContract,
    requestedState,
    modelOnly: stateContract?.source_ref.type === "canonical",
  };
}

export const reviewStateCount = WAVE_001_SCREEN_IDS.reduce(
  (total, screenId) => total + screenIndex.get(screenId)!.states.length,
  0,
);

export const canonicalStateCount = WAVE_001_SCREEN_IDS.reduce(
  (total, screenId) => total + getStateContracts(screenId).length,
  0,
);
