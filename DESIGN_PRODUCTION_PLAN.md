# Design Production Plan

## Design objective

Create a serious, visually distinctive vineyard operations system whose structure is derived from work rather than generic dashboard conventions.

## Workflow-derived design principles

- Keep block and time context visible wherever an action can be misapplied.
- Distinguish planned, assigned, executing, reported complete, verified, reconciled, corrected, and superseded states.
- Surface restrictions before consequential actions.
- Make exceptions and stale information more visible than routine confirmations.
- Preserve historical truth when records are corrected.
- Keep mobile capture fast while preserving a path to defensible detail.
- Support high-density desktop review without turning everything into tables.
- Use maps as operational context, not decoration.
- Treat cross-organization identity mismatches as visible, resolvable entities.
- Use color as reinforcement, never the sole status signal.

## Required interaction patterns

- command overview and prioritized queues
- seasonal schedule and workload planning
- spatial block selection and layer controls
- observation capture with photos/location/phenology
- recommendation and approval chain
- application readiness and restriction checks
- assignment and crew brief
- completion/partial/deferred reporting
- verification and reopen
- maturity trends and pick-decision support
- harvest dispatch and load identity
- weigh-ticket/quality reconciliation
- audit trail and correction history
- offline queue and sync conflict
- corrective action and certification evidence

## High-fidelity state coverage

For consequential screens, render:

- default
- empty
- loading
- offline
- stale
- permission-restricted
- validation error
- partial completion
- blocked
- conflict
- awaiting approval/result
- corrected/superseded
- historical/read-only

## Component candidates

At minimum evaluate and implement the necessary subset of:

- organization/estate/ranch/vineyard/block selectors
- block identity and alias card
- block lineage panel
- map layer and legend controls
- observation marker/card
- work order and assignment card
- crew brief and completion verification
- recommendation/approval panel
- restriction badge and REI/PHI timeline
- application readiness panel
- material/rate table
- irrigation status and delivery verification
- crop estimate and revision card
- maturity sample panel and trend chart
- pick decision panel
- harvest load card
- weigh-ticket summary
- quality adjustment panel
- record audit trail
- corrective-action card
- offline queue and sync conflict panel
- exception banner
- operational timeline
- season calendar
- dense review table
- status/severity chips

## Asset policy

Image generation may support mood boards, visual-direction studies, textures, illustrations, and isolated decorative assets. Generated imagery cannot define workflow structure, forms, tables, data hierarchy, or interaction states. Canonical icons and map symbols should be SVG.

## Review artifacts

For every workflow package produce:

- review contact sheet
- low/high-fidelity comparison
- normal/exception state comparison
- mobile/desktop comparison
- interaction annotation sheet
- critic findings and resolution table

## Distinctiveness test

A final reviewer should be able to remove logos and still identify the system as vineyard operations software because of its information model, spatial language, seasonal structure, record semantics, and workflow-specific components—not because grape leaves were added to generic UI.
