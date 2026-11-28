import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, Loader2, Wrench, X } from "lucide-react";
import { groupOf, metaFor } from "./tools";

const detail = (args = {}) => {
  const v =
    args.query ?? args.contact_name ?? args.title ?? args.to ?? args.name;
  return v ? String(v).slice(0, 40) : "";
};
const fmt = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`);

const TONE = {
  running: "border-amber-400/40 bg-amber-400/10 text-amber-200",
  done: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  error: "border-red-400/30 bg-red-400/10 text-red-300",
};

function ToolPill({ tool }) {
  const meta = metaFor(tool.name);
  const Icon = groupOf(meta.group)?.Icon;
  const extra = detail(tool.args);
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border py-1 pl-2 pr-2.5 text-xs ${TONE[tool.status]}`}
    >
      {tool.status === "running" && (
        <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
      )}
      {tool.status === "done" && <Check className="h-3 w-3 shrink-0" />}
      {tool.status === "error" && <X className="h-3 w-3 shrink-0" />}
      {Icon && <Icon className="h-3 w-3 shrink-0 opacity-70" />}
      <span className="truncate">
        {meta.verb}
        {extra && <span className="opacity-60"> · {extra}</span>}
      </span>
      {tool.ms != null && (
        <span className="shrink-0 tabular-nums opacity-50">{fmt(tool.ms)}</span>
      )}
    </span>
  );
}

// Live while the answer is pending; collapses into a one-line summary afterwards.
function ToolActivity({ tools, pending }) {
  const [open, setOpen] = useState(false);
  const failed = tools.filter((t) => t.status === "error").length;
  return (
    <div className="mb-3">
      {!pending && (
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 text-xs text-cyan-400/80 transition hover:text-cyan-300"
        >
          <Wrench className="h-3 w-3" />
          Used {tools.length} tool{tools.length > 1 ? "s" : ""}
          {failed > 0 && (
            <span className="text-red-300">· {failed} failed</span>
          )}
          <ChevronDown
            className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      )}
      {(pending || open) && (
        <div className={`flex flex-wrap gap-1.5 ${pending ? "" : "mt-2"}`}>
          {tools.map((t) => (
            <ToolPill key={t.id} tool={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function Dots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-400"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

export default function ChatInterface({ messages }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="hud-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-5 select-text">
      <AnimatePresence initial={false}>
        {messages.map((m) => {
          const user = m.type === "user";
          const tools = m.tools ?? [];
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex ${user ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-3xl rounded-2xl border px-4 py-3 ${
                  user
                    ? "rounded-br-sm border-emerald-500/30 bg-emerald-950/40"
                    : "rounded-bl-sm border-cyan-500/25 bg-cyan-950/40"
                }`}
              >
                {tools.length > 0 && (
                  <ToolActivity tools={tools} pending={!!m.pending} />
                )}
                {m.pending && !m.content ? (
                  tools.length === 0 && <Dots />
                ) : (
                  <div className="text-[15px] leading-relaxed text-cyan-50 [&_code]:rounded [&_code]:bg-cyan-950 [&_code]:px-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-0.5">
                    {user ? (
                      <p>{m.content}</p>
                    ) : (
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    )}
                  </div>
                )}
                <p className="mt-1.5 text-[11px] tabular-nums text-cyan-600">
                  {m.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
      <div ref={endRef} />
    </div>
  );
}
