import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({ messaging: z.enum(["opt_in", "opt_out"]) });
export async function POST(request: NextRequest) {
  const session = await auth(); if (!session?.user?.id) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Invalid consent selection." }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { patientId: true, role: true } });
  if (!user?.patientId || user.role !== "PATIENT") return NextResponse.json({ error: "Patient account required." }, { status: 403 });
  const optedIn = parsed.data.messaging === "opt_in";
  try { await prisma.$transaction([prisma.patient.update({ where: { id: user.patientId }, data: { messagingOptInAt: optedIn ? new Date() : null, messagingOptOutAt: optedIn ? null : new Date() } }), prisma.auditLog.create({ data: { actorId: session.user.id, patientId: user.patientId, action: optedIn ? "MESSAGING_OPT_IN" : "MESSAGING_OPT_OUT", resource: "PatientConsent" } })]); return NextResponse.json({ ok: true, messaging: parsed.data.messaging }); }
  catch { return NextResponse.json({ error: "Unable to update consent." }, { status: 503 }); }
}
