# Authentication and GitHub Protocol

## Security model

GitHub CLI browser authentication lets the agent use GitHub without receiving a password or 2FA code. The token is normally stored by the operating system credential store. Because Codex has full control of the same PC account, this is not a hard cryptographic boundary. Operational policy therefore separates the owner and bot sessions in time and forbids token-revealing commands.

## Phase A — owner bootstrap

### Preconditions

- `gh api user --jq .login` returns the Pro account that owns `b2b-sol`.
- `gh api orgs/b2b-sol/memberships/<login>` reports `state: active` and `role: admin`.

### Allowed actions

1. Create `b2b-sol/vineyard-visual-system` as a public repository if absent.
2. Enable Issues and safe merge settings.
3. Disable the wiki unless the agent finds a project-specific reason to retain it.
4. Enable squash merging, auto-merge, and automatic deletion of merged branches.
5. Invite `tiklebot` with repository `admin` permission.
6. Record the exact result in local `OWNER_BOOTSTRAP_COMPLETE.md`.
7. Stop.

### Prohibited during owner phase

- Initializing or pushing the repository content
- Writing commits under the owner identity
- Starting the implementation goal
- Keeping both owner and bot credentials intentionally active for the long-running phase
- Revealing tokens through environment, `gh auth token`, credential-manager inspection, logs, or diagnostic dumps

### Expected commands

The supplied PowerShell scripts are reference implementations. Inspect and adapt rather than blindly executing if CLI behavior differs.

Repository creation:

```powershell
 gh repo create b2b-sol/vineyard-visual-system --public --description "Workflow-grounded visual system and product atlas for a vineyard information system" --disable-wiki
```

Repository settings:

```powershell
 gh api -X PATCH repos/b2b-sol/vineyard-visual-system `
   -F has_issues=true `
   -F has_projects=true `
   -F has_wiki=false `
   -F allow_squash_merge=true `
   -F allow_merge_commit=false `
   -F allow_rebase_merge=false `
   -F allow_auto_merge=true `
   -F delete_branch_on_merge=true
```

Invite bot as admin:

```powershell
 gh api -X PUT repos/b2b-sol/vineyard-visual-system/collaborators/tiklebot -f permission=admin
```

The invitation may remain pending until `tiklebot` accepts it.

## Checkpoint contract

`OWNER_BOOTSTRAP_COMPLETE.md` must contain:

- Timestamp
- Active owner login
- Organization membership result
- Repository URL and visibility
- Repository settings applied
- Invitation result for `tiklebot`
- Explicit statement: `SAFE_TO_SWITCH_TO_BOT: yes`
- Explicit statement: `IMPLEMENTATION_STARTED: no`

Then stop and wait for the human to switch authentication.

## Phase B — bot execution

### Required identity

```powershell
 gh api user --jq .login
```

Must return exactly:

```text
 tiklebot
```

### Accept invitation

List pending repository invitations, find `b2b-sol/vineyard-visual-system`, then accept it:

```powershell
 gh api user/repository_invitations
 gh api -X PATCH user/repository_invitations/<INVITATION_ID>
```

### Verify permission

```powershell
 gh api repos/b2b-sol/vineyard-visual-system/collaborators/tiklebot/permission
```

The effective permission must be `admin`.

### Configure Git

Run:

```powershell
 gh auth setup-git
 gh config set git_protocol https --host github.com
```

Set repository-local author identity after the repository exists. Obtain the bot account ID and login from GitHub. If the account exposes no email, use the GitHub-supported no-reply pattern `<id>+<login>@users.noreply.github.com`.

### Initial repository creation

The bot owns the initial commit. Copy the packet into the repository, preserving `source/`, `control/`, `schemas/`, `templates/`, `prompts/`, `.codex/`, and bootstrap records. Commit and push as `tiklebot`.

## Repository governance rollout

The first bot commit establishes CI workflows. Once required check names have successfully reported at least once:

1. Create a `main` ruleset or branch protection.
2. Require pull requests.
3. Require deterministic CI checks.
4. Require the merge queue.
5. Configure Actions workflows to run on both `pull_request` and `merge_group` events.
6. Require zero human review approvals.
7. Use squash merging.
8. Preserve an owner recovery path.

If a GitHub feature is unavailable or API behavior changed, verify current official documentation, choose the closest robust equivalent, and record the capability decision. Do not weaken all controls because one optional feature differs.

## GitHub Actions identity

Actions should use the automatically scoped `GITHUB_TOKEN` with least privilege. Do not place owner or bot CLI credentials into Actions secrets. Model-powered Actions are outside the required core; deterministic build, test, screenshot, audit, and Pages workflows are sufficient.
