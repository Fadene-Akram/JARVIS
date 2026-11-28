import { useMemo, useState } from "react";
import { Cpu, Mic, Square, Send, Volume2, VolumeX } from "lucide-react";
import { useJarvis } from "../hooks/useJarvis";
import { metaFor } from "./jarvis/tools";
import ChatInterface from "./jarvis/ChatInterface";
import ToolsPanel from "./jarvis/ToolsPanel";
import VoiceVisualizer from "./jarvis/VoiceVisualizer";

const AMBER = {
  pill: "border-amber-400/50 bg-amber-400/10 text-amber-300",
  dot: "bg-amber-400 animate-pulse",
  ring: "animate-pulse border-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.6)]",
  tone: "text-amber-300",
};

const PHASES = {
  idle: {
    label: "READY",
    hint: "Awaiting command",
    pill: "border-cyan-400/40 bg-cyan-400/10 text-cyan-300",
    dot: "bg-cyan-400",
    ring: "border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.5)]",
    tone: "text-cyan-300",
  },
  listening: {
    label: "LISTENING",
    hint: "Press the button again to send",
    pill: "border-red-500/50 bg-red-500/10 text-red-400",
    dot: "bg-red-500 animate-pulse",
    ring: "animate-pulse border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.8)]",
    tone: "text-red-400",
  },
  transcribing: {
    label: "TRANSCRIBING",
    hint: "Converting speech to text",
    ...AMBER,
  },
  thinking: { label: "PROCESSING", hint: "Working on it", ...AMBER },
  speaking: {
    label: "SPEAKING",
    hint: "Press the mic to interrupt",
    pill: "border-emerald-400/50 bg-emerald-400/10 text-emerald-300",
    dot: "bg-emerald-400 animate-pulse",
    ring: "animate-pulse border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.8)]",
    tone: "text-emerald-400",
  },
};

