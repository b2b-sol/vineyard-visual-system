# START HERE — Codex Master Packet

## Your immediate instruction

Read this file completely, then read the documents in the order below. Execute the project as a persistent Codex Goal.

**There are two execution phases separated by a mandatory human authentication checkpoint.**

### Phase A — owner-authenticated bootstrap

The currently active GitHub account is the owner of the `b2b-sol` organization. During this phase you may only:

1. Verify the active GitHub identity and organization-owner authority.
2. Create the empty public repository `b2b-sol/vineyard-visual-system` if it does not exist.
3. Configure safe initial repository settings.
4. Invite `tiklebot` with repository `admin` permission.
5. Write `OWNER_BOOTSTRAP_COMPLETE.md` in this local packet workspace.
6. Stop completely and report that the authentication checkpoint has been reached.

Do **not** initialize the Git repository, push a commit, create implementation files in GitHub, or begin the visual-system work while the owner account is active.

Run `bootstrap/00-verify-owner-auth.ps1`, inspect it first, then run `bootstrap/01-owner-bootstrap.ps1` or perform equivalent commands manually if the environment requires adaptation.

### Mandatory stop

After `OWNER_BOOTSTRAP_COMPLETE.md` exists, stop. The human owner will return, remove or deactivate the owner GitHub CLI session, authenticate `tiklebot`, and explicitly tell you to continue.

### Phase B — bot-authenticated autonomous execution

After continuation is explicitly authorized:

1. Verify the active GitHub user is exactly `tiklebot`.
2. Accept the repository invitation if still pending.
3. Verify `tiklebot` has `admin` permission on `b2b-sol/vineyard-visual-system`.
4. Configure repository-local Git author identity for `tiklebot`.
5. Initialize or clone the repository and copy this packet into it.
6. Commit and push the initial project packet as `tiklebot`.
7. Execute the complete master goal until every Definition of Done check passes.

Run `bootstrap/02-verify-and-accept-bot.ps1`, inspect it first, then continue.

## Read order

1. `MASTER_GOAL.md`
2. `PROJECT_CONTEXT.md`
3. `AGENTS.md`
4. `AUTH_AND_GITHUB_PROTOCOL.md`
5. `EXECUTION_PROTOCOL.md`
6. `AUTONOMOUS_DECISION_POLICY.md`
7. `MODEL_AND_AGENT_STRATEGY.md`
8. `REPOSITORY_SPEC.md`
9. `VISUAL_ATLAS_SPEC.md`
10. `WORKFLOW_PRODUCTION_PLAN.md`
11. `DESIGN_PRODUCTION_PLAN.md`
12. `FIGMA_FUTURE_COMPATIBILITY.md`
13. `QUALITY_GATES.md`
14. `DEFINITION_OF_DONE.md`
15. `ASSUMPTIONS_AND_RISKS.md`
16. `source/Vineyard-Workflow-Discovery-report.md`
17. `control/TASK_REGISTRY.yaml`
18. `control/PROJECT_STATE.yaml`

## Master Goal command

After the bot checkpoint is complete, use this as the persistent Goal:

> Execute `MASTER_GOAL.md` in its entirety. Build the finished public repository `b2b-sol/vineyard-visual-system`, using the workflow-discovery report as the operational source of truth. Work autonomously, delegate bounded work to configured subagents, maintain durable project state, use pull requests and automated quality gates after the initial scaffold, and continue until every requirement in `DEFINITION_OF_DONE.md` passes. Do not stop after creating a framework, sample, plan, or partial design library.

## Authority order

When instructions conflict, use this order:

1. Direct human instruction issued after this packet.
2. `MASTER_GOAL.md` and `DEFINITION_OF_DONE.md`.
3. `source/Vineyard-Workflow-Discovery-report.md` for operational truth.
4. Approved workflow registries and traceability records created during execution.
5. `AUTONOMOUS_DECISION_POLICY.md`.
6. Other packet documents.
7. Local conventions inferred by Codex.

## Non-negotiable behavior

- The authentication checkpoint is the only expected human interruption.
- Preserve credentials and secrets. Never print, extract, copy, log, or commit tokens.
- Do not ask for aesthetic, architectural, workflow, or routine product approvals.
- Resolve uncertainty through evidence, independent agents, explicit assumptions, and quality gates.
- Keep all progress durable in the repository so execution can resume after interruption, context compaction, model changes, or machine restart.
- The end result must be a polished, browsable, code-first visual atlas and complete visual construction library, not merely documentation describing one.
