const REQUIRED_SHARED_RECORDS = [
  "REC-003",
  "REC-015",
  "REC-027",
  "REC-041",
  "REC-051",
  "REC-080",
  "REC-086",
];

const WORKFLOW_SEASON_WINDOWS = {
  "WF-004": { earliestMonth: 6, latestMonth: 9 },
  "WF-005": { earliestMonth: 7, latestMonth: 10 },
  "WF-006": { earliestMonth: 8, latestMonth: 11 },
};

const ALLOWED_RECORD_LINK_TEMPLATES = new Set(
  [
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
    ["REC-080", "fulfills", "REC-045"],
    ["REC-082", "documents", "REC-090"],
    ["REC-082", "documents", "REC-101"],
    ["REC-086", "supports", "REC-102"],
  ].map((parts) => parts.join("|")),
);

const RECORD_FAMILY_BY_ID = new Map(
  Object.entries({
    planning_recommendation: "001 009 022 027 029 031 039 043 064 081 091 092",
    assignment_authorization_communication:
      "003 014 032 040 041 044 049 056 067 068 069 073 085 098 100 103",
    observation_sample_result:
      "002 008 017 018 019 020 021 025 028 036 037 038 048 072 084",
    execution_actual_log:
      "004 006 011 012 023 024 033 046 050 057 058 059 060 071 074 083 094 097",
    lifecycle_history_correction: "005 030 034 042 051",
    restriction_verification: "007 010 013 055 061 066 075 095",
    report_evidence_package: "015 016 082 089 090 093 099 101",
    identity_lineage_contract: "035 045 076 077 078 079 080 096",
    commercial_reconciliation: "026 047 052 053 063 087 088",
    labor_payroll_exception: "062",
    labor_roster: "054",
    inventory_receipt: "065 070",
    corrective_finding: "086 102",
  }).flatMap(([family, ids]) =>
    ids.split(" ").map((id) => [`REC-${id}`, family]),
  ),
);

const BESPOKE_FACT_PATHS = {
  "REC-002": ["definition_evidence.field_signal_severity"],
  "REC-019": ["definition_evidence.soil_moisture_depletion"],
  "REC-021": ["definition_evidence.petiole_nutrient_percent"],
  "REC-025": ["domain_details.failure_code", "domain_details.lost_delivery"],
  "REC-029": ["definition_evidence.estimated_crop_tonnage"],
  "REC-037": [
    "workflow_metrics.sample_id",
    "workflow_metrics.brix",
    "workflow_metrics.ph",
    "workflow_metrics.total_acidity",
  ],
  "REC-047": [
    "domain_details.gross_weight",
    "domain_details.tare_weight",
    "domain_details.net_weight",
  ],
  "REC-048": [
    "domain_details.fruit_temperature",
    "domain_details.brix",
    "domain_details.disposition",
  ],
  "REC-059": [
    "domain_details.attendance",
    "domain_details.break_time",
    "domain_details.payable_time",
  ],
  "REC-058": ["definition_evidence.recorded_break_hours"],
  "REC-061": ["definition_evidence.verified_entry_count"],
  "REC-062": [
    "domain_details.worker",
    "domain_details.assignment",
    "domain_details.submitted_hours",
    "domain_details.corrected_hours",
    "domain_details.rate_basis",
    "domain_details.variance_hours",
    "domain_details.exception_reason",
    "domain_details.amount_owed",
    "domain_details.authority",
    "domain_details.lineage",
    "domain_details.resolution",
  ],
  "REC-063": ["domain_details.allocated_cost", "domain_details.cost_status"],
  "REC-066": ["definition_evidence.readiness_check_count"],
  "REC-070": [
    "domain_details.ordered_quantity",
    "domain_details.received_quantity",
    "domain_details.receipt_variance",
  ],
  "REC-075": ["definition_evidence.return_to_service_checks"],
  "REC-077": ["definition_evidence.verified_contact_count"],
  "REC-094": [
    "definition_evidence.seasonal_water_total",
    "workflow_metrics.water_total",
    "workflow_metrics.nitrogen_total",
  ],
  "REC-097": [
    "domain_details.cleaning_method",
    "domain_details.evidence_status",
    "domain_details.verified_by",
  ],
  "REC-098": ["definition_evidence.clean_transport_checks"],
  "REC-103": [
    "domain_details.decision",
    "domain_details.final_outcome",
    "domain_details.evidence_status",
  ],
};

const BESPOKE_QUANTITY_DIMENSIONS = {
  "REC-019": {
    "definition_evidence.soil_moisture_depletion": "concentration",
  },
  "REC-021": {
    "definition_evidence.petiole_nutrient_percent": "concentration",
  },
  "REC-029": { "definition_evidence.estimated_crop_tonnage": "mass" },
  "REC-058": { "definition_evidence.recorded_break_hours": "time" },
  "REC-061": { "definition_evidence.verified_entry_count": "count" },
  "REC-062": {
    "domain_details.submitted_hours": "time",
    "domain_details.corrected_hours": "time",
    "domain_details.variance_hours": "time",
  },
  "REC-066": { "definition_evidence.readiness_check_count": "count" },
  "REC-075": { "definition_evidence.return_to_service_checks": "count" },
  "REC-077": { "definition_evidence.verified_contact_count": "count" },
  "REC-094": {
    "definition_evidence.seasonal_water_total": "volume",
    "workflow_metrics.water_total": "volume",
    "workflow_metrics.nitrogen_total": "mass",
  },
  "REC-098": { "definition_evidence.clean_transport_checks": "count" },
};

function invariant(condition, message) {
  if (!condition) throw new Error(`full-season data: ${message}`);
}

function uniqueIndex(items, label) {
  const index = new Map();
  for (const item of items) {
    invariant(!index.has(item.id), `${label} contains duplicate ID ${item.id}`);
    index.set(item.id, item);
  }
  return index;
}

function parseTime(value, label) {
  const parsed = Date.parse(value);
  invariant(Number.isFinite(parsed), `${label} has invalid timestamp ${value}`);
  return parsed;
}

function assertPacificOffset(value, label) {
  const match = value.match(
    /^(2026)-(\d{2})-(\d{2})T(\d{2}):\d{2}:\d{2}(-0[78]:00)$/,
  );
  invariant(
    Boolean(match),
    `${label} must use an explicit 2026 Pacific offset`,
  );
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const expected =
    month < 3 ||
    month > 11 ||
    (month === 3 && (day < 8 || (day === 8 && hour < 2))) ||
    (month === 11 && (day > 1 || (day === 1 && hour >= 2)))
      ? "-08:00"
      : "-07:00";
  invariant(
    match[5] === expected,
    `${label} uses ${match[5]} where America/Los_Angeles requires ${expected}`,
  );
}

function reference(index, id, label) {
  invariant(index.has(id), `${label} references unknown ID ${id}`);
  return index.get(id);
}

function references(index, ids, label) {
  for (const id of ids ?? []) reference(index, id, label);
}

function noCycles(nodes, outgoing, label) {
  const visiting = new Set();
  const visited = new Set();
  const visit = (id) => {
    if (visited.has(id)) return;
    invariant(!visiting.has(id), `${label} contains a cycle at ${id}`);
    visiting.add(id);
    for (const next of outgoing(id)) visit(next);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of nodes) visit(id);
}

function validateProvenance(provenance, people, label, seed) {
  parseTime(provenance.captured_at, `${label}.provenance.captured_at`);
  if (provenance.captured_by_person_id)
    reference(
      people,
      provenance.captured_by_person_id,
      `${label}.provenance.captured_by_person_id`,
    );
  if (provenance.source_type === "synthetic_generator")
    invariant(
      provenance.generator_seed === seed,
      `${label} generator seed differs from operation seed`,
    );
}

function validateCorrections(corrections, people, records, label) {
  let priorVersion = 1;
  for (const correction of corrections ?? []) {
    reference(
      people,
      correction.corrected_by_person_id,
      `${label}/${correction.id}.corrected_by_person_id`,
    );
    parseTime(
      correction.corrected_at,
      `${label}/${correction.id}.corrected_at`,
    );
    invariant(
      correction.from_version === priorVersion,
      `${label}/${correction.id} correction history is not contiguous`,
    );
    invariant(
      correction.to_version > correction.from_version,
      `${label}/${correction.id} correction version does not advance`,
    );
    priorVersion = correction.to_version;
    if (correction.source_record_instance_id)
      reference(
        records,
        correction.source_record_instance_id,
        `${label}/${correction.id}.source_record_instance_id`,
      );
    references(
      records,
      correction.supporting_record_instance_ids,
      `${label}/${correction.id}.supporting_record_instance_ids`,
    );
  }
  return priorVersion;
}

