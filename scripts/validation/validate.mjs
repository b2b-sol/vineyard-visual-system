import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { parse as parseYaml } from "yaml";

import { validateSeasonData } from "./season-data.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const ALLOWED_SCOPES = new Set(["schema", "evidence", "trace", "data", "all"]);
const args = process.argv.slice(2);
const scopeFlagIndex = args.indexOf("--scope");
const scope = scopeFlagIndex >= 0 ? args[scopeFlagIndex + 1] : "all";

if (!ALLOWED_SCOPES.has(scope)) {
  throw new Error(
    `Unknown validation scope "${scope}". Expected schema, evidence, trace, data, or all.`,
  );
}

const state = {
  assertions: 0,
  files: new Map(),
  schemas: new Map(),
  documents: new Map(),
};

function absolute(relativePath) {
  return path.join(ROOT, ...relativePath.split("/"));
}

async function readText(relativePath) {
  if (!state.files.has(relativePath)) {
    state.files.set(
      relativePath,
      await readFile(absolute(relativePath), "utf8"),
    );
  }
  return state.files.get(relativePath);
}

async function readJson(relativePath) {
  if (!state.documents.has(relativePath)) {
    const text = await readText(relativePath);
    try {
      state.documents.set(relativePath, JSON.parse(text));
    } catch (error) {
      throw new Error(`${relativePath}: invalid JSON (${error.message})`, {
        cause: error,
      });
    }
  }
  return state.documents.get(relativePath);
}

async function readYaml(relativePath) {
  if (!state.documents.has(relativePath)) {
    const text = await readText(relativePath);
    try {
      state.documents.set(relativePath, parseYaml(text));
    } catch (error) {
      throw new Error(`${relativePath}: invalid YAML (${error.message})`, {
        cause: error,
      });
    }
  }
  return state.documents.get(relativePath);
}

function assert(condition, message) {
  state.assertions += 1;
  if (!condition) {
    throw new Error(message);
  }
}

function assertUnique(values, label) {
  assert(
    new Set(values).size === values.length,
    `${label}: duplicate value detected`,
  );
}

function byId(items, label) {
  assertUnique(
    items.map((item) => item.id),
    `${label} IDs`,
  );
  return new Map(items.map((item) => [item.id, item]));
}

function formatAjvErrors(errors = []) {
  return errors
    .map(
      (error) =>
        `${error.instancePath || "/"} ${error.message}${error.params?.additionalProperty ? ` (${error.params.additionalProperty})` : ""}`,
    )
    .join("; ");
}

async function createSchemaValidator() {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const schemaDirectory = absolute("schemas");
  const schemaFiles = (await readdir(schemaDirectory))
    .filter((name) => name.endsWith(".schema.json"))
    .sort();

  for (const fileName of schemaFiles) {
    const relativePath = `schemas/${fileName}`;
    const schema = await readJson(relativePath);
    assert(
      typeof schema.$id === "string",
      `${relativePath}: schema must declare $id`,
    );
    ajv.addSchema(schema);
    state.schemas.set(fileName, schema.$id);
  }

  for (const [fileName, schemaId] of state.schemas) {
    assert(
      Boolean(ajv.getSchema(schemaId)),
      `schemas/${fileName}: could not compile schema`,
    );
  }

  return ajv;
}

function validateRecord(ajv, schemaFile, record, label) {
  const schemaId = state.schemas.get(schemaFile);
  assert(Boolean(schemaId), `Missing schema ${schemaFile}`);
  const validate = ajv.getSchema(schemaId);
  const isValid = validate(record);
  assert(
    isValid,
    `${label}: ${isValid ? "" : formatAjvErrors(validate.errors)}`,
  );
}

function assertSameValues(actual, expected, label) {
  const actualValues = [...actual].sort();
  const expectedValues = [...expected].sort();
  assert(
    deepEqual(actualValues, expectedValues),
    `${label}: expected ${expectedValues.join(", ")}; received ${actualValues.join(", ")}`,
  );
}

function assertProperSubset(values, universe, label) {
  const valueSet = new Set(values);
  for (const value of valueSet) {
    assert(
      universe.has(value),
      `${label}: ${value} is outside the workflow family`,
    );
  }
  assert(
    valueSet.size < universe.size,
    `${label}: must be a domain-specific subset, not the entire workflow family`,
  );
}

function assertBidirectional(
  leftItems,
  leftField,
  rightIndex,
  rightField,
  label,
) {
  for (const left of leftItems) {
    for (const rightId of left[leftField]) {
      const right = rightIndex.get(rightId);
      assert(Boolean(right), `${label}: ${rightId} does not resolve`);
      assert(
        right[rightField].includes(left.id),
        `${label}: ${left.id} -> ${rightId} is missing reciprocal ${rightField}`,
      );
    }
  }
}

