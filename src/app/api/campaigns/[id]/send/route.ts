import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorized } from "@/lib/authorization";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const access = await authorized(["ADMIN", "FRONT_DESK"]); if (access.error) return access.error;
  const key = request.headers.get("Idempotency-Key"); if (!key || key.length > 100) return NextResponse.json({ error: "A valid request key is required." }, { status: 400 });
  const { id } = await context.params;
  try {
    const campaign = await prisma.campaign.findUnique({ where: { id } }); if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    if (campaign.status === "SENT") return NextResponse.json({ ok: true, recipientCount: 0, status: "SENT" });
    const patients = await prisma.patient.findMany({ where: { messagingOptInAt: { not: null }, messagingOptOutAt: null }, select: { id: true }, take: 5000 });
    if (!patients.length) return NextResponse.json({ error: "There are no opted-in recipients for this campaign." }, { status: 409 });
    const count = await prisma.$transaction(async tx => {
      const created = await tx.campaignRecipient.createMany({ data: patients.map(patient => ({ campaignId: id, patientId: patient.id })), skipDuplicates: true });
      await tx.campaign.update({ where: { id }, data: { status: "SENT" } });
      await tx.campaignRecipient.updateMany({ where: { campaignId: id, optedOutAt: null, sentAt: null }, data: { sentAt: new Date() } });
      return created.count;
    });
    return NextResponse.json({ ok: true, recipientCount: count, status: "SENT", adapter: "mock" });
  } catch { return NextResponse.json({ error: "Unable to queue this campaign." }, { status: 503 }); }
}
