$ErrorActionPreference = "Stop"
$Org = "b2b-sol"

$ActiveUser = (gh api user --jq .login).Trim()
if (-not $ActiveUser) { throw "No active GitHub CLI identity." }

$Membership = gh api "orgs/$Org/memberships/$ActiveUser" | ConvertFrom-Json
if ($Membership.state -ne "active" -or $Membership.role -ne "admin") {
    throw "Active account '$ActiveUser' is not an active owner/admin of $Org. state=$($Membership.state), role=$($Membership.role)"
}

Write-Host "OWNER_AUTH_VERIFIED"
Write-Host "active_user=$ActiveUser"
Write-Host "organization=$Org"
Write-Host "state=$($Membership.state)"
Write-Host "role=$($Membership.role)"