async function validateCanonicalOntology() {
  const registryNames = [
    "workflows",
    "roles",
    "records",
    "decisions",
    "exceptions",
    "overlays",
  ];
  const documents = Object.fromEntries(
    await Promise.all(
      registryNames.map(async (name) => [
        name,
        await readJson(`workflow-model/${name}.json`),
      ]),
    ),
  );
  const collections = Object.fromEntries(
    registryNames.map((name) => [name, documents[name][name]]),
  );
  const indexes = Object.fromEntries(
    registryNames.map((name) => [name, byId(collections[name], name)]),
  );
  const evidence = await readJson("source/evidence.json");
  const evidenceIndex = byId(evidence.claims, "ontology evidence");
  const expectedEvidenceIds = Array.from(
    { length: 12 },
    (_, index) => `EVD-${String(index + 1).padStart(3, "0")}`,
  );
  const expectedWorkflowIds = Array.from(
    { length: 10 },
    (_, index) => `WF-${String(index + 1).padStart(3, "0")}`,
  );
  const expectedOverlayCoverage = new Map([
    ["OVL-001", expectedWorkflowIds],
    ["OVL-002", expectedWorkflowIds],
    ["OVL-003", expectedWorkflowIds],
    ["OVL-004", expectedWorkflowIds],
    ["OVL-005", expectedWorkflowIds],
    [
      "OVL-006",
      expectedWorkflowIds
        .slice(0, 9)
        .filter((workflowId) => workflowId !== "WF-004"),
    ],
    ["OVL-007", expectedWorkflowIds],
    ["OVL-008", ["WF-004", "WF-005", "WF-006", "WF-009", "WF-010"]],
    [
      "OVL-009",
      [
        "WF-001",
        "WF-002",
        "WF-003",
        "WF-006",
        "WF-007",
        "WF-008",
        "WF-009",
        "WF-010",
      ],
    ],
  ]);

  assertSameValues(
    evidenceIndex.keys(),
    expectedEvidenceIds,
    "canonical evidence IDs",
  );
  assertSameValues(
    indexes.workflows.keys(),
    expectedWorkflowIds,
    "canonical workflow families",
  );
  assertSameValues(
    indexes.overlays.keys(),
    expectedOverlayCoverage.keys(),
    "required ontology overlays",
  );
  assertSameValues(
    Object.keys(documents.workflows),
    ["schema_version", "source_document", "adjudication", "workflows"],
    "workflow-model/workflows.json top-level keys",
  );
  for (const name of registryNames.filter((name) => name !== "workflows")) {
    assertSameValues(
      Object.keys(documents[name]),
      ["schema_version", name],
      `workflow-model/${name}.json top-level keys`,
    );
  }
  assert(
    documents.workflows.source_document ===
      "source/Vineyard-Workflow-Discovery-report.md",
    "workflow-model/workflows.json: source_document must identify the canonical discovery report",
  );
  assert(
    documents.workflows.adjudication === "workflow-model/adjudication.md",
    "workflow-model/workflows.json: adjudication must identify the canonical adjudication record",
  );

  const source = await readText(documents.workflows.source_document);
  const usedEvidenceIds = new Set();
  for (const name of registryNames) {
    for (const item of collections[name]) {
      for (const evidenceId of item.evidence_ids) {
        usedEvidenceIds.add(evidenceId);
        assert(
          evidenceIndex.has(evidenceId),
          `${name}/${item.id}: evidence ${evidenceId} does not resolve`,
        );
      }
      for (const anchor of item.source_anchors) {
        assert(
          source.includes(anchor),
          `${name}/${item.id}: source anchor is not an exact discovery-report substring (${anchor})`,
        );
      }
    }
  }
  assertSameValues(
    usedEvidenceIds,
    expectedEvidenceIds,
    "canonical ontology evidence coverage",
  );

  const recordNameIndex = new Map();
  for (const record of collections.records) {
    assert(
      !recordNameIndex.has(record.name),
      `records: duplicate canonical record name ${record.name}`,
    );
    recordNameIndex.set(record.name, record);
  }

  for (const role of collections.roles) {
    assertReferenceList(
      role.workflow_ids,
      indexes.workflows,
      `${role.id}.workflow_ids`,
    );
    assertReferenceList(
      role.decision_ids,
      indexes.decisions,
      `${role.id}.decision_ids`,
    );
    assertReferenceList(
      role.record_ids,
      indexes.records,
      `${role.id}.record_ids`,
    );
    assertReferenceList(
      role.exception_ids,
      indexes.exceptions,
      `${role.id}.exception_ids`,
    );
  }

  const lifecycleEntryStates = new Set([
    "draft",
    "drafted",
    "pending",
    "planned",
    "open",
    "initiated",
    "scheduled",
    "proposed",
    "observed",
    "required",
    "requested",
  ]);
  const lifecycleDispositionStates = new Set([
    "verified",
    "validated",
    "completed",
    "complete",
    "accepted",
    "settled",
    "closed",
    "superseded",
    "archived",
    "rejected",
    "expired",
    "historical",
    "corrected",
  ]);
  const lifecycleSignatures = new Set();
  for (const record of collections.records) {
    assertReferenceList(
      record.workflow_ids,
      indexes.workflows,
      `${record.id}.workflow_ids`,
    );
    assertReferenceList(
      record.responsible_roles,
      indexes.roles,
      `${record.id}.responsible_roles`,
    );
    assertReferenceList(
      record.decision_ids,
      indexes.decisions,
      `${record.id}.decision_ids`,
    );
    assertReferenceList(
      record.exception_ids,
      indexes.exceptions,
      `${record.id}.exception_ids`,
    );
    lifecycleSignatures.add(record.lifecycle.join(">"));
    assert(
      lifecycleEntryStates.has(record.lifecycle[0]),
      `${record.id}: lifecycle must start with an appropriate creation, observation, request, or open state`,
    );
    assert(
      record.lifecycle.some((stateName) =>
        lifecycleDispositionStates.has(stateName),
      ),
      `${record.id}: lifecycle has no verification or disposition state`,
    );
    for (const stateName of ["corrected", "superseded", "archived"]) {
      const stateIndex = record.lifecycle.indexOf(stateName);
      if (stateIndex >= 0)
        assert(
          stateIndex > 0,
          `${record.id}: ${stateName} cannot precede the record's captured history`,
        );
    }
    assertReferenceList(
      record.related_records,
      indexes.records,
      `${record.id}.related_records`,
    );
    assert(
      !record.related_records.includes(record.id),
      `${record.id}: related_records cannot contain itself`,
    );
  }
  assert(
    lifecycleSignatures.size >= 8,
    `Canonical records expose only ${lifecycleSignatures.size} distinct lifecycle signatures; at least 8 meaningful lifecycles are required`,
  );

  for (const decision of collections.decisions) {
    const workflow = indexes.workflows.get(decision.workflow_id);
    assert(Boolean(workflow), `${decision.id}: workflow does not resolve`);
    assert(
      indexes.roles.has(decision.owner),
      `${decision.id}: owner ${decision.owner} does not resolve`,
    );
    assertReferenceList(
      decision.role_ids,
      indexes.roles,
      `${decision.id}.role_ids`,
    );
    assert(
      decision.role_ids.includes(decision.owner),
      `${decision.id}: role_ids must include the accountable owner`,
    );
    assertReferenceList(
      decision.record_ids,
      indexes.records,
      `${decision.id}.record_ids`,
    );
    assertReferenceList(
      decision.exception_ids,
      indexes.exceptions,
      `${decision.id}.exception_ids`,
    );
    const consultedRecordIds = new Set();
    for (const recordName of decision.records_consulted) {
      assert(
        recordNameIndex.has(recordName),
        `${decision.id}: consulted record ${recordName} does not resolve`,
      );
      consultedRecordIds.add(recordNameIndex.get(recordName).id);
    }
    const producedRecordIds = new Set();
    for (const recordName of decision.records_produced) {
      assert(
        recordNameIndex.has(recordName),
        `${decision.id}: produced record ${recordName} does not resolve`,
      );
      producedRecordIds.add(recordNameIndex.get(recordName).id);
    }
    const workflowRecordIds = new Set(
      collections.records
        .filter((record) => record.workflow_ids.includes(decision.workflow_id))
        .map((record) => record.id),
    );
    const workflowExceptionIds = new Set(
      collections.exceptions
        .filter((exception) =>
          exception.workflow_ids.includes(decision.workflow_id),
        )
        .map((exception) => exception.id),
    );
    for (const recordId of decision.record_ids) {
      assert(
        consultedRecordIds.has(recordId) || producedRecordIds.has(recordId),
        `${decision.id}: record ${recordId} is neither consulted nor produced`,
      );
      if (!workflowRecordIds.has(recordId)) {
        assert(
          consultedRecordIds.has(recordId) && !producedRecordIds.has(recordId),
          `${decision.id}: cross-workflow record ${recordId} must be read-only`,
        );
      }
    }
    for (const recordId of producedRecordIds) {
      assert(
        workflowRecordIds.has(recordId),
        `${decision.id}: produced record ${recordId} is outside the workflow family`,
      );
    }
    const localDecisionRecordIds = decision.record_ids.filter((recordId) =>
      workflowRecordIds.has(recordId),
    );
    if (workflowRecordIds.size > 1) {
      assertProperSubset(
        localDecisionRecordIds,
        workflowRecordIds,
        `${decision.id}.record_ids`,
      );
    }
    if (workflowExceptionIds.size > 1) {
      assertProperSubset(
        decision.exception_ids,
        workflowExceptionIds,
        `${decision.id}.exception_ids`,
      );
    }
  }

  for (const exception of collections.exceptions) {
    assert(
      exception.workflow_ids.length === 1,
      `${exception.id}: exception must have one domain-specific workflow family`,
    );
    const workflow = indexes.workflows.get(exception.workflow_ids[0]);
    assert(Boolean(workflow), `${exception.id}: workflow does not resolve`);
    assert(
      indexes.roles.has(exception.accountable_owner),
      `${exception.id}: accountable owner does not resolve`,
    );
    assertReferenceList(
      exception.escalation_roles,
      indexes.roles,
      `${exception.id}.escalation_roles`,
    );
    assertReferenceList(
      exception.role_ids,
      indexes.roles,
      `${exception.id}.role_ids`,
    );
    assert(
      exception.role_ids.includes(exception.accountable_owner),
      `${exception.id}: role_ids must include the accountable owner`,
    );
    for (const roleId of exception.escalation_roles) {
      assert(
        exception.role_ids.includes(roleId),
        `${exception.id}: role_ids must include escalation role ${roleId}`,
      );
    }
    assertReferenceList(
      exception.decisions,
      indexes.decisions,
      `${exception.id}.decisions`,
    );
    assertReferenceList(
      exception.record_ids,
      indexes.records,
      `${exception.id}.record_ids`,
    );
    for (const stateName of [
      ...exception.interrupted_states,
      ...exception.recovery_states,
    ]) {
      assert(
        workflow.states.includes(stateName),
        `${exception.id}: state ${stateName} is outside ${workflow.id}`,
      );
    }
    const requiredExceptionRecordIds = new Set();
    for (const recordName of exception.required_records) {
      assert(
        recordNameIndex.has(recordName),
        `${exception.id}: required record ${recordName} does not resolve`,
      );
      requiredExceptionRecordIds.add(recordNameIndex.get(recordName).id);
    }
    const workflowDecisionIds = new Set(
      collections.decisions
        .filter((decision) => decision.workflow_id === workflow.id)
        .map((decision) => decision.id),
    );
    const workflowRecordIds = new Set(
      collections.records
        .filter((record) => record.workflow_ids.includes(workflow.id))
        .map((record) => record.id),
    );
    if (workflowDecisionIds.size > 1) {
      assertProperSubset(
        exception.decisions,
        workflowDecisionIds,
        `${exception.id}.decisions`,
      );
    }
    for (const recordId of exception.record_ids) {
      assert(
        requiredExceptionRecordIds.has(recordId),
        `${exception.id}: linked record ${recordId} is not required by the recovery contract`,
      );
    }
    const localExceptionRecordIds = exception.record_ids.filter((recordId) =>
      workflowRecordIds.has(recordId),
    );
    if (workflowRecordIds.size > 1) {
      assertProperSubset(
        localExceptionRecordIds,
        workflowRecordIds,
        `${exception.id}.record_ids`,
      );
    }
  }

  for (const overlay of collections.overlays) {
    assertSameValues(
      overlay.applies_to,
      expectedOverlayCoverage.get(overlay.id),
      `${overlay.id}.applies_to`,
    );
    assertReferenceList(
      overlay.role_ids,
      indexes.roles,
      `${overlay.id}.role_ids`,
    );
    assertReferenceList(
      overlay.decision_ids,
      indexes.decisions,
      `${overlay.id}.decision_ids`,
    );
    assertReferenceList(
      overlay.record_ids,
      indexes.records,
      `${overlay.id}.record_ids`,
    );
    assertReferenceList(
      overlay.required_records,
      indexes.records,
      `${overlay.id}.required_records`,
    );
    assertSameValues(
      overlay.required_records,
      overlay.record_ids,
      `${overlay.id}: required_records and record_ids must describe the same canonical records`,
    );
    assertReferenceList(
      overlay.exception_ids,
      indexes.exceptions,
      `${overlay.id}.exception_ids`,
    );
  }

  assertBidirectional(
    collections.roles,
    "workflow_ids",
    indexes.workflows,
    "roles",
    "role/workflow relation",
  );
  assertBidirectional(
    collections.workflows,
    "roles",
    indexes.roles,
    "workflow_ids",
    "workflow/role relation",
  );
  assertBidirectional(
    collections.roles,
    "decision_ids",
    indexes.decisions,
    "role_ids",
    "role/decision relation",
  );
  assertBidirectional(
    collections.decisions,
    "role_ids",
    indexes.roles,
    "decision_ids",
    "decision/role relation",
  );
  assertBidirectional(
    collections.roles,
    "record_ids",
    indexes.records,
    "responsible_roles",
    "role/record relation",
  );
  assertBidirectional(
    collections.records,
    "responsible_roles",
    indexes.roles,
    "record_ids",
    "record/role relation",
  );
  assertBidirectional(
    collections.roles,
    "exception_ids",
    indexes.exceptions,
    "role_ids",
    "role/exception relation",
  );
  assertBidirectional(
    collections.exceptions,
    "role_ids",
    indexes.roles,
    "exception_ids",
    "exception/role relation",
  );
  assertBidirectional(
    collections.records,
    "decision_ids",
    indexes.decisions,
    "record_ids",
    "record/decision relation",
  );
  assertBidirectional(
    collections.decisions,
    "record_ids",
    indexes.records,
    "decision_ids",
    "decision/record relation",
  );
  assertBidirectional(
    collections.records,
    "exception_ids",
    indexes.exceptions,
    "record_ids",
    "record/exception relation",
  );
  assertBidirectional(
    collections.exceptions,
    "record_ids",
    indexes.records,
    "exception_ids",
    "exception/record relation",
  );
  assertBidirectional(
    collections.decisions,
    "exception_ids",
    indexes.exceptions,
    "decisions",
    "decision/exception relation",
  );
  assertBidirectional(
    collections.exceptions,
    "decisions",
    indexes.decisions,
    "exception_ids",
    "exception/decision relation",
  );

  for (const workflow of collections.workflows) {
    const stateSet = new Set(workflow.states);
    const transitionIndex = byId(
      workflow.transitions,
      `${workflow.id} transitions`,
    );
    const canonicalDecisions = collections.decisions.filter(
      (decision) => decision.workflow_id === workflow.id,
    );
    const canonicalExceptions = collections.exceptions.filter((exception) =>
      exception.workflow_ids.includes(workflow.id),
    );
    const canonicalDecisionIndex = new Map(
      canonicalDecisions.map((decision) => [decision.id, decision]),
    );
    const canonicalExceptionIndex = new Map(
      canonicalExceptions.map((exception) => [exception.id, exception]),
    );
    const workflowRecordIds = new Set(
      collections.records
        .filter((record) => record.workflow_ids.includes(workflow.id))
        .map((record) => record.id),
    );

    assertUnique(
      workflow.transitions.map((transition) =>
        JSON.stringify([
          transition.from,
          transition.to,
          transition.kind,
          [...transition.decision_ids].sort(),
          [...transition.exception_ids].sort(),
        ]),
      ),
      `${workflow.id} semantic transition edges`,
    );
    assertReferenceList(
      workflow.terminal_states,
      new Map(workflow.states.map((stateName) => [stateName, true])),
      `${workflow.id}.terminal_states`,
    );

    const adjacency = new Map(
      workflow.states.map((stateName) => [stateName, new Set()]),
    );
    const reverseAdjacency = new Map(
      workflow.states.map((stateName) => [stateName, new Set()]),
    );
    const entryStates = new Set();
    for (const transition of transitionIndex.values()) {
      assert(
        transition.id.startsWith(`TRN-${workflow.id}-`),
        `${transition.id}: transition ID must be namespaced to ${workflow.id}`,
      );
      assert(
        stateSet.has(transition.to),
        `${transition.id}: destination ${transition.to} is outside ${workflow.id}`,
      );
      if (transition.from === null) {
        entryStates.add(transition.to);
      } else {
        assert(
          stateSet.has(transition.from),
          `${transition.id}: source ${transition.from} is outside ${workflow.id}`,
        );
        adjacency.get(transition.from).add(transition.to);
        reverseAdjacency.get(transition.to).add(transition.from);
      }
      assert(
        workflow.roles.includes(transition.owner),
        `${transition.id}: owner ${transition.owner} is outside ${workflow.id}`,
      );
      assertReferenceList(
        transition.record_reads,
        indexes.records,
        `${transition.id}.record_reads`,
      );
      assertReferenceList(
        transition.record_writes,
        indexes.records,
        `${transition.id}.record_writes`,
      );
      for (const recordId of transition.record_writes) {
        assert(
          workflowRecordIds.has(recordId),
          `${transition.id}: write ${recordId} is outside ${workflow.id}; cross-workflow access is read-only`,
        );
      }
      for (const evidenceId of transition.evidence_ids) {
        assert(
          evidenceIndex.has(evidenceId),
          `${transition.id}: evidence ${evidenceId} does not resolve`,
        );
        assert(
          workflow.evidence_ids.includes(evidenceId),
          `${transition.id}: evidence ${evidenceId} is outside ${workflow.id}`,
        );
      }
      for (const decisionId of transition.decision_ids) {
        assert(
          canonicalDecisionIndex.has(decisionId),
          `${transition.id}: decision ${decisionId} is outside ${workflow.id}`,
        );
      }
      for (const exceptionId of transition.exception_ids) {
        assert(
          canonicalExceptionIndex.has(exceptionId),
          `${transition.id}: exception ${exceptionId} is outside ${workflow.id}`,
        );
      }
      if (transition.decision_outcome !== undefined) {
        assert(
          transition.decision_ids.some((decisionId) =>
            canonicalDecisionIndex
              .get(decisionId)
              .outcomes.includes(transition.decision_outcome),
          ),
          `${transition.id}: decision_outcome is not declared by a referenced decision`,
        );
      }
    }
    assert(entryStates.size > 0, `${workflow.id}: no entry transition exists`);

    const reachable = new Set(entryStates);
    const forwardQueue = [...entryStates];
    while (forwardQueue.length > 0) {
      const current = forwardQueue.shift();
      for (const next of adjacency.get(current)) {
        if (!reachable.has(next)) {
          reachable.add(next);
          forwardQueue.push(next);
        }
      }
    }
    assertSameValues(reachable, stateSet, `${workflow.id} reachable states`);

    const canReachDisposition = new Set(workflow.terminal_states);
    const reverseQueue = [...workflow.terminal_states];
    while (reverseQueue.length > 0) {
      const current = reverseQueue.shift();
      for (const previous of reverseAdjacency.get(current)) {
        if (!canReachDisposition.has(previous)) {
          canReachDisposition.add(previous);
          reverseQueue.push(previous);
        }
      }
    }
    assertSameValues(
      canReachDisposition,
      stateSet,
      `${workflow.id} states with a path to a terminal disposition`,
    );

    workflow.steps.forEach((step, index) => {
      assert(
        step.order === index + 1,
        `${workflow.id}: primary step orders must be contiguous from 1`,
      );
      if (step.state_from !== null) {
        assert(
          stateSet.has(step.state_from),
          `${workflow.id} step ${step.order}: source state is undeclared`,
        );
      }
      assert(
        stateSet.has(step.state_to),
        `${workflow.id} step ${step.order}: destination state is undeclared`,
      );
      if (index > 0) {
        assert(
          step.state_from === workflow.steps[index - 1].state_to,
          `${workflow.id} step ${step.order}: primary chain is discontinuous`,
        );
      }
      const matchingTransitions = workflow.transitions.filter(
        (transition) =>
          transition.from === step.state_from &&
          transition.to === step.state_to &&
          transition.kind === step.stage &&
          transition.owner === step.owner &&
          deepEqual(
            [...transition.decision_ids].sort(),
            [...(step.decision_ids ?? [])].sort(),
          ) &&
          transition.exception_ids.length === 0,
      );
      assert(
        matchingTransitions.length === 1,
        `${workflow.id} step ${step.order}: expected one exact canonical transition`,
      );
    });

    assertSameValues(
      workflow.decisions.map((decision) => decision.id),
      canonicalDecisionIndex.keys(),
      `${workflow.id} canonical decisions`,
    );
    for (const nestedDecision of workflow.decisions) {
      const canonicalDecision = canonicalDecisionIndex.get(nestedDecision.id);
      assert(
        deepEqual(nestedDecision, {
          id: canonicalDecision.id,
          question: canonicalDecision.question,
          owner: canonicalDecision.owner,
          outcomes: canonicalDecision.outcomes,
        }),
        `${workflow.id}: embedded decision ${nestedDecision.id} differs from the canonical registry`,
      );
    }
    for (const decision of canonicalDecisions) {
      const matchingTransitions = workflow.transitions.filter((transition) =>
        transition.decision_ids.includes(decision.id),
      );
      assert(
        matchingTransitions.length > 0,
        `${decision.id}: no explicit ${workflow.id} transition references the decision`,
      );
      for (const context of decision.transition_context) {
        const match = context.match(/^(.+?) -> ([a-z][a-z0-9_]*)$/u);
        if (match) {
          const from = match[1] === "entry" ? null : match[1];
          assert(
            matchingTransitions.some(
              (transition) =>
                transition.from === from && transition.to === match[2],
            ),
            `${decision.id}: transition_context ${context} has no explicit edge`,
          );
        } else {
          assert(
            context === "Exception or recovery branch; see exception registry.",
            `${decision.id}: unsupported transition_context ${context}`,
          );
          assert(
            matchingTransitions.some((transition) =>
              ["exception", "recovery"].includes(transition.kind),
            ),
            `${decision.id}: exception context has no exception or recovery transition`,
          );
        }
      }
    }

    const exceptionRelationshipSignatures = [];
    for (const exception of canonicalExceptions) {
      const matchingTransitions = workflow.transitions.filter((transition) =>
        transition.exception_ids.includes(exception.id),
      );
      assert(
        matchingTransitions.length > 0,
        `${exception.id}: no explicit ${workflow.id} transition references the exception`,
      );
      for (const interruptedState of exception.interrupted_states) {
        assert(
          matchingTransitions.some(
            (transition) => transition.from === interruptedState,
          ),
          `${exception.id}: interrupted state ${interruptedState} has no explicit exception edge`,
        );
      }
      for (const recoveryState of exception.recovery_states) {
        assert(
          matchingTransitions.some(
            (transition) => transition.to === recoveryState,
          ),
          `${exception.id}: recovery state ${recoveryState} has no explicit recovery edge`,
        );
      }
      exceptionRelationshipSignatures.push(
        JSON.stringify([
          [...exception.interrupted_states].sort(),
          [...exception.recovery_states].sort(),
          [...exception.decisions].sort(),
          [...exception.role_ids].sort(),
          [...exception.record_ids].sort(),
        ]),
      );
    }
    assertUnique(
      exceptionRelationshipSignatures,
      `${workflow.id} exception relationship signatures`,
    );

    for (const recordName of workflow.records) {
      const record = recordNameIndex.get(recordName);
      assert(
        record?.workflow_ids.includes(workflow.id),
        `${workflow.id}: record ${recordName} does not resolve back to the workflow`,
      );
    }
    for (const record of collections.records.filter((candidate) =>
      candidate.workflow_ids.includes(workflow.id),
    )) {
      assert(
        workflow.records.includes(record.name),
        `${record.id}: ${workflow.id} is missing record ${record.name}`,
      );
    }
    for (const exceptionName of workflow.exceptions) {
      assert(
        canonicalExceptions.some(
          (exception) => exception.name === exceptionName,
        ),
        `${workflow.id}: exception ${exceptionName} lacks a canonical record`,
      );
    }
    for (const exception of canonicalExceptions) {
      assert(
        workflow.exceptions.includes(exception.name),
        `${exception.id}: ${workflow.id} is missing exception ${exception.name}`,
      );
    }
  }

  return `${collections.workflows.length} workflows, ${collections.roles.length} roles, ${collections.records.length} records, ${collections.decisions.length} decisions, ${collections.exceptions.length} exceptions, and ${collections.overlays.length} overlays with explicit reachable state graphs`;
}

