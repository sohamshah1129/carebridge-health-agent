import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";

type AuthorizationResult = { error: NextResponse; session?: never } | { error?: undefined; session: Session };
export async function authorized(roles: string[]): Promise<AuthorizationResult> {
  const session = await auth();
  if (!session?.user) return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  if (!roles.includes(session.user.role)) return { error: NextResponse.json({ error: "You do not have access to this action." }, { status: 403 }) };
  return { session };
}
