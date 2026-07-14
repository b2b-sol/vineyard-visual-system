import type { Wave002ScreenId } from "./canonical";
import type { ScreenRecipe } from "./screenRecipes";

export const wave002Recipes: Record<Wave002ScreenId, ScreenRecipe> = {
  "SCR-007": {
    id: "SCR-007",
    eyebrow: "Scouting · pressure before product",
    headline: "Route field signals into an accountable protection decision",
    operatingQuestion:
      "Which block signal needs observation, recommendation, or release now?",
    layout: "monitor",
    primaryFixtureId: "FIX-010",
    stateFixtureIds: {
      partial: "FIX-008",
      urgent: "FIX-007",
      stale: "FIX-010",
      completion: "FIX-010",
    },
    highlights: ["Pressure state", "Decision owner", "Restriction consequence"],
  },
  "SCR-008": {
    id: "SCR-008",
    eyebrow: "Preflight · field truth at hand",
    headline: "Check wind, label, workers, and block scope before release",
    operatingQuestion: "Is this application safe and compliant to schedule?",
    layout: "capture",
    primaryFixtureId: "FIX-007",
    stateFixtureIds: {
      partial: "FIX-008",
      urgent: "FIX-007",
      conflict: "FIX-009",
      completion: "FIX-010",
    },
    highlights: ["Go / no-go", "Protection lead", "Safe release window"],
  },
  "SCR-009": {
    id: "SCR-009",
    eyebrow: "Application · execute and post the released scope",
    headline: "Record the treatment, worker posting, and follow-up handoff",
    operatingQuestion:
      "Was the scheduled scope applied, protected, and handed to monitoring?",
    layout: "delivery",
    primaryFixtureId: "FIX-010",
    stateFixtureIds: {
      corrected: "FIX-009",
      loading: "FIX-010",
      completion: "FIX-010",
    },
    highlights: ["Applied scope", "Worker posting", "Monitoring due"],
  },
  "SCR-010": {
    id: "SCR-010",
    eyebrow: "Report and efficacy · close the evidence loop",
    headline: "Publish the spray record and decide what follow-up proves",
    operatingQuestion:
      "Is the application reported, effective, or due for another bounded response?",
    layout: "assessment",
    primaryFixtureId: "FIX-010",
    stateFixtureIds: {
      partial: "FIX-008",
      corrected: "FIX-009",
      empty: "FIX-010",
      completion: "FIX-011",
    },
    highlights: ["Report status", "Efficacy score", "Follow-up due"],
  },
  "SCR-011": {
    id: "SCR-011",
    eyebrow: "Release board · conditions outrank plan",
    headline: "Hold the application when wind or restriction evidence fails",
    operatingQuestion: "Can this approved plan move into the field right now?",
    layout: "protection",
    primaryFixtureId: "FIX-007",
    stateFixtureIds: {
      urgent: "FIX-007",
      corrected: "FIX-009",
      error: "FIX-007",
      completion: "FIX-007",
    },
    highlights: ["Release status", "Constraint owner", "Next safe window"],
  },
  "SCR-012": {
    id: "SCR-012",
    eyebrow: "Field exception · contain and correct",
    headline:
      "Resolve restrictions or diary defects without losing field evidence",
    operatingQuestion:
      "What can be corrected now, and what must remain safely cancelled?",
    layout: "recovery",
    primaryFixtureId: "FIX-008",
    stateFixtureIds: {
      offline: "FIX-008",
      corrected: "FIX-009",
      read_only: "FIX-009",
      completion: "FIX-009",
    },
    highlights: ["Affected scope", "Restriction state", "Correction lineage"],
  },
  "SCR-013": {
    id: "SCR-013",
    eyebrow: "Water demand · evidence before runtime",
    headline:
      "Turn soil, plant, weather, and recent delivery into a recommendation",
    operatingQuestion:
      "What does this block need, and which evidence supports it?",
    layout: "water",
    primaryFixtureId: "FIX-015",
    stateFixtureIds: {
      partial: "FIX-014",
      blocked: "FIX-012",
      approval_pending: "FIX-015",
      completion: "FIX-015",
    },
    highlights: ["Moisture depletion", "Planned flow", "Recommendation owner"],
  },
  "SCR-014": {
    id: "SCR-014",
    eyebrow: "Approve and assign · evidence into executable scope",
    headline:
      "Approve the adjustment, then bind it to an accountable field owner",
    operatingQuestion:
      "Is the water and fertility adjustment supported and ready to assign?",
    layout: "water",
    primaryFixtureId: "FIX-015",
    stateFixtureIds: {
      partial: "FIX-014",
      blocked: "FIX-012",
      rejected: "FIX-013",
      completion: "FIX-015",
    },
    highlights: ["Demand trend", "Nutrient context", "Approval state"],
  },
  "SCR-015": {
    id: "SCR-015",
    eyebrow: "Set release · assignment into delivery",
    headline:
      "Release the assigned rows into delivery or redispatch the safe remainder",
    operatingQuestion:
      "Can this set start now, and what remains assigned after interruption?",
    layout: "delivery",
    primaryFixtureId: "FIX-015",
    stateFixtureIds: {
      blocked: "FIX-012",
      historical: "FIX-016",
      superseded: "FIX-013",
      completion: "FIX-015",
    },
    highlights: ["Set window", "Irrigator", "Expected volume"],
  },
  "SCR-016": {
    id: "SCR-016",
    eyebrow: "Field delivery · actuals over intent",
    headline: "Control the active set and record what water actually reached",
    operatingQuestion: "Can delivery start, continue, or close safely now?",
    layout: "delivery",
    primaryFixtureId: "FIX-012",
    stateFixtureIds: {
      blocked: "FIX-012",
      historical: "FIX-016",
      delayed: "FIX-014",
      completion: "FIX-015",
    },
    highlights: ["Active set", "Delivered volume", "Verification owner"],
  },
  "SCR-017": {
    id: "SCR-017",
    eyebrow: "Recovery · contain before restart",
    headline:
      "Preserve the interruption, repair evidence, and safe remaining set",
    operatingQuestion: "What must be true before this delivery can resume?",
    layout: "recovery",
    primaryFixtureId: "FIX-012",
    stateFixtureIds: {
      blocked: "FIX-012",
      incomplete_information: "FIX-012",
      completion: "FIX-012",
    },
    highlights: ["Interrupted scope", "Repair evidence", "Safe redispatch"],
  },
  "SCR-018": {
    id: "SCR-018",
    eyebrow: "Resources · late evidence stays visible",
    headline: "Supersede the adjustment when lab evidence changes the answer",
    operatingQuestion:
      "What must change without rewriting the original decision?",
    layout: "evidence",
    primaryFixtureId: "FIX-013",
    stateFixtureIds: {
      urgent: "FIX-013",
      completion: "FIX-013",
    },
    highlights: ["Late result", "Superseded plan", "Correction owner"],
  },
};
