import componentRequirementsSource from "../../../product-structure/component-requirements.json";
import flowsSource from "../../../product-structure/flows.json";
import notificationsSource from "../../../product-structure/notifications.json";
import permissionsSource from "../../../product-structure/permissions.json";
import screensSource from "../../../product-structure/screens.json";
import stateMatrixSource from "../../../product-structure/state-matrix.json";
import syncSource from "../../../product-structure/sync-model.json";
import scenariosSource from "../../../scenarios/scenarios.json";
import eventsSource from "../../../data/events.json";
import operationSource from "../../../data/operation.json";
import fixturesSource from "../../../data/scenario-fixtures.json";
import decisionsSource from "../../../workflow-model/decisions.json";
import recordsSource from "../../../workflow-model/records.json";

export const WAVE_001_SCREEN_IDS = [
  "SCR-001",
  "SCR-002",
  "SCR-003",
  "SCR-004",
  "SCR-005",
  "SCR-006",
  "SCR-039",
  "SCR-040",
  "SCR-041",
  "SCR-042",
  "SCR-043",
  "SCR-044",
  "SCR-045",
] as const;

export const WAVE_001_COMPONENT_IDS = [
  ...Array.from(
    { length: 22 },
    (_, index) => `CMP-${String(index + 1).padStart(3, "0")}`,
  ),
  "CMP-026",
  "CMP-033",
  "CMP-034",
  "CMP-035",
  "CMP-036",
] as const;

export type WaveScreenId = (typeof WAVE_001_SCREEN_IDS)[number];
export type PublicComponentId = (typeof WAVE_001_COMPONENT_IDS)[number];

export interface CanonicalAction {
  id: string;
  label: string;
  kind: string;
  semantic_kind?: string;
  permission_rule_ids: string[];
  notification_rule_ids: string[];
  sync_class_id: string;
  transition?: {
    workflow_id: string;
    transition_id: string;
    from: string | null;
    to: string;
  };
  record_reads?: string[];
  record_writes?: string[];
  decision_ids?: string[];
}

export interface ScreenContract {
  id: WaveScreenId;
  name: string;
  purpose: string;
  primary_decision: string;
  platform: "responsive" | "mobile" | "desktop";
  workflow_ids: string[];
  scenario_ids: string[];
  fixture_ids: string[];
  requirement_ids: string[];
  primary_role_ids: string[];
  review_role_ids: string[];
  data_shown: string[];
  actions: CanonicalAction[];
  states: Array<{ id: string; kind: string; description: string }>;
  offline_behavior: string;
  permission_behavior: string;
}

export interface StateContract {
  id: string;
  screen_id: WaveScreenId;
  kind: string;
  canonical_state: string | null;
  source_ref: {
    type: string;
    scenario_id?: string;
    fixture_id?: string;
    event_id?: string;
    rationale: string;
  };
  trigger: string;
  information_priority: string[];
  required_actions: string[];
}

export interface Fixture {
  id: string;
  title: string;
  category: string;
  state_flags: string[];
  workflow_id: string;
  workflow_instance_id: string;
  current_state: string;
  anchor: {
    event_id: string;
    transition_id: string;
    from_state: string | null;
    to_state: string;
    semantic_kind: string;
    actor_assignment_id: string;
    occurred_at: string;
    record_reads: string[];
    record_writes: string[];
    decision_ids: string[];
    exception_history_ids: string[];
    connectivity: {
      mode: string;
      captured_offline: boolean;
      sync_status: string;
    };
  };
  event_ids: string[];
  record_instance_ids: string[];
  exception_history_ids: string[];
  block_ids: string[];
  contract_ids: string[];
  actor_assignment_ids: string[];
  started_at: string;
  completed_at: string;
}

