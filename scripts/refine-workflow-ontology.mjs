import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import prettier from "prettier";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const checkOnly = process.argv.includes("--check");
const readJson = async (relativePath) =>
  JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
const writeJson = async (relativePath, value) => {
  const formatted = await prettier.format(JSON.stringify(value), {
    parser: "json",
  });
  return writeFile(path.join(ROOT, relativePath), formatted, "utf8");
};

const workflowsDocument = await readJson("workflow-model/workflows.json");
const decisionsDocument = await readJson("workflow-model/decisions.json");
const exceptionsDocument = await readJson("workflow-model/exceptions.json");
const recordsDocument = await readJson("workflow-model/records.json");
const rolesDocument = await readJson("workflow-model/roles.json");
const originalDocuments = structuredClone({
  workflowsDocument,
  decisionsDocument,
  exceptionsDocument,
  recordsDocument,
  rolesDocument,
});

const recordIndex = new Map(
  recordsDocument.records.map((record) => [record.id, record]),
);
const namesFor = (recordIds) =>
  recordIds.map((recordId) => recordIndex.get(recordId)?.name ?? recordId);
const profile = (reads, writes, exceptionIds, roleIds) => ({
  reads,
  writes,
  exceptionIds,
  roleIds,
});

const decisionProfiles = {
  "DEC-001": profile(
    ["REC-001", "REC-002", "REC-005"],
    ["REC-003", "REC-005"],
    ["EXC-001", "EXC-002", "EXC-003"],
    ["ROLE-VINEYARD-MANAGER", "ROLE-VITICULTURIST"],
  ),
  "DEC-002": profile(
    ["REC-001", "REC-003"],
    ["REC-003", "REC-005"],
    ["EXC-002", "EXC-003"],
    ["ROLE-VINEYARD-MANAGER", "ROLE-OPERATIONS-COORDINATOR"],
  ),
  "DEC-003": profile(
    ["REC-003", "REC-004", "REC-006"],
    ["REC-005", "REC-006", "REC-007"],
    ["EXC-004", "EXC-005"],
    ["ROLE-FOREMAN", "ROLE-VINEYARD-MANAGER"],
  ),
  "DEC-011": profile(
    ["REC-008", "REC-017"],
    ["REC-009"],
    ["EXC-011"],
    ["ROLE-SCOUT", "ROLE-CROP-PROTECTION-LEAD"],
  ),
  "DEC-012": profile(
    ["REC-009", "REC-010", "REC-013"],
    ["REC-010", "REC-012"],
    ["EXC-007", "EXC-009"],
    ["ROLE-CROP-PROTECTION-LEAD", "ROLE-COMPLIANCE-COORDINATOR"],
  ),
  "DEC-013": profile(
    ["REC-010", "REC-011", "REC-013", "REC-014"],
    ["REC-012", "REC-014"],
    ["EXC-006", "EXC-008", "EXC-009"],
    ["ROLE-CROP-PROTECTION-LEAD", "ROLE-PESTICIDE-HANDLER"],
  ),
  "DEC-014": profile(
    ["REC-012", "REC-017"],
    ["REC-017", "REC-009"],
    ["EXC-011"],
    ["ROLE-SCOUT", "ROLE-CROP-PROTECTION-LEAD"],
  ),
  "DEC-015": profile(
    ["REC-012", "REC-013", "REC-014", "REC-015"],
    ["REC-015", "REC-016"],
    ["EXC-010"],
    ["ROLE-COMPLIANCE-COORDINATOR", "ROLE-CROP-PROTECTION-LEAD"],
  ),
  "DEC-021": profile(
    ["REC-018", "REC-019", "REC-020", "REC-022", "REC-023"],
    ["REC-022"],
    ["EXC-012", "EXC-014", "EXC-015", "EXC-017"],
    ["ROLE-VITICULTURIST", "ROLE-IRRIGATION-LEAD"],
  ),
  "DEC-022": profile(
    ["REC-018", "REC-021", "REC-024"],
    ["REC-024", "REC-022"],
    ["EXC-014", "EXC-016", "EXC-017"],
    ["ROLE-VITICULTURIST"],
  ),
  "DEC-023": profile(
    ["REC-022", "REC-023", "REC-025", "REC-026"],
    ["REC-023", "REC-025", "REC-026"],
    ["EXC-012", "EXC-013", "EXC-017"],
    ["ROLE-IRRIGATOR", "ROLE-IRRIGATION-LEAD"],
  ),
  "DEC-024": profile(
    ["REC-018", "REC-019", "REC-021", "REC-022", "REC-024"],
    ["REC-022", "REC-024"],
    ["EXC-014", "EXC-015", "EXC-016"],
    ["ROLE-VINEYARD-MANAGER", "ROLE-VITICULTURIST"],
  ),
  "DEC-031": profile(
    ["REC-027", "REC-028", "REC-029"],
    ["REC-029"],
    ["EXC-018", "EXC-019", "EXC-020"],
    ["ROLE-VITICULTURIST", "ROLE-GROWER-RELATIONS"],
  ),
  "DEC-032": profile(
    ["REC-029", "REC-030", "REC-031"],
    ["REC-031", "REC-032"],
    ["EXC-020", "EXC-022"],
    ["ROLE-VINEYARD-MANAGER", "ROLE-VITICULTURIST"],
  ),
  "DEC-033": profile(
    ["REC-028", "REC-029", "REC-030", "REC-033"],
    ["REC-030", "REC-032", "REC-034"],
    ["EXC-021", "EXC-022", "EXC-023"],
    ["ROLE-VITICULTURIST", "ROLE-GROWER-RELATIONS"],
  ),
  "DEC-041": profile(
    ["REC-027", "REC-035", "REC-036", "REC-037", "REC-038"],
    ["REC-038"],
    ["EXC-024", "EXC-025", "EXC-026"],
    ["ROLE-VITICULTURIST", "ROLE-LAB"],
  ),
  "DEC-042": profile(
    ["REC-036", "REC-037", "REC-038"],
    ["REC-039"],
    ["EXC-027"],
    ["ROLE-VITICULTURIST", "ROLE-WINEMAKER"],
  ),
  "DEC-043": profile(
    ["REC-039", "REC-040", "REC-080"],
    ["REC-040", "REC-041"],
    ["EXC-026", "EXC-029"],
    ["ROLE-VINEYARD-MANAGER", "ROLE-WINEMAKER"],
  ),
  "DEC-044": profile(
    ["REC-039", "REC-041", "REC-080"],
    ["REC-040", "REC-041", "REC-042"],
    ["EXC-027", "EXC-028", "EXC-029"],
    ["ROLE-VINEYARD-MANAGER", "ROLE-WINEMAKER"],
  ),
  "DEC-051": profile(
    ["REC-041", "REC-043", "REC-044", "REC-080"],
    ["REC-043", "REC-044"],
    ["EXC-030", "EXC-031"],
    ["ROLE-VINEYARD-MANAGER", "ROLE-HARVEST-CREW-LEADER"],
  ),
  "DEC-052": profile(
    ["REC-041", "REC-045", "REC-046", "REC-047"],
    ["REC-045", "REC-050"],
    ["EXC-033"],
    ["ROLE-WINERY-INTAKE", "ROLE-TRANSPORTATION"],
  ),
  "DEC-053": profile(
    ["REC-045", "REC-047", "REC-048", "REC-080"],
    ["REC-049"],
    ["EXC-032", "EXC-034"],
    ["ROLE-WINERY-INTAKE", "ROLE-WINEMAKER"],
  ),
  "DEC-054": profile(
    ["REC-045", "REC-047", "REC-049", "REC-050", "REC-051"],
    ["REC-051", "REC-050"],
    ["EXC-033", "EXC-035", "EXC-036"],
    ["ROLE-GROWER-RELATIONS", "ROLE-WINERY-INTAKE"],
  ),
  "DEC-055": profile(
    ["REC-049", "REC-050", "REC-052", "REC-053", "REC-080"],
    ["REC-052", "REC-053"],
    ["EXC-036"],
    ["ROLE-FINANCE", "ROLE-GROWER-RELATIONS"],
  ),
  "DEC-061": profile(
    ["REC-003", "REC-054", "REC-055"],
    ["REC-054"],
    ["EXC-037", "EXC-038"],
    ["ROLE-OPERATIONS-COORDINATOR", "ROLE-FOREMAN"],
  ),
  "DEC-062": profile(
    ["REC-003", "REC-056", "REC-057"],
    ["REC-003", "REC-057", "REC-058"],
    ["EXC-039", "EXC-040"],
    ["ROLE-FOREMAN", "ROLE-OPERATIONS-COORDINATOR"],
  ),
  "DEC-063": profile(
    ["REC-057", "REC-058", "REC-059", "REC-060"],
    ["REC-061", "REC-062"],
    ["EXC-041", "EXC-042", "EXC-043"],
    ["ROLE-VINEYARD-MANAGER", "ROLE-FOREMAN"],
  ),
  "DEC-064": profile(
    ["REC-051", "REC-059", "REC-062", "REC-063"],
    ["REC-051", "REC-059", "REC-062", "REC-063"],
    ["EXC-041", "EXC-042", "EXC-043"],
    ["ROLE-PAYROLL", "ROLE-VINEYARD-MANAGER"],
  ),
  "DEC-071": profile(
    ["REC-064", "REC-065", "REC-066"],
    ["REC-067", "REC-071"],
    ["EXC-044", "EXC-046", "EXC-048"],
    ["ROLE-OPERATIONS-COORDINATOR", "ROLE-PURCHASING"],
  ),
  "DEC-072": profile(
    ["REC-065", "REC-067", "REC-070"],
    ["REC-068", "REC-069"],
    ["EXC-045", "EXC-049"],
    ["ROLE-PURCHASING", "ROLE-COMPLIANCE-COORDINATOR"],
  ),
  "DEC-073": profile(
    ["REC-064", "REC-067", "REC-068"],
    ["REC-068", "REC-069"],
    ["EXC-046", "EXC-050"],
    ["ROLE-VINEYARD-MANAGER", "ROLE-PURCHASING"],
  ),
  "DEC-074": profile(
    ["REC-066", "REC-072", "REC-073", "REC-074", "REC-075"],
    ["REC-072", "REC-073", "REC-075"],
    ["EXC-047", "EXC-048"],
    ["ROLE-MECHANIC", "ROLE-VINEYARD-MANAGER"],
  ),
  "DEC-081": profile(
    ["REC-076", "REC-077", "REC-078", "REC-079"],
    ["REC-079"],
    ["EXC-051"],
    ["ROLE-GROWER-RELATIONS", "ROLE-CONTRACT-GROWER"],
  ),
  "DEC-082": profile(
    ["REC-076", "REC-078", "REC-080", "REC-081", "REC-082"],
    ["REC-076", "REC-080"],
    ["EXC-052"],
    ["ROLE-GROWER-RELATIONS", "ROLE-COMPLIANCE-COORDINATOR"],
  ),
  "DEC-083": profile(
    ["REC-077", "REC-080", "REC-081"],
    ["REC-080", "REC-085"],
    ["EXC-053"],
    ["ROLE-GROWER-RELATIONS", "ROLE-CONTRACT-GROWER"],
  ),
  "DEC-084": profile(
    ["REC-083", "REC-084", "REC-085", "REC-086", "REC-087", "REC-088"],
    ["REC-085", "REC-086", "REC-087", "REC-088"],
    ["EXC-053", "EXC-054", "EXC-055", "EXC-056"],
    ["ROLE-GROWER-RELATIONS", "ROLE-VINEYARD-MANAGER"],
  ),
  "DEC-091": profile(
    ["REC-080", "REC-082", "REC-089", "REC-090"],
    ["REC-090"],
    ["EXC-057", "EXC-058", "EXC-059", "EXC-060"],
    ["ROLE-COMPLIANCE-COORDINATOR", "ROLE-CERTIFIER"],
  ),
  "DEC-092": profile(
    [
      "REC-090",
      "REC-091",
      "REC-092",
      "REC-093",
      "REC-094",
      "REC-095",
      "REC-096",
      "REC-097",
      "REC-098",
      "REC-099",
      "REC-100",
      "REC-101",
    ],
    ["REC-101"],
    ["EXC-057", "EXC-058", "EXC-060"],
    ["ROLE-COMPLIANCE-COORDINATOR", "ROLE-VINEYARD-MANAGER"],
  ),
  "DEC-093": profile(
    ["REC-101", "REC-102"],
    ["REC-102", "REC-103"],
    ["EXC-059", "EXC-061", "EXC-062"],
    ["ROLE-AUDITOR", "ROLE-CERTIFIER"],
  ),
  "DEC-094": profile(
    ["REC-086", "REC-101", "REC-102", "REC-103"],
    ["REC-086", "REC-101", "REC-103"],
    ["EXC-061", "EXC-062"],
    ["ROLE-CERTIFIER", "ROLE-COMPLIANCE-COORDINATOR"],
  ),
};