function validateQuantityTree(value, units, label, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  if (
    Object.prototype.hasOwnProperty.call(value, "value") &&
    Object.prototype.hasOwnProperty.call(value, "unit_id")
  ) {
    invariant(
      Number.isFinite(value.value),
      `${label} contains a non-finite quantity`,
    );
    invariant(
      Math.abs(value.value * 10_000 - Math.round(value.value * 10_000)) < 1e-7,
      `${label} has more than four meaningful decimal places`,
    );
    reference(units, value.unit_id, `${label}.unit_id`);
    const field = label.replaceAll("[", ".").split(".").at(-1).toLowerCase();
    const expectedDimension = /brix|soluble_solids/.test(field)
      ? "concentration"
      : /ph|acidity/.test(field)
        ? "acidity"
        : /temperature|_temp|temp_/.test(field)
          ? "temperature"
          : /area|acre/.test(field)
            ? "area"
            : /volume|water_total|rinse/.test(field)
              ? "volume"
              : /weight|mass|nitrogen|tons?/.test(field)
                ? "mass"
                : /hours?|time|duration|notice_window|\brei\b|\bphi\b|term/.test(
                      field,
                    )
                  ? "time"
                  : /rate|flow/.test(field)
                    ? "rate"
                    : /count|headcount|artifact/.test(field)
                      ? "count"
                      : null;
    if (expectedDimension)
      invariant(
        units.get(value.unit_id).dimension === expectedDimension,
        `${label} uses ${units.get(value.unit_id).dimension} where its field requires ${expectedDimension}`,
      );
    if (value.uncertainty !== undefined)
      invariant(value.uncertainty >= 0, `${label}.uncertainty is negative`);
  }
  if (value.basis_unit_id)
    reference(units, value.basis_unit_id, `${label}.basis_unit_id`);
  if (
    Object.prototype.hasOwnProperty.call(value, "amount") &&
    Object.prototype.hasOwnProperty.call(value, "currency")
  )
    invariant(
      Math.abs(value.amount * 100 - Math.round(value.amount * 100)) < 1e-7,
      `${label}.amount has fractional currency below one cent`,
    );
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      validateQuantityTree(entry, units, `${label}[${index}]`, seen),
    );
  } else {
    for (const [key, entry] of Object.entries(value))
      validateQuantityTree(entry, units, `${label}.${key}`, seen);
  }
}

function inspectFacts(value, entityIndexes, label) {
  const baseKeys = new Set([
    "canonical_record_name",
    "domain_kind",
    "operational_subject",
    "record_name",
    "record_instance_key",
    "season_year",
    "subject",
    "synthetic",
    "workflow_contexts",
    "workflow_count",
  ]);
  const stateKeyPattern =
    /(?:approval|complete|decision|disposition|outcome|priority|result|state|status|verified)/i;
  let domainLeaves = 0;
  let entityReferences = 0;
  let stateFields = 0;
  const unitIds = new Set();
  const visit = (entry, pathParts, countLeaves = true) => {
    if (entry === null || typeof entry !== "object") {
      if (countLeaves && entry !== "" && entry !== null) domainLeaves += 1;
      if (
        pathParts.length > 0 &&
        stateKeyPattern.test(pathParts[pathParts.length - 1])
      )
        stateFields += 1;
      return;
    }
    if (
      typeof entry.entity_type === "string" &&
      typeof entry.entity_id === "string"
    ) {
      const index = entityIndexes[entry.entity_type];
      invariant(
        Boolean(index),
        `${label} has unknown entity type ${entry.entity_type}`,
      );
      reference(index, entry.entity_id, `${label}.${pathParts.join(".")}`);
      entityReferences += 1;
    }
    if (typeof entry.unit_id === "string" && "value" in entry)
      unitIds.add(entry.unit_id);
    if (Array.isArray(entry))
      entry.forEach((item, index) =>
        visit(item, [...pathParts, String(index)], countLeaves),
      );
    else
      for (const [key, item] of Object.entries(entry))
        visit(
          item,
          [...pathParts, key],
          countLeaves && !(pathParts.length === 0 && baseKeys.has(key)),
        );
  };
  visit(value, []);
  return { domainLeaves, entityReferences, stateFields, unitIds };
}

function jsonPointerExists(document, pointer) {
  return jsonPointerValue(document, pointer) !== undefined;
}

function jsonPointerValue(document, pointer) {
  let current = document;
  for (const token of pointer
    .slice(1)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))) {
    if (
      current === null ||
      typeof current !== "object" ||
      !Object.prototype.hasOwnProperty.call(current, token)
    )
      return undefined;
    current = current[token];
  }
  return current;
}

function collectQuantityUnits(value, result = new Set(), seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return result;
  seen.add(value);
  if (typeof value.unit_id === "string" && "value" in value)
    result.add(value.unit_id);
  if (Array.isArray(value))
    for (const item of value) collectQuantityUnits(item, result, seen);
  else
    for (const item of Object.values(value))
      collectQuantityUnits(item, result, seen);
  return result;
}

function substantiveFactView(facts) {
  const view = structuredClone(facts);
  for (const metadataKey of [
    "canonical_record_name",
    "record_instance_key",
    "season_year",
    "domain_kind",
    "state_result",
    "operational_subject",
    "workflow_subjects",
    "contract_subjects",
    "supersession_evidence",
  ])
    delete view[metadataKey];
  return view;
}

function canonicalDocuments(canonical) {
  return {
    workflows: canonical.workflows.workflows ?? canonical.workflows,
    roles: canonical.roles.roles ?? canonical.roles,
    records: canonical.records.records ?? canonical.records,
    decisions: canonical.decisions.decisions ?? canonical.decisions,
    exceptions: canonical.exceptions.exceptions ?? canonical.exceptions,
    overlays: canonical.overlays.overlays ?? canonical.overlays,
  };
}

