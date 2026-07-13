import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FieldCrewMode } from "../components/FieldCrewMode";
import { Icon } from "../components/Icon";
import { RecoveryActionPanel } from "../components/RecoveryActionPanel";
import { StatusSignal } from "../components/StatusSignal";
import { WorkOrderQueue } from "../components/WorkOrderQueue";
import {
  blockIdentity,
  canonicalWorkOrder,
  dayMetrics,
  statusDefinitions,
  traceChain,
  workflowSteps,
  workOrders,
  type RecoveryState,
  type WorkOrder,
  type WorkStatus,
} from "../data/planningDispatch";
import {
  type RecoveryReplay,
  useRecoveryReplay,
} from "../hooks/useRecoveryReplay";

type FilterKey = "all" | "attention" | "active" | "closed";
type SurfaceMode = "supervisor" | "field";

const filterLabels: Record<FilterKey, string> = {
  all: "All work",
  attention: "Needs attention",
  active: "In motion",
  closed: "Closed history",
};

const filterStatuses: Record<Exclude<FilterKey, "all">, WorkStatus[]> = {
  attention: ["blocked", "offline", "stale", "partial"],
  active: ["ready", "assigned", "acknowledged", "in-progress"],
  closed: ["completed", "verified", "corrected", "historical"],
};

const recoveryQueueStatus: Record<RecoveryState, WorkStatus> = {
  blocked: "blocked",
  assigned: "assigned",
  acknowledged: "acknowledged",
  in_progress: "in-progress",
  completed: "completed",
  verified: "verified",
};

function MetricCard({ metric }: { metric: (typeof dayMetrics)[number] }) {
  return (
    <article className={`metric-card metric-${metric.tone}`}>
      <span>{metric.label}</span>
      <strong>{metric.value}</strong>
      <small>{metric.detail}</small>
    </article>
  );
}

function WorkflowProgress() {
  return (
    <ol
      aria-label="Work order progress"
      className="workflow-progress"
      tabIndex={0}
    >
      {workflowSteps.map((step) => (
        <li className={`workflow-step step-${step.state}`} key={step.label}>
          <span className="step-marker">
            {step.state === "complete" ? <Icon name="check" /> : <span />}
          </span>
          <strong>{step.label}</strong>
          <small>{step.meta}</small>
        </li>
      ))}
    </ol>
  );
}

function BlockIdentityCard() {
  return (
    <article className="block-card panel">
      <header className="panel-heading compact-heading">
        <div>
          <p className="kicker">Stable block identity</p>
          <h3>{blockIdentity.name}</h3>
        </div>
        <span className="block-code mono">{blockIdentity.stableId}</span>
      </header>
      <div className="block-summary">
        <span>
          <Icon name="block" />
          {blockIdentity.ranch}
        </span>
        <span>{blockIdentity.crop}</span>
        <span>{blockIdentity.planted}</span>
      </div>
      <div className="alias-list">
        {blockIdentity.aliases.map((alias) => (
          <span key={alias.system}>
            <small>{alias.system}</small>
            <strong>{alias.value}</strong>
          </span>
        ))}
      </div>
    </article>
  );
}