async function validateSchemas() {
  const ajv = await createSchemaValidator();
  const registries = [
    [
      "workflow-model/workflows.json",
      "workflows",
      "canonical-workflow.schema.json",
    ],
    ["workflow-model/roles.json", "roles", "role.schema.json"],
    ["workflow-model/records.json", "records", "record.schema.json"],
    ["workflow-model/decisions.json", "decisions", "decision.schema.json"],
    ["workflow-model/exceptions.json", "exceptions", "exception.schema.json"],
    ["workflow-model/overlays.json", "overlays", "overlay.schema.json"],
    ["workflow-model/walking-slice.json", "workflows", "workflow.schema.json"],
    ["scenarios/walking-slice.json", "scenarios", "scenario.schema.json"],
    ["data/walking-slice.json", "fixtures", "fixture.schema.json"],
    ["screens/walking-slice.json", "screens", "screen.schema.json"],
    ["source/bibliography.json", "entries", "bibliography.schema.json"],
    ["source/evidence.json", "claims", "evidence-claim.schema.json"],
    [
      "design-system/walking-slice-components.json",
      "components",
      "component.schema.json",
    ],
    [
      "construction-packets/walking-slice.json",
      "packets",
      "construction-packet.schema.json",
    ],
    ["control/trace-nodes.json", "nodes", "trace-node.schema.json"],
    ["control/trace-edges.json", "edges", "trace-edge.schema.json"],
  ];

  for (const [relativePath, key, schemaFile] of registries) {
    const document = await readJson(relativePath);
    assert(
      document.schema_version === "1.0",
      `${relativePath}: unsupported schema_version`,
    );
    assert(
      Array.isArray(document[key]) && document[key].length > 0,
      `${relativePath}: ${key} must be a non-empty array`,
    );
    document[key].forEach((record, index) =>
      validateRecord(
        ajv,
        schemaFile,
        record,
        `${relativePath}#/${key}/${index}`,
      ),
    );
  }

  const operation = await readJson("data/operation.json");
  const eventDocument = await readJson("data/events.json");
  const exceptionDocument = await readJson("data/exceptions.json");
  validateRecord(
    ajv,
    "operation.schema.json",
    operation,
    "data/operation.json",
  );
  validateRecord(ajv, "events.schema.json", eventDocument, "data/events.json");
  assert(
    exceptionDocument.schema_version === "1.0",
    "data/exceptions.json: unsupported schema_version",
  );
  assert(
    typeof exceptionDocument.operation_id === "string" &&
      exceptionDocument.operation_id.length > 0,
    "data/exceptions.json: operation_id is required",
  );
  assert(
    Number.isFinite(Date.parse(exceptionDocument.generated_at)),
    "data/exceptions.json: generated_at must be an ISO timestamp",
  );
  assert(
    Array.isArray(exceptionDocument.histories) &&
      exceptionDocument.histories.length > 0,
    "data/exceptions.json: histories must be a non-empty array",
  );
  exceptionDocument.histories.forEach((history, index) =>
    validateRecord(
      ajv,
      "exception-history.schema.json",
      history,
      `data/exceptions.json#/histories/${index}`,
    ),
  );

  validateRecord(
    ajv,
    "task-registry.schema.json",
    await readYaml("control/TASK_REGISTRY.yaml"),
    "control/TASK_REGISTRY.yaml",
  );
  validateRecord(
    ajv,
    "project-state.schema.json",
    await readYaml("control/PROJECT_STATE.yaml"),
    "control/PROJECT_STATE.yaml",
  );
  validateRecord(
    ajv,
    "manifest.schema.json",
    await readYaml("control/MASTER_MANIFEST.yaml"),
    "control/MASTER_MANIFEST.yaml",
  );
  validateRecord(
    ajv,
    "findings.schema.json",
    await readYaml("validation/FINDINGS.yaml"),
    "validation/FINDINGS.yaml",
  );
  validateRecord(
    ajv,
    "gate-results.schema.json",
    await readJson("validation/gate-results.json"),
    "validation/gate-results.json",
  );
  validateRecord(
    ajv,
    "dod-matrix.schema.json",
    await readYaml("control/DOD_MATRIX.yaml"),
    "control/DOD_MATRIX.yaml",
  );

  const ontologySummary = await validateCanonicalOntology();

  return `compiled ${state.schemas.size} schemas and validated ${registries.length + 9} registries; ${ontologySummary}`;
}

