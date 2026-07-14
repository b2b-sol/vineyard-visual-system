import {
  fixtureIndex,
  getComponentsForScreen,
  getStateContracts,
  waveComponents,
  waveScreens,
  WAVE_001_COMPONENT_IDS,
  WAVE_001_SCREEN_IDS,
} from "../../src/data/canonical";
import {
  canonicalStateCount,
  resolveScreenState,
  reviewStateCount,
} from "../../src/data/wave001";
import {
  createScreenViewModel,
  visibleComponentIds,
} from "../../src/data/screenViewModel";
import { publicComponentExports } from "../../src/components/production/componentRegistry";
import { buildPrototypeSteps } from "../../src/data/prototypes";
import { describe, expect, it } from "vitest";

describe("WAVE-001 registry-backed atlas", () => {
  it("owns the exact screen, review-state, canonical-state, and public-component inventory", () => {
    expect(waveScreens.map((screen) => screen.id)).toEqual(WAVE_001_SCREEN_IDS);
    expect(reviewStateCount).toBe(64);
    expect(canonicalStateCount).toBe(93);
    expect(waveComponents.map((component) => component.id)).toEqual(
      WAVE_001_COMPONENT_IDS,
    );
    expect(Object.keys(publicComponentExports)).toEqual(WAVE_001_COMPONENT_IDS);
  });

  it("resolves every required review state to a connected, allowed fixture", () => {
    for (const screen of waveScreens) {
      for (const state of screen.states) {
        const resolved = resolveScreenState(screen.id, state.id);
        const model = createScreenViewModel(resolved);
        expect(resolved.reviewState).toBe(state.id);
        expect(screen.fixture_ids).toContain(resolved.fixture.id);
        expect(fixtureIndex.has(resolved.fixture.id)).toBe(true);
        expect(model.events.length).toBeGreaterThan(0);
        expect(model.records.length).toBeGreaterThan(0);
        expect(model.scenario.id).toMatch(/^SCN-/);
      }
    }
  });

  it("resolves every STM contract without inventing a fixture or state", () => {
    for (const screenId of WAVE_001_SCREEN_IDS) {
      for (const contract of getStateContracts(screenId)) {
        const resolved = resolveScreenState(screenId, contract.id);
        expect(resolved.stateContract?.id).toBe(contract.id);
        expect(resolved.reviewState).toBe(contract.kind);
        expect(resolved.screen.fixture_ids).toContain(resolved.fixture.id);
        expect(resolved.modelOnly).toBe(
          contract.source_ref.type === "canonical",
        );
      }
    }
  });

  it("maps every required component to a callable stable export", () => {
    for (const componentId of WAVE_001_COMPONENT_IDS) {
      expect(publicComponentExports[componentId]).toBeTypeOf("function");
    }
    for (const screenId of WAVE_001_SCREEN_IDS) {
      expect(getComponentsForScreen(screenId).map((item) => item.id)).toContain(
        "CMP-002",
      );
      expect(getComponentsForScreen(screenId).map((item) => item.id)).toContain(
        "CMP-036",
      );
    }
  });

  it("realizes each screen contract as a focused state composition with exact union coverage", () => {
    for (const screen of waveScreens) {
      const realized = new Set<string>();
      for (const state of screen.states) {
        const model = createScreenViewModel(
          resolveScreenState(screen.id, state.id),
        );
        const visible = visibleComponentIds(model);
        expect(visible.length).toBeGreaterThanOrEqual(3);
        expect(visible.length).toBeLessThan(model.componentIds.length);
        for (const componentId of visible) realized.add(componentId);
      }
      realized.add("CMP-002");
      expect([...realized].sort()).toEqual(
        getComponentsForScreen(screen.id)
          .map((component) => component.id)
          .sort(),
      );
    }
  });

  it("replays the exact full fixture sequences without missing action allocations", () => {
    const planToVerify = buildPrototypeSteps("FLW-001");
    const crewToCost = buildPrototypeSteps("FLW-007");
    const comparison = buildPrototypeSteps("FLW-015");

    expect(planToVerify.map((step) => step.event.id)).toEqual([
      "EVT-00384",
      "EVT-00386",
      "EVT-00388",
      "EVT-00391",
      "EVT-00393",
      "EVT-00395",
      "EVT-00397",
      "EVT-00400",
    ]);
    expect(crewToCost.map((step) => step.event.id)).toEqual([
      "EVT-00097",
      "EVT-00098",
      "EVT-00099",
      "EVT-00100",
      "EVT-00101",
      "EVT-00102",
      "EVT-00103",
      "EVT-00104",
      "EVT-00105",
      "EVT-00106",
    ]);
    expect(planToVerify.every((step) => step.actionId && step.screenId)).toBe(
      true,
    );
    expect(crewToCost.every((step) => step.actionId && step.screenId)).toBe(
      true,
    );
    expect(comparison.filter((step) => step.lane === "WF-001")).toHaveLength(9);
    expect(comparison.filter((step) => step.lane === "WF-007")).toHaveLength(
      10,
    );
  });
});
