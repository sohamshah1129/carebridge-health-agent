import { describe, expect, it } from "vitest";
import { emergencyPattern } from "@/lib/agent";
import { istDayRange } from "@/lib/time";
import { canManageCampaigns, canManageClinic, canManageInsurance } from "@/lib/permissions";

describe("emergency handling", () => {
  it("detects emergency keywords", () => { expect(emergencyPattern.test("I have chest pain")).toBe(true); expect(emergencyPattern.test("I need a routine check-up")).toBe(false); });
});
describe("Asia/Kolkata calendar boundaries", () => {
  it("returns a 24-hour UTC range aligned to IST midnight", () => { const { start, end } = istDayRange("2026-03-18"); expect(start.toISOString()).toBe("2026-03-17T18:30:00.000Z"); expect(end.getTime() - start.getTime()).toBe(86400000); });
  it("rejects malformed dates", () => { expect(() => istDayRange("18/03/2026")).toThrow(); });
});
describe("role policy", () => {
  it("allows only admin and front desk to manage campaigns", () => { expect(canManageCampaigns("ADMIN")).toBe(true); expect(canManageCampaigns("PATIENT")).toBe(false); });
  it("restricts clinic settings to admins", () => { expect(canManageClinic("ADMIN")).toBe(true); expect(canManageClinic("DOCTOR")).toBe(false); });
  it("allows billing and admins to manage insurance", () => { expect(canManageInsurance("BILLING")).toBe(true); expect(canManageInsurance("PATIENT")).toBe(false); });
});