export interface CanonicalEvent {
  id: string;
  sequence: number;
  workflow_instance_id: string;
  workflow_id: string;
  transition_id: string;
  from_state: string | null;
  to_state: string;
  kind: string;
  occurred_at: string;
  actor_assignment_id: string;
  reason: string;
  record_reads: string[];
  record_writes: string[];
  decision_ids: string[];
  notification_rule_ids?: string[];
  connectivity: {
    mode: string;
    captured_offline: boolean;
    sync_status: string;
  };
}

export interface Block {
  id: string;
  stable_identity: string;
  property_id: string;
  operating_organization_id: string;
  current_name: string;
  status: string;
  area: { value: number; unit_id: string; qualifier: string };
  variety: string;
  row_count: number;
  row_orientation_degrees: number;
}

export interface RecordInstance {
  id: string;
  record_definition_id: string;
  title: string;
  lifecycle_state: string;
  effective_at: string;
  recorded_at: string;
  owner_assignment_id: string;
  block_ids?: string[];
  organization_ids?: string[];
  facts: Record<string, unknown>;
}

interface RoleAssignment {
  id: string;
  person_id: string;
  role_id: string;
  organization_id: string;
  scope_ids: string[];
  authority: string[];
}

interface Person {
  id: string;
  name: string;
  home_organization_id: string;
}

interface PermissionRule {
  id: string;
  effect: "allow" | "deny";
  role_ids: string[];
  record_state_rule: string;
  scope_rule: string;
  denied_behavior: string;
}

interface NotificationRule {
  id: string;
  severity: string;
  recipient_role_ids: string[];
  canonical_channel: string;
  escalation_after_minutes: number;
  resolution_condition: string;
}

interface ComponentRequirement {
  id: PublicComponentId;
  name: string;
  purpose: string;
  screen_ids: string[];
}

interface Scenario {
  id: string;
  title: string;
  workflow_ids: string[];
  path_segments: Array<{ fixture_id: string; event_ids: string[] }>;
}

interface FlowStep {
  screen_id: string;
  action_id: string;
  actor_role_id: string;
  scenario_id: string;
  fixture_id: string;
  event_id: string;
  transition_id: string;
  record_instance_ids: string[];
  intent: string;
  outcome: string;
}

export interface CanonicalFlow {
  id: string;
  title: string;
  workflow_ids: string[];
  scenario_ids: string[];
  fixture_ids: string[];
  record_link_ids: string[];
  entry_points: FlowStep[];
  normal_path: FlowStep[];
  exception_path: FlowStep[];
  recovery_path: FlowStep[];
  completion_path: FlowStep[];
}

const indexById = <T extends { id: string }>(items: T[]) =>
  new Map(items.map((item) => [item.id, item] as const));

const screens = (screensSource.screens as unknown as ScreenContract[]).filter(
  (screen) => WAVE_001_SCREEN_IDS.includes(screen.id),
);
const states = (stateMatrixSource.states as unknown as StateContract[]).filter(
  (state) => WAVE_001_SCREEN_IDS.includes(state.screen_id),
);
const fixtures = fixturesSource.fixtures as unknown as Fixture[];
const events = eventsSource.events as unknown as CanonicalEvent[];
const operation = operationSource as unknown as {
  blocks: Block[];
  record_instances: RecordInstance[];
  role_assignments: RoleAssignment[];
  people: Person[];
  organizations: Array<{ id: string; name: string }>;
  properties: Array<{ id: string; name: string }>;
  links: Array<{
    id: string;
    source_record_instance_id: string;
    target: { entity_type: string; entity_id: string };
    relation: string;
  }>;
};

