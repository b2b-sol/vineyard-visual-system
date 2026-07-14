import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import {
  collectTokens,
  createResolver,
  valueToCss,
} from "../generate-token-css.mjs";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const tokenPath = path.join(
  root,
  "design-system",
  "tokens",
  "vineyard.tokens.json",
);
const pairsPath = path.join(
  root,
  "design-system",
  "tokens",
  "contrast-pairs.json",
);
const pairsSchemaPath = path.join(
  root,
  "schemas",
  "design-token-contrast-pairs.schema.json",
);
const componentRegistryPath = path.join(
  root,
  "product-structure",
  "component-requirements.json",
);
const visualCssPath = path.join(root, "atlas", "src", "visual-directions.css");
let assertions = 0;

function assert(condition, message) {
  assertions += 1;
  if (!condition) throw new Error(message);
}

function validateDimension(value, tokenName) {
  assert(
    value && typeof value === "object",
    `${tokenName} must use an object dimension value.`,
  );
  assert(
    Number.isFinite(value.value),
    `${tokenName} dimension value must be numeric.`,
  );
  assert(
    ["px", "rem"].includes(value.unit),
    `${tokenName} dimension unit must be px or rem.`,
  );
}

function validateColor(value, tokenName) {
  assert(value?.colorSpace === "srgb", `${tokenName} must use sRGB.`);
  assert(
    Array.isArray(value.components) && value.components.length === 3,
    `${tokenName} needs three sRGB components.`,
  );
  for (const component of value.components)
    assert(
      Number.isFinite(component) && component >= 0 && component <= 1,
      `${tokenName} has an invalid color component.`,
    );
  assert(
    typeof value.alpha === "number" && value.alpha >= 0 && value.alpha <= 1,
    `${tokenName} needs a valid alpha.`,
  );
  assert(
    /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value.hex),
    `${tokenName} needs a portable hex projection.`,
  );
}

function relativeLuminance(hex) {
  const rgb = hex
    .slice(1, 7)
    .match(/.{2}/g)
    .map((part) => parseInt(part, 16) / 255);
  const linear = rgb.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground, background) {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const document = JSON.parse(await readFile(tokenPath, "utf8"));
const pairs = JSON.parse(await readFile(pairsPath, "utf8"));
const pairsSchema = JSON.parse(await readFile(pairsSchemaPath, "utf8"));
const componentRegistry = JSON.parse(
  await readFile(componentRegistryPath, "utf8"),
);
const visualCss = await readFile(visualCssPath, "utf8");

assert(
  document.$schema ===
    "https://www.designtokens.org/schemas/2025.10/format.json",
  "Token source must target stable DTCG 2025.10.",
);
assert(
  document.$extensions?.["com.b2b-sol.vineyard"]?.selectedDirection ===
    "canopy-signal",
  "Selected visual thesis metadata is missing.",
);

const tokens = collectTokens(document);
const resolve = createResolver(tokens);
assert(
  tokens.size >= 70,
  `Expected a complete foundation; found ${tokens.size} tokens.`,
);

for (const [name, token] of tokens) {
  assert(Boolean(token.type), `${name} must resolve a DTCG type.`);
  const alias =
    typeof token.value === "string" ? token.value.match(/^\{([^}]+)\}$/) : null;
  if (alias) {
    assert(
      tokens.has(alias[1]),
      `${name} references missing token ${alias[1]}.`,
    );
    const resolved = resolve(name);
    assert(
      resolved.type === token.type,
      `${name} alias type does not match ${alias[1]}.`,
    );
    valueToCss(resolved);
    const expectedDependency = name.startsWith("component.")
      ? "sys."
      : name.startsWith("sys.")
        ? "ref."
        : null;
    if (expectedDependency)
      assert(
        alias[1].startsWith(expectedDependency),
        `${name} must alias the ${expectedDependency.slice(0, -1)} layer, not ${alias[1]}.`,
      );
    assertions += 1;
    continue;
  }
  if (token.type === "color") validateColor(token.value, name);
  if (token.type === "dimension") validateDimension(token.value, name);
  if (token.type === "duration") {
    assert(
      Number.isFinite(token.value?.value),
      `${name} duration must be numeric.`,
    );
    assert(
      ["ms", "s"].includes(token.value?.unit),
      `${name} duration must use ms or s.`,
    );
  }
  if (token.type === "fontFamily")
    assert(
      Array.isArray(token.value) && token.value.length >= 1,
      `${name} needs a fallback stack.`,
    );
  if (token.type === "fontWeight")
    assert(
      [400, 600, 700].includes(token.value),
      `${name} uses an unsupported font weight.`,
    );
  if (token.type === "cubicBezier")
    assert(
      Array.isArray(token.value) && token.value.length === 4,
      `${name} needs four easing coordinates.`,
    );
  if (token.type === "shadow") {
    validateColor(token.value.color, `${name}.color`);
    for (const property of ["offsetX", "offsetY", "blur", "spread"])
      validateDimension(token.value[property], `${name}.${property}`);
  }
  valueToCss(resolve(name));
  assertions += 1;
}

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validatePairs = ajv.compile(pairsSchema);
assert(
  validatePairs(pairs),
  `Contrast pair schema failed: ${ajv.errorsText(validatePairs.errors)}`,
);
const ids = new Set();
for (const pair of pairs.pairs) {
  assert(!ids.has(pair.id), `Duplicate contrast pair ${pair.id}.`);
  ids.add(pair.id);
  const foreground = resolve(pair.foreground);
  const background = resolve(pair.background);
  assert(
    foreground.type === "color" && background.type === "color",
    `${pair.id} must resolve two colors.`,
  );
  const ratio = contrastRatio(foreground.value.hex, background.value.hex);
  assert(
    ratio >= pair.minimum,
    `${pair.id} contrast ${ratio.toFixed(2)} is below ${pair.minimum}:1.`,
  );
  pair.measured = Number(ratio.toFixed(2));
}

