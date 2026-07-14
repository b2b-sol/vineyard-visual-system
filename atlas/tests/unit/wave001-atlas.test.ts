import {
  fixtureIndex,
  getComponentsForScreen,
  getStateContracts,
  permissionIndex,
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
  derivePartialMeasure,
  deriveReconciliationMeasure,
  getCorrectionLineage,
  resolveActionAuthority,
  visibleComponentIds,
} from "../../src/data/screenViewModel";
import { publicComponentExports } from "../../src/components/production/componentRegistry";
import {
  buildPrototypeSteps,
  initialReplayState,
  validatePrototypeAppend,
} from "../../src/data/prototypes";
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
        expect(resolved.stateContract.kind).toBe(state.id);
        if (resolved.modelOnly) {
          expect(model.records.length).toBeGreaterThan(0);
          expect(model.events).toHaveLength(0);
          expect(model.activeEvent).toBeUndefined();
          expect(model.scenario).toBeUndefined();
        } else {
          expect(model.events.length).toBeGreaterThan(0);
          expect(model.activeEvent?.id).toBe(
            resolved.stateContract.source_ref.event_id,
          );
          expect(model.scenario?.id).toBe(
            resolved.stateContract.source_ref.scenario_id,
          );
          expect(model.fixture.id).toBe(
            resolved.stateContract.source_ref.fixture_id,
          );
        }
      }
    }
  });

  it("resolves every STM contract without inventing a fixture or state", () => {
    for (const screenId of WAVE_001_SCREEN_IDS) {
      for (const contract of getStateContracts(screenId)) {
        const resolved = resolveScreenState(screenId, contract.id);
        expect(resolved.stateContract.id).toBe(contract.id);
        expect(resolved.reviewState).toBe(contract.kind);
        expect(resolved.screen.fixture_ids).toContain(resolved.fixture.id);
        expect(resolved.modelOnly).toBe(
          ["canonical", "ui"].includes(contract.source_ref.type),
        );
        if (contract.source_ref.type === "operational") {
          expect(resolved.activeEventId).toBe(contract.source_ref.event_id);
          expect(resolved.scenarioId).toBe(contract.source_ref.scenario_id);
        }
      }
    }
  });

  it("rejects fixture overrides that do not own the selected state evidence", () => {
    const conflict = resolveScreenState("SCR-042", "conflict", "FIX-035");
    expect(conflict.stateContract.id).toBe("STM-0298");
    expect(conflict.fixture.id).toBe("FIX-033");
    expect(conflict.activeEventId).toBe("EVT-00100");
    expect(conflict.fixtureOverrideRejected).toBe(true);
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
    expect(planToVerify.map((step) => step.screenId)).toEqual([
      "SCR-001",
      "SCR-002",
      "SCR-003",
      "SCR-004",
      "SCR-005",
      "SCR-005",
      "SCR-005",
      "SCR-006",
    ]);
    expect(crewToCost.every((step) => step.actionId && step.screenId)).toBe(
      true,
    );
    expect(comparison.filter((step) => step.lane === "WF-001")).toHaveLength(9);
    expect(comparison.filter((step) => step.lane === "WF-007")).toHaveLength(
      10,
    );
  });

  it("enforces exact grants, state availability, assignment, scope, and evidence by default", () => {
    for (const screen of waveScreens) {
      for (const contract of getStateContracts(screen.id)) {
        const model = createScreenViewModel(
          resolveScreenState(screen.id, contract.id),
        );
        for (const action of screen.actions) {
          for (const roleId of screen.review_role_ids) {
            const result = resolveActionAuthority(action, roleId, model);
            if (!result.allowed) continue;
            expect(contract.available_actions).toContain(action.id);
            expect(contract.blocked_actions).not.toContain(action.id);
            expect(result.assignmentId).toMatch(/^ASG-/);
            expect(result.scopeId).toMatch(/^SCP-/);
            const permission = permissionIndex.get(result.permissionId!);
            expect(permission?.effect).toBe("allow");
            if (action.kind === "inspect") {
              expect(permission?.role_ids).toContain(roleId);
            } else {
              expect(action.transition?.from).toBe(contract.canonical_state);
              expect(
                permission?.grants.some(
                  (grant) =>
                    grant.transition_id === action.transition?.transition_id &&
                    grant.role_ids.includes(roleId),
                ),
              ).toBe(true);
            }
          }
        }
      }
    }

    const approval = waveScreens
      .flatMap((screen) => screen.actions)
      .find((action) => action.id === "ACT-003")!;
    const approvalModel = createScreenViewModel(
      resolveScreenState("SCR-003", "STM-0016"),
    );
    expect(
      resolveActionAuthority(approval, "ROLE-VITICULTURIST", approvalModel)
        .allowed,
    ).toBe(false);
  });

  it("keeps at least one exact enabled control on each initial field responsibility", () => {
    for (const screenId of ["SCR-005", "SCR-041", "SCR-042"] as const) {
      const model = createScreenViewModel(
        resolveScreenState(screenId, "normal"),
      );
      const roleId = model.screen.primary_role_ids[0];
      const enabled = model.screen.actions.filter(
        (action) => resolveActionAuthority(action, roleId, model).allowed,
      );
      expect(
        enabled.length,
        `${screenId}/${model.stateContract.id} must expose an exact enabled control`,
      ).toBeGreaterThan(0);
    }
  });

  it("derives visible measures and lineage only from typed fixture evidence", () => {
    const partial = createScreenViewModel(
      resolveScreenState("SCR-003", "partial"),
    );
    const partialMeasure = derivePartialMeasure(partial);
    if (partialMeasure) {
      expect(partialMeasure.sourceRecordIds.length).toBeGreaterThan(0);
      expect(partialMeasure.accepted).toBeLessThanOrEqual(partialMeasure.total);
    }

    const allocation = createScreenViewModel(
      resolveScreenState("SCR-045", "normal"),
    );
    const reconciliation = deriveReconciliationMeasure(allocation);
    expect(reconciliation?.unit).toBe("USD");
    expect(reconciliation?.sourceRecordIds).toContain("RCI-00290");

    const corrected = createScreenViewModel(
      resolveScreenState("SCR-005", "corrected"),
    );
    const lineage = getCorrectionLineage(corrected);
    expect(
      lineage.every(
        (entry) =>
          entry.relation === "corrects" || entry.relation === "supersedes",
      ),
    ).toBe(true);
  });

  it("validates prototype append-only, actor, base, sync, and conflict boundaries", () => {
    for (const flowId of ["FLW-001", "FLW-007"] as const) {
      let state = initialReplayState();
      for (const step of buildPrototypeSteps(flowId)) {
        const result = validatePrototypeAppend(step, state);
        expect(
          result.allowed,
          `${flowId}/${step.event.id}: ${result.reason}`,
        ).toBe(true);
        state = result.nextState;
      }
    }

    const first = buildPrototypeSteps("FLW-001")[0];
    const initial = initialReplayState();
    expect(validatePrototypeAppend(first, initial, "wrong_actor").allowed).toBe(
      false,
    );
    expect(validatePrototypeAppend(first, initial, "stale_base").allowed).toBe(
      false,
    );
    expect(validatePrototypeAppend(first, initial, "conflict").allowed).toBe(
      false,
    );

    const onlineRequired = buildPrototypeSteps("FLW-001")[2];
    const beforeApproval = buildPrototypeSteps("FLW-001")
      .slice(0, 2)
      .reduce((state, step) => {
        const result = validatePrototypeAppend(step, state);
        expect(result.allowed).toBe(true);
        return result.nextState;
      }, initialReplayState());
    expect(
      validatePrototypeAppend(onlineRequired, beforeApproval, "offline")
        .allowed,
    ).toBe(false);

    const appended = validatePrototypeAppend(first, initial).nextState;
    expect(validatePrototypeAppend(first, appended).reason).toContain(
      "already exists",
    );
  });
});
