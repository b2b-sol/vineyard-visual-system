# Official Platform References

Retrieved or verified 2026-07-13. Recheck current documentation before changing platform configuration.

## OpenAI Codex

- Models and Sol/Terra/Luna guidance: https://developers.openai.com/codex/models
- AGENTS.md layering and precedence: https://developers.openai.com/codex/guides/agents-md
- Subagents and project-scoped custom agents: https://developers.openai.com/codex/subagents
- Follow a persistent Goal: https://developers.openai.com/codex/use-cases/follow-goals/
- Codex prompting and Goal mode: https://developers.openai.com/codex/prompting
- Config basics and stable goal/multi-agent features: https://developers.openai.com/codex/config-basic
- Config reference: https://developers.openai.com/codex/config-reference
- Codex CLI: https://developers.openai.com/codex/cli

Key verified guidance:

- Default Power uses GPT-5.6 Sol; Sol is intended for ambiguous, difficult, high-value work; Terra for everyday work; Luna for clear repeatable work.
- Codex loads layered AGENTS instructions from root toward the current directory; closer instructions override broader ones.
- Project-scoped custom agent TOML files live under `.codex/agents/`.
- Goal mode supports persistent objectives and automatic continuation.

## GitHub

- GitHub Actions billing: https://docs.github.com/en/billing/concepts/product-billing/github-actions
- Merge queue: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue
- Auto-merge: https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request
- Repository roles: https://docs.github.com/organizations/managing-user-access-to-your-organizations-repositories/repository-roles-for-an-organization
- Collaborator REST API: https://docs.github.com/en/rest/collaborators/collaborators
- GitHub CLI authentication: https://cli.github.com/manual/gh_auth_login
- Account switching: https://cli.github.com/manual/gh_auth_switch
- Git credential setup: https://cli.github.com/manual/gh_auth_setup-git

Key verified guidance:

- Standard GitHub-hosted Actions runners are free for public repositories.
- Merge queues are available in public repositories owned by organizations.
- Required GitHub Actions checks must also listen to `merge_group` when a merge queue is used.
- Auto-merge waits for required checks and reviews.

## Figma

- Figma MCP server: https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server
- Import DTCG design tokens: https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables
- Code Connect: https://help.figma.com/hc/en-us/articles/23920389749655-Code-Connect

Key verified guidance:

- The remote Figma MCP server can create and modify native frames, components, variables, and auto-layout structures.
- Figma can import JSON design tokens following DTCG format.
- Code Connect bridges repository components and Figma components, subject to plan/seat availability.
