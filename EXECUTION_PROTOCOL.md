# Autonomous Execution Protocol

## Operating state machine

```text
AWAITING_OWNER_BOOTSTRAP
→ OWNER_BOOTSTRAP_COMPLETE
→ AWAITING_BOT_AUTH
→ BOT_AUTH_VERIFIED
→ REPOSITORY_INITIALIZED
→ FACTORY_OPERATIONAL
→ WORKFLOW_MODEL_COMPLETE
→ PRODUCT_MODEL_COMPLETE
→ DESIGN_LIBRARY_COMPLETE
→ CONSTRUCTION_PACKETS_COMPLETE
→ FINAL_AUDIT
→ COMPLETE
```

`control/PROJECT_STATE.yaml` is the canonical machine-readable state.

## Persistent-goal behavior

- Work continuously toward the Master Goal after bot authentication.
- Break the project into resumable tasks in `control/TASK_REGISTRY.yaml`.
- Spawn bounded subagents for parallel work.
- Integrate their outputs into the repository; subagent prose alone is not an artifact.
- Update state and commit at every meaningful milestone.
- Keep one explicit `next_task` that can be executed immediately after restart.
- Detect and repair partial work rather than starting the phase over.

## Task lifecycle

```text
planned → ready → in_progress → review → revise → validated → merged → complete
```

Additional states:

```text
blocked_external | blocked_internal | superseded | cancelled
```

Only a blocker requiring external credentials, account action, unavailable proprietary source material, or a direct human business decision may use `blocked_external`. Design uncertainty is not an external blocker.

## Branch and PR protocol

After the initial scaffold:

1. Create one branch or worktree per coherent task package.
2. Use stable task identifiers in branch names and PR titles.
3. Run local checks before opening the PR.
4. Open the PR as `tiklebot`.
5. Have independent review agents inspect source fidelity, UX/design, and implementation quality as applicable.
6. Resolve substantive findings.
7. Enable auto-merge or add the PR to the merge queue.
8. Update task and manifest state after merge.

Avoid hundreds of tiny PRs that add coordination overhead without isolation value. Prefer complete reviewable workflow slices.

## Autonomous review loop

For high-impact artifacts:

```text
creator A + creator B
→ critic
→ adjudicator/integrator
→ rendered validation
→ traceability audit
→ merge
```

For routine implementation:

```text
worker
→ targeted critic
→ tests/browser validation
→ merge
```

## Recovery protocol

At the beginning of every resumed session:

1. Verify active GitHub identity.
2. Read `control/PROJECT_STATE.yaml`.
3. Read `control/TASK_REGISTRY.yaml` for `in_progress`, `review`, and `blocked_internal` work.
4. Inspect Git status, branches, open PRs, Actions, and merge queue.
5. Reconcile repository state with control files.
6. Resume `next_task`.

## Progress reporting

Maintain:

- `control/PROJECT_STATE.yaml`
- `control/MASTER_MANIFEST.yaml`
- `control/TASK_REGISTRY.yaml`
- `control/DECISION_LOG.md`
- `control/ASSUMPTION_REGISTER.yaml`
- `control/BLOCKERS.yaml`
- `validation/COMPLETION_REPORT.md`

The final repository should explain its own current state without relying on a Codex conversation transcript.
