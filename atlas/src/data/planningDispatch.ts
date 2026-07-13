import fixtureSource from "../../../data/walking-slice.json";

export type WorkStatus =
  | "ready"
  | "assigned"
  | "in-progress"
  | "completed"
  | "partial"
  | "blocked"
  | "offline"
  | "stale"
  | "corrected"
  | "verified"
  | "historical";

export type RecoveryState =
  | "blocked"
  | "partially_completed"
  | "ready_to_resume"
  | "completed"
  | "verified";

export type FixtureStatusEvent = {
  id: string;
  at: string;
  from: string | null;
  to: string;
  actor_person_id: string;
  reason: string;
  reported_acres?: number;
};

type FixturePerson = {
  id: string;
  name: string;
  organization_id: string;
  role_id: string;
};

type FixtureBlock = {
  id: string;
  stable_identity: string;
  organization_id: string;
  name: string;
  aliases: Array<{ system: string; value: string }>;
  acres: number;
  variety: string;
  planted_year: number;
};

type FixtureWorkOrder = {
  id: string;
  workflow_id: string;
  scenario_id: string;
  block_id: string;
  source_observation_id: string;
  title: string;
  scheduled_start: string;
  assignee_person_ids: string[];
  target_acres: number;
  current_status: string;
  status_history: FixtureStatusEvent[];
  blocker: {
    type: string;
    reason: string;
    affected_rows: string;
    recorded_at: string;
    resolved_at: string;
    resolution: string;
  };
  actuals: {
    completed_acres: number;
    verified_by_person_id: string;
    verified_at: string;
  };
};

type Fixture = {
  id: string;
  title: string;
  seed: number;
  people: FixturePerson[];
  blocks: FixtureBlock[];
  work_orders: FixtureWorkOrder[];
};

type FixtureFile = { fixtures: Fixture[] };

export type WorkOrder = {
  id: string;
  title: string;
  block: string;
  blockId: string;
  crop: string;
  acres: number;
  completedAcres?: number;
  crew: string;
  lead: string;
  window: string;
  status: WorkStatus;
  detail: string;
  priority: "Routine" | "Time-sensitive" | "Critical";
  update: string;
  fixtureId?: string;
};

const fixtureFile = fixtureSource as unknown as FixtureFile;

const fixtureCandidate = fixtureFile.fixtures.find(
  (fixture) => fixture.id === "FIX-001",
);

if (!fixtureCandidate) {
  throw new Error("FIX-001 is required for SCR-001.");
}

export const canonicalFixture: Fixture = fixtureCandidate;

const workOrderCandidate = canonicalFixture.work_orders.find(
  (order) => order.id === "WO-001",
);

if (!workOrderCandidate) {
  throw new Error("FIX-001 must include WO-001.");
}

export const canonicalWorkOrder: FixtureWorkOrder = workOrderCandidate;

const blockCandidate = canonicalFixture.blocks.find(
  (block) => block.id === canonicalWorkOrder.block_id,
);

if (!blockCandidate) {
  throw new Error("WO-001 must resolve to its stable fixture block.");
}

export const canonicalBlock: FixtureBlock = blockCandidate;

export const peopleById = new Map(
  canonicalFixture.people.map((person) => [person.id, person]),
);

const roleLabels: Record<string, string> = {
  "ROLE-VINEYARD-MANAGER": "Vineyard manager",
  "ROLE-VITICULTURIST": "Viticulturist",
  "ROLE-FOREMAN": "Foreman",
  "ROLE-EQUIPMENT-OPERATOR": "Equipment operator",
};

export function personName(personId: string) {
  return peopleById.get(personId)?.name ?? personId;
}

export function personRole(personId: string) {
  const roleId = peopleById.get(personId)?.role_id;
  return roleId ? (roleLabels[roleId] ?? roleId) : "Unknown role";
}

export function formatFixtureTime(timestamp: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
    timeZone: "America/Los_Angeles",
  }).format(new Date(timestamp));
}

export const canonicalHistory = canonicalWorkOrder.status_history;
export const blockedEvent = canonicalHistory.find(
  (event) => event.to === "blocked",
);

if (!blockedEvent) {
  throw new Error("FIX-001 must include its blocked transition.");
}

export const recoveryEvents = {
  partial: canonicalHistory.find((event) => event.to === "partially_completed"),
  release: canonicalHistory.find((event) => event.to === "ready_to_resume"),
  completion: canonicalHistory.find((event) => event.to === "completed"),
  verification: canonicalHistory.find((event) => event.to === "verified"),
};

if (
  !recoveryEvents.partial ||
  !recoveryEvents.release ||
  !recoveryEvents.completion ||
  !recoveryEvents.verification
) {
  throw new Error("FIX-001 must include its complete recovery event chain.");
}

const blockedEventIndex = canonicalHistory.findIndex(
  (event) => event.id === blockedEvent.id,
);

export const replayStartingHistory = canonicalHistory.slice(
  0,
  blockedEventIndex + 1,
);

const assignees = canonicalWorkOrder.assignee_person_ids.map(personName);
const foreman = canonicalFixture.people.find(
  (person) => person.role_id === "ROLE-FOREMAN",
);

