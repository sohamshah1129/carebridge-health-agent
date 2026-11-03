"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { HeartPulse, LoaderCircle } from "lucide-react";

export default function LoginPage() {
  const [pending, setPending] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setPending(true); setError(""); const data = new FormData(event.currentTarget); const result = await signIn("credentials", { email: data.get("email"), password: data.get("password"), redirect: false, callbackUrl: "/dashboard" }); setPending(false); if (result?.error) setError("Email or password was not recognized."); else window.location.assign(result?.url ?? "/dashboard"); }
  return <main className="flex min-h-screen items-center justify-center bg-[#f5f9f8] px-5 py-10"><section className="card w-full max-w-md p-7 sm:p-9"><Link href="/" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#087e83] text-white"><HeartPulse size={19}/></span><strong>carebridge</strong></Link><h1 className="mt-8 text-2xl font-semibold">Welcome back</h1><p className="mt-2 text-sm text-[#829596]">Sign in to your clinic workspace.</p><form onSubmit={submit} className="mt-6 space-y-4"><div><label htmlFor="email" className="mb-1.5 block text-xs font-semibold">Work email</label><input className="field" id="email" name="email" type="email" autoComplete="username" required maxLength={254}/></div><div><label htmlFor="password" className="mb-1.5 block text-xs font-semibold">Password</label><input className="field" id="password" name="password" type="password" autoComplete="current-password" required minLength={8} maxLength={128}/></div>{error&&<p role="alert" className="text-xs text-[#aa514d]">{error}</p>}<button className="btn btn-primary w-full" disabled={pending}>{pending&&<LoaderCircle size={14} className="animate-spin"/>}Sign in</button></form><p className="mt-5 text-center text-[11px] text-[#849798]">Patient? <Link className="font-semibold text-[#087e83]" href="/portal">Use the patient portal</Link></p></section></main>;
}
