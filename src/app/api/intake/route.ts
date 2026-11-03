import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";

const schema = z.object({ firstName: z.string().trim().min(1).max(80), lastName: z.string().trim().min(1).max(80), email: z.union([z.string().email().max(254), z.literal("")]).optional(), phone: z.string().regex(/^\+?[0-9 ()-]{8,18}$/), symptoms: z.string().trim().min(1).max(2000), allergies: z.string().max(1000).optional(), medications: z.string().max(1000).optional(), consent: z.literal("on") });
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null); const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Please check the intake fields and consent." }, { status: 400 });
  try {
    const d = parsed.data; const phone = d.phone.replace(/[ ()-]/g, "");
    const patient = await prisma.patient.upsert({ where: { phone }, create: { firstName: d.firstName, lastName: d.lastName, phone, email: d.email || null, consentedAt: new Date() }, update: { firstName: d.firstName, lastName: d.lastName, email: d.email || undefined, consentedAt: new Date() } });
    await prisma.$transaction([prisma.intakeForm.create({ data: { patientId: patient.id, symptomsEncrypted: encrypt(d.symptoms), allergiesEncrypted: d.allergies ? encrypt(d.allergies) : null, medicationsEncrypted: d.medications ? encrypt(d.medications) : null, consent: true } }), prisma.auditLog.create({ data: { patientId: patient.id, action: "INTAKE_SUBMITTED", resource: "IntakeForm" } })]);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch { return NextResponse.json({ error: "Unable to save intake. Please contact the clinic team." }, { status: 503 }); }
}
