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
        name: /seasonal planning, dispatch, execution \+ verification/i,
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

  test("binds SCR-001 to FIX-001 and realizes the complete recovery contract", async ({
    page,
  }) => {
    await page.goto("#/screens/SCR-001", { waitUntil: "networkidle" });

    const supervisorMode = page.getByRole("button", { name: "Supervisor" });
    if ((await supervisorMode.getAttribute("aria-pressed")) !== "true") {
      await supervisorMode.click();
    }

    await expect(page.getByText("FIX-001 · seed 20260713")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Carneros Ridge Block 07" }),
    ).toBeVisible();
    await expect(page.getByText("FIX-001 · recovery replay")).toBeVisible();

    const recovery = page.locator('[data-fixture-id="FIX-001"]').filter({
      has: page.getByRole("heading", {
        name: "Resolve the recorded field stop",
      }),
    });
    await expect(recovery).toHaveAttribute("data-current-state", "blocked");

    await recovery
      .getByRole("button", { name: "Release repaired work" })
      .click();
    await expect(recovery).toHaveAttribute("data-current-state", "assigned");
    await expect(recovery.getByText("11.2 of 18.6 acres")).toBeVisible();

    await recovery
      .getByRole("button", { name: "Acknowledge remaining scope" })
      .click();
    await expect(recovery).toHaveAttribute(
      "data-current-state",
      "acknowledged",
    );
    await recovery
      .getByRole("button", { name: "Resume remaining rows" })
      .click();
    await expect(recovery).toHaveAttribute("data-current-state", "in_progress");
    await recovery
      .getByRole("button", { name: "Complete remaining rows" })
      .click();
    await expect(recovery).toHaveAttribute("data-current-state", "completed");

    await recovery
      .getByRole("button", { name: "Verify completed work" })
      .click();
    await expect(recovery).toHaveAttribute("data-current-state", "verified");

    await recovery
      .getByRole("button", { name: "Inspect status history" })
      .click();
    const history = page.getByRole("region", {
      name: "Immutable status history",
    });
    await expect(history).toBeVisible();
    await expect(history.getByText("EVT-013", { exact: true })).toBeVisible();
    await expect(
      history.getByText(/Elena Ortiz · Vineyard manager/).first(),
    ).toBeVisible();
    await expect(
      history.getByText(/Immutable fixture event/).first(),
    ).toBeVisible();
  });

  test("keeps queue selection inside the active filter", async ({ page }) => {
    await page.goto("#/screens/SCR-001", { waitUntil: "networkidle" });
    const supervisorMode = page.getByRole("button", { name: "Supervisor" });
    if ((await supervisorMode.getAttribute("aria-pressed")) !== "true") {
      await supervisorMode.click();
    }

    await page.getByRole("button", { name: "Closed history" }).click();
    const selectedRow = page.locator("table .work-select[aria-pressed='true']");
    await expect(selectedRow).toContainText("WO-260617-02");
    await expect(
      page.getByRole("heading", { name: "Shoot thin · final rows" }),
    ).toBeVisible();
  });

  test("queues offline field evidence and prevents a conflict overwrite", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "field-mobile",
      "Mobile field contract",
    );
    await page.goto("#/screens/SCR-001", { waitUntil: "networkidle" });

    await expect(
      page.getByRole("heading", {
        name: "Mechanical undervine mowing — Block 07",
      }),
    ).toBeVisible();
    await expect(page.getByText("Offline field mode")).toBeVisible();

    const acres = page.getByLabel("Completed acres");
    await acres.fill("19");
    await expect(
      page.getByText(/cannot exceed the 18.6-acre block target/i),
    ).toBeVisible();
    await acres.fill("11.2");
    await page
      .getByRole("button", { name: "Queue partial completion" })
      .click();

    const queue = page.getByRole("region", { name: "Offline queue" });
    await expect(queue.getByText("1 field update queued")).toBeVisible();
    await expect(
      queue.getByText("In progress → partially completed"),
    ).toBeVisible();
    await queue.getByRole("button", { name: "Attempt sync" }).click();

    const conflict = page.getByRole("alert").filter({
      hasText: "The work order changed elsewhere",
    });
    await expect(conflict).toBeVisible();
    await expect(conflict).toContainText("Assigned — repair confirmed");
    await conflict.getByRole("button", { name: "Review newer status" }).click();
    await expect(
      page.getByText("Conflict resolved without overwrite"),
    ).toBeVisible();
  });
});
