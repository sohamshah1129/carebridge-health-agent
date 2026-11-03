"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, CalendarDays, ChevronDown, CircleHelp, HeartPulse, LayoutDashboard, MessageCircle, Moon, Settings2, ShieldCheck, Sparkles, Sun, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AgentChat } from "@/components/agent-chat";

const items = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/patients", label: "Patients & intake", icon: Users },
  { href: "/campaigns", label: "Campaigns", icon: MessageCircle },
  { href: "/insurance", label: "Insurance & claims", icon: ShieldCheck },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export function AppShell({ children, title, eyebrow }: { children: React.ReactNode; title: string; eyebrow?: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(false);
  useEffect(() => { const preference = localStorage.getItem("carebridge-theme"); const enabled = preference === "dark"; setDark(enabled); document.documentElement.classList.toggle("dark-mode", enabled); }, []);
  function toggleTheme() { const enabled = !dark; setDark(enabled); document.documentElement.classList.toggle("dark-mode", enabled); localStorage.setItem("carebridge-theme", enabled ? "dark" : "light"); }
  return <div className="min-h-screen bg-[#f6f9f8]">
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[250px] flex-col border-r border-[#e5eeed] bg-white px-4 py-5 transition-transform lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="mb-9 flex items-center justify-between px-2">
        <Link href="/" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#087e83] text-white"><HeartPulse size={20}/></span><span><strong className="block text-[15px] tracking-tight">carebridge</strong><small className="text-[11px] text-[#839699]">Clinic workspace</small></span></Link>
        <button aria-label="Close menu" className="btn btn-ghost lg:hidden" onClick={() => setMobileOpen(false)}><X size={18}/></button>
      </div>
      <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-[#9aabad]">Workspace</div>
      <nav aria-label="Main navigation" className="space-y-1">{items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={`sidebar-link ${pathname === href ? "active" : ""}`}><Icon size={17}/>{label}</Link>)}</nav>
      <div className="mt-auto">
        <div className="mb-4 rounded-2xl bg-[#f2f8f7] p-4"><div className="mb-2 flex items-center gap-2 text-xs font-bold text-[#1a5860]"><Sparkles size={15}/> Care assistant</div><p className="mb-3 text-[11px] leading-5 text-[#718689]">Answers routine questions and helps coordinate care.</p><button className="btn btn-soft w-full !py-2 text-[11px]" onClick={() => window.dispatchEvent(new Event("carebridge:open-chat"))}>Open assistant</button></div>
        <button className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-[#f5f8f7]"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dcedea] text-xs font-bold text-[#176b70]">AM</span><span className="min-w-0 flex-1"><strong className="block truncate text-xs">Aarav Mehta</strong><small className="text-[10px] text-[#8a9b9d]">Clinic administrator</small></span><ChevronDown size={15} className="text-[#95a6a7]"/></button>
      </div>
    </aside>
    {mobileOpen && <button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-slate-900/20 lg:hidden"/>}
    <main className="min-h-screen lg:pl-[250px]">
      <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-[#e5eeed] bg-white/90 px-5 backdrop-blur md:px-8">
        <div className="flex items-center gap-3"><button aria-label="Open navigation" onClick={() => setMobileOpen(true)} className="btn btn-ghost !px-2 lg:hidden"><Activity size={18}/></button><div><div className="text-[10px] font-bold uppercase tracking-[.15em] text-[#8da0a0]">{eyebrow || "Clinic workspace"}</div><h1 className="mt-0.5 text-[16px] font-semibold tracking-tight">{title}</h1></div></div>
        <div className="flex items-center gap-3"><Link href="/portal" className="hidden text-xs font-semibold text-[#668184] hover:text-[#087e83] sm:block">Patient portal</Link><div className="hidden h-8 w-px bg-[#e7efed] sm:block"/><button className="btn btn-ghost !p-2" aria-label={dark ? "Use light theme" : "Use dark theme"} onClick={toggleTheme}>{dark?<Sun size={17}/>:<Moon size={17}/>}</button><button className="btn btn-ghost !p-2" aria-label="Help"><CircleHelp size={17}/></button><span className="h-9 w-9 rounded-full border-2 border-white bg-[#dcefeb] shadow-sm" aria-label="User avatar"/></div>
      </header>
      <div className="mx-auto max-w-[1400px] px-5 py-7 md:px-8 md:py-9">{children}</div>
    </main>
    <AgentChat/>
  </div>;
}
