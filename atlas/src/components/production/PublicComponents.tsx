import type { ReactNode } from "react";
import {
  actionExplanation,
  canRolePerform,
  componentName,
  decisionsFor,
  formatMoment,
  getActionTrace,
  notificationFor,
  recordName,
  statePresentation,
} from "../../data/screenViewModel";
import type { ComponentFrameProps, ProductionComponentProps } from "./types";

function ComponentFrame({
  componentId,
  className = "",
  model,
  children,
}: ComponentFrameProps) {
  return (
    <section
      aria-labelledby={`${model.screen.id}-${componentId}-title`}
      className={`wave-component wave-component-${componentId.toLowerCase()} ${className}`}
      data-component-id={componentId}
    >
      <header className="wave-component-heading">
        <span className="wave-component-id">{componentId}</span>
        <h2 id={`${model.screen.id}-${componentId}-title`}>
          {componentName(componentId)}
        </h2>
      </header>
      {children}
    </section>
  );
}

function EventIdentity({
  event,
}: {
  event: ProductionComponentProps["model"]["events"][number];
}) {
  return (
    <span
      className="wave-id-pill"
      data-event-id={event.id}
      data-transition-id={event.transition_id}
    >
      {event.id}
    </span>
  );
}

function RecordIdentity({
  record,
}: {
  record: ProductionComponentProps["model"]["records"][number];
}) {
  return (
    <span className="wave-id-pill" data-record-id={record.id}>
      {record.id}
    </span>
  );
}