for (const required of [
  "sys.density.compact.control",
  "sys.density.comfortable.control",
  "sys.density.field.control",
]) {
  assert(tokens.has(required), `Missing density token ${required}.`);
}
for (const required of [
  "component.statusSignal.blocked.text",
  "component.statusSignal.corrected.text",
  "component.map.crossOrganizationBlock.stroke",
]) {
  assert(
    tokens.has(required),
    `Missing lighthouse-proven component token ${required}.`,
  );
}

const componentIndex = new Map(
  componentRegistry.components.map((component) => [component.id, component]),
);
for (const [groupName, group] of Object.entries(document.component)) {
  if (groupName.startsWith("$")) continue;
  const metadata = group.$extensions?.["com.b2b-sol.vineyard"];
  assert(Boolean(metadata), `component.${groupName} needs Vineyard metadata.`);
  const component = componentIndex.get(metadata.componentId);
  assert(
    Boolean(component),
    `component.${groupName} references unknown ${metadata.componentId}.`,
  );
  assert(
    metadata.figmaKey === component.figma_key,
    `component.${groupName} Figma key must match ${metadata.componentId}.`,
  );
  assert(
    typeof metadata.figmaName === "string" && metadata.figmaName.length >= 5,
    `component.${groupName} needs a stable Figma name.`,
  );
}

const canopyBlock = visualCss.match(
  /\.vd-lighthouse-route\.vd-theme-canopy-signal\s*\{([\s\S]*?)\n\}/,
)?.[1];
assert(
  Boolean(canopyBlock),
  "Selected Canopy Signal token binding is missing.",
);
assert(
  !/(#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\()/i.test(canopyBlock),
  "Selected Canopy Signal may not contain literal colors.",
);
for (const requiredVariable of [
  "--sys-color-canvas",
  "--sys-color-text-primary",
  "--component-button-primary-background",
  "--component-statusSignal-blocked-text",
  "--ref-radius-md",
  "--ref-font-family-display",
]) {
  assert(
    canopyBlock.includes(`var(${requiredVariable})`),
    `Selected Canopy Signal must bind ${requiredVariable}.`,
  );
}

console.log(
  `Design token validation passed: ${tokens.size} tokens, ${pairs.pairs.length} contrast pairs, ${assertions} assertions.`,
);
console.log(
  pairs.pairs.map((pair) => `${pair.id} ${pair.measured}:1`).join(" · "),
);
