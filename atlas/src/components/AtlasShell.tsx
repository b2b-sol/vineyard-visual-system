import { NavLink, Outlet, useLocation } from "react-router-dom";
import { navigationGroups } from "../data/catalog";
import { Icon } from "./Icon";

function Brand() {
  return (
    <NavLink aria-label="Vineyard Visual Atlas home" className="brand" to="/">
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span>
        <strong>Vineyard</strong>
        <small>Visual Atlas · 2026</small>
      </span>
    </NavLink>
  );
}

function Navigation() {
  return (
    <nav aria-label="Atlas sections" className="atlas-navigation">
      {navigationGroups.map((group) => (
        <div className="nav-group" key={group.label}>
          <p>{group.label}</p>
          {group.items.map((item) => (
            <NavLink
              className={({ isActive }) =>
                isActive ? "nav-link nav-link-active" : "nav-link"
              }
              key={item.path}
              to={item.path}
            >
              <span>{item.label}</span>
              <Icon name="chevron" />
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}

export function AtlasShell() {
  const location = useLocation();

  return (
    <div className="atlas-shell">
      <a className="skip-link" href="#atlas-content">
        Skip to atlas content
      </a>
      <aside className="sidebar">
        <Brand />
        <Navigation />
        <div className="sidebar-foot">
          <span className="signal-dot" />
          <span>
            <strong>Factory foundation</strong>
            <small>Bot-authenticated build</small>
          </span>
        </div>
      </aside>
      <div className="mobile-header">
        <Brand />
        <details className="mobile-menu">
          <summary aria-label="Open atlas navigation">
            <span>Browse</span>
            <Icon name="layers" />
          </summary>
          <Navigation />
        </details>
      </div>
      <main id="atlas-content" tabIndex={-1}>
        <div className="route-key" aria-hidden="true">
          {location.pathname}
        </div>
        <Outlet />
      </main>
    </div>
  );
}
