import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { OperationalAppShell } from "../components/production/PublicComponents";
import { PublicComponent } from "../components/production/PublicComponent";
import { Wave002TaskSurface } from "../components/production/Wave002TaskSurface";
import type { CanonicalAction } from "../data/canonical";
import {
  fixtureIndex,
  getStateContracts,
  isWaveScreenId,
  WAVE_001_SCREEN_IDS,
  WAVE_002_SCREEN_IDS,
} from "../data/canonical";
import {
  actionExplanation,
  canRolePerform,
  createScreenViewModel,
  formatMoment,
  presentationFor,
  visibleComponentIds,
} from "../data/screenViewModel";
import { resolveScreenState } from "../data/screenRecipes";
import { NotFoundPage } from "./NotFoundPage";

function WorkflowStrip({
  workflowId,
  currentScreenId,
}: {
  workflowId: string;
  currentScreenId: string;
}) {
  const screenIds = {
    "WF-001": WAVE_001_SCREEN_IDS.slice(0, 6),
    "WF-002": WAVE_002_SCREEN_IDS.slice(0, 6),
    "WF-003": WAVE_002_SCREEN_IDS.slice(6),
    "WF-007": WAVE_001_SCREEN_IDS.slice(6),
  }[workflowId];
  if (!screenIds) return null;
  return (
    <nav
      aria-label={`${workflowId} workflow screen strip`}
      className="wave-flow-strip"
    >
      {screenIds.map((screenId, index) => (
        <Link
          aria-current={screenId === currentScreenId ? "page" : undefined}
          key={screenId}
          to={`/screens/${screenId}`}
        >
          <span>{String(index + 1).padStart(2, "0")}</span>
          <strong>{screenId}</strong>
        </Link>
      ))}
    </nav>
  );
}

