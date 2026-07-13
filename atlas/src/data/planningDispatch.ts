export type WorkStatus =
  | "ready"
  | "assigned"
  | "in-progress"
  | "partial"
  | "blocked"
  | "offline"
  | "stale"
  | "corrected"
  | "verified"
  | "historical";

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
};

export const workOrders: WorkOrder[] = [
  {
    id: "WO-260618-04",
    title: "Lift and tuck · pass 2",
    block: "South Loam 22",
    blockId: "BLK-AR-022",
    crop: "Cabernet Franc · fruit set",
    acres: 22.4,
    crew: "Vega · 14 people",
    lead: "Elena Vega",
    window: "06:15–13:30",
    status: "in-progress",
    detail: "West-to-east pass; keep replacement-vine flags visible.",
    priority: "Time-sensitive",
    update: "Progress at 10:42",
  },
  {
    id: "WO-260618-07",
    title: "Under-vine cultivation",
    block: "North Bench 14",
    blockId: "BLK-AR-014",
    crop: "Syrah · fruit set",
    acres: 18.6,
    crew: "Ramos tractor team",
    lead: "Luis Ramos",
    window: "14:15–18:00",
    status: "blocked",
    detail: "East rows remain inside a restricted-entry interval until 14:00.",
    priority: "Critical",
    update: "Restriction checked 10:35",
  },
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
    example: "REI holds east rows until 14:00.",
  },
  {
    status: "partial",
    label: "Partial",
    description: "Actual quantity is captured; remainder stays open.",
    example: "11.3 of 18.6 acres reported complete.",
  },
  {
    status: "offline",
    label: "Offline queued",
    description: "Field evidence exists locally but is not reconciled.",
    example: "Three updates await a usable signal.",
  },
  {
    status: "stale",
    label: "Stale input",
    description: "A planning input is older than its decision threshold.",
    example: "Labor roster last confirmed 11 hours ago.",
  },
  {
    status: "corrected",
    label: "Corrected",
    description: "A newer approved value supersedes the original.",
    example: "Acreage 18.1 → 18.6; both versions retained.",
  },
  {
    status: "historical",
    label: "Historical",
    description: "Closed record is read-only and time-contextualized.",
    example: "2025 work order shown for comparison.",
  },
];

export const workflowSteps = [
  { label: "Plan", meta: "Manager · 05:18", state: "complete" },
  { label: "Approve", meta: "Routine authority", state: "complete" },
  { label: "Assign", meta: "Crew Vega · 05:42", state: "complete" },
  { label: "Execute", meta: "14.8 / 22.4 ac", state: "current" },
  { label: "Report", meta: "Field quantities", state: "upcoming" },
  { label: "Verify", meta: "Manager closure", state: "upcoming" },
];

export const blockIdentity = {
  stableId: "BLK-AR-022",
  name: "South Loam 22",
  ranch: "Rancho Arroyo · estate",
  crop: "Cabernet Franc · clone 214",
  planted: "2009 · 22.4 acres",
  aliases: [
    { system: "Winery", value: "SL-CF22" },
    { system: "Payroll", value: "RA-22" },
    { system: "Legacy", value: "South 5" },
  ],
};

export const dayMetrics = [
  {
    label: "Planned",
    value: "103.8 ac",
    detail: "9 work orders",
    tone: "neutral",
  },
  {
    label: "In motion",
    value: "3 crews",
    detail: "41 people briefed",
    tone: "info",
  },
  {
    label: "Needs decision",
    value: "2",
    detail: "1 blocked · 1 stale",
    tone: "danger",
  },
  {
    label: "Verified this week",
    value: "92%",
    detail: "318 of 345 acres",
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
