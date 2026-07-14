import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { format } from "prettier";

type Transition = {
  id: string;
  from: string | null;
  to: string;
  kind: string;
  owner: string;
  trigger: string;
  description: string;
  record_reads: string[];
  record_writes: string[];
  decision_ids: string[];
  exception_ids: string[];
};

type Workflow = {
  id: string;
  name: string;
  roles: string[];
  triggers: string[];
  terminal_states: string[];
  steps: Array<{
    state_from: string | null;
    state_to: string;
  }>;
  transitions: Transition[];
};

type Role = { id: string; name: string; layer: string };
type RecordDefinition = {
  id: string;
  name: string;
  workflow_ids: string[];
  responsible_roles: string[];
  lifecycle: string[];
  related_records: string[];
};
type Decision = {
  id: string;
  workflow_id: string;
  outcomes: string[];
};
type ExceptionDefinition = {
  id: string;
  name: string;
  workflow_ids: string[];
  accountable_owner: string;
  escalation_roles: string[];
  interrupted_states: string[];
  recovery_states: string[];
  recovery_actions: string[];
  closure_evidence: string[];
  record_ids: string[];
  decisions: string[];
};
type Overlay = {
  id: string;
  name: string;
  applies_to: string[];
  record_ids: string[];
};
type InstancePlan = {
  id: string;
  workflow: Workflow;
  instanceNumber: number;
  blockId: string;
  month: number;
  day: number;
  exceptionId?: string;
  exceptionHistoryId?: string;
  transitions: Transition[];
  exceptionTransitionIndex?: number;
};
type RecordPlan = {
  key: string;
  id: string;
  definition: RecordDefinition;
  instancePlans: InstancePlan[];
  shared: boolean;
};
type JsonObject = Record<string, unknown>;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GENERATED_AT = "2026-12-31T23:40:00-08:00";
const OPERATION_ID = "OPR-001";
const SEASON_ID = "SSN-2026";
const SEED = 20260713;
const SOURCE_PATHS = [
  "workflow-model/workflows.json",
  "workflow-model/roles.json",
  "workflow-model/records.json",
  "workflow-model/decisions.json",
  "workflow-model/exceptions.json",
  "workflow-model/overlays.json",
] as const;

const selectedExceptionsByWorkflow: Record<
  string,
  Array<string | undefined>
> = {
  "WF-001": ["EXC-002", "EXC-004", "EXC-005"],
  "WF-002": ["EXC-006", "EXC-009", "EXC-010"],
  "WF-003": ["EXC-012", "EXC-016"],
  "WF-004": ["EXC-021", "EXC-023"],
  "WF-005": ["EXC-024", "EXC-029"],
  "WF-006": ["EXC-030", "EXC-033", "EXC-034", "EXC-035"],
  "WF-007": ["EXC-037", "EXC-039"],
  "WF-008": ["EXC-044", "EXC-047"],
  "WF-009": ["EXC-056", undefined, "EXC-051"],
  "WF-010": ["EXC-057", "EXC-061", "EXC-062"],
};

const workflowMonths: Record<string, number[]> = {
  "WF-001": [1, 3, 5, 7, 11],
  "WF-002": [2, 4, 5, 6, 7],
  "WF-003": [3, 4, 6, 7, 8],
  "WF-004": [6, 7, 7, 8, 8],
  "WF-005": [7, 8, 8, 9, 9],
  "WF-006": [8, 9, 9, 10, 10],
  "WF-007": [1, 5, 8, 9, 12],
  "WF-008": [1, 4, 7, 8, 11],
  "WF-009": [9, 10, 10, 11, 12],
  "WF-010": [2, 3, 7, 11, 12],
};

const blockSequence = ["BLK-001", "BLK-002", "BLK-009", "BLK-010", "BLK-005"];
const specializedBlockSequences: Record<string, string[]> = {
  "WF-003": ["BLK-003", "BLK-004", "BLK-006", "BLK-007", "BLK-008"],
  "WF-004": ["BLK-001", "BLK-002", "BLK-009", "BLK-011", "BLK-005"],
  "WF-005": ["BLK-001", "BLK-002", "BLK-009", "BLK-011", "BLK-005"],
  "WF-006": ["BLK-001", "BLK-002", "BLK-009", "BLK-011", "BLK-005"],
  "WF-008": ["BLK-011", "BLK-012", "BLK-003", "BLK-004", "BLK-006"],
  "WF-009": ["BLK-001", "BLK-002", "BLK-009", "BLK-011", "BLK-005"],
  "WF-010": ["BLK-001", "BLK-002", "BLK-009", "BLK-011", "BLK-005"],
};
const sharedRecordWorkflows: Record<string, string[]> = {
  "REC-003": ["WF-001", "WF-007"],
  "REC-015": ["WF-002", "WF-010"],
  "REC-027": ["WF-004", "WF-005"],
  "REC-041": ["WF-005", "WF-006"],
  "REC-080": ["WF-005", "WF-006", "WF-009", "WF-010"],
};

const ALLOWED_RECORD_LINK_TUPLES: Array<[string, string, string]> = [
  ["REC-003", "supports", "REC-056"],
  ["REC-003", "supports", "REC-064"],
  ["REC-003", "supports", "REC-071"],
  ["REC-006", "supports", "REC-059"],
  ["REC-006", "supports", "REC-060"],
  ["REC-006", "supports", "REC-063"],
  ["REC-006", "supports", "REC-075"],
  ["REC-009", "supports", "REC-064"],
  ["REC-011", "supports", "REC-066"],
  ["REC-012", "reconciles_with", "REC-065"],
  ["REC-015", "documents", "REC-082"],
  ["REC-015", "documents", "REC-095"],
  ["REC-015", "documents", "REC-101"],
  ["REC-022", "supports", "REC-064"],
  ["REC-023", "documents", "REC-094"],
  ["REC-023", "documents", "REC-101"],
  ["REC-025", "supports", "REC-072"],
  ["REC-025", "supports", "REC-073"],
  ["REC-026", "reconciles_with", "REC-094"],
  ["REC-027", "supports", "REC-029"],
  ["REC-027", "supports", "REC-039"],
  ["REC-029", "supports", "REC-039"],
  ["REC-029", "supports", "REC-040"],
  ["REC-030", "corrects", "REC-042"],
  ["REC-033", "reconciles_with", "REC-050"],
  ["REC-035", "supports", "REC-045"],
  ["REC-037", "supports", "REC-048"],
  ["REC-039", "supports", "REC-041"],
  ["REC-040", "supports", "REC-044"],
  ["REC-041", "fulfills", "REC-044"],
  ["REC-044", "supports", "REC-045"],
  ["REC-044", "supports", "REC-056"],
  ["REC-045", "supports", "REC-047"],
  ["REC-045", "supports", "REC-050"],
  ["REC-079", "supports", "REC-045"],
  ["REC-080", "fulfills", "REC-045"],
  ["REC-046", "documents", "REC-101"],
  ["REC-047", "supports", "REC-048"],
  ["REC-047", "supports", "REC-050"],
  ["REC-047", "supports", "REC-053"],
  ["REC-050", "supports", "REC-048"],
  ["REC-048", "supports", "REC-053"],
  ["REC-048", "supports", "REC-101"],
  ["REC-050", "supports", "REC-053"],
  ["REC-050", "supports", "REC-060"],
  ["REC-050", "supports", "REC-063"],
  ["REC-051", "corrects", "REC-047"],
  ["REC-051", "corrects", "REC-053"],
  ["REC-051", "corrects", "REC-102"],
  ["REC-052", "reconciles_with", "REC-087"],
  ["REC-052", "reconciles_with", "REC-088"],
  ["REC-053", "supports", "REC-088"],
  ["REC-059", "documents", "REC-101"],
  ["REC-066", "supports", "REC-097"],
  ["REC-066", "supports", "REC-101"],
  ["REC-070", "documents", "REC-099"],
  ["REC-070", "documents", "REC-101"],
  ["REC-078", "supports", "REC-089"],
  ["REC-078", "supports", "REC-096"],
  ["REC-079", "supports", "REC-096"],
  ["REC-080", "fulfills", "REC-090"],
  ["REC-082", "documents", "REC-090"],
  ["REC-082", "documents", "REC-101"],
  ["REC-086", "supports", "REC-102"],
];
const ALLOWED_RECORD_LINK_KEYS = new Set(
  ALLOWED_RECORD_LINK_TUPLES.map(
    ([source, relation, target]) => `${source}:${relation}:${target}`,
  ),
);

const REQUIRED_DOMAIN_PROFILE_FIELDS: Record<
  string,
  Record<string, string | undefined>
> = {
  "REC-002": {
    signal_type: undefined,
    severity: undefined,
    observed_area: "UNT-001",
    signal_status: undefined,
  },
  "REC-019": {
    soil_moisture_depletion: "UNT-013",
    reference_et: "UNT-016",
    measurement_depth: "UNT-016",
    moisture_status: undefined,
  },
  "REC-021": {
    petiole_no3_ppm: "UNT-020",
    potassium_percent: "UNT-013",
    boron_ppm: "UNT-020",
    nutrient_status: undefined,
  },
  "REC-029": {
    estimated_tons: "UNT-003",
    yield_rate: "UNT-021",
    sampled_vine_count: "UNT-008",
    estimate_status: undefined,
  },
  "REC-058": {
    shift_time: "UNT-007",
    break_time: "UNT-007",
    break_status: undefined,
  },
  "REC-061": {
    verified_entry_count: "UNT-008",
    variance_time: "UNT-007",
    verified_by: undefined,
    verification_result: undefined,
  },
  "REC-066": {
    equipment: undefined,
    calibrated_application_rate: "UNT-012",
    readiness_check_count: "UNT-008",
    verification_result: undefined,
  },
  "REC-075": {
    equipment: undefined,
    repair_test_duration: "UNT-007",
    readiness_check_count: "UNT-008",
    return_to_service_status: undefined,
  },
  "REC-077": {
    organization: undefined,
    primary_contact: undefined,
    contact_channel: undefined,
    contact_status: undefined,
  },
  "REC-094": {
    water_total: "UNT-005",
    nitrogen_total: "UNT-018",
    reporting_period: undefined,
    totals_status: undefined,
  },
  "REC-098": {
    transport_unit: undefined,
    cleaning_method: undefined,
    signed_by: undefined,
    affidavit_status: undefined,
  },
};

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

function sourceTimestamp(
  month: number,
  day: number,
  minuteOfDay: number,
): string {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let year = 2026;
  let normalizedMonth = month;
  let normalizedDay = day + Math.floor(minuteOfDay / 1440);
  while (normalizedDay > daysInMonth[normalizedMonth - 1]) {
    normalizedDay -= daysInMonth[normalizedMonth - 1];
    normalizedMonth += 1;
    if (normalizedMonth > 12) {
      normalizedMonth = 1;
      year += 1;
    }
  }
  const normalized = ((minuteOfDay % 1440) + 1440) % 1440;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  const beforeSpringForward =
    normalizedMonth < 3 ||
    (normalizedMonth === 3 &&
      (normalizedDay < 8 || (normalizedDay === 8 && hour < 2)));
  const afterFallBack =
    normalizedMonth > 11 ||
    (normalizedMonth === 11 &&
      (normalizedDay > 1 || (normalizedDay === 1 && hour >= 2)));
  const offset = beforeSpringForward || afterFallBack ? "-08:00" : "-07:00";
  return `${year}-${pad(normalizedMonth, 2)}-${pad(normalizedDay, 2)}T${pad(hour, 2)}:${pad(minute, 2)}:00${offset}`;
}

function artifactJson(value: unknown): string {
  return JSON.stringify(value, function (key, candidate: unknown) {
    if (typeof candidate !== "number" || !Number.isFinite(candidate))
      return candidate;
    if (
      key === "value" &&
      this &&
      typeof this === "object" &&
      typeof (this as JsonObject).unit_id === "string"
    )
      return Number(candidate.toFixed(4));
    if (
      key === "amount" &&
      this &&
      typeof this === "object" &&
      typeof (this as JsonObject).currency === "string"
    )
      return Number(candidate.toFixed(2));
    return candidate;
  });
}

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function countLeaves(value: unknown): number {
  if (value === null || typeof value !== "object") return 1;
  if (Array.isArray(value))
    return value.reduce((sum, item) => sum + countLeaves(item), 0);
  return Object.values(value).reduce((sum, item) => sum + countLeaves(item), 0);
}

function containsEntityReference(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (
    !Array.isArray(value) &&
    typeof (value as JsonObject).entity_type === "string" &&
    typeof (value as JsonObject).entity_id === "string"
  )
    return true;
  return Object.values(value).some((item) => containsEntityReference(item));
}

function collectUnitIds(
  value: unknown,
  result = new Set<string>(),
): Set<string> {
  if (!value || typeof value !== "object") return result;
  if (
    !Array.isArray(value) &&
    typeof (value as JsonObject).unit_id === "string"
  )
    result.add(String((value as JsonObject).unit_id));
  for (const item of Object.values(value)) collectUnitIds(item, result);
  return result;
}

function requireValue<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}

function provenance(
  sourceRef: string,
  capturedAt = GENERATED_AT,
  personId?: string,
): JsonObject {
  const value: JsonObject = {
    source_type: "synthetic_generator",
    source_ref: sourceRef,
    captured_at: capturedAt,
    method: "deterministic Node 24 erasable TypeScript generator",
    generator_seed: SEED,
    confidence: "high",
  };
  if (personId) value.captured_by_person_id = personId;
  return value;
}

function timestampMinutes(value: string): number {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):\d{2}([+-])(\d{2}):(\d{2})$/.exec(
      value,
    );
  if (!match) throw new Error(`Invalid deterministic timestamp ${value}`);
  const [
    ,
    yearText,
    monthText,
    dayText,
    hourText,
    minuteText,
    sign,
    offsetHour,
    offsetMinute,
  ] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const daysInMonth = [
    31,
    year % 4 === 0 ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  const priorYears = (year - 2026) * 365;
  const priorMonths = daysInMonth
    .slice(0, month - 1)
    .reduce((sum, days) => sum + days, 0);
  const localMinutes =
    (priorYears + priorMonths + Number(dayText) - 1) * 1440 +
    Number(hourText) * 60 +
    Number(minuteText);
  const offset =
    (Number(offsetHour) * 60 + Number(offsetMinute)) * (sign === "+" ? 1 : -1);
  return localMinutes - offset;
}

const TARGET_OUTCOME_PREFERENCES: Record<string, string[]> = {
  accepted: ["accept", "proceed"],
  active: ["activate", "proceed"],
  aligned: ["provide guidance", "negotiate adjustment"],
  approved: ["approve", "allowed", "release"],
  authorized: ["authorize", "mutual agreement"],
  blocked: ["block", "defer", "hold", "escalate", "reject"],
  calculated: ["calculate"],
  cancelled: [
    "cancel",
    "do not",
    "reject",
    "decline",
    "no action",
    "continue monitoring",
    "non-chemical",
  ],
  certification_withheld: ["withhold certification", "noncompliant"],
  compliant: ["compliant", "verify and certify"],
  completed: ["complete"],
  corrected: [
    "correction",
    "correct",
    "revise",
    "partially complete",
    "complete",
  ],
  correction_required: [
    "correction",
    "correct",
    "revise",
    "blocked",
    "malfunction",
    "investigate",
  ],
  corrective_action: ["open corrective", "negotiate adjustment"],
  corrective_action_open: [
    "keep corrective action open",
    "gap requires correction",
    "noncompliant",
    "more evidence",
  ],
  crew_scheduled: ["schedule crew"],
  deferred: ["defer", "continue sampling", "mutual agreement"],
  delayed: ["revise timing", "hold"],
  delivered: ["delivered as planned"],
  delivery_interrupted: [
    "malfunction",
    "not delivered",
    "defer",
    "resample or investigate",
    "revise scope or timing",
  ],
  disputed: ["dispute", "identity resolution", "correction", "ambiguity"],
  downgraded: ["downgrade"],
  effective: ["close as effective"],
  ended: ["decline", "escalate dispute"],
  exception_flagged: ["flag", "escalate", "change crew", "delay work"],
  failure_reported: ["stop and void", "transfer to alternate"],
  gap_identified: [
    "gap requires correction",
    "missing outside-party",
    "clarification",
  ],
  ineffective: ["recommend follow-up", "correct"],
  more_sampling_required: ["resample", "continue sampling"],
  negotiating: [
    "use with explicit qualification",
    "mutual agreement",
    "alternate date",
    "escalate conflict",
  ],
  noncompliant: [
    "noncompliant",
    "withhold certification",
    "more evidence required",
    "further review",
  ],
  partially_completed: ["partially complete"],
  partially_delivered: ["partially delivered"],
  paused: ["pause", "stop and escalate"],
  payroll_accepted: ["accept submitted"],
  planned: ["plan work now"],
  posted: ["release"],
  pressure_assessed: ["continue monitoring", "recommend treatment"],
  purchase_requested: ["purchase or rent", "allowed", "approve"],
  readiness_assessed: ["assess readiness", "propose pick"],
  reassigned: ["reassign"],
  reconciled: ["correction", "apply agreed adjustment", "settle"],
  rejected: ["reject"],
  remediation_in_progress: ["keep corrective action open", "further review"],
  reported: ["accept and report", "return for correction"],
  revised: ["superseding revision", "revise"],
  revision_due: ["resample", "investigate", "superseding revision"],
  sampled: ["flag an unresolved range", "resample"],
  scheduled: ["release application", "reschedule"],
  settled: ["settle", "apply agreed adjustment"],
  staged: ["hand harvest", "machine harvest"],
  supervisor_verified: ["verify", "correction"],
  superseded: [
    "superseding revision",
    "revise",
    "authorize alternate date",
    "defer",
    "replan",
    "resample",
    "mutual agreement required",
    "select approved alternative",
    "correction",
  ],
  terms_negotiating: ["proceed conditionally", "continue negotiation"],
  treatment_recommended: ["recommend treatment", "follow-up action"],
  unavailable: [
    "purchase or rent",
    "book contractor",
    "replan work",
    "defer",
    "transfer to alternate",
    "stop and void",
  ],
  under_review: ["more evidence required", "proceed conditionally"],
  verified: ["verify", "delivered as planned", "complete"],
  verified_ready: ["transfer to alternate equipment", "stop and void"],
  weighed: ["proceed with assessment"],
  working: ["continue"],
};

const OBVIOUS_OUTCOME_CONTRADICTIONS: Record<string, string[]> = {
  cancelled: ["approve", "release application", "allowed as proposed"],
  certification_withheld: ["compliant", "verify and certify"],
  correction_required: ["complete", "ready to submit", "compliant"],
  corrective_action_open: [
    "ready to submit",
    "compliant",
    "verify and certify",
  ],
  delivery_interrupted: [
    "increase",
    "delivered as planned",
    "approve and assign",
  ],
  exception_flagged: ["schedule crew", "verify", "accept submitted record"],
  noncompliant: ["compliant", "verify and certify"],
  partially_completed: ["complete"],
  paused: ["continue"],
  superseded: [
    "winery authorizes",
    "approve and dispatch",
    "allowed as proposed",
  ],
  unavailable: [
    "stage available resources",
    "approve",
    "preserve partial completion",
  ],
  verified_ready: ["preserve partial completion"],
};

function isObviousOutcomeContradiction(
  targetState: string,
  outcome: string,
): boolean {
  const normalized = outcome.toLowerCase();
  if (targetState === "partially_completed" && normalized === "complete")
    return true;
  if (targetState === "noncompliant" && normalized === "compliant") return true;
  return (OBVIOUS_OUTCOME_CONTRADICTIONS[targetState] ?? []).some((phrase) =>
    phrase === "complete" || phrase === "compliant"
      ? normalized === phrase
      : normalized.includes(phrase),
  );
}

function decisionResult(
  decision: Decision,
  transition: Transition,
): JsonObject {
  const target = transition.to.replaceAll("_", " ");
  const preferences = [
    target,
    ...(TARGET_OUTCOME_PREFERENCES[transition.to] ?? []),
  ];
  const eligible = decision.outcomes.filter(
    (outcome) => !isObviousOutcomeContradiction(transition.to, outcome),
  );
  const outcome =
    preferences
      .map((preference) =>
        eligible.find((candidate) =>
          candidate.toLowerCase().includes(preference),
        ),
      )
      .find((candidate): candidate is string => Boolean(candidate)) ??
    eligible[0];
  if (!outcome)
    throw new Error(
      `${transition.id}/${decision.id}: every canonical outcome contradicts ${transition.to}`,
    );
  return {
    decision_id: decision.id,
    outcome,
    rationale: `Selected the canonical ${decision.id} outcome that best preserves the transition into ${transition.to} with attributable evidence.`,
  };
}

