$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $true
$Org = "b2b-sol"
$Repo = "vineyard-visual-system"
$Bot = "tiklebot"
$Full = "$Org/$Repo"

$ActiveUser = (gh api user --jq .login).Trim()
if ($LASTEXITCODE -ne 0 -or $ActiveUser -ne $Bot) { throw "Active GitHub user must be '$Bot'; got '$ActiveUser'." }

$InvitationRaw = gh api user/repository_invitations
if ($LASTEXITCODE -ne 0) { throw "Unable to list repository invitations for $Bot." }
$Invitations = @($InvitationRaw | ConvertFrom-Json)
$Invite = $Invitations | Where-Object { $_.repository.full_name -eq $Full } | Select-Object -First 1
if ($Invite) {
    gh api -X PATCH "user/repository_invitations/$($Invite.id)" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Unable to accept repository invitation $($Invite.id)." }
    Write-Host "Accepted repository invitation $($Invite.id)."
}

$Permission = gh api "repos/$Full/collaborators/$Bot/permission" | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw "Unable to verify repository permission." }
if ($Permission.permission -ne "admin" -and -not $Permission.user.permissions.admin) {
    throw "tiklebot does not have effective admin permission on $Full."
}

gh auth setup-git
if ($LASTEXITCODE -ne 0) { throw "gh auth setup-git failed." }
gh config set git_protocol https --host github.com
if ($LASTEXITCODE -ne 0) { throw "Unable to set GitHub CLI git protocol." }

Write-Host "BOT_AUTH_VERIFIED"
Write-Host "active_user=$ActiveUser"
Write-Host "repository=$Full"
Write-Host "permission=$($Permission.permission)"
Write-Host "Codex may now execute the Master Goal."
