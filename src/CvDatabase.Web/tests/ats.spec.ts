import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("shows a public job and accepts a demo application", async ({ page }) => {
  await page.getByRole("button", { name: "Open roles" }).click();
  await expect(page.getByRole("heading", { name: "Data Engineer" })).toBeVisible();
  await page.getByLabel("First name *").fill("Jamie");
  await page.getByLabel("Last name *").fill("Rowan");
  await page.getByLabel("Email address *").fill("jamie@example.com");
  await page.getByLabel(/Resume or CV/).setInputFiles({ name: "resume.txt", mimeType: "text/plain", buffer: Buffer.from("Demo resume") });
  await page.getByLabel(/I have read the privacy/).check();
  await page.getByRole("button", { name: /Submit application/ }).click();
  await expect(page.getByRole("heading", { name: "Thank you for applying." })).toBeVisible();
});

test("covers the required ATS demo flow", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile",
    "The full workflow is covered on desktop; mobile has a focused layout test.",
  );
  await expect(page.getByRole("heading", { name: /One workspace/ })).toBeVisible();
  await page.getByRole("button", { name: "View product demo" }).click();
  await expect(
    page.getByRole("heading", { name: "Recruitment overview" }),
  ).toBeVisible();
  if (testInfo.project.name === "desktop")
    await page.screenshot({ path: "/tmp/insidegrid-workspace-v3.png", fullPage: true });

  await page.getByRole("button", { name: /Pipeline/ }).click();
  await expect(
    page.getByRole("heading", {
      name: "Move every candidate forward with context.",
    }),
  ).toBeVisible();
  await page.getByPlaceholder("Search candidate name…").fill("Lina");
  await expect(page.getByText("Lina Berg")).toBeVisible();
  await expect(page.getByText("Maya Lindberg")).toBeHidden();
  await page.getByPlaceholder("Search candidate name…").fill("");

  await page.getByRole("button", { name: /Jobs/ }).click();
  await page
    .getByRole("button", { name: /Create job/ })
    .first()
    .click();
  await page.getByLabel("Title").fill("Security Engineer");
  await page.getByLabel("Department").selectOption("Engineering");
  await page.getByLabel("Location").selectOption("Remote · Sweden");
  await page.getByLabel("Employment type").selectOption("Full-time");
  await page.getByRole("button", { name: "Add research" }).click();
  await page.getByLabel("Company website").fill("https://example.com");
  await page
    .getByLabel("Message AI research assistant")
    .fill("Focus on culture and comparable role requirements.");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(/This is the demo preview/)).toBeVisible();
  await page.getByRole("button", { name: "Generate draft" }).click();
  const description = page.locator('textarea[name="description"]');
  await expect(description).toHaveValue(/Security Engineer/);
  await description.fill(
    `${await description.inputValue()}\n\nOur own editable addition.`,
  );
  await expect(description).toHaveValue(/Our own editable addition\./);
  if (testInfo.project.name === "desktop")
    await page.screenshot({
      path: "/tmp/insidegrid-job-ai.png",
      fullPage: true,
    });
  await page.getByRole("button", { name: /Create and open pipeline/ }).click();
  await expect(page.getByText("Security Engineer")).toBeVisible();

  await page
    .getByRole("button", { name: /Add candidate/ })
    .first()
    .click();
  await page.getByLabel("Full name").fill("Jamie Rowan");
  await page.getByLabel("Professional title").fill("Security Engineer");
  await page.getByLabel("Email").fill("jamie@example.com");
  await page.getByLabel("Skills").fill("Azure, Security, .NET");
  await page
    .getByLabel("Add to pipeline")
    .selectOption({ label: "Security Engineer" });
  await page
    .getByRole("button", { name: /^Add candidate$/ })
    .last()
    .click();
  await expect(
    page.getByText("Candidate added to the pipeline."),
  ).toBeVisible();

  if (testInfo.project.name === "desktop")
    await page.screenshot({
      path: "/tmp/insidegrid-ats-dashboard.png",
      fullPage: true,
    });
});

test("does not overflow the mobile viewport", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile-specific check");
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
  await page.getByRole("button", { name: "View product demo" }).click();
  await expect(page.getByRole("heading", { name: "Recruitment overview" })).toBeVisible();
});
