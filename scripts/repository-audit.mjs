import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import process from "node:process";
import YAML from "yaml";

const root = process.cwd();
const failures = [];
const warnings = [];

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function read(relativePath) {
  const absolutePath = resolve(root, relativePath);
  if (!existsSync(absolutePath)) {
    fail(`Required file is missing: ${relativePath}`);
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

function parseYaml(relativePath) {
  const contents = read(relativePath);
  if (!contents) return {};
  try {
    return YAML.parse(contents) ?? {};
  } catch (error) {
    fail(`${relativePath} is not valid YAML: ${error.message}`);
    return {};
  }
}

function repositoryFiles() {
  try {
    return execFileSync(
      "git",
      ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
      {
        cwd: root,
        encoding: "utf8",
      },
    )
      .split("\0")
      .filter(Boolean)
      .sort();
  } catch (error) {
    fail(`Unable to enumerate tracked files: ${error.message}`);
    return [];
  }
}

const files = repositoryFiles();
const forbiddenTrackedPaths = [
  /(^|\/)\.env(?:\.|$)/,
  /(^|\/)node_modules\//,
  /(^|\/)dist\//,
  /(^|\/)playwright-report\//,
  /(^|\/)test-results\//,
];

for (const file of files) {
  if (forbiddenTrackedPaths.some((pattern) => pattern.test(file))) {
    fail(`Generated or private path must not be tracked: ${file}`);
  }
}

const textExtensions = new Set([
  "",
  ".css",
  ".csv",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".svg",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

const privatePathPatterns = [
  /(?:[A-Za-z]:\\|\/)(?:Users|home)\/(?!example(?:\/|$))[^\s"'<>]+/i,
  /[A-Za-z]:\\Users\\(?!example(?:\\|$))[^\s"'<>]+/i,
];
const highConfidenceSecretPatterns = [
  /-----BEGIN (?:EC |OPENSSH |RSA )?PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{36,255}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{60,255}\b/,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,255}\b/,
];

for (const file of files) {
  if (!textExtensions.has(extname(file).toLowerCase())) continue;
  const contents = readFileSync(resolve(root, file), "utf8");
  if (privatePathPatterns.some((pattern) => pattern.test(contents))) {
    fail(`Machine-specific private path detected in ${file}`);
  }
  if (highConfidenceSecretPatterns.some((pattern) => pattern.test(contents))) {
    fail(`High-confidence credential material detected in ${file}`);
  }
}

const taskRegistry = parseYaml("control/TASK_REGISTRY.yaml");
const tasks = Array.isArray(taskRegistry.tasks) ? taskRegistry.tasks : [];
const taskIds = new Set();

if (tasks.length === 0) {
  fail("control/TASK_REGISTRY.yaml must contain at least one task");
}

for (const task of tasks) {
  if (!task?.id) {
    fail("Every task registry entry must have an id");
    continue;
  }
  if (taskIds.has(task.id)) fail(`Duplicate task id: ${task.id}`);
  taskIds.add(task.id);
}

for (const task of tasks) {
  for (const dependency of task?.depends_on ?? []) {
    if (!taskIds.has(dependency)) {
      fail(`Task ${task.id} has an unknown dependency: ${dependency}`);
    }
  }
}

const projectState = parseYaml("control/PROJECT_STATE.yaml");
if (projectState.execution_identity !== "tiklebot") {
  fail("Project state must record tiklebot as the execution identity");
}
if (projectState.visibility !== "public") {
  fail("Project state must record a public repository");
}
if (projectState.bot_auth_verified !== true) {
  fail("Project state must record successful bot authentication");
}

const manifest = parseYaml("control/MASTER_MANIFEST.yaml");
if (!Array.isArray(manifest.artifacts)) {
  fail("control/MASTER_MANIFEST.yaml must contain an artifacts array");
} else {
  const artifactIds = new Set();
  for (const artifact of manifest.artifacts) {
    const id = artifact?.artifact_id ?? artifact?.id;
    if (!id) {
      fail("Every manifest artifact must have artifact_id or id");
      continue;
    }
    if (artifactIds.has(id)) fail(`Duplicate manifest artifact id: ${id}`);
    artifactIds.add(id);
    const canonicalSource = artifact?.canonical_source;
    if (canonicalSource && !existsSync(resolve(root, canonicalSource))) {
      fail(
        `Manifest artifact ${id} references a missing source: ${canonicalSource}`,
      );
    }
  }
}

const findingFiles = files.filter((file) =>
  /(^|\/)(validation|review-exports)\//.test(file),
);
for (const file of findingFiles) {
  if (!textExtensions.has(extname(file).toLowerCase())) continue;
  const contents = readFileSync(resolve(root, file), "utf8");
  const unresolvedYamlFinding =
    /severity:\s*['"]?P[01]['"]?[\s\S]{0,300}?status:\s*['"]?(?:open|unresolved|blocked)['"]?/i;
  const unresolvedMarkdownFinding =
    /\bP[01]\b[^\n]{0,180}\b(?:open|unresolved|blocked)\b/i;
  if (
    unresolvedYamlFinding.test(contents) ||
    unresolvedMarkdownFinding.test(contents)
  ) {
    fail(`Unresolved P0/P1 finding detected in ${file}`);
  }
}

const requiredWorkflows = [
  {
    file: ".github/workflows/ci.yml",
    name: "ci",
    job: "quality",
    events: ["pull_request", "merge_group", "push"],
  },
  {
    file: ".github/workflows/visual-validation.yml",
    name: "visual-validation",
    job: "browser",
    events: ["pull_request", "merge_group", "push"],
  },
  {
    file: ".github/workflows/repository-audit.yml",
    name: "repository-audit",
    job: "audit",
    events: ["pull_request", "merge_group", "push"],
  },
  {
    file: ".github/workflows/pages.yml",
    name: "pages",
    job: "build",
    events: ["push", "workflow_dispatch"],
  },
];
for (const expected of requiredWorkflows) {
  if (!existsSync(resolve(root, expected.file))) {
    fail(`Required workflow is missing: ${expected.file}`);
    continue;
  }
  const workflow = parseYaml(expected.file);
  if (workflow.name !== expected.name) {
    fail(`${expected.file} must use stable workflow name: ${expected.name}`);
  }
  if (workflow.jobs?.[expected.job]?.name !== expected.job) {
    fail(`${expected.file} must use stable job name: ${expected.job}`);
  }
  for (const event of expected.events) {
    if (!(event in (workflow.on ?? {}))) {
      fail(`${expected.file} must listen to ${event}`);
    }
  }
}

if (!existsSync(resolve(root, "index.html"))) {
  warn(
    "Atlas entry point is not present yet; production build will enforce it.",
  );
}

for (const warning of warnings) console.warn(`WARN: ${warning}`);

if (failures.length > 0) {
  console.error(`Repository audit failed with ${failures.length} finding(s):`);
  for (const finding of failures) console.error(`- ${finding}`);
  process.exitCode = 1;
} else {
  console.log(
    `Repository audit passed (${files.length} repository files, ${tasks.length} tasks, ${manifest.artifacts.length} manifest artifacts).`,
  );
}
