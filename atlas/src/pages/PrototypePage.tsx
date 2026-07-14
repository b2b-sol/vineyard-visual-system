import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { flowIndex } from "../data/canonical";
import {
  buildPrototypeSteps,
  replayAcceptedPrefix,
  validatePrototypeAppend,
  type PrototypeAppendResult,
  type PrototypeStep,
  type ReplayBoundary,
} from "../data/prototypes";
import { formatMoment } from "../data/screenViewModel";
import { NotFoundPage } from "./NotFoundPage";

function PrototypeLane({
  lane,
  steps,
  acceptedEventIds,
}: {
  lane: string;
  steps: PrototypeStep[];
  acceptedEventIds: Set<string>;
}) {
  return (
    <section aria-labelledby={`${lane}-lane-title`} className="prototype-lane">
      <header>
        <span>{lane}</span>
        <h2 id={`${lane}-lane-title`}>
          {{
            "WF-001": "Plan → verify",
            "WF-002": "Observe → protect",
            "WF-003": "Demand → verify",
            "WF-007": "Crew → cost",
          }[lane] ?? "Accountable workflow"}
        </h2>
        <small>{steps[0]?.fixture.id} · exact fixture chronology</small>
      </header>
      <ol>
        {steps.map((step) => {
          const allAccepted = acceptedEventIds.has(step.event.id);
          return (
            <li
              className={allAccepted ? "is-accepted" : ""}
              data-action-id={step.actionId}
              data-event-id={step.event.id}
              data-fixture-id={step.fixture.id}
              data-transition-id={step.event.transition_id}
              key={step.event.id}
            >
              <span className="prototype-step-marker" aria-hidden="true">
                {allAccepted ? "✓" : "○"}
              </span>
              <div>
                <span className="wave-id-pill">{step.event.id}</span>
                <strong>
                  {step.event.from_state ?? "entry"} → {step.event.to_state}
                </strong>
                <p>{step.event.reason}</p>
                <small>
                  {step.actorRoleId} · {formatMoment(step.event.occurred_at)}
                </small>
              </div>
              {step.screenId && (
                <Link
                  to={`/screens/${step.screenId}?fixture=${step.fixture.id}&state=${step.stateContractId ?? "normal"}`}
                >
                  {step.screenId} ↗
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function PrototypePage() {
  const { flowId = "" } = useParams();
  const flow = flowIndex.get(flowId);
  const steps = useMemo(() => buildPrototypeSteps(flowId), [flowId]);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [comparisonProgress, setComparisonProgress] = useState<
    Record<string, number>
  >({ "WF-001": 0, "WF-007": 0 });
  const [boundary, setBoundary] = useState<ReplayBoundary>("canonical");
  const [lastResult, setLastResult] = useState<PrototypeAppendResult>();

  if (
    !flow ||
    !["FLW-001", "FLW-002", "FLW-003", "FLW-007", "FLW-015"].includes(flowId)
  ) {
    return <NotFoundPage />;
  }

  const current = acceptedCount ? steps[acceptedCount - 1] : undefined;
  const lanes = [...new Set(steps.map((step) => step.lane))];
  const isComparison = flowId === "FLW-015";
  const comparisonAccepted = Object.values(comparisonProgress).reduce(
    (total, count) => total + count,
    0,
  );
  const acceptedEventIds = new Set(
    isComparison
      ? lanes.flatMap((lane) =>
          steps
            .filter((step) => step.lane === lane)
            .slice(0, comparisonProgress[lane] ?? 0)
            .map((step) => step.event.id),
        )
      : steps.slice(0, acceptedCount).map((step) => step.event.id),
  );

  return (
    <article
      className={`prototype-page page-frame ${isComparison ? "prototype-comparison" : ""}`}
      data-flow-id={flowId}
      data-scenario-id={flow.scenario_ids[0]}
    >
      <header className="prototype-hero">
        <div className="wave-breadcrumbs">
          <Link to="/workflows">Workflows</Link>
          <span>/</span>
          <strong>{flowId}</strong>
        </div>
        <p className="wave-eyebrow">
          {isComparison
            ? "Linked evidence comparison"
            : "Deterministic event replay"}
        </p>
        <h1>{flow.title}</h1>
        <p className="wave-lede">
          {isComparison
            ? "Two independently ordered workflow paths are compared only through declared record links; their chronology is never flattened."
            : "Each control reveals one already-canonical fixture event. Replay never mutates source data or skips authority boundaries."}
        </p>
        <div
          aria-label="Scrollable prototype trace context"
          className="wave-trace-bar"
          tabIndex={0}
        >
          <span>{flowId}</span>
          {flow.workflow_ids.map((id) => (
            <span data-workflow-id={id} key={id}>
              {id}
            </span>
          ))}
          {flow.fixture_ids.map((id) => (
            <span data-fixture-id={id} key={id}>
              {id}
            </span>
          ))}
          {flow.record_link_ids.map((id) => (
            <span data-record-link-id={id} key={id}>
              {id}
            </span>
          ))}
        </div>
      </header>

      <section
        aria-label="Prototype replay controls"
        className="prototype-controls"
      >
        <div>
          <span>Accepted fixture events</span>
          <strong>
            {isComparison ? comparisonAccepted : acceptedCount} / {steps.length}
          </strong>
          <small>
            {current
              ? `${current.event.id} · ${current.event.to_state}`
              : "Replay is at the immutable fixture boundary"}
          </small>
        </div>
        <label className="prototype-boundary-control">
          Replay boundary
          <select
            onChange={(event) =>
              setBoundary(event.target.value as ReplayBoundary)
            }
            value={boundary}
          >
            <option value="canonical">Canonical actor and current base</option>
            <option value="wrong_actor">Wrong actor · default deny</option>
            <option value="stale_base">Stale base · refresh required</option>
            <option value="offline">Offline · sync policy applies</option>
            <option value="conflict">Conflict · preserve both events</option>
          </select>
        </label>
        <div>
          <button
            className="wave-secondary-control"
            disabled={
              isComparison ? comparisonAccepted === 0 : acceptedCount === 0
            }
            onClick={() => {
              setAcceptedCount(0);
              setComparisonProgress({ "WF-001": 0, "WF-007": 0 });
              setLastResult(undefined);
            }}
            type="button"
          >
            Reset replay
          </button>
          {isComparison ? (
            lanes.map((lane) => {
              const laneSteps = steps.filter((step) => step.lane === lane);
              const next = laneSteps[comparisonProgress[lane] ?? 0];
              return (
                <button
                  className="wave-primary-control"
                  data-action-id={next?.actionId}
                  data-event-id={next?.event.id}
                  data-transition-id={next?.event.transition_id}
                  disabled={(comparisonProgress[lane] ?? 0) >= laneSteps.length}
                  key={lane}
                  onClick={() => {
                    if (!next) return;
                    const accepted = comparisonProgress[lane] ?? 0;
                    const replay = replayAcceptedPrefix(laneSteps, accepted);
                    const result = validatePrototypeAppend(
                      next,
                      replay.state,
                      boundary,
                    );
                    setLastResult(result);
                    if (result.allowed) {
                      setComparisonProgress((progress) => ({
                        ...progress,
                        [lane]: Math.min(accepted + 1, laneSteps.length),
                      }));
                    }
                  }}
                  type="button"
                >
                  Validate &amp; append next {lane} event
                </button>
              );
            })
          ) : (
            <button
              className="wave-primary-control"
              data-action-id={steps[acceptedCount]?.actionId}
              data-event-id={steps[acceptedCount]?.event.id}
              data-transition-id={steps[acceptedCount]?.event.transition_id}
              disabled={acceptedCount >= steps.length}
              onClick={() => {
                const next = steps[acceptedCount];
                if (!next) return;
                const replay = replayAcceptedPrefix(steps, acceptedCount);
                const result = validatePrototypeAppend(
                  next,
                  replay.state,
                  boundary,
                );
                setLastResult(result);
                if (result.allowed) {
                  setAcceptedCount((count) =>
                    Math.min(count + 1, steps.length),
                  );
                }
              }}
              type="button"
            >
              {acceptedCount >= steps.length
                ? "Replay complete"
                : "Validate & append next event"}
            </button>
          )}
        </div>
        <p aria-live="polite" className="sr-only">
          {current
            ? `${current.event.id} accepted in replay.`
            : "Replay reset."}
        </p>
      </section>

      {lastResult && (
        <section
          aria-live="polite"
          className={`prototype-validation is-${lastResult.status}`}
          data-replay-status={lastResult.status}
        >
          <div>
            <span>{lastResult.status}</span>
            <strong>{lastResult.precondition}</strong>
            <p>{lastResult.reason}</p>
          </div>
          <dl>
            <div>
              <dt>Actor</dt>
              <dd>
                {lastResult.actorAssignmentId} · {lastResult.actorRoleId}
              </dd>
            </div>
            <div>
              <dt>Evidence</dt>
              <dd>
                {lastResult.evidenceRecordIds.join(", ") || "no record inputs"}
              </dd>
            </div>
            <div>
              <dt>Notification</dt>
              <dd>{lastResult.notificationIds.join(", ") || "none"}</dd>
            </div>
            <div>
              <dt>Write policy</dt>
              <dd>append only · source fixture unchanged</dd>
            </div>
          </dl>
        </section>
      )}

      {isComparison && (
        <aside className="prototype-boundary-note">
          <strong>Comparison boundary</strong>
          <span>
            WF-001 and WF-007 retain independent clocks. Only{" "}
            {flow.record_link_ids.join(", ")} connect their evidence.
          </span>
        </aside>
      )}

      <div className="prototype-lanes">
        {lanes.map((lane) => (
          <PrototypeLane
            acceptedEventIds={acceptedEventIds}
            key={lane}
            lane={lane}
            steps={steps.filter((step) => step.lane === lane)}
          />
        ))}
      </div>
    </article>
  );
}