function EvidencePanel({
  selectedId,
  orders,
  replay,
  onOpenFieldMode,
}: {
  selectedId: string;
  orders: WorkOrder[];
  replay: RecoveryReplay;
  onOpenFieldMode: () => void;
}) {
  const selected = orders.find((order) => order.id === selectedId) ?? orders[0];
  const isCanonical = selected.fixtureId === "FIX-001";
  const canonicalCompleted = ["completed", "verified"].includes(replay.state)
    ? canonicalWorkOrder.target_acres
    : 11.2;
  const progress = Math.round(
    (canonicalCompleted / canonicalWorkOrder.target_acres) * 100,
  );

  return (
    <aside aria-label="Selected work order details" className="detail-stack">
      <article className="selected-work panel">
        <header className="selected-work-header">
          <div>
            <p className="kicker">Selected work order</p>
            <span className="mono">{selected.id}</span>
            <h2>{selected.title}</h2>
            <p>
              {selected.block} · {selected.crop}
            </p>
          </div>
          <StatusSignal status={selected.status} />
        </header>

        {selected.status === "blocked" && (
          <div className="decision-banner decision-danger" role="status">
            <Icon name="warning" />
            <span>
              <strong>Do not dispatch yet</strong>
              {selected.detail} Manager can re-scope to west rows or wait for
              access clearance.
            </span>
          </div>
        )}
        {selected.status === "offline" && (
          <div className="decision-banner decision-info" role="status">
            <Icon name="offline" />
            <span>
              <strong>Field evidence is not reconciled</strong>
              {selected.detail} Office progress excludes queued records until
              synchronization succeeds.
            </span>
          </div>
        )}
        {selected.status === "corrected" && (
          <div className="decision-banner decision-warning" role="status">
            <Icon name="history" />
            <span>
              <strong>Approved correction</strong>
              {selected.detail} The original verification remains available in
              history.
            </span>
          </div>
        )}

        {isCanonical && selected.status === "partial" && (
          <div className="decision-banner decision-warning" role="status">
            <Icon name="info" />
            <span>
              <strong>Safe work retained; remaining rows stay open</strong>
              11.2 of 18.6 acres are recorded without closing rows 28–34.
            </span>
          </div>
        )}

        {isCanonical && selected.status === "assigned" && (
          <div className="decision-banner decision-info" role="status">
            <Icon name="check" />
            <span>
              <strong>Repair confirmed; remaining scope redispatched</strong>
              Foreman acknowledgement is required before execution resumes; the
              original hydraulic blocker remains visible in history.
            </span>
          </div>
        )}

        {isCanonical ? (
          <>
            <WorkflowProgress />
            <div className="progress-proof">
              <div>
                <span>Reported coverage</span>
                <strong>
                  {canonicalCompleted} <small>/ 18.6 ac</small>
                </strong>
                <div className="progress-track">
                  <span style={{ width: `${progress}%` }} />
                </div>
              </div>
              <dl>
                <div>
                  <dt>Started</dt>
                  <dd>7:22 AM</dd>
                </div>
                <div>
                  <dt>Open scope</dt>
                  <dd>Rows 28–34</dd>
                </div>
                <div>
                  <dt>Reporter</dt>
                  <dd>Mateo Ruiz</dd>
                </div>
                <div>
                  <dt>Audit state</dt>
                  <dd>{replay.history.length} events</dd>
                </div>
              </dl>
            </div>
          </>
        ) : (
          <div className="selected-summary">
            <dl>
              <div>
                <dt>Area</dt>
                <dd>
                  {selected.completedAcres ?? 0} / {selected.acres} ac
                </dd>
              </div>
              <div>
                <dt>Crew</dt>
                <dd>{selected.crew}</dd>
              </div>
              <div>
                <dt>Lead</dt>
                <dd>{selected.lead}</dd>
              </div>
              <div>
                <dt>Window</dt>
                <dd>{selected.window}</dd>
              </div>
            </dl>
            <p>{selected.detail}</p>
          </div>
        )}

        <div className="selected-actions">
          {isCanonical ? (
            <>
              <a
                className="button button-primary"
                href="#recovery-actions-title"
              >
                Resolve work record
              </a>
              <button
                className="button button-secondary"
                onClick={onOpenFieldMode}
                type="button"
              >
                Open field mode
              </button>
            </>
          ) : (
            <a className="button button-secondary" href="#state-coverage-title">
              Review state semantics
            </a>
          )}
        </div>
      </article>
      {isCanonical && <BlockIdentityCard />}
    </aside>
  );
}