export const screenIndex = indexById(screens);
export const stateIndex = indexById(states);
export const fixtureIndex = indexById(fixtures);
export const eventIndex = indexById(events);
export const blockIndex = indexById(operation.blocks);
export const recordInstanceIndex = indexById(operation.record_instances);
export const assignmentIndex = indexById(operation.role_assignments);
export const personIndex = indexById(operation.people);
export const organizationIndex = indexById(operation.organizations);
export const propertyIndex = indexById(operation.properties);
export const permissionIndex = indexById(
  permissionsSource.rules as unknown as PermissionRule[],
);
export const notificationIndex = indexById(
  notificationsSource.rules as unknown as NotificationRule[],
);
export const componentRequirementIndex = indexById(
  (
    componentRequirementsSource.components as unknown as ComponentRequirement[]
  ).filter((component) => WAVE_001_COMPONENT_IDS.includes(component.id)),
);
export const scenarioIndex = indexById(
  scenariosSource.scenarios as unknown as Scenario[],
);
export const flowIndex = indexById(
  flowsSource.flows as unknown as CanonicalFlow[],
);
export const recordDefinitionIndex = indexById(
  recordsSource.records as Array<{ id: string; name: string; purpose: string }>,
);
export const decisionIndex = indexById(
  decisionsSource.decisions as Array<{
    id: string;
    question: string;
    owner: string;
    outcomes: string[];
  }>,
);

export const syncClasses = syncSource.classes as Array<{
  id: string;
  name: string;
  permits: string[];
  constraints: string;
}>;

export const waveScreens = screens;
export const waveStateContracts = states;
export const waveComponents = WAVE_001_COMPONENT_IDS.map((id) =>
  componentRequirementIndex.get(id)!,
);

export function isWaveScreenId(value: string): value is WaveScreenId {
  return WAVE_001_SCREEN_IDS.includes(value as WaveScreenId);
}

export function getStateContracts(screenId: WaveScreenId) {
  return states.filter((state) => state.screen_id === screenId);
}

export function getComponentsForScreen(screenId: WaveScreenId) {
  return waveComponents.filter((component) =>
    component.screen_ids.includes(screenId),
  );
}

export function getFixtureEvents(fixture: Fixture) {
  return fixture.event_ids
    .map((eventId) => eventIndex.get(eventId))
    .filter((event): event is CanonicalEvent => Boolean(event))
    .sort((left, right) => left.sequence - right.sequence);
}

export function getFixtureRecords(fixture: Fixture) {
  return fixture.record_instance_ids
    .map((recordId) => recordInstanceIndex.get(recordId))
    .filter((record): record is RecordInstance => Boolean(record));
}

export function getAssignmentLabel(assignmentId: string) {
  const assignment = assignmentIndex.get(assignmentId);
  const person = assignment ? personIndex.get(assignment.person_id) : undefined;
  return {
    assignmentId,
    roleId: assignment?.role_id ?? "ROLE-UNKNOWN",
    personName: person?.name ?? "Unresolved actor",
    organizationName:
      organizationIndex.get(assignment?.organization_id ?? "")?.name ??
      "Unresolved organization",
    authority: assignment?.authority ?? [],
  };
}

export function getScenarioForFixture(
  screen: ScreenContract,
  fixtureId: string,
) {
  return (
    screen.scenario_ids
      .map((scenarioId) => scenarioIndex.get(scenarioId))
      .find((scenario) =>
        scenario?.path_segments.some(
          (segment) => segment.fixture_id === fixtureId,
        ),
      ) ?? scenarioIndex.get(screen.scenario_ids[0])!
  );
}

export function getActionForTransition(transitionId: string) {
  for (const screen of screens) {
    const action = screen.actions.find(
      (candidate) => candidate.transition?.transition_id === transitionId,
    );
    if (action) return { screen, action };
  }
  return undefined;
}

export function getFixtureIdentity(fixture: Fixture) {
  const block = blockIndex.get(fixture.block_ids[0]);
  const property = propertyIndex.get(block?.property_id ?? "");
  const organization = organizationIndex.get(
    block?.operating_organization_id ?? "",
  );
  return { block, property, organization };
}

export function getRelatedLinks(recordIds: string[]) {
  const selected = new Set(recordIds);
  return operation.links.filter(
    (link) =>
      selected.has(link.source_record_instance_id) ||
      selected.has(link.target.entity_id),
  );
}
