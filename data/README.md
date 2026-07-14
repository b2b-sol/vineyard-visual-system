# Connected synthetic season

This directory contains two complementary datasets:

- `walking-slice.json` is the small, hand-reviewable regression fixture used by the first executable workflow slice.
- `operation.json`, `events.json`, and `exceptions.json` are generated views of one connected 2026 California North Coast composite season.

Every organization, person, property, contract, measurement, and history is fictional. The data is designed to exercise operational product behavior; it is not legal, agronomic, labor, pesticide, certification, accounting, or commercial advice.

## Canonical generated documents

`operation.json` holds stable identities, organization and contract relationships, block aliases and lineage, role assignments, scopes, resources, workflow instances, record instances, typed links, overlay applications, and harvest-to-settlement chains.

`events.json` is the append-only state-transition ledger. Each event resolves to one transition in `workflow-model/workflows.json`, names the acting role assignment, preserves capture and synchronization context, and links the records, decisions, and exception histories involved.

`exceptions.json` preserves interruption, escalation, recovery, correction, and closure histories. It never replaces an earlier event or record with a corrected current value.

The JSON schemas in `schemas/` define document structure. `scripts/validation/season-data.mjs` enforces graph semantics such as reference integrity, transition ownership, chronology, units, alias periods, supersession, coverage floors, and cross-workflow continuity.

## Reproduction

The checked-in generated files are deterministic. Regenerate them with:

```powershell
npm run generate:data
```

Verify that checked-in output still matches the fixed seed and current canonical workflow model with:

```powershell
npm run validate:data-current
npm run validate:data
```

Do not hand-edit generated JSON. Change the generator or its explicit source contracts, regenerate, then review the diff.

## Time and units

The season is stored with ISO 8601 timestamps and explicit Pacific offsets. Quantities always carry a stable `UNT-*` identifier; unit definitions declare their dimension and conversion to a base unit. Offline capture, delayed synchronization, stale information, and conflicts remain visible as data rather than being normalized away.

## Stable identities and corrections

`BLK-*` identifiers remain stable when names differ among vineyard, winery, compliance, and accounting systems. `BLA-*` aliases carry effective periods, while `LIN-*` records preserve splits, combinations, and renames without rewriting older references.

Corrections use attributable `COR-*` entries and version increments. Record supersession is an explicit reciprocal link in the generated season; the schema also supports explicitly linked exception reopening when a future case requires it. Product screens and audits can therefore show what was known, when it was known, who changed it, and why without implying that every supported history shape occurs in this one season.
