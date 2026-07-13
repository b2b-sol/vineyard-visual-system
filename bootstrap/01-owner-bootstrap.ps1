$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $true
$Org = "b2b-sol"
$Repo = "vineyard-visual-system"
$Bot = "tiklebot"
$Full = "$Org/$Repo"
$Checkpoint = Join-Path (Split-Path $PSScriptRoot -Parent) "OWNER_BOOTSTRAP_COMPLETE.md"

$ActiveUser = (gh api user --jq .login).Trim()
if ($LASTEXITCODE -ne 0 -or -not $ActiveUser) { throw "Unable to identify the active GitHub user." }
$Membership = gh api "orgs/$Org/memberships/$ActiveUser" | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or $Membership.state -ne "active" -or $Membership.role -ne "admin") {
    throw "Active account '$ActiveUser' is not an active organization owner."
}

$RepoProbe = gh repo view $Full --json nameWithOwner,visibility,url 2>$null
$repoExists = ($LASTEXITCODE -eq 0)
if (-not $repoExists) {
    gh repo create $Full --public --description "Workflow-grounded visual system and product atlas for a vineyard information system" --disable-wiki
    if ($LASTEXITCODE -ne 0) { throw "Repository creation failed." }
}

# Safe initial repository settings. No commit or implementation is created in this phase.
gh api -X PATCH "repos/$Full" `
  -F has_issues=true `
  -F has_projects=true `
  -F has_wiki=false `
  -F allow_squash_merge=true `
  -F allow_merge_commit=false `
  -F allow_rebase_merge=false `
  -F allow_auto_merge=true `
  -F delete_branch_on_merge=true | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Repository settings update failed." }

# Invite or update the bot's direct repository permission.
gh api -X PUT "repos/$Full/collaborators/$Bot" -f permission=admin | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Unable to invite $Bot with admin permission." }

$RepoInfo = gh repo view $Full --json nameWithOwner,visibility,url | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw "Unable to verify repository after creation." }
$Pending = @()
$PendingRaw = gh api "repos/$Full/invitations" 2>$null
if ($LASTEXITCODE -eq 0 -and $PendingRaw) {
    $Pending = @($PendingRaw | ConvertFrom-Json | Where-Object { $_.invitee.login -eq $Bot })
}
$PendingText = if ($Pending.Count -gt 0) { "yes (invitation id $($Pending[0].id))" } else { "not listed; bot may already have access" }
$Now = (Get-Date).ToString("o")

@"
# Owner Bootstrap Complete

- timestamp: $Now
- active_owner_login: $ActiveUser
- organization: $Org
- organization_state: $($Membership.state)
- organization_role: $($Membership.role)
- repository: $($RepoInfo.nameWithOwner)
- visibility: $($RepoInfo.visibility)
- url: $($RepoInfo.url)
- bot: $Bot
- bot_invitation_pending: $PendingText
- repository_settings: issues enabled; wiki disabled; squash enabled; auto-merge enabled; merged branches auto-delete
- SAFE_TO_SWITCH_TO_BOT: yes
- IMPLEMENTATION_STARTED: no

## Mandatory next action

Stop Codex. The human must remove/deactivate the owner GitHub CLI session and authenticate `tiklebot`. Resume only after an explicit instruction to continue.
"@ | Set-Content -Path $Checkpoint -Encoding utf8

Write-Host "OWNER_BOOTSTRAP_COMPLETE"
Write-Host "checkpoint=$Checkpoint"
Write-Host "STOP NOW. DO NOT BEGIN IMPLEMENTATION."
