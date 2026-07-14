import {
  organizationIndex,
  organizationRelationships,
  type RecordInstance,
} from "../../data/canonical";
import { formatMoment, recordName } from "../../data/screenViewModel";
import type { ScreenViewModel } from "../../data/screenViewModel";

function valueAt(value: unknown, path: string[]): unknown {
  let current = value;
  for (const key of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function numeric(record: RecordInstance | undefined, path: string[]) {
  const value = record ? valueAt(record.facts, path) : undefined;
  return typeof value === "number" ? value : undefined;
}

function text(record: RecordInstance | undefined, path: string[]) {
  const value = record ? valueAt(record.facts, path) : undefined;
  return typeof value === "string" ? value : undefined;
}

function record(model: ScreenViewModel, name: string) {
  return model.records.find((candidate) => recordName(candidate) === name);
}

function quantity(value: number | undefined, unit: string, digits = 1) {
  return value === undefined
    ? "Not recorded"
    : `${value.toFixed(digits)} ${unit}`;
}

function RelationshipContext({ model }: { model: ScreenViewModel }) {
  const operatingId = model.identity.block?.operating_organization_id;
  const relationship = organizationRelationships.find(
    (candidate) =>
      candidate.status === "active" &&
      (candidate.from_organization_id === operatingId ||
        candidate.to_organization_id === operatingId),
  );
  const counterpartId = relationship
    ? relationship.from_organization_id === operatingId
      ? relationship.to_organization_id
      : relationship.from_organization_id
    : undefined;
  return (
    <div className="wave-task-relationship">
      <span>Operating boundary</span>
      <strong>
        {model.identity.organization?.name ?? "Organization unresolved"}
      </strong>
      <small>
        {relationship
          ? `${relationship.id} · ${relationship.type.replaceAll("_", " ")} · ${organizationIndex.get(counterpartId ?? "")?.name ?? counterpartId}`
          : "No active cross-organization relationship applies to this scope"}
      </small>
    </div>
  );
}

function ProtectionEvidence({ model }: { model: ScreenViewModel }) {
  const scouting = record(model, "Scouting record");
  const recommendation = record(model, "Treatment recommendation");
  const restrictions =
    record(model, "Product and label check") ??
    record(model, "REI and PHI record");
  const efficacy = record(model, "Efficacy follow-up");
  const report = record(model, "Spray diary");
  const pressure = numeric(scouting, [
    "definition_evidence",
    "scouting_pressure_index",
    "value",
  ]);
  const threshold = numeric(recommendation, [
    "definition_evidence",
    "treatment_action_threshold",
    "value",
  ]);
  const rei = numeric(restrictions, [
    "domain_details",
    "restricted_entry",
    "value",
  ]);
  const phi = numeric(restrictions, [
    "domain_details",
    "preharvest_interval",
    "value",
  ]);
  const efficacyScore = numeric(efficacy, [
    "definition_evidence",
    "follow_up_efficacy_score",
    "value",
  ]);
  const completeness = numeric(report, [
    "domain_details",
    "evidence_completeness",
    "value",
  ]);
  const labelRevision = text(restrictions, [
    "definition_evidence",
    "approved_label_revision",
  ]);
  const belowThreshold =
    pressure !== undefined && threshold !== undefined && pressure < threshold;
  const cancelled = model.events.some(
    (event) => event.to_state === "cancelled",
  );

  if (["SCR-007", "SCR-010"].includes(model.screen.id)) {
    return (
      <div className="wave-task-evidence-board">
        <div className="wave-task-ratio">
          <span>Pressure / action threshold</span>
          <strong>
            {pressure ?? "—"}
            <small> / {threshold ?? "—"}</small>
          </strong>
          <p>
            {belowThreshold
              ? "Pressure is below the declared threshold; an alternate risk rationale is not present in this fixture."
              : "Current pressure meets or exceeds the declared treatment threshold."}
          </p>
        </div>
        <dl className="wave-task-facts">
          <div>
            <dt>Recommendation</dt>
            <dd>
              {text(recommendation, [
                "domain_details",
                "recommendation_result",
              ])?.replaceAll("_", " ") ?? "Not recorded"}
            </dd>
          </div>
          <div>
            <dt>Target area</dt>
            <dd>
              {quantity(
                numeric(recommendation, [
                  "domain_details",
                  "target_area",
                  "value",
                ]),
                "ac",
                2,
              )}
            </dd>
          </div>
          <div>
            <dt>Report completeness</dt>
            <dd>{quantity(completeness, "%", 0)}</dd>
          </div>
          <div>
            <dt>Efficacy</dt>
            <dd>{quantity(efficacyScore, "/ 100", 0)}</dd>
          </div>
        </dl>
        <div className="wave-task-next">
          <span>Current handoff</span>
          <strong>
            {model.stateContract.canonical_state?.replaceAll("_", " ") ??
              "entry"}
          </strong>
          <small>
            {model.activeEvent
              ? `${model.activeEvent.id} · ${formatMoment(model.activeEvent.occurred_at)}`
              : "Model-only decision point · no event asserted"}
          </small>
        </div>
      </div>
    );
  }

  return (
    <div className="wave-task-release-board">
      <section>
        <span>Release decision</span>
        <strong>
          {cancelled ? "HOLD · cancelled path" : "VERIFY BEFORE RELEASE"}
        </strong>
        <p>
          {model.fixture.id === "FIX-007"
            ? "Wind or rain is outside allowable conditions. The fixture does not provide a quantitative reading."
            : "Preflight evidence exists, but the fixture does not provide a quantitative wind reading."}
        </p>
      </section>
      <dl>
        <div>
          <dt>Restricted entry</dt>
          <dd>{quantity(rei, "h", 0)}</dd>
        </div>
        <div>
          <dt>Preharvest interval</dt>
          <dd>{quantity(phi, "days", 0)}</dd>
        </div>
        <div>
          <dt>Approved label</dt>
          <dd>{labelRevision ?? "Not recorded"}</dd>
        </div>
        <div>
          <dt>Material identity</dt>
          <dd>Not present in fixture · release evidence gap</dd>
        </div>
      </dl>
      <aside>
        <span>Accepted actuals in this path</span>
        <strong>
          {cancelled
            ? "None"
            : model.fixture.current_state.replaceAll("_", " ")}
        </strong>
        <small>
          {cancelled
            ? "Generic downstream records are excluded from the current cancellation decision."
            : "Application and report evidence remain attributable below."}
        </small>
      </aside>
    </div>
  );
}

function WaterEvidence({ model }: { model: ScreenViewModel }) {
  const soil = record(model, "Soil-moisture or ET record");
  const plant = record(model, "Plant-status observation");
  const tissue = record(model, "Tissue or petiole result");
  const schedule = record(model, "Irrigation schedule");
  const log = record(model, "Irrigation log");
  const depletion = numeric(soil, [
    "domain_details",
    "soil_moisture_depletion",
    "value",
  ]);
  const referenceEt = numeric(soil, [
    "domain_details",
    "reference_et",
    "value",
  ]);
  const flow = numeric(schedule, ["workflow_metrics", "planned_flow", "value"]);
  const runWindow = numeric(schedule, [
    "definition_evidence",
    "irrigation_run_window",
    "value",
  ]);
  const delivered = numeric(log, [
    "workflow_metrics",
    "delivered_volume",
    "value",
  ]);
  const potassium = numeric(tissue, [
    "domain_details",
    "potassium_percent",
    "value",
  ]);

  return (
    <div className="wave-task-water-band">
      {[
        ["Soil depletion", quantity(depletion, "%", 0), soil?.id],
        ["Reference ET", quantity(referenceEt, "in", 3), soil?.id],
        ["Planned flow", quantity(flow, "gal/h", 0), schedule?.id],
        ["Run window", quantity(runWindow, "h", 2), schedule?.id],
        ["Delivered", quantity(delivered, "gal", 0), log?.id],
        ["Petiole potassium", quantity(potassium, "%", 2), tissue?.id],
      ].map(([label, value, source]) => (
        <article key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
          <small>{source ?? "No source record"}</small>
        </article>
      ))}
      <aside>
        <span>Plant status</span>
        <strong>
          {text(plant, [
            "definition_evidence",
            "plant_water_status",
          ])?.replaceAll("_", " ") ?? "Not recorded"}
        </strong>
        <small>
          Harvest weights and settlement fields from generic synthetic records
          are intentionally excluded from this operating decision.
        </small>
      </aside>
    </div>
  );
}

function DeliverySurface({ model }: { model: ScreenViewModel }) {
  const schedule = record(model, "Irrigation schedule");
  const log = record(model, "Irrigation log");
  const malfunction = record(model, "Malfunction record");
  const plannedFlow = numeric(schedule, [
    "workflow_metrics",
    "planned_flow",
    "value",
  ]);
  const runWindow = numeric(schedule, [
    "definition_evidence",
    "irrigation_run_window",
    "value",
  ]);
  const delivered = numeric(log, [
    "workflow_metrics",
    "delivered_volume",
    "value",
  ]);
  const actualHours = numeric(log, ["domain_details", "actual_hours", "value"]);
  const lost = numeric(malfunction, [
    "domain_details",
    "lost_delivery",
    "value",
  ]);
  const interrupted = model.events.some(
    (event) => event.to_state === "delivery_interrupted",
  );

  return (
    <div
      className={`wave-task-delivery ${interrupted ? "is-interrupted" : ""}`}
    >
      <section className="wave-task-set">
        <span>Executable set</span>
        <strong>
          {model.identity.block?.id} · rows 1–{model.identity.block?.row_count}
        </strong>
        <small>
          No valve or zone identity is present; stable block and row scope is
          used without inventing equipment.
        </small>
      </section>
      <ol aria-label="Irrigation delivery plan">
        <li>
          <span>1</span>
          <div>
            <strong>Assigned plan</strong>
            <small>
              {quantity(plannedFlow, "gal/h", 0)} ·{" "}
              {quantity(runWindow, "h", 2)}
            </small>
          </div>
        </li>
        <li>
          <span>2</span>
          <div>
            <strong>
              {interrupted ? "Delivery interrupted" : "Field delivery"}
            </strong>
            <small>
              {interrupted
                ? `${text(malfunction, ["domain_details", "failure_code"]) ?? "Failure code missing"} · ${quantity(lost, "gal estimated", 0)}`
                : `${quantity(delivered, "gal", 0)} · ${quantity(actualHours, "h", 2)}`}
            </small>
          </div>
        </li>
        <li>
          <span>3</span>
          <div>
            <strong>Verification</strong>
            <small>
              {model.fixture.current_state.replaceAll("_", " ")} · eventual
              fixture state
            </small>
          </div>
        </li>
      </ol>
      <aside>
        <span>{interrupted ? "Safe restart evidence" : "Delivered proof"}</span>
        <strong>
          {interrupted
            ? (text(malfunction, [
                "domain_details",
                "repair_result",
              ])?.replaceAll("_", " ") ?? "Repair result not recorded")
            : quantity(delivered, "gal", 0)}
        </strong>
        <small>
          {interrupted
            ? "Accepted work, affected scope, and the remaining set stay separate."
            : "Planned and delivered quantities remain linked to the same block."}
        </small>
      </aside>
    </div>
  );
}

export function Wave002TaskSurface({ model }: { model: ScreenViewModel }) {
  const workflowId = model.screen.workflow_ids[0];
  if (!new Set(["WF-002", "WF-003"]).has(workflowId)) return null;
  return (
    <section
      aria-labelledby={`${model.screen.id}-task-surface-title`}
      className={`wave-task-surface wave-task-${model.recipe.layout}`}
      data-task-surface={model.screen.id}
    >
      <header>
        <div>
          <span>Current operating surface</span>
          <h2 id={`${model.screen.id}-task-surface-title`}>
            {model.screen.id} · {model.recipe.operatingQuestion}
          </h2>
        </div>
        <RelationshipContext model={model} />
      </header>
      {workflowId === "WF-002" ? (
        <ProtectionEvidence model={model} />
      ) : ["SCR-015", "SCR-016", "SCR-017"].includes(model.screen.id) ? (
        <DeliverySurface model={model} />
      ) : (
        <WaterEvidence model={model} />
      )}
    </section>
  );
}
