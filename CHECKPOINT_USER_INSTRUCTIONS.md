# Authentication Checkpoint — Human Instructions

Codex will stop after writing `OWNER_BOOTSTRAP_COMPLETE.md`. At that point, return to the planning conversation for guided account switching, or use the following outline only after confirming the checkpoint file says `SAFE_TO_SWITCH_TO_BOT: yes` and `IMPLEMENTATION_STARTED: no`.

1. Remove or deactivate the owner account from the GitHub CLI environment used by Codex.
2. Authenticate GitHub CLI through the browser as `tiklebot`.
3. Verify `gh api user --jq .login` returns `tiklebot`.
4. Give Codex `PROMPT_TO_RESUME_AFTER_BOT_AUTH.txt`.

The supplied bot bootstrap script will accept the repository invitation and verify admin permission. Never paste a token into Codex or the repository.
