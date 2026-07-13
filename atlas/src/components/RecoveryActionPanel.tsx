import { useEffect, useRef, useState } from "react";
import {
  canonicalWorkOrder,
  formatFixtureTime,
  personName,
  personRole,
  recoveryEvents,
  type FixtureStatusEvent,
  type RecoveryState,
  type WorkStatus,
} from "../data/planningDispatch";
import type { RecoveryReplay } from "../hooks/useRecoveryReplay";
import { Icon } from "./Icon";
import { StatusSignal } from "./StatusSignal";

const statusSignal: Record<RecoveryState, WorkStatus> = {
  blocked: "blocked",
  partially_completed: "partial",
  ready_to_resume: "ready",
  completed: "completed",
  verified: "verified",
};

const stateLabels: Record<RecoveryState, string> = {
  blocked: "Blocked — field stop recorded",
  partially_completed: "Partial — remaining rows open",
  ready_to_resume: "Ready — repair confirmed",
  completed: "Completed — awaiting verification",
  verified: "Verified — acreage reconciled",
};

type ActionCardProps = {
  actionId: string;
  label: string;
  description: string;
  event: FixtureStatusEvent;
  enabled: boolean;
  complete: boolean;
  onApply: () => void;
};

function ActionCard({
  actionId,
  label,
  description,
  event,
  enabled,
  complete,
  onApply,
}: ActionCardProps) {
  return (
    <article
      className={`recovery-action${enabled ? " recovery-action-current" : ""}${complete ? " recovery-action-complete" : ""}`}
      data-action-id={actionId}
    >
      <div className="action-sequence">
        {complete ? <Icon name="check" /> : actionId.replace("ACT-", "")}
      </div>
      <div>
        <span className="action-id mono">{actionId}</span>
        <h4>{label}</h4>
        <p>{description}</p>
        <small>
          {personRole(event.actor_person_id)} ·{" "}
          {personName(event.actor_person_id)} · {formatFixtureTime(event.at)}
        </small>
      </div>
      <button
        className={
          enabled ? "button button-primary" : "button button-secondary"
        }
        disabled={!enabled}
        onClick={onApply}
        type="button"
      >
        {complete ? "Recorded" : label}
      </button>
    </article>
  );
}

function AuditHistory({ history }: { history: FixtureStatusEvent[] }) {
  return (
    <ol className="audit-timeline">
      {history
        .slice()
        .reverse()
        .map((event) => (
          <li key={event.id}>
            <span className="audit-marker" />
            <div className="audit-event-heading">
              <span className="mono">{event.id}</span>
              <strong>
                {event.from ?? "New"} <span aria-hidden="true">→</span>{" "}
                {event.to}
              </strong>
              <time dateTime={event.at}>{formatFixtureTime(event.at)}</time>
            </div>
            <p>{event.reason}</p>
            <footer>
              <span>
                {personName(event.actor_person_id)} ·{" "}
                {personRole(event.actor_person_id)}
              </span>
              {event.reported_acres !== undefined && (
                <span>{event.reported_acres} acres reported</span>
              )}
              <span>
                <Icon name="history" /> Immutable fixture event
              </span>
            </footer>
          </li>
        ))}
    </ol>
  );
}

