import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { Prisma } from "@prisma/client";

const schema = z.object({ patientName: z.string().trim().min(1).max(100), phone: z.string().regex(/^\+?[0-9 ()-]{8,18}$/), specialty: z.string().trim().min(2).max(60), date: z.string().date(), slotId: z.string().min(1).max(80), reason: z.string().max(500).optional(), consent: z.literal("on") });
export async function POST(request: NextRequest) {
  const key = request.headers.get("Idempotency-Key"); if (!key || key.length > 100) return NextResponse.json({ error: "A valid request key is required." }, { status: 400 });
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Please check the appointment details and consent." }, { status: 400 });
  try {
    const d = parsed.data; const phone = d.phone.replace(/[ ()-]/g, "");
    const result = await prisma.$transaction(async tx => {
      const prior = await tx.appointment.findUnique({ where: { idempotencyKey: key }, include: { slot: true } }); if (prior) return prior;
      const patient = await tx.patient.upsert({ where: { phone }, create: { firstName: d.patientName.split(" ")[0], lastName: d.patientName.split(" ").slice(1).join(" ") || "Patient", phone, consentedAt: new Date() }, update: { consentedAt: new Date() } });
      const slot = await tx.slot.findUnique({ where: { id: d.slotId }, include: { doctor: true } });
      if (!slot || !slot.isAvailable || slot.startsAt < new Date() || slot.doctor.specialty.toLowerCase() !== d.specialty.toLowerCase()) throw new Error("SLOT_UNAVAILABLE");
      const slotDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(slot.startsAt);
      if (slotDate !== d.date) throw new Error("SLOT_UNAVAILABLE");
      const appointment = await tx.appointment.create({ data: { patientId: patient.id, doctorId: slot.doctorId, slotId: slot.id, reasonEncrypted: d.reason ? encrypt(d.reason) : null, idempotencyKey: key } });
      await tx.slot.update({ where: { id: slot.id }, data: { isAvailable: false } });
      for (const hours of [24, 2]) await tx.reminder.create({ data: { patientId: patient.id, appointmentId: appointment.id, channel: "SMS", scheduledAt: new Date(slot.startsAt.getTime() - hours * 3600000), idempotencyKey: `${appointment.id}:${hours}h` } });
      await tx.auditLog.create({ data: { patientId: patient.id, action: "APPOINTMENT_BOOKED", resource: "Appointment", resourceId: appointment.id } });
      return appointment;
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ ok: true, appointmentId: result.id }, { status: 201 });
  } catch (error) { const message = error instanceof Error ? error.message : ""; const known = error instanceof Prisma.PrismaClientKnownRequestError; if (known && error.code === "P2002") { const prior = await prisma.appointment.findUnique({ where: { idempotencyKey: key }, select: { id: true } }).catch(() => null); if (prior) return NextResponse.json({ ok: true, appointmentId: prior.id }, { status: 200 }); } const conflict = known && ["P2002", "P2034"].includes(error.code); return NextResponse.json({ error: message === "SLOT_UNAVAILABLE" || conflict ? "That slot is no longer available. Please choose another." : "Unable to book this appointment." }, { status: message === "SLOT_UNAVAILABLE" || conflict ? 409 : 503 }); }
}