export default function JarvisInterface() {
  const {
    messages,
    phase,
    muted,
    level,
    activeTools,
    toggleMic,
    toggleMute,
    sendText,
  } = useJarvis();
  const [draft, setDraft] = useState("");

  const particles = useMemo(
    () =>
      Array.from({ length: 18 }, () => ({
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 6}s`,
        duration: `${5 + Math.random() * 6}s`,
      })),
    [],
  );

  const p = PHASES[phase];
  const runningName = Object.values(activeTools)[0];
  const subText = runningName
    ? `${metaFor(runningName).verb}…`
    : muted && phase === "idle"
      ? "Voice responses disabled"
      : p.hint;
  const listening = phase === "listening";

  const submit = (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    sendText(draft);
    setDraft("");
  };

  return (
    <div className="relative h-full overflow-hidden bg-[radial-gradient(ellipse_at_center,#001a1a_0%,#000_70%)] text-cyan-50">
      {/* Background */}
      <div className="hud-grid absolute inset-0 animate-grid" />
      <div className="pointer-events-none absolute inset-0">
        {particles.map((pt, i) => (
          <span
            key={i}
            className="absolute bottom-0 h-0.5 w-0.5 rounded-full bg-cyan-400 animate-float"
            style={{
              left: pt.left,
              animationDelay: pt.delay,
              animationDuration: pt.duration,
            }}
          />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-0 h-px animate-scan-y bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 w-px animate-scan-x bg-gradient-to-b from-transparent via-cyan-400/60 to-transparent" />
      <div className="pointer-events-none absolute left-[10%] top-[20%] h-72 w-72 rounded-full bg-cyan-500/10 blur-[60px]" />
      <div className="pointer-events-none absolute bottom-[20%] right-[10%] h-96 w-96 rounded-full bg-blue-500/10 blur-[60px]" />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-[1700px] flex-col gap-4 p-4 lg:p-6">
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between">
          <div className="flex items-center gap-3">
            <Cpu className="h-9 w-9 text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            <div>
              <h1 className="bg-gradient-to-r from-cyan-300 to-sky-400 bg-clip-text font-hud text-2xl font-black uppercase tracking-[0.2em] text-transparent">
                J.A.R.V.I.S.
              </h1>
              <p className="text-xs tracking-wide text-cyan-500">
                Just A Rather Very Intelligent System
              </p>
            </div>
          </div>
          <div
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 font-hud text-[11px] font-bold tracking-widest transition-colors ${p.pill}`}
          >
            <span className={`h-2 w-2 rounded-full ${p.dot}`} />
            {p.label}
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:grid-rows-1">
          {/* Sidebar */}
          <aside className="hud-scroll flex min-h-0 flex-col gap-5 lg:overflow-y-auto lg:pr-1">
            {/* Core */}
            <div className="hidden flex-col items-center gap-4 rounded-xl border border-cyan-500/25 bg-cyan-950/30 p-5 backdrop-blur lg:flex">
              <div className="relative flex h-32 w-32 items-center justify-center">
                <span className="absolute inset-0 animate-spin rounded-full border border-dashed border-cyan-500/40 [animation-duration:14s]" />
                <span className="absolute inset-3 animate-spin rounded-full border border-cyan-500/30 [animation-direction:reverse] [animation-duration:9s]" />
                <div
                  className={`flex h-20 w-20 items-center justify-center rounded-full border-2 bg-cyan-500/10 transition-all duration-300 ${p.ring}`}
                >
                  <Cpu className="h-9 w-9 text-cyan-300" />
                </div>
              </div>
              <div className="text-center">
                <p
                  className={`font-hud text-sm font-bold tracking-widest ${p.tone}`}
                >
                  {p.label}
                </p>
                <p
                  className={`mt-1 text-xs ${runningName ? "text-amber-300" : "text-cyan-500"}`}
                >
                  {subText}
                </p>
              </div>
              <VoiceVisualizer mode={phase} level={level} />
            </div>

            <ToolsPanel activeTools={activeTools} messages={messages} />
          </aside>

          {/* Chat */}
          <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-cyan-500/25 bg-[rgba(0,26,26,0.6)] shadow-[0_0_40px_rgba(6,182,212,0.15)] backdrop-blur-xl">
            <ChatInterface messages={messages} />

            <div className="flex items-center gap-3 border-t border-cyan-500/20 bg-cyan-950/30 p-4">
              {/* The mic is never disabled: pressing it while Jarvis speaks interrupts him */}
              <button
                onClick={toggleMic}
                title={
                  listening
                    ? "Stop and send"
                    : phase === "speaking"
                      ? "Interrupt and speak"
                      : "Start voice input"
                }
                className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 transition-all hover:scale-105 ${
                  listening
                    ? "border-red-500 bg-red-500/10 text-red-400 shadow-[0_0_35px_rgba(239,68,68,0.8)]"
                    : "border-cyan-400 bg-cyan-500/10 text-cyan-300 hover:shadow-[0_0_30px_rgba(34,211,238,0.8)]"
                }`}
              >
                {listening && (
                  <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ripple" />
                )}
                {listening ? (
                  <Square className="relative h-5 w-5" />
                ) : (
                  <Mic className="relative h-6 w-6" />
                )}
              </button>

              <button
                onClick={toggleMute}
                title={
                  muted ? "Enable voice responses" : "Disable voice responses"
                }
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition-all hover:scale-105 ${
                  muted
                    ? "border-red-500/60 text-red-400 opacity-70"
                    : phase === "speaking"
                      ? "animate-pulse border-emerald-400 text-emerald-300 shadow-[0_0_25px_rgba(52,211,153,0.7)]"
                      : "border-cyan-500/60 text-cyan-300"
                }`}
              >
                {muted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </button>

              <form
                onSubmit={submit}
                className="flex min-w-0 flex-1 items-center gap-2"
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  disabled={listening}
                  placeholder="Type a command…"
                  className="min-w-0 flex-1 rounded-xl border border-cyan-500/30 bg-cyan-950/40 px-4 py-3 text-[15px] text-cyan-50 placeholder:text-cyan-700 focus:border-cyan-300 focus:outline-none disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || listening}
                  className="rounded-xl border border-cyan-500/40 p-3 text-cyan-300 transition hover:bg-cyan-500/10 disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
