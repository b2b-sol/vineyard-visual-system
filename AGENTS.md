# Repository Instructions for Codex

## Mission

Execute `MASTER_GOAL.md` completely. You are the accountable owner-agent. Subagents contribute bounded work; they do not dilute your responsibility for integration, verification, and completion.

## First action

Read `START_HERE.md`. Respect the owner-to-bot authentication checkpoint exactly.

## Source hierarchy

1. Direct current human instruction
2. `MASTER_GOAL.md` and `DEFINITION_OF_DONE.md`
3. The workflow-discovery report
4. Approved registries and traceability records
5. The autonomous decision policy
6. Other project documents

## Work style

- Continue until the Definition of Done passes.
- Prefer executable artifacts over prose describing future artifacts.
- Use subagents for genuinely separable work; keep the parent focused on orchestration and integration.
- Use two independent creators or extractors for high-consequence ambiguous work, then a separate adjudicator.
- Use creator–critic–integrator loops for workflow, UX, and visual design.
- Make routine decisions autonomously and record consequential decisions in `control/DECISION_LOG.md`.
- Record uncertainty in `control/ASSUMPTION_REGISTER.yaml`; never silently convert inference into fact.
- Keep `control/PROJECT_STATE.yaml`, `control/TASK_REGISTRY.yaml`, and `control/MASTER_MANIFEST.yaml` current.
- At the end of every major task, commit durable state and set the next executable task.
- After the initial scaffold, work through branches/worktrees and pull requests. Use required checks, auto-merge, and merge queue when configured.
- When a run is interrupted, resume from repository state instead of reconstructing plans from memory.

## GitHub identity and secrets

- Phase A may run only the owner bootstrap actions described in `AUTH_AND_GITHUB_PROTOCOL.md`.
- Phase B must verify `gh api user --jq .login` returns exactly `tiklebot` before any repository work.
- Never request, reveal, print, export, inspect, or store authentication tokens.
- Never commit secrets, personal credentials, environment-specific credential paths, or private machine data.
- Use repository-local Git author configuration for `tiklebot`.

## Operational fidelity

- Every screen must trace to at least one approved scenario.
- Every scenario must trace to a workflow.
- Every consequential action must advance, resolve, or inspect a workflow state.
- Preserve distinctions among observation, recommendation, approval, assignment, execution, completion, verification, reconciliation, correction, and supersession.
- Cover normal paths and meaningful exceptions.
- Treat stable block identity across organizations and records as a foundational product concern.

## Design quality

- Build a distinctive professional operational product, not a generic SaaS dashboard.
- Solve hierarchy, interaction, data density, and state behavior before visual decoration.
- Review complete workflow packages, not isolated glamour screens.
- Use realistic connected synthetic data everywhere.
- Ensure mobile field interactions and desktop supervisory operations feel like one system.
- Use browser screenshots and Playwright to verify actual rendered output.
- Maintain accessibility, outdoor readability, keyboard use, responsive behavior, and print/export quality where applicable.

## Canonical formats

Prefer structured, editable sources:

- TypeScript/React for product visuals and components
- CSS variables and DTCG JSON for tokens
- Mermaid and SVG for diagrams
- JSON/YAML/CSV for registries and data
- Markdown for rationale and specifications
- Playwright-produced PNG/PDF for review outputs

A PNG is a review artifact, not the canonical design source.

## Validation

Before merging meaningful work, run the relevant test, type, schema, build, browser, accessibility, link, and traceability checks. Fix findings rather than waiving them unless the waiver is explicit, justified, and recorded.

## Completion

A task is not complete because files exist. It is complete when its acceptance criteria pass, its artifacts are registered, traceability is updated, review findings are resolved, and the result is integrated into the atlas.