const RECORD_FAMILY_GROUPS: Record<string, string[]> = {
  planning_recommendation:
    "REC-001 REC-009 REC-022 REC-027 REC-029 REC-031 REC-039 REC-043 REC-064 REC-081 REC-091 REC-092".split(
      " ",
    ),
  assignment_authorization_communication:
    "REC-003 REC-014 REC-032 REC-040 REC-041 REC-044 REC-049 REC-056 REC-067 REC-068 REC-069 REC-073 REC-085 REC-098 REC-100 REC-103".split(
      " ",
    ),
  observation_sample_result:
    "REC-002 REC-008 REC-017 REC-018 REC-019 REC-020 REC-021 REC-025 REC-028 REC-036 REC-037 REC-038 REC-048 REC-072 REC-084".split(
      " ",
    ),
  execution_actual_log:
    "REC-004 REC-006 REC-011 REC-012 REC-023 REC-024 REC-033 REC-046 REC-050 REC-057 REC-058 REC-059 REC-060 REC-071 REC-074 REC-083 REC-094 REC-097".split(
      " ",
    ),
  lifecycle_history_correction: "REC-005 REC-030 REC-034 REC-042 REC-051".split(
    " ",
  ),
  restriction_verification:
    "REC-007 REC-010 REC-013 REC-055 REC-061 REC-066 REC-075 REC-095".split(
      " ",
    ),
  report_evidence_package:
    "REC-015 REC-016 REC-082 REC-089 REC-090 REC-093 REC-099 REC-101".split(
      " ",
    ),
  identity_lineage_contract:
    "REC-035 REC-045 REC-076 REC-077 REC-078 REC-079 REC-080 REC-096".split(
      " ",
    ),
  commercial_reconciliation:
    "REC-026 REC-047 REC-052 REC-053 REC-063 REC-087 REC-088".split(" "),
  labor_payroll_exception: ["REC-062"],
  labor_roster: ["REC-054"],
  inventory_receipt: ["REC-065", "REC-070"],
  corrective_finding: ["REC-086", "REC-102"],
};
const RECORD_FAMILY_BY_ID = new Map<string, string>();
for (const [family, recordIds] of Object.entries(RECORD_FAMILY_GROUPS))
  for (const recordId of recordIds) {
    if (RECORD_FAMILY_BY_ID.has(recordId))
      throw new Error(`Duplicate family assignment for ${recordId}`);
    RECORD_FAMILY_BY_ID.set(recordId, family);
  }

const RECORD_SPECIFIC_FACT_KEYS = new Map<string, string>(
  [
    "REC-001 seasonal_planning_horizon",
    "REC-002 field_signal_severity",
    "REC-003 assignment_acknowledgement",
    "REC-004 activity_completion",
    "REC-005 status_change_count",
    "REC-006 actual_material_use",
    "REC-007 verification_sample_size",
    "REC-008 scouting_pressure_index",
    "REC-009 treatment_action_threshold",
    "REC-010 approved_label_revision",
    "REC-011 calibrated_application_rate",
    "REC-012 treated_block_area",
    "REC-013 restriction_release_window",
    "REC-014 posting_visibility_window",
    "REC-015 spray_diary_entries",
    "REC-016 reported_application_count",
    "REC-017 follow_up_efficacy_score",
    "REC-018 observed_canopy_condition",
    "REC-019 soil_moisture_depletion",
    "REC-020 plant_water_status",
    "REC-021 petiole_nutrient_percent",
    "REC-022 irrigation_run_window",
    "REC-023 delivered_irrigation_volume",
    "REC-024 applied_fertility_input",
    "REC-025 interrupted_delivery_volume",
    "REC-026 seasonal_resource_total",
    "REC-027 planned_sample_count",
    "REC-028 sampled_cluster_count",
    "REC-029 estimated_crop_tonnage",
    "REC-030 forecast_revision_delta",
    "REC-031 crop_load_target",
    "REC-032 estimate_notice_window",
    "REC-033 harvested_actual_tonnage",
    "REC-034 forecast_error_tonnage",
    "REC-035 chain_of_identity_checks",
    "REC-036 field_condition_rating",
    "REC-037 laboratory_brix_result",
    "REC-038 maturity_brix_change",
    "REC-039 proposed_pick_brix",
    "REC-040 decision_response_window",
    "REC-041 authorized_pick_window",
    "REC-042 superseded_record_count",
    "REC-043 harvest_plan_tonnage",
    "REC-044 assigned_container_count",
    "REC-045 load_identity_match_score",
    "REC-046 transport_elapsed_hours",
    "REC-047 certified_net_weight",
    "REC-048 intake_quality_brix",
    "REC-049 disposition_notice_window",
    "REC-050 entered_delivery_tonnage",
    "REC-051 corrected_field_count",
    "REC-052 contract_adjustment_amount",
    "REC-053 settlement_net_amount",
    "REC-054 rostered_worker_count",
    "REC-055 current_qualification_count",
    "REC-056 safety_briefing_duration",
    "REC-057 attended_shift_hours",
    "REC-058 recorded_break_hours",
    "REC-059 payable_piece_rate_hours",
    "REC-060 completed_task_quantity",
    "REC-061 verified_entry_count",
    "REC-062 payroll_variance_hours",
    "REC-063 allocated_labor_cost",
    "REC-064 requested_resource_quantity",
    "REC-065 on_hand_inventory_quantity",
    "REC-066 readiness_check_count",
    "REC-067 requested_purchase_quantity",
    "REC-068 approved_purchase_limit",
    "REC-069 ordered_resource_quantity",
    "REC-070 received_lot_quantity",
    "REC-071 staged_resource_quantity",
    "REC-072 failure_downtime_hours",
    "REC-073 repair_target_hours",
    "REC-074 repair_labor_hours",
    "REC-075 return_to_service_checks",
    "REC-076 grower_profile_completeness",
    "REC-077 verified_contact_count",
    "REC-078 mapped_block_area",
    "REC-079 active_alias_count",
    "REC-080 contracted_tonnage",
    "REC-081 minimum_quality_brix",
    "REC-082 historical_evidence_count",
    "REC-083 documented_visit_hours",
    "REC-084 reported_crop_tonnage",
    "REC-085 acknowledged_notice_window",
    "REC-086 corrective_action_age",
    "REC-087 disputed_amount",
    "REC-088 reconciled_delivery_count",
    "REC-089 certified_scope_area",
    "REC-090 mapped_requirement_count",
    "REC-091 managed_site_area",
    "REC-092 questionnaire_completion",
    "REC-093 biosecurity_control_count",
    "REC-094 seasonal_water_total",
    "REC-095 trained_worker_count",
    "REC-096 organic_buffer_width",
    "REC-097 cleaning_rinse_volume",
    "REC-098 clean_transport_checks",
    "REC-099 buffer_crop_disposition_weight",
    "REC-100 preparation_application_count",
    "REC-101 audit_evidence_item_count",
    "REC-102 finding_age_days",
    "REC-103 certification_decision_term",
  ].map((item) => {
    const [recordId, factKey] = item.split(" ");
    return [recordId, factKey];
  }),
);

function recordFamily(recordId: string): string {
  return requireValue(
    RECORD_FAMILY_BY_ID.get(recordId),
    `${recordId}: missing explicit record family`,
  );
}

function pathToState(
  workflow: Workflow,
  start: string | null,
  target: string,
): Transition[] {
  const queue: Array<{ state: string | null; path: Transition[] }> = [
    { state: start, path: [] },
  ];
  const seen = new Set([start ?? "__start__"]);
  while (queue.length > 0) {
    const current = requireValue(
      queue.shift(),
      `${workflow.id}: path queue unexpectedly empty`,
    );
    if (current.state === target) return current.path;
    for (const transition of workflow.transitions.filter(
      (item) => item.from === current.state,
    )) {
      const key = transition.to;
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ state: transition.to, path: [...current.path, transition] });
    }
  }
  throw new Error(
    `${workflow.id}: no canonical path from ${start ?? "start"} to ${target}`,
  );
}

function normalPath(workflow: Workflow): Transition[] {
  const result: Transition[] = [];
  let current: string | null = null;
  for (const step of workflow.steps) {
    if (current !== step.state_from) {
      result.push(...pathToState(workflow, current, step.state_from ?? ""));
    }
    const transition = workflow.transitions.find(
      (item) => item.from === step.state_from && item.to === step.state_to,
    );
    result.push(
      requireValue(
        transition,
        `${workflow.id}: missing step transition to ${step.state_to}`,
      ),
    );
    current = step.state_to;
  }
  if (
    result.length === 0 ||
    !workflow.terminal_states.includes(result.at(-1)?.to ?? "")
  ) {
    const preferredTerminal = workflow.terminal_states[0];
    result.push(...pathToState(workflow, current, preferredTerminal));
  }
  return result;
}

function exceptionPath(
  workflow: Workflow,
  exceptionId: string,
): { path: Transition[]; exceptionIndex: number } {
  const edge = workflow.transitions.find(
    (item) =>
      item.kind === "exception" && item.exception_ids.includes(exceptionId),
  );
  const exceptionEdge = requireValue(
    edge,
    `${workflow.id}: no exception transition for ${exceptionId}`,
  );
  const intendedPath = normalPath(workflow);
  const outputStates = intendedPath.map((item) => item.to);
  const intendedIndex =
    exceptionEdge.from === null ? -1 : outputStates.indexOf(exceptionEdge.from);
  const prefix =
    exceptionEdge.from === null
      ? []
      : intendedIndex >= 0
        ? intendedPath.slice(0, intendedIndex + 1)
        : pathToState(workflow, null, exceptionEdge.from);
  const preferredTerminal = requireValue(
    intendedPath.at(-1),
    `${workflow.id}: empty intended path`,
  ).to;
  let suffix: Transition[] = [];
  if (!workflow.terminal_states.includes(exceptionEdge.to)) {
    suffix = pathToState(workflow, exceptionEdge.to, preferredTerminal);
  }
  return {
    path: [...prefix, exceptionEdge, ...suffix],
    exceptionIndex: prefix.length,
  };
}

function assignmentAuthority(role: Role): string[] {
  if (role.id.includes("MANAGER") || role.id.includes("OWNER"))
    return ["approve", "assign", "verify", "correct", "administer"];
  if (role.id.includes("COORDINATOR") || role.layer === "office_support")
    return ["assign", "verify", "correct", "administer"];
  if (role.id.includes("FOREMAN") || role.id.includes("LEAD"))
    return ["observe", "assign", "execute", "verify"];
  if (
    role.id.includes("VITICULTURIST") ||
    role.id.includes("SCOUT") ||
    role.id === "ROLE-LAB"
  )
    return ["observe", "recommend", "verify"];
  if (role.layer === "field_execution") return ["observe", "execute"];
  return ["observe", "verify"];
}

