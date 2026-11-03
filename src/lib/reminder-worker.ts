import { prisma } from "@/lib/prisma";
import { messagingAdapter } from "@/lib/messaging";

// Run on a cron schedule. The provider is intentionally mocked and never sends real messages.
export async function processDueReminders(now = new Date()) {
  const due = await prisma.reminder.findMany({ where: { status: "PENDING", scheduledAt: { lte: now } }, select: { id: true, patientId: true, appointmentId: true, channel: true, patient: { select: { consentedAt: true } } }, take: 100, orderBy: { scheduledAt: "asc" } });
  let processed = 0;
  for (const item of due) {
    const claimed = await prisma.reminder.updateMany({ where: { id: item.id, status: "PENDING" }, data: { status: "PROCESSING" } });
    if (!claimed.count) continue;
    if (!item.patient.consentedAt || !item.appointmentId) { await prisma.reminder.update({ where: { id: item.id }, data: { status: "CANCELLED" } }); continue; }
    let accepted = false;
    try { const result = await messagingAdapter.deliver({ patientId: item.patientId, appointmentId: item.appointmentId, channel: item.channel, template: "APPOINTMENT_REMINDER", idempotencyKey: item.id }); accepted = result.accepted; }
    catch { accepted = false; }
    const updated = await prisma.reminder.updateMany({ where: { id: item.id, status: "PROCESSING" }, data: { status: accepted ? "SENT" : "FAILED", sentAt: accepted ? now : null } });
    if (updated.count === 1 && accepted) processed++;
  }
  return processed;
}
