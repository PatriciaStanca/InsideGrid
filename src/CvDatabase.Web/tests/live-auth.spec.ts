import { expect, test } from "@playwright/test";

test("admin can sign in to the live Supabase workspace", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Live authentication is checked once on desktop.");
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  test.skip(!email || !password, "Live admin credentials were not supplied.");

  await page.goto("/");
  await page.getByLabel("Email address").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: /^Sign in/ }).click();
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expect(page.getByText("InsideGrid Demo")).toBeVisible();
});