export function ProductionScreenPage() {
  const { screenId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeRoleId, setActiveRoleId] = useState("");
  const [actionMessage, setActionMessage] = useState<string>();

  if (!isWaveScreenId(screenId)) return <NotFoundPage />;

  const resolved = resolveScreenState(
    screenId,
    searchParams.get("state"),
    searchParams.get("fixture"),
  );
  const model = createScreenViewModel(resolved);
  const defaultRoleId =
    model.screen.primary_role_ids.find((roleId) =>
      model.screen.actions.some((action) =>
        canRolePerform(action, roleId, model),
      ),
    ) ?? model.screen.primary_role_ids[0];
  const currentRoleId = activeRoleId || defaultRoleId;
  const presentation = presentationFor(model.screen.id, model.reviewState);
  const stateContracts = getStateContracts(model.screen.id);
  const visibleComponents = visibleComponentIds(model);
  const enabledAction = model.screen.actions.find((action) =>
    canRolePerform(action, currentRoleId, model),
  );

  const componentProps = {
    model,
    activeRoleId: currentRoleId,
    setActiveRoleId,
    actionMessage,
    onAction: (action: CanonicalAction) => {
      const consequence = action.transition
        ? `${action.transition.from ?? "entry"} → ${action.transition.to}`
        : "immutable history opened";
      setActionMessage(
        `${action.id} previewed: ${consequence}. No canonical fixture data was mutated.`,
      );
    },
  };

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set(key, value);
    setSearchParams(next);
    setActionMessage(undefined);
  };

  const metrics = [
    {
      label: model.recipe.highlights[0],
      value: (model.stateContract.canonical_state ?? "entry").replaceAll(
        "_",
        " ",
      ),
      note: model.activeEvent?.id ?? "model-only state",
    },
    {
      label: model.recipe.highlights[1],
      value: model.actors[0]?.personName ?? "Unresolved",
      note: model.actors[0]?.roleId ?? "No role",
    },
    {
      label: model.recipe.highlights[2],
      value: `${model.records.length} records`,
      note: `${model.events.length} attributable events`,
    },
  ];

  return (
    <OperationalAppShell {...componentProps}>
      <article
        className={`wave-screen wave-layout-${model.recipe.layout} wave-state-${model.reviewState}`}
        data-platform={model.screen.platform}
        data-requirement-ids={model.screen.requirement_ids.join(" ")}
      >
        <header className="wave-hero">
          <div className="wave-breadcrumbs">
            <Link to="/screens">Screens</Link>
            <span aria-hidden="true">/</span>
            <span>{model.screen.workflow_ids[0]}</span>
            <span aria-hidden="true">/</span>
            <strong>{model.screen.id}</strong>
          </div>
          <div className="wave-hero-grid">
            <div>
              <p className="wave-eyebrow">{model.recipe.eyebrow}</p>
              <h1>{model.recipe.headline}</h1>
              <p className="wave-lede">{model.screen.purpose}</p>
            </div>
            <aside
              className="wave-question-card"
              aria-label="Primary operating decision"
            >
              <span>Operating question</span>
              <strong>{model.recipe.operatingQuestion}</strong>
              <small>{model.screen.primary_decision}</small>
            </aside>
          </div>
          <div
            className="wave-trace-bar"
            aria-label="Scrollable canonical trace context"
            tabIndex={0}
          >
            <span data-workflow-id={model.screen.workflow_ids[0]}>
              {model.screen.workflow_ids[0]}
            </span>
            <span data-scenario-id={model.scenario?.id}>
              {model.scenario?.id ?? "No operational scenario"}
            </span>
            <span data-fixture-id={model.fixture.id}>
              {model.fixture.id} {model.modelOnly ? "· context only" : ""}
            </span>
            <span data-event-id={model.activeEvent?.id}>
              {model.activeEvent?.id ?? "No operational event"}
            </span>
            <span data-transition-id={model.activeEvent?.transition_id}>
              {model.activeEvent?.transition_id ?? "Model-only branch"}
            </span>
            {(model.activeEvent?.decision_ids ?? []).map((decisionId) => (
              <span data-decision-id={decisionId} key={decisionId}>
                {decisionId}
              </span>
            ))}
          </div>
        </header>

        {model.screen.platform === "mobile" && (
          <section
            aria-label="Field action now"
            className="wave-mobile-action-dock"
          >
            <div>
              <span>
                {model.identity.block?.current_name ?? model.fixture.id} ·{" "}
                {model.activeEvent?.connectivity.mode ?? "modeled state"}
              </span>
              <strong>
                {enabledAction?.label ?? "No permitted field action"}
              </strong>
              <small>
                {enabledAction
                  ? actionExplanation(enabledAction, currentRoleId, model)
                  : model.stateContract.recovery}
              </small>
            </div>
            <button
              data-action-id={enabledAction?.id}
              data-transition-id={enabledAction?.transition?.transition_id}
              disabled={!enabledAction}
              onClick={() =>
                enabledAction && componentProps.onAction(enabledAction)
              }
              type="button"
            >
              {enabledAction?.kind === "inspect" ? "Inspect now" : "Act now"}
            </button>
          </section>
        )}

        <section
          aria-labelledby={`${model.screen.id}-state-title`}
          className={`wave-state-banner wave-tone-${presentation.tone}`}
          data-state-kind={model.reviewState}
        >
          <span className="wave-state-symbol" aria-hidden="true">
            {presentation.symbol}
          </span>
          <div>
            <p>
              {model.modelOnly ? "model-only " : ""}
              {model.reviewState} presentation · {model.stateContract.id}
            </p>
            <h2 id={`${model.screen.id}-state-title`}>
              {(model.stateContract.canonical_state ?? "entry").replaceAll(
                "_",
                " ",
              )}{" "}
              · {presentation.title}
            </h2>
            <span>{presentation.detail}</span>
          </div>
          <dl>
            <div>
              <dt>Fixture</dt>
              <dd>{model.fixture.id}</dd>
            </div>
            <div>
              <dt>Effective</dt>
              <dd>
                {model.activeEvent
                  ? formatMoment(model.activeEvent.occurred_at)
                  : "Not operationally asserted"}
              </dd>
            </div>
            <div>
              <dt>Mode</dt>
              <dd>
                {model.activeEvent?.connectivity.mode ?? "presentation model"}
              </dd>
            </div>
          </dl>
          {model.modelOnly && (
            <strong className="wave-model-badge">
              Model-only {model.stateContract.source_ref.type} branch · no event
              asserted
            </strong>
          )}
        </section>

        {model.fixtureOverrideRejected && (
          <p className="wave-boundary-warning" role="status">
            The requested fixture is incompatible with {model.stateContract.id}
            and was not used as state evidence.
          </p>
        )}

        <Wave002TaskSurface model={model} />

        <div
          className="wave-component-grid"
          data-visible-component-count={visibleComponents.length}
        >
          {visibleComponents.map((componentId) => (
            <PublicComponent
              {...componentProps}
              componentId={componentId}
              key={componentId}
            />
          ))}
        </div>

        <section
          aria-label="Review state and fixture controls"
          className="wave-review-controls"
        >
          <label>
            Review state or canonical contract
            <select
              onChange={(event) => setParam("state", event.target.value)}
              value={model.stateContract.id}
            >
              <optgroup label="Required review states">
                {model.screen.states.map((state) => (
                  <option key={state.id} value={state.id}>
                    {state.id}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Canonical state contracts">
                {stateContracts.map((state) => (
                  <option key={state.id} value={state.id}>
                    {state.id} · {state.kind} ·{" "}
                    {state.canonical_state ?? "entry"}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          <label>
            Connected synthetic fixture
            <select
              onChange={(event) => setParam("fixture", event.target.value)}
              value={model.fixture.id}
            >
              {model.screen.fixture_ids.map((fixtureId) => (
                <option key={fixtureId} value={fixtureId}>
                  {fixtureId} · {fixtureIndex.get(fixtureId)?.category}
                </option>
              ))}
            </select>
          </label>
          <Link
            className="wave-prototype-link"
            to={`/prototypes/${
              {
                "WF-001": "FLW-001",
                "WF-002": "FLW-002",
                "WF-003": "FLW-003",
                "WF-007": "FLW-007",
              }[model.screen.workflow_ids[0]] ?? "FLW-001"
            }`}
          >
            Open full replay →
          </Link>
        </section>

        <WorkflowStrip
          currentScreenId={model.screen.id}
          workflowId={model.screen.workflow_ids[0]}
        />

        <section
          aria-label="Responsibility summary"
          className="wave-metric-grid"
        >
          {metrics.map((metric) => (
            <article key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>{metric.note}</small>
            </article>
          ))}
        </section>

        {model.reviewState === "loading" && (
          <div aria-live="polite" className="wave-loading-note" role="status">
            <span aria-hidden="true" />
            Linked decision and evidence records are loading. Stable scope,
            responsibility, and current workflow state remain available.
          </div>
        )}

        <footer className="wave-screen-footer">
          <div>
            <strong>
              {model.screen.id} · {model.screen.name}
            </strong>
            <span>
              {model.scenario
                ? `${model.scenario.id} · ${model.scenario.title}`
                : `${model.stateContract.id} · model-only branch`}
            </span>
          </div>
          <div>
            <span>Canonical source</span>
            <strong>
              {model.fixture.workflow_instance_id} · {model.fixture.id}
            </strong>
          </div>
        </footer>
      </article>
    </OperationalAppShell>
  );
}
