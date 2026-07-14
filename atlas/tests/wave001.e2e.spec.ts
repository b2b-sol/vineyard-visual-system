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
    test.setTimeout(240_000);
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
        await expect(screen).toHaveAttribute("data-state-contract-id", /^STM-/);
        if ((await screen.locator(".wave-model-badge").count()) === 0) {
          await expect(screen).toHaveAttribute("data-scenario-id", /^SCN-/);
        }
        const axe = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(
          axe.violations,
          `${screenId}/${state} has WCAG A/AA accessibility findings`,
        ).toEqual([]);
        await page.screenshot({
          animations: "disabled",
          path: testInfo.outputPath(`${screenId}-${state}-viewport.png`),
        });
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
        name: "Validate & append next event",
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
      .getByRole("button", {
        name: "Validate & append next WF-001 event",
      })
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
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("keeps the next exact field action inside the initial mobile viewport", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "field-mobile",
      "Initial field viewport acceptance",
    );
    for (const screenId of ["SCR-005", "SCR-041", "SCR-042"]) {
      const fieldPage = await page.context().newPage();
      await fieldPage.goto(`#/screens/${screenId}?state=normal`, {
        waitUntil: "networkidle",
      });
      await expect(
        fieldPage.locator(`[data-screen-id="${screenId}"]`),
      ).toBeVisible();
      await fieldPage.evaluate(
        () =>
          new Promise<void>((resolve) => {
            window.scrollTo(0, 0);
            requestAnimationFrame(() =>
              requestAnimationFrame(() => {
                window.scrollTo(0, 0);
                resolve();
              }),
            );
          }),
      );
      const viewportState = await fieldPage.evaluate(() => ({
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        overflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      }));
      expect(viewportState.scrollX).toBe(0);
      expect(viewportState.scrollY).toBe(0);
      expect(viewportState.overflow).toBeLessThanOrEqual(1);
      const action = fieldPage.locator(".wave-action:not(:disabled)").first();
      await expect(action).toBeVisible();
      const box = await action.boundingBox();
      expect(
        box,
        `${screenId} requires an enabled field action`,
      ).not.toBeNull();
      expect(
        box!.y + box!.height,
        `${screenId} action must be visible within 844 px`,
      ).toBeLessThanOrEqual(844);
      await fieldPage.screenshot({
        animations: "disabled",
        path: testInfo.outputPath(`${screenId}-initial-field-viewport.png`),
      });
      await fieldPage.close();
    }
  });

  test("reflows every responsive and desktop responsibility at a 200% equivalent viewport", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-chromium",
      "One deterministic reflow inventory pass",
    );
    await page.setViewportSize({ width: 720, height: 512 });
    for (const screenId of [
      "SCR-001",
      "SCR-002",
      "SCR-003",
      "SCR-004",
      "SCR-006",
      "SCR-039",
      "SCR-040",
      "SCR-043",
      "SCR-044",
      "SCR-045",
    ]) {
      await page.goto(`#/screens/${screenId}?state=normal`, {
        waitUntil: "networkidle",
      });
      await expect(
        page.locator(`[data-screen-id="${screenId}"]`),
      ).toBeVisible();
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(
        overflow,
        `${screenId} has horizontal page overflow`,
      ).toBeLessThanOrEqual(1);
      await page.screenshot({
        animations: "disabled",
        path: testInfo.outputPath(`${screenId}-reflow-720x512.png`),
      });
    }
  });

  test("prints verification, time review, and cost allocation without mutation chrome", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-chromium",
      "Print responsibilities are reviewed once",
    );
    await page.emulateMedia({ media: "print", reducedMotion: "reduce" });
    for (const screenId of ["SCR-006", "SCR-043", "SCR-045"]) {
      await page.goto(`#/screens/${screenId}?state=completion`, {
        waitUntil: "networkidle",
      });
      await expect(
        page.locator(`[data-screen-id="${screenId}"]`),
      ).toBeVisible();
      await expect(page.locator(".wave-review-controls")).toBeHidden();
      await expect(
        page.locator('[data-component-id="CMP-004"] [data-block-id]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-component-id="CMP-007"] button').first(),
      ).toBeHidden();
      await expect(page.locator(".wave-screen-footer")).toBeVisible();
      await page.pdf({
        format: "Letter",
        path: testInfo.outputPath(`${screenId}-print.pdf`),
        printBackground: true,
      });
    }
  });

  test("supports visible keyboard operation, authority denial, and replay announcements", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "field-mobile",
      "Field keyboard walkthrough",
    );
    await page.goto("#/screens/SCR-005?state=normal", {
      waitUntil: "networkidle",
    });

    const browse = page.locator(".mobile-menu summary");
    await browse.focus();
    await expect(browse).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator(".mobile-menu")).toHaveAttribute("open", "");

    const context = page.locator(".wave-shell-context");
    await context.focus();
    await expect(context).toBeFocused();

    const role = page.locator('[data-component-id="CMP-003"] select');
    await role.focus();
    await expect(role).toBeFocused();

    const enabled = page.locator(".wave-action:not(:disabled)").first();
    await enabled.focus();
    await expect(enabled).toBeFocused();
    const focusStyle = await enabled.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        outlineColor: style.outlineColor,
        outlineWidth: style.outlineWidth,
        boxShadow: style.boxShadow,
      };
    });
    expect(focusStyle.outlineColor).toBe("rgb(40, 99, 106)");
    expect(Number.parseFloat(focusStyle.outlineWidth)).toBeGreaterThanOrEqual(
      3,
    );
    expect(focusStyle.boxShadow).not.toBe("none");
    await testInfo.attach("field-keyboard-focus", {
      body: await page.screenshot({ animations: "disabled" }),
      contentType: "image/png",
    });
    await page.keyboard.press("Enter");
    await expect(page.locator(".wave-live-message")).toContainText("previewed");
    await expect(page.locator(".wave-action:disabled").first()).toBeDisabled();

    await page.goto("#/prototypes/FLW-001", { waitUntil: "networkidle" });
    const replay = page.getByRole("button", {
      name: "Validate & append next event",
    });
    await replay.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator('[data-replay-status="appended"]')).toBeVisible();
  });

  test("honors reduced motion for loading evidence", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-chromium",
      "One computed reduced-motion check",
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("#/screens/SCR-043?state=loading", {
      waitUntil: "networkidle",
    });
    await expect(page.locator(".wave-loading-note span")).toHaveCSS(
      "animation-name",
      "none",
    );
  });
});
