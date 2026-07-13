import { useEffect, useRef, useState } from "react";
import {
  canonicalWorkOrder,
  formatFixtureTime,
  partialEvent,
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
  assigned: "assigned",
  acknowledged: "acknowledged",
  in_progress: "in-progress",
  completed: "completed",
  verified: "verified",
};

const stateLabels: Record<RecoveryState, string> = {
  blocked: "Blocked — equipment unavailable",
  assigned: "Assigned — repair confirmed",
  acknowledged: "Acknowledged — instructions confirmed",
  in_progress: "In progress — remaining rows underway",
  completed: "Completed — awaiting verification",
  verified: "Verified — acreage reconciled",
};

type ActionCardProps = {
  actionId: string;
  sequence: number;
  label: string;
  description: string;
  event: FixtureStatusEvent;
  enabled: boolean;
  complete: boolean;
  onApply: () => void;
};

function ActionCard({
  actionId,
  sequence,
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
        {complete ? <Icon name="check" /> : sequence}
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
  const redispatch = recoveryEvents.redispatch!;
  const acknowledgement = recoveryEvents.acknowledgement!;
  const restart = recoveryEvents.restart!;
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
      "assigned",
      "acknowledged",
      "in_progress",
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
            Partial reported by {personName(partialEvent!.actor_person_id)} ·{" "}
            {formatFixtureTime(partialEvent!.at)} · blocker recorded{" "}
            {formatFixtureTime(canonicalWorkOrder.blocker.recorded_at)}
          </small>
        </div>
      </div>

      <div className="recovery-actions-list">
        <ActionCard
          actionId="ACT-002"
          complete={indexOf(replay.state) > indexOf("blocked")}
          description="Use the hose replacement and pressure-test evidence to redispatch only rows 28–34."
          enabled={replay.state === "blocked"}
          event={redispatch}
          label="Release repaired work"
          onApply={() =>
            replay.applyEvent(redispatch, "Repaired work released")
          }
          sequence={1}
        />
        <ActionCard
          actionId="ACT-005"
          complete={indexOf(replay.state) > indexOf("assigned")}
          description="Confirm that the repaired mower, remaining rows, timing, and field constraints are understood."
          enabled={replay.state === "assigned"}
          event={acknowledgement}
          label="Acknowledge remaining scope"
          onApply={() =>
            replay.applyEvent(acknowledgement, "Remaining scope acknowledged")
          }
          sequence={2}
        />
        <ActionCard
          actionId="ACT-006"
          complete={indexOf(replay.state) > indexOf("acknowledged")}
          description="Start the acknowledged remaining-scope assignment while retaining the original partial and blocker events."
          enabled={replay.state === "acknowledged"}
          event={restart}
          label="Resume remaining rows"
          onApply={() => replay.applyEvent(restart, "Remaining rows resumed")}
          sequence={3}
        />
        <ActionCard
          actionId="ACT-007"
          complete={indexOf(replay.state) > indexOf("in_progress")}
          description="Report rows 28–34 complete and bring the attributed actual to 18.6 acres."
          enabled={replay.state === "in_progress"}
          event={completion}
          label="Complete remaining rows"
          onApply={() =>
            replay.applyEvent(completion, "Remaining rows completed")
          }
          sequence={4}
        />

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
          sequence={5}
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
