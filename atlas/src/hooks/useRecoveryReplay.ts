import { useState } from "react";
import {
  formatFixtureTime,
  personName,
  replayStartingHistory,
  type FixtureStatusEvent,
  type RecoveryState,
} from "../data/planningDispatch";

const stateLabels: Record<RecoveryState, string> = {
  blocked: "Blocked — field stop recorded",
  partially_completed: "Partial — remaining rows open",
  ready_to_resume: "Ready — repair confirmed",
  completed: "Completed — awaiting verification",
  verified: "Verified — acreage reconciled",
};

export type RecoveryReplay = {
  state: RecoveryState;
  history: FixtureStatusEvent[];
  announcement: string;
  applyEvent: (event: FixtureStatusEvent, actionLabel: string) => void;
  reset: () => void;
};

export function useRecoveryReplay(): RecoveryReplay {
  const [state, setState] = useState<RecoveryState>("blocked");
  const [history, setHistory] = useState<FixtureStatusEvent[]>(
    replayStartingHistory,
  );
  const [announcement, setAnnouncement] = useState(
    "Fixture replay is at the blocked checkpoint.",
  );

  const applyEvent = (event: FixtureStatusEvent, actionLabel: string) => {
    if (event.from !== state) {
      setAnnouncement(
        `${actionLabel} is unavailable while the work order is ${stateLabels[state]}.`,
      );
      return;
    }

    setHistory((current) =>
      current.some((item) => item.id === event.id)
        ? current
        : [...current, event],
    );
    setState(event.to as RecoveryState);
    setAnnouncement(
      `${actionLabel} recorded by ${personName(event.actor_person_id)} at ${formatFixtureTime(event.at)}. ${stateLabels[event.to as RecoveryState]}.`,
    );
  };

  const reset = () => {
    setState("blocked");
    setHistory(replayStartingHistory);
    setAnnouncement("Fixture replay reset to the blocked checkpoint.");
  };

  return { state, history, announcement, applyEvent, reset };
}