const exceptionBranches = {
  "EXC-001": ["assigned", "blocked", ["DEC-001"]],
  "EXC-002": ["in_progress", "blocked", ["DEC-001", "DEC-002"]],
  "EXC-003": ["assigned", "blocked", ["DEC-001", "DEC-002"]],
  "EXC-004": ["in_progress", "partially_completed", ["DEC-003"]],
  "EXC-005": ["completed", "correction_required", ["DEC-003"]],
  "EXC-006": ["preflight_check", "cancelled", ["DEC-013"]],
  "EXC-007": ["approved", "cancelled", ["DEC-012"]],
  "EXC-008": ["preflight_check", "cancelled", ["DEC-013"]],
  "EXC-009": ["preflight_check", "cancelled", ["DEC-012", "DEC-013"]],
  "EXC-010": ["reported", "corrected", ["DEC-015"]],
  "EXC-011": ["follow_up_due", "ineffective", ["DEC-011", "DEC-014"]],
  "EXC-012": ["delivering", "delivery_interrupted", ["DEC-021", "DEC-023"]],
  "EXC-013": ["delivering", "partially_delivered", ["DEC-023"]],
  "EXC-014": [
    "assigned",
    "delivery_interrupted",
    ["DEC-021", "DEC-022", "DEC-024"],
  ],
  "EXC-015": ["assigned", "superseded", ["DEC-021", "DEC-024"]],
  "EXC-016": ["adjustment_recommended", "superseded", ["DEC-022", "DEC-024"]],
  "EXC-017": [
    "delivered",
    "correction_required",
    ["DEC-021", "DEC-022", "DEC-023"],
  ],
  "EXC-018": ["reviewed", "revision_due", ["DEC-031"]],
  "EXC-019": ["calculated", "revision_due", ["DEC-031"]],
  "EXC-020": ["reviewed", "revision_due", ["DEC-031", "DEC-032"]],
  "EXC-021": ["published", "revision_due", ["DEC-033"]],
  "EXC-022": ["reviewed", "revision_due", ["DEC-032", "DEC-033"]],
  "EXC-023": ["actualized", "revision_due", ["DEC-033"]],
  "EXC-024": ["lab_pending", "more_sampling_required", ["DEC-041"]],
  "EXC-025": ["result_available", "more_sampling_required", ["DEC-041"]],
  "EXC-026": ["result_available", "negotiating", ["DEC-041", "DEC-043"]],
  "EXC-027": ["readiness_assessed", "superseded", ["DEC-042", "DEC-044"]],
  "EXC-028": ["pick_proposed", "deferred", ["DEC-044"]],
  "EXC-029": ["authorized", "superseded", ["DEC-043", "DEC-044"]],
  "EXC-030": ["harvesting", "delayed", ["DEC-051"]],
  "EXC-031": ["in_transit", "delayed", ["DEC-051"]],
  "EXC-032": ["quality_pending", "downgraded", ["DEC-053"]],
  "EXC-033": ["arrived", "disputed", ["DEC-052", "DEC-054"]],
  "EXC-034": ["quality_pending", "rejected", ["DEC-053"]],
  "EXC-035": ["entered", "correction_required", ["DEC-054"]],
  "EXC-036": ["weighed", "disputed", ["DEC-054", "DEC-055"]],
  "EXC-037": ["crew_scheduled", "exception_flagged", ["DEC-061"]],
  "EXC-038": ["briefed", "exception_flagged", ["DEC-061"]],
  "EXC-039": ["working", "paused", ["DEC-062"]],
  "EXC-040": ["working", "reassigned", ["DEC-062"]],
  "EXC-041": ["time_submitted", "exception_flagged", ["DEC-063", "DEC-064"]],
  "EXC-042": [
    "supervisor_verified",
    "exception_flagged",
    ["DEC-063", "DEC-064"],
  ],
  "EXC-043": ["time_submitted", "exception_flagged", ["DEC-063", "DEC-064"]],
  "EXC-044": ["availability_checked", "unavailable", ["DEC-071"]],
  "EXC-045": ["substitution_pending", "superseded", ["DEC-072"]],
  "EXC-046": ["ordered", "unavailable", ["DEC-071", "DEC-073"]],
  "EXC-047": ["in_use", "failure_reported", ["DEC-074"]],
  "EXC-048": ["repair_open", "unavailable", ["DEC-071", "DEC-074"]],
  "EXC-049": ["received", "corrected", ["DEC-072"]],
  "EXC-050": ["purchase_requested", "superseded", ["DEC-073"]],
  "EXC-051": ["identity_matching", "disputed", ["DEC-081"]],
  "EXC-052": ["due_diligence", "at_risk", ["DEC-082"]],
  "EXC-053": ["active", "at_risk", ["DEC-083", "DEC-084"]],
  "EXC-054": ["report_due", "disputed", ["DEC-084"]],
  "EXC-055": ["at_risk", "disputed", ["DEC-084"]],
  "EXC-056": ["fulfilled", "disputed", ["DEC-084"]],
  "EXC-057": ["evidence_collecting", "gap_identified", ["DEC-091", "DEC-092"]],
  "EXC-058": ["evidence_collecting", "gap_identified", ["DEC-091", "DEC-092"]],
  "EXC-059": ["under_review", "noncompliant", ["DEC-091", "DEC-093"]],
  "EXC-060": ["evidence_collecting", "gap_identified", ["DEC-091", "DEC-092"]],
  "EXC-061": ["under_review", "noncompliant", ["DEC-093", "DEC-094"]],
  "EXC-062": ["under_review", "certification_withheld", ["DEC-093", "DEC-094"]],
};

