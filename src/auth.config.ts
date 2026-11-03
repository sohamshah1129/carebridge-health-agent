import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

export const authConfig = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      if (process.env.NODE_ENV === "development") return true;
      if (!auth) return false;
      const role = auth.user?.role ?? "";
      const path = request.nextUrl.pathname;
      const allowed = path.startsWith("/settings") ? role === "ADMIN"
        : path.startsWith("/campaigns") ? ["ADMIN", "FRONT_DESK"].includes(role)
        : path.startsWith("/insurance") ? ["ADMIN", "BILLING", "DOCTOR"].includes(role)
        : ["ADMIN", "DOCTOR", "FRONT_DESK", "BILLING"].includes(role);
      if (!allowed) return NextResponse.redirect(new URL("/portal", request.url));
      return true;
    },
  },
} satisfies NextAuthConfig;
