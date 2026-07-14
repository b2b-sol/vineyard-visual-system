import { Link } from "react-router-dom";
import { navigationGroups, sections } from "../data/catalog";
import { Icon } from "../components/Icon";

const operatingLoops = [
  ["Observe", "See a field, weather, resource, or buyer signal"],
  ["Decide", "Interpret urgency, restrictions, capacity, and impact"],
  ["Coordinate", "Approve, assign, brief, and adjust across roles"],
  ["Prove", "Capture actual work, verify closure, retain history"],
];

export function HomePage() {
  const liveSections = sections.filter(
    (section) => section.readiness === "live",
  );

  return (
    <div className="home-page">
      <header className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow">
            Code-first operational reference · season 2026
          </p>
          <h1>
            From field signal
            <br />
            to defensible record.
          </h1>
          <p className="lede">
            A visual system for the people coordinating commercial vineyard work
            across blocks, crews, organizations, time windows, and imperfect
            information.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/screens/SCR-001">
              Enter daily operations brief <Icon name="chevron" />
            </Link>
            <Link
              className="button button-secondary"
              to="/source-and-confidence"
            >
              Read the evidence model
            </Link>
          </div>
        </div>
        <div
          className="hero-field"
          aria-label="Operational context for Mesa Alta Vineyards"
        >
          <div className="field-topline">
            <span>Tuesday · Jun 18</span>
            <span className="field-weather">62° → 87°F · NW 6 mph</span>
          </div>
          <div className="field-map" aria-hidden="true">
            <span className="row-set row-set-one" />
            <span className="row-set row-set-two" />
            <span className="row-set row-set-three" />
            <span className="map-block block-a">AR·22</span>
            <span className="map-block block-b">AR·14</span>
            <span className="map-block block-c">JD·08</span>
          </div>
          <div className="field-status">
            <div>
              <span className="pulse-dot" />
              <strong>3 crews</strong>
              <small>in motion</small>
            </div>
            <div>
              <Icon name="warning" />
              <strong>2 decisions</strong>
              <small>need manager</small>
            </div>
            <div>
              <Icon name="offline" />
              <strong>3 updates</strong>
              <small>queued offline</small>
            </div>
          </div>
        </div>
      </header>

      <section
        aria-labelledby="coordination-loop-title"
        className="operating-loop"
      >
        <div className="section-heading-row home-section-heading">
          <div>
            <p className="kicker">The recurring coordination loop</p>
            <h2 id="coordination-loop-title">Work is more than a task list</h2>
          </div>
          <p>
            Each consequential action advances, resolves, or inspects a workflow
            state.
          </p>
        </div>
        <ol className="loop-grid">
          {operatingLoops.map(([title, description], index) => (
            <li key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{title}</strong>
              <p>{description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="live-foundation-title"
        className="home-section live-foundation"
      >
        <div className="section-heading-row home-section-heading">
          <div>
            <p className="kicker">Production wave 001</p>
            <h2 id="live-foundation-title">Plan-to-cost operating package</h2>
          </div>
          <Link to="/validation">
            Review validation evidence <Icon name="chevron" />
          </Link>
        </div>
        <div className="live-grid">
          {liveSections.slice(0, 6).map((section) => (
            <Link key={section.path} to={section.path}>
              <small>{section.eyebrow}</small>
              <strong>{section.label}</strong>
              <span>{section.count}</span>
              <Icon name="chevron" />
            </Link>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="atlas-directory-title"
        className="home-section directory-section"
      >
        <div className="section-heading-row home-section-heading">
          <div>
            <p className="kicker">Every required route</p>
            <h2 id="atlas-directory-title">Atlas directory</h2>
          </div>
          <p>
            Stable locations keep screenshots, traceability, and future
            construction packets linkable.
          </p>
        </div>
        <div className="directory-grid">
          {navigationGroups.map((group) => (
            <div className="directory-group" key={group.label}>
              <h3>{group.label}</h3>
              {group.items.map((item) => (
                <Link key={item.path} to={item.path}>
                  <span>{item.label}</span>
                  <Icon name="chevron" />
                </Link>
              ))}
            </div>
          ))}
          <div className="directory-group">
            <h3>Design system detail</h3>
            {sections
              .filter((section) => section.path.startsWith("/design-system/"))
              .map((section) => (
                <Link key={section.path} to={section.path}>
                  <span>{section.label}</span>
                  <Icon name="chevron" />
                </Link>
              ))}
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <span>Vineyard Visual Atlas</span>
        <p>
          Canonical sources remain structured, editable, versioned, and ready
          for future Figma migration.
        </p>
        <span className="mono">b2b-sol / vineyard-visual-system</span>
      </footer>
    </div>
  );
}
