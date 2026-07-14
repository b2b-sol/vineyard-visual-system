export type RequirementTransition = {
  id: string;
  from: string | null;
  to: string;
  kind: string;
  owner: string;
  trigger: string;
  decision_ids: string[];
  exception_ids: string[];
  record_reads: string[];
  record_writes: string[];
};

const includesAny = (value: string, candidates: string[]) =>
  candidates.some((candidate) => value.includes(candidate));

const affinity = (
  profileIndex: number,
  transition: RequirementTransition,
  workflowId: string,
  terminalState: string,
) => {
  const text = [
    transition.from ?? "entry",
    transition.to,
    transition.kind,
    transition.owner,
    transition.trigger,
  ]
    .join(" ")
    .toLowerCase();
  const terminal = transition.to === terminalState;
  const nonIdeal = includesAny(text, [
    "blocked",
    "delayed",
    "interrupted",
    "paused",
    "disputed",
    "rejected",
    "noncompliant",
    "withheld",
    "unavailable",
    "exception",
    "partial",
  ]);

  switch (profileIndex) {
    case 0:
      return (
        transition.decision_ids.length * 8 +
        (includesAny(transition.kind, ["recommendation", "approval"]) ? 8 : 0) +
        (includesAny(text, ["assess", "decide", "review", "authorize"]) ? 3 : 0)
      );
    case 1:
      return (
        (includesAny(transition.kind, [
          "assignment",
          "acknowledgement",
          "execution",
          "observation",
        ])
          ? 9
          : 2) + (terminal ? 0 : 2)
      );
    case 2:
      return (
        (transition.from === null ? 8 : 0) +
        (transition.kind === "observation" ? 7 : 0) +
        (includesAny(text, [
          "identity",
          "matching",
          "source",
          "scope",
          "sample",
          "measurement",
          "availability",
          "collect",
          "mapping",
        ])
          ? 8
          : 0)
      );
    case 3:
      return (
        transition.exception_ids.length * 10 +
        (includesAny(transition.kind, ["exception", "recovery"]) ? 12 : 0) +
        (nonIdeal ? 7 : 0)
      );
    case 4:
      return (
        (transition.kind === "inspection" ? 12 : 0) +
        (includesAny(text, [
          "history",
          "historical",
          "archive",
          "audit",
          "reconciled",
          "settled",
          "verified",
        ])
          ? 8
          : 0) +
        (terminal ? 4 : 0)
      );
    case 5:
      return (
        (includesAny(transition.kind, [
          "observation",
          "acknowledgement",
          "execution",
        ])
          ? 10
          : 0) +
        (transition.decision_ids.length === 0 ? 3 : 0) +
        (!terminal && !nonIdeal ? 2 : 0)
      );
    case 6:
      return (
        (includesAny(transition.owner.toLowerCase(), [
          "contractor",
          "grower",
          "winery",
          "transport",
          "auditor",
          "certifier",
        ])
          ? 12
          : 0) +
        (includesAny(text, [
          "contract",
          "grower",
          "winery",
          "processor",
          "delivery",
          "intake",
          "submission",
          "audit",
          "certification",
          "settlement",
        ])
          ? 8
          : 0) +
        (new Set(["WF-004", "WF-005", "WF-006", "WF-009", "WF-010"]).has(
          workflowId,
        )
          ? 3
          : 0)
      );
    case 7:
      return (
        (new Set(["WF-002", "WF-005", "WF-010"]).has(workflowId) ? 5 : 0) +
        (includesAny(transition.kind, [
          "approval",
          "verification",
          "inspection",
        ])
          ? 9
          : 0) +
        (includesAny(text, [
          "compliance",
          "restriction",
          "release",
          "accepted",
          "rejected",
          "submitted",
          "certified",
          "audit",
        ])
          ? 8
          : 0)
      );
    case 8:
      return (
        (includesAny(transition.kind, ["correction", "supersession"])
          ? 16
          : 0) +
        (includesAny(text, [
          "correction",
          "corrected",
          "supersed",
          "revision",
          "disputed",
          "amend",
        ])
          ? 10
          : 0) +
        (transition.record_reads.length > 0 ||
        transition.record_writes.length > 0
          ? 2
          : 0)
      );
    case 9:
      return (
        (terminal ? 16 : 0) +
        (includesAny(transition.kind, [
          "completion",
          "verification",
          "reconciliation",
        ])
          ? 10
          : 0) +
        (includesAny(text, [
          "complete",
          "verified",
          "reconciled",
          "settled",
          "certified",
          "archived",
          "cost_allocated",
        ])
          ? 8
          : 0)
      );
    default:
      throw new Error(`Unknown requirement profile ${profileIndex}`);
  }
};

export const allocateRequirementTransitions = <T extends RequirementTransition>(
  transitions: T[],
  workflowId: string,
  terminalState: string,
): T[][] => {
  if (transitions.length === 0)
    throw new Error(`${workflowId}: no realized transitions`);
  const allocations = Array.from({ length: 10 }, () => [] as T[]);
  const specificityOrder = [8, 3, 9, 0, 7, 6, 5, 4, 2, 1];

  for (const profileIndex of specificityOrder) {
    const candidate = [...transitions].sort(
      (left, right) =>
        affinity(profileIndex, right, workflowId, terminalState) -
          affinity(profileIndex, left, workflowId, terminalState) ||
        transitions.indexOf(left) - transitions.indexOf(right),
    )[0];
    allocations[profileIndex].push(candidate);
  }

  const alreadyAllocated = new Set(allocations.flat());
  for (const transition of transitions.filter(
    (candidate) => !alreadyAllocated.has(candidate),
  )) {
    const profileIndex = Array.from({ length: 10 }, (_, index) => index).sort(
      (left, right) =>
        affinity(right, transition, workflowId, terminalState) -
          affinity(left, transition, workflowId, terminalState) ||
        specificityOrder.indexOf(left) - specificityOrder.indexOf(right),
    )[0];
    allocations[profileIndex].push(transition);
  }

  return allocations;
};
