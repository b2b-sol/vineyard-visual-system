import type { WorkStatus } from "../data/planningDispatch";
import { Icon, type IconName } from "./Icon";

const statusMeta: Record<WorkStatus, { label: string; icon: IconName }> = {
  ready: { label: "Ready", icon: "check" },
  assigned: { label: "Assigned", icon: "crew" },
  "in-progress": { label: "In progress", icon: "arrow" },
  completed: { label: "Completed", icon: "check" },
  partial: { label: "Partial", icon: "info" },
  blocked: { label: "Blocked", icon: "warning" },
  offline: { label: "Offline queued", icon: "offline" },
  stale: { label: "Stale input", icon: "clock" },
  corrected: { label: "Corrected", icon: "history" },
  verified: { label: "Verified", icon: "check" },
  historical: { label: "Historical", icon: "history" },
};

export function StatusSignal({
  status,
  compact = false,
}: {
  status: WorkStatus;
  compact?: boolean;
}) {
  const meta = statusMeta[status];

  return (
    <span
      className={`status-signal status-${status}${compact ? " status-compact" : ""}`}
    >
      <Icon name={meta.icon} />
      <span>{meta.label}</span>
    </span>
  );
}
