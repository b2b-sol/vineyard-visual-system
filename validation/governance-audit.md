# Repository governance audit

Date: 2026-07-13

Repository: `b2b-sol/vineyard-visual-system`

## Verified foundation

- Active GitHub identity was exactly `tiklebot` before each write.
- Repository visibility is public and `tiklebot` has Admin permission.
- PR #1 merged the factory only after `quality`, `audit`, and `browser` passed on its exact head.
- PR #2 reconciled squash-merge provenance and passed the same three checks before merge.
- Main commit `3dcc6c59582bfe2da9ad3c36a00d734365678375` passed CI, repository audit, visual validation, and Pages deployment.
- The public atlas returned HTTP 200, rendered the canonical `FIX-001` route, and emitted no browser console or page errors at `https://b2b-sol.github.io/vineyard-visual-system/#/screens/SCR-001`.

## Active main ruleset

GitHub repository ruleset `18897256`, **Protected main delivery**, is active for the default branch with no bypass actors. GitHub's effective branch-rules endpoint confirms these controls apply:

- branch deletion blocked;
- non-fast-forward updates blocked;
- linear history required;
- pull requests required, with squash as the only merge method;
- review threads must be resolved;
- exact required checks: `quality`, `audit`, and `browser`;
- strict latest-code status policy;
- merge queue with `ALLGREEN`, squash, one-entry groups, and a 20-minute check timeout.

## Remaining governance proof

`GOV-001` remains in progress until this branch enters the merge queue and GitHub creates a successful `merge_group` run for all three required checks. After that proof, the task can cite the resulting immutable main commit and close.
