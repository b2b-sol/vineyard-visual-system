import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import visualDirectionContract from "../../../design-system/visual-directions/directions.json";
import { Icon, type IconName } from "../components/Icon";
import "../visual-directions.css";

type DispositionValue = "selected" | "reserve" | "contextual";

const directions = visualDirectionContract.directions.map((direction) => ({
  ...direction,
  disposition: direction.disposition as DispositionValue,
}));
type Direction = (typeof directions)[number];

const lighthouses = visualDirectionContract.lighthouses.map((lighthouse) => ({
  ...lighthouse,
  meta: `${lighthouse.screen_id} · ${lighthouse.scenario_id} · ${lighthouse.fixture_id} · ${lighthouse.viewport.width} × ${lighthouse.viewport.height}`,
}));

const directionById = new Map(
  directions.map((direction) => [direction.id, direction]),
);
const lighthouseById = new Map(
  lighthouses.map((lighthouse) => [lighthouse.id, lighthouse]),
);
const selectedDirection = directionById.get(
  visualDirectionContract.selected_direction_id,
)!;

function Disposition({ value }: { value: Direction["disposition"] }) {
  return (
    <span className={`vd-disposition vd-disposition-${value}`}>{value}</span>
  );
}

export function VisualDirectionsPage() {
  return (
    <div className="page-frame visual-directions-index">
      <header className="vd-index-header">
        <div>
          <p className="eyebrow">VIS-FND-001 · visual thesis review</p>
          <h1>Three territories. One operational test.</h1>
          <p className="vd-index-lede">
            Identical vineyard states, records, roles, and actions isolate the
            visual language. Canopy Signal is selected as a sunlit fieldbook:
            its daylight clarity is fused with Field Ledger&apos;s parcel
            geometry and record lineage.
          </p>
        </div>
        <aside className="vd-selection-note" aria-label="Selection result">
          <span className="vd-selection-kicker">Selected foundation</span>
          <strong>{selectedDirection.name}</strong>
          <p>
            {selectedDirection.total} / 100 · no hard rejection criteria
            triggered
          </p>
        </aside>
      </header>

      <section aria-labelledby="direction-heading">
        <div className="vd-section-heading">
          <div>
            <p className="eyebrow">Comparable render set</p>
            <h2 id="direction-heading">Direction scorecards</h2>
          </div>
          <p>
            Weighted against operational fidelity, field use, density, access,
            continuity, distinctiveness, and editability.
          </p>
        </div>
        <div className="vd-direction-grid">
          {directions.map((direction) => (
            <article
              className={`vd-direction-card vd-theme-${direction.id}`}
              key={direction.id}
            >
              <div className="vd-card-topline">
                <Disposition value={direction.disposition} />
                <span
                  className="vd-score"
                  aria-label={`${direction.total} out of 100`}
                >
                  {direction.total}
                  <small>/100</small>
                </span>
              </div>
              <h3>{direction.name}</h3>
              <p>{direction.thesis}</p>
              <div
                className="vd-swatches"
                aria-label={`${direction.name} palette`}
              >
                {direction.visual.swatches.map((swatch) => (
                  <span key={swatch} title={swatch} />
                ))}
              </div>
              <dl className="vd-evaluation">
                <div>
                  <dt>Proves</dt>
                  <dd>{direction.visual.strengths.join(" · ")}</dd>
                </div>
                <div>
                  <dt>Watch</dt>
                  <dd>{direction.visual.risks.join(" · ")}</dd>
                </div>
              </dl>
              <div className="vd-render-links">
                {lighthouses.map((lighthouse) => (
                  <Link
                    key={lighthouse.id}
                    to={`/visual-directions/${direction.id}/${lighthouse.id}`}
                  >
                    <span>
                      <strong>{lighthouse.label}</strong>
                      <small>{lighthouse.meta}</small>
                    </span>
                    <Icon name="chevron" />
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="vd-method" aria-labelledby="method-heading">
        <div>
          <p className="eyebrow">Selection method</p>
          <h2 id="method-heading">The interface—not the moodboard—decides.</h2>
        </div>
        <ol>
          <li>
            <strong>Same truth</strong>
            <span>
              Exact scenarios, fixtures, records, owners, values, and frozen
              state.
            </span>
          </li>
          <li>
            <strong>Same structure</strong>
            <span>
              Semantic markup and component contracts remain invariant.
            </span>
          </li>
          <li>
            <strong>Different language</strong>
            <span>
              Only palette, typography, rhythm, edge, texture, and visualization
              styling vary.
            </span>
          </li>
          <li>
            <strong>Hard floors</strong>
            <span>
              Non-color status, ≥44 px targets, contrast, visible focus, and
              append-only history.
            </span>
          </li>
        </ol>
      </section>
    </div>
  );
}

function StatusMark({
  icon,
  label,
  tone,
}: {
  icon: IconName;
  label: string;
  tone: string;
}) {
  return (
    <span className={`vd-status vd-status-${tone}`}>
      <Icon name={icon} />
      <span>{label}</span>
    </span>
  );
}

function FieldInterruption() {
  return (
    <div className="vd-product vd-product-field">
      <header className="vd-product-bar">
        <div>
          <span className="vd-product-label">Field delivery control</span>
          <strong>BLK-003 · Creek 03</strong>
        </div>
        <StatusMark icon="offline" label="Synced · 2m" tone="neutral" />
      </header>
      <div
        className="vd-product-main"
        tabIndex={0}
        aria-label="Field interruption details"
      >
        <section className="vd-alert" aria-labelledby="field-alert-title">
          <Icon name="warning" />
          <div>
            <span>Delivery interrupted · major</span>
            <h1 id="field-alert-title">Pressure lost at east manifold</h1>
            <p>EVT-00049 · 6:00 PM · Pump station East · containment active</p>
          </div>
        </section>

        <section className="vd-block-card">
          <div className="vd-card-heading">
            <div>
              <span>Current scope</span>
              <strong>Alder Crest Creek 03</strong>
            </div>
            <span className="vd-id">BLK-003</span>
          </div>
          <div
            className="vd-field-map"
            aria-label="Stylized map of block BLK-003"
          >
            <span className="vd-map-row vd-map-row-1" />
            <span className="vd-map-row vd-map-row-2" />
            <span className="vd-map-row vd-map-row-3" />
            <span className="vd-map-row vd-map-row-4" />
            <span className="vd-map-fault">
              <Icon name="warning" />
            </span>
            <span className="vd-map-label">EAST MANIFOLD</span>
          </div>
          <div className="vd-identity-strip">
            <span>Pinot Noir</span>
            <span>15.55 ac</span>
            <span>NC-03 · EST-003</span>
          </div>
        </section>

        <section className="vd-metric-grid" aria-label="Delivery evidence">
          <article>
            <span>Planned flow</span>
            <strong>1,025</strong>
            <small>gal / hr</small>
          </article>
          <article>
            <span>Elapsed</span>
            <strong>6.75</strong>
            <small>hours</small>
          </article>
          <article>
            <span>Delivered</span>
            <strong>6,918.75</strong>
            <small>gallons</small>
          </article>
          <article className="vd-metric-risk">
            <span>Estimated loss</span>
            <strong>1,793.75</strong>
            <small>gallons</small>
          </article>
        </section>

        <section className="vd-recovery-card">
          <div className="vd-card-heading">
            <div>
              <span>Assigned recovery</span>
              <strong>Owen Park · ASG-012</strong>
            </div>
            <StatusMark icon="route" label="Assigned" tone="info" />
          </div>
          <ul>
            <li className="vd-step-complete">
              <Icon name="check" />
              <span>
                <strong>Delivery stopped</strong>
                <small>Priya Shah · 6:01 PM</small>
              </span>
            </li>
            <li className="vd-step-current">
              <Icon name="route" />
              <span>
                <strong>Inspect east manifold</strong>
                <small>Current accountable step</small>
              </span>
            </li>
            <li>
              <Icon name="clock" />
              <span>
                <strong>Verify repaired pressure</strong>
                <small>Required before restart</small>
              </span>
            </li>
          </ul>
        </section>

        <aside className="vd-evidence-strip">
          <span>
            <strong>40</strong> soil depletion
          </span>
          <span>
            <strong>0.185</strong> ET
          </span>
          <StatusMark icon="warning" label="Urgent" tone="notice" />
        </aside>
      </div>
      <footer className="vd-action-dock">
        <button className="vd-button vd-button-secondary" type="button">
          <Icon name="history" />
          History
        </button>
        <button className="vd-button vd-button-primary" type="button">
          Resolve assigned recovery
          <Icon name="chevron" />
        </button>
        <button className="vd-button vd-button-disabled" disabled type="button">
          Record delivered
        </button>
      </footer>
    </div>
  );
}

const harvestEvents = [
  ["06:00", "Authorized", "Elena Ortiz", "complete"],
  ["07:30", "Crew staged", "Nico Ferrer", "complete"],
  ["09:00", "Load created", "LOAD-001-01", "complete"],
  ["10:30", "In transit", "Mateo Ruiz", "complete"],
  ["12:00", "Delayed", "Missed slot", "notice"],
  ["13:30", "Resumed", "Capacity opened", "complete"],
  ["15:00", "Delayed", "Winery capacity", "current"],
] as const;

function HarvestCommand() {
  return (
    <div className="vd-product vd-product-desktop">
      <header className="vd-command-header">
        <div>
          <span>Harvest command · 2026 vintage</span>
          <h1>Tuesday, August 4</h1>
        </div>
        <div className="vd-command-context">
          <span>North Coast · Alder Crest</span>
          <strong>Elena Ortiz · Vineyard manager</strong>
        </div>
      </header>
      <section
        className="vd-command-kpis"
        aria-label="Harvest command indicators"
      >
        <article>
          <StatusMark icon="warning" label="Major" tone="critical" />
          <strong>1</strong>
          <span>active exception</span>
        </article>
        <article>
          <StatusMark icon="clock" label="Delayed" tone="notice" />
          <strong>1</strong>
          <span>delayed load</span>
        </article>
        <article>
          <Icon name="block" />
          <strong>12.85</strong>
          <span>target acres</span>
        </article>
        <article>
          <Icon name="route" />
          <strong>Pending</strong>
          <span>winery intake</span>
        </article>
      </section>
      <div className="vd-command-grid">
        <section className="vd-load-queue">
          <div className="vd-card-heading">
            <div>
              <span>Live work and load queue</span>
              <strong>East harvest · hand pick</strong>
            </div>
            <span className="vd-count">1 selected</span>
          </div>
          <article className="vd-load-row vd-load-row-selected">
            <div className="vd-load-id">
              <span>LOAD-001-01</span>
              <strong>BLK-001 · East 01</strong>
              <small>Pinot Noir · 12.85 ac</small>
            </div>
            <div>
              <span>Notice</span>
              <strong>28 hr</strong>
              <small>confirmed</small>
            </div>
            <div>
              <span>Identity</span>
              <strong>100</strong>
              <small>verified</small>
            </div>
            <StatusMark icon="warning" label="Delayed" tone="critical" />
          </article>
          <div className="vd-timeline" aria-label="Load timeline">
            {harvestEvents.map(([time, label, owner, state]) => (
              <div
                className={`vd-timeline-event vd-timeline-${state}`}
                key={`${time}-${label}`}
              >
                <span className="vd-timeline-marker">
                  <Icon
                    name={
                      state === "complete"
                        ? "check"
                        : state === "current"
                          ? "warning"
                          : "clock"
                    }
                  />
                </span>
                <time>{time}</time>
                <strong>{label}</strong>
                <small>{owner}</small>
              </div>
            ))}
          </div>
          <div className="vd-record-strip">
            {[
              ["RCI-00172", "Pick authorization"],
              ["RCI-00210", "Harvest plan"],
              ["RCI-00211", "Assignment"],
              ["RCI-00171", "Contract authority"],
            ].map(([id, label]) => (
              <span key={id}>
                <small>{id}</small>
                <strong>{label}</strong>
              </span>
            ))}
          </div>
        </section>
        <aside className="vd-command-rail">
          <div className="vd-command-exception">
            <StatusMark
              icon="warning"
              label="Capacity exception"
              tone="critical"
            />
            <h2>Winery intake cannot receive this load</h2>
            <p>EVT-00221 · 3:00 PM · harvesting → delayed</p>
          </div>
          <dl>
            <div>
              <dt>Exception owner</dt>
              <dd>Elena Ortiz · ASG-001</dd>
            </div>
            <div>
              <dt>Recovery owner</dt>
              <dd>Nico Ferrer · ASG-020</dd>
            </div>
            <div>
              <dt>Decision</dt>
              <dd>Hand harvest · verified</dd>
            </div>
            <div>
              <dt>Identity record</dt>
              <dd>RCI-00212 · 100 / verified</dd>
            </div>
          </dl>
          <button className="vd-button vd-button-primary" type="button">
            Resolve in-transit recovery
            <Icon name="chevron" />
          </button>
          <button
            className="vd-button vd-button-disabled"
            disabled
            type="button"
          >
            Record arrived · unavailable while delayed
          </button>
          <Link className="vd-history-link" to="/workflows/WF-006">
            <Icon name="history" />
            Inspect attributable history
          </Link>
        </aside>
      </div>
    </div>
  );
}

const identityRows = [
  {
    source: "Superseded predecessor",
    id: "RCI-00505",
    load: "LOAD-WRONG-2",
    block: "WINERY-BLOCK-099",
    match: "0",
    state: "Disputed",
    tone: "critical",
  },
  {
    source: "Field successor",
    id: "RCI-00222",
    load: "LOAD-002-02",
    block: "BLK-002",
    match: "100",
    state: "Corrected · verified",
    tone: "revision",
  },
  {
    source: "Intake / weigh",
    id: "RCI-00224",
    load: "21,050 gross",
    block: "3,040 tare",
    match: "18,010",
    state: "Net lb",
    tone: "neutral",
  },
  {
    source: "Quality",
    id: "RCI-00500",
    load: "63.4°F",
    block: "22.3 Brix",
    match: "—",
    state: "Accepted",
    tone: "positive",
  },
] as const;

function Reconciliation() {
  return (
    <div className="vd-product vd-product-desktop">
      <header className="vd-command-header vd-reconcile-header">
        <div>
          <span>Reconciliation workspace · SCR-037</span>
          <h1>Resolve load identity conflict</h1>
        </div>
        <div className="vd-command-context">
          <StatusMark
            icon="offline"
            label="Intermittent · conflict preserved"
            tone="notice"
          />
          <strong>Aya Tan · ASG-021</strong>
        </div>
      </header>
      <div className="vd-reconcile-grid">
        <aside className="vd-identity-panel">
          <p className="vd-panel-kicker">Stable identity</p>
          <Icon name="block" className="vd-identity-icon" />
          <h2>Alder Crest Bench 02</h2>
          <strong className="vd-large-id">BLK-002</strong>
          <dl>
            <div>
              <dt>Variety</dt>
              <dd>Chardonnay</dd>
            </div>
            <div>
              <dt>Area</dt>
              <dd>14.20 acres</dd>
            </div>
            <div>
              <dt>Aliases</dt>
              <dd>NC-02 · EST-002</dd>
            </div>
            <div>
              <dt>Load</dt>
              <dd>LOAD-002-02</dd>
            </div>
          </dl>
          <StatusMark
            icon="warning"
            label="Identity disputed"
            tone="critical"
          />
        </aside>
        <section className="vd-comparison-panel">
          <div className="vd-card-heading">
            <div>
              <span>Three-source comparison</span>
              <strong>Current and predecessor evidence</strong>
            </div>
            <span className="vd-id">EVT-00280</span>
          </div>
          <div
            className="vd-identity-table"
            role="table"
            aria-label="Identity evidence comparison"
          >
            <div className="vd-table-row vd-table-head" role="row">
              <span role="columnheader">Source / record</span>
              <span role="columnheader">Load / gross</span>
              <span role="columnheader">Block / tare</span>
              <span role="columnheader">Match / net</span>
              <span role="columnheader">Disposition</span>
            </div>
            {identityRows.map((row) => (
              <div className="vd-table-row" role="row" key={row.id}>
                <span role="cell">
                  <strong>{row.source}</strong>
                  <small>{row.id}</small>
                </span>
                <span role="cell">{row.load}</span>
                <span role="cell">{row.block}</span>
                <span className="vd-tabular" role="cell">
                  {row.match}
                </span>
                <span role="cell">
                  <StatusMark
                    icon={
                      row.tone === "critical"
                        ? "warning"
                        : row.tone === "revision"
                          ? "history"
                          : "check"
                    }
                    label={row.state}
                    tone={row.tone}
                  />
                </span>
              </div>
            ))}
          </div>
          <div
            className="vd-lineage"
            id="lineage"
            aria-label="Immutable correction lineage"
          >
            {[
              ["Arrived", "EVT-00279", "complete"],
              ["Disputed", "EVT-00280", "current"],
              ["Correction required", "EVT-00281", "future"],
              ["Corrected", "EVT-00282", "future"],
              ["Reconciled", "EVT-00283", "future"],
            ].map(([label, event, state]) => (
              <div
                className={`vd-lineage-step vd-lineage-${state}`}
                key={event}
              >
                <span>
                  {state === "complete" ? (
                    <Icon name="check" />
                  ) : state === "current" ? (
                    <Icon name="warning" />
                  ) : (
                    <Icon name="clock" />
                  )}
                </span>
                <strong>{label}</strong>
                <small>{event}</small>
              </div>
            ))}
          </div>
        </section>
        <aside className="vd-resolution-panel">
          <p className="vd-panel-kicker">Accountable disposition</p>
          <h2>Contain before correction</h2>
          <p>
            The field successor conflicts with the intake predecessor. Preserve
            both versions; do not accept or settle.
          </p>
          <dl>
            <div>
              <dt>Current owner</dt>
              <dd>Aya Tan · Winery intake</dd>
            </div>
            <div>
              <dt>Recovery owner</dt>
              <dd>Amina Yusuf · Grower relations</dd>
            </div>
            <div>
              <dt>Exception</dt>
              <dd>EXH-0014 · identity conflict</dd>
            </div>
            <div>
              <dt>Authority</dt>
              <dd>Contract scope resolves</dd>
            </div>
          </dl>
          <button className="vd-button vd-button-primary" type="button">
            Record disputed
            <Icon name="chevron" />
          </button>
          <button
            className="vd-button vd-button-disabled"
            disabled
            type="button"
          >
            Accept load · correction required
          </button>
          <button
            className="vd-button vd-button-disabled"
            disabled
            type="button"
          >
            Settle · reconciliation required
          </button>
          <a className="vd-history-link" href="#lineage">
            <Icon name="history" />
            Inspect predecessor and successor
          </a>
        </aside>
      </div>
    </div>
  );
}

export function LighthousePage() {
  const params = useParams<{ direction: string; lighthouse: string }>();
  const [searchParams] = useSearchParams();
  const direction = directionById.get(params.direction ?? "");
  const lighthouse = lighthouseById.get(params.lighthouse ?? "");
  const captureMode = searchParams.get("capture") === "1";

  if (!direction || !lighthouse) {
    return <Navigate replace to="/visual-directions" />;
  }

  return (
    <div
      className={`vd-lighthouse-route vd-theme-${direction.id}${captureMode ? " vd-capture" : ""}`}
      data-direction={direction.id}
      data-lighthouse={lighthouse.id}
    >
      {!captureMode && (
        <nav
          className="vd-review-bar"
          aria-label="Visual direction review controls"
        >
          <Link to="/visual-directions">
            <Icon name="arrow" />
            All directions
          </Link>
          <div>
            <span>{direction.name}</span>
            <strong>{lighthouse.label}</strong>
          </div>
          <Disposition value={direction.disposition} />
        </nav>
      )}
      {lighthouse.id === "field-interruption" ? (
        <FieldInterruption />
      ) : lighthouse.id === "harvest-command" ? (
        <HarvestCommand />
      ) : (
        <Reconciliation />
      )}
    </div>
  );
}
