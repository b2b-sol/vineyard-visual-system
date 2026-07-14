import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

import eventDocument from "../../../data/events.json";
import operation from "../../../data/operation.json";
import scenarioFixtureDocument from "../../../data/scenario-fixtures.json";
import flowDocument from "../../../product-structure/flows.json";
import notificationDocument from "../../../product-structure/notifications.json";
import permissionDocument from "../../../product-structure/permissions.json";
import requirementDocument from "../../../product-structure/requirements.json";
import stateDocument from "../../../product-structure/state-matrix.json";
import dispositionDocument from "../../../product-structure/transition-dispositions.json";
import scenarioCatalog from "../../../scenarios/scenarios.json";
import walkingScenarioDocument from "../../../scenarios/walking-slice.json";
import scenarioFixtureSchema from "../../../schemas/scenario-fixture.schema.json";
import scenarioSchema from "../../../schemas/scenario.schema.json";
import screenSchema from "../../../schemas/screen.schema.json";
import traceEdgeSchema from "../../../schemas/trace-edge.schema.json";
import traceNodeSchema from "../../../schemas/trace-node.schema.json";
import screenCatalog from "../../../screens/screens.json";
import walkingScreenDocument from "../../../screens/walking-slice.json";
import workflowDocument from "../../../workflow-model/workflows.json";

const compile = (schema: object) => {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  return ajv.compile(schema);
};

