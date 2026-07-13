# Repository governance audit

Date: 2026-07-13

Repository: `b2b-sol/vineyard-visual-system`

## Verified foundation

- Active GitHub identity was exactly `tiklebot` before each write.
- Repository visibility is public and `tiklebot` has Admin permission.
- PR #1 merged the factory only after `quality`, `audit`, and `browser` passed on its exact head.
- PR #2 reconciled squash-merge provenance and passed the same three checks before merge.
- PR #3 entered the required merge queue after its pull-request checks passed.
- GitHub created merge-group commit `1bb54af303aab53542f5ccf0796ddd63fa54b843`; exact `quality`, `audit`, and `browser` checks all passed on the `merge_group` event.
- The queue squash-merged PR #3 as immutable main commit `1bb54af303aab53542f5ccf0796ddd63fa54b843` at `2026-07-13T23:55:58Z`.
- Main commit `1bb54af303aab53542f5ccf0796ddd63fa54b843` passed CI, repository audit, visual validation, and Pages deployment.
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

## Merge-queue proof

The queue-created checks were:

- `quality`: Actions run `29294400884`, passed;
- `audit`: Actions run `29294400889`, passed;
- `browser`: Actions run `29294400917`, passed, including 36 Mermaid renders and browser/accessibility validation.

This proves the active ruleset accepts an all-green one-entry merge group and delivers its squash to protected main. `GOV-001` is complete.
