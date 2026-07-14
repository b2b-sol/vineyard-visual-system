# Figma-ready bundle

The canonical product remains code-first. These structured maps preserve stable token, component, screen, and prototype identities so a future Figma library can be imported without reinterpreting the product model.

- `token-map.json` maps every DTCG token leaf to a stable Figma variable name and pins the current token/CSS source digest.
- `component-map.json` maps the 27 WAVE-001 public `CMP-*` contracts to code paths, exports, Figma keys, and exact screen support.
- `screen-map.json` maps all 13 WAVE-001 `SCR-*` contracts to canonical routes, review states, code, and stable frame names.
- `prototype-map.json` maps `FLW-001`, `FLW-007`, and linked-evidence `FLW-015` to canonical routes and the product-flow sequence source.

`pending` is an explicit non-implementation state, not a passing claim. `npm run generate:wave-001-contracts` promotes a code/export map to `implemented` only when its canonical registry status, source file, named export, and stable component ID agree. `npm run validate:wave-001` rejects missing, extra, unresolved, or stale mappings; complete mode also requires all implementation maps, captures, and independent reviews to pass.

Use stable IDs and names as import keys. Do not replace them with Figma node IDs in canonical sources. Exported or Code Connect artifacts belong under `exports/` and `code-connect/` and remain derivative of these maps.
