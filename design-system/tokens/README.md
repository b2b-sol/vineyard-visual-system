# Vineyard design tokens

`vineyard.tokens.json` is the canonical DTCG 2025.10 source for the selected Canopy Signal / sunlit fieldbook foundation. `vineyard.css` is generated and must not be edited manually.

## Layers

- `ref.*` records context-free facts: palette, typography, space, radius, motion, and elevation.
- `sys.*` records semantic meaning: canvas, surfaces, text, borders, focus, feedback, density, and product dimensions.
- `component.*` aliases semantics only after a lighthouse composition proves a recurring component need. Stable `CMP-*` and Figma metadata live in `$extensions`.

The initial modes are compact, comfortable, and field density. A global dark theme is intentionally absent; future low-light work requires night-harvest workflow evidence.

## Commands

```sh
npm run generate:tokens
npm run validate:tokens
npm run validate:tokens-current
```

The validator checks DTCG value shapes, aliases, layer direction, missing references, cycles, supported weights and units, contrast-pair schema, measured WCAG ratios, density modes, `CMP-*`/Figma mappings, lighthouse-proven component aliases, and the selected route's semantic token bindings. Generated CSS preserves alias references, and the currentness check fails if its projection drifts from the source.

## Accessibility contract

- Normal text: at least 4.5:1.
- Large text, boundaries, meaningful graphics, and focus: at least 3:1.
- Field identity, primary text, and consequential actions: internal target 7:1.
- Field controls: 52 px. Comfortable controls: 44 px. Compact controls: 40 px.
- Status always combines label, symbol/shape, and semantic color.
- Opacity is not used to create semantic text colors.

`contrast-pairs.json` records the permitted foreground/background contexts and mechanically measured floors.
