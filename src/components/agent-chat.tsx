"use client";

import { FormEvent, useEffect, useState } from "react";
import { Bot, LoaderCircle, MessageCircle, Send, ShieldAlert, X } from "lucide-react";

type Entry = { role: "assistant" | "user"; content: string };
export function AgentChat() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Entry[]>([{ role: "assistant", content: "Hi, I’m the Carebridge AI assistant. I can help with appointments and clinic FAQs. What would you like help with?" }]);
  useEffect(() => { const listener = () => setOpen(true); window.addEventListener("carebridge:open-chat", listener); return () => window.removeEventListener("carebridge:open-chat", listener); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); const prompt = text.trim(); if (!prompt || busy) return;
    setText(""); setMessages(current => [...current, { role: "user", content: prompt }]);
    const emergency = /chest pain|can't breathe|cannot breathe|suicid|overdose|stroke|unconscious|severe bleeding/i.test(prompt);
    setBusy(true);
    try {
      if (emergency) {
        const response = await fetch("/api/escalations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reasonCode: "EMERGENCY_KEYWORD" }) });
        const data: { recorded?: boolean } = await response.json();
        setMessages(current => [...current, { role: "assistant", content: data.recorded ? "This may be an emergency. Please call 112 or 108 now, or go to the nearest emergency department. I’ve notified the clinic team so a person can follow up." : "This may be an emergency. Please call 112 or 108 now, or go to the nearest emergency department. I couldn’t notify the clinic team from here; please contact them directly." }]);
        return;
      }
      const response = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: prompt }) });
      const data: { reply?: string; error?: string } = await response.json();
      setMessages(current => [...current, { role: "assistant", content: data.reply ?? data.error ?? "I couldn’t complete that request. Please contact the clinic team." }]);
    } catch { setMessages(current => [...current, { role: "assistant", content: emergency ? "This may be an emergency. Please call 112 or 108 now, or go to the nearest emergency department. I couldn’t notify the clinic team from here; please contact them directly." : "I can’t reach the clinic assistant right now. Please try again or contact the front desk." }]); }
    finally { setBusy(false); }
  }
  return <>
    {!open && <button aria-label="Open AI assistant" onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full bg-[#087e83] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-[#087e83]/20 hover:bg-[#07666c]"><MessageCircle size={17}/> Ask the care assistant</button>}
    {open && <section aria-label="AI assistant chat" className="fixed bottom-4 right-4 z-50 flex h-[min(620px,calc(100vh-32px))] w-[min(390px,calc(100vw-32px))] flex-col overflow-hidden rounded-[22px] border border-[#dce9e6] bg-white shadow-2xl">
      <header className="flex items-center justify-between bg-[#0c6970] px-4 py-4 text-white"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15"><Bot size={18}/></span><div><strong className="block text-sm">Carebridge assistant</strong><span className="text-[10px] text-white/75">AI assistant · Clinic workspace</span></div></div><button aria-label="Close assistant" onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-white/10"><X size={17}/></button></header>
      <div aria-live="polite" className="flex-1 space-y-3 overflow-y-auto bg-[#f7faf9] p-4">{messages.map((message, index) => <div key={index} className={`max-w-[88%] rounded-2xl px-3.5 py-3 text-[13px] leading-5 ${message.role === "user" ? "ml-auto rounded-br-md bg-[#087e83] text-white" : "rounded-bl-md border border-[#e4eeec] bg-white text-[#34575a]"}`}>{message.content}</div>)}{busy && <div className="flex items-center gap-2 text-xs text-[#738a8c]"><LoaderCircle size={14} className="animate-spin"/> Checking clinic information…</div>}</div>
      <div className="border-t border-[#e8efee] bg-white p-3"><div className="mb-2 flex items-start gap-2 rounded-lg bg-[#fff8e8] px-2.5 py-2 text-[10px] leading-4 text-[#8a6a2f]"><ShieldAlert size={13} className="mt-0.5 shrink-0"/>Not for diagnosis or treatment advice. For emergencies call 108 or 112.</div><form onSubmit={submit} className="flex gap-2"><label className="sr-only" htmlFor="agent-message">Message the AI assistant</label><input id="agent-message" className="field !rounded-xl" value={text} onChange={event => setText(event.target.value)} placeholder="Ask about appointments…" maxLength={1000}/><button className="btn btn-primary !px-3" disabled={!text.trim() || busy} aria-label="Send message"><Send size={15}/></button></form></div>
    </section>}
  </>;
}
