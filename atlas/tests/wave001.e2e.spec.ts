import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const reviewStates: Record<string, string[]> = {
  "SCR-001": ["normal", "offline", "partial", "urgent", "completion"],
  "SCR-002": ["normal", "blocked", "partial", "completion"],
  "SCR-003": ["normal", "blocked", "stale", "partial", "completion"],
  "SCR-004": ["normal", "blocked", "stale", "corrected", "completion"],
  "SCR-005": ["normal", "blocked", "corrected", "historical", "completion"],
  "SCR-006": ["normal", "stale", "corrected", "offline", "completion"],
  "SCR-039": ["normal", "blocked", "urgent", "historical", "completion"],
  "SCR-040": ["normal", "urgent", "partial", "offline", "completion"],
  "SCR-041": ["normal", "blocked", "urgent", "stale", "completion"],
  "SCR-042": ["normal", "blocked", "urgent", "conflict", "completion"],
  "SCR-043": ["normal", "blocked", "urgent", "loading", "completion"],
  "SCR-044": ["normal", "blocked", "corrected", "empty", "completion"],
  "SCR-045": ["normal", "urgent", "partial", "error", "completion"],
};

test.describe("WAVE-001 production atlas", () => {
  test("renders all 64 required review states as distinct, traced surfaces", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-chromium",
      "One deterministic inventory pass",
    );
    let rendered = 0;
    for (const [screenId, states] of Object.entries(reviewStates)) {
      for (const state of states) {
        await page.goto(`#/screens/${screenId}?state=${state}`, {
          waitUntil: "networkidle",
        });
        const screen = page.locator(`[data-screen-id="${screenId}"]`);
        await expect(screen).toHaveAttribute("data-review-state", state);
        await expect(screen.locator(".wave-state-banner")).toBeVisible();
        expect(
          await screen
            .locator(".wave-component-grid [data-component-id]")
            .count(),
        ).toBeGreaterThanOrEqual(3);
        await expect(page.locator("[data-scenario-id]").first()).toBeVisible();
        rendered += 1;
      }
    }
    expect(rendered).toBe(64);
  });

  test("replays the complete plan-to-verify and crew-to-cost narratives", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-chromium",
      "One deterministic replay pass",
    );
    for (const [flowId, count] of [
      ["FLW-001", 8],
      ["FLW-007", 10],
    ] as const) {
      await page.goto(`#/prototypes/${flowId}`, { waitUntil: "networkidle" });
      const next = page.getByRole("button", {
        name: "Accept next fixture event",
      });
      for (let index = 0; index < count; index += 1) await next.click();
      await expect(page.locator(".prototype-lane li.is-accepted")).toHaveCount(
        count,
      );
      await expect(
        page.getByRole("button", { name: "Replay complete" }),
      ).toBeDisabled();
    }
  });

  test("keeps linked evidence lanes independently replayable", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-chromium",
      "Comparison interaction",
    );
    await page.goto("#/prototypes/FLW-015", { waitUntil: "networkidle" });
    await page
      .getByRole("button", { name: "Reveal next WF-001 event" })
      .click();
    await expect(
      page.locator(
        '.prototype-lane[aria-labelledby="WF-001-lane-title"] li.is-accepted',
      ),
    ).toHaveCount(1);
    await expect(
      page.locator(
        '.prototype-lane[aria-labelledby="WF-007-lane-title"] li.is-accepted',
      ),
    ).toHaveCount(0);
    await expect(page.getByText(/retain independent clocks/i)).toBeVisible();
  });

  test("reflows field responsibility without page overflow", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "field-mobile",
      "Mobile field acceptance",
    );
    await page.goto("#/screens/SCR-042?state=conflict&fixture=FIX-033", {
      waitUntil: "networkidle",
    });
    await expect(
      page.getByRole("heading", { name: "Device and server states differ" }),
    ).toBeVisible();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter((violation) =>
        ["serious", "critical"].includes(violation.impact ?? ""),
      ),
    ).toEqual([]);
  });
});
