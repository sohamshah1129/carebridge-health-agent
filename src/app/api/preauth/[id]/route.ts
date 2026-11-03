import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorized } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

const schema = z.object({ status: z.enum(["SUBMITTED", "QUERY_RAISED", "APPROVED", "REJECTED", "ENHANCEMENT"]) });
const transitions: Record<string, string[]> = { DRAFT: ["SUBMITTED"], SUBMITTED: ["QUERY_RAISED", "APPROVED", "REJECTED"], QUERY_RAISED: ["SUBMITTED", "APPROVED", "REJECTED"], APPROVED: ["ENHANCEMENT"], REJECTED: [], ENHANCEMENT: ["SUBMITTED", "APPROVED", "REJECTED"] };
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const access = await authorized(["ADMIN", "BILLING"]); if (access.error) return access.error;
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Invalid pre-authorization status." }, { status: 400 });
  const { id } = await context.params;
  try { const result = await prisma.$transaction(async tx => { const current = await tx.preAuth.findUnique({ where: { id } }); if (!current) throw new Error("NOT_FOUND"); if (!transitions[current.status].includes(parsed.data.status)) throw new Error("INVALID_TRANSITION"); const history = Array.isArray(current.history) ? current.history : []; const updated = await tx.preAuth.update({ where: { id }, data: { status: parsed.data.status, history: [...history, { from: current.status, to: parsed.data.status, at: new Date().toISOString(), actorId: access.session.user.id }] } }); await tx.auditLog.create({ data: { actorId: access.session.user.id, patientId: current.patientId, action: "PREAUTH_STATUS_CHANGED", resource: "PreAuth", resourceId: id } }); return updated; }); return NextResponse.json({ ok: true, status: result.status }); }
  catch (error) { const message = error instanceof Error ? error.message : ""; return NextResponse.json({ error: message === "NOT_FOUND" ? "Pre-authorization not found." : message === "INVALID_TRANSITION" ? "That status change is not allowed." : "Unable to update pre-authorization." }, { status: message === "NOT_FOUND" ? 404 : message === "INVALID_TRANSITION" ? 409 : 503 }); }
}