const terminalStates = {
  "WF-001": ["verified", "cancelled", "superseded"],
  "WF-002": ["effective", "cancelled"],
  "WF-003": ["verified", "superseded"],
  "WF-004": ["reconciled", "superseded"],
  "WF-005": ["scheduled", "superseded"],
  "WF-006": ["settled"],
  "WF-007": ["cost_allocated"],
  "WF-008": ["cost_reconciled", "superseded"],
  "WF-009": ["historical", "ended", "superseded"],
  "WF-010": ["archived", "superseded"],
};

const supplementalWorkflowRoles = {
  "WF-001": ["ROLE-OWNER-GENERAL-MANAGER", "ROLE-ASSISTANT-VINEYARD-MANAGER"],
  "WF-002": ["ROLE-ASSISTANT-VINEYARD-MANAGER"],
  "WF-003": ["ROLE-ASSISTANT-VINEYARD-MANAGER"],
  "WF-004": ["ROLE-OWNER-GENERAL-MANAGER", "ROLE-ASSISTANT-VINEYARD-MANAGER"],
  "WF-005": ["ROLE-OWNER-GENERAL-MANAGER"],
  "WF-006": ["ROLE-OWNER-GENERAL-MANAGER", "ROLE-ASSISTANT-VINEYARD-MANAGER"],
  "WF-007": ["ROLE-ASSISTANT-VINEYARD-MANAGER"],
  "WF-008": ["ROLE-OWNER-GENERAL-MANAGER", "ROLE-ASSISTANT-VINEYARD-MANAGER"],
  "WF-009": ["ROLE-OWNER-GENERAL-MANAGER"],
  "WF-010": ["ROLE-OWNER-GENERAL-MANAGER"],
};

const supplementalExceptionRecords = {
  "EXC-010": ["REC-015", "REC-016"],
  "EXC-038": ["REC-056"],
};

const exceptionRecordOverrides = {
  "EXC-006": ["REC-010", "REC-011", "REC-012"],
  "EXC-008": ["REC-012", "REC-013", "REC-014"],
  "EXC-017": ["REC-018", "REC-020", "REC-022", "REC-023", "REC-025", "REC-026"],
  "EXC-043": ["REC-057", "REC-059", "REC-061", "REC-062", "REC-051"],
  "EXC-058": ["REC-080", "REC-082", "REC-095", "REC-098", "REC-101"],
  "EXC-060": ["REC-090", "REC-097", "REC-098", "REC-101"],
};

const workflowRecords = new Map(
  workflowsDocument.workflows.map((workflow) => [
    workflow.id,
    recordsDocument.records
      .filter((record) => record.workflow_ids.includes(workflow.id))
      .map((record) => record.id),
  ]),
);

const primaryTransitionRecords = {
  "WF-007": {
    "crew_scheduled->briefed": {
      reads: ["REC-003", "REC-054", "REC-055"],
      writes: ["REC-056"],
    },
    "working->time_submitted": {
      reads: ["REC-057", "REC-058"],
      writes: ["REC-059", "REC-060"],
    },
    "payroll_accepted->cost_allocated": {
      reads: ["REC-059", "REC-060", "REC-063"],
      writes: ["REC-063"],
    },
  },
};

function transition(from, to, kind, owner, description, options = {}) {
  return {
    from,
    to,
    kind,
    owner,
    trigger: options.trigger ?? description,
    description,
    record_reads: options.reads ?? [],
    record_writes: options.writes ?? [],
    decision_ids: options.decisions ?? [],
    exception_ids: options.exceptions ?? [],
    evidence_ids: options.evidence ?? [],
    classification: options.classification ?? "product_decision",
    confidence: options.confidence ?? "medium-high",
    ...(options.outcome ? { decision_outcome: options.outcome } : {}),
  };
}

