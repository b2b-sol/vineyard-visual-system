import { spawnSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const visualDirectory = path.join(ROOT, "workflow-model", "visuals");
const outputDirectory = await mkdtemp(
  path.join(os.tmpdir(), "vineyard-mermaid-"),
);
const mermaidCli = path.join(
  ROOT,
  "node_modules",
  "@mermaid-js",
  "mermaid-cli",
  "src",
  "cli.js",
);

try {
  const diagrams = (await readdir(visualDirectory))
    .filter((file) => file.endsWith(".mmd"))
    .sort();
  if (diagrams.length !== 36)
    throw new Error(
      `Expected 36 Mermaid diagrams, received ${diagrams.length}`,
    );

  const markdownPath = path.join(outputDirectory, "diagrams.md");
  const renderedMarkdownPath = path.join(outputDirectory, "rendered.md");
  const artefactDirectory = path.join(outputDirectory, "artefacts");
  await mkdir(artefactDirectory);
  const markdown = (
    await Promise.all(
      diagrams.map(async (diagram) =>
        [
          `## ${diagram}`,
          "",
          "```mermaid",
          (await readFile(path.join(visualDirectory, diagram), "utf8")).trim(),
          "```",
          "",
        ].join("\n"),
      ),
    )
  ).join("\n");
  await writeFile(markdownPath, markdown, "utf8");

  const result = spawnSync(
    process.execPath,
    [
      mermaidCli,
      "--input",
      markdownPath,
      "--output",
      renderedMarkdownPath,
      "--artefacts",
      artefactDirectory,
      ...(process.env.CI
        ? [
            "--puppeteerConfigFile",
            path.join(ROOT, "scripts", "mermaid-puppeteer.ci.json"),
          ]
        : []),
      "--quiet",
    ],
    { cwd: ROOT, encoding: "utf8" },
  );
  if (result.status !== 0)
    throw new Error(
      `Mermaid render failed\n${result.error?.message ?? ""}\n${result.stdout ?? ""}${result.stderr ?? ""}`,
    );

  const rendered = (await readdir(artefactDirectory)).filter((file) =>
    file.endsWith(".svg"),
  );
  if (rendered.length !== diagrams.length)
    throw new Error(
      `Expected ${diagrams.length} rendered SVGs, received ${rendered.length}`,
    );
  console.log(
    `✓ rendered ${diagrams.length} Mermaid diagrams without syntax errors`,
  );
} finally {
  await rm(outputDirectory, { recursive: true, force: true });
}
