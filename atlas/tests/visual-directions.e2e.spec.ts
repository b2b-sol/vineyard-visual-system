import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const directions = [
  "field-ledger",
  "canopy-signal",
  "vintage-control",
] as const;
const desktopLighthouses = ["harvest-command", "reconciliation"] as const;
const renderDirectory = path.resolve("validation", "visual-direction-renders");
const captureSourcePaths = [
  "atlas/src/pages/VisualDirectionsPage.tsx",
  "atlas/src/visual-directions.css",
  "design-system/tokens/vineyard.tokens.json",
  "design-system/tokens/vineyard.css",
  "design-system/visual-directions/directions.json",
];
let captureSourceDigest = "";

async function expectNoSeriousAxeFindings(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((violation) =>
    ["serious", "critical"].includes(violation.impact ?? ""),
  );
  expect(
    serious,
    serious.map(({ id, help }) => `${id}: ${help}`).join("\n"),
  ).toEqual([]);
}

async function expectStatusIsNotColorOnly(page: Page) {
  const statuses = await page.locator(".vd-status").evaluateAll((elements) =>
    elements.map((element) => ({
      icons: element.querySelectorAll("svg").length,
      text: element.textContent?.trim() ?? "",
    })),
  );
  expect(statuses.length).toBeGreaterThan(0);
  expect(
    statuses.every(({ icons, text }) => icons > 0 && text.length > 0),
  ).toBe(true);
}

async function prepareCapture(page: Page, route: string) {
  await page.goto(route);
  await page.evaluate(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    const fieldMain = document.querySelector(
      ".vd-product-field .vd-product-main",
    );
    if (fieldMain instanceof HTMLElement) fieldMain.scrollTop = 0;
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
  });
  await expect
    .poll(() =>
      page.evaluate(() => ({
        page: window.scrollY,
        fieldMain:
          document.querySelector(".vd-product-field .vd-product-main")
            ?.scrollTop ?? 0,
      })),
    )
    .toEqual({ page: 0, fieldMain: 0 });
}

