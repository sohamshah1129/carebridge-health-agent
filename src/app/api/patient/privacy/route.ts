import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

async function patientForSession(): Promise<{ error: NextResponse; patientId?: never } | { error?: undefined; patientId: string }> {
  const session = await auth(); if (!session?.user?.id) return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { patientId: true, role: true } });
  if (!user?.patientId || user.role !== "PATIENT") return { error: NextResponse.json({ error: "Patient account required." }, { status: 403 }) };
  return { patientId: user.patientId };
}

export async function GET() {
  const access = await patientForSession(); if (access.error) return access.error;
  try {
    const patient = await prisma.patient.findUnique({ where: { id: access.patientId }, include: { intakeForms: { orderBy: { submittedAt: "desc" } }, appointments: { select: { id: true, status: true, createdAt: true } } } });
    if (!patient) return NextResponse.json({ error: "Patient record not found." }, { status: 404 });
    await prisma.auditLog.create({ data: { patientId: patient.id, action: "DATA_EXPORT", resource: "Patient", resourceId: patient.id } });
    const { intakeForms, ...profile } = patient;
    return NextResponse.json({ profile, intake: intakeForms.map(form => ({ submittedAt: form.submittedAt, symptoms: decrypt(form.symptomsEncrypted), allergies: form.allergiesEncrypted ? decrypt(form.allergiesEncrypted) : null, medications: form.medicationsEncrypted ? decrypt(form.medicationsEncrypted) : null })) });
  } catch { return NextResponse.json({ error: "Unable to export patient data." }, { status: 503 }); }
}

export async function DELETE(request: NextRequest) {
  const access = await patientForSession(); if (access.error) return access.error;
  const confirmation = await request.json().catch(() => null);
  if (confirmation?.confirm !== "DELETE_MY_DATA") return NextResponse.json({ error: "Explicit deletion confirmation is required." }, { status: 400 });
  try { await prisma.$transaction(async tx => { await tx.auditLog.create({ data: { patientId: access.patientId, action: "DATA_DELETION_REQUESTED", resource: "Patient", resourceId: access.patientId } }); await tx.patient.delete({ where: { id: access.patientId } }); }); return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ error: "Unable to delete this record. Contact the clinic privacy contact." }, { status: 503 }); }
}