const additionalTransitions = {
  "WF-001": [
    transition(
      "planned",
      "cancelled",
      "cancellation",
      "ROLE-VINEYARD-MANAGER",
      "Decline work with an attributable rationale.",
      {
        decisions: ["DEC-002"],
        reads: ["REC-001", "REC-003"],
        writes: ["REC-005"],
      },
    ),
    transition(
      "approved",
      "superseded",
      "supersession",
      "ROLE-VINEYARD-MANAGER",
      "Replace an approved plan when a newer constraint makes it unsafe or invalid.",
      {
        decisions: ["DEC-001"],
        reads: ["REC-001", "REC-002"],
        writes: ["REC-005"],
      },
    ),
    transition(
      "blocked",
      "assigned",
      "recovery",
      "ROLE-OPERATIONS-COORDINATOR",
      "Release or redispatch blocked work after scope and resources are reconciled.",
      {
        exceptions: ["EXC-001", "EXC-002", "EXC-003"],
        reads: ["REC-003", "REC-005"],
        writes: ["REC-003", "REC-005"],
      },
    ),
    transition(
      "partially_completed",
      "assigned",
      "recovery",
      "ROLE-OPERATIONS-COORDINATOR",
      "Create a remaining-scope assignment without erasing safe partial completion.",
      {
        exceptions: ["EXC-004"],
        reads: ["REC-004", "REC-006"],
        writes: ["REC-003", "REC-005"],
      },
    ),
    transition(
      "partially_completed",
      "completed",
      "completion",
      "ROLE-FOREMAN",
      "Close the explicitly accepted partial scope with attributed actuals.",
      {
        decisions: ["DEC-003"],
        reads: ["REC-004", "REC-006"],
        writes: ["REC-005", "REC-006"],
      },
    ),
    transition(
      "correction_required",
      "corrected",
      "correction",
      "ROLE-FOREMAN",
      "Append corrected closure quantities and the reason for change.",
      {
        decisions: ["DEC-003"],
        exceptions: ["EXC-005"],
        reads: ["REC-004", "REC-006"],
        writes: ["REC-005", "REC-006"],
      },
    ),
    transition(
      "corrected",
      "verified",
      "verification",
      "ROLE-VINEYARD-MANAGER",
      "Verify the corrected successor while retaining the original closure record.",
      {
        decisions: ["DEC-003"],
        exceptions: ["EXC-005"],
        reads: ["REC-005", "REC-006"],
        writes: ["REC-007"],
      },
    ),
  ],
  "WF-002": [
    transition(
      null,
      "monitoring_due",
      "observation",
      "ROLE-SCOUT",
      "Open a due monitoring cycle for the block and target.",
      { reads: ["REC-008"], writes: ["REC-008"] },
    ),
    transition(
      "monitoring_due",
      "observation_recorded",
      "observation",
      "ROLE-SCOUT",
      "Capture an attributed scouting observation.",
      { reads: ["REC-008"], writes: ["REC-008"] },
    ),
    transition(
      "observation_recorded",
      "pressure_assessed",
      "recommendation",
      "ROLE-CROP-PROTECTION-LEAD",
      "Assess pressure and threshold evidence before recommending treatment.",
      {
        decisions: ["DEC-011"],
        reads: ["REC-008", "REC-017"],
        writes: ["REC-009"],
      },
    ),
    transition(
      "pressure_assessed",
      "treatment_recommended",
      "recommendation",
      "ROLE-CROP-PROTECTION-LEAD",
      "Recommend a permitted treatment after the action threshold is met.",
      {
        decisions: ["DEC-011", "DEC-012"],
        reads: ["REC-008", "REC-010"],
        writes: ["REC-009"],
      },
    ),
    transition(
      "pressure_assessed",
      "cancelled",
      "cancellation",
      "ROLE-CROP-PROTECTION-LEAD",
      "Record no treatment when pressure remains below threshold.",
      { decisions: ["DEC-011"], reads: ["REC-008"], writes: ["REC-009"] },
    ),
    transition(
      "treatment_recommended",
      "cancelled",
      "cancellation",
      "ROLE-CROP-PROTECTION-LEAD",
      "Reject an impermissible product or method with rationale.",
      {
        decisions: ["DEC-012"],
        reads: ["REC-009", "REC-010"],
        writes: ["REC-010"],
      },
    ),
    transition(
      "scheduled",
      "preflight_check",
      "verification",
      "ROLE-CROP-PROTECTION-LEAD",
      "Reopen the release check when conditions or restrictions change before application.",
      {
        decisions: ["DEC-013"],
        reads: ["REC-010", "REC-011", "REC-013", "REC-014"],
        writes: ["REC-012"],
      },
    ),
    transition(
      "reported",
      "follow_up_due",
      "assignment",
      "ROLE-CROP-PROTECTION-LEAD",
      "Schedule attributed efficacy follow-up after reporting.",
      { reads: ["REC-012", "REC-016"], writes: ["REC-017"] },
    ),
    transition(
      "follow_up_due",
      "effective",
      "verification",
      "ROLE-SCOUT",
      "Close the efficacy loop when follow-up meets the target.",
      {
        decisions: ["DEC-014"],
        reads: ["REC-012", "REC-017"],
        writes: ["REC-017"],
      },
    ),
    transition(
      "corrected",
      "reported",
      "recovery",
      "ROLE-COMPLIANCE-COORDINATOR",
      "Resubmit the corrected diary or restriction record without overwriting history.",
      {
        decisions: ["DEC-015"],
        exceptions: ["EXC-010"],
        reads: ["REC-015", "REC-016"],
        writes: ["REC-015", "REC-016"],
      },
    ),
    transition(
      "ineffective",
      "treatment_recommended",
      "recovery",
      "ROLE-CROP-PROTECTION-LEAD",
      "Return ineffective treatment to recommendation with new evidence.",
      {
        decisions: ["DEC-014"],
        exceptions: ["EXC-011"],
        reads: ["REC-017", "REC-008"],
        writes: ["REC-009"],
      },
    ),
  ],
  "WF-003": [
    transition(
      "delivery_interrupted",
      "assigned",
      "recovery",
      "ROLE-IRRIGATION-LEAD",
      "Redispatch the safely remaining set after interruption review.",
      {
        exceptions: ["EXC-012", "EXC-014"],
        reads: ["REC-022", "REC-023", "REC-025"],
        writes: ["REC-022"],
      },
    ),
    transition(
      "partially_delivered",
      "assigned",
      "recovery",
      "ROLE-IRRIGATION-LEAD",
      "Assign only the undelivered zone or duration while retaining actual delivery.",
      {
        exceptions: ["EXC-013"],
        reads: ["REC-023", "REC-026"],
        writes: ["REC-022"],
      },
    ),
    transition(
      "partially_delivered",
      "verified",
      "verification",
      "ROLE-IRRIGATION-LEAD",
      "Verify an accepted partial delivery with explicit affected scope.",
      {
        decisions: ["DEC-023"],
        reads: ["REC-023", "REC-026"],
        writes: ["REC-026"],
      },
    ),
    transition(
      "correction_required",
      "corrected",
      "correction",
      "ROLE-IRRIGATION-LEAD",
      "Append corrected delivery actuals and reconcile downstream totals.",
      {
        decisions: ["DEC-023"],
        exceptions: ["EXC-017"],
        reads: ["REC-023", "REC-026"],
        writes: ["REC-023", "REC-026"],
      },
    ),
    transition(
      "corrected",
      "verified",
      "verification",
      "ROLE-VINEYARD-MANAGER",
      "Verify the corrected irrigation or fertility record.",
      { reads: ["REC-023", "REC-024", "REC-026"], writes: ["REC-026"] },
    ),
  ],
  "WF-004": [
    transition(
      null,
      "estimate_due",
      "assignment",
      "ROLE-VITICULTURIST",
      "Open a dated block estimate cycle.",
      { reads: ["REC-027"], writes: ["REC-027"] },
    ),
    transition(
      "estimate_due",
      "sampled",
      "observation",
      "ROLE-VITICULTURIST",
      "Collect the current representative sample.",
      { reads: ["REC-027"], writes: ["REC-028"] },
    ),
    transition(
      "published",
      "revision_due",
      "supersession",
      "ROLE-VITICULTURIST",
      "Open a revision when material new evidence arrives.",
      {
        decisions: ["DEC-033"],
        reads: ["REC-029", "REC-030"],
        writes: ["REC-030"],
      },
    ),
    transition(
      "revision_due",
      "sampled",
      "observation",
      "ROLE-VITICULTURIST",
      "Resample the affected block for a defensible revision.",
      {
        decisions: ["DEC-033"],
        reads: ["REC-027", "REC-030"],
        writes: ["REC-028"],
      },
    ),
    transition(
      "calculated",
      "revised",
      "supersession",
      "ROLE-VITICULTURIST",
      "Create a successor forecast version from the recalculated estimate.",
      {
        decisions: ["DEC-033"],
        reads: ["REC-028", "REC-029", "REC-030"],
        writes: ["REC-030"],
      },
    ),
    transition(
      "revised",
      "published",
      "communication",
      "ROLE-GROWER-RELATIONS",
      "Publish and communicate the successor forecast with effective time.",
      { decisions: ["DEC-033"], reads: ["REC-030"], writes: ["REC-032"] },
    ),
    transition(
      "published",
      "superseded",
      "supersession",
      "ROLE-VITICULTURIST",
      "Mark the predecessor forecast superseded only after its successor is published.",
      { decisions: ["DEC-033"], reads: ["REC-030"], writes: ["REC-030"] },
    ),
  ],
  "WF-005": [
    transition(
      null,
      "sampling_due",
      "assignment",
      "ROLE-VITICULTURIST",
      "Open the next maturity sampling cycle.",
      { reads: ["REC-027", "REC-038"], writes: ["REC-027"] },
    ),
    transition(
      "sampling_due",
      "sample_collected",
      "observation",
      "ROLE-VITICULTURIST",
      "Collect a traceable sample against the block and subarea.",
      { reads: ["REC-027"], writes: ["REC-035", "REC-036"] },
    ),
    transition(
      "readiness_assessed",
      "more_sampling_required",
      "recommendation",
      "ROLE-VITICULTURIST",
      "Require another sample when evidence is stale, unrepresentative, or not ready.",
      {
        decisions: ["DEC-041", "DEC-042"],
        reads: ["REC-036", "REC-037", "REC-038"],
        writes: ["REC-027", "REC-038"],
      },
    ),
    transition(
      "more_sampling_required",
      "sampling_due",
      "assignment",
      "ROLE-VITICULTURIST",
      "Schedule the next sample at the evidence-appropriate cadence.",
      { reads: ["REC-038"], writes: ["REC-027"] },
    ),
    transition(
      "pick_proposed",
      "negotiating",
      "communication",
      "ROLE-GROWER-RELATIONS",
      "Open attributed cross-organization pick negotiation.",
      {
        decisions: ["DEC-043", "DEC-044"],
        reads: ["REC-039", "REC-080"],
        writes: ["REC-040"],
      },
    ),
    transition(
      "negotiating",
      "authorized",
      "approval",
      "ROLE-WINEMAKER",
      "Authorize the pick under the applicable contract authority.",
      {
        decisions: ["DEC-043", "DEC-044"],
        reads: ["REC-039", "REC-040", "REC-080"],
        writes: ["REC-041"],
      },
    ),
    transition(
      "negotiating",
      "deferred",
      "communication",
      "ROLE-WINEMAKER",
      "Defer the pick with a review condition and accountable notice.",
      {
        decisions: ["DEC-043", "DEC-044"],
        reads: ["REC-039", "REC-040"],
        writes: ["REC-040"],
      },
    ),
    transition(
      "deferred",
      "sampling_due",
      "recovery",
      "ROLE-VITICULTURIST",
      "Return a deferred pick to the sampling cadence.",
      { reads: ["REC-038", "REC-040"], writes: ["REC-027"] },
    ),
  ],
  "WF-006": [
    transition(
      null,
      "authorized",
      "approval",
      "ROLE-WINEMAKER",
      "Open harvest execution from the current attributed pick authorization.",
      {
        decisions: ["DEC-051"],
        reads: ["REC-041", "REC-043", "REC-080"],
        writes: ["REC-043"],
      },
    ),
    transition(
      "load_created",
      "in_transit",
      "execution",
      "ROLE-TRANSPORTATION",
      "Dispatch the identified load to its authorized destination.",
      { reads: ["REC-045", "REC-046"], writes: ["REC-046"] },
    ),
    transition(
      "in_transit",
      "arrived",
      "completion",
      "ROLE-WINERY-INTAKE",
      "Acknowledge arrival without breaking load identity.",
      { reads: ["REC-045", "REC-046"], writes: ["REC-050"] },
    ),
    transition(
      "weighed",
      "quality_pending",
      "verification",
      "ROLE-WINERY-INTAKE",
      "Hold disposition until intake quality evidence is available.",
      { reads: ["REC-045", "REC-047"], writes: ["REC-048"] },
    ),
    transition(
      "quality_pending",
      "accepted",
      "approval",
      "ROLE-WINEMAKER",
      "Accept a load that meets identity and quality tolerances.",
      {
        decisions: ["DEC-052", "DEC-053"],
        reads: ["REC-045", "REC-047", "REC-048", "REC-080"],
        writes: ["REC-049"],
      },
    ),
    transition(
      "quality_pending",
      "downgraded",
      "approval",
      "ROLE-WINEMAKER",
      "Downgrade a load with attributed evidence and terms.",
      {
        decisions: ["DEC-053"],
        reads: ["REC-048", "REC-080"],
        writes: ["REC-049", "REC-052"],
      },
    ),
    transition(
      "quality_pending",
      "rejected",
      "approval",
      "ROLE-WINEMAKER",
      "Reject a load with attributed evidence and disposition.",
      {
        decisions: ["DEC-053"],
        reads: ["REC-048", "REC-080"],
        writes: ["REC-049", "REC-052"],
      },
    ),
    transition(
      "downgraded",
      "entered",
      "reconciliation",
      "ROLE-WINERY-INTAKE",
      "Enter the downgraded disposition for reconciliation.",
      { reads: ["REC-049"], writes: ["REC-050"] },
    ),
    transition(
      "rejected",
      "entered",
      "reconciliation",
      "ROLE-WINERY-INTAKE",
      "Enter the rejected disposition for contract and settlement handling.",
      { reads: ["REC-049"], writes: ["REC-050"] },
    ),
    transition(
      "delayed",
      "harvesting",
      "recovery",
      "ROLE-HARVEST-CREW-LEADER",
      "Resume harvest after a winery-capacity delay is released.",
      { exceptions: ["EXC-030"], reads: ["REC-043"], writes: ["REC-043"] },
    ),
    transition(
      "delayed",
      "in_transit",
      "recovery",
      "ROLE-TRANSPORTATION",
      "Resume transport after a slot or route delay is released.",
      {
        exceptions: ["EXC-031"],
        reads: ["REC-045", "REC-046"],
        writes: ["REC-046"],
      },
    ),
    transition(
      "disputed",
      "correction_required",
      "correction",
      "ROLE-GROWER-RELATIONS",
      "Open an attributable correction for disputed identity, weight, grade, or payment evidence.",
      {
        decisions: ["DEC-054"],
        exceptions: ["EXC-033", "EXC-036"],
        reads: ["REC-045", "REC-047", "REC-049", "REC-050"],
        writes: ["REC-051"],
      },
    ),
    transition(
      "correction_required",
      "corrected",
      "correction",
      "ROLE-WINERY-INTAKE",
      "Append the authorized successor delivery record.",
      {
        decisions: ["DEC-054"],
        exceptions: ["EXC-035"],
        reads: ["REC-050", "REC-051"],
        writes: ["REC-050", "REC-051"],
      },
    ),
    transition(
      "corrected",
      "reconciled",
      "reconciliation",
      "ROLE-GROWER-RELATIONS",
      "Reconcile the corrected delivery without erasing the disputed predecessor.",
      {
        decisions: ["DEC-054", "DEC-055"],
        reads: ["REC-050", "REC-051", "REC-080"],
        writes: ["REC-052", "REC-053"],
      },
    ),
    transition(
      "entered",
      "disputed",
      "exception",
      "ROLE-GROWER-RELATIONS",
      "Flag a delivery or settlement conflict before reconciliation.",
      {
        decisions: ["DEC-054"],
        reads: ["REC-050", "REC-051"],
        writes: ["REC-051"],
      },
    ),
  ],
  "WF-007": [
    transition(
      null,
      "labor_demanded",
      "assignment",
      "ROLE-OPERATIONS-COORDINATOR",
      "Record qualified labor demand against executable work.",
      { reads: ["REC-003"], writes: ["REC-054"] },
    ),
    transition(
      "labor_demanded",
      "crew_scheduled",
      "assignment",
      "ROLE-OPERATIONS-COORDINATOR",
      "Schedule a qualified crew or contractor.",
      {
        decisions: ["DEC-061"],
        reads: ["REC-003", "REC-054", "REC-055"],
        writes: ["REC-054"],
      },
    ),
    transition(
      "briefed",
      "checked_in",
      "assignment",
      "ROLE-FOREMAN",
      "Record attendance after qualification and safety briefing.",
      { reads: ["REC-054", "REC-055", "REC-056"], writes: ["REC-057"] },
    ),
    transition(
      "checked_in",
      "working",
      "execution",
      "ROLE-FOREMAN",
      "Start attributable block and task work.",
      { reads: ["REC-003", "REC-057"], writes: ["REC-057", "REC-059"] },
    ),
    transition(
      "working",
      "checked_out",
      "completion",
      "ROLE-FOREMAN",
      "Close attendance while retaining breaks, quantities, and reassignment history.",
      {
        reads: ["REC-057", "REC-058", "REC-060"],
        writes: ["REC-057", "REC-059"],
      },
    ),
    transition(
      "checked_out",
      "time_submitted",
      "completion",
      "ROLE-FOREMAN",
      "Submit the attributable time and unit record.",
      { reads: ["REC-057", "REC-058", "REC-060"], writes: ["REC-059"] },
    ),
    transition(
      "paused",
      "briefed",
      "recovery",
      "ROLE-FOREMAN",
      "Rebrief the crew before resuming paused work.",
      {
        decisions: ["DEC-062"],
        exceptions: ["EXC-039"],
        reads: ["REC-056", "REC-058"],
        writes: ["REC-056"],
      },
    ),
    transition(
      "reassigned",
      "briefed",
      "recovery",
      "ROLE-FOREMAN",
      "Brief the crew on the successor assignment before resuming.",
      {
        decisions: ["DEC-062"],
        exceptions: ["EXC-040"],
        reads: ["REC-003", "REC-057"],
        writes: ["REC-003", "REC-056"],
      },
    ),
    transition(
      "exception_flagged",
      "corrected",
      "correction",
      "ROLE-PAYROLL",
      "Append an authorized labor correction with supporting evidence.",
      {
        decisions: ["DEC-064"],
        exceptions: ["EXC-041", "EXC-042", "EXC-043"],
        reads: ["REC-051", "REC-059", "REC-062"],
        writes: ["REC-051", "REC-059", "REC-062"],
      },
    ),
    transition(
      "corrected",
      "supervisor_verified",
      "verification",
      "ROLE-VINEYARD-MANAGER",
      "Verify the corrected labor record before payroll acceptance.",
      {
        decisions: ["DEC-063"],
        reads: ["REC-051", "REC-059", "REC-062"],
        writes: ["REC-061"],
      },
    ),
  ],
  "WF-008": [
    transition(
      "availability_checked",
      "purchase_requested",
      "recommendation",
      "ROLE-PURCHASING",
      "Open a purchase, rental, or contractor request for the readiness gap.",
      {
        decisions: ["DEC-071"],
        reads: ["REC-064", "REC-065", "REC-066"],
        writes: ["REC-067"],
      },
    ),
    transition(
      "purchase_requested",
      "approved",
      "approval",
      "ROLE-VINEYARD-MANAGER",
      "Approve the resource commitment within authority and budget.",
      {
        decisions: ["DEC-072", "DEC-073"],
        reads: ["REC-067", "REC-068"],
        writes: ["REC-068"],
      },
    ),
    transition(
      "ready",
      "in_use",
      "execution",
      "ROLE-EQUIPMENT-OPERATOR",
      "Place verified equipment or staged material into accountable use.",
      { reads: ["REC-066", "REC-071"], writes: ["REC-066"] },
    ),
    transition(
      "in_use",
      "failure_reported",
      "exception",
      "ROLE-EQUIPMENT-OPERATOR",
      "Report an attributed equipment failure and preserve safe partial work.",
      { decisions: ["DEC-074"], reads: ["REC-066"], writes: ["REC-072"] },
    ),
    transition(
      "failure_reported",
      "repair_open",
      "assignment",
      "ROLE-MECHANIC",
      "Open a repair order with isolation and urgency context.",
      { reads: ["REC-072"], writes: ["REC-073"] },
    ),
    transition(
      "repair_open",
      "repaired",
      "completion",
      "ROLE-MECHANIC",
      "Record parts, labor, and completed repair work.",
      { reads: ["REC-073"], writes: ["REC-074"] },
    ),
    transition(
      "repaired",
      "verified_ready",
      "verification",
      "ROLE-MECHANIC",
      "Verify safe return to service after repair.",
      {
        decisions: ["DEC-074"],
        reads: ["REC-073", "REC-074"],
        writes: ["REC-075"],
      },
    ),
    transition(
      "verified_ready",
      "ready",
      "recovery",
      "ROLE-OPERATIONS-COORDINATOR",
      "Release the verified resource back to the affected plan.",
      { exceptions: ["EXC-047"], reads: ["REC-075"], writes: ["REC-066"] },
    ),
    transition(
      "unavailable",
      "substitution_pending",
      "recovery",
      "ROLE-PURCHASING",
      "Evaluate an allowed substitute or alternate resource.",
      {
        exceptions: ["EXC-044", "EXC-046", "EXC-048"],
        reads: ["REC-065", "REC-067"],
        writes: ["REC-067"],
      },
    ),
    transition(
      "substitution_pending",
      "purchase_requested",
      "recommendation",
      "ROLE-PURCHASING",
      "Submit the validated substitute for approval.",
      {
        decisions: ["DEC-072", "DEC-073"],
        reads: ["REC-065", "REC-067"],
        writes: ["REC-067"],
      },
    ),
    transition(
      "corrected",
      "staged",
      "correction",
      "ROLE-PURCHASING",
      "Restage the corrected receipt or lot record.",
      {
        exceptions: ["EXC-049"],
        reads: ["REC-070", "REC-071"],
        writes: ["REC-070", "REC-071"],
      },
    ),
  ],
  "WF-009": [
    transition(
      "due_diligence",
      "terms_negotiating",
      "communication",
      "ROLE-GROWER-RELATIONS",
      "Negotiate explicit authority, quality, notice, delivery, dispute, and payment terms.",
      {
        decisions: ["DEC-082", "DEC-083"],
        reads: ["REC-076", "REC-080", "REC-081", "REC-082"],
        writes: ["REC-080", "REC-085"],
      },
    ),
    transition(
      "terms_negotiating",
      "active",
      "approval",
      "ROLE-GROWER-RELATIONS",
      "Activate the relationship after identities, evidence, and terms are accepted.",
      {
        decisions: ["DEC-081", "DEC-082", "DEC-083"],
        reads: ["REC-076", "REC-079", "REC-080"],
        writes: ["REC-076", "REC-080"],
      },
    ),
    transition(
      "terms_negotiating",
      "ended",
      "cancellation",
      "ROLE-GROWER-RELATIONS",
      "End onboarding when material terms or evidence cannot be resolved.",
      {
        decisions: ["DEC-082", "DEC-083"],
        reads: ["REC-080", "REC-082"],
        writes: ["REC-085"],
      },
    ),
    transition(
      "active",
      "report_due",
      "assignment",
      "ROLE-GROWER-RELATIONS",
      "Request the next required crop, maturity, compliance, or quality update.",
      {
        reads: ["REC-080", "REC-081", "REC-082"],
        writes: ["REC-084", "REC-085"],
      },
    ),
    transition(
      "report_due",
      "aligned",
      "verification",
      "ROLE-GROWER-RELATIONS",
      "Accept a current, mutually understood operating update.",
      {
        decisions: ["DEC-084"],
        reads: ["REC-083", "REC-084", "REC-085"],
        writes: ["REC-085"],
      },
    ),
    transition(
      "settled",
      "renewal_due",
      "assignment",
      "ROLE-GROWER-RELATIONS",
      "Open renewal review with the complete relationship history.",
      { reads: ["REC-080", "REC-088"], writes: ["REC-085"] },
    ),
    transition(
      "renewal_due",
      "active",
      "approval",
      "ROLE-GROWER-RELATIONS",
      "Renew the operating relationship with effective terms.",
      {
        decisions: ["DEC-083"],
        reads: ["REC-080", "REC-088"],
        writes: ["REC-080"],
      },
    ),
    transition(
      "renewal_due",
      "historical",
      "supersession",
      "ROLE-GROWER-RELATIONS",
      "Archive the completed relationship when it is not renewed.",
      { reads: ["REC-080", "REC-088"], writes: ["REC-088"] },
    ),
    transition(
      "at_risk",
      "corrective_action",
      "recovery",
      "ROLE-GROWER-RELATIONS",
      "Open accountable corrective action before the issue becomes a dispute.",
      {
        decisions: ["DEC-084"],
        exceptions: ["EXC-052", "EXC-053"],
        reads: ["REC-082", "REC-084", "REC-085"],
        writes: ["REC-086"],
      },
    ),
    transition(
      "disputed",
      "corrective_action",
      "recovery",
      "ROLE-GROWER-RELATIONS",
      "Route the disputed issue to corrective or commercial resolution.",
      {
        decisions: ["DEC-084"],
        exceptions: ["EXC-051", "EXC-054", "EXC-055", "EXC-056"],
        reads: ["REC-085", "REC-087", "REC-088"],
        writes: ["REC-086", "REC-087"],
      },
    ),
    transition(
      "corrective_action",
      "aligned",
      "verification",
      "ROLE-GROWER-RELATIONS",
      "Verify the corrective result and restore an aligned operating state.",
      {
        decisions: ["DEC-084"],
        reads: ["REC-086", "REC-087"],
        writes: ["REC-085", "REC-088"],
      },
    ),
    transition(
      "corrective_action",
      "ended",
      "cancellation",
      "ROLE-VINEYARD-MANAGER",
      "End the relationship when corrective or commercial resolution fails.",
      {
        decisions: ["DEC-084"],
        reads: ["REC-086", "REC-087", "REC-088"],
        writes: ["REC-088"],
      },
    ),
    transition(
      "active",
      "superseded",
      "supersession",
      "ROLE-GROWER-RELATIONS",
      "Supersede the active relationship only with a successor identity or contract version.",
      {
        decisions: ["DEC-081", "DEC-083"],
        reads: ["REC-079", "REC-080"],
        writes: ["REC-079", "REC-080"],
      },
    ),
  ],
  "WF-010": [
    transition(
      "evidence_collecting",
      "gap_identified",
      "exception",
      "ROLE-COMPLIANCE-COORDINATOR",
      "Record an attributable evidence gap before submission.",
      {
        decisions: ["DEC-092"],
        reads: ["REC-090", "REC-101"],
        writes: ["REC-102"],
      },
    ),
    transition(
      "gap_identified",
      "corrective_action_open",
      "correction",
      "ROLE-COMPLIANCE-COORDINATOR",
      "Assign an evidence-gap corrective action with scope and owner.",
      {
        decisions: ["DEC-092"],
        exceptions: ["EXC-057", "EXC-058", "EXC-060"],
        reads: ["REC-102"],
        writes: ["REC-086"],
      },
    ),
    transition(
      "under_review",
      "noncompliant",
      "verification",
      "ROLE-AUDITOR",
      "Record a noncompliant finding without implying automatic remediation.",
      {
        decisions: ["DEC-093"],
        reads: ["REC-101"],
        writes: ["REC-102", "REC-103"],
      },
    ),
    transition(
      "under_review",
      "certification_withheld",
      "verification",
      "ROLE-CERTIFIER",
      "Withhold certification while a material finding remains unresolved.",
      {
        decisions: ["DEC-093"],
        reads: ["REC-101", "REC-102"],
        writes: ["REC-103"],
      },
    ),
    transition(
      "noncompliant",
      "corrective_action_open",
      "correction",
      "ROLE-COMPLIANCE-COORDINATOR",
      "Open corrective action only for a recorded finding.",
      {
        decisions: ["DEC-093"],
        exceptions: ["EXC-059", "EXC-061"],
        reads: ["REC-102", "REC-103"],
        writes: ["REC-086"],
      },
    ),
    transition(
      "certification_withheld",
      "corrective_action_open",
      "correction",
      "ROLE-COMPLIANCE-COORDINATOR",
      "Open corrective action for the finding that withheld certification.",
      {
        decisions: ["DEC-094"],
        exceptions: ["EXC-062"],
        reads: ["REC-102", "REC-103"],
        writes: ["REC-086"],
      },
    ),
    transition(
      "corrective_action_open",
      "remediation_in_progress",
      "execution",
      "ROLE-COMPLIANCE-COORDINATOR",
      "Execute the approved remediation while preserving the original finding.",
      {
        decisions: ["DEC-094"],
        reads: ["REC-086", "REC-102"],
        writes: ["REC-086", "REC-101"],
      },
    ),
    transition(
      "remediation_in_progress",
      "evidence_resubmitted",
      "completion",
      "ROLE-COMPLIANCE-COORDINATOR",
      "Submit attributed corrective evidence for independent review.",
      {
        decisions: ["DEC-094"],
        reads: ["REC-086", "REC-102"],
        writes: ["REC-101"],
      },
    ),
    transition(
      "evidence_resubmitted",
      "compliant",
      "verification",
      "ROLE-CERTIFIER",
      "Verify that corrective evidence resolves the recorded finding.",
      {
        decisions: ["DEC-094"],
        exceptions: ["EXC-061", "EXC-062"],
        reads: ["REC-086", "REC-101", "REC-102"],
        writes: ["REC-103"],
        outcome: "Verify and certify",
      },
    ),
    transition(
      "evidence_resubmitted",
      "remediation_in_progress",
      "correction",
      "ROLE-CERTIFIER",
      "Keep corrective action open when evidence remains insufficient.",
      {
        decisions: ["DEC-094"],
        reads: ["REC-086", "REC-101", "REC-102"],
        writes: ["REC-086", "REC-103"],
        outcome: "Keep corrective action open",
      },
    ),
    transition(
      "package_prepared",
      "superseded",
      "supersession",
      "ROLE-COMPLIANCE-COORDINATOR",
      "Supersede a package when the standard, scope, or evidence version changes before submission.",
      {
        decisions: ["DEC-091", "DEC-092"],
        reads: ["REC-090", "REC-101"],
        writes: ["REC-101"],
      },
    ),
  ],
};

