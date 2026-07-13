# Figma Future Compatibility

Figma is a future production and collaboration destination, not a launch dependency. The repository must preserve enough structure for a future Codex/Figma MCP agent to create native Figma frames, variables, components, auto-layout structures, FigJam diagrams, and Code Connect mappings.

## Required Figma bundle

```text
figma/
  README.md
  import-manifest.json
  token-map.json
  component-map.json
  screen-map.json
  prototype-map.json
  export-index.json
  migration-checklist.md
  mcp-handoff-prompt.md
  code-connect/
  exports/
    tokens/
    icons/
    diagrams/
    screens/
    review-sheets/
```

## Token requirements

- Export design tokens as JSON following the Design Tokens Community Group format.
- Use semantic token names rather than component-specific raw color names.
- Represent modes/themes in a way that maps to Figma variable modes.
- Include raw and semantic layers where useful.
- Validate token references and cycles.

## Component requirements

Every reusable component should have:

- stable component ID
- code path and export name
- Figma-intended component name
- properties/variants/states
- token dependencies
- supported screen IDs
- content constraints
- auto-layout intent
- accessibility notes

## Screen requirements

Every screen should have:

- stable screen ID
- frame name
- platform and dimensions
- route or prototype entry
- component composition
- state variants
- source screenshot/export paths
- workflow/scenario links

## Asset requirements

- SVG canonical icons and map symbols
- SVG diagrams where possible
- standardized PNG previews
- print/PDF review sheets
- clean filenames and stable asset IDs
- no flattened-only canonical screens

## Future MCP handoff

The final `figma/mcp-handoff-prompt.md` should tell a future agent to:

1. Read the approved design system, tokens, component map, and screen map.
2. Connect to or create the target Figma file.
3. Import/create variable collections and modes.
4. Build native components and variants with auto layout.
5. Create workflow screens using those components.
6. Create FigJam workflow boards from canonical diagrams.
7. Validate against rendered repository screenshots.
8. Add Code Connect mappings where the user’s Figma plan supports them.

## Code Connect readiness

Place mappings and configuration stubs under `figma/code-connect/`. Do not require Code Connect for project completion because availability depends on Figma plan and seat, but ensure the React component architecture and stable IDs make later mapping straightforward.
