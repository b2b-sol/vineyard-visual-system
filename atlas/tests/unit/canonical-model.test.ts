import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

import fixtureDocument from "../../../data/walking-slice.json";
import componentDocument from "../../../design-system/walking-slice-components.json";
import scenarioDocument from "../../../scenarios/walking-slice.json";
import fixtureSchema from "../../../schemas/fixture.schema.json";
import screenDocument from "../../../screens/walking-slice.json";
import workflowDocument from "../../../workflow-model/workflows.json";

const transition = (from: string | null, to: string) =>
  `${from ?? "null"}->${to}`;

describe("canonical walking-slice model", () => {
  it("realizes a connected path through the canonical workflow graph", () => {
    const workflow = workflowDocument.workflows.find(
      (candidate) => candidate.id === "WF-001",
    )!;
    const scenario = scenarioDocument.scenarios[0];
    const workOrder = fixtureDocument.fixtures[0].work_orders[0];

    const workflowTransitions = new Set(
      workflow.transitions.map((step) => transition(step.from, step.to)),
    );
    const scenarioTransitions = scenario.expected_transitions.map((event) =>
      transition(event.from, event.to),
    );
    const fixtureTransitions = workOrder.status_history.map((event) =>
      transition(event.from, event.to),
    );

    expect(fixtureTransitions).toEqual(scenarioTransitions);
    expect(
      fixtureTransitions.filter((edge) => !workflowTransitions.has(edge)),
    ).toEqual([]);
    expect(workOrder.current_status).toBe("verified");
  });

  it("attributes every fixture event to an allowed canonical transition owner", () => {
    const workflow = workflowDocument.workflows.find(
      (candidate) => candidate.id === "WF-001",
    )!;
    const fixture = fixtureDocument.fixtures[0];
    const workOrder = fixture.work_orders[0];
    const rolesByPerson = new Map(
      fixture.people.map((person) => [person.id, person.role_id]),
    );

    for (const event of workOrder.status_history) {
      const candidates = workflow.transitions.filter(
        (candidate) =>
          transition(candidate.from, candidate.to) ===
          transition(event.from, event.to),
      );
      expect(
        candidates.some(
          (candidate) =>
            candidate.owner === rolesByPerson.get(event.actor_person_id),
        ),
        `${event.id} must use a canonical transition owner`,
      ).toBe(true);
    }
  });

  it("keeps consequential screen actions on canonical workflow edges", () => {
    const workflow = workflowDocument.workflows.find(
      (candidate) => candidate.id === "WF-001",
    )!;
    const workflowTransitions = new Set(
      workflow.transitions.map((step) => transition(step.from, step.to)),
    );
    const screenTransitions = screenDocument.screens[0].actions
      .filter((action) => "transition" in action)
      .map((action) =>
        transition(action.transition!.from, action.transition!.to),
      );

    expect(
      screenTransitions.filter((edge) => !workflowTransitions.has(edge)),
    ).toEqual([]);
  });

  it("preserves blocked, partial, recovered, completed, and verified history", () => {
    const workOrder = fixtureDocument.fixtures[0].work_orders[0];
    const states = workOrder.status_history.map((event) => event.to);

    expect(states).toEqual(
      expect.arrayContaining([
        "blocked",
        "partially_completed",
        "assigned",
        "acknowledged",
        "in_progress",
        "completed",
        "verified",
      ]),
    );
    expect(workOrder.blocker.affected_rows).toBe("28–34");
    expect(workOrder.actuals.completed_acres).toBe(workOrder.target_acres);
  });

  it("registers every consequential screen action and a non-color status cue", () => {
    const screen = screenDocument.screens[0];
    const component = componentDocument.components[0];

    expect(screen.actions.map((action) => action.id)).toEqual([
      "ACT-001",
      "ACT-002",
      "ACT-005",
      "ACT-006",
      "ACT-007",
      "ACT-003",
      "ACT-004",
    ]);
    expect(screen.states.map((state) => state.id)).toContain("completed");
    expect(component.semantic_contract.non_color_cues).toBe(true);
    expect(component.semantic_contract.history_is_immutable).toBe(true);
  });

  it("accepts open work without a blocker or final actuals", () => {
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    const validate = ajv.compile(fixtureSchema);
    const source = fixtureDocument.fixtures[0];
    const sourceWorkOrder = source.work_orders[0];
    const openWorkOrder: Record<string, unknown> = {
      ...structuredClone(sourceWorkOrder),
      current_status: "planned",
      status_history: structuredClone(
        sourceWorkOrder.status_history.slice(0, 2),
      ),
    };
    delete openWorkOrder.blocker;
    delete openWorkOrder.actuals;
    const openFixture = {
      ...structuredClone(source),
      work_orders: [openWorkOrder],
    };

    expect(validate(openFixture), validate.errors?.join(", ")).toBe(true);
  });

  it("rejects verified work without verification actuals", () => {
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    const validate = ajv.compile(fixtureSchema);
    const source = fixtureDocument.fixtures[0];
    const invalidWorkOrder: Record<string, unknown> = {
      ...structuredClone(source.work_orders[0]),
    };
    delete invalidWorkOrder.actuals;

    expect(
      validate({ ...structuredClone(source), work_orders: [invalidWorkOrder] }),
    ).toBe(false);
  });
});
