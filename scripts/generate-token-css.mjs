import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import prettier from "prettier";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(
  root,
  "design-system",
  "tokens",
  "vineyard.tokens.json",
);
const outputPath = path.join(root, "design-system", "tokens", "vineyard.css");

export function collectTokens(document) {
  const tokens = new Map();

  function visit(node, parts = [], inheritedType = null) {
    if (!node || typeof node !== "object" || Array.isArray(node)) return;
    const type = node.$type ?? inheritedType;
    if (Object.hasOwn(node, "$value")) {
      tokens.set(parts.join("."), { type, value: node.$value, node });
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith("$")) continue;
      visit(child, [...parts, key], type);
    }
  }

  visit(document);
  return tokens;
}

export function createResolver(tokens) {
  const cache = new Map();
  const resolving = new Set();

  function resolve(tokenPath) {
    if (cache.has(tokenPath)) return cache.get(tokenPath);
    if (!tokens.has(tokenPath))
      throw new Error(`Unknown token reference: ${tokenPath}`);
    if (resolving.has(tokenPath))
      throw new Error(`Circular token reference: ${tokenPath}`);
    resolving.add(tokenPath);
    const token = tokens.get(tokenPath);
    const match =
      typeof token.value === "string"
        ? token.value.match(/^\{([^}]+)\}$/)
        : null;
    const resolved = match
      ? resolve(match[1])
      : { type: token.type, value: token.value };
    resolving.delete(tokenPath);
    cache.set(tokenPath, resolved);
    return resolved;
  }

  return resolve;
}

function cssName(tokenPath) {
  return `--${tokenPath.replaceAll(".", "-")}`;
}

function tokenToCss(tokenPath, token, resolve) {
  const alias =
    typeof token.value === "string" ? token.value.match(/^\{([^}]+)\}$/) : null;
  return alias ? `var(${cssName(alias[1])})` : valueToCss(resolve(tokenPath));
}

function dimensionToCss(value) {
  return `${value.value}${value.unit}`;
}

export function valueToCss({ type, value }) {
  if (type === "color") return value.hex;
  if (type === "dimension" || type === "duration") return dimensionToCss(value);
  if (type === "fontFamily") {
    const families = Array.isArray(value) ? value : [value];
    return families
      .map((family) => (/\s/.test(family) ? `"${family}"` : family))
      .join(", ");
  }
  if (type === "fontWeight" || type === "number") return String(value);
  if (type === "cubicBezier") return `cubic-bezier(${value.join(", ")})`;
  if (type === "shadow") {
    return `${dimensionToCss(value.offsetX)} ${dimensionToCss(value.offsetY)} ${dimensionToCss(value.blur)} ${dimensionToCss(value.spread)} ${value.color.hex}`;
  }
  throw new Error(`No CSS projection for token type ${type}`);
}

const compatibility = {
  "color-ink-950": "ref.color.ink.950",
  "color-ink-800": "ref.color.ink.800",
  "color-ink-650": "ref.color.ink.650",
  "color-ink-500": "ref.color.ink.500",
  "color-ink-300": "ref.color.ink.300",
  "color-paper-0": "ref.color.mineral.0",
  "color-paper-50": "ref.color.mineral.50",
  "color-paper-100": "ref.color.mineral.100",
  "color-paper-200": "ref.color.mineral.200",
  "color-paper-300": "ref.color.mineral.300",
  "color-vine-900": "ref.color.vine.900",
  "color-vine-700": "ref.color.vine.700",
  "color-vine-500": "ref.color.vine.500",
  "color-vine-300": "ref.color.vine.300",
  "color-vine-100": "ref.color.vine.100",
  "color-harvest-700": "ref.color.clay.700",
  "color-harvest-500": "ref.color.clay.500",
  "color-harvest-100": "ref.color.clay.100",
  "color-sun-700": "ref.color.amber.700",
  "color-sun-500": "ref.color.amber.500",
  "color-sun-100": "ref.color.amber.100",
  "color-sky-700": "ref.color.water.700",
  "color-sky-500": "ref.color.water.500",
  "color-sky-100": "ref.color.water.100",
  "font-display": "ref.font.family.display",
  "font-body": "ref.font.family.ui",
  "font-mono": "ref.font.family.mono",
  "space-1": "ref.space.1",
  "space-2": "ref.space.2",
  "space-3": "ref.space.3",
  "space-4": "ref.space.4",
  "space-5": "ref.space.5",
  "space-6": "ref.space.6",
  "space-8": "ref.space.8",
  "space-10": "ref.space.10",
  "space-12": "ref.space.12",
  "radius-sm": "ref.radius.sm",
  "radius-md": "ref.radius.md",
  "radius-lg": "ref.radius.lg",
  "radius-xl": "ref.radius.xl",
  "radius-round": "ref.radius.round",
  "shadow-raised": "ref.shadow.raised",
  "size-touch-target": "sys.density.comfortable.control",
  "size-sidebar": "sys.size.sidebar",
  "size-content-max": "sys.size.contentMax",
  "motion-quick": "ref.motion.duration.quick",
  "motion-standard": "ref.motion.duration.standard",
};

export async function renderCss(document) {
  const tokens = collectTokens(document);
  const resolve = createResolver(tokens);
  const lines = [
    "/* Generated from vineyard.tokens.json. Run npm run generate:tokens; do not edit. */",
    ":root {",
    "  color-scheme: light;",
  ];

  for (const tokenPath of [...tokens.keys()].sort()) {
    lines.push(
      `  ${cssName(tokenPath)}: ${tokenToCss(tokenPath, tokens.get(tokenPath), resolve)};`,
    );
  }
  lines.push("");
  lines.push(
    "  /* Compatibility aliases retained while the atlas migrates to semantic names. */",
  );
  for (const [name, tokenPath] of Object.entries(compatibility)) {
    lines.push(`  --${name}: var(${cssName(tokenPath)});`);
  }
  lines.push("  --control-size: var(--sys-density-comfortable-control);");
  lines.push("}");
  lines.push("");
  lines.push(
    '[data-density="compact"] { --control-size: var(--sys-density-compact-control); }',
  );
  lines.push(
    '[data-density="field"] { --control-size: var(--sys-density-field-control); }',
  );
  lines.push("");
  lines.push("@media (prefers-reduced-motion: reduce) {");
  lines.push("  :root { --motion-quick: 0ms; --motion-standard: 0ms; }");
  lines.push("}");
  lines.push("");
  return prettier.format(`${lines.join("\n")}\n`, { parser: "css" });
}

async function main() {
  const document = JSON.parse(await readFile(sourcePath, "utf8"));
  const expected = await renderCss(document);
  if (process.argv.includes("--check")) {
    const actual = await readFile(outputPath, "utf8");
    if (actual !== expected) {
      throw new Error(
        "Generated token CSS is stale. Run npm run generate:tokens.",
      );
    }
    console.log("Token CSS is current.");
    return;
  }
  await writeFile(outputPath, expected, "utf8");
  console.log(`Generated ${path.relative(root, outputPath)}.`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main();
}
