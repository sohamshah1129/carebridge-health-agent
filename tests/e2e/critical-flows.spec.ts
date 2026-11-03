import { expect, test } from "@playwright/test";

test("intake then appointment request shows saved states", async ({ page }) => {
  await page.route("**/api/intake", route => route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true }) }));
  await page.route("**/api/slots?**", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ slots: [{ id: "slot-demo", doctor: "Dr. Rohan Menon", startsAt: "2026-11-05T04:00:00.000Z" }] }) }));
  await page.route("**/api/appointments", route => route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true, appointmentId: "appt-demo" }) }));
  await page.goto("/portal");
  await page.getByLabel("First name").fill("Test"); await page.getByLabel("Last name").fill("Patient"); await page.getByLabel("Phone").fill("+919876543210"); await page.getByLabel("What brings you in?").fill("Routine visit"); await page.getByLabel(/I consent to the clinic processing/).check(); await page.getByRole("button", { name: "Submit intake" }).click(); await expect(page.getByText("Saved. Your clinic team can review this request.").first()).toBeVisible();
  await page.getByLabel("Patient name").fill("Test Patient"); await page.getByLabel("Phone number").fill("+919876543210"); await page.getByLabel("Specialty").selectOption("Cardiology"); await page.getByLabel("Preferred date").fill("2026-11-05"); await page.getByLabel("Available slot").selectOption("slot-demo"); await page.getByLabel(/I consent to the clinic using these details/).check(); await page.getByRole("button", { name: "Request appointment" }).click(); await expect(page.getByText("Saved. Your clinic team can review this request.").last()).toBeVisible();
});

test("pre-authorization lifecycle is visible to staff", async ({ page }) => {
  await page.goto("/insurance");
  await expect(page.getByText("Pre-auth status timeline")).toBeVisible();
  await expect(page.getByText("Query raised", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Approved / Rejected")).toBeVisible();
});

test("campaign draft can be queued through the mock send adapter", async ({ page }) => {
  await page.route("**/api/campaigns", route => route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true, id: "campaign-demo" }) }));
  await page.route("**/api/campaigns/campaign-demo/send", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, recipientCount: 4, adapter: "mock" }) }));
  await page.goto("/campaigns");
  await page.getByLabel("Campaign name").fill("Wellness reminder"); await page.getByLabel("Message template").fill("Please contact your clinic to schedule a check-up."); await page.getByRole("button", { name: "Save campaign draft" }).click(); await page.getByRole("button", { name: "Queue mock send" }).click(); await expect(page.getByText("4 opted-in recipients queued by the mock adapter.")).toBeVisible();
});