describe("PROD-001 product contracts", () => {
  it("keeps 60 full-season pointer fixtures referentially exact", () => {
    const validate = compile(scenarioFixtureSchema);
    expect(
      validate(scenarioFixtureDocument),
      JSON.stringify(validate.errors),
    ).toBe(true);

    const workflowInstanceIds = new Set(
      operation.workflow_instances.map((item) => item.id),
    );
    const eventIndex = new Map(
      eventDocument.events.map((event) => [event.id, event]),
    );
    const recordIds = new Set(
      operation.record_instances.map((record) => record.id),
    );
    const chainIds = new Set(
      operation.operational_chains.map((chain) => chain.id),
    );
    const overlayIds = new Set(
      operation.overlay_applications.map((overlay) => overlay.overlay_id),
    );

    expect(scenarioFixtureDocument.reserved_fixture_ids).toEqual(["FIX-001"]);
    expect(scenarioFixtureDocument.fixtures).toHaveLength(60);
    expect(
      new Set(
        scenarioFixtureDocument.fixtures.map(
          (fixture) => fixture.workflow_instance_id,
        ),
      ).size,
    ).toBe(50);

    for (const fixture of scenarioFixtureDocument.fixtures) {
      expect(workflowInstanceIds.has(fixture.workflow_instance_id)).toBe(true);
      expect(fixture.event_ids).toContain(fixture.anchor.event_id);
      expect(fixture.overlay_ids.length).toBeGreaterThan(0);
      for (const eventId of fixture.event_ids)
        expect(eventIndex.has(eventId)).toBe(true);
      for (const recordId of fixture.record_instance_ids)
        expect(recordIds.has(recordId)).toBe(true);
      for (const chainId of fixture.operational_chain_ids)
        expect(chainIds.has(chainId)).toBe(true);
      for (const overlayId of fixture.overlay_ids)
        expect(overlayIds.has(overlayId)).toBe(true);

      const anchor = eventIndex.get(fixture.anchor.event_id)!;
      expect(fixture.anchor).toMatchObject({
        transition_id: anchor.transition_id,
        from_state: anchor.from_state,
        to_state: anchor.to_state,
        semantic_kind: anchor.kind,
        actor_assignment_id: anchor.actor_assignment_id,
        record_reads: anchor.record_reads,
        record_writes: anchor.record_writes,
        decision_ids: anchor.decision_ids,
        exception_history_ids: anchor.exception_history_ids,
      });
    }
  });

  it("validates exact v2 scenario step contracts while preserving v1", () => {
    const validate = compile(scenarioSchema);
    expect(validate(walkingScenarioDocument.scenarios[0])).toBe(true);

    const v2Scenario = structuredClone(scenarioCatalog.scenarios[0]);
    expect(validate(v2Scenario), JSON.stringify(validate.errors)).toBe(true);
    delete (v2Scenario.operational_steps[0] as { transition_id?: string })
      .transition_id;
    expect(validate(v2Scenario)).toBe(false);
  });

  it("requires permission, notification, sync, record, decision, and audit contracts for v2 consequential actions", () => {
    const validate = compile(screenSchema);
    expect(validate(walkingScreenDocument.screens[0])).toBe(true);

    const v2Screen = structuredClone(screenCatalog.screens[0]);
    expect(validate(v2Screen), JSON.stringify(validate.errors)).toBe(true);
    delete (v2Screen.actions[0] as Partial<(typeof v2Screen.actions)[0]>)
      .permission_rule_ids;
    expect(validate(v2Screen)).toBe(false);
  });

  it("keeps the complete product catalog exact across transitions, evidence, policy, state, and flows", () => {
    const canonicalTransitions = workflowDocument.workflows.flatMap(
      (workflow) =>
        workflow.transitions.map((transition) => ({
          ...transition,
          workflow_id: workflow.id,
        })),
    );
    const transitionIds = new Set(
      canonicalTransitions.map((transition) => transition.id),
    );
    const scenarioIndex = new Map(
      scenarioCatalog.scenarios.map((scenario) => [scenario.id, scenario]),
    );
    const actionIndex = new Map(
      screenCatalog.screens.flatMap((screen) =>
        screen.actions.map(
          (action) => [action.id, { ...action, screen_id: screen.id }] as const,
        ),
      ),
    );
    const eventIndex = new Map(
      eventDocument.events.map((event) => [event.id, event]),
    );
    const permissionIds = new Set(
      permissionDocument.rules.map((rule) => rule.id),
    );
    const notificationIndex = new Map(
      notificationDocument.rules.map((rule) => [rule.id, rule]),
    );

    expect(canonicalTransitions).toHaveLength(235);
    expect(dispositionDocument.transitions).toHaveLength(235);
    expect(screenCatalog.screens).toHaveLength(67);
    expect(requirementDocument.requirements).toHaveLength(100);
    expect(permissionDocument.rules).toHaveLength(60);
    expect(notificationDocument.rules).toHaveLength(235);
    expect(stateDocument.states).toHaveLength(471);
    expect(flowDocument.flows).toHaveLength(20);

    for (const disposition of dispositionDocument.transitions) {
      expect(transitionIds.has(disposition.transition_id)).toBe(true);
      const action = actionIndex.get(disposition.action_id);
      expect(action?.screen_id).toBe(disposition.screen_id);
      expect(action?.transition?.transition_id).toBe(disposition.transition_id);
      expect(action?.evidence_status).toBe(
        disposition.fixture_evidence_status === "fixture_realized"
          ? "fixture_realized"
          : "canonical_branch",
      );
      expect(action?.scenario_ids).toEqual(disposition.scenario_ids);
    }

    for (const screen of screenCatalog.screens) {
      for (const action of screen.actions) {
        if (action.kind === "inspect") continue;
        expect(action.permission_rule_ids.length).toBeGreaterThan(0);
        for (const permissionId of action.permission_rule_ids)
          expect(permissionIds.has(permissionId)).toBe(true);
        expect(action.notification_rule_ids).toHaveLength(1);
        const notificationRule = notificationIndex.get(
          action.notification_rule_ids[0],
        )!;
        const inlineNotification = action.notifications?.[0];
        if (!inlineNotification || !action.sync)
          throw new Error(`${screen.id}/${action.id}: incomplete v2 contract`);
        expect(notificationRule.trigger_transition_ids).toEqual([
          action.transition!.transition_id,
        ]);
        expect(inlineNotification.recipient_role_ids).toEqual(
          notificationRule.recipient_role_ids,
        );
        expect(inlineNotification.channel).toBe(
          notificationRule.canonical_channel,
        );
        expect(inlineNotification.urgency).toBe(
          notificationRule.severity === "information"
            ? "routine"
            : notificationRule.severity,
        );
        expect(inlineNotification.acknowledgement_required).toBe(
          notificationRule.acknowledgement !== "none",
        );
        expect(action.sync_class_id).toMatch(/^SYNC-00[1-3]$/);
        const transitionId = action.transition?.transition_id;
        expect(transitionId).toBeDefined();
        for (const scenarioId of action.scenario_ids) {
          const scenario = scenarioIndex.get(scenarioId);
          expect(
            scenario?.expected_transitions.some(
              (transition) => transition.transition_id === transitionId,
            ),
          ).toBe(true);
        }
        if (
          action.transition?.workflow_id === "WF-006" &&
          (action.transition.from === "quality_pending" ||
            ["accepted", "rejected", "downgraded"].includes(
              action.transition.to,
            ))
        ) {
          expect(action.sync_class_id).toBe("SYNC-003");
          expect(action.sync.mode).toBe("online");
          expect(action.sync.offline_capable).toBe(false);
        }
      }
    }

    for (const requirement of requirementDocument.requirements) {
      const linkedScenarioTransitions = new Set(
        requirement.scenario_ids.flatMap((scenarioId) =>
          (scenarioIndex.get(scenarioId)?.expected_transitions ?? []).map(
            (transition) => transition.transition_id,
          ),
        ),
      );
      for (const transitionId of requirement.transition_ids)
        expect(linkedScenarioTransitions.has(transitionId)).toBe(true);
    }

    for (const state of stateDocument.states) {
      expect(
        state.available_actions.filter((actionId) =>
          state.blocked_actions.includes(actionId),
        ),
      ).toEqual([]);
    }

    for (const flow of flowDocument.flows) {
      const steps = [
        ...flow.entry_points,
        ...flow.normal_path,
        ...flow.exception_path,
        ...flow.recovery_path,
        ...flow.completion_path,
      ];
      for (const step of steps) {
        const action = actionIndex.get(step.action_id);
        const event = eventIndex.get(step.event_id);
        expect(action?.screen_id).toBe(step.screen_id);
        expect(action?.transition?.transition_id).toBe(step.transition_id);
        expect(event?.transition_id).toBe(step.transition_id);
        expect(action?.scenario_ids).toContain(step.scenario_id);
      }
    }
  });

  it("keeps WAVE-001 narratives complete and WF-007 responsibilities semantic", () => {
    const orderedEventIds = (flowId: string) => {
      const flow = flowDocument.flows.find(
        (candidate) => candidate.id === flowId,
      )!;
      return [
        ...flow.normal_path,
        ...flow.exception_path,
        ...flow.recovery_path,
        ...flow.completion_path,
      ].map((step) => step.event_id);
    };
    expect(orderedEventIds("FLW-001")).toEqual([
      "EVT-00384",
      "EVT-00386",
      "EVT-00388",
      "EVT-00391",
      "EVT-00393",
      "EVT-00395",
      "EVT-00397",
      "EVT-00400",
    ]);
    expect(orderedEventIds("FLW-007")).toEqual([
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
    const wf001Flow = flowDocument.flows.find((flow) => flow.id === "FLW-001")!;
    expect(
      [
        ...wf001Flow.normal_path,
        ...wf001Flow.exception_path,
        ...wf001Flow.recovery_path,
        ...wf001Flow.completion_path,
      ].map((step) => step.screen_id),
    ).toEqual([
      "SCR-001",
      "SCR-002",
      "SCR-003",
      "SCR-004",
      "SCR-005",
      "SCR-005",
      "SCR-005",
      "SCR-006",
    ]);
    expect(
      flowDocument.flows.find((flow) => flow.id === "FLW-015")?.flow_kind,
    ).toBe("linked_evidence_comparison");

    const expectedByScreen = {
      "SCR-039": ["008", "018", "019"],
      "SCR-040": ["001", "002", "009"],
      "SCR-041": ["010", "011"],
      "SCR-042": ["003", "004", "012", "014", "015", "020", "021"],
      "SCR-043": ["005", "013", "017", "022", "024"],
      "SCR-044": ["006", "016", "023"],
      "SCR-045": ["007"],
    } as const;
    const expectedWf001ByScreen = {
      "SCR-001": ["001"],
      "SCR-002": ["002", "009"],
      "SCR-003": ["003", "010"],
      "SCR-004": ["004", "011", "012", "016", "018"],
      "SCR-005": ["005", "006", "007", "013", "014", "019", "020"],
      "SCR-006": ["008", "015", "017"],
    } as const;
    for (const [screenId, suffixes] of Object.entries(expectedWf001ByScreen)) {
      const screen = screenCatalog.screens.find(
        (candidate) => candidate.id === screenId,
      )!;
      expect(
        screen.actions
          .filter((action) => action.kind !== "inspect")
          .map((action) => action.transition!.transition_id)
          .sort(),
      ).toEqual(suffixes.map((suffix) => `TRN-WF-001-${suffix}`).sort());
    }
    expect(
      Object.fromEntries(
        screenCatalog.screens
          .filter((screen) => screen.workflow_ids.includes("WF-001"))
          .flatMap((screen) =>
            screen.actions
              .filter((action) => action.kind !== "inspect")
              .map((action) => [action.transition!.transition_id, action.id]),
          ),
      ),
    ).toEqual({
      "TRN-WF-001-001": "ACT-001",
      "TRN-WF-001-002": "ACT-002",
      "TRN-WF-001-003": "ACT-003",
      "TRN-WF-001-004": "ACT-005",
      "TRN-WF-001-005": "ACT-006",
      "TRN-WF-001-006": "ACT-008",
      "TRN-WF-001-007": "ACT-009",
      "TRN-WF-001-008": "ACT-010",
      "TRN-WF-001-009": "ACT-011",
      "TRN-WF-001-010": "ACT-012",
      "TRN-WF-001-011": "ACT-014",
      "TRN-WF-001-012": "ACT-015",
      "TRN-WF-001-013": "ACT-016",
      "TRN-WF-001-014": "ACT-018",
      "TRN-WF-001-015": "ACT-019",
      "TRN-WF-001-016": "ACT-020",
      "TRN-WF-001-017": "ACT-021",
      "TRN-WF-001-018": "ACT-023",
      "TRN-WF-001-019": "ACT-024",
      "TRN-WF-001-020": "ACT-025",
    });
    const expectedReviewStates = {
      "SCR-039": ["normal", "blocked", "urgent", "historical", "completion"],
      "SCR-040": ["normal", "urgent", "partial", "offline", "completion"],
      "SCR-041": ["normal", "blocked", "urgent", "stale", "completion"],
      "SCR-042": ["normal", "blocked", "urgent", "conflict", "completion"],
      "SCR-043": ["normal", "blocked", "urgent", "loading", "completion"],
      "SCR-044": ["normal", "blocked", "corrected", "empty", "completion"],
      "SCR-045": ["normal", "urgent", "partial", "error", "completion"],
    } as const;
    for (const [screenId, suffixes] of Object.entries(expectedByScreen)) {
      const screen = screenCatalog.screens.find(
        (candidate) => candidate.id === screenId,
      )!;
      expect(screen.states.map((state) => state.kind)).toEqual(
        expectedReviewStates[screenId as keyof typeof expectedReviewStates],
      );
      expect(
        screen.actions
          .filter((action) => action.kind !== "inspect")
          .map((action) => action.transition!.transition_id)
          .sort(),
      ).toEqual(suffixes.map((suffix) => `TRN-WF-007-${suffix}`).sort());
    }
    expect(
      Object.fromEntries(
        screenCatalog.screens
          .filter((screen) => screen.workflow_ids.includes("WF-007"))
          .flatMap((screen) =>
            screen.actions
              .filter((action) => action.kind !== "inspect")
              .map((action) => [action.transition!.transition_id, action.id]),
          ),
      ),
    ).toEqual({
      "TRN-WF-007-001": "ACT-173",
      "TRN-WF-007-002": "ACT-174",
      "TRN-WF-007-003": "ACT-176",
      "TRN-WF-007-004": "ACT-177",
      "TRN-WF-007-005": "ACT-179",
      "TRN-WF-007-006": "ACT-180",
      "TRN-WF-007-007": "ACT-186",
      "TRN-WF-007-008": "ACT-181",
      "TRN-WF-007-009": "ACT-182",
      "TRN-WF-007-010": "ACT-183",
      "TRN-WF-007-011": "ACT-184",
      "TRN-WF-007-012": "ACT-187",
      "TRN-WF-007-013": "ACT-188",
      "TRN-WF-007-014": "ACT-190",
      "TRN-WF-007-015": "ACT-191",
      "TRN-WF-007-016": "ACT-192",
      "TRN-WF-007-017": "ACT-194",
      "TRN-WF-007-018": "ACT-195",
      "TRN-WF-007-019": "ACT-196",
      "TRN-WF-007-020": "ACT-199",
      "TRN-WF-007-021": "ACT-197",
      "TRN-WF-007-022": "ACT-200",
      "TRN-WF-007-023": "ACT-201",
      "TRN-WF-007-024": "ACT-202",
    });
    const checkIn = screenCatalog.screens.find(
      (screen) => screen.id === "SCR-041",
    )!;
    expect(
      checkIn.actions
        .filter((action) => action.kind !== "inspect")
        .every(
          (action) =>
            action.evidence_status === "canonical_branch" &&
            action.scenario_ids.length === 0,
        ),
    ).toBe(true);
    const waveScreenIds = new Set([
      "SCR-001",
      "SCR-002",
      "SCR-003",
      "SCR-004",
      "SCR-005",
      "SCR-006",
      ...Object.keys(expectedByScreen),
    ]);
    expect(
      stateDocument.states.filter((state) =>
        waveScreenIds.has(state.screen_id),
      ),
    ).toHaveLength(93);
    expect(
      screenCatalog.screens.find((screen) => screen.id === "SCR-043")
        ?.primary_decision,
    ).toMatch(/submitted time, units, breaks/i);
    expect(
      screenCatalog.screens.find((screen) => screen.id === "SCR-044")
        ?.primary_decision,
    ).toMatch(/payroll acceptance.*correction/i);
    expect(
      screenCatalog.screens.find((screen) => screen.id === "SCR-045")
        ?.primary_decision,
    ).toMatch(/allocated to the correct block, task, organization/i);
  });

  it("accepts requirement trace nodes and motivates/implemented-by edges", () => {
    const validateNode = compile(traceNodeSchema);
    const validateEdge = compile(traceEdgeSchema);
    expect(
      validateNode({
        id: "REQ-001",
        type: "requirement",
        title: "Preserve partial work history",
        path: "product-structure/requirements.json",
        locator: { kind: "json_id", value: "REQ-001" },
        classification: "product_decision",
        status: "approved",
      }),
    ).toBe(true);
    expect(
      validateEdge({
        id: "EDGE-999",
        from: "WF-001",
        to: "REQ-001",
        relationship: "motivates",
        rationale: "The canonical workflow motivates this product requirement.",
      }),
    ).toBe(true);
    expect(
      validateEdge({
        id: "EDGE-998",
        from: "REQ-001",
        to: "SCR-001",
        relationship: "implemented_by",
        rationale:
          "The screen implements the attributable product requirement.",
      }),
    ).toBe(true);
  });
});
