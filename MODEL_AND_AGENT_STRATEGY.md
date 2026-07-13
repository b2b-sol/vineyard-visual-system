# Codex Model and Agent Strategy

This strategy reflects the current Codex model family and local subagent system as of 2026-07-13. Before changing model identifiers or config syntax, verify current official OpenAI documentation.

## Parent model

Use **GPT-5.6 Sol** for the persistent Goal, master orchestration, ambiguous workflow interpretation, product synthesis, visual direction, adjudication, final integration, and completion audit.

Preferred explicit identifier:

```text
 gpt-5.6-sol
```

If the local Codex product exposes Sol through a current alias or UI selection rather than that exact identifier, use the strongest current Sol option and record the resolved model in `control/PROJECT_STATE.yaml`.

## Subagent routing

- **Sol:** workflow adjudicator, UX architect, visual designer, design critic, completion auditor
- **Terra:** workflow extraction, scenario production, synthetic data, implementation workers, browser QA
- **Luna:** deterministic classification, manifest checks, structured transformations, large repetitive audits where quality is objectively testable

A cheaper model must not make final judgment calls merely because the task volume is high.

## Project-scoped Codex configuration

Use `.codex/config.toml` and `.codex/agents/*.toml`. Keep nesting depth at one unless a concrete need justifies deeper recursion.

Recommended defaults:

```toml
[features]
goals = true
multi_agent = true
hooks = true

[agents]
max_threads = 6
max_depth = 1
job_max_runtime_seconds = 3600
```

## Agent roles

- `workflow_extractor`: independent structured extraction
- `workflow_adjudicator`: reconciles evidence and approves workflow model
- `scenario_author`: creates realistic normal and exception scenarios
- `ux_architect`: derives product structure and interaction models
- `visual_designer`: produces polished visual alternatives and screen families
- `design_critic`: workflow/UX/visual critique without editing source
- `data_synthesizer`: connected realistic synthetic vineyard data
- `implementation_worker`: builds atlas, components, routes, and tooling
- `browser_qa`: rendered behavior, screenshots, accessibility, and responsive checks
- `traceability_auditor`: detects orphan evidence, workflows, scenarios, screens, components, and packets
- `completion_auditor`: independent final Sol review against Definition of Done

## AGENTS.md layering

Use a compact root `AGENTS.md`, then narrower instruction files close to specialized work, for example:

```text
AGENTS.md
workflow-model/AGENTS.md
scenarios/AGENTS.md
atlas/AGENTS.md
design-system/AGENTS.md
validation/AGENTS.md
construction-packets/AGENTS.md
```

Keep the combined instructions within Codex discovery limits. Put detailed reference material in normal documents rather than inflating every agent context.

## Delegation principles

- Give subagents bounded jobs and explicit return formats.
- Run independent agents in parallel only when their work can be reconciled objectively.
- Require artifacts or structured results, not broad brainstorming.
- Keep critics read-only where possible.
- The parent waits for relevant subagents, integrates their work, and verifies actual repository output.
