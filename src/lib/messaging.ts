export type MessageChannel = "EMAIL" | "SMS" | "WHATSAPP";
export interface MessageAdapter {
  deliver(input: { patientId: string; channel: MessageChannel; template: "APPOINTMENT_REMINDER"; appointmentId: string; idempotencyKey: string }): Promise<{ accepted: boolean; providerId?: string }>;
}

// Local-only mock. It deliberately does not contact a messaging provider or include patient text.
export const messagingAdapter: MessageAdapter = {
  async deliver() { return { accepted: true, providerId: "mock-provider" }; },
};
