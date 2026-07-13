import { Link } from "react-router-dom";
import type { AtlasSection } from "../data/catalog";
import { sections } from "../data/catalog";
import { Icon } from "./Icon";

const readinessCopy = {
  live: "Rendered foundation",
  registered: "Production registry",
  evidence: "Evidence foundation",
};

const relatedByPath: Record<string, string[]> = {
  "/workflows": ["/workflows/WF-001", "/scenarios", "/records"],
  "/screens": ["/screens/SCR-001", "/flows", "/high-fidelity"],
  "/prototypes": ["/workflows/WF-001", "/screens/SCR-001", "/validation"],
  "/design-system": [
    "/design-system/tokens",
    "/design-system/components",
    "/design-system/icons",
  ],
  "/design-system/tokens": [
    "/design-system/components",
    "/high-fidelity",
    "/construction-packets",
  ],
};

export function SectionPage({ section }: { section: AtlasSection }) {
  const relatedPaths =
    relatedByPath[section.path] ??
    sections
      .filter((candidate) => candidate.path !== section.path)
      .slice(0, 3)
      .map((candidate) => candidate.path);

  return (
    <div className="section-page page-frame">
      <header className="page-intro">
        <div>
          <p className="eyebrow">{section.eyebrow}</p>
          <h1>{section.title}</h1>
          <p className="lede">{section.summary}</p>
        </div>
        <div className={`readiness-card readiness-${section.readiness}`}>
          <span className="readiness-icon">
            <Icon name={section.readiness === "live" ? "spark" : "layers"} />
          </span>
          <span>
            <small>{readinessCopy[section.readiness]}</small>
            <strong>{section.count}</strong>
          </span>
        </div>
      </header>

      {section.path === "/workflows" && (
        <Link className="featured-link" to="/workflows/WF-001">
          <span>
            <small>Live workflow · WF-001</small>
            <strong>Seasonal planning + work-order dispatch</strong>
            <span>
              Open the data-driven manager board, responsive crew context, state
              model, and trace chain.
            </span>
          </span>
          <span className="featured-link-action">
            Explore slice <Icon name="chevron" />
          </span>
        </Link>
      )}

      {section.path === "/screens" && (
        <Link className="featured-link" to="/screens/SCR-001">
          <span>
            <small>Live screen · SCR-001</small>
            <strong>Morning dispatch board</strong>
            <span>
              Review the canonical rendered composition at its stable screenshot
              route.
            </span>
          </span>
          <span className="featured-link-action">
            Open screen <Icon name="chevron" />
          </span>
        </Link>
      )}

      <section aria-labelledby="registered-contents" className="section-block">
        <div className="section-heading-row">
          <div>
            <p className="kicker">What this section holds</p>
            <h2 id="registered-contents">Registered contents</h2>
          </div>
          <span className="registry-note">Stable atlas route</span>
        </div>
        <div className="content-card-grid">
          {section.items.map((item, index) => (
            <article className="content-card" key={item.label}>
              <span className="content-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3>{item.label}</h3>
                <p>{item.meta}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="related-sections" className="section-block">
        <div className="section-heading-row">
          <div>
            <p className="kicker">Continue the chain</p>
            <h2 id="related-sections">Related atlas views</h2>
          </div>
        </div>
        <div className="related-links">
          {relatedPaths.map((path) => {
            const related = sections.find(
              (candidate) => candidate.path === path,
            );
            const isWorkflow = path === "/workflows/WF-001";
            const isScreen = path === "/screens/SCR-001";
            return (
              <Link key={path} to={path}>
                <span>
                  {related?.label ??
                    (isWorkflow
                      ? "Planning + dispatch"
                      : isScreen
                        ? "Dispatch screen"
                        : path)}
                </span>
                <Icon name="chevron" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
