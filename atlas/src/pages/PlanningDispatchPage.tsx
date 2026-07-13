import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";
import { StatusSignal } from "../components/StatusSignal";
import { WorkOrderQueue } from "../components/WorkOrderQueue";
import {
  blockIdentity,
  dayMetrics,
  statusDefinitions,
  traceChain,
  workflowSteps,
  workOrders,
  type WorkStatus,
} from "../data/planningDispatch";

type FilterKey = "all" | "attention" | "active" | "closed";

const filterLabels: Record<FilterKey, string> = {
  all: "All work",
  attention: "Needs attention",
  active: "In motion",
  closed: "Closed history",
};

const filterStatuses: Record<Exclude<FilterKey, "all">, WorkStatus[]> = {
  attention: ["blocked", "offline", "stale", "partial"],
  active: ["ready", "assigned", "in-progress"],
  closed: ["verified", "corrected", "historical"],
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

function EvidencePanel({ selectedId }: { selectedId: string }) {
  const selected =
    workOrders.find((order) => order.id === selectedId) ?? workOrders[0];
  const isDefault = selected.id === workOrders[0].id;

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

        {isDefault ? (
          <>
            <WorkflowProgress />
            <div className="progress-proof">
              <div>
                <span>Reported coverage</span>
                <strong>
                  14.8 <small>/ 22.4 ac</small>
                </strong>
                <div className="progress-track">
                  <span style={{ width: "66%" }} />
                </div>
              </div>
              <dl>
                <div>
                  <dt>Started</dt>
                  <dd>06:21</dd>
                </div>
                <div>
                  <dt>Rows</dt>
                  <dd>1–42 of 64</dd>
                </div>
                <div>
                  <dt>Labor</dt>
                  <dd>61.4 hr</dd>
                </div>
                <div>
                  <dt>Next check</dt>
                  <dd>11:15</dd>
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
          <button className="button button-primary" type="button">
            Open work record
          </button>
          <button className="button button-secondary" type="button">
            View crew brief
          </button>
        </div>
      </article>
      {isDefault && <BlockIdentityCard />}
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
            <span>6:22</span>
            <span>Field mode · Offline ready</span>
          </div>
          <header>
            <span className="mono">WO-260618-04</span>
            <StatusSignal compact status="in-progress" />
            <h3>Lift and tuck · pass 2</h3>
            <p>South Loam 22 · Cabernet Franc</p>
          </header>
          <div className="phone-context">
            <span>
              <Icon name="block" />
              <strong>Rows 1–64</strong>
              <small>West → east</small>
            </span>
            <span>
              <Icon name="clock" />
              <strong>By 13:30</strong>
              <small>Check at 11:15</small>
            </span>
          </div>
          <div className="phone-alert">
            <Icon name="info" />
            <span>
              <strong>Keep flags visible</strong>Replacement vines in rows 16,
              29, 41.
            </span>
          </div>
          <div className="phone-progress">
            <span>Reported</span>
            <strong>
              14.8 <small>/ 22.4 ac</small>
            </strong>
            <div>
              <span />
            </div>
          </div>
          <button className="button button-primary" type="button">
            Report progress
          </button>
          <button className="button button-secondary" type="button">
            Flag a problem
          </button>
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
  const [selectedId, setSelectedId] = useState(workOrders[0].id);
  const [filter, setFilter] = useState<FilterKey>("all");
  const filteredOrders = useMemo(
    () =>
      filter === "all"
        ? workOrders
        : workOrders.filter((order) =>
            filterStatuses[filter].includes(order.status),
          ),
    [filter],
  );

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
                : "Seasonal planning + work-order dispatch"}
            </h1>
            <p className="lede">
              Convert seasonal intent and current field signals into executable
              block work—then preserve what happened, what did not, and why.
            </p>
          </div>
          <div className="confidence-card">
            <span>
              <Icon name="spark" />
            </span>
            <small>Source confidence</small>
            <strong>Medium–high</strong>
            <p>Supported composite workflow</p>
          </div>
        </div>
        <div className="context-strip">
          <span>
            <Icon name="calendar" />
            <strong>Fruit set</strong>
            <small>Jun 18 · day shift</small>
          </span>
          <span>
            <Icon name="block" />
            <strong>Mesa Alta</strong>
            <small>Rancho Arroyo + Juniper Draw</small>
          </span>
          <span>
            <Icon name="crew" />
            <strong>Vineyard manager</strong>
            <small>Foremen · crews · office</small>
          </span>
          <span>
            <Icon name="route" />
            <strong>Daily + event-driven</strong>
            <small>Weather and field signals re-plan work</small>
          </span>
        </div>
      </header>

      <section aria-label="Day overview" className="metric-grid">
        {dayMetrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

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
            <h2 id="decision-queue-title">Two items can change today’s plan</h2>
          </div>
        </div>
        <div className="attention-items">
          <button
            onClick={() => {
              setFilter("attention");
              setSelectedId("WO-260618-07");
            }}
            type="button"
          >
            <StatusSignal compact status="blocked" />
            <span>
              <strong>North Bench access restriction</strong>
              <small>Re-scope west rows or hold until 14:00</small>
            </span>
            <Icon name="chevron" />
          </button>
          <button onClick={() => setFilter("attention")} type="button">
            <StatusSignal compact status="stale" />
            <span>
              <strong>Tomorrow’s labor roster</strong>
              <small>Last confirmed 11 hr ago · 18-person gap</small>
            </span>
            <Icon name="chevron" />
          </button>
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
              onClick={() => setFilter(key)}
              type="button"
            >
              {filterLabels[key]}
            </button>
          ))}
        </div>
        <div className="sync-note">
          <Icon name="offline" />
          <span>Field sync</span>
          <strong>3 queued</strong>
        </div>
      </div>

      <div className="workspace-grid">
        <WorkOrderQueue
          orders={filteredOrders}
          onSelect={setSelectedId}
          selectedId={selectedId}
        />
        <EvidencePanel selectedId={selectedId} />
      </div>

      <StateCoverage />
      <MobileCrewBrief />

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
