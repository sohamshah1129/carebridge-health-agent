import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { istDayRange } from "@/lib/time";

const querySchema = z.object({ specialty: z.string().min(2).max(60), date: z.string().date() });
export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse({ specialty: request.nextUrl.searchParams.get("specialty"), date: request.nextUrl.searchParams.get("date") });
  if (!parsed.success) return NextResponse.json({ error: "Choose a specialty and valid date." }, { status: 400 });
  const { specialty, date } = parsed.data;
  const { start, end } = istDayRange(date);
  try { const slots = await prisma.slot.findMany({ where: { isAvailable: true, startsAt: { gte: start, lt: end }, doctor: { active: true, specialty: { equals: specialty, mode: "insensitive" } } }, include: { doctor: { select: { name: true } } }, orderBy: { startsAt: "asc" }, take: 40 }); return NextResponse.json({ slots: slots.map(slot => ({ id: slot.id, startsAt: slot.startsAt.toISOString(), doctor: slot.doctor.name })) }); }
  catch { return NextResponse.json({ error: "Availability is temporarily unavailable." }, { status: 503 }); }
}
