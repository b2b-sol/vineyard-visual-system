import { describe, expect, it } from "vitest";

import eventDocument from "../../../data/events.json";
import exceptionDocument from "../../../data/exceptions.json";
import operation from "../../../data/operation.json";
import { validateSeasonData } from "../../../scripts/validation/season-data.mjs";
import decisionDocument from "../../../workflow-model/decisions.json";
import exceptionDefinitions from "../../../workflow-model/exceptions.json";
import overlayDocument from "../../../workflow-model/overlays.json";
import recordDocument from "../../../workflow-model/records.json";
import roleDocument from "../../../workflow-model/roles.json";
import workflowDocument from "../../../workflow-model/workflows.json";

const canonical = {
  workflows: workflowDocument,
  roles: roleDocument,
  records: recordDocument,
  decisions: decisionDocument,
  exceptions: exceptionDefinitions,
  overlays: overlayDocument,
};

const validate = (
  operationValue = operation,
  eventValue = eventDocument,
  exceptionValue = exceptionDocument,
  sourceHashes = new Map(
    operation.canonical_sources.map((source) => [source.path, source.sha256]),
  ),
) =>
  validateSeasonData({
    operation: operationValue,
    eventDocument: eventValue,
    exceptionDocument: exceptionValue,
    canonical,
    sourceHashes,
  });