function addDecision024() {
  if (
    !decisionsDocument.decisions.some((decision) => decision.id === "DEC-015")
  )
    decisionsDocument.decisions.push({
      id: "DEC-015",
      question:
        "Is the application, restriction, posting, diary, and use-report record complete and attributable for reporting?",
      owner: "ROLE-COMPLIANCE-COORDINATOR",
      outcomes: [
        "Accept and report",
        "Return for correction",
        "Hold reporting for missing evidence",
        "Escalate a compliance conflict",
      ],
      workflow_id: "WF-002",
      classification: "strong_inference",
      confidence: "medium-high",
      evidence_ids: ["EVD-002", "EVD-011", "EVD-012"],
      transition_context: ["posted -> reported", "reported -> corrected"],
      required_inputs: [],
      records_consulted: [],
      records_produced: [],
      source_anchors: [
        "**Workflow card: scouting to spray execution and compliance record**",
        "update spray diary and any jurisdictional report",
        "Application date, location, product, rate, active ingredients, operator, method, target pest or disease, and timing relative to restrictions.",
      ],
      role_ids: [],
      record_ids: [],
      exception_ids: [],
    });
  decisionsDocument.decisions.find(
    (decision) => decision.id === "DEC-015",
  ).source_anchors = [
    "**Workflow card: scouting to spray execution and compliance record**",
    "update spray diary and any jurisdictional report",
    "Application date, location, product, rate, active ingredients, operator, method, target pest or disease, and timing relative to restrictions.",
  ];
  if (
    !decisionsDocument.decisions.some((decision) => decision.id === "DEC-024")
  )
    decisionsDocument.decisions.push({
      id: "DEC-024",
      question:
        "Is the recommended irrigation or fertility action approved within current resource, certification, and operating constraints?",
      owner: "ROLE-VINEYARD-MANAGER",
      outcomes: [
        "Approve and assign",
        "Revise scope or timing",
        "Defer with review condition",
        "Escalate authority or constraint",
      ],
      workflow_id: "WF-003",
      classification: "strong_inference",
      confidence: "medium",
      evidence_ids: ["EVD-003", "EVD-011"],
      transition_context: ["adjustment_recommended -> approved"],
      required_inputs: [],
      records_consulted: [],
      records_produced: [],
      source_anchors: [
        "**Workflow card: irrigation scheduling and fertility adjustment**",
        "**Typical sequence.** Review recent block and weather conditions; inspect irrigation system or receive irrigator update",
        "water-use totals and nitrogen-use totals for certification or management reporting",
      ],
      role_ids: [],
      record_ids: [],
      exception_ids: [],
    });
  decisionsDocument.decisions.sort((left, right) =>
    left.id.localeCompare(right.id),
  );
}

