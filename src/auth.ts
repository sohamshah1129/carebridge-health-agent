import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [Credentials({
    credentials: { email: {}, password: { type: "password" } },
    async authorize(credentials) {
      const parsed = z.object({ email: z.string().email().max(254), password: z.string().min(8).max(128) }).safeParse(credentials);
      if (!parsed.success) return null;
      const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
      if (!user || !(await compare(parsed.data.password, user.passwordHash))) return null;
      return { id: user.id, name: user.name, email: user.email, role: user.role };
    },
  })],
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) { if (user) { token.sub = user.id; token.role = (user as typeof user & { role?: string }).role; } return token; },
    session({ session, token }) { if (session.user) { session.user.id = token.sub ?? ""; session.user.role = typeof token.role === "string" ? token.role : "PATIENT"; } return session; },
  },
});
