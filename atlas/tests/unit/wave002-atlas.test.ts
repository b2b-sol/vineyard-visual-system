import { describe, expect, it } from "vitest";
import {
  getStateContracts,
  productionScreens,
  screenIndex,
  WAVE_002_SCREEN_IDS,
} from "../../src/data/canonical";
import { buildPrototypeSteps } from "../../src/data/prototypes";
import { resolveScreenState } from "../../src/data/screenRecipes";
import {
  actionExplanation,
  canRolePerform,
  createScreenViewModel,
  presentationFor,
  visibleComponentIds,
} from "../../src/data/screenViewModel";

describe("WAVE-002 deliverable-first atlas", () => {
  it("loads the exact twelve-screen canonical inventory", () => {
    expect(
      productionScreens
        .filter((screen) =>
          WAVE_002_SCREEN_IDS.includes(
            screen.id as (typeof WAVE_002_SCREEN_IDS)[number],
          ),
        )
        .map((screen) => screen.id),
    ).toEqual(WAVE_002_SCREEN_IDS);
    expect(
      WAVE_002_SCREEN_IDS.reduce(
        (total, screenId) => total + screenIndex.get(screenId)!.states.length,
        0,
      ),
    ).toBe(56);
  });

  it("resolves every declared review and canonical state without inventing fixture evidence", () => {
    for (const screenId of WAVE_002_SCREEN_IDS) {
      const screen = screenIndex.get(screenId)!;
      for (const state of screen.states) {
        const resolved = resolveScreenState(screenId, state.id);
        const model = createScreenViewModel(resolved);
        expect(resolved.screen.id).toBe(screenId);
        expect(resolved.reviewState).toBe(state.id);
        expect(screen.fixture_ids).toContain(resolved.fixture.id);
        expect(visibleComponentIds(model).length).toBeGreaterThan(0);
        if (resolved.modelOnly) {
          expect(resolved.activeEventId).toBeUndefined();
        }
      }
      for (const contract of getStateContracts(screenId)) {
        expect(resolveScreenState(screenId, contract.id).stateContract.id).toBe(
          contract.id,
        );
      }
    }
  });

  it("puts an enabled canonical action first on each field-mobile responsibility", () => {
    const results: Array<{
      screenId: string;
      enabled: boolean;
      reasons: string[];
    }> = [];
    for (const screenId of ["SCR-008", "SCR-012", "SCR-016"] as const) {
      const model = createScreenViewModel(
        resolveScreenState(screenId, "normal"),
      );
      const roleId =
        model.screen.primary_role_ids.find((candidate) =>
          model.screen.actions.some((action) =>
            canRolePerform(action, candidate, model),
          ),
        ) ?? model.screen.primary_role_ids[0];
      expect(visibleComponentIds(model)[0]).toBe("CMP-007");
      results.push({
        screenId,
        enabled: model.screen.actions.some((action) =>
          canRolePerform(action, roleId, model),
        ),
        reasons: model.screen.actions.map((action) =>
          actionExplanation(action, roleId, model),
        ),
      });
    }
    expect(results).toEqual([
      { screenId: "SCR-008", enabled: true, reasons: [] },
      { screenId: "SCR-012", enabled: true, reasons: [] },
      { screenId: "SCR-016", enabled: true, reasons: [] },
    ]);
  });

  it("gives every new non-ideal state explicit non-color language", () => {
    for (const state of [
      "approval_pending",
      "delayed",
      "incomplete_information",
      "read_only",
      "rejected",
      "superseded",
    ]) {
      const presentation = presentationFor("SCR-013", state);
      expect(presentation.symbol).not.toBe("");
      expect(presentation.title).not.toBe("Ready with current evidence");
      expect(presentation.detail.length).toBeGreaterThan(30);
    }
  });

  it("replays the existing WF-002 and WF-003 flows without focused-fixture duplicates", () => {
    const cropProtection = buildPrototypeSteps("FLW-002");
    const irrigation = buildPrototypeSteps("FLW-003");
    expect(cropProtection).toHaveLength(5);
    expect(irrigation).toHaveLength(10);
    for (const steps of [cropProtection, irrigation]) {
      expect(new Set(steps.map((step) => step.event.id)).size).toBe(
        steps.length,
      );
      expect(
        steps.every(
          (step) =>
            step.action.transition?.transition_id === step.event.transition_id,
        ),
      ).toBe(true);
    }
  });
});