function repairWorkflowSteps(workflow) {
  workflow.roles = [
    ...new Set([
      ...workflow.roles,
      ...(supplementalWorkflowRoles[workflow.id] ?? []),
    ]),
  ];
  workflow.records = [
    ...new Set([
      ...workflow.records,
      ...recordsDocument.records
        .filter((record) => record.workflow_ids.includes(workflow.id))
        .map((record) => record.name),
    ]),
  ];
  if (
    workflow.id === "WF-002" &&
    !workflow.states.includes("preflight_check")
  ) {
    workflow.states.splice(
      workflow.states.indexOf("approved") + 1,
      0,
      "preflight_check",
    );
    const scheduleStep = workflow.steps.find((step) => step.order === 4);
    scheduleStep.state_to = "preflight_check";
    scheduleStep.description =
      "The approved plan enters a release check for product, calibration, weather, worker presence, REI, PHI, and sensitive-area constraints.";
    scheduleStep.decision_ids = ["DEC-012"];
    workflow.steps.splice(4, 0, {
      order: 5,
      stage: "approval",
      description:
        "The crop-protection lead releases the current application only after the application-time preflight remains valid.",
      owner: "ROLE-CROP-PROTECTION-LEAD",
      state_from: "preflight_check",
      state_to: "scheduled",
      decision_ids: ["DEC-013"],
    });
    workflow.steps.forEach((step, index) => {
      step.order = index + 1;
    });
  }
  if (workflow.id === "WF-002") {
    const reportingStep = workflow.steps.find(
      (step) => step.state_from === "posted" && step.state_to === "reported",
    );
    reportingStep.decision_ids = ["DEC-015"];
  }
  if (workflow.id === "WF-003") {
    const approvalStep = workflow.steps.find(
      (step) => step.stage === "approval",
    );
    approvalStep.decision_ids = ["DEC-024"];
  }
  if (
    workflow.id === "WF-005" &&
    !workflow.steps.some((step) => step.state_to === "lab_pending")
  ) {
    workflow.steps.splice(1, 0, {
      order: 2,
      stage: "assignment",
      description:
        "The traceable sample enters laboratory custody with expected timing and chain-of-identity intact.",
      owner: "ROLE-LAB",
      state_from: "sample_collected",
      state_to: "lab_pending",
    });
    const resultStep = workflow.steps.find(
      (step) => step.state_to === "result_available",
    );
    resultStep.state_from = "lab_pending";
    workflow.steps.forEach((step, index) => {
      step.order = index + 1;
    });
  }
  if (workflow.id === "WF-006") {
    for (const [anchor, state] of [
      ["harvesting", "delayed"],
      ["disputed", "correction_required"],
    ]) {
      if (!workflow.states.includes(state))
        workflow.states.splice(workflow.states.indexOf(anchor) + 1, 0, state);
    }
  }
  if (workflow.id === "WF-007") {
    const briefing = workflow.steps.find((step) => step.state_to === "briefed");
    briefing.stage = "assignment";
  }
  if (workflow.id === "WF-010") {
    let certificationStepSeen = false;
    workflow.steps = workflow.steps.filter((step) => {
      if (step.state_from !== "compliant" || step.state_to !== "certified")
        return true;
      if (certificationStepSeen) return false;
      certificationStepSeen = true;
      return true;
    });
    const decisionStep = workflow.steps.find(
      (step) => step.state_from === "under_review",
    );
    decisionStep.state_to = "compliant";
    decisionStep.owner = "ROLE-AUDITOR";
    decisionStep.decision_ids = ["DEC-093"];
    decisionStep.description =
      "The auditor records a compliant result when ordinary submitted and observed evidence satisfies the applicable standard.";
    if (!certificationStepSeen)
      workflow.steps.splice(workflow.steps.indexOf(decisionStep) + 1, 0, {
        order: decisionStep.order + 1,
        stage: "approval",
        description:
          "The certifier issues the certification decision for the compliant review without implying corrective action occurred.",
        owner: "ROLE-CERTIFIER",
        state_from: "compliant",
        state_to: "certified",
      });
    workflow.steps.forEach((step, index) => {
      step.order = index + 1;
    });
  }
}