function DefinitionList({ items }: { items: Array<[string, ReactNode]> }) {
  return (
    <dl className="wave-definition-list">
      {items.map(([term, value]) => (
        <div key={term}>
          <dt>{term}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function WorkOrderQueue(props: ProductionComponentProps) {
  const { model } = props;
  const records = model.records.slice(0, 5);
  return (
    <ComponentFrame {...props} componentId="CMP-001" className="wave-span-2">
      <div
        aria-label="Scrollable attributable record table"
        className="wave-table-wrap"
        tabIndex={0}
      >
        <table>
          <caption>Attributable work and supporting records</caption>
          <thead>
            <tr>
              <th scope="col">Record</th>
              <th scope="col">Responsibility</th>
              <th scope="col">State</th>
              <th scope="col">Effective</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id} data-record-id={record.id}>
                <th scope="row">
                  <RecordIdentity record={record} />
                  <strong>{record.title}</strong>
                </th>
                <td>{recordName(record)}</td>
                <td>{record.lifecycle_state.replaceAll("_", " ")}</td>
                <td>{formatMoment(record.effective_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ComponentFrame>
  );
}

export function OperationalAppShell({
  model,
  children,
}: ProductionComponentProps) {
  return (
    <section
      className="wave-operational-shell"
      data-component-id="CMP-002"
      data-density={
        model.screen.platform === "mobile" ? "field" : "comfortable"
      }
      data-fixture-id={model.fixture.id}
      data-review-state={model.reviewState}
      data-scenario-id={model.scenario.id}
      data-screen-id={model.screen.id}
      data-state-contract-id={model.stateContract?.id}
      data-workflow-id={model.screen.workflow_ids[0]}
    >
      <div
        className="wave-shell-context"
        aria-label="Current operating context"
      >
        <span>Northstar synthetic season · 2026</span>
        <span>{model.identity.property?.name ?? "Stable vineyard scope"}</span>
        <span>{model.fixture.id} · deterministic fixture</span>
      </div>
      <div data-component-slot="CMP-002">{children}</div>
    </section>
  );
}

export function RoleScopeSwitcher(props: ProductionComponentProps) {
  const { model, activeRoleId, setActiveRoleId } = props;
  return (
    <ComponentFrame {...props} componentId="CMP-003">
      <label className="wave-field-label" htmlFor={`${model.screen.id}-role`}>
        Acting responsibility
      </label>
      <select
        id={`${model.screen.id}-role`}
        onChange={(event) => setActiveRoleId(event.target.value)}
        value={activeRoleId}
      >
        {model.screen.review_role_ids.map((roleId) => (
          <option key={roleId} value={roleId}>
            {roleId.replace("ROLE-", "").replaceAll("-", " ")}
          </option>
        ))}
      </select>
      <p className="wave-supporting-copy">
        Authority recomputes from role, organization, scope, state, and
        effective time.
      </p>
    </ComponentFrame>
  );
}

export function BlockIdentityChip(props: ProductionComponentProps) {
  const { model } = props;
  const { block, property, organization } = model.identity;
  return (
    <ComponentFrame {...props} componentId="CMP-004">
      <div
        className="wave-block-chip"
        data-block-id={block?.id}
        data-stable-identity={block?.stable_identity}
      >
        <span aria-hidden="true">⌗</span>
        <div>
          <strong>{block?.current_name ?? "Unresolved block"}</strong>
          <span>
            {block?.id} · {block?.variety} · {block?.area.value.toFixed(2)} ac
          </span>
          <small>
            {property?.name} · {organization?.name}
          </small>
        </div>
      </div>
    </ComponentFrame>
  );
}

export function RecordProvenancePanel(props: ProductionComponentProps) {
  const { model } = props;
  const record = model.records[0];
  return (
    <ComponentFrame {...props} componentId="CMP-005">
      {record ? (
        <DefinitionList
          items={[
            ["Record", <RecordIdentity record={record} key={record.id} />],
            [
              "Definition",
              `${record.record_definition_id} · ${recordName(record)}`,
            ],
            ["Effective", formatMoment(record.effective_at)],
            ["Recorded", formatMoment(record.recorded_at)],
            ["Owner", record.owner_assignment_id],
          ]}
        />
      ) : (
        <p className="wave-empty-copy">No record resolves for this fixture.</p>
      )}
    </ComponentFrame>
  );
}

export function WorkflowStateRail(props: ProductionComponentProps) {
  const { model } = props;
  const visibleEvents = model.events.slice(-6);
  return (
    <ComponentFrame {...props} componentId="CMP-006" className="wave-span-2">
      <ol
        aria-label="Scrollable canonical workflow state history"
        className="wave-state-rail"
        tabIndex={0}
      >
        {visibleEvents.map((event, index) => (
          <li key={event.id} data-event-id={event.id}>
            <span className="wave-state-marker" aria-hidden="true">
              {index + 1}
            </span>
            <div>
              <EventIdentity event={event} />
              <strong>{event.to_state.replaceAll("_", " ")}</strong>
              <small>{formatMoment(event.occurred_at)}</small>
            </div>
          </li>
        ))}
      </ol>
    </ComponentFrame>
  );
}

export function TransitionActionBar(props: ProductionComponentProps) {
  const { model, activeRoleId, onAction, actionMessage } = props;
  return (
    <ComponentFrame {...props} componentId="CMP-007" className="wave-span-2">
      <div className="wave-action-grid">
        {model.screen.actions.map((action) => {
          const allowed =
            action.kind === "inspect" || canRolePerform(action, activeRoleId);
          return (
            <div className="wave-action-cell" key={action.id}>
              <button
                className={
                  allowed ? "wave-action" : "wave-action wave-action-disabled"
                }
                disabled={!allowed}
                onClick={() => onAction(action)}
                type="button"
                {...getActionTrace(action)}
              >
                <span>{action.kind === "inspect" ? "Inspect" : "Append"}</span>
                <strong>{action.label}</strong>
                <small>{action.transition?.to ?? "immutable history"}</small>
              </button>
              <p>{actionExplanation(action, activeRoleId)}</p>
            </div>
          );
        })}
      </div>
      <p aria-live="polite" className="wave-live-message">
        {actionMessage ??
          "Choose an enabled action to preview its append-only consequence."}
      </p>
    </ComponentFrame>
  );
}

export function DecisionEvidencePanel(props: ProductionComponentProps) {
  const { model } = props;
  const actionsWithDecisions = model.screen.actions.filter(
    (action) => (action.decision_ids?.length ?? 0) > 0,
  );
  return (
    <ComponentFrame {...props} componentId="CMP-008">
      {actionsWithDecisions.length ? (
        actionsWithDecisions.slice(0, 2).map((action) =>
          decisionsFor(action).map((decision) => (
            <article key={decision!.id} data-decision-id={decision!.id}>
              <span className="wave-id-pill">{decision!.id}</span>
              <strong>{decision!.question}</strong>
              <small>Owner · {decision!.owner}</small>
            </article>
          )),
        )
      ) : (
        <p className="wave-empty-copy">
          This responsibility executes an accepted decision; it does not invent
          a new one.
        </p>
      )}
    </ComponentFrame>
  );
}

export function MissingInformationCallout(props: ProductionComponentProps) {
  const { model } = props;
  const missing =
    model.reviewState === "normal" || model.reviewState === "completion"
      ? "No required facts missing"
      : (model.stateContract?.information_priority[0] ??
        "Confirm current scope and accountable authority before continuing");
  return (
    <ComponentFrame {...props} componentId="CMP-009">
      <div className="wave-callout" role="note">
        <span aria-hidden="true">?</span>
        <div>
          <strong>{missing}</strong>
          <p>
            Missing information is named explicitly; the system never converts
            uncertainty into an operational fact.
          </p>
        </div>
      </div>
    </ComponentFrame>
  );
}

export function ExceptionCard(props: ProductionComponentProps) {
  const { model } = props;
  const presentation =
    statePresentation[model.reviewState] ?? statePresentation.normal;
  return (
    <ComponentFrame {...props} componentId="CMP-010">
      <div className={`wave-exception wave-tone-${presentation.tone}`}>
        <span className="wave-exception-symbol" aria-hidden="true">
          {presentation.symbol}
        </span>
        <div>
          <strong>{presentation.title}</strong>
          <p>{presentation.detail}</p>
          <small>
            Owner · {model.actors[0]?.personName} ·{" "}
            {model.fixture.anchor.transition_id}
          </small>
        </div>
      </div>
    </ComponentFrame>
  );
}

export function RecoveryChecklist(props: ProductionComponentProps) {
  const { model } = props;
  const requirements = model.stateContract?.required_actions ?? [
    "Confirm the current server state",
    "Preserve accepted evidence",
    "Append only the accountable successor",
  ];
  return (
    <ComponentFrame {...props} componentId="CMP-011">
      <ol className="wave-checklist">
        {requirements.slice(0, 4).map((requirement, index) => (
          <li key={requirement}>
            <span aria-hidden="true">{index + 1}</span>
            {requirement}
          </li>
        ))}
      </ol>
    </ComponentFrame>
  );
}

export function PartialScopeMeter(props: ProductionComponentProps) {
  const { model } = props;
  const total = model.identity.block?.area.value ?? 1;
  const fraction = model.reviewState === "partial" ? 0.62 : 1;
  const complete = total * fraction;
  return (
    <ComponentFrame {...props} componentId="CMP-012">
      <div className="wave-meter-copy">
        <span>Accepted scope</span>
        <strong>
          {complete.toFixed(1)} <small>/ {total.toFixed(1)} ac</small>
        </strong>
      </div>
      <div
        aria-label={`${Math.round(fraction * 100)} percent of scope accepted`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={Math.round(fraction * 100)}
        className="wave-meter"
        role="progressbar"
      >
        <span style={{ width: `${fraction * 100}%` }} />
      </div>
      <p className="wave-supporting-copy">
        Unfinished scope remains separately attributable; accepted acreage is
        never discarded.
      </p>
    </ComponentFrame>
  );
}

export function CorrectionLineage(props: ProductionComponentProps) {
  const { model } = props;
  const records = model.records.slice(-3);
  return (
    <ComponentFrame {...props} componentId="CMP-013">
      <ol className="wave-lineage">
        {records.map((record, index) => (
          <li key={record.id} data-record-id={record.id}>
            <span>v{index + 1}</span>
            <div>
              <strong>{record.title}</strong>
              <small>
                {record.id} ·{" "}
                {index === records.length - 1
                  ? "current successor"
                  : "preserved predecessor"}
              </small>
            </div>
          </li>
        ))}
      </ol>
    </ComponentFrame>
  );
}

export function AuditTimeline(props: ProductionComponentProps) {
  const { model } = props;
  return (
    <ComponentFrame {...props} componentId="CMP-014" className="wave-span-2">
      <ol className="wave-audit-timeline">
        {model.events.slice(-5).map((event) => (
          <li key={event.id} data-event-id={event.id}>
            <time dateTime={event.occurred_at}>
              {formatMoment(event.occurred_at)}
            </time>
            <div>
              <strong>
                {event.from_state ?? "entry"} → {event.to_state}
              </strong>
              <p>{event.reason}</p>
              <small>
                {event.actor_assignment_id} · {event.transition_id} · immutable
              </small>
            </div>
          </li>
        ))}
      </ol>
    </ComponentFrame>
  );
}

export function OfflineQueueIndicator(props: ProductionComponentProps) {
  const { model } = props;
  const offlineEvents = model.events.filter(
    (event) => event.connectivity.captured_offline,
  );
  return (
    <ComponentFrame {...props} componentId="CMP-015">
      <div className="wave-sync-summary">
        <span aria-hidden="true">↧</span>
        <div>
          <strong>
            {model.reviewState === "offline"
              ? "Device journal · available"
              : "Server journal · current"}
          </strong>
          <p>
            {offlineEvents.length} fixture event
            {offlineEvents.length === 1 ? "" : "s"} captured offline; none
            discarded.
          </p>
        </div>
      </div>
    </ComponentFrame>
  );
}

export function SyncConflictResolver(props: ProductionComponentProps) {
  const { model } = props;
  const anchor = model.events.find(
    (event) => event.id === model.fixture.anchor.event_id,
  );
  return (
    <ComponentFrame {...props} componentId="CMP-016">
      <div className="wave-comparison">
        <div>
          <span>Device base</span>
          <strong>{anchor?.from_state ?? "entry"}</strong>
          <small>{model.fixture.anchor.connectivity.mode}</small>
        </div>
        <span aria-label="Compared with">⇄</span>
        <div>
          <span>Server state</span>
          <strong>{anchor?.to_state ?? model.fixture.current_state}</strong>
          <small>{model.fixture.anchor.connectivity.sync_status}</small>
        </div>
      </div>
      <button className="wave-secondary-control" type="button">
        Review both events · no overwrite
      </button>
    </ComponentFrame>
  );
}

export function StalenessBadge(props: ProductionComponentProps) {
  const { model } = props;
  return (
    <ComponentFrame {...props} componentId="CMP-017">
      <div
        className={`wave-stale-badge ${model.reviewState === "stale" ? "is-stale" : ""}`}
      >
        <span aria-hidden="true">↻</span>
        <div>
          <strong>
            {model.reviewState === "stale"
              ? "Newer evidence available"
              : "Evidence current"}
          </strong>
          <small>Base version · {model.fixture.anchor.event_id}</small>
        </div>
      </div>
    </ComponentFrame>
  );
}

export function NotificationCenter(props: ProductionComponentProps) {
  const { model } = props;
  const notices = model.screen.actions.flatMap(notificationFor).slice(0, 3);
  return (
    <ComponentFrame {...props} componentId="CMP-018">
      <ul className="wave-notice-list">
        {notices.map((notice) => (
          <li key={notice!.id} data-notification-id={notice!.id}>
            <span aria-hidden="true">●</span>
            <div>
              <strong>
                {notice!.id} · {notice!.severity}
              </strong>
              <small>
                {notice!.canonical_channel} · accountable acknowledgement
              </small>
            </div>
          </li>
        ))}
      </ul>
    </ComponentFrame>
  );
}

export function EscalationClock(props: ProductionComponentProps) {
  const { model } = props;
  const notice = model.screen.actions.flatMap(notificationFor)[0];
  const minutes =
    model.reviewState === "urgent"
      ? 18
      : (notice?.escalation_after_minutes ?? 240);
  return (
    <ComponentFrame {...props} componentId="CMP-019">
      <div className="wave-clock">
        <span aria-hidden="true">◷</span>
        <div>
          <strong>{minutes} min</strong>
          <small>until accountable escalation</small>
        </div>
      </div>
    </ComponentFrame>
  );
}

export function AssignmentRoster(props: ProductionComponentProps) {
  const { model } = props;
  return (
    <ComponentFrame {...props} componentId="CMP-020">
      <ul className="wave-roster">
        {model.actors.slice(0, 5).map((actor) => (
          <li key={actor.assignmentId} data-assignment-id={actor.assignmentId}>
            <span aria-hidden="true">{actor.personName.charAt(0)}</span>
            <div>
              <strong>{actor.personName}</strong>
              <small>
                {actor.roleId.replace("ROLE-", "").replaceAll("-", " ")}
              </small>
            </div>
          </li>
        ))}
      </ul>
    </ComponentFrame>
  );
}

export function BlockRowSelector(props: ProductionComponentProps) {
  const { model } = props;
  const block = model.identity.block;
  return (
    <ComponentFrame {...props} componentId="CMP-021">
      <fieldset className="wave-fieldset">
        <legend>Stable field scope</legend>
        <label>
          Block
          <select defaultValue={block?.id}>
            <option value={block?.id}>{block?.current_name}</option>
          </select>
        </label>
        <label>
          Rows
          <input
            defaultValue={`1–${block?.row_count ?? "—"}`}
            inputMode="text"
          />
        </label>
      </fieldset>
    </ComponentFrame>
  );
}

export function EffectiveTimeControl(props: ProductionComponentProps) {
  const { model } = props;
  const value = model.fixture.anchor.occurred_at.slice(0, 16);
  return (
    <ComponentFrame {...props} componentId="CMP-022">
      <label
        className="wave-field-label"
        htmlFor={`${model.screen.id}-effective`}
      >
        Effective time · America/Los_Angeles
      </label>
      <input
        defaultValue={value}
        id={`${model.screen.id}-effective`}
        readOnly={model.reviewState === "historical"}
        type="datetime-local"
      />
      <p className="wave-supporting-copy">
        Recorded time remains separate from when the work or correction took
        effect.
      </p>
    </ComponentFrame>
  );
}

export function MapScopeViewer(props: ProductionComponentProps) {
  const { model } = props;
  const block = model.identity.block;
  return (
    <ComponentFrame {...props} componentId="CMP-026" className="wave-span-2">
      <div
        className="wave-map"
        role="img"
        aria-label={`Row map for ${block?.current_name}`}
      >
        <div className="wave-map-rows" />
        <span className="wave-map-north">N ↑</span>
        <span className="wave-map-block">
          <strong>{block?.id}</strong>
          <small>
            {block?.row_count} rows · {block?.row_orientation_degrees}°
          </small>
        </span>
        <div className="wave-map-legend">
          <span>
            <i /> selected stable scope
          </span>
          <span>
            <i /> current organization boundary
          </span>
        </div>
      </div>
    </ComponentFrame>
  );
}

export function ApprovalChain(props: ProductionComponentProps) {
  const { model } = props;
  const chain = model.actors.slice(0, 4);
  return (
    <ComponentFrame {...props} componentId="CMP-033">
      <ol className="wave-approval-chain">
        {chain.map((actor, index) => (
          <li key={actor.assignmentId}>
            <span aria-hidden="true">
              {index < chain.length - 1 ? "✓" : "○"}
            </span>
            <div>
              <strong>{actor.personName}</strong>
              <small>
                {actor.roleId.replace("ROLE-", "").replaceAll("-", " ")}
              </small>
            </div>
          </li>
        ))}
      </ol>
    </ComponentFrame>
  );
}

export function ReconciliationComparison(props: ProductionComponentProps) {
  const { model } = props;
  const total = model.identity.block?.area.value ?? 0;
  const reported = model.reviewState === "error" ? total - 1.4 : total;
  return (
    <ComponentFrame {...props} componentId="CMP-034">
      <div className="wave-reconcile-grid">
        <span>Accepted source</span>
        <strong>{total.toFixed(1)} ac</strong>
        <span>Allocated result</span>
        <strong>{reported.toFixed(1)} ac</strong>
        <span>Difference</span>
        <strong>{(reported - total).toFixed(1)} ac</strong>
      </div>
      <p
        className={
          reported === total ? "wave-balance-positive" : "wave-balance-error"
        }
      >
        {reported === total
          ? "✓ Totals balance"
          : "! Resolve difference before closeout"}
      </p>
    </ComponentFrame>
  );
}

export function ExportEvidencePacket(props: ProductionComponentProps) {
  const { model } = props;
  return (
    <ComponentFrame {...props} componentId="CMP-035">
      <div className="wave-export-summary">
        <span aria-hidden="true">⇩</span>
        <div>
          <strong>{model.fixture.id} evidence packet</strong>
          <small>
            {model.records.length} records · {model.events.length} immutable
            events
          </small>
        </div>
      </div>
      <button
        className="wave-secondary-control"
        onClick={() => window.print()}
        type="button"
      >
        Print attributable evidence
      </button>
    </ComponentFrame>
  );
}

export function AccessibleStatusLegend(props: ProductionComponentProps) {
  return (
    <ComponentFrame {...props} componentId="CMP-036" className="wave-span-2">
      <ul className="wave-status-legend">
        {[
          "normal",
          "urgent",
          "blocked",
          "offline",
          "corrected",
          "historical",
        ].map((state) => {
          const presentation = statePresentation[state];
          return (
            <li key={state}>
              <span
                className={`wave-legend-symbol wave-tone-${presentation.tone}`}
                aria-hidden="true"
              >
                {presentation.symbol}
              </span>
              <div>
                <strong>{state}</strong>
                <small>{presentation.title}</small>
              </div>
            </li>
          );
        })}
      </ul>
    </ComponentFrame>
  );
}

export type { ProductionComponentProps } from "./types";
