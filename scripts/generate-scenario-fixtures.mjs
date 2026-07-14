import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { format } from "prettier";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_PATH = "data/scenario-fixtures.json";
const checkOnly = process.argv.includes("--check");

const readSource = async (relativePath) => {
  const contents = await readFile(path.join(ROOT, relativePath), "utf8");
  return {
    relativePath,
    contents,
    value: JSON.parse(contents),
    sha256: createHash("sha256").update(contents).digest("hex"),
  };
};

const [operationSource, eventSource, exceptionSource] = await Promise.all([
  readSource("data/operation.json"),
  readSource("data/events.json"),
  readSource("data/exceptions.json"),
]);

const operation = operationSource.value;
const events = eventSource.value.events;
const histories = exceptionSource.value.histories;
const compareIds = (left, right) => left.id.localeCompare(right.id);
const uniqueSorted = (values) => [...new Set(values)].sort();

const workflowInstances = [...operation.workflow_instances].sort(compareIds);
if (workflowInstances.length !== 50) {
  throw new Error(
    `Scenario fixture contract expects 50 full-season workflow instances; found ${workflowInstances.length}`,
  );
}

const eventsByWorkflow = new Map(
  workflowInstances.map((workflowInstance) => [
    workflowInstance.id,
    events
      .filter((event) => event.workflow_instance_id === workflowInstance.id)
      .sort((left, right) => left.sequence - right.sequence),
  ]),
);
const recordsByWorkflow = new Map(
  workflowInstances.map((workflowInstance) => [
    workflowInstance.id,
    operation.record_instances
      .filter((record) =>
        record.workflow_instance_ids.includes(workflowInstance.id),
      )
      .sort(compareIds),
  ]),
);
const historiesByWorkflow = new Map(
  workflowInstances.map((workflowInstance) => [
    workflowInstance.id,
    histories
      .filter((history) => history.workflow_instance_id === workflowInstance.id)
      .sort(compareIds),
  ]),
);

const stateFlagsFor = (fixtureEvents, fixtureHistories) => {
  const flags = new Set();
  if (fixtureEvents.some((event) => event.connectivity.captured_offline))
    flags.add("offline");
  if (
    fixtureEvents.some(
      (event) =>
        event.connectivity.sync_status === "conflict" ||
        (event.connectivity.sync_status === "resolved" &&
          (event.connectivity.conflict_record_instance_ids?.length ?? 0) > 0),
    )
  )
    flags.add("conflict");
  if (fixtureHistories.length > 0) flags.add("exception");
  if (fixtureEvents.some((event) => event.kind === "correction"))
    flags.add("corrected");
  if (fixtureEvents.some((event) => event.kind === "supersession"))
    flags.add("superseded");
  if (
    fixtureEvents.some((event) =>
      ["partially_completed", "partial"].includes(event.to_state),
    )
  )
    flags.add("partial");
  if (
    fixtureEvents.some((event) =>
      ["blocked", "exception_flagged", "noncompliant"].includes(event.to_state),
    )
  )
    flags.add("blocked");
  if (fixtureEvents.length > 1) flags.add("historical");
  if (flags.size === 0) flags.add("normal");
  return [...flags].sort();
};

const categoryFor = (flags) => {
  if (flags.includes("conflict")) return "conflict";
  if (flags.includes("offline")) return "offline_delayed";
  if (flags.includes("blocked")) return "blocked";
  if (flags.includes("corrected") || flags.includes("superseded"))
    return "correction";
  return "routine";
};

const chooseAnchor = (fixtureEvents) =>
  fixtureEvents.find(
    (event) =>
      event.connectivity.sync_status === "conflict" ||
      (event.connectivity.sync_status === "resolved" &&
        (event.connectivity.conflict_record_instance_ids?.length ?? 0) > 0),
  ) ??
  fixtureEvents.find((event) => event.connectivity.captured_offline) ??
  fixtureEvents.find((event) => event.kind === "exception") ??
  fixtureEvents.find((event) => event.kind === "correction") ??
  fixtureEvents.at(-1);

const anchorContract = (event) => ({
  event_id: event.id,
  transition_id: event.transition_id,
  from_state: event.from_state,
  to_state: event.to_state,
  semantic_kind: event.kind,
  actor_assignment_id: event.actor_assignment_id,
  occurred_at: event.occurred_at,
  record_reads: event.record_reads,
  record_writes: event.record_writes,
  decision_ids: event.decision_ids,
  exception_history_ids: event.exception_history_ids,
  connectivity: {
    mode: event.connectivity.mode,
    captured_offline: event.connectivity.captured_offline,
    sync_status: event.connectivity.sync_status,
  },
});

const relatedContext = (workflowInstance, fixtureEvents, fixtureRecords) => {
  const recordIds = new Set(fixtureRecords.map((record) => record.id));
  return {
    operational_chain_ids: operation.operational_chains
      .filter(
        (chain) =>
          chain.workflow_instance_ids.includes(workflowInstance.id) ||
          chain.record_instance_ids.some((recordId) => recordIds.has(recordId)),
      )
      .map((chain) => chain.id)
      .sort(),
    overlay_ids: operation.overlay_applications
      .filter((application) =>
        application.record_instance_ids.some((recordId) =>
          recordIds.has(recordId),
        ),
      )
      .map((application) => application.overlay_id)
      .sort(),
  };
};

