import { useState } from "react";
import {
  blockedEvent,
  canonicalBlock,
  canonicalHistory,
  canonicalWorkOrder,
  formatFixtureTime,
  personName,
} from "../data/planningDispatch";
import { Icon } from "./Icon";
import { StatusSignal } from "./StatusSignal";

type SyncState = "idle" | "queued" | "conflict" | "resolved";

export function FieldCrewMode() {
  const [isOnline, setIsOnline] = useState(false);
  const [reportedAcres, setReportedAcres] = useState("11.2");
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [announcement, setAnnouncement] = useState(
    "Field mode opened offline. No changes are queued.",
  );
  const parsedAcres = Number(reportedAcres);
  const acreageValid =
    Number.isFinite(parsedAcres) &&
    parsedAcres >= 0 &&
    parsedAcres <= canonicalWorkOrder.target_acres;

  const queueProgress = () => {
    if (!acreageValid) {
      setAnnouncement(
        `Completed acreage cannot exceed the ${canonicalWorkOrder.target_acres}-acre block target.`,
      );
      return;
    }
    setSyncState("queued");
    setAnnouncement(
      `${reportedAcres} acres queued on this device for ${personName(blockedEvent!.actor_person_id)} at ${formatFixtureTime(blockedEvent!.at)}.`,
    );
  };

  const attemptSync = () => {
    setIsOnline(true);
    setSyncState("conflict");
    setAnnouncement(
      "Sync found a conflict. The server advanced to ready to resume before this queued partial report arrived.",
    );
  };

  const resolveConflict = () => {
    setSyncState("resolved");
    setAnnouncement(
      "Conflict reviewed. The field report is retained as an immutable note and the newer server state remains authoritative.",
    );
  };

  return (
    <section
      aria-labelledby="field-mode-title"
      className="field-mode-panel"
      data-fixture-id="FIX-001"
      data-sync-state={syncState}
    >
      <header className="field-mode-hero">
        <div className="field-connectivity">
          <span className={isOnline ? "signal-online" : "signal-offline"} />
          <strong>{isOnline ? "Signal restored" : "Offline field mode"}</strong>
          <small>
            {isOnline
              ? "Review queued changes before syncing"
              : "Changes stay timestamped on this device"}
          </small>
        </div>
        <span className="mono">FIX-001 · {canonicalWorkOrder.id}</span>
        <h2 id="field-mode-title">{canonicalWorkOrder.title}</h2>
        <p>
          {canonicalBlock.name} · {canonicalBlock.variety} ·{" "}
          {canonicalBlock.acres} acres
        </p>
        <StatusSignal status="blocked" />
      </header>

      <div className="field-stop-card" role="note">
        <Icon name="warning" />
        <div>
          <strong>
            Stop work · rows {canonicalWorkOrder.blocker.affected_rows}
          </strong>
          <p>{canonicalWorkOrder.blocker.reason}</p>
          <small>
            {personName(blockedEvent!.actor_person_id)} ·{" "}
            {formatFixtureTime(blockedEvent!.at)}
          </small>
        </div>
      </div>

      <form
        className="field-progress-form"
        onSubmit={(event) => {
          event.preventDefault();
          queueProgress();
        }}
      >
        <div className="field-form-heading">
          <div>
            <p className="kicker">ACT-001 · local field capture</p>
            <h3>Retain safe completed acreage</h3>
          </div>
          <span>Target {canonicalWorkOrder.target_acres} ac</span>
        </div>
        <label htmlFor="field-completed-acres">Completed acres</label>
        <div className="acreage-input">
          <input
            aria-describedby="acreage-help acreage-error"
            id="field-completed-acres"
            inputMode="decimal"
            max={canonicalWorkOrder.target_acres}
            min="0"
            onChange={(event) => setReportedAcres(event.target.value)}
            step="0.1"
            type="number"
            value={reportedAcres}
          />
          <span>acres</span>
        </div>
        <small id="acreage-help">
          West-pass acreage remains complete; rows 28–34 stay open.
        </small>
        {!acreageValid && (
          <p className="field-error" id="acreage-error" role="alert">
            Completed acreage cannot exceed the{" "}
            {canonicalWorkOrder.target_acres}
            -acre block target.
          </p>
        )}
        <button
          className="button button-primary field-primary-action"
          disabled={!acreageValid || syncState !== "idle"}
          type="submit"
        >
          <Icon name="offline" /> Queue partial completion
        </button>
      </form>

      {syncState !== "idle" && (
        <section aria-label="Offline queue" className="offline-queue-card">
          <header>
            <span>
              <Icon name="offline" />
            </span>
            <div>
              <strong>
                {syncState === "resolved"
                  ? "Field note retained"
                  : "1 field update queued"}
              </strong>
              <small>Captured on device · local timestamp preserved</small>
            </div>
            <span className="queue-count">1</span>
          </header>
          <dl>
            <div>
              <dt>Change</dt>
              <dd>Blocked → partially completed</dd>
            </div>
            <div>
              <dt>Actual</dt>
              <dd>{reportedAcres} of 18.6 acres</dd>
            </div>
            <div>
              <dt>Actor</dt>
              <dd>{personName(blockedEvent!.actor_person_id)}</dd>
            </div>
          </dl>
          {syncState === "queued" && (
            <button
              className="button button-secondary"
              onClick={attemptSync}
              type="button"
            >
              Attempt sync
            </button>
          )}
        </section>
      )}

      {syncState === "conflict" && (
        <section className="field-conflict" role="alert">
          <header>
            <Icon name="warning" />
            <div>
              <p className="kicker">Sync conflict · review required</p>
              <h3>The work order changed elsewhere</h3>
            </div>
          </header>
          <p>
            The server advanced to <strong>Ready — repair confirmed</strong> at
            11:45 AM. Review the newer status before retrying; this device will
            not overwrite it.
          </p>
          <div className="conflict-comparison">
            <span>
              <small>This device</small>
              <strong>Partial · 11.2 ac</strong>
            </span>
            <span>
              <small>Server</small>
              <strong>Ready to resume</strong>
            </span>
          </div>
          <button
            className="button button-primary"
            onClick={resolveConflict}
            type="button"
          >
            Review newer status
          </button>
        </section>
      )}

      {syncState === "resolved" && (
        <div className="field-resolution" role="status">
          <Icon name="check" />
          <span>
            <strong>Conflict resolved without overwrite</strong>
            The field report is an immutable note; the newer server state stays
            authoritative.
          </span>
        </div>
      )}

      <details className="field-history">
        <summary>
          <Icon name="history" /> Inspect fixture history
          <span>{canonicalHistory.length} events</span>
        </summary>
        <ol>
          {canonicalHistory.map((event) => (
            <li key={event.id}>
              <span className="mono">{event.id}</span>
              <strong>{event.to.replaceAll("_", " ")}</strong>
              <small>
                {personName(event.actor_person_id)} ·{" "}
                {formatFixtureTime(event.at)}
              </small>
            </li>
          ))}
        </ol>
      </details>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}
