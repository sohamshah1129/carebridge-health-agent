import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { agentSystemPrompt, agentTools, emergencyPattern } from "@/lib/agent";
import { encrypt } from "@/lib/crypto";
import { mockInsurerAdapter } from "@/lib/insurer";

const schema = z.object({ message: z.string().trim().min(1).max(1000) });
const toolInput = z.object({ patientId: z.string().min(1).max(80).optional(), slotId: z.string().min(1).max(80).optional(), appointmentId: z.string().min(1).max(80).optional(), preAuthId: z.string().min(1).max(80).optional(), reason: z.string().max(500).optional() });

async function executeTool(name: string, rawArgs: string, patientId?: string) {
  let args: unknown; try { args = JSON.parse(rawArgs); } catch { return { error: "Invalid tool arguments." }; }
  const parsed = toolInput.safeParse(args); if (!parsed.success) return { error: "Invalid tool arguments." };
  const data = parsed.data;
  if (name === "book_appointment") {
    if (!data.slotId || !patientId || (data.patientId && data.patientId !== patientId)) return { error: "Sign in to book an appointment." };
    try { return await prisma.$transaction(async tx => { const slot = await tx.slot.findUnique({ where: { id: data.slotId! }, include: { doctor: true } }); if (!slot || !slot.isAvailable || slot.startsAt < new Date()) return { error: "This slot is unavailable." }; const appt = await tx.appointment.create({ data: { patientId, doctorId: slot.doctorId, slotId: slot.id, reasonEncrypted: data.reason ? encrypt(data.reason) : null } }); await tx.slot.update({ where: { id: slot.id }, data: { isAvailable: false } }); return { appointmentId: appt.id, startsAt: slot.startsAt.toISOString(), doctor: slot.doctor.name, specialty: slot.doctor.specialty, status: appt.status }; }, { isolationLevel: "Serializable" }); } catch { return { error: "This slot could not be booked. Check availability and try again." }; }
  }
  if (name === "reschedule") {
    if (!data.appointmentId || !data.slotId || !patientId) return { error: "Sign in to reschedule an appointment." };
    try { return await prisma.$transaction(async tx => { const appt = await tx.appointment.findFirst({ where: { id: data.appointmentId!, patientId, status: { notIn: ["CANCELLED", "COMPLETED"] } } }); const slot = await tx.slot.findUnique({ where: { id: data.slotId! } }); if (!appt || !slot?.isAvailable || slot.startsAt < new Date()) return { error: "Appointment or new slot is unavailable." }; await tx.appointment.update({ where: { id: appt.id }, data: { slotId: slot.id, doctorId: slot.doctorId } }); await tx.slot.update({ where: { id: appt.slotId }, data: { isAvailable: true } }); await tx.slot.update({ where: { id: slot.id }, data: { isAvailable: false } }); await tx.reminder.updateMany({ where: { appointmentId: appt.id, status: "PENDING" }, data: { status: "CANCELLED" } }); for (const hours of [24, 2]) await tx.reminder.create({ data: { patientId, appointmentId: appt.id, channel: "SMS", scheduledAt: new Date(slot.startsAt.getTime() - hours * 3600000), idempotencyKey: `${appt.id}:reschedule:${slot.id}:${hours}h` } }); return { status: "rescheduled", startsAt: slot.startsAt.toISOString() }; }, { isolationLevel: "Serializable" }); } catch { return { error: "Unable to reschedule. Please contact the clinic." }; }
  }
  if (name === "cancel_appointment") {
    if (!data.appointmentId || !patientId) return { error: "Sign in to cancel an appointment." };
    try { return await prisma.$transaction(async tx => { const appointment = await tx.appointment.findFirst({ where: { id: data.appointmentId!, patientId, status: { notIn: ["CANCELLED", "COMPLETED"] } } }); if (!appointment) return { error: "No cancellable appointment was found." }; await tx.appointment.update({ where: { id: appointment.id }, data: { status: "CANCELLED" } }); await tx.slot.update({ where: { id: appointment.slotId }, data: { isAvailable: true } }); await tx.reminder.updateMany({ where: { appointmentId: appointment.id, status: "PENDING" }, data: { status: "CANCELLED" } }); return { status: "cancelled", appointmentId: appointment.id }; }, { isolationLevel: "Serializable" }); } catch { return { error: "Unable to cancel this appointment. Please contact the clinic." }; }
  }
  if (name === "check_eligibility") {
    if (!patientId || (data.patientId && data.patientId !== patientId)) return { error: "Sign in to check policy eligibility." };
    const policy = await prisma.policy.findFirst({ where: { patientId, active: true }, include: { insurer: true } }); if (!policy) return { error: "No active policy was found in clinic records." };
    const result = await mockInsurerAdapter.checkEligibility({ insurer: policy.insurer.name, policyNumber: "REDACTED", sumInsured: policy.sumInsured.toString() });
    const record = await prisma.eligibilityCheck.create({ data: { patientId, policyId: policy.id, eligible: result.eligible, responseCode: result.responseCode } }); return { checkId: record.id, insurer: policy.insurer.name, eligible: record.eligible, checkedAt: record.checkedAt.toISOString(), note: "Mock insurer adapter result; confirm with insurer." };
  }
  if (name === "get_preauth_status") {
    if (!data.preAuthId || !patientId) return { error: "Sign in to view pre-authorization status." };
    const item = await prisma.preAuth.findFirst({ where: { id: data.preAuthId, patientId }, select: { id: true, status: true, createdAt: true, updatedAt: true } }); return item ?? { error: "No matching pre-authorization was found." };
  }
  return { error: "Unknown tool." };
}

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Please enter a message under 1,000 characters." }, { status: 400 });
  if (emergencyPattern.test(parsed.data.message)) return NextResponse.json({ reply: "This may be an emergency. Call 112 or 108 now, or go to the nearest emergency department. I’m escalating this to clinic staff. I’m an AI assistant and cannot provide emergency care." });
  const apiKey = process.env.SARVAM_API_KEY; if (!apiKey) return NextResponse.json({ error: "The AI assistant is not configured. Please contact the clinic team." }, { status: 503 });
  const session = await auth().catch(() => null); const patientId = session?.user.role === "PATIENT" ? session.user.id : undefined;
  const messages: Array<Record<string, unknown>> = [{ role: "system", content: agentSystemPrompt }, { role: "user", content: parsed.data.message }];
  try {
    for (let turn = 0; turn < 3; turn++) {
      const response = await fetch("https://api.sarvam.ai/v2/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", "api-subscription-key": apiKey }, body: JSON.stringify({ model: "sarvam-105b", messages, tools: agentTools, tool_choice: "auto", parallel_tool_calls: false, max_tokens: 600, reasoning_effort: "none" }), signal: AbortSignal.timeout(20000), cache: "no-store" });
      if (!response.ok) return NextResponse.json({ error: "The assistant is temporarily unavailable. Please contact clinic staff." }, { status: 502 });
      const payload = await response.json(); const message = payload.choices?.[0]?.message; if (!message) break;
      if (message.tool_calls?.length) {
        messages.push({ role: "assistant", content: message.content ?? null, tool_calls: message.tool_calls });
        for (const call of message.tool_calls.slice(0, 1)) { const result = await executeTool(call.function.name, call.function.arguments, patientId); messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) }); }
        continue;
      }
      return NextResponse.json({ reply: String(message.content ?? "Please contact the clinic team for help.") });
    }
    return NextResponse.json({ reply: "I couldn’t complete that request. Please contact the clinic team." });
  } catch { return NextResponse.json({ error: "The assistant is temporarily unavailable. Please try again." }, { status: 502 }); }
}
