# Project Context and Confirmed Decisions

This document contains the decisions made before execution. Treat them as settled unless a direct later instruction changes them.

## User intent

The owner wants to inspect the completed repository after Codex has executed the visual-production plan in its entirety. The owner does not intend to sit at the computer approving intermediate design decisions.

## Confirmed choices

- Use Codex Goal mode for long-running execution.
- Use the newest available Sol frontier model for master orchestration, judgment-heavy design, adjudication, integration, and final acceptance.
- Use subagents for bounded parallel work.
- Use layered `AGENTS.md` files and project-scoped custom agent configurations.
- Use GitHub for durable state, history, issues, pull requests, CI, Pages, auto-merge, and merge queue.
- The public repository is `b2b-sol/vineyard-visual-system`.
- The organization owner account is used only for the initial repository/bootstrap authority step.
- `tiklebot` performs the long-running work and should own commits, branches, pull requests, reviews, merges, releases, and routine repository administration.
- Standard GitHub Actions on the public repository may be used for deterministic CI and deployment.
- Do not put owner or bot credentials in files, prompts, logs, Actions secrets, or commits.
- Figma is not required to begin, but the finished repository must be directly usable by future Figma MCP and Code Connect workflows.
- The code-first visual atlas is the canonical editable design source during this project.
- The supplied vineyard workflow-discovery report is the foundational operational source.
- Operational uncertainty should be labeled and propagated, not used to stop progress.
- No paid external API is required to complete the repository.

## Human interruption policy

The only planned human interruption is the GitHub account switch after the owner bootstrap checkpoint. External authentication or account-permission failures may create a genuine blocker. Product, design, content, technical, and workflow choices are autonomous.

## Definition of “visual materials”

Visual materials include operational diagrams, journeys, wireframes, high-fidelity product screens, prototypes, design tokens, components, maps, chart patterns, state variants, review sheets, and construction specifications. Flat generated images alone are insufficient; canonical source must remain structured and editable.
