# Bootstrap scripts

These scripts are transparent reference implementations for the two-phase authentication flow. Codex must inspect them before execution and adapt only when current GitHub CLI/API behavior requires it.

1. `00-verify-owner-auth.ps1`
2. `01-owner-bootstrap.ps1`
3. mandatory stop and human account switch
4. `02-verify-and-accept-bot.ps1`

The owner bootstrap intentionally leaves the repository empty. The first commit belongs to `tiklebot`.