async function writeCaptureEvidence(
  filename: string,
  evidence: Record<string, unknown>,
) {
  await writeFile(
    path.join(renderDirectory, filename.replace(/\.png$/, ".capture.json")),
    `${JSON.stringify(
      {
        capture_version: "1.0",
        source_digest: captureSourceDigest,
        ...evidence,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

test.beforeAll(async () => {
  await mkdir(renderDirectory, { recursive: true });
  const hash = createHash("sha256");
  for (const sourcePath of captureSourcePaths) {
    hash.update(sourcePath);
    hash.update(await readFile(path.resolve(sourcePath)));
  }
  captureSourceDigest = hash.digest("hex");
});

test("visual direction index records the selection", async ({ page }) => {
  await page.goto("#/visual-directions");
  await expect(
    page.getByRole("heading", {
      name: "Three territories. One operational test.",
    }),
  ).toBeVisible();
  await expect(page.getByText("Canopy Signal", { exact: true })).toHaveCount(2);
  await expect(
    page.getByText("92 / 100 · no hard rejection criteria triggered"),
  ).toBeVisible();
  await expect(page.locator(".vd-direction-card")).toHaveCount(3);
  await expect(page.locator(".vd-render-links a")).toHaveCount(9);
  await expectNoSeriousAxeFindings(page);
});

for (const direction of directions) {
  test.describe(`${direction} lighthouse renders`, () => {
    test(`field interruption — ${direction}`, async ({ page }, testInfo) => {
      test.skip(
        testInfo.project.name !== "field-mobile",
        "Field composition is captured in the mobile project.",
      );
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`#/visual-directions/${direction}/field-interruption`);
      await expect(
        page.locator("[data-lighthouse='field-interruption']"),
      ).toHaveAttribute("data-direction", direction);
      await expect(
        page.getByRole("heading", { name: "Pressure lost at east manifold" }),
      ).toBeVisible();
      await expect(page.getByText("BLK-003", { exact: true })).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Resolve assigned recovery" }),
      ).toBeEnabled();
      await expect(
        page.getByRole("button", { name: "Record delivered" }),
      ).toBeDisabled();
      const primary = page.getByRole("button", {
        name: "Resolve assigned recovery",
      });
      const box = await primary.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(52);
      await primary.focus();
      expect(
        await primary.evaluate(
          (element) => getComputedStyle(element).outlineStyle,
        ),
      ).not.toBe("none");
      await expectNoSeriousAxeFindings(page);
      await expectStatusIsNotColorOnly(page);
      await prepareCapture(
        page,
        `#/visual-directions/${direction}/field-interruption?capture=1`,
      );
      await expect(
        page.getByRole("heading", { name: "Pressure lost at east manifold" }),
      ).toBeVisible();
      await expect(primary).toBeVisible();
      const fieldCapture = await page.evaluate(() => {
        const rect = (selector: string) => {
          const element = document.querySelector(selector);
          if (!(element instanceof HTMLElement))
            throw new Error(`Missing capture element ${selector}.`);
          const box = element.getBoundingClientRect();
          return { top: box.top, bottom: box.bottom, height: box.height };
        };
        return {
          viewport: { width: window.innerWidth, height: window.innerHeight },
          scroll: {
            page_y: window.scrollY,
            field_main_y:
              document.querySelector(".vd-product-field .vd-product-main")
                ?.scrollTop ?? 0,
          },
          top_content: rect(".vd-product-bar"),
          urgent_alert: rect(".vd-alert"),
          accountable_action: rect(".vd-button-primary"),
        };
      });
      expect(fieldCapture.top_content.top).toBeGreaterThanOrEqual(0);
      expect(fieldCapture.urgent_alert.top).toBeGreaterThanOrEqual(0);
      expect(fieldCapture.accountable_action.bottom).toBeLessThanOrEqual(844);
      await page.screenshot({
        path: path.join(renderDirectory, `${direction}-field-interruption.png`),
      });
      await writeCaptureEvidence(`${direction}-field-interruption.png`, {
        direction,
        lighthouse: "field-interruption",
        ...fieldCapture,
      });
    });

    for (const lighthouse of desktopLighthouses) {
      test(`${lighthouse} — ${direction}`, async ({ page }, testInfo) => {
        test.skip(
          testInfo.project.name !== "desktop-chromium",
          "Desktop composition is captured in the desktop project.",
        );
        await page.setViewportSize({ width: 1440, height: 1024 });
        await page.goto(`#/visual-directions/${direction}/${lighthouse}`);
        await expect(
          page.locator(`[data-lighthouse='${lighthouse}']`),
        ).toHaveAttribute("data-direction", direction);
        await expect(page.locator(".vd-product")).toBeVisible();
        if (lighthouse === "harvest-command") {
          await expect(page.locator(".vd-load-id > span")).toHaveText(
            "LOAD-001-01",
          );
          await expect(
            page.getByText("EVT-00221 · 3:00 PM · harvesting → delayed"),
          ).toBeVisible();
          await expect(
            page.getByRole("button", { name: "Resolve in-transit recovery" }),
          ).toBeEnabled();
        } else {
          await expect(
            page.getByText("RCI-00505", { exact: true }),
          ).toBeVisible();
          await expect(
            page.getByText("EVT-00283", { exact: true }),
          ).toBeVisible();
          await expect(
            page.getByRole("button", { name: "Record disputed" }),
          ).toBeEnabled();
          await expect(
            page.getByRole("button", {
              name: "Accept load · correction required",
            }),
          ).toBeDisabled();
        }
        await expectNoSeriousAxeFindings(page);
        await expectStatusIsNotColorOnly(page);
        await prepareCapture(
          page,
          `#/visual-directions/${direction}/${lighthouse}?capture=1`,
        );
        const desktopCapture = await page.evaluate(() => {
          const heading = document.querySelector(".vd-command-header h1");
          const action = document.querySelector(".vd-button-primary");
          if (
            !(heading instanceof HTMLElement) ||
            !(action instanceof HTMLElement)
          )
            throw new Error("Desktop capture anchors are missing.");
          const headingBox = heading.getBoundingClientRect();
          const actionBox = action.getBoundingClientRect();
          return {
            viewport: { width: window.innerWidth, height: window.innerHeight },
            scroll: { page_y: window.scrollY, field_main_y: 0 },
            top_content: {
              top: headingBox.top,
              bottom: headingBox.bottom,
              height: headingBox.height,
            },
            accountable_action: {
              top: actionBox.top,
              bottom: actionBox.bottom,
              height: actionBox.height,
            },
          };
        });
        expect(desktopCapture.top_content.top).toBeGreaterThanOrEqual(0);
        expect(desktopCapture.top_content.bottom).toBeLessThanOrEqual(1024);
        await page.screenshot({
          path: path.join(renderDirectory, `${direction}-${lighthouse}.png`),
        });
        await writeCaptureEvidence(`${direction}-${lighthouse}.png`, {
          direction,
          lighthouse,
          ...desktopCapture,
        });
      });
    }
  });
}

test("selected direction reflows at a 200% equivalent viewport", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "Reflow is evaluated once in Chromium.",
  );
  await page.setViewportSize({ width: 720, height: 512 });
  await page.goto("#/visual-directions/canopy-signal/reconciliation");
  await expect(
    page.getByRole("heading", { name: "Resolve load identity conflict" }),
  ).toBeVisible();
  const layout = await page.evaluate(() => {
    const comparison = document.querySelector(".vd-comparison-panel");
    if (!(comparison instanceof HTMLElement))
      throw new Error("Comparison panel missing.");
    return {
      pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
      comparisonOverflow: comparison.scrollWidth - comparison.clientWidth,
    };
  });
  expect(layout.pageOverflow).toBeLessThanOrEqual(1);
  expect(layout.comparisonOverflow).toBeLessThanOrEqual(1);
  await expectNoSeriousAxeFindings(page);
});
