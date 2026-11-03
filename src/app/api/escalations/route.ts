import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { authorized } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

const schema = z.object({ reasonCode: z.enum(["EMERGENCY_KEYWORD", "HUMAN_REQUEST"]) });
export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid escalation." }, { status: 400 });
  try {
    const session = await auth(); let patientId: string | null = null;
    if (session?.user?.role === "PATIENT") patientId = (await prisma.user.findUnique({ where: { id: session.user.id }, select: { patientId: true } }))?.patientId ?? null;
    const escalation = await prisma.escalation.create({ data: { reasonCode: parsed.data.reasonCode, patientId } });
    return NextResponse.json({ recorded: true, escalationId: escalation.id }, { status: 201 });
  } catch { return NextResponse.json({ error: "Unable to notify the clinic right now." }, { status: 503 }); }
}

export async function GET() {
  const access = await authorized(["ADMIN", "DOCTOR", "FRONT_DESK"]); if (access.error) return access.error;
  try { const items = await prisma.escalation.findMany({ where: { status: { not: "CLOSED" } }, select: { id: true, reasonCode: true, status: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 30 }); await prisma.auditLog.create({ data: { actorId: access.session.user.id, action: "ESCALATIONS_VIEWED", resource: "EscalationQueue" } }); return NextResponse.json({ items }); }
  catch { return NextResponse.json({ error: "Escalation queue is temporarily unavailable." }, { status: 503 }); }
}
