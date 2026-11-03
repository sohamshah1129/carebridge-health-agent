export interface InsurerAdapter {
  checkEligibility(input: { insurer: string; policyNumber: string; sumInsured: string }): Promise<{ eligible: boolean; responseCode: string }>;
}

export const mockInsurerAdapter: InsurerAdapter = {
  async checkEligibility() { return { eligible: true, responseCode: "MOCK_VERIFIED" }; },
};
