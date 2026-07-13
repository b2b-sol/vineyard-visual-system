import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("factory walking slice", () => {
  test("exposes the atlas directory and stable workflow route", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("#/", { waitUntil: "networkidle" });

    await expect(
      page.getByRole("heading", { name: /from field signal/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Atlas directory" }),
    ).toBeVisible();

    await page
      .getByRole("link", { name: /enter planning \+ dispatch/i })
      .click();
    await expect(page).toHaveURL(/#\/workflows\/WF-001$/);
    await expect(
      page.getByRole("heading", {
        name: /seasonal planning \+ work-order dispatch/i,
      }),
    ).toBeVisible();
  });

  test("renders explicit non-ideal states without serious accessibility findings", async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("#/screens/SCR-001", { waitUntil: "networkidle" });

    await expect(
      page.getByRole("heading", { name: "Non-ideal states stay explicit" }),
    ).toBeVisible();
    const stateRegion = page.getByRole("region", {
      name: "Non-ideal states stay explicit",
    });
    await expect(
      stateRegion.getByText("Blocked", { exact: true }),
    ).toBeVisible();
    await expect(
      stateRegion.getByText("Offline queued", { exact: true }),
    ).toBeVisible();
    await expect(
      stateRegion.getByText("Corrected", { exact: true }),
    ).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? ""),
    );
    expect(blocking).toEqual([]);

    await testInfo.attach("planning-dispatch", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  });
});
