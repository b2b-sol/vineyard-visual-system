import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const directionPath = path.join(
  root,
  "design-system",
  "visual-directions",
  "directions.json",
);
const renderDirectory = path.join(
  root,
  "validation",
  "visual-direction-renders",
);
const review = JSON.parse(await readFile(directionPath, "utf8"));
const captureSourcePaths = [
  "atlas/src/pages/VisualDirectionsPage.tsx",
  "atlas/src/visual-directions.css",
  "design-system/tokens/vineyard.tokens.json",
  "design-system/tokens/vineyard.css",
  "design-system/visual-directions/directions.json",
];
const hash = createHash("sha256");
for (const sourcePath of captureSourcePaths) {
  hash.update(sourcePath);
  hash.update(await readFile(path.join(root, sourcePath)));
}
const captureSourceDigest = hash.digest("hex");
const [
  workflowDocument,
  scenarioDocument,
  fixtureDocument,
  screenDocument,
  eventDocument,
] = await Promise.all(
  [
    "workflow-model/workflows.json",
    "scenarios/scenarios.json",
    "data/scenario-fixtures.json",
    "product-structure/screens.json",
    "data/events.json",
  ].map(async (sourcePath) =>
    JSON.parse(await readFile(path.join(root, sourcePath), "utf8")),
  ),
);
let assertions = 0;

function assert(condition, message) {
  assertions += 1;
  if (!condition) throw new Error(message);
}