function decisionData(decisionId) {
  const decision = decisionsDocument.decisions.find(
    (candidate) => candidate.id === decisionId,
  );
  const decisionProfile = decisionProfiles[decisionId];
  if (!decision || !decisionProfile)
    throw new Error(`Missing decision profile for ${decisionId}`);
  return { decision, decisionProfile };
}

function enrichTransition(workflow, item) {
  const decisionIds = item.decision_ids;
  const decisionReads = decisionIds.flatMap(
    (decisionId) => decisionData(decisionId).decisionProfile.reads,
  );
  const decisionWrites = decisionIds.flatMap(
    (decisionId) => decisionData(decisionId).decisionProfile.writes,
  );
  return {
    ...item,
    record_reads: [...new Set([...item.record_reads, ...decisionReads])],
    record_writes: [
      ...new Set([...item.record_writes, ...decisionWrites]),
    ].filter((recordId) => workflowRecords.get(workflow.id).includes(recordId)),
    evidence_ids:
      item.evidence_ids.length > 0 ? item.evidence_ids : workflow.evidence_ids,
    classification: item.classification ?? workflow.classification,
    confidence: item.confidence ?? workflow.confidence,
  };
}

function buildTransitions(workflow) {
  const primary = workflow.steps.map((step) => {
    const decisions = step.decision_ids ?? [];
    const transitionRecords = primaryTransitionRecords[workflow.id]?.[
      `${step.state_from ?? "entry"}->${step.state_to}`
    ] ?? { reads: [], writes: [] };
    const reads = decisions.flatMap(
      (decisionId) => decisionData(decisionId).decisionProfile.reads,
    );
    const writes = decisions.flatMap(
      (decisionId) => decisionData(decisionId).decisionProfile.writes,
    );
    return transition(
      step.state_from,
      step.state_to,
      step.stage,
      step.owner,
      step.description,
      {
        decisions,
        reads: [...reads, ...transitionRecords.reads],
        writes: [...writes, ...transitionRecords.writes].filter((recordId) =>
          workflowRecords.get(workflow.id).includes(recordId),
        ),
        evidence: workflow.evidence_ids,
        classification: workflow.classification,
        confidence: workflow.confidence,
      },
    );
  });
  const exceptionTransitions = exceptionsDocument.exceptions
    .filter((exception) => exception.workflow_ids.includes(workflow.id))
    .map((exception) => {
      const [from, to, decisions] = exceptionBranches[exception.id];
      const reads = decisions.flatMap(
        (decisionId) => decisionData(decisionId).decisionProfile.reads,
      );
      const writes = decisions.flatMap(
        (decisionId) => decisionData(decisionId).decisionProfile.writes,
      );
      return transition(
        from,
        to,
        "exception",
        exception.accountable_owner,
        `Contain ${exception.name.toLowerCase()} and preserve the affected scope before recovery.`,
        {
          trigger: exception.trigger,
          decisions,
          exceptions: [exception.id],
          reads,
          writes: writes.filter((recordId) =>
            workflowRecords.get(workflow.id).includes(recordId),
          ),
          evidence: exception.evidence_ids,
          classification: exception.classification,
          confidence: exception.confidence,
        },
      );
    });
  const all = [
    ...primary,
    ...(additionalTransitions[workflow.id] ?? []),
    ...exceptionTransitions,
  ].map((item) => enrichTransition(workflow, item));
  return all.map((item, index) => ({
    id: `TRN-${workflow.id}-${String(index + 1).padStart(3, "0")}`,
    ...item,
  }));
}