describe("connected full-season data", () => {
  it("realizes the complete deterministic coverage contract", () => {
    const metrics = validate();

    expect(metrics).toMatchObject({
      workflow_instances: 50,
      workflow_families: 10,
      events: 426,
      event_months: 12,
      record_definitions: 103,
      decisions_exercised: 40,
      exception_histories: 25,
      exception_workflows: 10,
      overlays: 9,
      operational_chains: 4,
      contract_chains: 2,
      estate_chains: 2,
    });
    expect(metrics.active_blocks).toBe(12);
    expect(metrics.active_contracts).toBe(3);
    expect(metrics.record_instances).toBeGreaterThanOrEqual(490);
    expect(metrics.cross_workflow_links).toBeGreaterThanOrEqual(40);
    expect(metrics.multi_day_instances).toBeGreaterThanOrEqual(25);
    expect(metrics.long_running_instances).toBeGreaterThanOrEqual(10);
    expect(metrics.longest_instance_days).toBeGreaterThanOrEqual(60);
    expect(metrics.event_measurement_units).toBeGreaterThanOrEqual(8);
    expect(metrics.record_fact_units).toBeGreaterThanOrEqual(8);
  });

  it("rejects a dangling role assignment reference", () => {
    const invalidEvents = structuredClone(eventDocument);
    invalidEvents.events[0].actor_assignment_id = "ASG-999";

    expect(() => validate(operation, invalidEvents)).toThrow(
      /references unknown ID ASG-999/,
    );
  });

  it("rejects an event recorded before it occurred", () => {
    const invalidEvents = structuredClone(eventDocument);
    invalidEvents.events[0].recorded_at = "2026-01-01T00:00:00-08:00";

    expect(() => validate(operation, invalidEvents)).toThrow(
      /recorded before it occurred/,
    );
  });

  it("rejects state data that drifts from the canonical transition", () => {
    const invalidEvents = structuredClone(eventDocument);
    invalidEvents.events[0].to_state = "blocked";

    expect(() => validate(operation, invalidEvents)).toThrow(
      /does not match canonical transition/,
    );
  });

  it("rejects a valid assignment whose role does not own the transition", () => {
    const invalidEvents = structuredClone(eventDocument);
    const firstEvent = invalidEvents.events[0];
    const transition = workflowDocument.workflows
      .find((workflow) => workflow.id === firstEvent.workflow_id)!
      .transitions.find(
        (candidate) => candidate.id === firstEvent.transition_id,
      )!;
    const wrongAssignment = operation.role_assignments.find(
      (assignment) => assignment.role_id !== transition.owner,
    )!;
    firstEvent.actor_assignment_id = wrongAssignment.id;

    expect(() => validate(operation, invalidEvents)).toThrow(
      /actor role .* does not own/,
    );
  });

  it("rejects drift from a captured canonical source hash", () => {
    const invalidOperation = structuredClone(operation);
    invalidOperation.canonical_sources[0].sha256 = "0".repeat(64);

    expect(() => validate(invalidOperation)).toThrow(/hash has drifted/);
  });

  it("rejects a record version that erases its correction history", () => {
    const invalidOperation = structuredClone(operation);
    const correctedRecord = invalidOperation.record_instances.find(
      (record) => record.corrections.length > 0,
    );
    expect(correctedRecord, "fixture needs a correction history").toBeDefined();
    correctedRecord!.version.number = 1;

    expect(() => validate(invalidOperation)).toThrow(
      /version predates its correction history/,
    );
  });

  it("rejects a multi-decision event with a missing result", () => {
    const invalidEvents = structuredClone(eventDocument);
    const multiDecisionEvent = invalidEvents.events.find(
      (event) => event.decision_ids.length > 1,
    );
    expect(
      multiDecisionEvent,
      "fixture needs a multi-decision event",
    ).toBeDefined();
    multiDecisionEvent!.decision_results.pop();

    expect(() => validate(operation, invalidEvents)).toThrow(
      /decision_results do not cover every decision exactly once/,
    );
  });

  it("rejects an unsupported cross-workflow link meaning", () => {
    const invalidOperation = structuredClone(operation);
    const link = invalidOperation.links.find(
      (candidate) => candidate.relation !== "supersedes",
    );
    expect(link, "fixture needs an operational record link").toBeDefined();
    link!.relation = "conflicts_with";

    expect(() => validate(invalidOperation)).toThrow(
      /unsupported semantic tuple/,
    );
  });

  it("rejects a definition-specific fact with a misleading unit dimension", () => {
    const invalidOperation = structuredClone(operation);
    const cropEstimate = invalidOperation.record_instances.find(
      (record) => record.record_definition_id === "REC-029",
    );
    expect(cropEstimate, "fixture needs a crop-estimate record").toBeDefined();
    cropEstimate!.facts.definition_evidence.estimated_crop_tonnage = {
      value: 14,
      unit_id: "UNT-008",
      qualifier: "estimated",
    };

    expect(() => validate(invalidOperation)).toThrow(
      /estimated_crop_tonnage .* (requires mass|use mass units)/,
    );
  });

  it("rejects metadata-only record supersession", () => {
    const invalidOperation = structuredClone(operation);
    const successor = invalidOperation.record_instances.find(
      (record) => record.supersedes_record_instance_id,
    );
    expect(successor, "fixture needs a superseding record").toBeDefined();
    const predecessor = invalidOperation.record_instances.find(
      (record) => record.id === successor!.supersedes_record_instance_id,
    );
    expect(predecessor, "fixture needs a superseded record").toBeDefined();
    predecessor!.facts.domain_details = structuredClone(
      successor!.facts.domain_details,
    );
    predecessor!.facts.workflow_metrics = structuredClone(
      successor!.facts.workflow_metrics,
    );
    predecessor!.facts.definition_evidence = structuredClone(
      successor!.facts.definition_evidence,
    );

    expect(() => validate(invalidOperation)).toThrow(
      /supersession has no substantive authoritative fact delta/,
    );
  });

  it("rejects a supporting record link that points backward in time", () => {
    const invalidOperation = structuredClone(operation);
    const link = invalidOperation.links.find(
      (candidate) => candidate.relation === "supports",
    );
    expect(link, "fixture needs a supporting record link").toBeDefined();
    const target = invalidOperation.record_instances.find(
      (record) => record.id === link!.target.entity_id,
    );
    expect(target, "fixture needs a record link target").toBeDefined();
    target!.effective_at = "2026-01-01T00:00:00-08:00";

    expect(() => validate(invalidOperation)).toThrow(
      /supports points backward in effective time/,
    );
  });

  it("rejects exact scale results before a harvest load is weighed", () => {
    const invalidEvents = structuredClone(eventDocument);
    const weighed = invalidEvents.events.find(
      (event) => event.workflow_id === "WF-006" && event.to_state === "weighed",
    );
    expect(weighed, "fixture needs a weighed harvest event").toBeDefined();
    const early = invalidEvents.events.find(
      (event) =>
        event.workflow_instance_id === weighed!.workflow_instance_id &&
        event.to_state === "authorized",
    );
    expect(early, "fixture needs a pre-weigh harvest event").toBeDefined();
    early!.measurements = structuredClone(weighed!.measurements);

    expect(() => validate(operation, invalidEvents)).toThrow(
      /exposes exact scale weights before the weighed state/,
    );
  });

  it("rejects crop actualization without a Harvest actual record", () => {
    const invalidEvents = structuredClone(eventDocument);
    const actualized = invalidEvents.events.find(
      (event) =>
        event.workflow_id === "WF-004" && event.to_state === "actualized",
    );
    expect(
      actualized,
      "fixture needs a crop actualization event",
    ).toBeDefined();
    actualized!.record_writes = actualized!.record_writes.filter(
      (recordId) =>
        operation.record_instances.find((record) => record.id === recordId)
          ?.record_definition_id !== "REC-033",
    );

    expect(() => validate(operation, invalidEvents)).toThrow(
      /source_event_id does not write the record|enters actualized without writing a Harvest actual record/,
    );
  });
});