export function RecoveryActionPanel({ replay }: { replay: RecoveryReplay }) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyHeading = useRef<HTMLHeadingElement>(null);
  const partial = recoveryEvents.partial!;
  const release = recoveryEvents.release!;
  const completion = recoveryEvents.completion!;
  const verification = recoveryEvents.verification!;

  useEffect(() => {
    if (historyOpen) {
      historyHeading.current?.focus();
    }
  }, [historyOpen]);

  const indexOf = (state: RecoveryState) =>
    [
      "blocked",
      "partially_completed",
      "ready_to_resume",
      "completed",
      "verified",
    ].indexOf(state);

  return (
    <section
      aria-labelledby="recovery-actions-title"
      className="recovery-console"
      data-current-state={replay.state}
      data-fixture-id="FIX-001"
    >
      <header className="recovery-console-heading">
        <div>
          <p className="kicker">FIX-001 · recovery replay</p>
          <h3 id="recovery-actions-title">Resolve the recorded field stop</h3>
          <p>
            Each control replays the canonical actor, timestamp, acreage, and
            reason. Existing events are append-only.
          </p>
        </div>
        <div className="recovery-current-state">
          <span>Replay state</span>
          <StatusSignal status={statusSignal[replay.state]} />
          <strong>{stateLabels[replay.state]}</strong>
        </div>
      </header>

      <div className="blocker-proof" role="note">
        <Icon name="warning" />
        <div>
          <strong>
            {canonicalWorkOrder.blocker.affected_rows} held · 11.2 of 18.6 acres
            retained
          </strong>
          <p>{canonicalWorkOrder.blocker.reason}</p>
          <small>
            Reported by{" "}
            {personName(
              replay.history.find((event) => event.to === "blocked")!
                .actor_person_id,
            )}{" "}
            · {formatFixtureTime(canonicalWorkOrder.blocker.recorded_at)}
          </small>
        </div>
      </div>

      <div className="recovery-actions-list">
        <ActionCard
          actionId="ACT-001"
          complete={indexOf(replay.state) > indexOf("blocked")}
          description="Retain the safe west-pass acreage and leave rows 28–34 open."
          enabled={replay.state === "blocked"}
          event={partial}
          label="Record partial completion"
          onApply={() => replay.applyEvent(partial, "Partial completion")}
        />
        <ActionCard
          actionId="ACT-002"
          complete={indexOf(replay.state) > indexOf("partially_completed")}
          description="Use the hose replacement and pressure-test evidence to release only the remaining rows."
          enabled={replay.state === "partially_completed"}
          event={release}
          label="Release remaining rows"
          onApply={() => replay.applyEvent(release, "Remaining rows released")}
        />

        {replay.state === "ready_to_resume" && (
          <div className="operator-completion-callout">
            <Icon name="crew" />
            <div>
              <strong>Field completion is ready to apply</strong>
              <p>
                Luis Mendoza reported rows 28–34 complete at 2:36 PM, bringing
                the order to 18.6 acres.
              </p>
            </div>
            <button
              className="button button-secondary"
              data-event-id="EVT-007"
              onClick={() =>
                replay.applyEvent(completion, "Resumed field completion")
              }
              type="button"
            >
              Apply operator report
            </button>
          </div>
        )}

        <ActionCard
          actionId="ACT-003"
          complete={replay.state === "verified"}
          description="Reconcile the 18.6-acre actual against the block target and close with manager attribution."
          enabled={replay.state === "completed"}
          event={verification}
          label="Verify completed work"
          onApply={() =>
            replay.applyEvent(verification, "Completed work verified")
          }
        />
      </div>

      <div className="history-controls">
        <button
          aria-controls="immutable-history"
          aria-expanded={historyOpen}
          className="button button-secondary"
          data-action-id="ACT-004"
          onClick={() => setHistoryOpen((open) => !open)}
          type="button"
        >
          <Icon name="history" />
          {historyOpen ? "Close status history" : "Inspect status history"}
        </button>
        <span>
          <strong>{replay.history.length}</strong> immutable events visible
        </span>
        {replay.state === "verified" && (
          <button className="text-button" onClick={replay.reset} type="button">
            Replay from field stop
          </button>
        )}
      </div>

      {historyOpen && (
        <section
          aria-labelledby="immutable-history-title"
          className="history-drawer"
          id="immutable-history"
        >
          <header>
            <div>
              <p className="kicker">ACT-004 · read-only audit trail</p>
              <h3
                id="immutable-history-title"
                ref={historyHeading}
                tabIndex={-1}
              >
                Immutable status history
              </h3>
            </div>
            <span className="history-lock">
              <Icon name="history" /> Append only
            </span>
          </header>
          <AuditHistory history={replay.history} />
        </section>
      )}
    </section>
  );
}