function repairDecisions(transitions) {
  for (const decision of decisionsDocument.decisions) {
    const decisionProfile = decisionProfiles[decision.id];
    if (!decisionProfile)
      throw new Error(`No operational profile for ${decision.id}`);
    decision.required_inputs = [
      ...namesFor(decisionProfile.reads),
      "Current state, effective time, accountable authority, and source version",
    ];
    decision.records_consulted = namesFor(decisionProfile.reads);
    decision.records_produced = namesFor(decisionProfile.writes);
    decision.record_ids = [
      ...new Set([...decisionProfile.reads, ...decisionProfile.writes]),
    ];
    decision.exception_ids = decisionProfile.exceptionIds;
    decision.role_ids = [
      decision.owner,
      ...decisionProfile.roleIds.filter((roleId) => roleId !== decision.owner),
    ];
    decision.transition_context = [
      ...new Set(
        transitions
          .filter((item) => item.decision_ids.includes(decision.id))
          .map((item) => `${item.from ?? "entry"} -> ${item.to}`),
      ),
    ];
  }
}

function repairExceptions() {
  const decisionIndex = new Map(
    decisionsDocument.decisions.map((decision) => [decision.id, decision]),
  );
  for (const exception of exceptionsDocument.exceptions) {
    const branch = exceptionBranches[exception.id];
    if (!branch) throw new Error(`No operational branch for ${exception.id}`);
    const [from, to, decisions] = branch;
    const relatedRecords = exceptionRecordOverrides[exception.id] ?? [
      ...new Set([
        ...decisions.flatMap((decisionId) => {
          const item = decisionProfiles[decisionId];
          return [...item.reads, ...item.writes];
        }),
        ...(supplementalExceptionRecords[exception.id] ?? []),
      ]),
    ];
    exception.interrupted_states = [from];
    exception.recovery_states = [to];
    exception.decisions = decisions;
    exception.required_records = namesFor(relatedRecords);
    exception.record_ids = relatedRecords;
    const decisionAuthorities = decisions.flatMap((decisionId) => {
      const decision = decisionIndex.get(decisionId);
      return [decision?.owner, ...(decision?.role_ids ?? [])].filter(Boolean);
    });
    exception.accountable_owner = decisionIndex.get(decisions[0])?.owner;
    exception.escalation_roles = [...new Set(decisionAuthorities)]
      .filter((roleId) => roleId !== exception.accountable_owner)
      .slice(0, 2);
    exception.role_ids = [
      exception.accountable_owner,
      ...exception.escalation_roles,
    ];
    exception.affected_scope = `Only the physical, organizational, and record scope affected by ${exception.name.toLowerCase()}; safe and verified unaffected work remains valid.`;
    exception.recovery_actions = [
      `Record and contain ${exception.name.toLowerCase()} at the affected scope.`,
      `Use ${decisions.join(" and ")} authority to move from ${from} to ${to}; do not overwrite predecessor evidence.`,
      "Notify only the roles and downstream records affected by the decision.",
    ];
    exception.closure_evidence = [
      `attributed ${exception.id} observation and affected scope`,
      `${from} to ${to} transition with decision authority`,
      "preserved predecessor record and successor or disposition link",
      "downstream reconciliation and acknowledgement where applicable",
    ];
    exception.inputs = [
      ...relatedRecords.slice(0, 5),
      "current state, restriction, deadline, and source version",
    ];
    exception.outputs = [
      `${exception.id} exception event`,
      `${to} state transition`,
      ...relatedRecords.slice(-2),
    ];
  }
}

function synchronizeReciprocalRelations() {
  for (const record of recordsDocument.records) {
    record.decision_ids = decisionsDocument.decisions
      .filter((decision) => decision.record_ids.includes(record.id))
      .map((decision) => decision.id);
    record.exception_ids = exceptionsDocument.exceptions
      .filter((exception) => exception.record_ids.includes(record.id))
      .map((exception) => exception.id);
  }
  for (const role of rolesDocument.roles) {
    role.workflow_ids = workflowsDocument.workflows
      .filter((workflow) => workflow.roles.includes(role.id))
      .map((workflow) => workflow.id);
    role.decision_ids = decisionsDocument.decisions
      .filter((decision) => decision.role_ids.includes(role.id))
      .map((decision) => decision.id);
    role.record_ids = recordsDocument.records
      .filter((record) => record.responsible_roles.includes(role.id))
      .map((record) => record.id);
    role.exception_ids = exceptionsDocument.exceptions
      .filter((exception) => exception.role_ids.includes(role.id))
      .map((exception) => exception.id);
  }
}

addDecision024();
const assistantManager = rolesDocument.roles.find(
  (role) => role.id === "ROLE-ASSISTANT-VINEYARD-MANAGER",
);
assistantManager.responsibilities = assistantManager.responsibilities.map(
  (responsibility) =>
    responsibility.replace(
      "vineyard manager?s accountability",
      "vineyard manager's accountability",
    ),
);
workflowsDocument.workflows.forEach(repairWorkflowSteps);
repairExceptions();

const transitions = [];
for (const workflow of workflowsDocument.workflows) {
  workflow.terminal_states = terminalStates[workflow.id];
  workflow.transitions = buildTransitions(workflow);
  workflow.decisions = decisionsDocument.decisions
    .filter((decision) => decision.workflow_id === workflow.id)
    .map(({ id, question, owner, outcomes }) => ({
      id,
      question,
      owner,
      outcomes,
    }));
  transitions.push(...workflow.transitions);
}
repairDecisions(transitions);
synchronizeReciprocalRelations();

const refinedDocuments = {
  workflowsDocument,
  decisionsDocument,
  exceptionsDocument,
  recordsDocument,
  rolesDocument,
};
if (checkOnly) {
  const drift = Object.keys(refinedDocuments).filter(
    (key) =>
      JSON.stringify(refinedDocuments[key]) !==
      JSON.stringify(originalDocuments[key]),
  );
  if (drift.length)
    throw new Error(
      `Canonical workflow registries are stale: ${drift.join(", ")}`,
    );
} else {
  await Promise.all([
    writeJson("workflow-model/workflows.json", workflowsDocument),
    writeJson("workflow-model/decisions.json", decisionsDocument),
    writeJson("workflow-model/exceptions.json", exceptionsDocument),
    writeJson("workflow-model/records.json", recordsDocument),
    writeJson("workflow-model/roles.json", rolesDocument),
  ]);
}

console.log(
  `${checkOnly ? "✓ current:" : "Refined"} ${workflowsDocument.workflows.length} workflows, ${rolesDocument.roles.length} roles, ${recordsDocument.records.length} records, ${decisionsDocument.decisions.length} decisions, ${exceptionsDocument.exceptions.length} exceptions, and ${transitions.length} canonical transitions.`,
);
