export const roles = { ADMIN: ["ADMIN", "DOCTOR", "FRONT_DESK", "BILLING"], PATIENT: ["PATIENT"] } as const;
export function canManageCampaigns(role: string) { return role === "ADMIN" || role === "FRONT_DESK"; }
export function canManageInsurance(role: string) { return role === "ADMIN" || role === "BILLING"; }
export function canManageClinic(role: string) { return role === "ADMIN"; }