function StateCoverage() {
  return (
    <section
      aria-labelledby="state-coverage-title"
      className="state-section section-block"
    >
      <div className="section-heading-row">
        <div>
          <p className="kicker">Operational state semantics</p>
          <h2 id="state-coverage-title">Non-ideal states stay explicit</h2>
        </div>
        <p>
          Meaning is carried by label, icon, explanatory copy, and
          resolution—not color alone.
        </p>
      </div>
      <div className="state-card-grid">
        {statusDefinitions.map((state) => (
          <article
            className={`state-card state-card-${state.status}`}
            key={state.status}
          >
            <StatusSignal status={state.status} />
            <p>{state.description}</p>
            <small>{state.example}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function MobileCrewBrief() {
  return (
    <section
      aria-labelledby="mobile-brief-title"
      className="mobile-brief-section section-block"
    >
      <div className="section-heading-row">
        <div>
          <p className="kicker">Responsive responsibility</p>
          <h2 id="mobile-brief-title">
            The same record, focused for the field
          </h2>
        </div>
        <p>
          Supervisory density collapses into a high-contrast brief with large
          controls and offline-aware proof capture.
        </p>
      </div>
      <div className="mobile-showcase">
        <div className="mobile-notes">
          <article>
            <span>01</span>
            <div>
              <strong>Context never scrolls away</strong>
              <p>
                Block, crop stage, work, window, and restriction state remain
                visible.
              </p>
            </div>
          </article>
          <article>
            <span>02</span>
            <div>
              <strong>Field language is direct</strong>
              <p>
                Rows, completion quantity, and exception reasons replace office
                abstractions.
              </p>
            </div>
          </article>
          <article>
            <span>03</span>
            <div>
              <strong>Offline is a record state</strong>
              <p>
                Queued evidence is distinguishable from office-reconciled
                completion.
              </p>
            </div>
          </article>
        </div>
        <div className="phone-frame" aria-label="Mobile crew brief preview">
          <div className="phone-status">
            <span>9:16</span>
            <span>Field mode · Offline ready</span>
          </div>
          <header>
            <span className="mono">FIX-001 · WO-001</span>
            <StatusSignal compact status="blocked" />
            <h3>Mechanical undervine mowing</h3>
            <p>Carneros Ridge Block 07 · Pinot Noir</p>
          </header>
          <div className="phone-context">
            <span>
              <Icon name="block" />
              <strong>Rows 28–34</strong>
              <small>Remain open</small>
            </span>
            <span>
              <Icon name="clock" />
              <strong>Before 18:00</strong>
              <small>Irrigation set</small>
            </span>
          </div>
          <div className="phone-alert">
            <Icon name="info" />
            <span>
              <strong>Hydraulic stop recorded</strong>Leaking mower supply hose;
              west-pass acreage remains valid.
            </span>
          </div>
          <div className="phone-progress">
            <span>Reported</span>
            <strong>
              11.2 <small>/ 18.6 ac</small>
            </strong>
            <div>
              <span />
            </div>
          </div>
          <span className="button button-primary">
            Queue partial completion
          </span>
          <span className="button button-secondary">Inspect local history</span>
        </div>
      </div>
    </section>
  );
}

export function PlanningDispatchPage({
  screenMode = false,
}: {
  screenMode?: boolean;
}) {
  const replay = useRecoveryReplay();
  const [selectedId, setSelectedId] = useState(workOrders[0].id);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [surfaceMode, setSurfaceMode] = useState<SurfaceMode>(() =>
    screenMode && window.matchMedia("(max-width: 720px)").matches
      ? "field"
      : "supervisor",
  );
  const [selectionAnnouncement, setSelectionAnnouncement] = useState(
    `${workOrders[0].id} selected from FIX-001.`,
  );
  const currentOrders = useMemo(
    () =>
      workOrders.map((order) =>
        order.fixtureId === "FIX-001"
          ? {
              ...order,
              status: recoveryQueueStatus[replay.state],
              completedAcres: ["completed", "verified"].includes(replay.state)
                ? canonicalWorkOrder.target_acres
                : 11.2,
              update:
                replay.state === "verified"
                  ? "Verified by Elena Ortiz · 3:10 PM"
                  : replay.state === "completed"
                    ? "Full acreage reported · 2:36 PM"
                    : replay.state === "in_progress"
                      ? "Remaining rows resumed · 11:52 AM"
                      : replay.state === "acknowledged"
                        ? "Foreman acknowledged · 11:48 AM"
                        : replay.state === "assigned"
                          ? "Repair confirmed · redispatched 11:45 AM"
                          : order.update,
            }
          : order,
      ),
    [replay.state],
  );
  const filteredOrders = useMemo(
    () =>
      filter === "all"
        ? currentOrders
        : currentOrders.filter((order) =>
            filterStatuses[filter].includes(order.status),
          ),
    [currentOrders, filter],
  );
  const attentionOrders = currentOrders.filter((order) =>
    filterStatuses.attention.includes(order.status),
  );

  const selectOrder = (id: string) => {
    const order = currentOrders.find((item) => item.id === id);
    setSelectedId(id);
    setSelectionAnnouncement(
      order
        ? `${order.id}, ${order.title}, selected. Status ${order.status}.`
        : `${id} selected.`,
    );
  };

  const applyFilter = (nextFilter: FilterKey) => {
    const nextOrders =
      nextFilter === "all"
        ? currentOrders
        : currentOrders.filter((order) =>
            filterStatuses[nextFilter].includes(order.status),
          );
    setFilter(nextFilter);
    if (!nextOrders.some((order) => order.id === selectedId)) {
      const nextSelection = nextOrders[0]?.id ?? "";
      setSelectedId(nextSelection);
      setSelectionAnnouncement(
        nextSelection
          ? `${filterLabels[nextFilter]} filter applied. ${nextSelection} selected because the prior record is outside this filter.`
          : `${filterLabels[nextFilter]} filter applied. No work orders match.`,
      );
    } else {
      setSelectionAnnouncement(
        `${filterLabels[nextFilter]} filter applied. ${nextOrders.length} work orders shown.`,
      );
    }
  };

  return (
    <div className="workflow-page page-frame">
      <header className="workflow-intro">
        <div className="breadcrumbs">
          <Link to={screenMode ? "/screens" : "/workflows"}>
            {screenMode ? "Screens" : "Workflows"}
          </Link>
          <Icon name="chevron" />
          <span>{screenMode ? "SCR-001" : "WF-001"}</span>
        </div>
        <div className="workflow-title-row">
          <div>
            <p className="eyebrow">
              {screenMode
                ? "Canonical screen · SCR-001"
                : "Priority workflow · WF-001"}
            </p>
            <h1>
              {screenMode
                ? "Morning dispatch board"
                : "Seasonal planning, dispatch, execution + verification"}
            </h1>
            <p className="lede">
              Convert seasonal intent and current field signals into executable
              block work—then preserve what happened, what did not, and why.
              This route is driven by FIX-001, not presentation-only sample
              copy.
            </p>
          </div>
          <div className="confidence-card">
            <span>
              <Icon name="spark" />
            </span>
            <small>Source confidence</small>
            <strong>Canonical fixture</strong>
            <p>FIX-001 · seed 20260713</p>
          </div>
        </div>
        <div className="context-strip">
          <span>
            <Icon name="calendar" />
            <strong>May 14 · day shift</strong>
            <small>Before 18:00 irrigation set</small>
          </span>
          <span>
            <Icon name="block" />
            <strong>Carneros Ridge</strong>
            <small>BLK-007 · Pinot Noir</small>
          </span>
          <span>
            <Icon name="crew" />
            <strong>Vineyard manager</strong>
            <small>Elena Ortiz · Mateo Ruiz · Luis Mendoza</small>
          </span>
          <span>
            <Icon name="route" />
            <strong>Daily + event-driven</strong>
            <small>Weather and field signals re-plan work</small>
          </span>
        </div>
      </header>

      <div className="surface-mode-bar">
        <div>
          <p className="kicker">Responsive operating surface</p>
          <strong>
            {surfaceMode === "supervisor"
              ? "Supervisor dispatch mode"
              : "Field crew mode"}
          </strong>
          <small>
            {surfaceMode === "supervisor"
              ? "Cross-crew decisions, recovery, verification, and audit"
              : "Large field controls with offline-safe proof capture"}
          </small>
        </div>
        <div
          aria-label="Choose operating mode"
          className="mode-switch"
          role="group"
        >
          <button
            aria-pressed={surfaceMode === "supervisor"}
            onClick={() => setSurfaceMode("supervisor")}
            type="button"
          >
            <Icon name="layers" /> Supervisor
          </button>
          <button
            aria-pressed={surfaceMode === "field"}
            onClick={() => setSurfaceMode("field")}
            type="button"
          >
            <Icon name="crew" /> Field crew
          </button>
        </div>
      </div>

      <section aria-label="Day overview" className="metric-grid">
        {dayMetrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      {surfaceMode === "supervisor" ? (
        <>
          <section
            aria-labelledby="decision-queue-title"
            className="attention-band"
          >
            <div className="attention-title">
              <span>
                <Icon name="warning" />
              </span>
              <div>
                <p className="kicker">Decisions before dispatch</p>
                <h2 id="decision-queue-title">
                  {attentionOrders.length} items can change today’s plan
                </h2>
              </div>
            </div>
            <div className="attention-items">
              {attentionOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => {
                    setFilter("attention");
                    selectOrder(order.id);
                  }}
                  type="button"
                >
                  <StatusSignal compact status={order.status} />
                  <span>
                    <strong>{order.title}</strong>
                    <small>
                      {order.block} · {order.detail}
                    </small>
                  </span>
                  <Icon name="chevron" />
                </button>
              ))}
            </div>
          </section>

          <div className="queue-toolbar">
            <div
              aria-label="Filter work orders"
              className="segmented-control"
              role="group"
            >
              {(Object.keys(filterLabels) as FilterKey[]).map((key) => (
                <button
                  aria-pressed={filter === key}
                  key={key}
                  onClick={() => applyFilter(key)}
                  type="button"
                >
                  {filterLabels[key]}
                </button>
              ))}
            </div>
            <div className="sync-note">
              <Icon name="offline" />
              <span>Field sync</span>
              <strong>1 fixture queue available</strong>
            </div>
          </div>

          <div className="workspace-grid">
            <WorkOrderQueue
              orders={filteredOrders}
              onSelect={selectOrder}
              selectedId={selectedId}
            />
            <EvidencePanel
              onOpenFieldMode={() => setSurfaceMode("field")}
              orders={currentOrders}
              replay={replay}
              selectedId={selectedId}
            />
          </div>

          <RecoveryActionPanel replay={replay} />
        </>
      ) : (
        <FieldCrewMode />
      )}

      <p aria-live="polite" className="sr-only">
        {selectionAnnouncement} {replay.announcement}
      </p>

      <StateCoverage />
      {surfaceMode === "supervisor" && <MobileCrewBrief />}

      <section
        aria-labelledby="workflow-contract-title"
        className="workflow-contract section-block"
      >
        <div className="section-heading-row">
          <div>
            <p className="kicker">Workflow contract</p>
            <h2 id="workflow-contract-title">
              Why this product surface exists
            </h2>
          </div>
        </div>
        <div className="contract-grid">
          <article>
            <h3>Business purpose</h3>
            <p>
              Turn annual targets, live conditions, and constraints into
              block-level work that can be executed and defensibly closed.
            </p>
          </article>
          <article>
            <h3>Inputs + preconditions</h3>
            <p>
              Stable block identity, growth stage, history, labor, equipment,
              materials, weather, and access restrictions.
            </p>
          </article>
          <article>
            <h3>Records created</h3>
            <p>
              Work order, assignment, crew brief, activity report, exception,
              verification, labor allocation, and audit event.
            </p>
          </article>
          <article>
            <h3>Open field question</h3>
            <p>
              How often does “done” first arrive verbally, and which evidence is
              practical for a foreman to capture before leaving the block?
            </p>
          </article>
        </div>
        <div
          className="trace-chain"
          aria-label="Source to construction traceability"
        >
          {traceChain.map((item, index) => (
            <span key={item}>
              <strong>{item}</strong>
              {index < traceChain.length - 1 && <Icon name="chevron" />}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
