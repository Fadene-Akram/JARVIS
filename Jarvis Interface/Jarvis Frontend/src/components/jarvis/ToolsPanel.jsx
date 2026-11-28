import { useMemo } from "react";
import { GROUPS, metaFor } from "./tools";

export default function ToolsPanel({ activeTools, messages }) {
  const running = useMemo(
    () => new Set(Object.values(activeTools).map((n) => metaFor(n).group)),
    [activeTools],
  );

  const counts = useMemo(() => {
    const c = {};
    for (const m of messages)
      for (const t of m.tools ?? []) {
        const g = metaFor(t.name).group;
        c[g] = (c[g] ?? 0) + 1;
      }
    return c;
  }, [messages]);

  return (
    <div className="hud-scroll flex gap-3 overflow-x-auto lg:flex-col lg:overflow-visible">
      <p className="hidden px-1 font-hud text-[10px] font-bold tracking-[0.25em] text-cyan-500 lg:block">
        SUBSYSTEMS
      </p>
      {GROUPS.map(({ key, label, desc, Icon }) => {
        const active = running.has(key);
        return (
          <div
            key={key}
            className={`flex min-w-[11rem] flex-col gap-1.5 rounded-xl border p-3 backdrop-blur transition-all duration-300 lg:min-w-0 ${
              active
                ? "border-amber-400 bg-amber-400/10 shadow-[0_0_25px_rgba(251,191,36,0.4)]"
                : "border-cyan-500/25 bg-cyan-950/30"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`rounded-lg p-1.5 ${
                  active
                    ? "bg-amber-400/20 text-amber-300"
                    : "bg-cyan-500/10 text-cyan-300"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "animate-pulse" : ""}`} />
              </div>
              <p className="flex-1 truncate font-hud text-xs font-bold tracking-wider">
                {label}
              </p>
              <span className="relative flex h-2 w-2">
                {active && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${
                    active ? "bg-amber-400" : "bg-emerald-400"
                  }`}
                />
              </span>
            </div>
            <div className="flex items-center justify-between pl-0.5 text-xs">
              <span className={active ? "text-amber-300" : "text-cyan-500"}>
                {active ? "Running…" : desc}
              </span>
              {counts[key] > 0 && (
                <span className="tabular-nums text-cyan-400/60">
                  {counts[key]} used
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
