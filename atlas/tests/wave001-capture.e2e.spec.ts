import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

type CaptureManifest = {
  source_paths: string[];
  captures: Array<{
    id: string;
    screen_id: string;
    route: string;
    state: string;
    fixture_id: string;
    viewport: { name: "desktop" | "mobile"; width: number; height: number };
  }>;
};

const captureManifest = JSON.parse(
  readFileSync(path.resolve("validation", "wave-001-captures.json"), "utf8"),
) as CaptureManifest;

const execFileAsync = promisify(execFile);
const updateCaptures = process.env.UPDATE_WAVE_001_CAPTURES === "1";
const renderRoot = path.resolve("validation", "wave-001-renders", "primary");
let sourceDigest = "";
let sourceCommit = "";
let generatedAt = "";

async function digestPaths(relativePaths: string[]) {
  const hash = createHash("sha256");
  for (const relativePath of relativePaths) {
    hash.update(relativePath);
    hash.update("\0");
    hash.update(await readFile(path.resolve(relativePath)));
    hash.update("\0");
  }
  return hash.digest("hex");
}

test.describe("WAVE-001 primary capture evidence", () => {
  test.skip(
    !updateCaptures,
    "Primary evidence is regenerated only by `npm run capture:wave-001`.",
  );

  test.beforeAll(async () => {
    await mkdir(renderRoot, { recursive: true });
    sourceDigest = await digestPaths(captureManifest.source_paths);
    sourceCommit = (
      await execFileAsync("git", ["rev-parse", "HEAD"], { encoding: "utf8" })
    ).stdout.trim();
    generatedAt = new Date().toISOString();
  });

  for (const capture of captureManifest.captures) {
    test(`${capture.id} ${capture.screen_id} ${capture.viewport.name}`, async ({
      page,
    }, testInfo) => {
      const expectedProject =
        capture.viewport.name === "mobile"
          ? "field-mobile"
          : "desktop-chromium";
      test.skip(
        testInfo.project.name !== expectedProject,
        `Captured by ${expectedProject}.`,
      );

      await page.setViewportSize({
        width: capture.viewport.width,
        height: capture.viewport.height,
      });
      await page.goto(`#${capture.route}&capture=1`, {
        waitUntil: "networkidle",
      });
      await page.evaluate(() => window.scrollTo({ top: 0, left: 0 }));

      const screen = page.locator(`[data-screen-id="${capture.screen_id}"]`);
      await expect(screen).toHaveAttribute("data-review-state", capture.state);
      await expect(screen).toHaveAttribute(
        "data-fixture-id",
        capture.fixture_id,
      );
      await expect(screen).toBeVisible();

      const axe = await new AxeBuilder({ page }).analyze();
      const serious = axe.violations.filter((violation) =>
        ["serious", "critical"].includes(violation.impact ?? ""),
      );
      expect(
        serious,
        serious.map(({ id, help }) => `${id}: ${help}`).join("\n"),
      ).toEqual([]);

      const geometry = await page.evaluate(() => {
        const primaryAction = document.querySelector(
          ".wave-primary-control, .wave-action-list button:not([disabled])",
        );
        const box =
          primaryAction instanceof HTMLElement
            ? primaryAction.getBoundingClientRect()
            : null;
        return {
          viewport_height: window.innerHeight,
          viewport_width: window.innerWidth,
          scroll_height: document.documentElement.scrollHeight,
          scroll_width: document.documentElement.scrollWidth,
          horizontal_overflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          primary_action: box
            ? { top: box.top, bottom: box.bottom, height: box.height }
            : null,
        };
      });
      expect(geometry.horizontal_overflow).toBeLessThanOrEqual(1);

      const basename = capture.id.toLowerCase();
      const artifactPath = path.join(renderRoot, `${basename}.png`);
      const metadataPath = path.join(renderRoot, `${basename}.capture.json`);
      await page.screenshot({
        animations: "disabled",
        caret: "hide",
        path: artifactPath,
      });
      await writeFile(
        metadataPath,
        `${JSON.stringify(
          {
            capture_version: "1.0",
            id: capture.id,
            screen_id: capture.screen_id,
            route: capture.route,
            state: capture.state,
            fixture_id: capture.fixture_id,
            viewport: capture.viewport,
            source_digest: sourceDigest,
            generated_at: generatedAt,
            commit_sha: sourceCommit,
            geometry,
          },
          null,
          2,
        )}\n`,
        "utf8",
      );
    });
  }
});