const canonicalQueueOrder: WorkOrder = {
  id: canonicalWorkOrder.id,
  title: canonicalWorkOrder.title,
  block: canonicalBlock.name,
  blockId: canonicalBlock.id,
  crop: `${canonicalBlock.variety} · planted ${canonicalBlock.planted_year}`,
  acres: canonicalWorkOrder.target_acres,
  completedAcres: blockedEvent.reported_acres,
  crew: assignees.join(" + "),
  lead: foreman?.name ?? assignees[0],
  window: `${formatFixtureTime(canonicalWorkOrder.scheduled_start)} · before 6:00 PM irrigation`,
  status: "blocked",
  detail: canonicalWorkOrder.blocker.reason,
  priority: "Critical",
  update: `Stop recorded ${formatFixtureTime(blockedEvent.at)} · ${personName(blockedEvent.actor_person_id)}`,
  fixtureId: canonicalFixture.id,
};

export const workOrders: WorkOrder[] = [
  canonicalQueueOrder,
  {
    id: "WO-260618-09",
    title: "Trunk suckering · finish",
    block: "River Bend 08",
    blockId: "BLK-JD-008",
    crop: "Chardonnay · pea size",
    acres: 18.6,
    completedAcres: 11.3,
    crew: "Santos · 9 people",
    lead: "Marisol Santos",
    window: "05:45–12:00",
    status: "offline",
    detail: "Rows 31–52 reported complete; three devices await signal.",
    priority: "Routine",
    update: "Field update queued 17 min",
  },
  {
    id: "WO-260618-11",
    title: "Replace missing emitters",
    block: "Mesa Crest 03",
    blockId: "BLK-AR-003",
    crop: "Grenache · fruit set",
    acres: 9.8,
    crew: "Irrigation · 3 people",
    lead: "Ari Ruiz",
    window: "12:30–16:00",
    status: "assigned",
    detail: "Twelve flagged positions; parts staged at Pump House 2.",
    priority: "Routine",
    update: "Brief acknowledged 10:18",
  },
  {
    id: "WO-260617-02",
    title: "Shoot thin · final rows",
    block: "North Bench 14",
    blockId: "BLK-AR-014",
    crop: "Syrah · fruit set",
    acres: 18.6,
    completedAcres: 18.6,
    crew: "Vega · 14 people",
    lead: "Elena Vega",
    window: "Completed Jun 17",
    status: "corrected",
    detail:
      "Verified acreage corrected from 18.1 to 18.6 after geometry review.",
    priority: "Routine",
    update: "Correction approved 08:12",
  },
];

export const statusDefinitions: Array<{
  status: WorkStatus;
  label: string;
  description: string;
  example: string;
}> = [
  {
    status: "ready",
    label: "Ready",
    description: "Preconditions pass; dispatch can proceed.",
    example: "Materials, labor, equipment, and access confirmed.",
  },
  {
    status: "blocked",
    label: "Blocked",
    description: "A named constraint prevents safe execution.",
    example: "Hydraulic alarm stops rows 28–34.",
  },
  {
    status: "partial",
    label: "Partial",
    description: "Actual quantity is captured; remainder stays open.",
    example: "11.2 of 18.6 acres safely retained.",
  },
  {
    status: "offline",
    label: "Offline queued",
    description: "Field evidence exists locally but is not reconciled.",
    example: "A timestamped update awaits a usable signal.",
  },
  {
    status: "stale",
    label: "Stale input",
    description: "A planning input is older than its decision threshold.",
    example: "Labor roster last confirmed 11 hours ago.",
  },
  {
    status: "completed",
    label: "Completed",
    description:
      "Field actuals are final but supervisor verification remains open.",
    example: "18.6 acres reported; manager reconciliation is pending.",
  },
  {
    status: "corrected",
    label: "Corrected",
    description: "A newer approved value supersedes the original.",
    example: "Repair evidence releases only the remaining scope.",
  },
  {
    status: "historical",
    label: "Historical",
    description: "Closed record is read-only and time-contextualized.",
    example: "Every actor, time, reason, and prior state remains visible.",
  },
];

export const workflowSteps = [
  { label: "Plan", meta: "Elena · 6:50 AM", state: "complete" },
  { label: "Assign", meta: "Crew · 7:00 AM", state: "complete" },
  { label: "Execute", meta: "Started · 7:22 AM", state: "complete" },
  { label: "Stop", meta: "Alarm · 9:08 AM", state: "current" },
  { label: "Recover", meta: "11.2 ac retained", state: "upcoming" },
  { label: "Verify", meta: "Manager closure", state: "upcoming" },
];

export const blockIdentity = {
  stableId: canonicalBlock.stable_identity,
  name: canonicalBlock.name,
  ranch: "Northstar Vineyard Operations · Carneros",
  crop: `${canonicalBlock.variety} · 18.6 acres`,
  planted: `Planted ${canonicalBlock.planted_year} · ${canonicalBlock.id}`,
  aliases: canonicalBlock.aliases,
};

export const dayMetrics = [
  {
    label: "Target",
    value: `${canonicalWorkOrder.target_acres} ac`,
    detail: "Carneros Ridge Block 07",
    tone: "neutral",
  },
  {
    label: "Safely complete",
    value: `${blockedEvent.reported_acres ?? 0} ac`,
    detail: "West-pass acreage retained",
    tone: "info",
  },
  {
    label: "Rows held",
    value: canonicalWorkOrder.blocker.affected_rows,
    detail: "Hydraulic stop recorded",
    tone: "danger",
  },
  {
    label: "Fixture events",
    value: String(canonicalHistory.length),
    detail: "Attributed, ordered, immutable",
    tone: "success",
  },
] as const;

export const traceChain = [
  "EVD-001",
  "WF-001",
  "SCN-001-01",
  "FIX-001",
  "SCR-001",
  "CMP-001",
  "PKT-001",
];