async function main(): Promise<void> {
  const sourceContents = await Promise.all(
    SOURCE_PATHS.map((relativePath) =>
      readFile(path.join(ROOT, relativePath), "utf8"),
    ),
  );
  const sourceHashes = Object.fromEntries(
    SOURCE_PATHS.map((relativePath, index) => [
      relativePath,
      sha256(sourceContents[index]),
    ]),
  );
  const workflows = (JSON.parse(sourceContents[0]) as { workflows: Workflow[] })
    .workflows;
  const roles = (JSON.parse(sourceContents[1]) as { roles: Role[] }).roles;
  const records = (
    JSON.parse(sourceContents[2]) as { records: RecordDefinition[] }
  ).records;
  const decisions = (JSON.parse(sourceContents[3]) as { decisions: Decision[] })
    .decisions;
  const exceptionDefinitions = (
    JSON.parse(sourceContents[4]) as { exceptions: ExceptionDefinition[] }
  ).exceptions;
  const overlays = (JSON.parse(sourceContents[5]) as { overlays: Overlay[] })
    .overlays;

  const decisionIndex = new Map(
    decisions.map((decision) => [decision.id, decision]),
  );
  const exceptionIndex = new Map(
    exceptionDefinitions.map((item) => [item.id, item]),
  );
  const recordDefinitionIndex = new Map(
    records.map((record) => [record.id, record]),
  );
  if (
    RECORD_FAMILY_BY_ID.size !== records.length ||
    records.some((record) => !RECORD_FAMILY_BY_ID.has(record.id)) ||
    [...RECORD_FAMILY_BY_ID.keys()].some(
      (recordId) => !recordDefinitionIndex.has(recordId),
    )
  )
    throw new Error(
      "Explicit record family map must cover exactly 103 canonical records.",
    );
  if (
    RECORD_SPECIFIC_FACT_KEYS.size !== records.length ||
    records.some((record) => !RECORD_SPECIFIC_FACT_KEYS.has(record.id)) ||
    new Set(RECORD_SPECIFIC_FACT_KEYS.values()).size !== records.length
  )
    throw new Error(
      "Definition-specific fact keys must cover exactly 103 canonical records.",
    );

  const organizationSeeds = [
    ["Northstar Vineyard Operations", "estate"],
    ["Alder Crest Estate", "estate"],
    ["Mesa Wind Estate", "estate"],
    ["Riverbend Growers", "grower"],
    ["High Bench Growers", "grower"],
    ["Harbor Cellars", "winery"],
    ["FieldBridge Labor", "labor_provider"],
    ["Coastline Laboratory", "laboratory"],
    ["Terroir Assurance", "certifier"],
  ] as const;
  const organizations = organizationSeeds.map(([name, type], index) => {
    const id = `ORG-${pad(index + 1, 3)}`;
    const slug = name
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, "-")
      .replaceAll(/^-|-$/g, "");
    const value: JsonObject = {
      id,
      stable_identity: `urn:vineyard:organization:${slug}`,
      name,
      type,
      status: "active",
      address: {
        locality: `Synthetic North Coast District ${index + 1}`,
        region: "California",
        country_code: "US",
      },
      provenance: provenance(`organization:${id}`),
    };
    if (index === 1 || index === 2) value.parent_organization_id = "ORG-001";
    return value;
  });

  const propertySeeds = [
    ["PRP-001", "ORG-002", "Alder Crest Ranch", 38.41, -122.52],
    ["PRP-002", "ORG-003", "Mesa Wind Ranch", 38.57, -122.67],
    ["PRP-003", "ORG-004", "Riverbend Contract Vineyard", 38.72, -122.81],
    ["PRP-004", "ORG-005", "High Bench Contract Vineyard", 38.31, -122.39],
  ] as const;
  const properties = propertySeeds.map(
    ([id, organizationId, name, latitude, longitude]) => ({
      id,
      stable_identity: `urn:vineyard:property:${name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`,
      organization_id: organizationId,
      name,
      location: { latitude, longitude },
      timezone: "America/Los_Angeles",
      status: "active",
      provenance: provenance(`property:${id}`),
    }),
  );

  const units: JsonObject[] = [
    ["UNT-001", "acre", "acre", "ac", "area", "us_customary", 1, 0],
    ["UNT-002", "ha", "hectare", "ha", "area", "si", 2.47105, 0],
    ["UNT-003", "ton", "short ton", "ton", "mass", "us_customary", 1, 0],
    ["UNT-004", "kg", "kilogram", "kg", "mass", "si", 0.00110231, 0],
    ["UNT-005", "gal", "gallon", "gal", "volume", "us_customary", 1, 0],
    ["UNT-006", "L", "liter", "L", "volume", "si", 0.264172, 0],
    ["UNT-007", "hr", "hour", "h", "time", "domain", 1, 0],
    ["UNT-008", "count", "count", "#", "count", "dimensionless", 1, 0],
    ["UNT-009", "brix", "degrees Brix", "°Bx", "concentration", "domain", 1, 0],
    [
      "UNT-010",
      "degF",
      "degree Fahrenheit",
      "°F",
      "temperature",
      "us_customary",
      1,
      0,
    ],
    ["UNT-011", "mph", "mile per hour", "mph", "rate", "us_customary", 1, 0],
    [
      "UNT-012",
      "lb_ac",
      "pound per acre",
      "lb/ac",
      "rate",
      "us_customary",
      1,
      0,
    ],
    [
      "UNT-013",
      "percent",
      "percent",
      "%",
      "concentration",
      "dimensionless",
      1,
      0,
    ],
    ["UNT-014", "pH", "pH", "pH", "acidity", "domain", 1, 0],
    ["UNT-015", "g/L", "gram per liter", "g/L", "acidity", "domain", 1, 0],
    ["UNT-016", "inch", "inch", "in", "length", "us_customary", 1, 0],
    [
      "UNT-017",
      "gal/hr",
      "gallon per hour",
      "gal/h",
      "rate",
      "us_customary",
      1,
      0,
    ],
    ["UNT-018", "lb", "pound", "lb", "mass", "us_customary", 1, 0],
    ["UNT-019", "day", "day", "d", "time", "domain", 24, 0],
    [
      "UNT-020",
      "ppm",
      "part per million",
      "ppm",
      "concentration",
      "domain",
      1,
      0,
    ],
    [
      "UNT-021",
      "ton/ac",
      "ton per acre",
      "ton/ac",
      "rate",
      "us_customary",
      1,
      0,
    ],
  ].map(([id, code, name, symbol, dimension, system, scale, offset]) => ({
    id,
    code,
    name,
    symbol,
    dimension,
    system,
    scale_to_base: scale,
    offset_to_base: offset,
  }));

  const blockNames = [
    "Alder Crest East 01",
    "Alder Crest Bench 02",
    "Alder Crest Creek 03",
    "Alder Crest North 04",
    "Mesa Wind South 05",
    "Mesa Wind Knoll 06",
    "Mesa Wind Ridge 07",
    "Mesa Wind West 08",
    "Riverbend Old Channel 09",
    "Riverbend Terrace 10",
    "High Bench Upper 11",
    "High Bench Lower 12",
  ];
  const varieties = [
    "Pinot Noir",
    "Chardonnay",
    "Pinot Noir",
    "Sauvignon Blanc",
    "Cabernet Sauvignon",
    "Merlot",
    "Cabernet Franc",
    "Chardonnay",
    "Pinot Noir",
    "Chardonnay",
    "Cabernet Sauvignon",
    "Sauvignon Blanc",
  ];
  const blocks = blockNames.map((currentName, index) => {
    const number = index + 1;
    const propertyId =
      number <= 4
        ? "PRP-001"
        : number <= 8
          ? "PRP-002"
          : number <= 10
            ? "PRP-003"
            : "PRP-004";
    const operatorId =
      number <= 8 ? "ORG-001" : number <= 10 ? "ORG-004" : "ORG-005";
    const id = `BLK-${pad(number, 3)}`;
    return {
      id,
      stable_identity: `urn:vineyard:block:north-coast-${pad(number, 3)}`,
      property_id: propertyId,
      operating_organization_id: operatorId,
      current_name: currentName,
      status: "active",
      area: {
        value: 11.5 + number * 1.35,
        unit_id: "UNT-001",
        qualifier: "exact",
      },
      variety: varieties[index],
      clone: number % 2 === 0 ? "Composite B" : "Composite A",
      rootstock: number % 3 === 0 ? "110R" : "101-14",
      planted_year: 2008 + (number % 9),
      row_count: 28 + number * 3,
      row_orientation_degrees: (number * 27) % 360,
      certification_ids: [
        number <= 8 ? "CERT-ESTATE-2026" : "CERT-GROWER-2026",
      ],
      provenance: provenance(`block:${id}`),
    };
  });
  const blockAliases: JsonObject[] = blocks.flatMap((block, index) => {
    const blockId = String(block.id);
    const organizationId =
      index < 8 ? "ORG-001" : index < 10 ? "ORG-004" : "ORG-005";
    return [
      {
        id: `BLA-${pad(index * 2 + 1, 3)}`,
        block_id: blockId,
        system: "operations",
        value: `NC-${pad(index + 1, 2)}`,
        organization_id: organizationId,
        effective_from: "2024-01-01",
        status: "current",
        provenance: provenance(`block-alias:${blockId}:operations`),
      },
      {
        id: `BLA-${pad(index * 2 + 2, 3)}`,
        block_id: blockId,
        system: index < 8 ? "cost-accounting" : "winery-intake",
        value: `${index < 8 ? "EST" : "CTR"}-${pad(index + 1, 3)}`,
        organization_id: index < 8 ? "ORG-001" : "ORG-006",
        effective_from: index === 8 ? "2026-10-13" : "2024-01-01",
        status: index === 8 ? "corrected" : "current",
        provenance: provenance(`block-alias:${blockId}:secondary`),
      },
    ];
  });
  blockAliases.push({
    id: "BLA-025",
    block_id: "BLK-009",
    system: "winery-intake",
    value: "CTR-019",
    organization_id: "ORG-006",
    effective_from: "2024-01-01",
    effective_to: "2026-10-12",
    status: "historical",
    provenance: provenance("block-alias:BLK-009:winery-intake-predecessor"),
  });

  const overlayScopes: JsonObject[] = overlays.map((overlay, index) => ({
    id: `SCP-${pad(16 + index, 3)}`,
    name: `${overlay.id} ${overlay.name}`,
    type: "operation",
    entity_ids: [OPERATION_ID],
    workflow_ids: overlay.applies_to,
    status: "active",
    provenance: provenance(`overlay-scope:${overlay.id}`),
  }));
  const scopes: JsonObject[] = [
    {
      id: "SCP-001",
      name: "Full synthetic operation",
      type: "operation",
      entity_ids: [OPERATION_ID],
      workflow_ids: workflows.map((workflow) => workflow.id),
      status: "active",
      provenance: provenance("scope:operation"),
    },
    {
      id: "SCP-002",
      name: "Estate fruit blocks",
      type: "block_set",
      entity_ids: blocks.slice(0, 8).map((block) => block.id),
      workflow_ids: workflows.map((workflow) => workflow.id),
      status: "active",
      provenance: provenance("scope:estate-fruit"),
    },
    {
      id: "SCP-003",
      name: "Contract fruit blocks",
      type: "block_set",
      entity_ids: blocks.slice(8).map((block) => block.id),
      workflow_ids: workflows.map((workflow) => workflow.id),
      status: "active",
      provenance: provenance("scope:contract-fruit"),
    },
    ...blocks.map((block, index) => ({
      id: `SCP-${pad(index + 4, 3)}`,
      name: `${block.current_name} accountable scope`,
      type: "block_set",
      entity_ids: [block.id],
      workflow_ids: workflows.map((workflow) => workflow.id),
      status: "active",
      provenance: provenance(`scope:${block.id}`),
    })),
    ...overlayScopes,
  ];
  const scopeForBlock = (blockId: string): string =>
    `SCP-${pad(Number(blockId.slice(-3)) + 3, 3)}`;

  const roleOrganization = (roleId: string, index: number): string => {
    if (roleId === "ROLE-LAB") return "ORG-008";
    if (
      roleId === "ROLE-CERTIFIER" ||
      roleId === "ROLE-AUDITOR" ||
      roleId === "ROLE-REGULATOR"
    )
      return "ORG-009";
    if (
      roleId === "ROLE-WINEMAKER" ||
      roleId === "ROLE-WINERY-INTAKE" ||
      roleId === "ROLE-GROWER-RELATIONS"
    )
      return "ORG-006";
    if (roleId === "ROLE-CONTRACT-GROWER")
      return index % 2 === 0 ? "ORG-004" : "ORG-005";
    if (roleId === "ROLE-LABOR-CONTRACTOR" || roleId === "ROLE-TRANSPORTATION")
      return "ORG-007";
    return "ORG-001";
  };
  const givenNames = [
    "Elena",
    "Priya",
    "Mateo",
    "Sofia",
    "Luis",
    "Noor",
    "Camila",
    "Jonah",
    "Daria",
    "Rafael",
    "Inez",
    "Owen",
    "Marisol",
    "Theo",
    "Amina",
    "Hugo",
    "Leila",
    "Emil",
    "Valeria",
    "Nico",
    "Aya",
    "Samir",
    "Lucia",
    "Andre",
    "Mina",
    "Tomas",
    "Rina",
    "Pavel",
    "Alma",
    "Diego",
  ];
  const familyNames = [
    "Ortiz",
    "Shah",
    "Ruiz",
    "Alvarez",
    "Mendoza",
    "Rahman",
    "Santos",
    "Beck",
    "Petrov",
    "Silva",
    "Morales",
    "Park",
    "Vega",
    "Martin",
    "Yusuf",
    "Costa",
    "Nguyen",
    "Klein",
    "Rojas",
    "Ferrer",
    "Tan",
    "Khan",
    "Bianchi",
    "Lopes",
    "Chen",
    "Navarro",
    "Ito",
    "Novak",
    "Reyes",
    "Mora",
  ];
  const people = roles.map((role, index) => ({
    id: `PER-${pad(index + 1, 3)}`,
    name: `${givenNames[index]} ${familyNames[index]}`,
    home_organization_id: roleOrganization(role.id, index),
    status: role.layer === "field_execution" ? "seasonal" : "active",
    provenance: provenance(`person:PER-${pad(index + 1, 3)}`),
  }));
  const assignments = roles.map((role, index) => ({
    id: `ASG-${pad(index + 1, 3)}`,
    person_id: `PER-${pad(index + 1, 3)}`,
    role_id: role.id,
    organization_id: roleOrganization(role.id, index),
    scope_ids: ["SCP-001"],
    starts_on: "2026-01-01",
    status: "active",
    authority: assignmentAuthority(role),
    provenance: provenance(`role-assignment:${role.id}`),
  }));
  const assignmentByRole = new Map(
    assignments.map((assignment) => [assignment.role_id, assignment]),
  );
  const contracts: JsonObject[] = [
    [
      "CON-001",
      "fruit_purchase",
      "ORG-006",
      "ORG-004",
      ["SCP-012", "SCP-013"],
      168,
      "accepted",
    ],
    [
      "CON-002",
      "fruit_purchase",
      "ORG-006",
      "ORG-005",
      ["SCP-014", "SCP-015"],
      142,
      "graded",
    ],
    ["CON-003", "labor", "ORG-001", "ORG-007", ["SCP-002"], 3200, "hour"],
  ].map(([id, type, buyer, provider, scopeIds, quantity, basis]) => ({
    id,
    contract_number: `SYN-2026-${String(id).slice(-3)}`,
    type,
    buyer_organization_id: buyer,
    provider_organization_id: provider,
    season_id: SEASON_ID,
    scope_ids: scopeIds,
    effective_from: "2026-01-01",
    effective_to: "2026-12-31",
    status: type === "fruit_purchase" ? "active" : "fulfilled",
    commercial_terms: {
      contracted_quantity: {
        value: quantity,
        unit_id: basis === "hour" ? "UNT-007" : "UNT-003",
        qualifier: "estimated",
      },
      price: {
        amount: basis === "hour" ? 34 : 2850,
        currency: "USD",
        basis_unit_id: basis === "hour" ? "UNT-007" : "UNT-003",
      },
      settlement_basis: basis,
      payment_days: 30,
    },
    quality_terms: {
      specification:
        "Synthetic North Coast composite quality specification with attributed disposition and correction history.",
      rejection_process:
        "Quarantine the affected scope, notify both parties, preserve original evidence, and issue an attributable disposition.",
      required_record_definition_ids:
        type === "fruit_purchase"
          ? ["REC-045", "REC-047", "REC-048", "REC-080"]
          : ["REC-057", "REC-058"],
    },
    delivery_terms: {
      destination:
        type === "fruit_purchase"
          ? "Harbor Cellars synthetic intake"
          : "Assigned synthetic estate blocks",
      notice_hours: type === "fruit_purchase" ? 24 : 12,
      container_responsibility: type === "fruit_purchase" ? "buyer" : "shared",
      freight_responsibility: type === "fruit_purchase" ? "provider" : "shared",
    },
    provenance: provenance(`contract:${id}`),
  }));
  const contractForBlock = (blockId: string): string | undefined => {
    const number = Number(blockId.slice(-3));
    return number === 9 || number === 10
      ? "CON-001"
      : number === 11 || number === 12
        ? "CON-002"
        : undefined;
  };
  const contractsForPlan = (plan: InstancePlan): string[] =>
    unique([
      ...(contractForBlock(plan.blockId)
        ? [String(contractForBlock(plan.blockId))]
        : []),
      ...(["WF-001", "WF-007", "WF-008"].includes(plan.workflow.id)
        ? ["CON-003"]
        : []),
    ]);

  const relationships: JsonObject[] = [
    ["REL-001", "owner_operator", "ORG-002", "ORG-001", []],
    ["REL-002", "owner_operator", "ORG-003", "ORG-001", []],
    ["REL-003", "grower_buyer", "ORG-004", "ORG-006", ["CON-001"]],
    ["REL-004", "grower_buyer", "ORG-005", "ORG-006", ["CON-002"]],
    ["REL-005", "client_contractor", "ORG-001", "ORG-007", ["CON-003"]],
    ["REL-006", "served_by", "ORG-001", "ORG-008", []],
    ["REL-007", "certified_by", "ORG-001", "ORG-009", []],
    ["REL-008", "served_by", "ORG-006", "ORG-008", []],
  ].map(([id, type, from, to, contractIds]) => ({
    id,
    type,
    from_organization_id: from,
    to_organization_id: to,
    starts_on: "2026-01-01",
    status: "active",
    owner_assignment_id: requireValue(
      assignmentByRole.get("ROLE-OWNER-GENERAL-MANAGER"),
      "owner assignment",
    ).id,
    contract_ids: contractIds,
    provenance: provenance(`relationship:${id}`),
  }));

  const equipment: JsonObject[] = [
    [
      "EQP-001",
      "Narrow-row tractor 14",
      "tractor",
      "available",
      ["mowing", "cultivation"],
    ],
    [
      "EQP-002",
      "Airblast sprayer 06",
      "sprayer",
      "available",
      ["calibrated application", "rate logging"],
    ],
    [
      "EQP-003",
      "Mechanical harvester 03",
      "harvester",
      "available",
      ["night harvest", "load identity capture"],
    ],
    [
      "EQP-004",
      "Pump station East",
      "irrigation",
      "operating",
      ["flow metering", "zone delivery"],
    ],
    [
      "EQP-005",
      "Weather station Ridge",
      "weather_station",
      "operating",
      ["wind", "rain", "temperature"],
    ],
    [
      "EQP-006",
      "Field service truck 09",
      "vehicle",
      "available",
      ["repair response", "parts transport"],
    ],
  ].map(([id, name, type, status, capabilities]) => ({
    id,
    stable_identity: `urn:vineyard:equipment:${String(id).toLowerCase()}`,
    organization_id: "ORG-001",
    name,
    type,
    status,
    capabilities,
    last_service_at: "2026-01-05T09:00:00-08:00",
    provenance: provenance(`equipment:${id}`),
  }));
  const materials: JsonObject[] = [
    [
      "MAT-001",
      "Synthetic sulfur suspension",
      "crop_protection",
      "UNT-005",
      24,
      0,
    ],
    [
      "MAT-002",
      "Synthetic biological fungicide",
      "crop_protection",
      "UNT-005",
      4,
      1,
    ],
    ["MAT-003", "Balanced vine nutrient", "fertilizer", "UNT-012", 0, 0],
    ["MAT-004", "Drip-line repair kit", "irrigation_part", "UNT-008", 0, 0],
    ["MAT-005", "Harvest macro-bin", "harvest_supply", "UNT-008", 0, 0],
    ["MAT-006", "Field PPE kit", "safety_supply", "UNT-008", 0, 0],
  ].map(([id, name, type, unitId, rei, phi], index) => ({
    id,
    stable_identity: `urn:vineyard:material:${String(id).toLowerCase()}`,
    organization_id: "ORG-001",
    name,
    type,
    status: index === 5 ? "low" : "available",
    inventory_quantity: {
      value: 42 + index * 17,
      unit_id: unitId,
      qualifier: "exact",
    },
    lot_number: `SYN26-${pad(index + 1, 2)}`,
    expires_on: "2027-06-30",
    restricted_entry_hours: rei,
    preharvest_interval_days: phi,
    provenance: provenance(`material:${id}`),
  }));

  const instancePlans: InstancePlan[] = [];
  let instanceCounter = 0;
  let exceptionCounter = 0;
  for (const workflow of workflows) {
    const selected = selectedExceptionsByWorkflow[workflow.id] ?? [];
    for (let localIndex = 0; localIndex < 5; localIndex += 1) {
      instanceCounter += 1;
      const exceptionId = selected[localIndex];
      const exceptionHistoryId = exceptionId
        ? `EXH-${pad(++exceptionCounter, 4)}`
        : undefined;
      const exceptionPlan = exceptionId
        ? exceptionPath(workflow, exceptionId)
        : undefined;
      instancePlans.push({
        id: `WFI-${pad(instanceCounter, 4)}`,
        workflow,
        instanceNumber: localIndex + 1,
        blockId:
          specializedBlockSequences[workflow.id]?.[localIndex] ??
          blockSequence[localIndex],
        month: requireValue(
          workflowMonths[workflow.id],
          `${workflow.id}: missing month plan`,
        )[localIndex],
        day: 4 + localIndex * 3,
        exceptionId,
        exceptionHistoryId,
        transitions: exceptionPlan?.path ?? normalPath(workflow),
        exceptionTransitionIndex: exceptionPlan?.exceptionIndex,
      });
    }
  }

  const instanceByWorkflowAndNumber = new Map(
    instancePlans.map((plan) => [
      `${plan.workflow.id}:${plan.instanceNumber}`,
      plan,
    ]),
  );
  const recordPlans: RecordPlan[] = [];
  const recordPlanByKey = new Map<string, RecordPlan>();
  const recordKey = (
    plan: InstancePlan,
    recordDefinitionId: string,
  ): string => {
    const sharedWorkflows = sharedRecordWorkflows[recordDefinitionId];
    return sharedWorkflows?.includes(plan.workflow.id)
      ? `${recordDefinitionId}:CASE-${pad(plan.instanceNumber, 2)}`
      : `${recordDefinitionId}:${plan.id}`;
  };
  const ensureRecordPlan = (
    plan: InstancePlan,
    recordDefinitionId: string,
  ): RecordPlan => {
    const key = recordKey(plan, recordDefinitionId);
    const existing = recordPlanByKey.get(key);
    if (existing) return existing;
    const definition = requireValue(
      recordDefinitionIndex.get(recordDefinitionId),
      `${plan.id}: unknown canonical record ${recordDefinitionId}`,
    );
    const sharedWorkflows = sharedRecordWorkflows[recordDefinitionId];
    const participantPlans = sharedWorkflows?.includes(plan.workflow.id)
      ? sharedWorkflows.map((workflowId) =>
          requireValue(
            instanceByWorkflowAndNumber.get(
              `${workflowId}:${plan.instanceNumber}`,
            ),
            `${recordDefinitionId}: missing shared ${workflowId} case ${plan.instanceNumber}`,
          ),
        )
      : [plan];
    const recordPlan: RecordPlan = {
      key,
      id: "",
      definition,
      instancePlans: participantPlans,
      shared: participantPlans.length > 1,
    };
    recordPlans.push(recordPlan);
    recordPlanByKey.set(key, recordPlan);
    return recordPlan;
  };
  for (const plan of instancePlans) {
    const referencedDefinitions = unique(
      plan.transitions.flatMap((transition) => [
        ...transition.record_reads,
        ...transition.record_writes,
      ]),
    );
    for (const recordDefinitionId of referencedDefinitions)
      ensureRecordPlan(plan, recordDefinitionId);
    if (plan.exceptionId) {
      const definition = requireValue(
        exceptionIndex.get(plan.exceptionId),
        `${plan.id}: missing ${plan.exceptionId}`,
      );
      for (const recordDefinitionId of definition.record_ids)
        ensureRecordPlan(plan, recordDefinitionId);
    }
  }
  const chainRecordAssignments: Array<[string, string[]]> = [
    ["WF-004", ["REC-027", "REC-029"]],
    ["WF-005", ["REC-039", "REC-041"]],
    [
      "WF-006",
      ["REC-044", "REC-045", "REC-047", "REC-048", "REC-050", "REC-053"],
    ],
    ["WF-009", ["REC-080", "REC-088"]],
  ];
  for (let instanceNumber = 1; instanceNumber <= 4; instanceNumber += 1)
    for (const [workflowId, recordDefinitionIds] of chainRecordAssignments) {
      const plan = requireValue(
        instanceByWorkflowAndNumber.get(`${workflowId}:${instanceNumber}`),
        `${workflowId}: missing chain case ${instanceNumber}`,
      );
      for (const recordDefinitionId of recordDefinitionIds)
        ensureRecordPlan(plan, recordDefinitionId);
    }
  for (let instanceNumber = 1; instanceNumber <= 5; instanceNumber += 1) {
    const estimatePlan = requireValue(
      instanceByWorkflowAndNumber.get(`WF-004:${instanceNumber}`),
      `WF-004: missing actualization case ${instanceNumber}`,
    );
    ensureRecordPlan(estimatePlan, "REC-033");
    ensureRecordPlan(estimatePlan, "REC-034");
  }
  for (let index = 0; index < records.length; index += 1) {
    const definition = records[index];
    if (recordPlans.some((plan) => plan.definition.id === definition.id))
      continue;
    const workflowId = definition.workflow_ids[0];
    const instanceNumber = (index % 5) + 1;
    ensureRecordPlan(
      requireValue(
        instanceByWorkflowAndNumber.get(`${workflowId}:${instanceNumber}`),
        `${definition.id}: missing supplemental workflow instance`,
      ),
      definition.id,
    );
  }
  recordPlans.push({
    key: "REC-051:CROSS-WORKFLOW-CONTINUITY",
    id: "",
    definition: requireValue(
      recordDefinitionIndex.get("REC-051"),
      "REC-051 continuity definition",
    ),
    instancePlans: [
      requireValue(instanceByWorkflowAndNumber.get("WF-006:5"), "WF-006:5"),
      requireValue(instanceByWorkflowAndNumber.get("WF-007:5"), "WF-007:5"),
    ],
    shared: true,
  });
  recordPlans.push({
    key: "REC-086:CROSS-WORKFLOW-CONTINUITY",
    id: "",
    definition: requireValue(
      recordDefinitionIndex.get("REC-086"),
      "REC-086 continuity definition",
    ),
    instancePlans: [
      requireValue(instanceByWorkflowAndNumber.get("WF-009:5"), "WF-009:5"),
      requireValue(instanceByWorkflowAndNumber.get("WF-010:5"), "WF-010:5"),
    ],
    shared: true,
  });
  const supersessionPlanPairs: Array<{
    predecessor: RecordPlan;
    successor: RecordPlan;
  }> = [];
  for (const [workflowId, instanceNumber, recordDefinitionId] of [
    ["WF-004", 3, "REC-029"],
    ["WF-005", 4, "REC-040"],
    ["WF-006", 2, "REC-045"],
    ["WF-006", 4, "REC-047"],
  ] as Array<[string, number, string]>) {
    const instancePlan = requireValue(
      instanceByWorkflowAndNumber.get(`${workflowId}:${instanceNumber}`),
      `${workflowId}: supersession case ${instanceNumber}`,
    );
    const successor = ensureRecordPlan(instancePlan, recordDefinitionId);
    const predecessor: RecordPlan = {
      key: `${recordDefinitionId}:${instancePlan.id}:PREDECESSOR`,
      id: "",
      definition: successor.definition,
      instancePlans: [instancePlan],
      shared: false,
    };
    recordPlans.push(predecessor);
    supersessionPlanPairs.push({ predecessor, successor });
  }
  recordPlans.forEach((plan, index) => {
    plan.id = `RCI-${pad(index + 1, 5)}`;
  });
  const recordPlanByInstanceId = new Map(
    recordPlans.map((plan) => [plan.id, plan]),
  );
  const recordIdFor = (
    plan: InstancePlan,
    recordDefinitionId: string,
  ): string =>
    requireValue(
      recordPlanByKey.get(recordKey(plan, recordDefinitionId)),
      `${plan.id}: no record plan for ${recordDefinitionId}`,
    ).id;

  const blockIndex = new Map(blocks.map((block) => [block.id, block]));
  const ledgerForPlan = (plan: InstancePlan) => {
    const block = requireValue(blockIndex.get(plan.blockId), plan.blockId);
    const area = Number((block.area as { value: number }).value);
    const caseNumber = plan.instanceNumber;
    const sprayRate = 1.4 + caseNumber * 0.18;
    const sprayTotal = Number((sprayRate * area).toFixed(2));
    const irrigationFlow = 940 + caseNumber * 85;
    const irrigationDuration = 6 + caseNumber * 0.75;
    const irrigationVolume = Number(
      (irrigationFlow * irrigationDuration).toFixed(2),
    );
    const forecastTons = Number((area * (3.1 + caseNumber * 0.12)).toFixed(2));
    const actualTons = Number(
      (forecastTons + (caseNumber - 3) * 1.35).toFixed(2),
    );
    const grossPounds = 18_500 + caseNumber * 1_275;
    const tarePounds = 2_950 + caseNumber * 45;
    const netPounds = grossPounds - tarePounds;
    const deliveryTons = Number((netPounds / 2000).toFixed(4));
    const attendanceHours = 8.5 + caseNumber * 0.25;
    const breakHours = 0.5;
    const payableHours = attendanceHours - breakHours;
    const orderedQuantity = 48 + caseNumber * 6;
    const receivedQuantity = orderedQuantity + (caseNumber === 4 ? -3 : 0);
    const receiptVariance = receivedQuantity - orderedQuantity;
    const settlementGross = Number((deliveryTons * 2850).toFixed(2));
    const settlementAdjustments =
      caseNumber === 3 ? -1250 : caseNumber === 4 ? -850 : 0;
    const settlementNet = settlementGross + settlementAdjustments;
    if (grossPounds - tarePounds !== netPounds)
      throw new Error(`${plan.id}: gross minus tare does not equal net weight`);
    if (Math.abs(netPounds / 2000 - deliveryTons) > 0.0001)
      throw new Error(
        `${plan.id}: net pounds do not reconcile to delivery tons`,
      );
    if (
      Math.abs(settlementGross + settlementAdjustments - settlementNet) > 0.001
    )
      throw new Error(`${plan.id}: settlement arithmetic does not reconcile`);
    return {
      area,
      sprayRate,
      sprayTotal,
      irrigationFlow,
      irrigationDuration,
      irrigationVolume,
      forecastTons,
      actualTons,
      forecastError: Number((actualTons - forecastTons).toFixed(2)),
      brix: Number((21.2 + caseNumber * 0.55).toFixed(1)),
      ph: Number((3.28 + caseNumber * 0.035).toFixed(2)),
      acidity: Number((7.4 - caseNumber * 0.28).toFixed(2)),
      grossPounds,
      tarePounds,
      netPounds,
      deliveryTons,
      attendanceHours,
      breakHours,
      payableHours,
      orderedQuantity,
      receivedQuantity,
      receiptVariance,
      settlementGross,
      settlementAdjustments,
      settlementNet,
      sampleId: `SMP-${plan.blockId.slice(-3)}-${pad(caseNumber, 2)}`,
      loadId: `LOAD-${plan.blockId.slice(-3)}-${pad(caseNumber, 2)}`,
      contractIds: contractsForPlan(plan),
    };
  };
  const eventSpacingMinutes = (plan: InstancePlan): number => {
    if (["WF-006", "WF-007"].includes(plan.workflow.id)) return 90;
    if (plan.workflow.id === "WF-004") return 10_080;
    if (plan.workflow.id === "WF-005") return 2880;
    if (plan.workflow.id === "WF-009") return 2880;
    if (plan.workflow.id === "WF-010") return plan.month <= 7 ? 2880 : 360;
    return 720;
  };
  const eventMeasurements = (
    plan: InstancePlan,
    transition: Transition,
    transitionIndex: number,
  ): JsonObject => {
    const ledger = ledgerForPlan(plan);
    const result: JsonObject = {};
    const q = (value: number, unitId: string, qualifier = "exact") => ({
      value,
      unit_id: unitId,
      qualifier,
    });
    const accessed = new Set([
      ...transition.record_reads,
      ...transition.record_writes,
    ]);
    const reachedStates = new Set(
      plan.transitions
        .slice(0, transitionIndex + 1)
        .map((candidate) => candidate.to),
    );
    if (plan.workflow.id === "WF-001") {
      result.affected_area = q(ledger.area, "UNT-001");
      if (transition.to === "partially_completed") {
        result.completed_area = q(
          Number((ledger.area * 0.6).toFixed(2)),
          "UNT-001",
        );
        result.remaining_area = q(
          Number((ledger.area * 0.4).toFixed(2)),
          "UNT-001",
        );
      }
      if (
        plan.exceptionId === "EXC-005" &&
        transition.to === "correction_required"
      )
        result.reported_area = q(0, "UNT-001");
      if (
        plan.exceptionId === "EXC-005" &&
        ["corrected", "verified"].includes(transition.to)
      )
        result.corrected_area = q(ledger.area, "UNT-001");
      if (
        ["execution", "completion", "correction", "verification"].includes(
          transition.kind,
        )
      )
        result.actual_hours = q(ledger.attendanceHours, "UNT-007");
    }
    if (plan.workflow.id === "WF-002") {
      result.application_area = q(ledger.area, "UNT-001");
      if (accessed.has("REC-012") || accessed.has("REC-015")) {
        result.spray_rate = q(ledger.sprayRate, "UNT-012");
        result.spray_total = q(ledger.sprayTotal, "UNT-018");
      }
      if (transition.to === "preflight_check" || transition.to === "cancelled")
        result.wind_speed = q(
          plan.exceptionId === "EXC-006" && transition.to === "cancelled"
            ? 24
            : 4 + plan.instanceNumber,
          "UNT-011",
        );
      if (plan.exceptionId === "EXC-009" && transition.to === "cancelled") {
        result.rei_remaining_hours = q(18, "UNT-007");
        result.preharvest_interval_remaining = q(2, "UNT-019");
      }
    }
    if (plan.workflow.id === "WF-003") {
      if (accessed.has("REC-022"))
        result.planned_flow = q(ledger.irrigationFlow, "UNT-017", "estimated");
      if (accessed.has("REC-023") && plan.exceptionId !== "EXC-016") {
        result.irrigation_flow = q(ledger.irrigationFlow, "UNT-017");
        result.duration = q(ledger.irrigationDuration, "UNT-007");
        result.delivered_volume = q(ledger.irrigationVolume, "UNT-005");
      }
    }
    if (plan.workflow.id === "WF-004") {
      if (accessed.has("REC-029") || accessed.has("REC-030"))
        result.forecast = q(ledger.forecastTons, "UNT-003", "estimated");
      if (
        reachedStates.has("actualized") &&
        (accessed.has("REC-033") || accessed.has("REC-034"))
      ) {
        result.actual = q(ledger.actualTons, "UNT-003");
        result.forecast_error = q(ledger.forecastError, "UNT-003");
      }
    }
    if (
      plan.workflow.id === "WF-005" &&
      ["REC-037", "REC-038", "REC-039", "REC-041"].some((id) =>
        accessed.has(id),
      )
    ) {
      result.soluble_solids = q(ledger.brix, "UNT-009");
      result.acidity = q(ledger.ph, "UNT-014");
      result.titratable_acidity = q(ledger.acidity, "UNT-015");
    }
    if (plan.workflow.id === "WF-006") {
      if (reachedStates.has("weighed") && accessed.has("REC-047")) {
        result.gross_weight = q(ledger.grossPounds, "UNT-018");
        result.tare_weight = q(ledger.tarePounds, "UNT-018");
        result.net_weight = q(ledger.netPounds, "UNT-018");
      }
      if (accessed.has("REC-050") || accessed.has("REC-053"))
        result.delivered_tons = q(ledger.deliveryTons, "UNT-003");
    }
    if (plan.workflow.id === "WF-007") {
      if (accessed.has("REC-057"))
        result.attendance = q(ledger.attendanceHours, "UNT-007");
      if (accessed.has("REC-058"))
        result.break_time = q(ledger.breakHours, "UNT-007");
      if (["REC-059", "REC-063"].some((id) => accessed.has(id)))
        result.payable_time = q(ledger.payableHours, "UNT-007");
    }
    if (plan.workflow.id === "WF-008") {
      if (
        ["demand_identified", "availability_checked", "unavailable"].includes(
          transition.to,
        )
      )
        result.resource_demand = q(
          ledger.orderedQuantity,
          "UNT-008",
          "estimated",
        );
      if (
        ["purchase_requested", "approved", "substitution_pending"].includes(
          transition.to,
        )
      )
        result.approved_quantity = q(ledger.orderedQuantity, "UNT-008");
      if (
        reachedStates.has("ordered") &&
        (accessed.has("REC-069") || transition.to === "ordered")
      )
        result.ordered = q(ledger.orderedQuantity, "UNT-008");
      if (
        reachedStates.has("received") &&
        (accessed.has("REC-070") || transition.to === "received")
      ) {
        result.received = q(ledger.receivedQuantity, "UNT-008");
        result.variance = q(ledger.receiptVariance, "UNT-008");
      }
    }
    if (plan.workflow.id === "WF-009") {
      if (accessed.has("REC-080"))
        result.contracted = q(ledger.forecastTons, "UNT-003", "estimated");
      if (accessed.has("REC-088"))
        result.accepted = q(ledger.deliveryTons, "UNT-003");
    }
    if (plan.workflow.id === "WF-010") {
      if (["REC-099", "REC-101", "REC-103"].some((id) => accessed.has(id))) {
        const hasOpenGap = [
          "gap_identified",
          "corrective_action_open",
          "remediation_in_progress",
        ].includes(transition.to);
        const resubmitted = transition.to === "evidence_resubmitted";
        const compliant = transition.to === "compliant";
        result.evidence_complete = q(
          compliant
            ? 100
            : resubmitted
              ? 98
              : hasOpenGap
                ? 72 + plan.instanceNumber
                : 92 + plan.instanceNumber,
          "UNT-013",
        );
        result.required_items_missing = q(
          compliant || resubmitted ? 0 : hasOpenGap ? 3 : 1,
          "UNT-008",
        );
      }
      if (
        transition.to.includes("corrective") ||
        transition.to.includes("remediation")
      )
        result.correction_window = q(10 + plan.instanceNumber, "UNT-019");
    }
    return result;
  };

  const events: JsonObject[] = [];
  const eventsByInstance = new Map<string, JsonObject[]>();
  const offlineCapturePlans = new Set([
    "WF-001:1",
    "WF-002:2",
    "WF-003:3",
    "WF-005:1",
    "WF-007:4",
    "WF-008:1",
  ]);
  const conflictResolutionPlans = new Set([
    "WF-002:3",
    "WF-006:2",
    "WF-007:2",
    "WF-008:2",
    "WF-009:1",
    "WF-010:1",
  ]);
  let eventCounter = 0;
  for (const plan of instancePlans) {
    const instanceEvents: JsonObject[] = [];
    const spacingMinutes = eventSpacingMinutes(plan);
    const firstActualizedTransitionIndex = plan.transitions.findIndex(
      (candidate) => candidate.to === "actualized",
    );
    for (
      let transitionIndex = 0;
      transitionIndex < plan.transitions.length;
      transitionIndex += 1
    ) {
      const transition = plan.transitions[transitionIndex];
      eventCounter += 1;
      const id = `EVT-${pad(eventCounter, 5)}`;
      const harvestAlignmentDelayDays = [33, 34, 34, 33, 33];
      const postPublishHarvestDelay =
        plan.workflow.id === "WF-004" &&
        transitionIndex >= firstActualizedTransitionIndex
          ? requireValue(
              harvestAlignmentDelayDays[plan.instanceNumber - 1],
              `${plan.id}: missing harvest alignment delay`,
            ) *
            24 *
            60
          : 0;
      const occurredMinuteOffset =
        360 + transitionIndex * spacingMinutes + postPublishHarvestDelay;
      const occurredAt = sourceTimestamp(
        plan.month,
        plan.day,
        occurredMinuteOffset,
      );
      const planCaseKey = `${plan.workflow.id}:${plan.instanceNumber}`;
      const isOfflineCase =
        offlineCapturePlans.has(planCaseKey) && transitionIndex < 2;
      const isConflictCase =
        conflictResolutionPlans.has(planCaseKey) &&
        transitionIndex === plan.exceptionTransitionIndex;
      const offlineDelayMinutes = plan.workflow.id === "WF-007" ? 5 : 480;
      const recordedAt = isOfflineCase
        ? sourceTimestamp(
            plan.month,
            plan.day,
            occurredMinuteOffset + offlineDelayMinutes,
          )
        : sourceTimestamp(plan.month, plan.day, occurredMinuteOffset + 5);
      const assignment = requireValue(
        assignmentByRole.get(transition.owner),
        `${plan.workflow.id}/${transition.id}: no assignment for ${transition.owner}`,
      );
      const transitionExceptions =
        plan.exceptionId &&
        plan.exceptionHistoryId &&
        transitionIndex >=
          (plan.exceptionTransitionIndex ?? Number.POSITIVE_INFINITY)
          ? [plan.exceptionHistoryId]
          : [];
      const transitionDecisions = transition.decision_ids.map((decisionId) =>
        requireValue(
          decisionIndex.get(decisionId),
          `${transition.id}: missing canonical ${decisionId}`,
        ),
      );
      const augmentedRecordReads = [...transition.record_reads];
      const augmentedRecordWrites = [...transition.record_writes];
      if (plan.workflow.id === "WF-004" && transition.to === "actualized") {
        augmentedRecordReads.push("REC-029");
        augmentedRecordWrites.push("REC-033");
      }
      if (plan.workflow.id === "WF-004" && transition.to === "reconciled") {
        augmentedRecordReads.push("REC-029", "REC-033");
        augmentedRecordWrites.push("REC-034");
      }
      const recordReads = unique(augmentedRecordReads).filter(
        (recordId) =>
          !(
            plan.workflow.id === "WF-004" &&
            recordId === "REC-033" &&
            transitionIndex < firstActualizedTransitionIndex
          ),
      );
      const recordWrites = unique(augmentedRecordWrites).filter(
        (recordId) =>
          !(
            plan.workflow.id === "WF-004" &&
            recordId === "REC-033" &&
            transitionIndex < firstActualizedTransitionIndex
          ),
      );
      const event: JsonObject = {
        id,
        sequence: eventCounter,
        operation_id: OPERATION_ID,
        workflow_instance_id: plan.id,
        workflow_id: plan.workflow.id,
        transition_id: transition.id,
        from_state: transition.from,
        to_state: transition.to,
        kind: transition.kind,
        occurred_at: occurredAt,
        recorded_at: recordedAt,
        actor_assignment_id: assignment.id,
        scope_id: scopeForBlock(plan.blockId),
        reason: transition.description,
        correlation_id: `CRL-${pad(instanceCounter - 50 + Number(plan.id.slice(-4)), 4)}`,
        record_reads: recordReads.map((recordId) =>
          recordIdFor(plan, recordId),
        ),
        record_writes: recordWrites.map((recordId) =>
          recordIdFor(plan, recordId),
        ),
        decision_ids: transition.decision_ids,
        decision_results: transitionDecisions.map((decision) =>
          decisionResult(decision, transition),
        ),
        exception_history_ids: transitionExceptions,
        connectivity: isOfflineCase
          ? {
              mode: "offline",
              captured_offline: true,
              device_recorded_at: occurredAt,
              synced_at: recordedAt,
              sync_status: "synced",
            }
          : isConflictCase
            ? {
                mode: "intermittent",
                captured_offline: false,
                synced_at: recordedAt,
                sync_status: "resolved",
                conflict_record_instance_ids: [
                  recordIdFor(
                    plan,
                    requireValue(
                      recordWrites[0] ?? recordReads[0],
                      `${transition.id}: conflict has no record`,
                    ),
                  ),
                ],
              }
            : {
                mode: "online",
                captured_offline: false,
                synced_at: recordedAt,
                sync_status: "synced",
              },
        provenance: provenance(`event:${id}`, recordedAt, assignment.person_id),
        version: {
          number: 1,
          recorded_at: recordedAt,
          recorded_by_person_id: assignment.person_id,
        },
      };
      if (transitionIndex > 0)
        event.cause_event_id = String(instanceEvents.at(-1)?.id);
      event.measurements = eventMeasurements(
        plan,
        {
          ...transition,
          record_reads: recordReads,
          record_writes: recordWrites,
        },
        transitionIndex,
      );
      if (isOfflineCase)
        event.notes =
          "Field observation captured without service and synchronized later with original effective time intact.";
      instanceEvents.push(event);
      events.push(event);
    }
    eventsByInstance.set(plan.id, instanceEvents);
  }
  events.sort(
    (left, right) =>
      timestampMinutes(String(left.recorded_at)) -
        timestampMinutes(String(right.recorded_at)) ||
      timestampMinutes(String(left.occurred_at)) -
        timestampMinutes(String(right.occurred_at)) ||
      String(left.workflow_instance_id).localeCompare(
        String(right.workflow_instance_id),
      ) ||
      Number(left.sequence) - Number(right.sequence),
  );
  const eventIdMap = new Map<string, string>();
  events.forEach((event, index) => {
    const previousId = String(event.id);
    const nextId = `EVT-${pad(index + 1, 5)}`;
    eventIdMap.set(previousId, nextId);
    event.id = nextId;
    event.sequence = index + 1;
    (event.provenance as JsonObject).source_ref = `event:${nextId}`;
  });
  for (const event of events) {
    if (event.cause_event_id)
      event.cause_event_id = requireValue(
        eventIdMap.get(String(event.cause_event_id)),
        `${event.id}: missing remapped cause event`,
      );
  }

  const workflowInstances: JsonObject[] = instancePlans.map((plan) => {
    const instanceEvents = requireValue(
      eventsByInstance.get(plan.id),
      `${plan.id}: events missing`,
    );
    const lastEvent = requireValue(
      instanceEvents.at(-1),
      `${plan.id}: last event missing`,
    );
    const ownerRole = plan.workflow.roles.includes("ROLE-VINEYARD-MANAGER")
      ? "ROLE-VINEYARD-MANAGER"
      : plan.workflow.roles[0];
    const ownerAssignment = requireValue(
      assignmentByRole.get(ownerRole),
      `${plan.id}: owner missing`,
    );
    const participants = unique(
      plan.workflow.roles
        .map((roleId) => assignmentByRole.get(roleId)?.id)
        .filter((id): id is string => Boolean(id)),
    );
    const terminalState = String(lastEvent.to_state);
    const contractIds = contractsForPlan(plan);
    const value: JsonObject = {
      id: plan.id,
      operation_id: OPERATION_ID,
      workflow_id: plan.workflow.id,
      season_id: SEASON_ID,
      scope_id: scopeForBlock(plan.blockId),
      title: `${plan.workflow.name} — ${plan.blockId} season case ${plan.instanceNumber}`,
      trigger: plan.exceptionId
        ? `${plan.workflow.triggers[0]} with ${requireValue(exceptionIndex.get(plan.exceptionId), plan.exceptionId).name.toLowerCase()}`
        : plan.workflow.triggers[0],
      current_state: terminalState,
      status:
        terminalState === "cancelled"
          ? "cancelled"
          : terminalState === "superseded"
            ? "superseded"
            : "completed",
      owner_assignment_id: ownerAssignment.id,
      participant_assignment_ids: participants,
      started_at: String(instanceEvents[0].occurred_at),
      completed_at: String(lastEvent.occurred_at),
      last_event_id: String(lastEvent.id),
      related_workflow_instance_ids: instancePlans
        .filter(
          (other) =>
            other.instanceNumber === plan.instanceNumber &&
            other.id !== plan.id,
        )
        .map((other) => other.id),
      version: {
        number: 1,
        recorded_at: String(lastEvent.recorded_at),
        recorded_by_person_id: ownerAssignment.person_id,
      },
    };
    if (contractIds.length > 0) value.contract_ids = contractIds;
    return value;
  });

  const recordInstances: JsonObject[] = recordPlans.map((recordPlan, index) => {
    const record = recordPlan.definition;
    const historicalPredecessor = recordPlan.key.endsWith(":PREDECESSOR");
    const supersessionSuccessor = supersessionPlanPairs.some(
      (pair) => pair.successor === recordPlan,
    );
    const plans = recordPlan.instancePlans;
    const primaryPlan = requireValue(
      plans[0],
      `${recordPlan.key}: no workflow instance`,
    );
    const ownerRole =
      record.responsible_roles.find((roleId) => assignmentByRole.has(roleId)) ??
      primaryPlan.workflow.roles[0];
    const ownerAssignment = requireValue(
      assignmentByRole.get(ownerRole),
      `${record.id}: no owner assignment`,
    );
    const id = recordPlan.id;
    const correctionFieldPath =
      primaryPlan.exceptionId && record.id === "REC-015"
        ? "/facts/domain_details/evidence_completeness/value"
        : primaryPlan.exceptionId && record.id === "REC-050"
          ? "/facts/domain_details/entered_delivery_tons/value"
          : primaryPlan.exceptionId && record.id === "REC-059"
            ? "/facts/domain_details/payable_time/value"
            : primaryPlan.exceptionId === "EXC-037" && record.id === "REC-062"
              ? "/facts/domain_details/corrected_hours/value"
              : primaryPlan.exceptionId && record.id === "REC-063"
                ? "/facts/domain_details/allocated_cost/amount"
                : primaryPlan.exceptionId && record.id === "REC-101"
                  ? "/facts/domain_details/evidence_completeness/value"
                  : undefined;
    const corrected = Boolean(correctionFieldPath);
    const contractIds = unique(plans.flatMap((plan) => contractsForPlan(plan)));
    const planIds = new Set(plans.map((plan) => plan.id));
    const associatedEvents = events
      .filter(
        (event) =>
          planIds.has(String(event.workflow_instance_id)) &&
          (
            [
              ...(event.record_reads as string[]),
              ...(event.record_writes as string[]),
            ] as string[]
          ).includes(id),
      )
      .sort((left, right) =>
        String(left.occurred_at).localeCompare(String(right.occurred_at)),
      );
    const writeEvents = associatedEvents.filter((event) =>
      (event.record_writes as string[]).includes(id),
    );
    const firstAssociatedEvent = associatedEvents[0];
    const sourceEvent =
      firstAssociatedEvent &&
      (firstAssociatedEvent.record_writes as string[]).includes(id)
        ? firstAssociatedEvent
        : undefined;
    let effectiveAt = associatedEvents[0]?.occurred_at
      ? String(associatedEvents[0].occurred_at)
      : sourceTimestamp(primaryPlan.month, primaryPlan.day, 360);
    const lastWrittenEvent = [...writeEvents]
      .sort(
        (left, right) =>
          timestampMinutes(String(left.recorded_at)) -
          timestampMinutes(String(right.recorded_at)),
      )
      .at(-1);
    const lastAssociatedEvent = [...associatedEvents]
      .sort(
        (left, right) =>
          timestampMinutes(String(left.recorded_at)) -
          timestampMinutes(String(right.recorded_at)),
      )
      .at(-1);
    let versionRecordedAt = lastWrittenEvent?.recorded_at
      ? String(lastWrittenEvent.recorded_at)
      : lastAssociatedEvent?.recorded_at
        ? String(lastAssociatedEvent.recorded_at)
        : sourceTimestamp(primaryPlan.month, primaryPlan.day, 365);
    let recordedAt = sourceEvent?.occurred_at
      ? String(sourceEvent.occurred_at)
      : firstAssociatedEvent?.occurred_at
        ? String(firstAssociatedEvent.occurred_at)
        : sourceTimestamp(primaryPlan.month, primaryPlan.day, 360);
    if (
      corrected &&
      timestampMinutes(versionRecordedAt) <= timestampMinutes(recordedAt)
    )
      versionRecordedAt = sourceTimestamp(
        primaryPlan.month,
        primaryPlan.day,
        425 + primaryPlan.transitions.length * eventSpacingMinutes(primaryPlan),
      );
    const preferredStates = corrected
      ? ["corrected"]
      : ["archived", "settled", "verified", "active", "recorded", "approved"];
    let lifecycleState =
      preferredStates.find((state) => record.lifecycle.includes(state)) ??
      record.lifecycle.at(-1);
    if (historicalPredecessor) {
      effectiveAt = sourceTimestamp(primaryPlan.month, primaryPlan.day, 300);
      recordedAt = sourceTimestamp(primaryPlan.month, primaryPlan.day, 305);
      versionRecordedAt = recordedAt;
      lifecycleState = "superseded";
    }
    if (record.id === "REC-033") {
      const actualizedEvent = (eventsByInstance.get(primaryPlan.id) ?? []).find(
        (event) => event.to_state === "actualized",
      );
      if (actualizedEvent) {
        effectiveAt = String(actualizedEvent.occurred_at);
        recordedAt = String(actualizedEvent.recorded_at);
        versionRecordedAt = lastWrittenEvent?.recorded_at
          ? String(lastWrittenEvent.recorded_at)
          : recordedAt;
      }
    }
    const family = recordFamily(record.id);
    const ledger = ledgerForPlan(primaryPlan);
    const fieldCrewAssignment = requireValue(
      assignmentByRole.get("ROLE-FIELD-CREW"),
      `${record.id}: field crew assignment`,
    );
    const payrollAssignment = requireValue(
      assignmentByRole.get("ROLE-PAYROLL"),
      `${record.id}: payroll assignment`,
    );
    const supervisorAssignment = requireValue(
      assignmentByRole.get("ROLE-VINEYARD-MANAGER"),
      `${record.id}: supervisor assignment`,
    );
    const payrollVarianceHours =
      primaryPlan.exceptionId === "EXC-037" ? 1.25 : 0;
    const submittedPayrollHours = Number(
      (ledger.payableHours + payrollVarianceHours).toFixed(2),
    );
    const correctedPayrollHours = ledger.payableHours;
    const hourlyRate = 28 + primaryPlan.instanceNumber;
    const laborHours = (value: number): JsonObject => ({
      value,
      unit_id: "UNT-007",
      qualifier: "exact",
    });
    const laborMoney = (amount: number): JsonObject => ({
      amount,
      currency: "USD",
    });
    const familyDetails: Record<string, JsonObject> = {
      planning_recommendation: {
        priority: primaryPlan.exceptionId ? "urgent" : "planned",
        target_area: {
          value: ledger.area,
          unit_id: "UNT-001",
          qualifier: "exact",
        },
        recommendation_result: primaryPlan.exceptionId
          ? "revised_with_constraint"
          : "approved_for_season",
      },
      assignment_authorization_communication: {
        assigned_scope: {
          entity_type: "block",
          entity_id: primaryPlan.blockId,
        },
        acknowledgement_status: "acknowledged",
        notice_window: {
          value: 24 + primaryPlan.instanceNumber * 4,
          unit_id: "UNT-007",
          qualifier: "exact",
        },
      },
      observation_sample_result: {
        sample_id: ledger.sampleId,
        soluble_solids: {
          value: ledger.brix,
          unit_id: "UNT-009",
          qualifier: "exact",
        },
        observation_result: primaryPlan.exceptionId
          ? "review_required"
          : "within_expected_range",
      },
      execution_actual_log: {
        completed_area: {
          value: ledger.area,
          unit_id: "UNT-001",
          qualifier: "exact",
        },
        actual_hours: {
          value: ledger.attendanceHours,
          unit_id: "UNT-007",
          qualifier: "exact",
        },
        execution_result: primaryPlan.exceptionId
          ? "completed_after_recovery"
          : "completed_as_planned",
      },
      lifecycle_history_correction: {
        prior_state: corrected ? "disputed" : "recorded",
        current_state: lifecycleState,
        history_result: corrected
          ? "successor_version_retained"
          : "history_current",
      },
      restriction_verification: {
        restricted_entry: { value: 24, unit_id: "UNT-007", qualifier: "exact" },
        preharvest_interval: {
          value: 1 + primaryPlan.instanceNumber,
          unit_id: "UNT-019",
          qualifier: "exact",
        },
        verification_result: primaryPlan.exceptionId
          ? "resolved_with_evidence"
          : "verified_clear",
      },
      report_evidence_package: {
        evidence_completeness: {
          value: 92 + primaryPlan.instanceNumber,
          unit_id: "UNT-013",
          qualifier: "exact",
        },
        artifact_count: {
          value: 8 + primaryPlan.instanceNumber,
          unit_id: "UNT-008",
          qualifier: "exact",
        },
        report_status: primaryPlan.exceptionId
          ? "corrected_and_resubmitted"
          : "accepted",
      },
      identity_lineage_contract: {
        stable_subject: {
          entity_type: "block",
          entity_id: primaryPlan.blockId,
        },
        alias_status:
          primaryPlan.exceptionId === "EXC-051" ? "corrected" : "matched",
        identity_result: "stable_identity_preserved",
      },
      commercial_reconciliation: {
        load_id: ledger.loadId,
        gross_weight: {
          value: ledger.grossPounds,
          unit_id: "UNT-018",
          qualifier: "exact",
        },
        tare_weight: {
          value: ledger.tarePounds,
          unit_id: "UNT-018",
          qualifier: "exact",
        },
        net_weight: {
          value: ledger.netPounds,
          unit_id: "UNT-018",
          qualifier: "exact",
        },
        settlement_gross: { amount: ledger.settlementGross, currency: "USD" },
        settlement_adjustments: {
          amount: ledger.settlementAdjustments,
          currency: "USD",
        },
        settlement_net: { amount: ledger.settlementNet, currency: "USD" },
        reconciliation_status: primaryPlan.exceptionId
          ? "corrected"
          : "settled",
      },
      labor_payroll_exception: {
        worker: {
          entity_type: "person",
          entity_id: String(fieldCrewAssignment.person_id),
        },
        assignment: {
          entity_type: "assignment",
          entity_id: String(fieldCrewAssignment.id),
        },
        workflow_instance: {
          entity_type: "workflow_instance",
          entity_id: primaryPlan.id,
        },
        submitted_hours: laborHours(submittedPayrollHours),
        corrected_hours: laborHours(correctedPayrollHours),
        variance_hours: laborHours(payrollVarianceHours),
        rate_basis: {
          kind: "hourly",
          hourly_rate: laborMoney(hourlyRate),
          time_unit_id: "UNT-007",
        },
        exception_reason:
          primaryPlan.exceptionId === "EXC-037"
            ? "Worker absence created a crew-short time variance requiring an attributable payroll correction."
            : "No payroll variance remained after supervisor verification.",
        exception_id: primaryPlan.exceptionId === "EXC-037" ? "EXC-037" : null,
        amount_owed: laborMoney(
          Number((correctedPayrollHours * hourlyRate).toFixed(2)),
        ),
        authority: {
          payroll_assignment: {
            entity_type: "assignment",
            entity_id: String(payrollAssignment.id),
          },
          supervisor_assignment: {
            entity_type: "assignment",
            entity_id: String(supervisorAssignment.id),
          },
          decision_id: "DEC-064",
          authority_status: corrected
            ? "correction_authorized"
            : "verified_for_acceptance",
        },
        lineage: {
          record: { entity_type: "record_instance", entity_id: id },
          source_event_ids: associatedEvents.map((event) => String(event.id)),
          base_version: 1,
          current_version: corrected ? 2 : 1,
          lineage_status: corrected
            ? "successor_retains_submitted_hours"
            : "submitted_hours_accepted_without_correction",
        },
        resolution: {
          resolution_status: corrected ? "corrected" : "accepted",
          resolved_hours: laborHours(correctedPayrollHours),
          resolved_amount: laborMoney(
            Number((correctedPayrollHours * hourlyRate).toFixed(2)),
          ),
          original_submission_retained: true,
        },
      },
      labor_roster: {
        attendance: {
          value: ledger.attendanceHours,
          unit_id: "UNT-007",
          qualifier: "exact",
        },
        break_time: {
          value: ledger.breakHours,
          unit_id: "UNT-007",
          qualifier: "exact",
        },
        payable_time: {
          value: ledger.payableHours,
          unit_id: "UNT-007",
          qualifier: "exact",
        },
        payroll_status: primaryPlan.exceptionId ? "corrected" : "accepted",
      },
      inventory_receipt: {
        ordered_quantity: {
          value: ledger.orderedQuantity,
          unit_id: "UNT-008",
          qualifier: "exact",
        },
        received_quantity: {
          value: ledger.receivedQuantity,
          unit_id: "UNT-008",
          qualifier: "exact",
        },
        receipt_variance: {
          value: ledger.receiptVariance,
          unit_id: "UNT-008",
          qualifier: "exact",
        },
        receipt_status: ledger.receiptVariance === 0 ? "matched" : "corrected",
      },
      corrective_finding: {
        finding_id: `FND-${primaryPlan.id.slice(-4)}-${record.id.slice(-3)}`,
        root_cause: primaryPlan.exceptionId
          ? "source evidence or operating state conflict"
          : "preventive review",
        action_status: corrected
          ? "corrected_and_verified"
          : "closed_with_evidence",
        closure_verified: true,
      },
    };
    const workflowMetrics: Record<string, JsonObject> = {
      "WF-001": {
        seasonal_area: {
          value: ledger.area,
          unit_id: "UNT-001",
          qualifier: "exact",
        },
      },
      "WF-002": {
        spray_rate: {
          value: ledger.sprayRate,
          unit_id: "UNT-012",
          qualifier: "exact",
        },
        spray_total: {
          value: ledger.sprayTotal,
          unit_id: "UNT-018",
          qualifier: "exact",
        },
      },
      "WF-003": {
        irrigation_flow: {
          value: ledger.irrigationFlow,
          unit_id: "UNT-017",
          qualifier: "exact",
        },
        irrigation_duration: {
          value: ledger.irrigationDuration,
          unit_id: "UNT-007",
          qualifier: "exact",
        },
        delivered_volume: {
          value: ledger.irrigationVolume,
          unit_id: "UNT-005",
          qualifier: "exact",
        },
      },
      "WF-004": {
        forecast: {
          value: ledger.forecastTons,
          unit_id: "UNT-003",
          qualifier: "estimated",
        },
        actual: {
          value: ledger.actualTons,
          unit_id: "UNT-003",
          qualifier: "exact",
        },
        forecast_error: {
          value: ledger.forecastError,
          unit_id: "UNT-003",
          qualifier: "exact",
        },
      },
      "WF-005": {
        sample_id: ledger.sampleId,
        brix: { value: ledger.brix, unit_id: "UNT-009", qualifier: "exact" },
        ph: { value: ledger.ph, unit_id: "UNT-014", qualifier: "exact" },
      },
      "WF-006": {
        load_id: ledger.loadId,
        net_weight: {
          value: ledger.netPounds,
          unit_id: "UNT-018",
          qualifier: "exact",
        },
      },
      "WF-007": {
        payable_time: {
          value: ledger.payableHours,
          unit_id: "UNT-007",
          qualifier: "exact",
        },
      },
      "WF-008": {
        receipt_variance: {
          value: ledger.receiptVariance,
          unit_id: "UNT-008",
          qualifier: "exact",
        },
      },
      "WF-009": {
        relationship_status: primaryPlan.exceptionId ? "reconciled" : "active",
      },
      "WF-010": {
        evidence_status: primaryPlan.exceptionId ? "corrected" : "complete",
      },
    };
    let recordWorkflowMetrics: JsonObject = {};
    if (primaryPlan.workflow.id === "WF-001")
      recordWorkflowMetrics = {
        seasonal_area: (workflowMetrics["WF-001"] as JsonObject).seasonal_area,
      };
    if (
      primaryPlan.workflow.id === "WF-002" &&
      ["REC-011", "REC-012", "REC-015", "REC-016", "REC-017"].includes(
        record.id,
      )
    )
      recordWorkflowMetrics = workflowMetrics["WF-002"];
    if (primaryPlan.workflow.id === "WF-003")
      recordWorkflowMetrics = ["REC-023", "REC-026"].includes(record.id)
        ? workflowMetrics["WF-003"]
        : {
            planned_flow: (workflowMetrics["WF-003"] as JsonObject)
              .irrigation_flow,
          };
    if (primaryPlan.workflow.id === "WF-004") {
      const metrics = workflowMetrics["WF-004"] as JsonObject;
      if (["REC-029", "REC-030"].includes(record.id))
        recordWorkflowMetrics = { forecast: metrics.forecast };
      if (record.id === "REC-033")
        recordWorkflowMetrics = { actual: metrics.actual };
      if (record.id === "REC-034")
        recordWorkflowMetrics = {
          actual: metrics.actual,
          forecast_error: metrics.forecast_error,
        };
    }
    if (
      primaryPlan.workflow.id === "WF-005" &&
      [
        "REC-035",
        "REC-036",
        "REC-037",
        "REC-038",
        "REC-039",
        "REC-041",
      ].includes(record.id)
    )
      recordWorkflowMetrics = workflowMetrics["WF-005"];
    if (primaryPlan.workflow.id === "WF-006") {
      if (record.id === "REC-047")
        recordWorkflowMetrics = workflowMetrics["WF-006"];
      if (["REC-050", "REC-053"].includes(record.id))
        recordWorkflowMetrics = {
          load_id: ledger.loadId,
          delivered_tons: {
            value: ledger.deliveryTons,
            unit_id: "UNT-003",
            qualifier: "exact",
          },
        };
    }
    if (
      primaryPlan.workflow.id === "WF-007" &&
      [
        "REC-057",
        "REC-058",
        "REC-059",
        "REC-060",
        "REC-061",
        "REC-062",
        "REC-063",
      ].includes(record.id)
    )
      recordWorkflowMetrics = workflowMetrics["WF-007"];
    if (
      primaryPlan.workflow.id === "WF-008" &&
      ["REC-069", "REC-070", "REC-074"].includes(record.id)
    )
      recordWorkflowMetrics = workflowMetrics["WF-008"];
    if (primaryPlan.workflow.id === "WF-009")
      recordWorkflowMetrics = workflowMetrics["WF-009"];
    if (primaryPlan.workflow.id === "WF-010")
      recordWorkflowMetrics = workflowMetrics["WF-010"];
    const facts: JsonObject = {
      domain_kind: family,
      record_instance_key: recordPlan.key,
      canonical_record_name: record.name,
      season_year: 2026,
      state_result: corrected ? "corrected" : lifecycleState,
      operational_subject: {
        entity_type: "block",
        entity_id: primaryPlan.blockId,
      },
      workflow_subjects: plans.map((plan) => ({
        entity_type: "workflow_instance",
        entity_id: plan.id,
      })),
      domain_details: requireValue(
        familyDetails[family],
        `${record.id}: family ${family}`,
      ),
      workflow_metrics: recordWorkflowMetrics,
    };
    const specificFactKey = requireValue(
      RECORD_SPECIFIC_FACT_KEYS.get(record.id),
      `${record.id}: definition-specific fact key`,
    );
    const quantity = (
      value: number,
      unitId: string,
      qualifier = "exact",
    ): JsonObject => ({ value, unit_id: unitId, qualifier });
    const count = (value: number): JsonObject => quantity(value, "UNT-008");
    const hours = (value: number): JsonObject => quantity(value, "UNT-007");
    const money = (amount: number): JsonObject => ({ amount, currency: "USD" });
    let specificFactValue: unknown;
    switch (record.id) {
      case "REC-001":
        specificFactValue = quantity(
          14 + primaryPlan.instanceNumber * 7,
          "UNT-019",
          "estimated",
        );
        break;
      case "REC-002":
        specificFactValue = primaryPlan.exceptionId
          ? "high_requires_review"
          : "moderate_monitored";
        break;
      case "REC-003":
        specificFactValue = "acknowledged_by_accountable_assignee";
        break;
      case "REC-004":
        specificFactValue = quantity(100, "UNT-013");
        break;
      case "REC-005":
        specificFactValue = count(3 + primaryPlan.instanceNumber);
        break;
      case "REC-006":
        specificFactValue = quantity(ledger.sprayTotal, "UNT-018");
        break;
      case "REC-007":
        specificFactValue = count(2 + primaryPlan.instanceNumber);
        break;
      case "REC-008":
        specificFactValue = quantity(
          18 + primaryPlan.instanceNumber * 7,
          "UNT-013",
          "exact",
        );
        break;
      case "REC-009":
        specificFactValue = quantity(35, "UNT-013", "minimum");
        break;
      case "REC-010":
        specificFactValue = "EPA-SYN-2026-R2";
        break;
      case "REC-011":
        specificFactValue = quantity(ledger.sprayRate, "UNT-012");
        break;
      case "REC-012":
        specificFactValue = quantity(ledger.area, "UNT-001");
        break;
      case "REC-013":
        specificFactValue = hours(24 + primaryPlan.instanceNumber * 6);
        break;
      case "REC-014":
        specificFactValue = hours(36 + primaryPlan.instanceNumber * 4);
        break;
      case "REC-015":
        specificFactValue = count(5 + primaryPlan.instanceNumber);
        break;
      case "REC-016":
        specificFactValue = count(1 + primaryPlan.instanceNumber);
        break;
      case "REC-017":
        specificFactValue = quantity(
          72 + primaryPlan.instanceNumber * 3,
          "UNT-013",
          "exact",
        );
        break;
      case "REC-018":
        specificFactValue = primaryPlan.exceptionId
          ? "stress_symptoms_present"
          : "balanced_canopy";
        break;
      case "REC-019":
        specificFactValue = quantity(
          36 + primaryPlan.instanceNumber * 4,
          "UNT-013",
          "exact",
        );
        break;
      case "REC-020":
        specificFactValue = primaryPlan.exceptionId
          ? "moderate_water_stress"
          : "adequate_water_status";
        break;
      case "REC-021":
        specificFactValue = quantity(
          1.8 + primaryPlan.instanceNumber * 0.08,
          "UNT-013",
          "exact",
        );
        break;
      case "REC-022":
        specificFactValue = hours(6 + primaryPlan.instanceNumber * 0.75);
        break;
      case "REC-023":
        specificFactValue = quantity(ledger.irrigationVolume, "UNT-005");
        break;
      case "REC-024":
        specificFactValue = quantity(
          18 + primaryPlan.instanceNumber * 2.5,
          "UNT-018",
        );
        break;
      case "REC-025":
        specificFactValue = quantity(
          Number((ledger.irrigationFlow * 1.75).toFixed(2)),
          "UNT-005",
          "estimated",
        );
        break;
      case "REC-026":
        specificFactValue = quantity(ledger.irrigationVolume, "UNT-005");
        break;
      case "REC-027":
        specificFactValue = count(12 + primaryPlan.instanceNumber * 2);
        break;
      case "REC-028":
        specificFactValue = count(30 + primaryPlan.instanceNumber * 5);
        break;
      case "REC-029":
        specificFactValue = quantity(
          historicalPredecessor
            ? Number((ledger.forecastTons - 2.4).toFixed(2))
            : ledger.forecastTons,
          "UNT-003",
          "estimated",
        );
        break;
      case "REC-030":
        specificFactValue = quantity(Math.abs(ledger.forecastError), "UNT-003");
        break;
      case "REC-031":
        specificFactValue = quantity(
          ledger.forecastTons * 0.92,
          "UNT-003",
          "estimated",
        );
        break;
      case "REC-032":
        specificFactValue = hours(24 + primaryPlan.instanceNumber * 2);
        break;
      case "REC-033":
        specificFactValue = quantity(ledger.actualTons, "UNT-003");
        break;
      case "REC-034":
        specificFactValue = quantity(ledger.forecastError, "UNT-003");
        break;
      case "REC-035":
        specificFactValue = count(3);
        break;
      case "REC-036":
        specificFactValue = primaryPlan.exceptionId
          ? "variable_requires_resample"
          : "representative";
        break;
      case "REC-037":
        specificFactValue = quantity(ledger.brix, "UNT-009");
        break;
      case "REC-038":
        specificFactValue = quantity(
          0.55 + primaryPlan.instanceNumber * 0.05,
          "UNT-009",
          "exact",
        );
        break;
      case "REC-039":
        specificFactValue = quantity(ledger.brix, "UNT-009", "minimum");
        break;
      case "REC-040":
        specificFactValue = hours(
          historicalPredecessor
            ? 24 + primaryPlan.instanceNumber * 3
            : 12 + primaryPlan.instanceNumber * 3,
        );
        break;
      case "REC-041":
        specificFactValue = hours(18 + primaryPlan.instanceNumber * 2);
        break;
      case "REC-042":
        specificFactValue = count(historicalPredecessor ? 0 : 1);
        break;
      case "REC-043":
        specificFactValue = quantity(ledger.actualTons, "UNT-003", "estimated");
        break;
      case "REC-044":
        specificFactValue = count(14 + primaryPlan.instanceNumber * 3);
        break;
      case "REC-045":
        specificFactValue = quantity(
          historicalPredecessor ? 0 : 100,
          "UNT-013",
          "exact",
        );
        break;
      case "REC-046":
        specificFactValue = hours(1.5 + primaryPlan.instanceNumber * 0.25);
        break;
      case "REC-047":
        specificFactValue = quantity(
          historicalPredecessor ? ledger.netPounds + 240 : ledger.netPounds,
          "UNT-018",
        );
        break;
      case "REC-048":
        specificFactValue = quantity(ledger.brix, "UNT-009");
        break;
      case "REC-049":
        specificFactValue = hours(4 + primaryPlan.instanceNumber);
        break;
      case "REC-050":
        specificFactValue = quantity(ledger.deliveryTons, "UNT-003");
        break;
      case "REC-051":
        specificFactValue = count(1 + (primaryPlan.exceptionId ? 1 : 0));
        break;
      case "REC-052":
        specificFactValue = money(Math.abs(ledger.settlementAdjustments));
        break;
      case "REC-053":
        specificFactValue = money(ledger.settlementNet);
        break;
      case "REC-054":
        specificFactValue = count(8 + primaryPlan.instanceNumber * 2);
        break;
      case "REC-055":
        specificFactValue = count(8 + primaryPlan.instanceNumber);
        break;
      case "REC-056":
        specificFactValue = hours(0.5 + primaryPlan.instanceNumber * 0.1);
        break;
      case "REC-057":
        specificFactValue = hours(ledger.attendanceHours);
        break;
      case "REC-058":
        specificFactValue = hours(ledger.breakHours);
        break;
      case "REC-059":
        specificFactValue = hours(ledger.payableHours);
        break;
      case "REC-060":
        specificFactValue = count(42 + primaryPlan.instanceNumber * 6);
        break;
      case "REC-061":
        specificFactValue = count(7 + primaryPlan.instanceNumber);
        break;
      case "REC-062":
        specificFactValue = hours(primaryPlan.exceptionId ? 1.25 : 0);
        break;
      case "REC-063":
        specificFactValue = money(
          Number(
            (ledger.payableHours * (28 + primaryPlan.instanceNumber)).toFixed(
              2,
            ),
          ),
        );
        break;
      case "REC-064":
        specificFactValue = count(4 + primaryPlan.instanceNumber);
        break;
      case "REC-065":
        specificFactValue = count(ledger.receivedQuantity + 24);
        break;
      case "REC-066":
        specificFactValue = count(6 + primaryPlan.instanceNumber);
        break;
      case "REC-067":
        specificFactValue = count(ledger.orderedQuantity);
        break;
      case "REC-068":
        specificFactValue = money(2200 + primaryPlan.instanceNumber * 350);
        break;
      case "REC-069":
        specificFactValue = count(ledger.orderedQuantity);
        break;
      case "REC-070":
        specificFactValue = count(ledger.receivedQuantity);
        break;
      case "REC-071":
        specificFactValue = count(ledger.receivedQuantity - 2);
        break;
      case "REC-072":
        specificFactValue = hours(1.5 + primaryPlan.instanceNumber * 0.5);
        break;
      case "REC-073":
        specificFactValue = hours(4 + primaryPlan.instanceNumber);
        break;
      case "REC-074":
        specificFactValue = hours(2.5 + primaryPlan.instanceNumber * 0.75);
        break;
      case "REC-075":
        specificFactValue = count(5 + primaryPlan.instanceNumber);
        break;
      case "REC-076":
        specificFactValue = quantity(
          92 + primaryPlan.instanceNumber,
          "UNT-013",
        );
        break;
      case "REC-077":
        specificFactValue = count(3 + primaryPlan.instanceNumber);
        break;
      case "REC-078":
        specificFactValue = quantity(ledger.area, "UNT-001");
        break;
      case "REC-079":
        specificFactValue = count(primaryPlan.exceptionId ? 2 : 1);
        break;
      case "REC-080":
        specificFactValue = quantity(
          ledger.forecastTons,
          "UNT-003",
          "estimated",
        );
        break;
      case "REC-081":
        specificFactValue = quantity(
          22.5 + primaryPlan.instanceNumber * 0.1,
          "UNT-009",
          "minimum",
        );
        break;
      case "REC-082":
        specificFactValue = count(9 + primaryPlan.instanceNumber);
        break;
      case "REC-083":
        specificFactValue = hours(1.25 + primaryPlan.instanceNumber * 0.25);
        break;
      case "REC-084":
        specificFactValue = quantity(
          ledger.forecastTons,
          "UNT-003",
          "estimated",
        );
        break;
      case "REC-085":
        specificFactValue = hours(24 + primaryPlan.instanceNumber * 3);
        break;
      case "REC-086":
        specificFactValue = quantity(
          2 + primaryPlan.instanceNumber * 2,
          "UNT-019",
        );
        break;
      case "REC-087":
        specificFactValue = money(Math.abs(ledger.settlementAdjustments) + 500);
        break;
      case "REC-088":
        specificFactValue = count(2 + primaryPlan.instanceNumber);
        break;
      case "REC-089":
        specificFactValue = quantity(ledger.area, "UNT-001");
        break;
      case "REC-090":
        specificFactValue = count(14 + primaryPlan.instanceNumber);
        break;
      case "REC-091":
        specificFactValue = quantity(ledger.area, "UNT-001");
        break;
      case "REC-092":
        specificFactValue = quantity(
          90 + primaryPlan.instanceNumber * 2,
          "UNT-013",
        );
        break;
      case "REC-093":
        specificFactValue = count(6 + primaryPlan.instanceNumber);
        break;
      case "REC-094":
        specificFactValue = quantity(ledger.irrigationVolume, "UNT-005");
        break;
      case "REC-095":
        specificFactValue = count(8 + primaryPlan.instanceNumber);
        break;
      case "REC-096":
        specificFactValue = quantity(
          20 + primaryPlan.instanceNumber * 5,
          "UNT-016",
        );
        break;
      case "REC-097":
        specificFactValue = quantity(
          38 + primaryPlan.instanceNumber * 4,
          "UNT-005",
        );
        break;
      case "REC-098":
        specificFactValue = count(4 + primaryPlan.instanceNumber);
        break;
      case "REC-099":
        specificFactValue = quantity(
          ledger.netPounds * 0.08,
          "UNT-018",
          "estimated",
        );
        break;
      case "REC-100":
        specificFactValue = count(3 + primaryPlan.instanceNumber);
        break;
      case "REC-101":
        specificFactValue = count(18 + primaryPlan.instanceNumber * 2);
        break;
      case "REC-102":
        specificFactValue = quantity(
          3 + primaryPlan.instanceNumber * 2,
          "UNT-019",
        );
        break;
      case "REC-103":
        specificFactValue =
          "2026 certification term with attributable final disposition";
        break;
      default:
        throw new Error(`${record.id}: no definition-specific value`);
    }
    facts.definition_evidence = {
      [specificFactKey]: specificFactValue,
    };
    if (historicalPredecessor)
      facts.supersession_evidence = {
        disposition: "superseded_after_attributable_review",
        prior_assessment:
          record.id === "REC-029"
            ? {
                value: Number((ledger.forecastTons - 2.4).toFixed(2)),
                unit_id: "UNT-003",
                qualifier: "estimated",
              }
            : record.id === "REC-040"
              ? "initial pick communication withdrawn before authorization"
              : record.id === "REC-045"
                ? "wrong winery load and block identifier"
                : {
                    value: ledger.netPounds + 240,
                    unit_id: "UNT-018",
                    qualifier: "exact",
                  },
      };
    if (contractIds.length > 0)
      facts.contract_subjects = contractIds.map((contractId) => ({
        entity_type: "contract",
        entity_id: contractId,
      }));
    if (record.id === "REC-002")
      facts.domain_details = {
        signal_type:
          primaryPlan.month <= 3
            ? "winter pruning completion variance and dormant wood damage"
            : "canopy stress and uneven shoot growth",
        severity: primaryPlan.exceptionId ? "high" : "moderate",
        observed_area: {
          value: ledger.area,
          unit_id: "UNT-001",
          qualifier: "exact",
        },
        observation_source: "attributed field scouting",
        signal_status: primaryPlan.exceptionId
          ? "action_review_required"
          : "monitoring_active",
      };
    if (record.id === "REC-019")
      facts.domain_details = {
        soil_moisture_depletion: {
          value: 36 + primaryPlan.instanceNumber * 4,
          unit_id: "UNT-013",
          qualifier: "exact",
        },
        reference_et: {
          value: Number((0.16 + primaryPlan.instanceNumber * 0.025).toFixed(3)),
          unit_id: "UNT-016",
          qualifier: "exact",
        },
        measurement_depth: {
          value: 18 + primaryPlan.instanceNumber * 6,
          unit_id: "UNT-016",
          qualifier: "exact",
        },
        moisture_status: primaryPlan.exceptionId
          ? "below_management_threshold"
          : "within_band",
      };
    if (record.id === "REC-021")
      facts.domain_details = {
        sample_id: ledger.sampleId,
        petiole_no3_ppm: {
          value: 620 + primaryPlan.instanceNumber * 45,
          unit_id: "UNT-020",
          qualifier: "exact",
        },
        potassium_percent: {
          value: Number((1.2 + primaryPlan.instanceNumber * 0.08).toFixed(2)),
          unit_id: "UNT-013",
          qualifier: "exact",
        },
        boron_ppm: {
          value: 28 + primaryPlan.instanceNumber * 2.5,
          unit_id: "UNT-020",
          qualifier: "exact",
        },
        nutrient_status: primaryPlan.exceptionId
          ? "investigation_required"
          : "within_target_band",
      };
    if (record.id === "REC-029") {
      const estimatedTons = historicalPredecessor
        ? Number((ledger.forecastTons - 2.4).toFixed(2))
        : ledger.forecastTons;
      facts.domain_details = {
        estimated_tons: {
          value: estimatedTons,
          unit_id: "UNT-003",
          qualifier: "estimated",
        },
        yield_rate: {
          value: Number((estimatedTons / ledger.area).toFixed(3)),
          unit_id: "UNT-021",
          qualifier: "estimated",
        },
        sampled_vine_count: {
          value: 24 + primaryPlan.instanceNumber * 4,
          unit_id: "UNT-008",
          qualifier: "exact",
        },
        estimate_method: "representative-vine cluster count with block area",
        estimate_status: historicalPredecessor ? "superseded" : "published",
      };
    }
    if (record.id === "REC-040")
      facts.domain_details = {
        decision_message: historicalPredecessor
          ? "Initial pick timing communicated pending updated maturity evidence."
          : "Revised pick timing communicated after updated maturity evidence.",
        response_window: {
          value: historicalPredecessor
            ? 24 + primaryPlan.instanceNumber * 3
            : 12 + primaryPlan.instanceNumber * 3,
          unit_id: "UNT-007",
          qualifier: "exact",
        },
        recipient_organization: {
          entity_type: "organization",
          entity_id: "ORG-006",
        },
        communication_status: historicalPredecessor
          ? "superseded"
          : "revised_and_acknowledged",
      };
    if (record.id === "REC-058")
      facts.domain_details = {
        shift_time: {
          value: ledger.attendanceHours,
          unit_id: "UNT-007",
          qualifier: "exact",
        },
        break_time: {
          value: ledger.breakHours,
          unit_id: "UNT-007",
          qualifier: "exact",
        },
        break_paid_status: "unpaid_recorded_break",
        break_status: primaryPlan.exceptionId ? "corrected" : "verified",
      };
    if (record.id === "REC-061")
      facts.domain_details = {
        verified_entry_count: {
          value: 7 + primaryPlan.instanceNumber,
          unit_id: "UNT-008",
          qualifier: "exact",
        },
        variance_time: {
          value: primaryPlan.exceptionId ? 0.5 : 0,
          unit_id: "UNT-007",
          qualifier: "exact",
        },
        verified_by: {
          entity_type: "person",
          entity_id: ownerAssignment.person_id,
        },
        verification_result: primaryPlan.exceptionId
          ? "returned_then_corrected"
          : "accepted",
      };
    if (record.id === "REC-066")
      facts.domain_details = {
        equipment: { entity_type: "equipment", entity_id: "EQP-002" },
        calibrated_application_rate: {
          value: ledger.sprayRate,
          unit_id: "UNT-012",
          qualifier: "exact",
        },
        readiness_check_count: {
          value: 6 + primaryPlan.instanceNumber,
          unit_id: "UNT-008",
          qualifier: "exact",
        },
        calibration_status: "within_operating_tolerance",
        verification_result: "ready_for_service",
      };
    if (record.id === "REC-075")
      facts.domain_details = {
        equipment: { entity_type: "equipment", entity_id: "EQP-002" },
        repair_test_duration: {
          value: 1 + primaryPlan.instanceNumber * 0.25,
          unit_id: "UNT-007",
          qualifier: "exact",
        },
        readiness_check_count: {
          value: 5 + primaryPlan.instanceNumber,
          unit_id: "UNT-008",
          qualifier: "exact",
        },
        return_to_service_status: "verified_ready",
        verification_result: "released_after_repair_test",
      };
    if (record.id === "REC-077")
      facts.domain_details = {
        organization: {
          entity_type: "organization",
          entity_id:
            Number(primaryPlan.blockId.slice(-3)) <= 10 ? "ORG-004" : "ORG-005",
        },
        primary_contact: {
          entity_type: "person",
          entity_id: requireValue(
            assignmentByRole.get("ROLE-CONTRACT-GROWER"),
            "contract grower contact",
          ).person_id,
        },
        contact_channel: "attributed grower operations contact",
        contact_status: "verified_current",
        verified_on: `2026-${pad(primaryPlan.month, 2)}-${pad(primaryPlan.day, 2)}`,
      };
    if (
      ["REC-076", "REC-078"].includes(record.id) &&
      primaryPlan.exceptionId === "EXC-051"
    )
      facts.domain_details = {
        stable_subject: {
          entity_type: "block",
          entity_id: primaryPlan.blockId,
        },
        observed_alias: "CTR-019",
        alias_status: "disputed_pending_correction",
        identity_result: "stable_identity_preserved_pending_alias_resolution",
      };
    if (record.id === "REC-079" && primaryPlan.exceptionId === "EXC-051")
      facts.domain_details = {
        stable_subject: {
          entity_type: "block",
          entity_id: primaryPlan.blockId,
        },
        observed_alias: "CTR-019",
        alias_status: "disputed_pending_correction",
        observation_status: "conflict_not_yet_resolved",
      };
    if (record.id === "REC-086" && primaryPlan.exceptionId === "EXC-051")
      facts.domain_details = {
        finding_type: "conflicting_block_aliases",
        stable_subject: {
          entity_type: "block",
          entity_id: primaryPlan.blockId,
        },
        before_alias: "CTR-019",
        after_alias: "CTR-009",
        correction_effective_on: "2026-10-13",
        action_status: "corrected_and_verified",
      };
    if (record.id === "REC-086" && primaryPlan.exceptionId === "EXC-051")
      facts.definition_evidence = {
        corrective_action_age: {
          value: 2,
          unit_id: "UNT-019",
          qualifier: "exact",
        },
      };
    if (record.id === "REC-088" && contractIds.length > 0) {
      const contractId = requireValue(contractIds[0], `${record.id}: contract`);
      const contractedTons = contractId === "CON-001" ? 168 : 142;
      facts.domain_details = {
        contract: { entity_type: "contract", entity_id: contractId },
        accepted_delivery_tons: {
          value: ledger.deliveryTons,
          unit_id: "UNT-003",
          qualifier: "exact",
        },
        contracted_tons: {
          value: contractedTons,
          unit_id: "UNT-003",
          qualifier: "estimated",
        },
        remaining_balance_tons: {
          value: Number((contractedTons - ledger.deliveryTons).toFixed(4)),
          unit_id: "UNT-003",
          qualifier: "estimated",
        },
        reconciled_delivery_count: {
          value: 1,
          unit_id: "UNT-008",
          qualifier: "exact",
        },
        contract_progress_status: "partial_delivery_contract_active",
      };
      facts.definition_evidence = {
        reconciled_delivery_count: {
          value: 1,
          unit_id: "UNT-008",
          qualifier: "exact",
        },
      };
    }
    if (record.id === "REC-094") {
      const waterTotal = {
        value: ledger.irrigationVolume,
        unit_id: "UNT-005",
        qualifier: "exact",
      };
      const nitrogenTotal = {
        value: 18 + primaryPlan.instanceNumber * 2.5,
        unit_id: "UNT-018",
        qualifier: "exact",
      };
      facts.domain_details = {
        water_total: waterTotal,
        nitrogen_total: nitrogenTotal,
        reporting_period: "2026 synthetic season",
        totals_status: primaryPlan.exceptionId ? "corrected" : "reconciled",
      };
      facts.workflow_metrics = {
        water_total: waterTotal,
        nitrogen_total: nitrogenTotal,
      };
    }
    if (record.id === "REC-098")
      facts.domain_details = {
        transport_unit: { entity_type: "equipment", entity_id: "EQP-006" },
        cleaning_method: "washout, visual inspection, and dry-bed verification",
        prior_load_disposition: "no prohibited residue observed",
        signed_by: {
          entity_type: "person",
          entity_id: ownerAssignment.person_id,
        },
        affidavit_status: "signed_and_verified",
      };
    if (record.id === "REC-025")
      facts.domain_details = {
        failure_code: "IRR-MANIFOLD-PRESSURE-LOSS",
        malfunction_type: "pressure loss at the east irrigation manifold",
        affected_equipment: { entity_type: "equipment", entity_id: "EQP-004" },
        lost_delivery: {
          value: Number((ledger.irrigationFlow * 1.75).toFixed(2)),
          unit_id: "UNT-005",
          qualifier: "estimated",
        },
        repair_result: "seal replaced and delivery reverified",
        interruption_status: "recovered",
      };
    if (record.id === "REC-037")
      facts.domain_details = {
        sample_id: ledger.sampleId,
        laboratory: { entity_type: "organization", entity_id: "ORG-008" },
        soluble_solids: {
          value: ledger.brix,
          unit_id: "UNT-009",
          qualifier: "exact",
        },
        ph: { value: ledger.ph, unit_id: "UNT-014", qualifier: "exact" },
        titratable_acidity: {
          value: ledger.acidity,
          unit_id: "UNT-015",
          qualifier: "exact",
        },
        result_status: primaryPlan.exceptionId
          ? "late_but_accepted"
          : "validated",
      };
    if (record.id === "REC-037")
      facts.workflow_metrics = {
        sample_id: ledger.sampleId,
        brix: { value: ledger.brix, unit_id: "UNT-009", qualifier: "exact" },
        ph: { value: ledger.ph, unit_id: "UNT-014", qualifier: "exact" },
        total_acidity: {
          value: ledger.acidity,
          unit_id: "UNT-015",
          qualifier: "exact",
        },
      };
    if (record.id === "REC-045")
      facts.domain_details = {
        load_id: historicalPredecessor
          ? `LOAD-WRONG-${primaryPlan.instanceNumber}`
          : ledger.loadId,
        captured_block_identifier: historicalPredecessor
          ? "WINERY-BLOCK-099"
          : primaryPlan.blockId,
        stable_block: {
          entity_type: "block",
          entity_id: primaryPlan.blockId,
        },
        identity_match_score: {
          value: historicalPredecessor ? 0 : 100,
          unit_id: "UNT-013",
          qualifier: "exact",
        },
        identity_status: historicalPredecessor
          ? "disputed_wrong_identifier"
          : supersessionSuccessor
            ? "corrected_and_verified"
            : "verified",
      };
    if (record.id === "REC-047") {
      const grossWeight = historicalPredecessor
        ? ledger.grossPounds + 240
        : ledger.grossPounds;
      const netWeight = grossWeight - ledger.tarePounds;
      facts.domain_details = {
        load_id: ledger.loadId,
        gross_weight: {
          value: grossWeight,
          unit_id: "UNT-018",
          qualifier: "exact",
        },
        tare_weight: {
          value: ledger.tarePounds,
          unit_id: "UNT-018",
          qualifier: "exact",
        },
        net_weight: {
          value: netWeight,
          unit_id: "UNT-018",
          qualifier: "exact",
        },
        weight_status: historicalPredecessor
          ? "disputed_source_entry"
          : supersessionSuccessor
            ? "corrected_and_certified"
            : "certified",
      };
    }
    if (record.id === "REC-048")
      facts.domain_details = {
        load_id: ledger.loadId,
        fruit_temperature: {
          value: 61 + primaryPlan.instanceNumber * 1.2,
          unit_id: "UNT-010",
          qualifier: "exact",
        },
        brix: { value: ledger.brix, unit_id: "UNT-009", qualifier: "exact" },
        disposition:
          primaryPlan.instanceNumber === 3
            ? "accepted_with_adjustment"
            : "accepted",
      };
    if (record.id === "REC-050")
      facts.domain_details = {
        load_id: ledger.loadId,
        entered_delivery_tons: {
          value: ledger.deliveryTons,
          unit_id: "UNT-003",
          qualifier: "exact",
        },
        net_weight: {
          value: ledger.netPounds,
          unit_id: "UNT-018",
          qualifier: "exact",
        },
        entry_status: primaryPlan.exceptionId ? "corrected" : "accepted",
      };
    if (record.id === "REC-053")
      facts.domain_details = {
        load_id: ledger.loadId,
        delivered_tons: {
          value: ledger.deliveryTons,
          unit_id: "UNT-003",
          qualifier: "exact",
        },
        price_per_ton: { amount: 2850, currency: "USD" },
        settlement_gross: { amount: ledger.settlementGross, currency: "USD" },
        settlement_adjustments: {
          amount: ledger.settlementAdjustments,
          currency: "USD",
        },
        settlement_net: { amount: ledger.settlementNet, currency: "USD" },
        settlement_status: primaryPlan.exceptionId ? "corrected" : "settled",
      };
    if (record.id === "REC-059")
      facts.domain_details = {
        attendance: {
          value: ledger.attendanceHours,
          unit_id: "UNT-007",
          qualifier: "exact",
        },
        break_time: {
          value: ledger.breakHours,
          unit_id: "UNT-007",
          qualifier: "exact",
        },
        payable_time: {
          value: ledger.payableHours,
          unit_id: "UNT-007",
          qualifier: "exact",
        },
        time_status: primaryPlan.exceptionId ? "corrected" : "verified",
      };
    if (record.id === "REC-063")
      facts.domain_details = {
        allocated_cost: {
          amount: Number(
            (ledger.payableHours * (28 + primaryPlan.instanceNumber)).toFixed(
              2,
            ),
          ),
          currency: "USD",
        },
        cost_status: primaryPlan.exceptionId ? "corrected" : "allocated",
        allocation_basis: "verified payable hours by stable block",
      };
    if (record.id === "REC-094")
      facts.workflow_metrics = {
        water_total: {
          value: ledger.irrigationVolume,
          unit_id: "UNT-005",
          qualifier: "exact",
        },
        nitrogen_total: {
          value: 18 + primaryPlan.instanceNumber * 2.5,
          unit_id: "UNT-018",
          qualifier: "exact",
        },
      };
    if (record.id === "REC-097")
      facts.domain_details = {
        cleaned_equipment: { entity_type: "equipment", entity_id: "EQP-002" },
        cleaning_method: "triple rinse with attributable operator verification",
        rinse_volume: {
          value: 38 + primaryPlan.instanceNumber * 4,
          unit_id: "UNT-005",
          qualifier: "exact",
        },
        residue_check: "clear",
        evidence_status: "verified",
        verified_by: {
          entity_type: "person",
          entity_id: ownerAssignment.person_id,
        },
      };
    if (record.id === "REC-103")
      facts.domain_details = {
        decision_authority: {
          entity_type: "organization",
          entity_id: "ORG-009",
        },
        initial_outcome: primaryPlan.exceptionId
          ? "withheld_pending_correction"
          : "ready_for_decision",
        correction_status: primaryPlan.exceptionId
          ? "corrected_and_resubmitted"
          : "not_required",
        decision: primaryPlan.exceptionId
          ? "certify_after_correction"
          : "certify",
        final_outcome: primaryPlan.exceptionId
          ? "certified_after_correction"
          : "certified",
        evidence_status: "complete_and_attributable",
        decision_status: "final_and_attributable",
      };
    if (
      primaryPlan.exceptionId === "EXC-004" &&
      ["REC-004", "REC-005"].includes(record.id)
    )
      facts.partial_completion_history = {
        completed_area: {
          value: Number((ledger.area * 0.6).toFixed(2)),
          unit_id: "UNT-001",
          qualifier: "exact",
        },
        remaining_area: {
          value: Number((ledger.area * 0.4).toFixed(2)),
          unit_id: "UNT-001",
          qualifier: "exact",
        },
        final_completed_area: {
          value: ledger.area,
          unit_id: "UNT-001",
          qualifier: "exact",
        },
        resolution: "remaining scope reassigned and completed",
      };
    if (
      primaryPlan.exceptionId === "EXC-005" &&
      ["REC-004", "REC-005"].includes(record.id)
    )
      facts.completion_correction_history = {
        before: "completion quantity missing and disputed",
        corrected_area: {
          value: ledger.area,
          unit_id: "UNT-001",
          qualifier: "exact",
        },
        after: "attributed field quantity verified",
      };
    if (
      primaryPlan.exceptionId === "EXC-016" &&
      ["REC-023", "REC-024"].includes(record.id)
    ) {
      facts.domain_details = {
        disposition: "superseded_before_execution",
        planned_scope: {
          entity_type: "block",
          entity_id: primaryPlan.blockId,
        },
        execution_status: "not_delivered_or_applied",
      };
      facts.workflow_metrics = {
        planned_flow: {
          value: ledger.irrigationFlow,
          unit_id: "UNT-017",
          qualifier: "estimated",
        },
      };
      facts.definition_evidence =
        record.id === "REC-023"
          ? {
              planned_irrigation_volume: {
                value: ledger.irrigationVolume,
                unit_id: "UNT-005",
                qualifier: "estimated",
              },
            }
          : {
              planned_fertility_input: {
                value: 18 + primaryPlan.instanceNumber * 2.5,
                unit_id: "UNT-018",
                qualifier: "estimated",
              },
            };
    }
    if (corrected)
      facts.correction_delta = {
        field_path: requireValue(
          correctionFieldPath,
          `${record.id}: correction path`,
        ),
        before: "source value disputed, incomplete, or mis-entered",
        after: "attributed corrected value in the current version",
      };
    const value: JsonObject = {
      id,
      operation_id: OPERATION_ID,
      record_definition_id: record.id,
      workflow_instance_ids: plans.map((plan) => plan.id),
      scope_ids: unique(plans.map((plan) => scopeForBlock(plan.blockId))),
      block_ids: unique(plans.map((plan) => plan.blockId)),
      organization_ids: unique(
        plans.map((plan) =>
          Number(plan.blockId.slice(-3)) <= 8
            ? "ORG-001"
            : Number(plan.blockId.slice(-3)) <= 10
              ? "ORG-004"
              : "ORG-005",
        ),
      ),
      title: `${record.name} — 2026 synthetic season${historicalPredecessor ? " historical predecessor" : ""}`,
      lifecycle_state: lifecycleState,
      effective_at: effectiveAt,
      recorded_at: recordedAt,
      owner_assignment_id: ownerAssignment.id,
      facts,
      provenance: provenance(
        `canonical-record:${record.id}`,
        recordedAt,
        ownerAssignment.person_id,
      ),
      version: corrected
        ? {
            number: 2,
            recorded_at: versionRecordedAt,
            recorded_by_person_id: ownerAssignment.person_id,
            previous_version: 1,
            change_reason:
              "Attributable synthetic correction retained the original record version.",
          }
        : {
            number: 1,
            recorded_at: versionRecordedAt,
            recorded_by_person_id: ownerAssignment.person_id,
          },
      corrections: corrected
        ? [
            {
              id: `COR-${pad(index + 1, 5)}`,
              corrected_at: versionRecordedAt,
              corrected_by_person_id: ownerAssignment.person_id,
              reason:
                "Corrected a substantive operational value while retaining the original version and attribution.",
              field_paths: [
                requireValue(
                  correctionFieldPath,
                  `${record.id}: correction path`,
                ),
              ],
              from_version: 1,
              to_version: 2,
            },
          ]
        : [],
      link_ids: [],
    };
    if (historicalPredecessor)
      value.valid_until = sourceTimestamp(
        primaryPlan.month,
        primaryPlan.day,
        359,
      );
    if (contractIds.length > 0) value.contract_ids = contractIds;
    if (sourceEvent) value.source_event_id = sourceEvent.id;
    return value;
  });

  const recordInstanceIndex = new Map(
    recordInstances.map((record) => [String(record.id), record]),
  );
  for (const record of recordInstances) {
    const requirements =
      REQUIRED_DOMAIN_PROFILE_FIELDS[String(record.record_definition_id)];
    if (!requirements) continue;
    const domainDetails = (record.facts as JsonObject)
      .domain_details as JsonObject;
    for (const [field, unitId] of Object.entries(requirements)) {
      const value = domainDetails[field];
      if (value === undefined)
        throw new Error(
          `${record.id}: ${record.record_definition_id} lacks domain_details.${field}`,
        );
      if (
        unitId &&
        (!value ||
          typeof value !== "object" ||
          (value as JsonObject).unit_id !== unitId)
      )
        throw new Error(
          `${record.id}: ${record.record_definition_id}.${field} must use ${unitId}`,
        );
    }
  }
  for (const { predecessor, successor } of supersessionPlanPairs) {
    const predecessorRecord = requireValue(
      recordInstanceIndex.get(predecessor.id),
      predecessor.id,
    );
    const successorRecord = requireValue(
      recordInstanceIndex.get(successor.id),
      successor.id,
    );
    predecessorRecord.superseded_by_record_instance_id = successor.id;
    successorRecord.supersedes_record_instance_id = predecessor.id;
    (successorRecord.facts as JsonObject).supersession_evidence = {
      disposition: "current_attributable_successor",
      predecessor_record: {
        entity_type: "record_instance",
        entity_id: predecessor.id,
      },
      change_basis:
        successor.definition.id === "REC-029"
          ? "new block sample revised the crop estimate"
          : successor.definition.id === "REC-040"
            ? "updated maturity evidence replaced the prior pick communication"
            : successor.definition.id === "REC-045"
              ? "attributed intake correction replaced the wrong load and block identifier"
              : "attributed processor correction replaced the disputed gross weight",
    };
    const predecessorAuthoritativeFacts = {
      domain_details: (predecessorRecord.facts as JsonObject).domain_details,
      definition_evidence: (predecessorRecord.facts as JsonObject)
        .definition_evidence,
    };
    const successorAuthoritativeFacts = {
      domain_details: (successorRecord.facts as JsonObject).domain_details,
      definition_evidence: (successorRecord.facts as JsonObject)
        .definition_evidence,
    };
    if (
      JSON.stringify(predecessorAuthoritativeFacts) ===
      JSON.stringify(successorAuthoritativeFacts)
    )
      throw new Error(
        `${predecessor.id}/${successor.id}: supersession lacks a substantive authoritative delta`,
      );
  }
  const chainSpecs = [1, 2, 3, 4].map((instanceNumber) => {
    const estimate = requireValue(
      instanceByWorkflowAndNumber.get(`WF-004:${instanceNumber}`),
      `WF-004/${instanceNumber}`,
    );
    const maturity = requireValue(
      instanceByWorkflowAndNumber.get(`WF-005:${instanceNumber}`),
      `WF-005/${instanceNumber}`,
    );
    const harvest = requireValue(
      instanceByWorkflowAndNumber.get(`WF-006:${instanceNumber}`),
      `WF-006/${instanceNumber}`,
    );
    const relationship = requireValue(
      instanceByWorkflowAndNumber.get(`WF-009:${instanceNumber}`),
      `WF-009/${instanceNumber}`,
    );
    const workflowPlans = [estimate, maturity, harvest, relationship];
    const recordIdsByDefinition: Record<string, string> = {
      "REC-027": recordIdFor(estimate, "REC-027"),
      "REC-029": recordIdFor(estimate, "REC-029"),
      "REC-039": recordIdFor(maturity, "REC-039"),
      "REC-041": recordIdFor(maturity, "REC-041"),
      "REC-044": recordIdFor(harvest, "REC-044"),
      "REC-045": recordIdFor(harvest, "REC-045"),
      "REC-047": recordIdFor(harvest, "REC-047"),
      "REC-048": recordIdFor(harvest, "REC-048"),
      "REC-050": recordIdFor(harvest, "REC-050"),
      "REC-053": recordIdFor(harvest, "REC-053"),
      "REC-088": recordIdFor(relationship, "REC-088"),
      "REC-080": recordIdFor(relationship, "REC-080"),
    };
    const recordIds = Object.values(recordIdsByDefinition);
    return {
      id: `CHN-${pad(instanceNumber, 3)}`,
      blockId: estimate.blockId,
      workflowPlans,
      recordIds,
      recordIdsByDefinition,
      recordEdges: [
        ["REC-027", "supports", "REC-029"],
        ["REC-029", "supports", "REC-039"],
        ["REC-039", "supports", "REC-041"],
        ["REC-041", "fulfills", "REC-044"],
        ["REC-044", "supports", "REC-045"],
        ["REC-080", "fulfills", "REC-045"],
        ["REC-045", "supports", "REC-047"],
        ["REC-045", "supports", "REC-050"],
        ["REC-047", "supports", "REC-053"],
        ["REC-048", "supports", "REC-053"],
        ["REC-050", "supports", "REC-053"],
        ["REC-053", "supports", "REC-088"],
      ] as Array<[string, string, string]>,
      linkIds: [] as string[],
    };
  });
  const links: JsonObject[] = [];
  const linkedPairs = new Set<string>();
  const forwardCausalRelations = new Set(["supports", "fulfills", "documents"]);
  const isLinkChronologicallyValid = (
    source: JsonObject,
    target: JsonObject,
    relation: string,
  ): boolean => {
    const sourceTime = timestampMinutes(String(source.effective_at));
    const targetTime = timestampMinutes(String(target.effective_at));
    if (forwardCausalRelations.has(relation)) return targetTime >= sourceTime;
    if (["corrects", "supersedes"].includes(relation))
      return sourceTime >= targetTime;
    return true;
  };
  const addLink = (
    sourceId: string,
    targetId: string,
    relation: string,
    chainId?: string,
  ): string | undefined => {
    if (sourceId === targetId) return undefined;
    const pair = `${sourceId}:${targetId}`;
    if (linkedPairs.has(pair)) return undefined;
    linkedPairs.add(pair);
    const source = requireValue(
      recordInstanceIndex.get(sourceId),
      `link source ${sourceId}`,
    );
    const target = requireValue(
      recordInstanceIndex.get(targetId),
      `link target ${targetId}`,
    );
    if (!isLinkChronologicallyValid(source, target, relation))
      throw new Error(
        `${sourceId} ${relation} ${targetId}: record-link chronology is reversed`,
      );
    const createdAt =
      timestampMinutes(String(source.recorded_at)) >=
      timestampMinutes(String(target.recorded_at))
        ? String(source.recorded_at)
        : String(target.recorded_at);
    const id = `LNK-${pad(links.length + 1, 5)}`;
    const link: JsonObject = {
      id,
      source_record_instance_id: sourceId,
      target: { entity_type: "record_instance", entity_id: targetId },
      relation,
      created_at: createdAt,
      provenance: provenance(`record-link:${id}`),
    };
    if (chainId) link.chain_id = chainId;
    links.push(link);
    (source.link_ids as string[]).push(id);
    (target.link_ids as string[]).push(id);
    return id;
  };
  for (const chain of chainSpecs) {
    for (const [
      sourceDefinitionId,
      relation,
      targetDefinitionId,
    ] of chain.recordEdges) {
      const linkId = addLink(
        requireValue(
          chain.recordIdsByDefinition[sourceDefinitionId],
          `${chain.id}: ${sourceDefinitionId}`,
        ),
        requireValue(
          chain.recordIdsByDefinition[targetDefinitionId],
          `${chain.id}: ${targetDefinitionId}`,
        ),
        relation,
        chain.id,
      );
      if (linkId) chain.linkIds.push(linkId);
    }
  }
  const plansByDefinition = new Map<string, RecordPlan[]>();
  for (const recordPlan of recordPlans) {
    const plans = plansByDefinition.get(recordPlan.definition.id) ?? [];
    plans.push(recordPlan);
    plansByDefinition.set(recordPlan.definition.id, plans);
  }
  for (const [
    sourceDefinitionId,
    relation,
    targetDefinitionId,
  ] of ALLOWED_RECORD_LINK_TUPLES) {
    for (const source of plansByDefinition.get(sourceDefinitionId) ?? []) {
      if (source.key.endsWith(":PREDECESSOR")) continue;
      const sourceCases = new Set(
        source.instancePlans.map((plan) => plan.instanceNumber),
      );
      const sourceBlocks = new Set(
        source.instancePlans.map((plan) => plan.blockId),
      );
      const target = (plansByDefinition.get(targetDefinitionId) ?? []).find(
        (candidate) =>
          candidate.id !== source.id &&
          !candidate.key.endsWith(":PREDECESSOR") &&
          candidate.instancePlans.some(
            (plan) =>
              sourceCases.has(plan.instanceNumber) &&
              sourceBlocks.has(plan.blockId),
          ) &&
          isLinkChronologicallyValid(
            requireValue(recordInstanceIndex.get(source.id), source.id),
            requireValue(recordInstanceIndex.get(candidate.id), candidate.id),
            relation,
          ),
      );
      if (target) addLink(source.id, target.id, relation);
    }
  }
  for (const { predecessor, successor } of supersessionPlanPairs)
    addLink(successor.id, predecessor.id, "supersedes");
  for (const link of links) {
    const relation = String(link.relation);
    const sourceRecord = requireValue(
      recordInstanceIndex.get(String(link.source_record_instance_id)),
      String(link.source_record_instance_id),
    );
    const targetId = String((link.target as JsonObject).entity_id);
    const targetRecord = requireValue(
      recordInstanceIndex.get(targetId),
      targetId,
    );
    if (
      relation !== "supersedes" &&
      !ALLOWED_RECORD_LINK_KEYS.has(
        `${sourceRecord.record_definition_id}:${relation}:${targetRecord.record_definition_id}`,
      )
    )
      throw new Error(
        `${link.id}: record relation is not an approved semantic tuple`,
      );
    if (
      relation === "supersedes" &&
      (sourceRecord.supersedes_record_instance_id !== targetId ||
        targetRecord.superseded_by_record_instance_id !== sourceRecord.id)
    )
      throw new Error(`${link.id}: supersession is not reciprocal`);
  }
  for (const record of recordInstances)
    record.link_ids = unique(record.link_ids as string[]).sort();

  const exceptionHistories: JsonObject[] = [];
  for (const plan of instancePlans.filter(
    (candidate) => candidate.exceptionId && candidate.exceptionHistoryId,
  )) {
    const definition = requireValue(
      exceptionIndex.get(String(plan.exceptionId)),
      `${plan.exceptionId}: definition missing`,
    );
    const instanceEvents = requireValue(
      eventsByInstance.get(plan.id),
      `${plan.id}: events missing`,
    );
    const eventAtException = requireValue(
      instanceEvents[plan.exceptionTransitionIndex ?? -1],
      `${plan.id}: exception event missing`,
    );
    const affectedEvents = instanceEvents.slice(
      plan.exceptionTransitionIndex ?? 0,
    );
    const lastEvent = requireValue(
      affectedEvents.at(-1),
      `${plan.id}: closure event missing`,
    );
    const accountable = requireValue(
      assignmentByRole.get(definition.accountable_owner),
      `${definition.id}: accountable role missing`,
    );
    const recordInstanceIds = unique([
      ...definition.record_ids.map((recordId) => recordIdFor(plan, recordId)),
      ...affectedEvents.flatMap((event) => [
        ...(event.record_reads as string[]),
        ...(event.record_writes as string[]),
      ]),
    ]);
    const actionEvents = affectedEvents;
    const recoveryActions = actionEvents.map((event, index) => ({
      sequence: index + 1,
      action:
        event === eventAtException
          ? `Realized the canonical exception transition: ${event.reason}`
          : `Executed canonical ${event.kind} transition: ${event.reason}`,
      owner_assignment_id: event.actor_assignment_id,
      completed_at: event.occurred_at,
      status:
        event.kind === "cancellation" || event.to_state === "cancelled"
          ? "cancelled"
          : "completed",
      resulting_event_id: event.id,
      evidence_record_instance_ids: unique([
        ...(event.record_writes as string[]),
        ...(event.record_reads as string[]),
      ]).slice(0, 4),
    }));
    const terminalState = String(lastEvent.to_state);
    const closureOutcome =
      terminalState === "cancelled"
        ? "cancelled"
        : terminalState === "superseded"
          ? "superseded"
          : affectedEvents.some((event) => event.kind === "correction")
            ? "corrected"
            : "recovered";
    exceptionHistories.push({
      id: plan.exceptionHistoryId,
      operation_id: OPERATION_ID,
      exception_definition_id: definition.id,
      workflow_id: plan.workflow.id,
      workflow_instance_id: plan.id,
      scope_id: scopeForBlock(plan.blockId),
      block_ids: [plan.blockId],
      severity: ["major", "minor", "major", "advisory"][
        exceptionHistories.length % 4
      ],
      status: "closed",
      opened_at: eventAtException.occurred_at,
      acknowledged_at: eventAtException.occurred_at,
      resolved_at: lastEvent.occurred_at,
      closed_at: lastEvent.recorded_at,
      detected_by_assignment_id: eventAtException.actor_assignment_id,
      accountable_assignment_id: accountable.id,
      escalated_to_assignment_ids: unique(
        definition.escalation_roles
          .map((roleId) => assignmentByRole.get(roleId)?.id)
          .filter((id): id is string => Boolean(id)),
      ),
      trigger: `Canonical ${definition.id} occurred: ${definition.name}.`,
      impact: `The affected ${plan.blockId} scope was contained without erasing completed, safe, or predecessor evidence.`,
      interrupted_state: definition.interrupted_states[0],
      recovery_state: eventAtException.to_state,
      event_ids: affectedEvents.map((event) => event.id),
      record_instance_ids: recordInstanceIds,
      decision_ids: definition.decisions,
      recovery_actions: recoveryActions,
      closure: {
        outcome: closureOutcome,
        summary: `${definition.name} closed with attributable interruption, recovery, and retained successor evidence.`,
        closed_by_assignment_id: accountable.id,
        closure_record_instance_ids: recordInstanceIds.slice(
          0,
          Math.min(4, recordInstanceIds.length),
        ),
      },
      provenance: provenance(
        `exception-history:${plan.exceptionHistoryId}`,
        String(lastEvent.recorded_at),
        accountable.person_id,
      ),
      version: {
        number: 1,
        recorded_at: lastEvent.recorded_at,
        recorded_by_person_id: accountable.person_id,
      },
      corrections: [],
    });
  }

  const chains: JsonObject[] = chainSpecs.map((chain) => ({
    id: chain.id,
    type: "harvest_to_settlement",
    workflow_instance_ids: chain.workflowPlans.map((plan) => plan.id),
    record_instance_ids: chain.recordIds,
    link_ids: chain.linkIds,
    block_id: chain.blockId,
  }));
  const operationalChains = chains.map((chain) => ({
    id: chain.id,
    type: chain.type,
    workflow_instance_ids: chain.workflow_instance_ids,
    record_instance_ids: chain.record_instance_ids,
    link_ids: chain.link_ids,
  }));

  const overlayApplications = overlays.map((overlay, index) => ({
    overlay_id: overlay.id,
    scope_ids: [`SCP-${pad(16 + index, 3)}`],
    status: "active",
    applied_from: "2026-01-01",
    applied_to: "2026-12-31",
    record_instance_ids: recordPlans
      .filter((recordPlan) =>
        overlay.record_ids.includes(recordPlan.definition.id),
      )
      .map((recordPlan) => recordPlan.id),
  }));

  const operation: JsonObject = {
    schema_version: "1.0",
    operation_id: OPERATION_ID,
    title: "2026 North Coast Connected Vineyard Operations Composite",
    seed: SEED,
    season: {
      id: SEASON_ID,
      label: "2026 synthetic North Coast season",
      year: 2026,
      starts_on: "2026-01-01",
      ends_on: "2026-12-31",
      timezone: "America/Los_Angeles",
    },
    generated_at: GENERATED_AT,
    canonical_sources: SOURCE_PATHS.map((relativePath, index) => ({
      id: `SRC-${pad(index + 1, 3)}`,
      path: relativePath,
      purpose: "workflow_ontology",
      sha256: sourceHashes[relativePath],
      captured_at: GENERATED_AT,
    })),
    overlay_applications: overlayApplications,
    organizations,
    properties,
    blocks,
    block_aliases: blockAliases,
    block_lineage: [
      {
        id: "LIN-001",
        change_type: "rename",
        source_block_ids: ["BLK-009"],
        result_block_ids: ["BLK-009"],
        effective_on: "2026-10-13",
        reason:
          "A disputed winery alias was corrected without replacing the stable operational block identity.",
        authorized_by_assignment_id: requireValue(
          assignmentByRole.get("ROLE-GROWER-RELATIONS"),
          "grower relations",
        ).id,
        provenance: provenance("block-lineage:LIN-001"),
      },
      {
        id: "LIN-002",
        change_type: "reboundary",
        source_block_ids: ["BLK-004"],
        result_block_ids: ["BLK-004"],
        effective_on: "2026-02-01",
        reason:
          "Row-end mapping was adjusted while the stable block identifier and predecessor history were preserved.",
        authorized_by_assignment_id: requireValue(
          assignmentByRole.get("ROLE-VINEYARD-MANAGER"),
          "vineyard manager",
        ).id,
        provenance: provenance("block-lineage:LIN-002"),
      },
    ],
    people,
    role_assignments: assignments,
    relationships,
    contracts,
    scopes,
    equipment,
    materials,
    units,
    workflow_instances: workflowInstances,
    record_instances: recordInstances,
    links,
    operational_chains: operationalChains,
  };
  const eventDocument = {
    schema_version: "1.0",
    operation_id: OPERATION_ID,
    generated_at: GENERATED_AT,
    events,
  };
  const exceptionDocument = {
    schema_version: "1.0",
    operation_id: OPERATION_ID,
    generated_at: GENERATED_AT,
    histories: exceptionHistories,
  };

  const coveredDecisions = unique(
    events.flatMap((event) => event.decision_ids as string[]),
  ).sort();
  const coveredRecords = unique(
    recordInstances.map((record) => String(record.record_definition_id)),
  ).sort();
  const coveredRoles = assignments
    .map((assignment) => assignment.role_id)
    .sort();
  const months = unique(
    events.map((event) => Number(String(event.occurred_at).slice(5, 7))),
  ).sort((a, b) => a - b);
  const blockIdsWithInstances = unique(
    instancePlans.map((plan) => plan.blockId),
  );
  const contractIdsWithInstances = unique(
    workflowInstances.flatMap(
      (instance) => (instance.contract_ids as string[] | undefined) ?? [],
    ),
  );
  const instanceDurationDays = workflowInstances.map(
    (instance) =>
      (timestampMinutes(String(instance.completed_at)) -
        timestampMinutes(String(instance.started_at))) /
      1440,
  );
  const multiDayInstances = instanceDurationDays.filter(
    (duration) => duration >= 1,
  ).length;
  const longRunningInstances = instanceDurationDays.filter(
    (duration) => duration >= 7,
  ).length;
  const longestInstanceDays = Number(
    Math.max(...instanceDurationDays).toFixed(4),
  );
  const eventMeasurementUnitIds = unique(
    events.flatMap((event) =>
      Object.values((event.measurements as JsonObject | undefined) ?? {}).map(
        (quantity) => String((quantity as JsonObject).unit_id),
      ),
    ),
  ).sort();
  const offlineEvents = events.filter(
    (event) => (event.connectivity as JsonObject).captured_offline === true,
  );
  const offlineWorkflowIds = unique(
    offlineEvents.map((event) => String(event.workflow_id)),
  ).sort();
  const conflictEvents = events.filter((event) =>
    ["conflict", "resolved"].includes(
      String((event.connectivity as JsonObject).sync_status),
    ),
  );
  const conflictWorkflowIds = unique(
    conflictEvents.map((event) => String(event.workflow_id)),
  ).sort();
  const recordFactUnitIds = [
    ...recordInstances.reduce(
      (unitIds, record) => collectUnitIds(record.facts, unitIds),
      new Set<string>(),
    ),
  ].sort();
  const crossWorkflowLinks = links.filter((link) => {
    const source = requireValue(
      recordPlanByInstanceId.get(String(link.source_record_instance_id)),
      "link source",
    );
    const targetReference = link.target as { entity_id: string };
    const target = requireValue(
      recordPlanByInstanceId.get(targetReference.entity_id),
      "link target",
    );
    const sourceWorkflows = new Set(
      source.instancePlans.map((plan) => plan.workflow.id),
    );
    const targetWorkflows = new Set(
      target.instancePlans.map((plan) => plan.workflow.id),
    );
    return [...sourceWorkflows].some(
      (workflowId) => !targetWorkflows.has(workflowId),
    );
  });
  const supersessions = links.filter((link) => link.relation === "supersedes");
  const workflowCoverage = Object.fromEntries(
    workflows.map((workflow) => {
      const plans = instancePlans.filter(
        (plan) => plan.workflow.id === workflow.id,
      );
      const workflowEvents = events.filter(
        (event) => event.workflow_id === workflow.id,
      );
      return [
        workflow.id,
        {
          instances: plans.length,
          events: workflowEvents.length,
          exception_histories: plans.filter((plan) => plan.exceptionId).length,
          represented_states: unique(
            workflowEvents.map((event) => event.to_state),
          ).sort(),
          terminal_states_reached: unique(
            plans.map((plan) =>
              String(
                requireValue(eventsByInstance.get(plan.id), plan.id).at(-1)
                  ?.to_state,
              ),
            ),
          ).sort(),
        },
      ];
    }),
  );
  const historyByException = new Map(
    exceptionHistories.map((history) => [
      history.exception_definition_id,
      history.id,
    ]),
  );
  const namedCaseDefinitions: Array<[string, string, string]> = [
    [
      "offline_observation_synced_later",
      "EXC-002",
      "offline event retained original occurred_at and later recorded_at",
    ],
    [
      "changed_block_identifier",
      "EXC-051",
      "alias correction and LIN-001 preserve stable identity",
    ],
    [
      "partial_task",
      "EXC-004",
      "partial completion returns to remaining-scope assignment",
    ],
    [
      "cancelled_application_for_wind",
      "EXC-006",
      "preflight cancellation is terminal and attributable",
    ],
    [
      "rei_phi_restriction",
      "EXC-009",
      "restriction conflict prevents unsafe application",
    ],
    [
      "revised_crop_estimate",
      "EXC-021",
      "published estimate returns to revision cycle",
    ],
    ["late_maturity_sample", "EXC-024", "late sample requests more sampling"],
    [
      "winery_delivery_slot_change",
      "EXC-030",
      "harvest delay recovers into execution",
    ],
    [
      "wrong_load_identifier",
      "EXC-033",
      "disputed load enters correction path",
    ],
    [
      "downgrade_or_rejection",
      "EXC-034",
      "quality disposition remains in settlement history",
    ],
    [
      "corrected_weigh_ticket",
      "EXC-035",
      "late processor entry creates successor correction",
    ],
    [
      "incomplete_audit_record",
      "EXC-057",
      "evidence gap opens corrective action",
    ],
    [
      "corrective_action",
      "EXC-061",
      "audit noncompliance is corrected and reverified",
    ],
  ];
  const coverage = {
    schema_version: "1.0",
    operation_id: OPERATION_ID,
    generated_at: GENERATED_AT,
    canonical_source_hashes: sourceHashes,
    counts: {
      organizations: organizations.length,
      properties: properties.length,
      blocks: blocks.length,
      active_blocks: blockIdsWithInstances.length,
      estate_blocks: 8,
      contract_blocks: 4,
      people: people.length,
      canonical_roles: roles.length,
      role_assignments: assignments.length,
      contracts: contracts.length,
      active_contracts: contractIdsWithInstances.length,
      workflows: workflows.length,
      workflow_instances: workflowInstances.length,
      multi_day_instances: multiDayInstances,
      long_running_instances: longRunningInstances,
      longest_instance_days: longestInstanceDays,
      state_events: events.length,
      event_measurement_units: eventMeasurementUnitIds.length,
      offline_events: offlineEvents.length,
      offline_workflows: offlineWorkflowIds.length,
      conflict_events: conflictEvents.length,
      conflict_workflows: conflictWorkflowIds.length,
      record_definitions: records.length,
      record_instances: recordInstances.length,
      record_fact_units: recordFactUnitIds.length,
      supersessions: supersessions.length,
      decisions: decisions.length,
      decisions_covered: coveredDecisions.length,
      exception_histories: exceptionHistories.length,
      overlays: overlayApplications.length,
      cross_workflow_record_links: crossWorkflowLinks.length,
      months_represented: months.length,
      harvest_to_settlement_chains: operationalChains.length,
    },
    workflow_coverage: workflowCoverage,
    canonical_coverage: {
      roles: coveredRoles,
      records: coveredRecords,
      decisions: coveredDecisions,
      exceptions: exceptionHistories
        .map((history) => history.exception_definition_id)
        .sort(),
      overlays: overlays.map((overlay) => overlay.id).sort(),
    },
    named_cases: namedCaseDefinitions.map(
      ([caseKey, exceptionId, evidence]) => {
        if (caseKey === "offline_observation_synced_later") {
          const offlinePlan = requireValue(
            instanceByWorkflowAndNumber.get("WF-001:1"),
            "offline WF-001 case",
          );
          const caseEvents = offlineEvents.filter(
            (event) => event.workflow_instance_id === offlinePlan.id,
          );
          return {
            case_key: caseKey,
            workflow_instance_id: offlinePlan.id,
            event_ids: caseEvents.map((event) => event.id),
            record_instance_ids: unique(
              caseEvents.flatMap((event) => [
                ...(event.record_reads as string[]),
                ...(event.record_writes as string[]),
              ]),
            ),
            evidence,
          };
        }
        const history = requireValue(
          exceptionHistories.find(
            (candidate) => candidate.exception_definition_id === exceptionId,
          ),
          `${caseKey}: missing ${exceptionId} history`,
        );
        const lineageDefinitionId =
          caseKey === "corrected_weigh_ticket"
            ? "REC-047"
            : caseKey === "wrong_load_identifier"
              ? "REC-045"
              : undefined;
        const caseRecordIds = lineageDefinitionId
          ? unique([
              ...(history.record_instance_ids as string[]),
              ...supersessionPlanPairs
                .filter(
                  (pair) =>
                    pair.successor.definition.id === lineageDefinitionId &&
                    pair.successor.instancePlans.some(
                      (plan) => plan.id === history.workflow_instance_id,
                    ),
                )
                .flatMap((pair) => [pair.predecessor.id, pair.successor.id]),
            ])
          : history.record_instance_ids;
        return {
          case_key: caseKey,
          exception_definition_id: exceptionId,
          exception_history_id: historyByException.get(exceptionId),
          workflow_instance_id: history.workflow_instance_id,
          event_ids: history.event_ids,
          record_instance_ids: caseRecordIds,
          evidence,
        };
      },
    ),
    shared_cross_workflow_records: unique(
      recordPlans
        .filter((recordPlan) => recordPlan.shared)
        .map((recordPlan) => recordPlan.definition.id),
    )
      .sort()
      .map((recordDefinitionId) => ({
        record_definition_id: recordDefinitionId,
        record_instance_ids: recordPlans
          .filter(
            (recordPlan) =>
              recordPlan.shared &&
              recordPlan.definition.id === recordDefinitionId,
          )
          .map((recordPlan) => recordPlan.id),
        workflow_ids: unique(
          recordPlans
            .filter(
              (recordPlan) =>
                recordPlan.shared &&
                recordPlan.definition.id === recordDefinitionId,
            )
            .flatMap((recordPlan) =>
              recordPlan.instancePlans.map((plan) => plan.workflow.id),
            ),
        ).sort(),
      })),
    operational_chains: chains.map((chain, index) => ({
      id: chain.id,
      fruit_source: index < 2 ? "estate" : "contract",
      ...(index === 2
        ? { contract_id: "CON-001", source_block_ids: ["BLK-009", "BLK-010"] }
        : index === 3
          ? { contract_id: "CON-002", source_block_ids: ["BLK-011", "BLK-012"] }
          : {}),
      block_id: chain.block_id,
      workflow_instance_ids: chain.workflow_instance_ids,
      record_instance_ids: chain.record_instance_ids,
      link_ids: chain.link_ids,
    })),
    months,
    event_measurement_unit_ids: eventMeasurementUnitIds,
    offline_workflow_ids: offlineWorkflowIds,
    conflict_workflow_ids: conflictWorkflowIds,
    record_fact_unit_ids: recordFactUnitIds,
    checks: [
      {
        id: "organizations",
        status: organizations.length === 9 ? "pass" : "fail",
        actual: organizations.length,
        exact: 9,
      },
      {
        id: "blocks",
        status: blocks.length === 12 ? "pass" : "fail",
        actual: blocks.length,
        exact: 12,
      },
      {
        id: "active_blocks",
        status: blockIdsWithInstances.length === 12 ? "pass" : "fail",
        actual: blockIdsWithInstances.length,
        exact: 12,
      },
      {
        id: "active_contracts",
        status: contractIdsWithInstances.length === 3 ? "pass" : "fail",
        actual: contractIdsWithInstances.length,
        exact: 3,
      },
      {
        id: "roles",
        status: coveredRoles.length === roles.length ? "pass" : "fail",
        actual: coveredRoles.length,
        exact: roles.length,
      },
      {
        id: "workflow_instances",
        status: workflowInstances.length >= 40 ? "pass" : "fail",
        actual: workflowInstances.length,
        minimum: 40,
      },
      {
        id: "multi_day_instances",
        status: multiDayInstances >= 25 ? "pass" : "fail",
        actual: multiDayInstances,
        minimum: 25,
      },
      {
        id: "long_running_instances",
        status: longRunningInstances >= 10 ? "pass" : "fail",
        actual: longRunningInstances,
        minimum: 10,
      },
      {
        id: "longest_instance_days",
        status: longestInstanceDays >= 60 ? "pass" : "fail",
        actual: longestInstanceDays,
        minimum: 60,
      },
      {
        id: "state_events",
        status: events.length >= 250 ? "pass" : "fail",
        actual: events.length,
        minimum: 250,
      },
      {
        id: "event_measurement_units",
        status: eventMeasurementUnitIds.length >= 8 ? "pass" : "fail",
        actual: eventMeasurementUnitIds.length,
        minimum: 8,
      },
      {
        id: "offline_events",
        status: offlineEvents.length >= 10 ? "pass" : "fail",
        actual: offlineEvents.length,
        minimum: 10,
      },
      {
        id: "offline_workflows",
        status: offlineWorkflowIds.length >= 4 ? "pass" : "fail",
        actual: offlineWorkflowIds.length,
        minimum: 4,
      },
      {
        id: "conflict_events",
        status: conflictEvents.length >= 5 ? "pass" : "fail",
        actual: conflictEvents.length,
        minimum: 5,
      },
      {
        id: "conflict_workflows",
        status: conflictWorkflowIds.length >= 3 ? "pass" : "fail",
        actual: conflictWorkflowIds.length,
        minimum: 3,
      },
      {
        id: "record_fact_units",
        status: recordFactUnitIds.length >= 8 ? "pass" : "fail",
        actual: recordFactUnitIds.length,
        minimum: 8,
      },
      {
        id: "records",
        status: coveredRecords.length === records.length ? "pass" : "fail",
        actual: coveredRecords.length,
        exact: records.length,
      },
      {
        id: "supersessions",
        status: supersessions.length >= 2 ? "pass" : "fail",
        actual: supersessions.length,
        minimum: 2,
      },
      {
        id: "decisions",
        status: coveredDecisions.length === decisions.length ? "pass" : "fail",
        actual: coveredDecisions.length,
        exact: decisions.length,
      },
      {
        id: "exception_histories",
        status: exceptionHistories.length === 25 ? "pass" : "fail",
        actual: exceptionHistories.length,
        exact: 25,
      },
      {
        id: "overlays",
        status:
          overlayApplications.length === overlays.length ? "pass" : "fail",
        actual: overlayApplications.length,
        exact: overlays.length,
      },
      {
        id: "cross_workflow_links",
        status: crossWorkflowLinks.length >= 40 ? "pass" : "fail",
        actual: crossWorkflowLinks.length,
        minimum: 40,
      },
      {
        id: "months",
        status: months.length === 12 ? "pass" : "fail",
        actual: months.length,
        exact: 12,
      },
      {
        id: "harvest_chains",
        status: operationalChains.length >= 4 ? "pass" : "fail",
        actual: operationalChains.length,
        minimum: 4,
      },
    ],
  };

  const failedChecks = coverage.checks.filter(
    (check) => check.status !== "pass",
  );
  if (failedChecks.length > 0)
    throw new Error(
      `Coverage assertions failed: ${failedChecks.map((check) => check.id).join(", ")}`,
    );
  if (new Set(coveredRoles).size !== roles.length)
    throw new Error("Role coverage contains duplicates or omissions.");
  if (new Set(coveredRecords).size !== records.length)
    throw new Error("Record coverage contains duplicates or omissions.");
  for (const plan of instancePlans) {
    const planEvents = requireValue(
      eventsByInstance.get(plan.id),
      `${plan.id}: events missing`,
    );
    for (let index = 1; index < planEvents.length; index += 1) {
      if (planEvents[index - 1].to_state !== planEvents[index].from_state)
        throw new Error(
          `${plan.id}: discontinuity before ${planEvents[index].id}`,
        );
    }
  }

  let previousRecordedMinute = Number.NEGATIVE_INFINITY;
  for (const event of events) {
    const recordedMinute = timestampMinutes(String(event.recorded_at));
    if (recordedMinute < previousRecordedMinute)
      throw new Error(`${event.id}: global sequence regresses by recorded_at`);
    previousRecordedMinute = recordedMinute;
    for (const recordId of [
      ...(event.record_reads as string[]),
      ...(event.record_writes as string[]),
    ]) {
      const record = requireValue(recordInstanceIndex.get(recordId), recordId);
      if (
        !(record.workflow_instance_ids as string[]).includes(
          String(event.workflow_instance_id),
        )
      )
        throw new Error(
          `${event.id}: ${recordId} is outside its workflow instance`,
        );
      if (!(record.scope_ids as string[]).includes(String(event.scope_id)))
        throw new Error(`${event.id}: ${recordId} is outside its scope`);
      if (
        timestampMinutes(String(event.occurred_at)) <
        timestampMinutes(String(record.effective_at))
      )
        throw new Error(
          `${event.id}: references ${recordId} before effective_at`,
        );
      if (
        (event.record_writes as string[]).includes(recordId) &&
        timestampMinutes(String(event.recorded_at)) >
          timestampMinutes(String((record.version as JsonObject).recorded_at))
      )
        throw new Error(
          `${event.id}: writes ${recordId} after current version`,
        );
    }
    const decisionIds = event.decision_ids as string[];
    const decisionResults = event.decision_results as JsonObject[];
    if (
      decisionResults.length !== decisionIds.length ||
      new Set(decisionResults.map((result) => result.decision_id)).size !==
        decisionIds.length
    )
      throw new Error(`${event.id}: decision results do not exactly cover IDs`);
    for (const result of decisionResults) {
      const decisionId = String(result.decision_id);
      const outcome = String(result.outcome);
      const canonicalDecision = requireValue(
        decisionIndex.get(decisionId),
        decisionId,
      );
      if (!decisionIds.includes(decisionId))
        throw new Error(`${event.id}: unexpected ${decisionId} result`);
      if (!canonicalDecision.outcomes.includes(outcome))
        throw new Error(
          `${event.id}: ${decisionId} outcome is outside canonical choices`,
        );
      if (isObviousOutcomeContradiction(String(event.to_state), outcome))
        throw new Error(
          `${event.id}: ${decisionId} outcome contradicts ${event.to_state}`,
        );
    }
  }

  const serializedFacts = new Set<string>();
  for (const record of recordInstances) {
    const facts = record.facts as JsonObject;
    if (typeof facts.domain_kind !== "string")
      throw new Error(`${record.id}: domain_kind is missing`);
    if (!containsEntityReference(facts))
      throw new Error(`${record.id}: facts have no entity reference`);
    if (countLeaves(facts) < 6)
      throw new Error(`${record.id}: facts are not substantive`);
    if (
      !Object.keys(facts).some((key) =>
        /state|result|outcome|decision|status|disposition/.test(key),
      )
    )
      throw new Error(`${record.id}: facts have no state/result field`);
    const serialized = JSON.stringify(facts);
    if (serializedFacts.has(serialized))
      throw new Error(`${record.id}: duplicates another record's facts`);
    serializedFacts.add(serialized);
    if (record.source_event_id) {
      const source = requireValue(
        events.find((event) => event.id === record.source_event_id),
        `${record.id}: source event`,
      );
      if (!(source.record_writes as string[]).includes(String(record.id)))
        throw new Error(`${record.id}: source event does not write the record`);
      if (
        !(record.workflow_instance_ids as string[]).includes(
          String(source.workflow_instance_id),
        )
      )
        throw new Error(
          `${record.id}: source event is outside associated workflows`,
        );
      if (
        timestampMinutes(String(source.occurred_at)) >
        timestampMinutes(String(record.recorded_at))
      )
        throw new Error(`${record.id}: source event occurs after recorded_at`);
    }
  }
  for (const history of exceptionHistories)
    for (const eventId of history.event_ids as string[]) {
      const event = requireValue(
        events.find((candidate) => candidate.id === eventId),
        `${history.id}: event ${eventId}`,
      );
      if (
        !(event.exception_history_ids as string[]).includes(String(history.id))
      )
        throw new Error(`${history.id}: event ${eventId} is not reciprocal`);
    }
  const linkIndex = new Map(links.map((link) => [String(link.id), link]));
  for (const chain of operationalChains) {
    const workflowIds = new Set(chain.workflow_instance_ids as string[]);
    const recordIds = new Set(chain.record_instance_ids as string[]);
    for (const recordId of recordIds) {
      const record = requireValue(recordInstanceIndex.get(recordId), recordId);
      if (
        !(record.workflow_instance_ids as string[]).some((id) =>
          workflowIds.has(id),
        )
      )
        throw new Error(`${chain.id}: ${recordId} is unassociated`);
    }
    for (const linkId of chain.link_ids as string[]) {
      const link = requireValue(linkIndex.get(linkId), linkId);
      const target = (link.target as { entity_id: string }).entity_id;
      if (
        !recordIds.has(String(link.source_record_instance_id)) ||
        !recordIds.has(target) ||
        link.chain_id !== chain.id
      )
        throw new Error(`${chain.id}: ${linkId} is unrelated to the chain`);
    }
  }

  const outputs = new Map<string, string>([
    [
      "data/operation.json",
      await format(artifactJson(operation), { parser: "json" }),
    ],
    [
      "data/events.json",
      await format(artifactJson(eventDocument), { parser: "json" }),
    ],
    [
      "data/exceptions.json",
      await format(artifactJson(exceptionDocument), { parser: "json" }),
    ],
    [
      "validation/data-coverage.json",
      await format(artifactJson(coverage), { parser: "json" }),
    ],
  ]);
  const check = process.argv.includes("--check");
  const mismatches: string[] = [];
  for (const [relativePath, content] of outputs) {
    const outputPath = path.join(ROOT, relativePath);
    if (check) {
      const current = await readFile(outputPath, "utf8").catch(() => "");
      if (current !== content) mismatches.push(relativePath);
    } else {
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, content, "utf8");
    }
  }
  if (mismatches.length > 0) {
    console.error(`Generated data is stale: ${mismatches.join(", ")}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `${check ? "verified" : "generated"} ${workflowInstances.length} workflow instances, ${events.length} events, ${recordInstances.length} records, ${exceptionHistories.length} exception histories, and ${crossWorkflowLinks.length} cross-workflow links`,
  );
}

await main();