const buildFixture = ({
  id,
  focusKind,
  workflowInstance,
  fixtureEvents,
  fixtureRecords,
  fixtureHistories,
  title,
  selectionReason,
}) => {
  if (fixtureEvents.length === 0)
    throw new Error(`${id}: fixture has no source events`);
  if (fixtureRecords.length === 0)
    throw new Error(`${id}: fixture has no source records`);
  const anchor = chooseAnchor(fixtureEvents);
  const flags = stateFlagsFor(fixtureEvents, fixtureHistories);
  const context = relatedContext(
    workflowInstance,
    fixtureEvents,
    fixtureRecords,
  );
  return {
    id,
    title,
    focus_kind: focusKind,
    selection_reason: selectionReason,
    category: categoryFor(flags),
    state_flags: flags,
    workflow_id: workflowInstance.workflow_id,
    workflow_instance_id: workflowInstance.id,
    current_state: workflowInstance.current_state,
    anchor: anchorContract(anchor),
    event_ids: uniqueSorted(fixtureEvents.map((event) => event.id)),
    record_instance_ids: uniqueSorted(
      fixtureRecords.map((record) => record.id),
    ),
    exception_history_ids: uniqueSorted(
      fixtureHistories.map((history) => history.id),
    ),
    operational_chain_ids: context.operational_chain_ids,
    overlay_ids: context.overlay_ids,
    block_ids: uniqueSorted(
      fixtureRecords.flatMap((record) => record.block_ids ?? []),
    ),
    contract_ids: uniqueSorted([
      ...(workflowInstance.contract_ids ?? []),
      ...fixtureRecords.flatMap((record) => record.contract_ids ?? []),
    ]),
    actor_assignment_ids: uniqueSorted(
      fixtureEvents.map((event) => event.actor_assignment_id),
    ),
    started_at: fixtureEvents[0].occurred_at,
    completed_at: fixtureEvents.at(-1).occurred_at,
  };
};

const workflowFixtures = workflowInstances.map((workflowInstance, index) => {
  const fixtureEvents = eventsByWorkflow.get(workflowInstance.id);
  const fixtureRecords = recordsByWorkflow.get(workflowInstance.id);
  const fixtureHistories = historiesByWorkflow.get(workflowInstance.id);
  return buildFixture({
    id: `FIX-${String(index + 2).padStart(3, "0")}`,
    focusKind: "workflow_instance",
    workflowInstance,
    fixtureEvents,
    fixtureRecords,
    fixtureHistories,
    title: `${workflowInstance.id} · ${workflowInstance.title}`,
    selectionReason:
      "One deterministic fixture is retained for every full-season workflow instance so scenario coverage cannot silently omit an operational case.",
  });
});

const exceptionFixtures = [...histories]
  .sort(compareIds)
  .slice(0, 10)
  .map((history, index) => {
    const workflowInstance = workflowInstances.find(
      (candidate) => candidate.id === history.workflow_instance_id,
    );
    if (!workflowInstance)
      throw new Error(`${history.id}: unknown workflow instance`);
    const fixtureEvents = history.event_ids
      .map((eventId) => events.find((event) => event.id === eventId))
      .filter(Boolean)
      .sort((left, right) => left.sequence - right.sequence);
    const fixtureRecords = history.record_instance_ids
      .map((recordId) =>
        operation.record_instances.find((record) => record.id === recordId),
      )
      .filter(Boolean)
      .sort(compareIds);
    return buildFixture({
      id: `FIX-${String(index + 52).padStart(3, "0")}`,
      focusKind: "exception_history",
      workflowInstance,
      fixtureEvents,
      fixtureRecords,
      fixtureHistories: [history],
      title: `${history.id} · ${history.trigger}`,
      selectionReason:
        "The first ten stable exception histories are retained as focused recovery fixtures in addition to their complete workflow-instance contexts.",
    });
  });

const fixtures = [...workflowFixtures, ...exceptionFixtures];
const referenced = (field) =>
  new Set(fixtures.flatMap((fixture) => fixture[field])).size;
const categoryCounts = Object.fromEntries(
  [...new Set(fixtures.map((fixture) => fixture.category))]
    .sort()
    .map((category) => [
      category,
      fixtures.filter((fixture) => fixture.category === category).length,
    ]),
);

const document = {
  schema_version: "2.0",
  operation_id: operation.operation_id,
  generated_at: operation.generated_at,
  reserved_fixture_ids: ["FIX-001"],
  source_snapshot: [operationSource, eventSource, exceptionSource].map(
    (source) => ({
      path: source.relativePath,
      sha256: source.sha256,
    }),
  ),
  coverage: {
    fixture_count: fixtures.length,
    workflow_instances: new Set(
      fixtures.map((fixture) => fixture.workflow_instance_id),
    ).size,
    workflow_families: new Set(fixtures.map((fixture) => fixture.workflow_id))
      .size,
    events: referenced("event_ids"),
    record_instances: referenced("record_instance_ids"),
    exception_histories: referenced("exception_history_ids"),
    operational_chains: referenced("operational_chain_ids"),
    overlays: referenced("overlay_ids"),
    offline_fixtures: fixtures.filter((fixture) =>
      fixture.state_flags.includes("offline"),
    ).length,
    conflict_fixtures: fixtures.filter((fixture) =>
      fixture.state_flags.includes("conflict"),
    ).length,
    category_counts: categoryCounts,
  },
  fixtures,
};

const output = await format(JSON.stringify(document), { parser: "json" });
if (checkOnly) {
  const current = await readFile(path.join(ROOT, OUTPUT_PATH), "utf8");
  if (current !== output)
    throw new Error(
      `${OUTPUT_PATH} is stale; run npm run generate:scenario-fixtures`,
    );
  console.log(
    `✓ ${fixtures.length} deterministic scenario pointer fixtures are current`,
  );
} else {
  await writeFile(path.join(ROOT, OUTPUT_PATH), output, "utf8");
  console.log(
    `✓ generated ${fixtures.length} deterministic scenario pointer fixtures`,
  );
}