async function validateEvidence() {
  const bibliography = await readJson("source/bibliography.json");
  const evidence = await readJson("source/evidence.json");
  const bibliographyIndex = byId(bibliography.entries, "bibliography");
  const evidenceIndex = byId(evidence.claims, "evidence claim");
  assertUnique(
    bibliography.entries.map((entry) => entry.url),
    "bibliography URLs",
  );

  const source = await readText(evidence.source_document.path);
  const headings = new Set(
    source
      .split(/\r?\n/)
      .map((line) => line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/)?.[1].trim())
      .filter(Boolean),
  );
  const expectedWorkflowIds = Array.from(
    { length: 10 },
    (_, index) => `WF-${String(index + 1).padStart(3, "0")}`,
  );
  const coveredWorkflowIds = new Set();
  const referencedBibliographyIds = new Set();

  for (const claim of evidence.claims) {
    assert(
      headings.has(claim.source_anchor.section_heading),
      `${claim.id}: source section heading does not resolve`,
    );
    assert(
      source.includes(claim.source_anchor.anchor_text),
      `${claim.id}: source anchor text does not resolve`,
    );
    for (const citationHandle of claim.source_citation_handles)
      assert(
        source.includes(citationHandle),
        `${claim.id}: opaque source handle ${citationHandle} is absent from the provenance report`,
      );
    assertReferenceList(
      claim.public_source_ids,
      bibliographyIndex,
      `${claim.id}.public_source_ids`,
    );
    for (const bibliographyId of claim.public_source_ids)
      referencedBibliographyIds.add(bibliographyId);
    for (const workflowId of claim.workflow_ids) {
      assert(
        expectedWorkflowIds.includes(workflowId),
        `${claim.id}: workflow ${workflowId} is outside the approved ten-family taxonomy`,
      );
      coveredWorkflowIds.add(workflowId);
    }
  }

  assert(
    expectedWorkflowIds.every((workflowId) =>
      coveredWorkflowIds.has(workflowId),
    ),
    "Normalized evidence does not cover all ten canonical workflow families",
  );
  assert(
    bibliography.entries.every((entry) =>
      referencedBibliographyIds.has(entry.id),
    ),
    "Public bibliography contains an unreferenced source",
  );
  assert(evidenceIndex.size > 0, "Evidence index is empty");

  return `validated ${evidence.claims.length} source claims, ${bibliography.entries.length} unique public sources, report anchors, provenance handles, and ten-family coverage`;
}

function containsJsonId(value, targetId) {
  if (Array.isArray(value))
    return value.some((item) => containsJsonId(item, targetId));
  if (!value || typeof value !== "object") return false;
  if (value.id === targetId) return true;
  return Object.values(value).some((item) => containsJsonId(item, targetId));
}

async function assertNodeLocator(node) {
  await access(absolute(node.path));
  if (node.locator.kind === "heading") {
    const source = await readText(node.path);
    assert(
      source.split(/\r?\n/).some((line) => {
        const match = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
        return match?.[1].trim() === node.locator.value;
      }),
      `${node.id}: heading locator not found in ${node.path}`,
    );
    return;
  }
  const document = await readJson(node.path);
  assert(
    containsJsonId(document, node.locator.value),
    `${node.id}: JSON ID locator ${node.locator.value} not found in ${node.path}`,
  );
}

function manifestFromNodes(nodes) {
  return {
    schema_version: "1.0",
    generated_from: "control/trace-nodes.json",
    artifact_count: nodes.length,
    artifacts: nodes.map((node) => ({
      id: node.id,
      type: node.type,
      title: node.title,
      path: node.path,
      locator: `${node.locator.kind}:${node.locator.value}`,
      status: node.status,
    })),
  };
}

function deepEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function gitSucceeds(args) {
  try {
    execFileSync("git", args, { cwd: ROOT, stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function assertCommitProvenance(commit, artifactPaths, label) {
  assert(
    gitSucceeds(["cat-file", "-e", `${commit}^{commit}`]),
    `${label}: commit ${commit} does not resolve`,
  );
  assert(
    gitSucceeds(["merge-base", "--is-ancestor", commit, "HEAD"]),
    `${label}: commit ${commit} is not reachable from HEAD`,
  );
  for (const artifactPath of artifactPaths)
    assert(
      gitSucceeds(["cat-file", "-e", `${commit}:${artifactPath}`]),
      `${label}: ${artifactPath} did not exist at commit ${commit}`,
    );
}

function assertReferenceList(values, index, label) {
  for (const value of values) {
    assert(index.has(value), `${label}: unresolved reference ${value}`);
  }
}

async function validateTrace() {
  const nodeDocument = await readJson("control/trace-nodes.json");
  const edgeDocument = await readJson("control/trace-edges.json");
  const nodeIndex = byId(nodeDocument.nodes, "trace node");
  byId(edgeDocument.edges, "trace edge");
  assertUnique(
    edgeDocument.edges.map(
      (edge) => `${edge.relationship}:${edge.from}:${edge.to}`,
    ),
    "trace edge semantics",
  );

  await Promise.all(nodeDocument.nodes.map(assertNodeLocator));

  const registryDefinitions = [
    ["workflow", "workflow-model/workflows.json", "workflows"],
    ["scenario", "scenarios/scenarios.json", "scenarios"],
    ["fixture", "data/walking-slice.json", "fixtures"],
    ["fixture", "data/scenario-fixtures.json", "fixtures"],
    ["requirement", "product-structure/requirements.json", "requirements"],
    ["screen", "product-structure/screens.json", "screens"],
    [
      "component",
      "product-structure/component-requirements.json",
      "components",
    ],
    [
      "construction_packet",
      "construction-packets/walking-slice.json",
      "packets",
    ],
  ];
  const registries = new Map();
  const registryPaths = new Map();
  for (const [type, relativePath, key] of registryDefinitions) {
    const records = (await readJson(relativePath))[key];
    if (!registries.has(type)) registries.set(type, new Map());
    if (!registryPaths.has(type)) registryPaths.set(type, new Map());
    const registry = registries.get(type);
    const pathIndex = registryPaths.get(type);
    for (const record of records) {
      assert(!registry.has(record.id), `${type}: duplicate ${record.id}`);
      registry.set(record.id, record);
      pathIndex.set(record.id, relativePath);
      const node = nodeIndex.get(record.id);
      assert(Boolean(node), `${record.id}: missing trace node`);
      assert(
        node.type === type,
        `${record.id}: trace node type must be ${type}`,
      );
      assert(
        node.path === relativePath,
        `${record.id}: trace node path differs from canonical registry`,
      );
    }
  }
  for (const node of nodeDocument.nodes.filter(
    (candidate) => candidate.type !== "evidence",
  )) {
    const registry = registries.get(node.type);
    assert(
      registry?.has(node.id),
      `${node.id}: trace node has no canonical registry record`,
    );
    assert(
      node.path === registryPaths.get(node.type)?.get(node.id),
      `${node.id}: trace node points outside its canonical registry`,
    );
  }

  const expectedEdgeTypes = new Map([
    ["supports", ["evidence", "workflow"]],
    ["realized_by", ["workflow", "scenario"]],
    ["instantiated_by", ["scenario", "fixture"]],
    ["motivates", ["scenario", "requirement"]],
    ["rendered_by", ["fixture", "screen"]],
    ["implemented_by", ["requirement", "screen"]],
    ["composed_with", ["screen", "component"]],
    ["specified_by", ["component", "construction_packet"]],
  ]);
  const incoming = new Map(nodeDocument.nodes.map((node) => [node.id, 0]));
  const outgoing = new Map(nodeDocument.nodes.map((node) => [node.id, []]));
  const semanticEdges = new Set(
    edgeDocument.edges.map(
      (edge) => `${edge.relationship}:${edge.from}:${edge.to}`,
    ),
  );

  for (const edge of edgeDocument.edges) {
    assert(
      nodeIndex.has(edge.from),
      `${edge.id}: unresolved from node ${edge.from}`,
    );
    assert(nodeIndex.has(edge.to), `${edge.id}: unresolved to node ${edge.to}`);
    assert(edge.from !== edge.to, `${edge.id}: self edges are not allowed`);
    const expectedPair = expectedEdgeTypes.get(edge.relationship);
    assert(Boolean(expectedPair), `${edge.id}: unknown relationship`);
    const [expectedFrom, expectedTo] = expectedPair;
    assert(
      nodeIndex.get(edge.from).type === expectedFrom,
      `${edge.id}: ${edge.relationship} must start at ${expectedFrom}`,
    );
    assert(
      nodeIndex.get(edge.to).type === expectedTo,
      `${edge.id}: ${edge.relationship} must end at ${expectedTo}`,
    );
    incoming.set(edge.to, incoming.get(edge.to) + 1);
    outgoing.get(edge.from).push(edge.to);
  }

  const dod = await readYaml("control/DOD_MATRIX.yaml");
  const productTraceRequired =
    dod.criteria.find((criterion) => criterion.id === "G5")?.status ===
    "passed";
  for (const node of nodeDocument.nodes) {
    if (node.type !== "evidence")
      assert(
        incoming.get(node.id) > 0,
        `${node.id}: orphan node has no incoming trace edge`,
      );
    if (
      node.type !== "construction_packet" &&
      (node.type !== "component" || productTraceRequired)
    )
      assert(
        outgoing.get(node.id).length > 0,
        `${node.id}: orphan node has no outgoing trace edge`,
      );
  }

  const expectedTypes = [
    "evidence",
    "workflow",
    "scenario",
    "requirement",
    "screen",
    "component",
    "construction_packet",
  ];
  function hasCompleteChain(nodeId, typeIndex, visited) {
    const node = nodeIndex.get(nodeId);
    if (!node || node.type !== expectedTypes[typeIndex] || visited.has(nodeId))
      return false;
    if (typeIndex === expectedTypes.length - 1) return true;
    const nextVisited = new Set(visited).add(nodeId);
    return outgoing
      .get(nodeId)
      .some((nextId) => hasCompleteChain(nextId, typeIndex + 1, nextVisited));
  }
  const evidenceNodes = nodeDocument.nodes.filter(
    (node) => node.type === "evidence",
  );
  const completeEvidenceChains = evidenceNodes.filter((evidence) =>
    hasCompleteChain(evidence.id, 0, new Set()),
  );
  assert(
    completeEvidenceChains.length > 0,
    "Trace graph must retain at least one complete evidence-to-packet walking slice",
  );
  if (productTraceRequired)
    for (const evidence of evidenceNodes)
      assert(
        hasCompleteChain(evidence.id, 0, new Set()),
        `${evidence.id}: no complete evidence-to-packet chain`,
      );

  const evidenceIndex = new Map(
    evidenceNodes.map((evidence) => [evidence.id, evidence]),
  );
  const workflows = registries.get("workflow");
  const scenarios = registries.get("scenario");
  const fixtures = registries.get("fixture");
  const requirements = registries.get("requirement");
  const screens = registries.get("screen");
  const components = registries.get("component");
  const packets = registries.get("construction_packet");

  const requireEdge = (relationship, from, to, label) =>
    assert(
      semanticEdges.has(`${relationship}:${from}:${to}`),
      `${label}: missing ${relationship} trace edge ${from} -> ${to}`,
    );
  const transitionKey = (transition) => {
    const from = "from" in transition ? transition.from : transition.state_from;
    const to = "to" in transition ? transition.to : transition.state_to;
    return `${from ?? "null"}->${to}`;
  };

  for (const workflow of workflows.values()) {
    assertReferenceList(
      workflow.evidence_ids,
      evidenceIndex,
      `${workflow.id}.evidence_ids`,
    );
    assertUnique(workflow.states, `${workflow.id}.states`);
    assertUnique(
      workflow.steps.map((step) => step.order),
      `${workflow.id}.step order`,
    );
    for (const evidenceId of workflow.evidence_ids)
      requireEdge("supports", evidenceId, workflow.id, workflow.id);
  }

  for (const scenario of scenarios.values()) {
    assertReferenceList(
      scenario.workflow_ids,
      workflows,
      `${scenario.id}.workflow_ids`,
    );
    const supportedTransitions = new Set(
      scenario.workflow_ids.flatMap((workflowId) =>
        workflows.get(workflowId).transitions.map(transitionKey),
      ),
    );
    for (const transition of scenario.expected_transitions)
      assert(
        supportedTransitions.has(transitionKey(transition)),
        `${scenario.id}: transition ${transitionKey(transition)} is not defined by a referenced workflow`,
      );
    for (const workflowId of scenario.workflow_ids)
      requireEdge("realized_by", workflowId, scenario.id, scenario.id);
    assertReferenceList(
      scenario.synthetic_fixture_refs,
      fixtures,
      `${scenario.id}.synthetic_fixture_refs`,
    );
    for (const fixtureId of scenario.synthetic_fixture_refs)
      requireEdge("instantiated_by", scenario.id, fixtureId, scenario.id);
    assertReferenceList(
      scenario.requirement_ids,
      requirements,
      `${scenario.id}.requirement_ids`,
    );
    for (const requirementId of scenario.requirement_ids)
      requireEdge("motivates", scenario.id, requirementId, scenario.id);
  }

  for (const fixture of fixtures.values())
    if (fixture.workflow_id)
      assert(
        workflows.has(fixture.workflow_id),
        `${fixture.id}: unknown workflow ${fixture.workflow_id}`,
      );

  for (const requirement of requirements.values()) {
    assertReferenceList(
      requirement.workflow_ids,
      workflows,
      `${requirement.id}.workflow_ids`,
    );
    assertReferenceList(
      requirement.scenario_ids,
      scenarios,
      `${requirement.id}.scenario_ids`,
    );
    assertReferenceList(
      requirement.screen_ids,
      screens,
      `${requirement.id}.screen_ids`,
    );
    for (const scenarioId of requirement.scenario_ids)
      requireEdge("motivates", scenarioId, requirement.id, requirement.id);
    for (const screenId of requirement.screen_ids)
      requireEdge("implemented_by", requirement.id, screenId, requirement.id);
  }

  for (const screen of screens.values()) {
    assertReferenceList(
      screen.workflow_ids,
      workflows,
      `${screen.id}.workflow_ids`,
    );
    assertReferenceList(
      screen.scenario_ids,
      scenarios,
      `${screen.id}.scenario_ids`,
    );
    assertReferenceList(
      screen.fixture_ids,
      fixtures,
      `${screen.id}.fixture_ids`,
    );
    assertReferenceList(
      screen.component_ids,
      components,
      `${screen.id}.component_ids`,
    );
    assertReferenceList(
      screen.requirement_ids,
      requirements,
      `${screen.id}.requirement_ids`,
    );
    const screenStateIds = new Set(
      screen.states.map((screenState) => screenState.id),
    );
    assertUnique([...screenStateIds], `${screen.id}.states`);
    assertUnique(
      screen.actions.map((action) => action.id),
      `${screen.id}.actions`,
    );
    const supportedTransitions = new Set(
      screen.workflow_ids.flatMap((workflowId) =>
        workflows.get(workflowId).transitions.map(transitionKey),
      ),
    );
    for (const action of screen.actions.filter(
      (candidate) => candidate.transition,
    )) {
      assert(
        supportedTransitions.has(transitionKey(action.transition)),
        `${screen.id}/${action.id}: transition is not defined by a referenced workflow`,
      );
    }
    for (const requirementId of screen.requirement_ids)
      requireEdge("implemented_by", requirementId, screen.id, screen.id);
    for (const fixtureId of screen.fixture_ids)
      requireEdge("rendered_by", fixtureId, screen.id, screen.id);
  }

  for (const component of components.values()) {
    assertReferenceList(
      component.screen_ids,
      screens,
      `${component.id}.screen_ids`,
    );
    for (const screenId of component.screen_ids)
      requireEdge("composed_with", screenId, component.id, component.id);
  }

  const legacyScreens = byId(
    (await readJson("screens/walking-slice.json")).screens,
    "legacy walking-slice screen",
  );
  for (const packet of packets.values()) {
    assertReferenceList(
      packet.workflow_ids,
      workflows,
      `${packet.id}.workflow_ids`,
    );
    assertReferenceList(
      packet.scenario_ids,
      scenarios,
      `${packet.id}.scenario_ids`,
    );
    assertReferenceList(
      packet.fixture_ids,
      fixtures,
      `${packet.id}.fixture_ids`,
    );
    assertReferenceList(packet.screen_ids, screens, `${packet.id}.screen_ids`);
    assertReferenceList(
      packet.component_ids,
      components,
      `${packet.id}.component_ids`,
    );
    const actionIds = new Set(
      packet.screen_ids.flatMap((screenId) =>
        (legacyScreens.get(screenId) ?? screens.get(screenId)).actions.map(
          (action) => action.id,
        ),
      ),
    );
    for (const interaction of packet.interaction_contract)
      assert(
        actionIds.has(interaction.action_id),
        `${packet.id}: unknown screen action ${interaction.action_id}`,
      );
    for (const componentId of packet.component_ids)
      requireEdge("specified_by", componentId, packet.id, packet.id);
  }

  const manifest = await readYaml("control/MASTER_MANIFEST.yaml");
  assert(
    deepEqual(manifest, manifestFromNodes(nodeDocument.nodes)),
    "control/MASTER_MANIFEST.yaml has drifted from control/trace-nodes.json",
  );
  const recordCount = [...registries.values()].reduce(
    (total, registry) => total + registry.size,
    0,
  );
  return `validated all ${recordCount} canonical records, ${nodeDocument.nodes.length} nodes, ${edgeDocument.edges.length} semantic edges, ${completeEvidenceChains.length} complete evidence chains, and generated manifest parity`;
}

function dateValue(value, label) {
  const parsed = Date.parse(value);
  assert(Number.isFinite(parsed), `${label}: invalid timestamp ${value}`);
  return parsed;
}

async function validateData() {
  const fixtures = (await readJson("data/walking-slice.json")).fixtures;
  const workflowIndex = byId(
    (await readJson("workflow-model/workflows.json")).workflows,
    "workflow",
  );
  const scenarioIndex = byId(
    (await readJson("scenarios/walking-slice.json")).scenarios,
    "scenario",
  );
  let checkedEvents = 0;

  for (const fixture of fixtures) {
    const organizationIndex = byId(
      fixture.organizations,
      `${fixture.id} organization`,
    );
    const peopleIndex = byId(fixture.people, `${fixture.id} person`);
    const blockIndex = byId(fixture.blocks, `${fixture.id} block`);
    const observationIndex = byId(
      fixture.observations,
      `${fixture.id} observation`,
    );
    byId(fixture.work_orders, `${fixture.id} work order`);
    assertUnique(
      fixture.blocks.map((block) => block.stable_identity),
      `${fixture.id} stable block identities`,
    );
    assertReferenceList(
      fixture.scenario_ids,
      scenarioIndex,
      `${fixture.id}.scenario_ids`,
    );

    for (const person of fixture.people)
      assert(
        organizationIndex.has(person.organization_id),
        `${person.id}: unknown organization ${person.organization_id}`,
      );
    for (const block of fixture.blocks) {
      assert(
        organizationIndex.has(block.organization_id),
        `${block.id}: unknown organization ${block.organization_id}`,
      );
      assertUnique(
        block.aliases.map((alias) => `${alias.system}:${alias.value}`),
        `${block.id} aliases`,
      );
    }
    for (const observation of fixture.observations) {
      assert(
        blockIndex.has(observation.block_id),
        `${observation.id}: unknown block ${observation.block_id}`,
      );
      assert(
        peopleIndex.has(observation.observer_person_id),
        `${observation.id}: unknown observer ${observation.observer_person_id}`,
      );
    }

    for (const workOrder of fixture.work_orders) {
      assert(
        workflowIndex.has(workOrder.workflow_id),
        `${workOrder.id}: unknown workflow ${workOrder.workflow_id}`,
      );
      assert(
        scenarioIndex.has(workOrder.scenario_id),
        `${workOrder.id}: unknown scenario ${workOrder.scenario_id}`,
      );
      assert(
        fixture.scenario_ids.includes(workOrder.scenario_id),
        `${workOrder.id}: scenario is outside fixture coverage`,
      );
      assert(
        blockIndex.has(workOrder.block_id),
        `${workOrder.id}: unknown block ${workOrder.block_id}`,
      );
      assert(
        observationIndex.has(workOrder.source_observation_id),
        `${workOrder.id}: unknown observation ${workOrder.source_observation_id}`,
      );
      assert(
        observationIndex.get(workOrder.source_observation_id).block_id ===
          workOrder.block_id,
        `${workOrder.id}: observation and work order block identities differ`,
      );
      assertReferenceList(
        workOrder.assignee_person_ids,
        peopleIndex,
        `${workOrder.id}.assignee_person_ids`,
      );
      const block = blockIndex.get(workOrder.block_id);
      assert(
        workOrder.target_acres <= block.acres,
        `${workOrder.id}: target acreage exceeds block acreage`,
      );
      if (workOrder.actuals) {
        assert(
          workOrder.actuals.completed_acres <= block.acres,
          `${workOrder.id}: actual acreage exceeds block acreage`,
        );
        assert(
          workOrder.actuals.completed_acres <= workOrder.target_acres,
          `${workOrder.id}: actual acreage exceeds target acreage`,
        );
        if (workOrder.actuals.verified_by_person_id)
          assert(
            peopleIndex.has(workOrder.actuals.verified_by_person_id),
            `${workOrder.id}: unknown verifier`,
          );
      }
      assertUnique(
        workOrder.status_history.map((event) => event.id),
        `${workOrder.id} event IDs`,
      );

      let previousTime = -Infinity;
      let previousStatus = null;
      let previousReportedAcres = 0;
      for (const [index, event] of workOrder.status_history.entries()) {
        const eventTime = dateValue(event.at, `${workOrder.id}/${event.id}`);
        assert(
          eventTime > previousTime,
          `${workOrder.id}: status history is not strictly chronological at ${event.id}`,
        );
        assert(
          event.from === previousStatus,
          `${workOrder.id}/${event.id}: expected from=${previousStatus}, received ${event.from}`,
        );
        assert(
          peopleIndex.has(event.actor_person_id),
          `${workOrder.id}/${event.id}: unknown actor ${event.actor_person_id}`,
        );
        if (event.reported_acres !== undefined) {
          assert(
            event.reported_acres >= previousReportedAcres,
            `${workOrder.id}/${event.id}: reported acreage regressed`,
          );
          assert(
            event.reported_acres <= workOrder.target_acres,
            `${workOrder.id}/${event.id}: reported acreage exceeds target`,
          );
          previousReportedAcres = event.reported_acres;
        }
        if (index === 0)
          assert(
            event.from === null,
            `${workOrder.id}: initial event must start from null`,
          );
        previousTime = eventTime;
        previousStatus = event.to;
        checkedEvents += 1;
      }
      assert(
        previousStatus === workOrder.current_status,
        `${workOrder.id}: current_status does not match final event`,
      );
      const blockedEvent = workOrder.status_history.find(
        (event) => event.to === "blocked",
      );
      const recoveryEvent = workOrder.status_history.find(
        (event) => event.from === "blocked" && event.to === "assigned",
      );
      assert(
        Boolean(blockedEvent) === Boolean(workOrder.blocker),
        `${workOrder.id}: blocked transition and blocker record must appear together`,
      );
      if (workOrder.blocker) {
        assert(
          dateValue(blockedEvent.at, `${workOrder.id}.blocked`) ===
            dateValue(
              workOrder.blocker.recorded_at,
              `${workOrder.id}.blocker.recorded_at`,
            ),
          `${workOrder.id}: blocker timestamp differs from status history`,
        );
        if (workOrder.blocker.resolved_at) {
          const recordedAt = dateValue(
            workOrder.blocker.recorded_at,
            `${workOrder.id}.blocker.recorded_at`,
          );
          const resolvedAt = dateValue(
            workOrder.blocker.resolved_at,
            `${workOrder.id}.blocker.resolved_at`,
          );
          assert(
            recordedAt < resolvedAt,
            `${workOrder.id}: blocker resolution must follow blocker report`,
          );
          assert(
            Boolean(recoveryEvent),
            `${workOrder.id}: resolved blocker has no canonical blocked-to-assigned recovery transition`,
          );
          assert(
            resolvedAt <=
              dateValue(recoveryEvent.at, `${workOrder.id}.reassigned`),
            `${workOrder.id}: work resumed before blocker resolution`,
          );
        } else {
          assert(
            !recoveryEvent,
            `${workOrder.id}: unresolved blocker cannot resume`,
          );
        }
      }
      if (workOrder.current_status === "verified") {
        assert(
          Boolean(workOrder.actuals),
          `${workOrder.id}: verified work requires actuals`,
        );
        assert(
          dateValue(
            workOrder.actuals.verified_at,
            `${workOrder.id}.actuals.verified_at`,
          ) === previousTime,
          `${workOrder.id}: verification timestamp differs from final event`,
        );
        assert(
          workOrder.actuals.completed_acres === workOrder.target_acres,
          `${workOrder.id}: verified acreage must equal target acreage`,
        );
      }

      const scenario = scenarioIndex.get(workOrder.scenario_id);
      const workflow = workflowIndex.get(workOrder.workflow_id);
      const actualTransitions = workOrder.status_history.map(
        (event) => `${event.from ?? "null"}->${event.to}`,
      );
      const expectedTransitions = scenario.expected_transitions.map(
        (event) => `${event.from ?? "null"}->${event.to}`,
      );
      assert(
        deepEqual(actualTransitions, expectedTransitions),
        `${workOrder.id}: fixture history does not realize ${scenario.id} expected transitions`,
      );
      const workflowTransitions = new Set(
        workflow.transitions.map(
          (transition) => `${transition.from ?? "null"}->${transition.to}`,
        ),
      );
      for (const transition of actualTransitions)
        assert(
          workflowTransitions.has(transition),
          `${workOrder.id}: transition ${transition} is not defined by ${workflow.id}`,
        );
    }
  }

  const operation = await readJson("data/operation.json");
  const eventDocument = await readJson("data/events.json");
  const exceptionDocument = await readJson("data/exceptions.json");
  const sourceHashes = new Map();
  for (const source of operation.canonical_sources ?? []) {
    assert(
      !path.isAbsolute(source.path) &&
        !source.path.split(/[\\/]/).includes(".."),
      `${source.id}: canonical source path must stay inside the repository`,
    );
    sourceHashes.set(
      source.path,
      createHash("sha256")
        .update(await readText(source.path))
        .digest("hex"),
    );
  }
  const metrics = validateSeasonData({
    operation,
    eventDocument,
    exceptionDocument,
    canonical: {
      workflows: await readJson("workflow-model/workflows.json"),
      roles: await readJson("workflow-model/roles.json"),
      records: await readJson("workflow-model/records.json"),
      decisions: await readJson("workflow-model/decisions.json"),
      exceptions: await readJson("workflow-model/exceptions.json"),
      overlays: await readJson("workflow-model/overlays.json"),
    },
    sourceHashes,
  });
  const coverage = await readJson("validation/data-coverage.json");
  assert(
    coverage.operation_id === metrics.operation_id &&
      coverage.generated_at === operation.generated_at,
    "validation/data-coverage.json does not describe the generated operation",
  );
  for (const [sourcePath, sourceHash] of sourceHashes)
    assert(
      coverage.canonical_source_hashes[sourcePath] === sourceHash,
      `validation/data-coverage.json has a stale hash for ${sourcePath}`,
    );
  const coverageMetrics = {
    organizations: metrics.organizations,
    properties: metrics.properties,
    blocks: metrics.blocks,
    active_blocks: metrics.active_blocks,
    people: metrics.people,
    role_assignments: metrics.role_assignments,
    contracts: metrics.contracts,
    active_contracts: metrics.active_contracts,
    workflows: metrics.workflow_families,
    workflow_instances: metrics.workflow_instances,
    multi_day_instances: metrics.multi_day_instances,
    long_running_instances: metrics.long_running_instances,
    longest_instance_days: metrics.longest_instance_days,
    state_events: metrics.events,
    event_measurement_units: metrics.event_measurement_units,
    record_fact_units: metrics.record_fact_units,
    supersessions: metrics.supersessions,
    offline_events: metrics.offline_events,
    offline_workflows: metrics.offline_workflows,
    conflict_events: metrics.conflict_events,
    conflict_workflows: metrics.conflict_workflows,
    record_definitions: metrics.record_definitions,
    record_instances: metrics.record_instances,
    decisions_covered: metrics.decisions_exercised,
    exception_histories: metrics.exception_histories,
    overlays: metrics.overlays,
    cross_workflow_record_links: metrics.cross_workflow_links,
    months_represented: metrics.event_months,
    harvest_to_settlement_chains: metrics.operational_chains,
  };
  for (const [metric, expected] of Object.entries(coverageMetrics))
    assert(
      coverage.counts[metric] === expected,
      `validation/data-coverage.json ${metric}=${coverage.counts[metric]} differs from derived value ${expected}`,
    );
  assertUnique(
    coverage.named_cases.map((namedCase) => namedCase.case_key),
    "validation/data-coverage.json named case keys",
  );
  const generatedEvents = byId(eventDocument.events, "generated event");
  const generatedRecords = byId(
    operation.record_instances,
    "generated record instance",
  );
  const generatedHistories = byId(
    exceptionDocument.histories,
    "generated exception history",
  );
  for (const namedCase of coverage.named_cases) {
    assert(
      Array.isArray(namedCase.event_ids) && namedCase.event_ids.length > 0,
      `${namedCase.case_key}: named case requires event_ids`,
    );
    assertReferenceList(
      namedCase.event_ids,
      generatedEvents,
      `${namedCase.case_key}.event_ids`,
    );
    assertReferenceList(
      namedCase.record_instance_ids,
      generatedRecords,
      `${namedCase.case_key}.record_instance_ids`,
    );
    if (namedCase.exception_history_id) {
      const history = generatedHistories.get(namedCase.exception_history_id);
      assert(
        Boolean(history),
        `${namedCase.case_key}: unknown exception history ${namedCase.exception_history_id}`,
      );
      assert(
        history.exception_definition_id === namedCase.exception_definition_id,
        `${namedCase.case_key}: exception definition differs from its history`,
      );
      assert(
        namedCase.event_ids.every((eventId) =>
          history.event_ids.includes(eventId),
        ),
        `${namedCase.case_key}: cited events are outside its exception history`,
      );
      if (namedCase.case_key === "changed_block_identifier") {
        const openedAt = Date.parse(history.opened_at);
        const closedAt = Date.parse(history.closed_at);
        const matchingLineage = operation.block_lineage.filter(
          (lineage) =>
            [...lineage.source_block_ids, ...lineage.result_block_ids].some(
              (blockId) => history.block_ids.includes(blockId),
            ) &&
            Date.parse(lineage.effective_on) >= openedAt &&
            Date.parse(lineage.effective_on) <= closedAt,
        );
        assert(
          matchingLineage.length > 0,
          `${namedCase.case_key}: cited exception has no same-block lineage change during its recovery window`,
        );
        assert(
          history.block_ids.every((blockId) => {
            const aliases = operation.block_aliases.filter(
              (alias) => alias.block_id === blockId,
            );
            return (
              aliases.some(
                (alias) => alias.status === "historical" && alias.effective_to,
              ) &&
              aliases.some(
                (alias) =>
                  alias.status === "corrected" &&
                  Date.parse(alias.effective_from) >= openedAt &&
                  Date.parse(alias.effective_from) <= closedAt,
              )
            );
          }),
          `${namedCase.case_key}: affected block lacks connected historical and corrected aliases`,
        );
      }
    }
    if (namedCase.case_key === "offline_observation_synced_later")
      assert(
        namedCase.event_ids.every(
          (eventId) =>
            generatedEvents.get(eventId).connectivity.captured_offline,
        ),
        `${namedCase.case_key}: cited events were not captured offline`,
      );
    if (namedCase.case_key === "corrected_weigh_ticket") {
      const weighBills = namedCase.record_instance_ids
        .map((recordId) => generatedRecords.get(recordId))
        .filter((record) => record.record_definition_id === "REC-047");
      assert(
        weighBills.length >= 2 &&
          weighBills.some((record) =>
            weighBills.some(
              (candidate) =>
                record.supersedes_record_instance_id === candidate.id &&
                candidate.superseded_by_record_instance_id === record.id,
            ),
          ),
        `${namedCase.case_key}: requires a reciprocal REC-047 predecessor/successor pair`,
      );
      assert(
        weighBills.every((record) =>
          record.workflow_instance_ids.includes(namedCase.workflow_instance_id),
        ),
        `${namedCase.case_key}: weigh-bill lineage is outside its workflow instance`,
      );
    }
  }

  return `validated ${fixtures.length} connected walking-slice fixture with ${checkedEvents} events plus deterministic ${metrics.operation_id}: ${metrics.workflow_instances} workflow instances, ${metrics.events} events, ${metrics.record_instances} records, ${metrics.exception_histories} exception histories, ${metrics.cross_workflow_links} cross-workflow links, and ${metrics.operational_chains} operational chains`;
}

function successfulDependency(status) {
  return new Set(["merged", "complete"]).has(status);
}

async function validateControl() {
  const registry = await readYaml("control/TASK_REGISTRY.yaml");
  const project = await readYaml("control/PROJECT_STATE.yaml");
  const taskIndex = byId(registry.tasks, "task");
  const gitMetadataAvailable = gitSucceeds([
    "rev-parse",
    "--is-inside-work-tree",
  ]);

  for (const task of registry.tasks) {
    for (const dependencyId of task.depends_on) {
      assert(
        taskIndex.has(dependencyId),
        `${task.id}: unresolved dependency ${dependencyId}`,
      );
      assert(
        dependencyId !== task.id,
        `${task.id}: task cannot depend on itself`,
      );
    }
  }

  const visiting = new Set();
  const visited = new Set();
  function visit(taskId, pathIds) {
    if (visiting.has(taskId))
      throw new Error(
        `Task dependency cycle: ${[...pathIds, taskId].join(" -> ")}`,
      );
    if (visited.has(taskId)) return;
    visiting.add(taskId);
    const task = taskIndex.get(taskId);
    task.depends_on.forEach((dependencyId) =>
      visit(dependencyId, [...pathIds, taskId]),
    );
    visiting.delete(taskId);
    visited.add(taskId);
  }
  registry.tasks.forEach((task) => visit(task.id, []));
  assert(
    visited.size === registry.tasks.length,
    "Task dependency graph traversal was incomplete",
  );

  const startedStatuses = new Set([
    "in_progress",
    "review",
    "revise",
    "validated",
    "merged",
    "complete",
  ]);
  for (const task of registry.tasks.filter((candidate) =>
    startedStatuses.has(candidate.status),
  )) {
    for (const dependencyId of task.depends_on) {
      assert(
        successfulDependency(taskIndex.get(dependencyId).status),
        `${task.id}: started before dependency ${dependencyId} reached a successful terminal state`,
      );
    }
  }

  for (const task of registry.tasks.filter(
    (candidate) => candidate.status === "complete",
  )) {
    assert(
      Boolean(task.completed_at),
      `${task.id}: complete task has no completed_at`,
    );
    for (const artifactPath of task.artifacts)
      await access(absolute(artifactPath));
    if (task.owner !== "owner_account")
      assert(
        Boolean(task.commit),
        `${task.id}: bot-owned complete task has no evidence commit`,
      );
    if (gitMetadataAvailable && task.commit)
      assertCommitProvenance(task.commit, task.artifacts, task.id);
  }

  if (project.next_task === null) {
    assert(
      project.definition_of_done_passed,
      "PROJECT_STATE.next_task may be null only after Definition of Done passes",
    );
  } else {
    const nextId = project.next_task.match(
      /^([A-Z]+(?:-[A-Z]+)*-[0-9]{3})\b/,
    )?.[1];
    assert(
      Boolean(nextId),
      "PROJECT_STATE.next_task must begin with a task ID",
    );
    assert(
      taskIndex.has(nextId),
      `PROJECT_STATE.next_task points to unknown task ${nextId}`,
    );
    const nextTask = taskIndex.get(nextId);
    const executableStatuses = new Set([
      "planned",
      "ready",
      "in_progress",
      "review",
      "revise",
    ]);
    assert(
      executableStatuses.has(nextTask.status),
      `PROJECT_STATE.next_task ${nextId} is not executable (${nextTask.status})`,
    );
    for (const dependencyId of nextTask.depends_on) {
      assert(
        successfulDependency(taskIndex.get(dependencyId).status),
        `PROJECT_STATE.next_task ${nextId} has incomplete dependency ${dependencyId}`,
      );
    }
    assert(
      project.current_phase === nextTask.phase,
      `PROJECT_STATE.current_phase ${project.current_phase} differs from ${nextId} phase ${nextTask.phase}`,
    );
    if (nextTask.branch)
      assert(
        project.active_branch === nextTask.branch,
        `PROJECT_STATE.active_branch differs from ${nextId}.branch`,
      );
  }

  if (project.last_completed_task !== null) {
    assert(
      taskIndex.has(project.last_completed_task),
      `PROJECT_STATE.last_completed_task points to unknown task ${project.last_completed_task}`,
    );
    assert(
      taskIndex.get(project.last_completed_task).status === "complete",
      `PROJECT_STATE.last_completed_task ${project.last_completed_task} is not explicitly complete`,
    );
  }

  const findings = await readYaml("validation/FINDINGS.yaml");
  const gateResults = await readJson("validation/gate-results.json");
  const dodMatrix = await readYaml("control/DOD_MATRIX.yaml");
  byId(findings.findings, "finding");
  const gateResultIndex = byId(gateResults.gates, "gate result");
  const dodGateIndex = byId(dodMatrix.criteria, "Definition of Done gate");
  const expectedGateIds = Array.from({ length: 13 }, (_, index) => `G${index}`);
  assert(
    deepEqual(
      [...dodGateIndex.keys()].sort(
        (left, right) => Number(left.slice(1)) - Number(right.slice(1)),
      ),
      expectedGateIds,
    ),
    "control/DOD_MATRIX.yaml must contain exactly G0 through G12",
  );

  for (const gate of dodMatrix.criteria) {
    if (gate.status === "passed") {
      assert(
        gate.evidence.length > 0,
        `${gate.id}: passed Definition of Done gate has no evidence`,
      );
      for (const evidencePath of gate.evidence)
        await access(absolute(evidencePath));
      assert(
        gateResultIndex.get(gate.id)?.status === "passed",
        `${gate.id}: passed Definition of Done gate has no passed result record`,
      );
    }
  }
  for (const gate of gateResults.gates) {
    assert(
      dodGateIndex.has(gate.id),
      `${gate.id}: result has no DoD criterion`,
    );
    if (gate.status === "passed") {
      assert(
        dodGateIndex.get(gate.id).status === "passed",
        `${gate.id}: result passes while the DoD matrix does not`,
      );
      assert(
        gate.evidence.length > 0,
        `${gate.id}: passed result has no evidence`,
      );
      assert(
        Boolean(gate.commit_sha),
        `${gate.id}: passed result has no commit SHA`,
      );
      if (gitMetadataAvailable)
        assertCommitProvenance(gate.commit_sha, gate.evidence, gate.id);
    }
    for (const evidencePath of gate.evidence)
      await access(absolute(evidencePath));
  }

  if (project.definition_of_done_passed) {
    assert(
      dodMatrix.status === "passed",
      "Project completion requires a passed DoD matrix",
    );
    assert(
      dodMatrix.criteria.every((gate) => gate.status === "passed"),
      "Project completion requires every G0-G12 criterion to pass",
    );
    assert(
      expectedGateIds.every(
        (gateId) => gateResultIndex.get(gateId)?.status === "passed",
      ),
      "Project completion requires a passed, commit-backed result for every G0-G12 gate",
    );
    const unresolvedBlocking = findings.findings.filter(
      (finding) =>
        ["P0", "P1"].includes(finding.severity) &&
        finding.status !== "resolved",
    );
    assert(
      unresolvedBlocking.length === 0,
      "Completion gate cannot pass with unresolved P0/P1 findings",
    );
  } else {
    assert(
      dodMatrix.status !== "passed",
      "DoD matrix cannot pass while PROJECT_STATE.definition_of_done_passed is false",
    );
  }

  const provenance = gitMetadataAvailable
    ? "Git-reachable evidence-at-commit provenance"
    : "schema-level commit provenance without Git metadata";
  return `validated ${registry.tasks.length}-task acyclic registry, resumable pointers, all G0-G12 criteria, findings, and ${provenance}`;
}

async function main() {
  const summaries = [];
  summaries.push(["schema", await validateSchemas()]);
  if (["evidence", "all"].includes(scope))
    summaries.push(["evidence", await validateEvidence()]);
  if (["trace", "all"].includes(scope))
    summaries.push(["trace", await validateTrace()]);
  if (["data", "all"].includes(scope))
    summaries.push(["data", await validateData()]);
  if (scope === "all") summaries.push(["control", await validateControl()]);

  for (const [name, summary] of summaries) console.log(`✓ ${name}: ${summary}`);
  console.log(
    `✓ validation complete: ${state.assertions} assertions (${scope})`,
  );
}

main().catch((error) => {
  console.error(`✗ validation failed (${scope}): ${error.message}`);
  process.exitCode = 1;
});
