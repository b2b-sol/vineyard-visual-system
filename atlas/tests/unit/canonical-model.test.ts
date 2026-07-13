import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

import fixtureDocument from "../../../data/walking-slice.json";
import componentDocument from "../../../design-system/walking-slice-components.json";
import scenarioDocument from "../../../scenarios/walking-slice.json";
import fixtureSchema from "../../../schemas/fixture.schema.json";
import screenDocument from "../../../screens/walking-slice.json";
import workflowDocument from "../../../workflow-model/walking-slice.json";

const transition = (from: string | null, to: string) =>
  `${from ?? "null"}->${to}`;

describe("canonical walking-slice model", () => {
  it("realizes the workflow and scenario transition contract exactly", () => {
    const workflow = workflowDocument.workflows[0];
    const scenario = scenarioDocument.scenarios[0];
    const workOrder = fixtureDocument.fixtures[0].work_orders[0];

    const workflowTransitions = workflow.steps.map((step) =>
      transition(step.state_from, step.state_to),
    );
    const scenarioTransitions = scenario.expected_transitions.map((event) =>
      transition(event.from, event.to),
    );
    const fixtureTransitions = workOrder.status_history.map((event) =>
      transition(event.from, event.to),
    );

    expect(scenarioTransitions).toEqual(workflowTransitions);
    expect(fixtureTransitions).toEqual(scenarioTransitions);
    expect(workOrder.current_status).toBe("verified");
  });

  it("preserves blocked, partial, recovered, completed, and verified history", () => {
    const workOrder = fixtureDocument.fixtures[0].work_orders[0];
    const states = workOrder.status_history.map((event) => event.to);

    expect(states).toEqual(
      expect.arrayContaining([
        "blocked",
        "partially_completed",
        "ready_to_resume",
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