export function validateSeasonData({
  operation,
  eventDocument,
  exceptionDocument,
  canonical,
  sourceHashes = new Map(),
}) {
  const definitions = canonicalDocuments(canonical);
  const workflowDefinitions = uniqueIndex(definitions.workflows, "workflows");
  const roleDefinitions = uniqueIndex(definitions.roles, "roles");
  const recordDefinitions = uniqueIndex(definitions.records, "records");
  const decisionDefinitions = uniqueIndex(definitions.decisions, "decisions");
  const exceptionDefinitions = uniqueIndex(
    definitions.exceptions,
    "exceptions",
  );
  const overlayDefinitions = uniqueIndex(definitions.overlays, "overlays");
  invariant(
    RECORD_FAMILY_BY_ID.size === recordDefinitions.size &&
      [...recordDefinitions.keys()].every((id) => RECORD_FAMILY_BY_ID.has(id)),
    "record family contract does not cover every canonical record exactly once",
  );

  invariant(
    eventDocument.operation_id === operation.operation_id &&
      exceptionDocument.operation_id === operation.operation_id,
    "generated documents do not share one operation_id",
  );
  invariant(
    eventDocument.generated_at === operation.generated_at &&
      exceptionDocument.generated_at === operation.generated_at,
    "generated documents do not share one generated_at value",
  );
  invariant(
    Number.isInteger(operation.seed) && operation.seed > 0,
    "seed is invalid",
  );
  const seasonStart = parseTime(
    `${operation.season.starts_on}T00:00:00-08:00`,
    "season.starts_on",
  );
  const seasonEnd = parseTime(
    `${operation.season.ends_on}T23:59:59-08:00`,
    "season.ends_on",
  );
  invariant(seasonStart < seasonEnd, "season bounds are reversed");

  const organizations = uniqueIndex(operation.organizations, "organizations");
  const properties = uniqueIndex(operation.properties, "properties");
  const blocks = uniqueIndex(operation.blocks, "blocks");
  uniqueIndex(operation.block_aliases, "block aliases");
  uniqueIndex(operation.block_lineage, "block lineage");
  const people = uniqueIndex(operation.people, "people");
  const assignments = uniqueIndex(
    operation.role_assignments,
    "role assignments",
  );
  const relationships = uniqueIndex(operation.relationships, "relationships");
  const contracts = uniqueIndex(operation.contracts, "contracts");
  const scopes = uniqueIndex(operation.scopes, "scopes");
  const equipment = uniqueIndex(operation.equipment, "equipment");
  const materials = uniqueIndex(operation.materials, "materials");
  const units = uniqueIndex(operation.units, "units");
  const workflowInstances = uniqueIndex(
    operation.workflow_instances,
    "workflow instances",
  );
  const records = uniqueIndex(operation.record_instances, "record instances");
  const links = uniqueIndex(operation.links, "record links");
  const events = uniqueIndex(eventDocument.events, "events");
  const histories = uniqueIndex(
    exceptionDocument.histories,
    "exception histories",
  );

  for (const collection of [
    operation.organizations,
    operation.properties,
    operation.blocks,
    operation.block_aliases,
    operation.block_lineage,
    operation.people,
    operation.role_assignments,
    operation.relationships,
    operation.contracts,
    operation.scopes,
    operation.equipment,
    operation.materials,
    operation.record_instances,
    operation.links,
    eventDocument.events,
    exceptionDocument.histories,
  ])
    for (const item of collection)
      validateProvenance(item.provenance, people, `${item.id}`, operation.seed);

  const stableGroups = [
    [operation.organizations, "organization"],
    [operation.properties, "property"],
    [operation.blocks, "block"],
    [operation.equipment, "equipment"],
    [operation.materials, "material"],
  ];
  for (const [items, label] of stableGroups) {
    const identities = items.map((item) => item.stable_identity);
    invariant(
      new Set(identities).size === identities.length,
      `${label} stable identities are not unique`,
    );
  }

  for (const organization of operation.organizations)
    if (organization.parent_organization_id)
      reference(
        organizations,
        organization.parent_organization_id,
        `${organization.id}.parent_organization_id`,
      );
  for (const property of operation.properties)
    reference(
      organizations,
      property.organization_id,
      `${property.id}.organization_id`,
    );
  for (const block of operation.blocks) {
    reference(properties, block.property_id, `${block.id}.property_id`);
    reference(
      organizations,
      block.operating_organization_id,
      `${block.id}.operating_organization_id`,
    );
    validateQuantityTree(block.area, units, `${block.id}.area`);
    invariant(block.area.value > 0, `${block.id}.area must be positive`);
  }

  const aliasPeriods = new Map();
  const blockSystemPeriods = new Map();
  for (const alias of operation.block_aliases) {
    reference(blocks, alias.block_id, `${alias.id}.block_id`);
    if (alias.organization_id)
      reference(
        organizations,
        alias.organization_id,
        `${alias.id}.organization_id`,
      );
    const start = parseTime(
      `${alias.effective_from}T00:00:00Z`,
      `${alias.id}.effective_from`,
    );
    const end = alias.effective_to
      ? parseTime(`${alias.effective_to}T23:59:59Z`, `${alias.id}.effective_to`)
      : Infinity;
    invariant(start <= end, `${alias.id} has reversed effective dates`);
    const key = `${alias.system}:${alias.value}`;
    if (!aliasPeriods.has(key)) aliasPeriods.set(key, []);
    aliasPeriods.get(key).push({ id: alias.id, start, end });
    const blockSystemKey = `${alias.block_id}:${alias.system}`;
    if (!blockSystemPeriods.has(blockSystemKey))
      blockSystemPeriods.set(blockSystemKey, []);
    blockSystemPeriods.get(blockSystemKey).push({ id: alias.id, start, end });
  }
  for (const [key, periods] of [...aliasPeriods, ...blockSystemPeriods]) {
    periods.sort((left, right) => left.start - right.start);
    for (let index = 1; index < periods.length; index += 1)
      invariant(
        periods[index - 1].end < periods[index].start,
        `block alias ${key} has overlapping effective periods`,
      );
  }

  for (const item of operation.block_lineage) {
    references(blocks, item.source_block_ids, `${item.id}.source_block_ids`);
    references(blocks, item.result_block_ids, `${item.id}.result_block_ids`);
    reference(
      assignments,
      item.authorized_by_assignment_id,
      `${item.id}.authorized_by_assignment_id`,
    );
    if (item.supporting_record_instance_id)
      reference(
        records,
        item.supporting_record_instance_id,
        `${item.id}.supporting_record_instance_id`,
      );
  }
  const lineageEdges = new Map([...blocks.keys()].map((id) => [id, []]));
  for (const item of operation.block_lineage)
    for (const source of item.source_block_ids)
      lineageEdges
        .get(source)
        .push(...item.result_block_ids.filter((result) => result !== source));
  noCycles(blocks.keys(), (id) => lineageEdges.get(id), "block lineage");

  for (const person of operation.people)
    reference(
      organizations,
      person.home_organization_id,
      `${person.id}.home_organization_id`,
    );
  for (const assignment of operation.role_assignments) {
    reference(people, assignment.person_id, `${assignment.id}.person_id`);
    reference(roleDefinitions, assignment.role_id, `${assignment.id}.role_id`);
    reference(
      organizations,
      assignment.organization_id,
      `${assignment.id}.organization_id`,
    );
    references(scopes, assignment.scope_ids, `${assignment.id}.scope_ids`);
    if (assignment.delegated_from_assignment_id)
      reference(
        assignments,
        assignment.delegated_from_assignment_id,
        `${assignment.id}.delegated_from_assignment_id`,
      );
  }
  const assignedRoles = new Set(
    operation.role_assignments.map((assignment) => assignment.role_id),
  );
  for (const roleId of roleDefinitions.keys())
    invariant(
      assignedRoles.has(roleId),
      `canonical role ${roleId} is unassigned`,
    );

  for (const relationship of operation.relationships) {
    reference(
      organizations,
      relationship.from_organization_id,
      `${relationship.id}.from_organization_id`,
    );
    reference(
      organizations,
      relationship.to_organization_id,
      `${relationship.id}.to_organization_id`,
    );
    reference(
      assignments,
      relationship.owner_assignment_id,
      `${relationship.id}.owner_assignment_id`,
    );
    references(
      contracts,
      relationship.contract_ids,
      `${relationship.id}.contract_ids`,
    );
  }
  for (const contract of operation.contracts) {
    reference(
      organizations,
      contract.buyer_organization_id,
      `${contract.id}.buyer_organization_id`,
    );
    reference(
      organizations,
      contract.provider_organization_id,
      `${contract.id}.provider_organization_id`,
    );
    invariant(
      contract.season_id === operation.season.id,
      `${contract.id}.season_id differs from the operation season`,
    );
    references(scopes, contract.scope_ids, `${contract.id}.scope_ids`);
    validateQuantityTree(contract, units, contract.id);
  }

  const allEntityIds = new Set([
    operation.operation_id,
    ...organizations.keys(),
    ...properties.keys(),
    ...blocks.keys(),
    ...people.keys(),
    ...assignments.keys(),
    ...relationships.keys(),
    ...contracts.keys(),
    ...scopes.keys(),
    ...equipment.keys(),
    ...materials.keys(),
    ...workflowInstances.keys(),
    ...records.keys(),
    ...events.keys(),
    ...histories.keys(),
  ]);
  const entityIndexes = {
    operation: new Map([[operation.operation_id, operation]]),
    organization: organizations,
    property: properties,
    block: blocks,
    person: people,
    assignment: assignments,
    relationship: relationships,
    contract: contracts,
    scope: scopes,
    equipment,
    material: materials,
    workflow_instance: workflowInstances,
    state_event: events,
    record_instance: records,
    exception_history: histories,
  };
  for (const scope of operation.scopes) {
    for (const entityId of scope.entity_ids)
      invariant(
        allEntityIds.has(entityId),
        `${scope.id}.entity_ids references unknown ID ${entityId}`,
      );
    references(
      workflowDefinitions,
      scope.workflow_ids,
      `${scope.id}.workflow_ids`,
    );
  }
  for (const item of [...operation.equipment, ...operation.materials]) {
    reference(
      organizations,
      item.organization_id,
      `${item.id}.organization_id`,
    );
    validateQuantityTree(item, units, item.id);
  }
  for (const unit of operation.units) {
    invariant(
      unit.scale_to_base > 0,
      `${unit.id}.scale_to_base must be positive`,
    );
    if (unit.base_unit_id)
      reference(units, unit.base_unit_id, `${unit.id}.base_unit_id`);
  }
  const unitCodes = operation.units.map((unit) => unit.code);
  invariant(
    new Set(unitCodes).size === unitCodes.length,
    "unit codes are not unique",
  );

  const workflowCounts = new Map();
  const activeBlocks = new Set();
  const activeContracts = new Set();
  let multiDayInstances = 0;
  let longRunningInstances = 0;
  let longestInstanceDays = 0;
  for (const instance of operation.workflow_instances) {
    const definition = reference(
      workflowDefinitions,
      instance.workflow_id,
      `${instance.id}.workflow_id`,
    );
    invariant(
      instance.operation_id === operation.operation_id,
      `${instance.id}.operation_id differs from the operation`,
    );
    invariant(
      instance.season_id === operation.season.id,
      `${instance.id}.season_id differs from the operation season`,
    );
    const instanceScope = reference(
      scopes,
      instance.scope_id,
      `${instance.id}.scope_id`,
    );
    for (const entityId of instanceScope.entity_ids)
      if (blocks.has(entityId)) activeBlocks.add(entityId);
    references(contracts, instance.contract_ids, `${instance.id}.contract_ids`);
    for (const contractId of instance.contract_ids ?? [])
      activeContracts.add(contractId);
    reference(
      assignments,
      instance.owner_assignment_id,
      `${instance.id}.owner_assignment_id`,
    );
    references(
      assignments,
      instance.participant_assignment_ids,
      `${instance.id}.participant_assignment_ids`,
    );
    references(
      workflowInstances,
      instance.related_workflow_instance_ids,
      `${instance.id}.related_workflow_instance_ids`,
    );
    reference(events, instance.last_event_id, `${instance.id}.last_event_id`);
    const startedAt = parseTime(
      instance.started_at,
      `${instance.id}.started_at`,
    );
    assertPacificOffset(instance.started_at, `${instance.id}.started_at`);
    const seasonWindow = WORKFLOW_SEASON_WINDOWS[instance.workflow_id];
    if (seasonWindow) {
      const startedMonth = new Date(startedAt).getUTCMonth() + 1;
      invariant(
        startedMonth >= seasonWindow.earliestMonth &&
          startedMonth <= seasonWindow.latestMonth,
        `${instance.id} starts outside the plausible ${instance.workflow_id} seasonal window`,
      );
    }
    if (instance.completed_at) {
      const completedAt = parseTime(
        instance.completed_at,
        `${instance.id}.completed_at`,
      );
      assertPacificOffset(instance.completed_at, `${instance.id}.completed_at`);
      invariant(
        startedAt <= completedAt,
        `${instance.id}.completed_at precedes started_at`,
      );
      const durationDays = (completedAt - startedAt) / 86_400_000;
      if (durationDays >= 1) multiDayInstances += 1;
      if (durationDays >= 7) longRunningInstances += 1;
      longestInstanceDays = Math.max(longestInstanceDays, durationDays);
    }
    invariant(
      definition.states.includes(instance.current_state),
      `${instance.id}.current_state is outside ${instance.workflow_id}`,
    );
    workflowCounts.set(
      instance.workflow_id,
      (workflowCounts.get(instance.workflow_id) ?? 0) + 1,
    );
  }
  for (const workflowId of workflowDefinitions.keys())
    invariant(
      (workflowCounts.get(workflowId) ?? 0) >= 4,
      `${workflowId} has fewer than four workflow instances`,
    );
  for (const blockId of blocks.keys())
    invariant(activeBlocks.has(blockId), `${blockId} has no workflow activity`);
  for (const contractId of contracts.keys())
    invariant(
      activeContracts.has(contractId),
      `${contractId} has no workflow activity`,
    );
  invariant(
    multiDayInstances >= 25,
    `only ${multiDayInstances} workflow instances span at least one day`,
  );
  invariant(
    longRunningInstances >= 10,
    `only ${longRunningInstances} workflow instances span at least one week`,
  );
  invariant(
    longestInstanceDays >= 60,
    "no workflow instance spans a meaningful seasonal interval",
  );

  const recordDefinitionCoverage = new Set();
  const factSignatures = new Set();
  const factUnitCoverage = new Set();
  let correctionCount = 0;
  for (const record of operation.record_instances) {
    const definition = reference(
      recordDefinitions,
      record.record_definition_id,
      `${record.id}.record_definition_id`,
    );
    recordDefinitionCoverage.add(record.record_definition_id);
    invariant(
      record.operation_id === operation.operation_id,
      `${record.id}.operation_id differs from the operation`,
    );
    references(
      workflowInstances,
      record.workflow_instance_ids,
      `${record.id}.workflow_instance_ids`,
    );
    references(scopes, record.scope_ids, `${record.id}.scope_ids`);
    references(blocks, record.block_ids, `${record.id}.block_ids`);
    references(
      organizations,
      record.organization_ids,
      `${record.id}.organization_ids`,
    );
    references(contracts, record.contract_ids, `${record.id}.contract_ids`);
    const owner = reference(
      assignments,
      record.owner_assignment_id,
      `${record.id}.owner_assignment_id`,
    );
    invariant(
      definition.responsible_roles.includes(owner.role_id),
      `${record.id} owner role ${owner.role_id} is not responsible for ${definition.id}`,
    );
    const effectiveAt = parseTime(
      record.effective_at,
      `${record.id}.effective_at`,
    );
    assertPacificOffset(record.effective_at, `${record.id}.effective_at`);
    const recordedAt = parseTime(
      record.recorded_at,
      `${record.id}.recorded_at`,
    );
    assertPacificOffset(record.recorded_at, `${record.id}.recorded_at`);
    if (record.source_event_id) {
      const sourceEvent = reference(
        events,
        record.source_event_id,
        `${record.id}.source_event_id`,
      );
      invariant(
        record.workflow_instance_ids.includes(sourceEvent.workflow_instance_id),
        `${record.id}.source_event_id belongs to an unrelated workflow instance`,
      );
      invariant(
        sourceEvent.record_writes.includes(record.id),
        `${record.id}.source_event_id does not write the record`,
      );
      invariant(
        parseTime(sourceEvent.occurred_at, `${sourceEvent.id}.occurred_at`) <=
          recordedAt,
        `${record.id} was recorded before its source event`,
      );
    }
    references(links, record.link_ids, `${record.id}.link_ids`);
    invariant(
      effectiveAt <= recordedAt,
      `${record.id} was recorded before it became effective`,
    );
    if (record.valid_until)
      invariant(
        effectiveAt <=
          parseTime(record.valid_until, `${record.id}.valid_until`),
        `${record.id}.valid_until precedes effective_at`,
      );
    const finalCorrectionVersion = validateCorrections(
      record.corrections,
      people,
      records,
      record.id,
    );
    correctionCount += record.corrections.length;
    invariant(
      record.version.number >= finalCorrectionVersion,
      `${record.id}.version predates its correction history`,
    );
    validateQuantityTree(record.facts, units, `${record.id}.facts`);
    invariant(
      typeof record.facts.domain_kind === "string" &&
        record.facts.domain_kind.length >= 3,
      `${record.id}.facts lacks a domain_kind`,
    );
    invariant(
      record.facts.domain_kind ===
        RECORD_FAMILY_BY_ID.get(record.record_definition_id),
      `${record.id}.facts domain_kind does not match ${record.record_definition_id}`,
    );
    for (const requiredPath of BESPOKE_FACT_PATHS[
      record.record_definition_id
    ] ?? [])
      invariant(
        jsonPointerExists(
          record,
          `/facts/${requiredPath.replaceAll(".", "/")}`,
        ),
        `${record.id}.facts lacks required ${requiredPath}`,
      );
    for (const [requiredPath, expectedDimension] of Object.entries(
      BESPOKE_QUANTITY_DIMENSIONS[record.record_definition_id] ?? {},
    )) {
      const quantity = jsonPointerValue(
        record,
        `/facts/${requiredPath.replaceAll(".", "/")}`,
      );
      invariant(
        quantity &&
          typeof quantity === "object" &&
          Number.isFinite(quantity.value) &&
          typeof quantity.unit_id === "string",
        `${record.id}.facts ${requiredPath} must be a quantity`,
      );
      const unit = units.get(quantity.unit_id);
      invariant(
        unit?.dimension === expectedDimension,
        `${record.id}.facts ${requiredPath} must use ${expectedDimension} units`,
      );
    }
    if (
      record.record_definition_id === "REC-002" &&
      new Date(effectiveAt).getUTCMonth() + 1 < 4
    )
      invariant(
        !/canopy|shoot|leaf|veraison/i.test(
          JSON.stringify(record.facts.domain_details),
        ),
        `${record.id} uses an active-canopy field signal during dormancy`,
      );
    if (record.record_definition_id === "REC-062")
      invariant(
        !/load_id|gross_weight|tare_weight|net_weight|fruit_temperature|settlement_(?:gross|adjustments|net)/i.test(
          JSON.stringify(record.facts),
        ),
        `${record.id} payroll exception contains harvest, load, weight, fruit, or settlement facts`,
      );
    const factProfile = inspectFacts(
      record.facts,
      entityIndexes,
      `${record.id}.facts`,
    );
    invariant(
      factProfile.domainLeaves >= 6,
      `${record.id}.facts has fewer than six substantive domain values`,
    );
    invariant(
      factProfile.entityReferences >= 1,
      `${record.id}.facts has no typed entity reference`,
    );
    invariant(
      factProfile.stateFields >= 1,
      `${record.id}.facts has no state, decision, result, or outcome field`,
    );
    for (const unitId of factProfile.unitIds) factUnitCoverage.add(unitId);
    const substantiveFacts = structuredClone(record.facts);
    delete substantiveFacts.canonical_record_name;
    delete substantiveFacts.record_instance_key;
    const factSignature = JSON.stringify(substantiveFacts);
    invariant(
      !factSignatures.has(factSignature),
      `${record.id}.facts duplicates another record instance`,
    );
    factSignatures.add(factSignature);
    for (const correction of record.corrections)
      for (const fieldPath of correction.field_paths) {
        invariant(
          fieldPath !== "/facts/record_name",
          `${record.id}/${correction.id} claims a non-substantive display-name correction`,
        );
        invariant(
          jsonPointerExists(record, fieldPath),
          `${record.id}/${correction.id} points to missing field ${fieldPath}`,
        );
      }
  }
  for (const recordId of recordDefinitions.keys())
    invariant(
      recordDefinitionCoverage.has(recordId),
      `canonical record ${recordId} has no generated instance`,
    );
  const recordContractCoverage = new Set(
    operation.record_instances.flatMap((record) => record.contract_ids ?? []),
  );
  for (const contractId of contracts.keys())
    invariant(
      recordContractCoverage.has(contractId),
      `${contractId} has no associated operational record`,
    );
  invariant(
    factUnitCoverage.size >= 8,
    `record facts use only ${factUnitCoverage.size} unit definitions`,
  );

  for (const record of operation.record_instances) {
    if (record.supersedes_record_instance_id) {
      const predecessor = reference(
        records,
        record.supersedes_record_instance_id,
        `${record.id}.supersedes_record_instance_id`,
      );
      invariant(
        predecessor.superseded_by_record_instance_id === record.id,
        `${record.id} supersession is not reciprocal`,
      );
      invariant(
        JSON.stringify(substantiveFactView(predecessor.facts)) !==
          JSON.stringify(substantiveFactView(record.facts)),
        `${record.id} supersession has no substantive authoritative fact delta from ${predecessor.id}`,
      );
    }
    if (record.superseded_by_record_instance_id) {
      const successor = reference(
        records,
        record.superseded_by_record_instance_id,
        `${record.id}.superseded_by_record_instance_id`,
      );
      invariant(
        successor.supersedes_record_instance_id === record.id,
        `${record.id} superseded_by link is not reciprocal`,
      );
    }
  }
  noCycles(
    records.keys(),
    (id) => {
      const next = records.get(id).superseded_by_record_instance_id;
      return next ? [next] : [];
    },
    "record supersession",
  );
  const supersessionCount = operation.record_instances.filter(
    (record) => record.supersedes_record_instance_id,
  ).length;
  invariant(
    supersessionCount >= 2,
    `only ${supersessionCount} explicit record supersessions exist`,
  );

  let crossWorkflowLinks = 0;
  for (const link of operation.links) {
    const source = reference(
      records,
      link.source_record_instance_id,
      `${link.id}.source_record_instance_id`,
    );
    const targetIndex = entityIndexes[link.target.entity_type];
    invariant(
      Boolean(targetIndex),
      `${link.id} has unsupported target type ${link.target.entity_type}`,
    );
    const target = reference(
      targetIndex,
      link.target.entity_id,
      `${link.id}.target.entity_id`,
    );
    if (link.target.entity_type === "record_instance") {
      const sourceEffectiveAt = parseTime(
        source.effective_at,
        `${source.id}.effective_at`,
      );
      const targetEffectiveAt = parseTime(
        target.effective_at,
        `${target.id}.effective_at`,
      );
      const linkSignature = [
        source.record_definition_id,
        link.relation,
        target.record_definition_id,
      ].join("|");
      if (link.relation === "supersedes")
        invariant(
          source.record_definition_id === target.record_definition_id &&
            source.supersedes_record_instance_id === target.id &&
            target.superseded_by_record_instance_id === source.id &&
            sourceEffectiveAt > targetEffectiveAt,
          `${link.id} is not a reciprocal same-definition supersession`,
        );
      else
        invariant(
          ALLOWED_RECORD_LINK_TEMPLATES.has(linkSignature),
          `${link.id} uses unsupported semantic tuple ${linkSignature}`,
        );
      if (["supports", "documents", "fulfills"].includes(link.relation))
        invariant(
          sourceEffectiveAt <= targetEffectiveAt,
          `${link.id} ${link.relation} points backward in effective time`,
        );
      if (link.relation === "corrects")
        invariant(
          sourceEffectiveAt >= targetEffectiveAt,
          `${link.id} correction predates the record it corrects`,
        );
      const sourceWorkflows = new Set(
        source.workflow_instance_ids.map(
          (id) => workflowInstances.get(id).workflow_id,
        ),
      );
      const targetWorkflows = new Set(
        target.workflow_instance_ids.map(
          (id) => workflowInstances.get(id).workflow_id,
        ),
      );
      if ([...sourceWorkflows].some((id) => !targetWorkflows.has(id)))
        crossWorkflowLinks += 1;
      const createdAt = parseTime(link.created_at, `${link.id}.created_at`);
      invariant(
        createdAt >=
          parseTime(source.recorded_at, `${source.id}.recorded_at`) &&
          createdAt >=
            parseTime(target.recorded_at, `${target.id}.recorded_at`),
        `${link.id} was created before one of its records existed`,
      );
    }
    invariant(
      source.link_ids.includes(link.id),
      `${link.id} is absent from source record ${source.id}.link_ids`,
    );
  }
  invariant(
    crossWorkflowLinks >= 40,
    `only ${crossWorkflowLinks} cross-workflow record links exist; expected at least 40`,
  );
  for (const recordDefinitionId of REQUIRED_SHARED_RECORDS) {
    const shared = operation.record_instances.some((record) => {
      if (record.record_definition_id !== recordDefinitionId) return false;
      const workflowIds = new Set(
        record.workflow_instance_ids.map(
          (id) => workflowInstances.get(id).workflow_id,
        ),
      );
      return workflowIds.size > 1;
    });
    invariant(
      shared,
      `${recordDefinitionId} has no cross-workflow record instance`,
    );
  }

  const transitionIndexes = new Map();
  for (const workflow of definitions.workflows)
    transitionIndexes.set(
      workflow.id,
      uniqueIndex(workflow.transitions, `${workflow.id} transitions`),
    );
  const eventByWorkflowInstance = new Map();
  const decisionCoverage = new Set();
  const monthCoverage = new Set();
  let offlineEvents = 0;
  let conflictEvents = 0;
  const workflowsWithOffline = new Set();
  const workflowsWithConflicts = new Set();
  const eventMeasurementUnits = new Set();
  const workflowsWithMeasurements = new Set();
  let previousSequence = 0;
  let previousRecordedAt = -Infinity;
  for (const event of eventDocument.events) {
    invariant(
      event.sequence === previousSequence + 1,
      `${event.id}.sequence is not contiguous`,
    );
    previousSequence = event.sequence;
    invariant(
      event.operation_id === operation.operation_id,
      `${event.id}.operation_id differs from the operation`,
    );
    const instance = reference(
      workflowInstances,
      event.workflow_instance_id,
      `${event.id}.workflow_instance_id`,
    );
    invariant(
      event.workflow_id === instance.workflow_id,
      `${event.id}.workflow_id differs from its workflow instance`,
    );
    invariant(
      event.scope_id === instance.scope_id,
      `${event.id}.scope_id differs from its workflow instance`,
    );
    const transition = reference(
      transitionIndexes.get(event.workflow_id),
      event.transition_id,
      `${event.id}.transition_id`,
    );
    invariant(
      transition.from === event.from_state &&
        transition.to === event.to_state &&
        transition.kind === event.kind,
      `${event.id} does not match canonical transition ${transition.id}`,
    );
    const actor = reference(
      assignments,
      event.actor_assignment_id,
      `${event.id}.actor_assignment_id`,
    );
    invariant(
      actor.role_id === transition.owner,
      `${event.id} actor role ${actor.role_id} does not own ${transition.id}`,
    );
    const occurredAt = parseTime(event.occurred_at, `${event.id}.occurred_at`);
    const recordedAt = parseTime(event.recorded_at, `${event.id}.recorded_at`);
    assertPacificOffset(event.occurred_at, `${event.id}.occurred_at`);
    assertPacificOffset(event.recorded_at, `${event.id}.recorded_at`);
    invariant(
      occurredAt <= recordedAt,
      `${event.id} was recorded before it occurred`,
    );
    invariant(
      recordedAt >= previousRecordedAt,
      `${event.id}.sequence regresses global recorded chronology`,
    );
    previousRecordedAt = recordedAt;
    invariant(
      occurredAt >= seasonStart && occurredAt <= seasonEnd,
      `${event.id} occurs outside the declared season`,
    );
    monthCoverage.add(new Date(occurredAt).getUTCMonth() + 1);
    if (event.cause_event_id)
      reference(events, event.cause_event_id, `${event.id}.cause_event_id`);
    const readRecords = event.record_reads.map((id) =>
      reference(records, id, `${event.id}.record_reads`),
    );
    const writtenRecords = event.record_writes.map((id) =>
      reference(records, id, `${event.id}.record_writes`),
    );
    const eventScope = scopes.get(event.scope_id);
    const eventBlocks = eventScope.entity_ids.filter((id) => blocks.has(id));
    for (const [access, eventRecords] of [
      ["read", readRecords],
      ["write", writtenRecords],
    ])
      for (const record of eventRecords) {
        invariant(
          record.workflow_instance_ids.includes(event.workflow_instance_id),
          `${event.id} ${access}s ${record.id} outside its associated workflow instances`,
        );
        invariant(
          record.scope_ids.includes(event.scope_id),
          `${event.id} ${access}s ${record.id} outside its associated scopes`,
        );
        for (const blockId of eventBlocks)
          invariant(
            record.block_ids?.includes(blockId),
            `${event.id} ${access}s ${record.id} with a mismatched block scope`,
          );
        const effectiveAt = parseTime(
          record.effective_at,
          `${record.id}.effective_at`,
        );
        invariant(
          effectiveAt <= occurredAt,
          `${event.id} ${access}s ${record.id} before it is effective`,
        );
        if (access === "read")
          invariant(
            parseTime(record.recorded_at, `${record.id}.recorded_at`) <=
              occurredAt,
            `${event.id} reads ${record.id} before it is recorded`,
          );
        else
          invariant(
            recordedAt <=
              parseTime(
                record.version.recorded_at,
                `${record.id}.version.recorded_at`,
              ),
            `${event.id} writes ${record.id} after its current version`,
          );
      }
    for (const record of readRecords)
      invariant(
        transition.record_reads.includes(record.record_definition_id),
        `${event.id} reads ${record.record_definition_id} outside ${transition.id}'s contract`,
      );
    for (const record of writtenRecords)
      invariant(
        transition.record_writes.includes(record.record_definition_id),
        `${event.id} writes ${record.record_definition_id} outside ${transition.id}'s contract`,
      );
    if (event.workflow_id === "WF-004" && event.to_state === "actualized")
      invariant(
        writtenRecords.some(
          (record) => record.record_definition_id === "REC-033",
        ),
        `${event.id} enters actualized without writing a Harvest actual record`,
      );
    if (event.workflow_id === "WF-004" && event.to_state === "reconciled")
      invariant(
        [...readRecords, ...writtenRecords].some(
          (record) => record.record_definition_id === "REC-033",
        ),
        `${event.id} reconciles without Harvest actual evidence`,
      );
    for (const decisionId of event.decision_ids) {
      reference(decisionDefinitions, decisionId, `${event.id}.decision_ids`);
      invariant(
        transition.decision_ids.includes(decisionId),
        `${event.id} uses ${decisionId} outside ${transition.id}'s contract`,
      );
      decisionCoverage.add(decisionId);
    }
    invariant(
      event.decision_results.length === event.decision_ids.length &&
        new Set(event.decision_results.map((result) => result.decision_id))
          .size === event.decision_ids.length &&
        event.decision_ids.every((decisionId) =>
          event.decision_results.some(
            (result) => result.decision_id === decisionId,
          ),
        ),
      `${event.id}.decision_results do not cover every decision exactly once`,
    );
    for (const result of event.decision_results)
      invariant(
        decisionDefinitions
          .get(result.decision_id)
          .outcomes.includes(result.outcome),
        `${event.id}/${result.decision_id} outcome is outside the canonical decision`,
      );
    references(
      histories,
      event.exception_history_ids,
      `${event.id}.exception_history_ids`,
    );
    for (const historyId of event.exception_history_ids)
      invariant(
        histories.get(historyId).event_ids.includes(event.id),
        `${event.id} is not reciprocally linked from exception ${historyId}`,
      );
    references(
      records,
      event.connectivity.conflict_record_instance_ids,
      `${event.id}.connectivity.conflict_record_instance_ids`,
    );
    if (event.connectivity.captured_offline) {
      offlineEvents += 1;
      workflowsWithOffline.add(event.workflow_id);
    }
    if (["conflict", "resolved"].includes(event.connectivity.sync_status)) {
      conflictEvents += 1;
      workflowsWithConflicts.add(event.workflow_id);
    }
    if (event.connectivity.device_recorded_at) {
      parseTime(
        event.connectivity.device_recorded_at,
        `${event.id}.connectivity.device_recorded_at`,
      );
      assertPacificOffset(
        event.connectivity.device_recorded_at,
        `${event.id}.connectivity.device_recorded_at`,
      );
    }
    if (event.connectivity.synced_at) {
      const syncedAt = parseTime(
        event.connectivity.synced_at,
        `${event.id}.connectivity.synced_at`,
      );
      assertPacificOffset(
        event.connectivity.synced_at,
        `${event.id}.connectivity.synced_at`,
      );
      invariant(
        recordedAt <= syncedAt,
        `${event.id} synced before it was recorded`,
      );
    }
    validateQuantityTree(event.measurements, units, `${event.id}.measurements`);
    const measurementUnits = collectQuantityUnits(event.measurements);
    for (const unitId of measurementUnits) eventMeasurementUnits.add(unitId);
    if (measurementUnits.size > 0)
      workflowsWithMeasurements.add(event.workflow_id);
    if (!eventByWorkflowInstance.has(instance.id))
      eventByWorkflowInstance.set(instance.id, []);
    eventByWorkflowInstance.get(instance.id).push(event);
  }
  invariant(
    eventDocument.events.length >= 250,
    "fewer than 250 state events exist",
  );
  invariant(
    monthCoverage.size === 12,
    "state events do not cover all 12 months",
  );
  invariant(
    offlineEvents >= 10 && workflowsWithOffline.size >= 4,
    `offline capture has only ${offlineEvents} events across ${workflowsWithOffline.size} workflows`,
  );
  invariant(
    conflictEvents >= 5 && workflowsWithConflicts.size >= 3,
    `sync conflicts have only ${conflictEvents} events across ${workflowsWithConflicts.size} workflows`,
  );
  invariant(
    eventMeasurementUnits.size >= 8,
    `event measurements use only ${eventMeasurementUnits.size} unit definitions`,
  );
  invariant(
    workflowsWithMeasurements.size === workflowDefinitions.size,
    "event measurements do not cover every workflow family",
  );

  for (const instance of operation.workflow_instances) {
    const instanceEvents = eventByWorkflowInstance.get(instance.id) ?? [];
    invariant(instanceEvents.length > 0, `${instance.id} has no state events`);
    let state = null;
    let priorTime = -Infinity;
    let actualKnown = false;
    let weightKnown = false;
    let orderKnown = false;
    let receiptKnown = false;
    const measurementProfiles = new Set();
    for (const event of instanceEvents) {
      const occurredAt = parseTime(
        event.occurred_at,
        `${event.id}.occurred_at`,
      );
      invariant(
        occurredAt >= priorTime,
        `${instance.id} event chronology regresses at ${event.id}`,
      );
      invariant(
        event.from_state === state,
        `${instance.id} state continuity breaks at ${event.id}`,
      );
      if (event.to_state === "actualized") actualKnown = true;
      if (event.to_state === "weighed") weightKnown = true;
      if (event.to_state === "ordered") orderKnown = true;
      if (event.to_state === "received") receiptKnown = true;
      const measurementKeys = new Set(Object.keys(event.measurements));
      if (
        instance.workflow_id === "WF-004" &&
        measurementKeys.has("forecast_error")
      )
        invariant(
          actualKnown,
          `${event.id} exposes final forecast error before harvest actuals exist`,
        );
      if (
        instance.workflow_id === "WF-006" &&
        ["gross_weight", "tare_weight", "net_weight"].some((key) =>
          measurementKeys.has(key),
        )
      )
        invariant(
          weightKnown,
          `${event.id} exposes exact scale weights before the weighed state`,
        );
      if (instance.workflow_id === "WF-008") {
        if (measurementKeys.has("ordered"))
          invariant(
            orderKnown,
            `${event.id} exposes an order quantity before the order exists`,
          );
        if (measurementKeys.has("received") || measurementKeys.has("variance"))
          invariant(
            receiptKnown,
            `${event.id} exposes receipt results before receipt`,
          );
      }
      measurementProfiles.add(JSON.stringify(event.measurements));
      state = event.to_state;
      priorTime = occurredAt;
    }
    if (instanceEvents.length >= 5)
      invariant(
        measurementProfiles.size >= 2,
        `${instance.id} reuses one measurement snapshot across its full lifecycle`,
      );
    invariant(
      state === instance.current_state,
      `${instance.id}.current_state differs from its final event`,
    );
    invariant(
      instance.last_event_id === instanceEvents.at(-1).id,
      `${instance.id}.last_event_id is not its final event`,
    );
  }

  const exceptionWorkflowCoverage = new Set();
  for (const history of exceptionDocument.histories) {
    const definition = reference(
      exceptionDefinitions,
      history.exception_definition_id,
      `${history.id}.exception_definition_id`,
    );
    invariant(
      history.operation_id === operation.operation_id,
      `${history.id}.operation_id differs from the operation`,
    );
    const instance = reference(
      workflowInstances,
      history.workflow_instance_id,
      `${history.id}.workflow_instance_id`,
    );
    invariant(
      history.workflow_id === instance.workflow_id,
      `${history.id}.workflow_id differs from its workflow instance`,
    );
    invariant(
      definition.workflow_ids.includes(history.workflow_id),
      `${history.id} uses ${definition.id} outside its canonical workflow`,
    );
    invariant(
      definition.interrupted_states.includes(history.interrupted_state),
      `${history.id}.interrupted_state is outside ${definition.id}`,
    );
    if (history.recovery_state)
      invariant(
        definition.recovery_states.includes(history.recovery_state),
        `${history.id}.recovery_state is outside ${definition.id}`,
      );
    exceptionWorkflowCoverage.add(history.workflow_id);
    reference(scopes, history.scope_id, `${history.id}.scope_id`);
    references(blocks, history.block_ids, `${history.id}.block_ids`);
    reference(
      assignments,
      history.detected_by_assignment_id,
      `${history.id}.detected_by_assignment_id`,
    );
    reference(
      assignments,
      history.accountable_assignment_id,
      `${history.id}.accountable_assignment_id`,
    );
    references(
      assignments,
      history.escalated_to_assignment_ids,
      `${history.id}.escalated_to_assignment_ids`,
    );
    const historyEvents = history.event_ids.map((id) =>
      reference(events, id, `${history.id}.event_ids`),
    );
    const historyRecords = history.record_instance_ids.map((id) =>
      reference(records, id, `${history.id}.record_instance_ids`),
    );
    for (const event of historyEvents) {
      invariant(
        event.workflow_instance_id === history.workflow_instance_id,
        `${history.id} includes event ${event.id} from another workflow instance`,
      );
      invariant(
        event.exception_history_ids.includes(history.id),
        `${history.id} is not reciprocally linked from event ${event.id}`,
      );
    }
    for (const record of historyRecords) {
      invariant(
        record.workflow_instance_ids.includes(history.workflow_instance_id),
        `${history.id} includes record ${record.id} from another workflow instance`,
      );
      invariant(
        record.scope_ids.includes(history.scope_id),
        `${history.id} includes record ${record.id} from another scope`,
      );
    }
    const openingEvent = historyEvents[0];
    const openingTransition = transitionIndexes
      .get(history.workflow_id)
      .get(openingEvent.transition_id);
    invariant(
      openingTransition.exception_ids.includes(history.exception_definition_id),
      `${history.id} does not begin with its canonical exception transition`,
    );
    for (const decisionId of history.decision_ids) {
      reference(decisionDefinitions, decisionId, `${history.id}.decision_ids`);
      invariant(
        definition.decisions.includes(decisionId),
        `${history.id} uses ${decisionId} outside ${definition.id}`,
      );
      decisionCoverage.add(decisionId);
    }
    const openedAt = parseTime(history.opened_at, `${history.id}.opened_at`);
    assertPacificOffset(history.opened_at, `${history.id}.opened_at`);
    invariant(
      openedAt ===
        parseTime(openingEvent.occurred_at, `${openingEvent.id}.occurred_at`),
      `${history.id}.opened_at differs from its opening event`,
    );
    for (let index = 1; index < historyEvents.length; index += 1)
      invariant(
        historyEvents[index - 1].sequence < historyEvents[index].sequence,
        `${history.id}.event_ids are not chronological`,
      );
    let priorMilestone = openedAt;
    for (const field of ["acknowledged_at", "resolved_at", "closed_at"])
      if (history[field]) {
        const milestone = parseTime(history[field], `${history.id}.${field}`);
        assertPacificOffset(history[field], `${history.id}.${field}`);
        invariant(
          milestone >= priorMilestone,
          `${history.id}.${field} regresses exception chronology`,
        );
        priorMilestone = milestone;
      }
    if (history.closed_at) {
      const lastEventRecordedAt = Math.max(
        ...historyEvents.map((event) =>
          parseTime(event.recorded_at, `${event.id}.recorded_at`),
        ),
      );
      invariant(
        parseTime(history.closed_at, `${history.id}.closed_at`) >=
          lastEventRecordedAt,
        `${history.id} closes before its final recovery event is recorded`,
      );
    }
    let priorRecoveryEventSequence = -Infinity;
    for (const [actionIndex, action] of history.recovery_actions.entries()) {
      invariant(
        action.sequence === actionIndex + 1,
        `${history.id}.recovery_actions are not contiguous`,
      );
      reference(
        assignments,
        action.owner_assignment_id,
        `${history.id}.recovery_actions[${action.sequence}].owner_assignment_id`,
      );
      invariant(
        Boolean(action.resulting_event_id),
        `${history.id} recovery action lacks a resulting event`,
      );
      invariant(
        history.event_ids.includes(action.resulting_event_id),
        `${history.id} recovery action points outside its event history`,
      );
      const recoveryEvent = events.get(action.resulting_event_id);
      invariant(
        recoveryEvent.sequence > priorRecoveryEventSequence,
        `${history.id} recovery action events are not chronological`,
      );
      priorRecoveryEventSequence = recoveryEvent.sequence;
      if (actionIndex === 0)
        invariant(
          recoveryEvent.id === openingEvent.id &&
            recoveryEvent.to_state === history.recovery_state,
          `${history.id} first recovery action does not realize its canonical exception transition`,
        );
      if (action.completed_at) {
        assertPacificOffset(
          action.completed_at,
          `${history.id}.recovery_actions[${action.sequence}].completed_at`,
        );
        invariant(
          parseTime(
            action.completed_at,
            `${history.id}.recovery_actions[${action.sequence}].completed_at`,
          ) >=
            parseTime(
              recoveryEvent.occurred_at,
              `${recoveryEvent.id}.occurred_at`,
            ),
          `${history.id} recovery action completes before its resulting event`,
        );
      }
      references(
        records,
        action.evidence_record_instance_ids,
        `${history.id}.recovery_actions[${action.sequence}].evidence_record_instance_ids`,
      );
      invariant(
        (action.evidence_record_instance_ids ?? []).every((id) =>
          history.record_instance_ids.includes(id),
        ),
        `${history.id} recovery action uses records outside its history`,
      );
    }
    invariant(
      history.recovery_actions.at(-1).resulting_event_id ===
        historyEvents.at(-1).id,
      `${history.id} final recovery action does not close its event path`,
    );
    if (history.closure) {
      reference(
        assignments,
        history.closure.closed_by_assignment_id,
        `${history.id}.closure.closed_by_assignment_id`,
      );
      references(
        records,
        history.closure.closure_record_instance_ids,
        `${history.id}.closure.closure_record_instance_ids`,
      );
      invariant(
        history.closure.closure_record_instance_ids.every((id) =>
          history.record_instance_ids.includes(id),
        ),
        `${history.id}.closure uses records outside its history`,
      );
    }
    if (history.status === "closed")
      invariant(
        Boolean(history.closed_at && history.closure),
        `${history.id} is closed without closure evidence`,
      );
    if (history.reopened_from_exception_history_id)
      reference(
        histories,
        history.reopened_from_exception_history_id,
        `${history.id}.reopened_from_exception_history_id`,
      );
    const finalCorrectionVersion = validateCorrections(
      history.corrections,
      people,
      records,
      history.id,
    );
    correctionCount += history.corrections?.length ?? 0;
    invariant(
      history.version.number >= finalCorrectionVersion,
      `${history.id}.version predates its correction history`,
    );
  }
  invariant(
    exceptionDocument.histories.length >= 25,
    "fewer than 25 substantive exception histories exist",
  );
  for (const workflowId of workflowDefinitions.keys())
    invariant(
      exceptionWorkflowCoverage.has(workflowId),
      `${workflowId} has no exception history`,
    );
  for (const decisionId of decisionDefinitions.keys())
    invariant(
      decisionCoverage.has(decisionId),
      `canonical decision ${decisionId} is not exercised`,
    );

  const appliedOverlays = new Set();
  for (const application of operation.overlay_applications ?? []) {
    reference(
      overlayDefinitions,
      application.overlay_id,
      `overlay application ${application.overlay_id}`,
    );
    references(
      scopes,
      application.scope_ids,
      `${application.overlay_id}.scope_ids`,
    );
    references(
      records,
      application.record_instance_ids,
      `${application.overlay_id}.record_instance_ids`,
    );
    appliedOverlays.add(application.overlay_id);
  }
  for (const overlayId of overlayDefinitions.keys())
    invariant(appliedOverlays.has(overlayId), `${overlayId} is not applied`);

  const chains = operation.operational_chains ?? [];
  invariant(
    chains.length >= 4,
    "fewer than four harvest-to-settlement chains exist",
  );
  let contractChains = 0;
  let estateChains = 0;
  const chainedFruitContracts = new Set();
  for (const chain of chains) {
    references(
      workflowInstances,
      chain.workflow_instance_ids,
      `${chain.id}.workflow_instance_ids`,
    );
    references(
      records,
      chain.record_instance_ids,
      `${chain.id}.record_instance_ids`,
    );
    references(links, chain.link_ids, `${chain.id}.link_ids`);
    const chainWorkflowInstances = new Set(chain.workflow_instance_ids);
    const chainRecords = new Set(chain.record_instance_ids);
    for (const recordId of chainRecords)
      invariant(
        records
          .get(recordId)
          .workflow_instance_ids.some((id) => chainWorkflowInstances.has(id)),
        `${chain.id} contains unrelated record ${recordId}`,
      );
    for (const workflowInstanceId of chainWorkflowInstances)
      invariant(
        [...chainRecords].some((recordId) =>
          records
            .get(recordId)
            .workflow_instance_ids.includes(workflowInstanceId),
        ),
        `${chain.id} has no record for ${workflowInstanceId}`,
      );
    const adjacency = new Map(
      [...chainRecords].map((recordId) => [recordId, new Set()]),
    );
    for (const linkId of chain.link_ids) {
      const link = links.get(linkId);
      invariant(
        link.chain_id === chain.id,
        `${chain.id} uses link ${linkId} without matching chain attribution`,
      );
      invariant(
        link.target.entity_type === "record_instance" &&
          chainRecords.has(link.source_record_instance_id) &&
          chainRecords.has(link.target.entity_id),
        `${chain.id} uses unrelated link ${linkId}`,
      );
      adjacency.get(link.source_record_instance_id).add(link.target.entity_id);
      adjacency.get(link.target.entity_id).add(link.source_record_instance_id);
    }
    const reachable = new Set();
    const pending = [[...chainRecords][0]];
    while (pending.length > 0) {
      const recordId = pending.pop();
      if (reachable.has(recordId)) continue;
      reachable.add(recordId);
      pending.push(...adjacency.get(recordId));
    }
    invariant(
      reachable.size === chainRecords.size,
      `${chain.id} record-link graph is disconnected`,
    );
    const chainWorkflowIds = new Set(
      chain.workflow_instance_ids.map(
        (id) => workflowInstances.get(id).workflow_id,
      ),
    );
    for (const requiredWorkflowId of ["WF-004", "WF-005", "WF-006"])
      invariant(
        chainWorkflowIds.has(requiredWorkflowId),
        `${chain.id} omits ${requiredWorkflowId} from harvest-to-settlement`,
      );
    const chainRecordsByDefinition = new Map();
    for (const recordId of chainRecords) {
      const record = records.get(recordId);
      const matches =
        chainRecordsByDefinition.get(record.record_definition_id) ?? [];
      matches.push(record);
      chainRecordsByDefinition.set(record.record_definition_id, matches);
    }
    for (const requiredRecordId of ["REC-047", "REC-050", "REC-053"])
      invariant(
        chainRecordsByDefinition.get(requiredRecordId)?.length === 1,
        `${chain.id} must contain exactly one ${requiredRecordId}`,
      );
    const weighBill = chainRecordsByDefinition.get("REC-047")[0];
    const delivery = chainRecordsByDefinition.get("REC-050")[0];
    const settlement = chainRecordsByDefinition.get("REC-053")[0];
    const netWeight = jsonPointerValue(
      weighBill,
      "/facts/domain_details/net_weight",
    );
    const deliveredTonnage = jsonPointerValue(
      delivery,
      "/facts/definition_evidence/entered_delivery_tonnage",
    );
    invariant(
      netWeight?.unit_id === "UNT-018" &&
        deliveredTonnage?.unit_id === "UNT-003" &&
        Math.abs(netWeight.value / 2_000 - deliveredTonnage.value) < 0.0001,
      `${chain.id} weigh-bill pounds do not reconcile to entered delivery tons`,
    );
    const loadIds = [weighBill, delivery, settlement].map((record) =>
      jsonPointerValue(record, "/facts/workflow_metrics/load_id"),
    );
    invariant(
      loadIds.every((loadId) => loadId === loadIds[0]),
      `${chain.id} weigh, delivery, and settlement records disagree on load identity`,
    );
    const settlementGross = jsonPointerValue(
      settlement,
      "/facts/domain_details/settlement_gross/amount",
    );
    const settlementAdjustment = jsonPointerValue(
      settlement,
      "/facts/domain_details/settlement_adjustments/amount",
    );
    const settlementNet = jsonPointerValue(
      settlement,
      "/facts/domain_details/settlement_net/amount",
    );
    invariant(
      [settlementGross, settlementAdjustment, settlementNet].every(
        Number.isFinite,
      ) &&
        Math.abs(settlementGross + settlementAdjustment - settlementNet) <
          0.005,
      `${chain.id} settlement arithmetic does not reconcile`,
    );
    const fruitContractIds = new Set(
      chain.workflow_instance_ids.flatMap((id) =>
        (workflowInstances.get(id).contract_ids ?? []).filter(
          (contractId) => contracts.get(contractId).type === "fruit_purchase",
        ),
      ),
    );
    if (fruitContractIds.size > 0) {
      invariant(
        fruitContractIds.size === 1 && chainWorkflowIds.has("WF-009"),
        `${chain.id} contract chain must resolve one fruit contract and relationship workflow`,
      );
      contractChains += 1;
      for (const contractId of fruitContractIds)
        chainedFruitContracts.add(contractId);
    } else estateChains += 1;
  }
  invariant(
    contractChains >= 2,
    "fewer than two contract-fruit operational chains exist",
  );
  invariant(
    estateChains >= 2,
    "fewer than two estate operational chains exist",
  );
  const fruitContracts = operation.contracts
    .filter((contract) => contract.type === "fruit_purchase")
    .map((contract) => contract.id);
  for (const contractId of fruitContracts)
    invariant(
      chainedFruitContracts.has(contractId),
      `${contractId} has no contract-fruit harvest-to-settlement chain`,
    );

  for (const source of operation.canonical_sources ?? []) {
    if (!sourceHashes.has(source.path)) continue;
    invariant(
      source.sha256 === sourceHashes.get(source.path),
      `${source.id} hash has drifted for ${source.path}`,
    );
  }
  if (sourceHashes.size > 0)
    for (const sourcePath of sourceHashes.keys())
      invariant(
        operation.canonical_sources?.some(
          (source) => source.path === sourcePath,
        ),
        `canonical source ${sourcePath} is not captured`,
      );

  return {
    operation_id: operation.operation_id,
    seed: operation.seed,
    organizations: organizations.size,
    properties: properties.size,
    blocks: blocks.size,
    active_blocks: activeBlocks.size,
    people: people.size,
    role_assignments: assignments.size,
    contracts: contracts.size,
    active_contracts: activeContracts.size,
    workflow_instances: workflowInstances.size,
    workflow_families: workflowCounts.size,
    multi_day_instances: multiDayInstances,
    long_running_instances: longRunningInstances,
    longest_instance_days: Number(longestInstanceDays.toFixed(4)),
    record_instances: records.size,
    record_definitions: recordDefinitionCoverage.size,
    events: events.size,
    event_months: monthCoverage.size,
    offline_events: offlineEvents,
    offline_workflows: workflowsWithOffline.size,
    conflict_events: conflictEvents,
    conflict_workflows: workflowsWithConflicts.size,
    event_measurement_units: eventMeasurementUnits.size,
    record_fact_units: factUnitCoverage.size,
    decisions_exercised: decisionCoverage.size,
    exception_histories: histories.size,
    exception_workflows: exceptionWorkflowCoverage.size,
    corrections: correctionCount,
    supersessions: supersessionCount,
    overlays: appliedOverlays.size,
    links: links.size,
    cross_workflow_links: crossWorkflowLinks,
    operational_chains: chains.length,
    contract_chains: contractChains,
    estate_chains: estateChains,
  };
}

export { REQUIRED_SHARED_RECORDS };