function pngDimensions(buffer, filename) {
  assert(
    buffer.subarray(1, 4).toString("ascii") === "PNG",
    `${filename} is not a PNG.`,
  );
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

assert(
  review.contract_version === "1.0",
  "Unsupported visual direction contract.",
);
assert(
  review.rubric.reduce((sum, criterion) => sum + criterion.weight, 0) === 100,
  "Visual rubric weights must total 100.",
);
assert(
  new Set(review.rubric.map(({ id }) => id)).size === review.rubric.length,
  "Visual rubric IDs must be unique.",
);
assert(
  review.directions.length === 3,
  "Exactly three direction families are required for VIS-FND-001.",
);
assert(
  review.lighthouses.length === 3,
  "Exactly three lighthouse compositions are required.",
);

const rubric = new Map(
  review.rubric.map((criterion) => [criterion.id, criterion]),
);
const selected = review.directions.filter(
  ({ disposition }) => disposition === "selected",
);
assert(selected.length === 1, "Exactly one visual direction must be selected.");
assert(
  selected[0].id === review.selected_direction_id,
  "Selected direction metadata is inconsistent.",
);

for (const direction of review.directions) {
  const scoreIds = Object.keys(direction.scores);
  assert(
    scoreIds.length === review.rubric.length,
    `${direction.id} must score every rubric criterion.`,
  );
  assert(
    scoreIds.every((id) => rubric.has(id)),
    `${direction.id} has an unknown score criterion.`,
  );
  const total = Object.values(direction.scores).reduce(
    (sum, value) => sum + value,
    0,
  );
  assert(
    total === direction.total,
    `${direction.id} score math does not equal ${direction.total}.`,
  );
  assert(
    Array.isArray(direction.hard_rejections_triggered),
    `${direction.id} must record hard-rejection outcomes.`,
  );
  assert(
    direction.hard_rejections_triggered.every((rejection) =>
      review.acceptance.hard_rejections.includes(rejection),
    ),
    `${direction.id} records an unknown hard rejection.`,
  );
  assert(
    direction.visual?.strengths?.length >= 2 &&
      direction.visual?.risks?.length >= 1 &&
      direction.visual?.swatches?.length >= 4,
    `${direction.id} needs complete rendered-direction metadata.`,
  );
  for (const [id, score] of Object.entries(direction.scores)) {
    const weight = rubric.get(id).weight;
    assert(
      score >= 0 && score <= weight,
      `${direction.id}.${id} exceeds its rubric weight.`,
    );
    const belowFloor =
      score / weight < review.acceptance.minimum_criterion_fraction;
    assert(
      direction.criterion_failures.includes(id) === belowFloor,
      `${direction.id}.${id} floor disposition is inconsistent.`,
    );
  }
}

assert(
  selected[0].total >= review.acceptance.minimum_total,
  "Selected direction misses the total-score floor.",
);
assert(
  selected[0].criterion_failures.length === 0,
  "Selected direction misses a criterion floor.",
);
assert(
  selected[0].hard_rejections_triggered.length === 0,
  "Selected direction triggers a hard rejection.",
);

const workflowIds = new Set(workflowDocument.workflows.map(({ id }) => id));
const transitionIds = new Set(
  workflowDocument.workflows.flatMap(({ transitions }) =>
    transitions.map(({ id }) => id),
  ),
);
const scenarioIds = new Set(scenarioDocument.scenarios.map(({ id }) => id));
const fixtureIds = new Set(fixtureDocument.fixtures.map(({ id }) => id));
const screenIds = new Set(screenDocument.screens.map(({ id }) => id));
const eventIds = new Set(eventDocument.events.map(({ id }) => id));
for (const lighthouse of review.lighthouses) {
  assert(
    typeof lighthouse.label === "string" && lighthouse.label.length >= 5,
    `${lighthouse.id} needs a stable label.`,
  );
  assert(
    typeof lighthouse.route_summary === "string" &&
      lighthouse.route_summary.length >= 10,
    `${lighthouse.id} needs a route summary.`,
  );
  for (const [value, registry, label] of [
    [lighthouse.workflow_id, workflowIds, "workflow"],
    [lighthouse.transition_id, transitionIds, "transition"],
    [lighthouse.scenario_id, scenarioIds, "scenario"],
    [lighthouse.fixture_id, fixtureIds, "fixture"],
    [lighthouse.screen_id, screenIds, "screen"],
    [lighthouse.event_id, eventIds, "event"],
  ])
    assert(
      registry.has(value),
      `${lighthouse.id} has unknown ${label} ${value}.`,
    );
}

const expectedFiles = [];
const expectedCaptureFiles = [];
for (const direction of review.directions) {
  for (const lighthouse of review.lighthouses) {
    const filename = `${direction.id}-${lighthouse.id}.png`;
    expectedFiles.push(filename);
    const captureFilename = filename.replace(/\.png$/, ".capture.json");
    expectedCaptureFiles.push(captureFilename);
    const buffer = await readFile(path.join(renderDirectory, filename));
    const dimensions = pngDimensions(buffer, filename);
    assert(
      dimensions.width === lighthouse.viewport.width,
      `${filename} width ${dimensions.width} does not equal ${lighthouse.viewport.width}.`,
    );
    assert(
      dimensions.height === lighthouse.viewport.height,
      `${filename} height ${dimensions.height} does not equal ${lighthouse.viewport.height}.`,
    );
    const capture = JSON.parse(
      await readFile(path.join(renderDirectory, captureFilename), "utf8"),
    );
    assert(
      capture.source_digest === captureSourceDigest,
      `${captureFilename} is stale against its canonical sources.`,
    );
    assert(
      capture.direction === direction.id &&
        capture.lighthouse === lighthouse.id,
      `${captureFilename} identifies the wrong route.`,
    );
    assert(
      capture.viewport.width === lighthouse.viewport.width &&
        capture.viewport.height === lighthouse.viewport.height,
      `${captureFilename} records the wrong viewport.`,
    );
    assert(
      capture.scroll.page_y === 0 && capture.scroll.field_main_y === 0,
      `${captureFilename} was not captured from the canonical top position.`,
    );
    assert(
      capture.top_content.top >= 0 &&
        capture.top_content.bottom <= lighthouse.viewport.height,
      `${captureFilename} omits its top content.`,
    );
    if (lighthouse.id === "field-interruption") {
      assert(
        capture.urgent_alert.top >= 0 &&
          capture.urgent_alert.bottom <= lighthouse.viewport.height,
        `${captureFilename} omits the urgent alert.`,
      );
      assert(
        capture.accountable_action.top >= 0 &&
          capture.accountable_action.bottom <= lighthouse.viewport.height,
        `${captureFilename} omits the accountable action.`,
      );
    }
  }
}
const actualFiles = (await readdir(renderDirectory))
  .filter((name) => name.endsWith(".png"))
  .sort();
assert(
  JSON.stringify(actualFiles) === JSON.stringify(expectedFiles.sort()),
  "Visual render directory contains missing or unexpected PNGs.",
);
const actualCaptureFiles = (await readdir(renderDirectory))
  .filter((name) => name.endsWith(".capture.json"))
  .sort();
assert(
  JSON.stringify(actualCaptureFiles) ===
    JSON.stringify(expectedCaptureFiles.sort()),
  "Visual render directory contains missing or unexpected capture evidence.",
);
assert(
  review.validation.serious_or_critical_axe_findings === 0,
  "Visual acceptance cannot retain serious or critical axe findings.",
);

console.log(
  `Visual direction validation passed: 3 directions, 3 lighthouses, 9 exact renders, ${assertions} assertions.`,
);
