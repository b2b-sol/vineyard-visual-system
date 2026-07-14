import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("atlas factory and compatibility surfaces", () => {
  test("exposes the atlas directory and preserves the legacy workflow route", async ({
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
        name: /seasonal planning, dispatch, execution \+ verification/i,
      }),
    ).toBeVisible();
  });

  test("renders the registry-backed canonical screen with stable trace identifiers", async ({
    page,
  }) => {
    await page.goto("#/screens/SCR-001?state=offline&fixture=FIX-002", {
      waitUntil: "networkidle",
    });

    const screen = page.locator('[data-screen-id="SCR-001"]');
    await expect(screen).toHaveAttribute("data-workflow-id", "WF-001");
    await expect(screen).toHaveAttribute("data-fixture-id", "FIX-002");
    await expect(screen).toHaveAttribute("data-review-state", "offline");
    await expect(
      page.getByRole("heading", { name: "Offline journal active" }),
    ).toBeVisible();
    await expect(page.locator('[data-component-id="CMP-015"]')).toBeVisible();
  });

  test("uses default-deny actions and has no serious accessibility findings", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-chromium",
      "Desktop authority review",
    );
    await page.goto("#/screens/SCR-043?state=urgent&fixture=FIX-033", {
      waitUntil: "networkidle",
    });

    const role = page.getByLabel("Acting responsibility");
    await role.selectOption("ROLE-FIELD-CREW");
    await expect(
      page.locator('[data-component-id="CMP-007"] button:disabled').first(),
    ).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter((violation) =>
        ["serious", "critical"].includes(violation.impact ?? ""),
      ),
    ).toEqual([]);
  });
});
