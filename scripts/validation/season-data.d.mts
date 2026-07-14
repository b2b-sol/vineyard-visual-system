export interface SeasonDataMetrics {
  operation_id: string;
  seed: number;
  organizations: number;
  properties: number;
  blocks: number;
  active_blocks: number;
  people: number;
  role_assignments: number;
  contracts: number;
  active_contracts: number;
  workflow_instances: number;
  workflow_families: number;
  multi_day_instances: number;
  long_running_instances: number;
  longest_instance_days: number;
  record_instances: number;
  record_definitions: number;
  events: number;
  event_months: number;
  offline_events: number;
  offline_workflows: number;
  conflict_events: number;
  conflict_workflows: number;
  event_measurement_units: number;
  record_fact_units: number;
  decisions_exercised: number;
  exception_histories: number;
  exception_workflows: number;
  corrections: number;
  supersessions: number;
  overlays: number;
  links: number;
  cross_workflow_links: number;
  operational_chains: number;
  contract_chains: number;
  estate_chains: number;
}

export interface SeasonDataValidationInput {
  operation: unknown;
  eventDocument: unknown;
  exceptionDocument: unknown;
  canonical: {
    workflows: unknown;
    roles: unknown;
    records: unknown;
    decisions: unknown;
    exceptions: unknown;
    overlays: unknown;
  };
  sourceHashes?: Map<string, string>;
}

export function validateSeasonData(
  input: SeasonDataValidationInput,
): SeasonDataMetrics;

export const REQUIRED_SHARED_RECORDS: readonly string[];
