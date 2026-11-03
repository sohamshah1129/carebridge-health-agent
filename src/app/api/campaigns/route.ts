import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authorized } from "@/lib/authorization";

const schema = z.object({ name: z.string().trim().min(3).max(100), message: z.string().trim().min(5).max(1000), segment: z.enum(["inactive_90", "recent_visit", "preventive"]) });
export async function POST(request: NextRequest) {
  const access = await authorized(["ADMIN", "FRONT_DESK"]); if (access.error) return access.error;
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Please review the campaign name and message." }, { status: 400 });
  try { const campaign = await prisma.campaign.create({ data: { name: parsed.data.name, message: parsed.data.message } }); return NextResponse.json({ ok: true, id: campaign.id }, { status: 201 }); }
  catch { return NextResponse.json({ error: "Unable to save the campaign." }, { status: 503 }); }
}
