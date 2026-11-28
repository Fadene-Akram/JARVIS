// import { useEffect, useRef, useState } from "react";
// import ReactMarkdown from "react-markdown";
// import { motion, AnimatePresence } from "framer-motion";
// import "./ChatInterface.css";

// export default function ChatInterface({ messages }) {
//   const messagesEndRef = useRef(null);

//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages]);

//   return (
//     <div className="chat-container">
//       <AnimatePresence initial={false}>
//         {messages.map((message) => (
//           <motion.div
//             key={message.id}
//             initial={{ opacity: 0, y: 10 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: -10 }}
//             transition={{ duration: 0.3 }}
//             className={`chat-message-wrapper ${
//               message.type === "user" ? "align-right" : "align-left"
//             }`}
//           >
//             <div
//               className={`chat-bubble ${
//                 message.type === "user" ? "user-bubble" : "assistant-bubble"
//               }`}
//             >
//               <div className="message-content">
//                 {message.type === "assistant" ? (
//                   <TypingMarkdown content={message.content} />
//                 ) : (
//                   <p>{message.content}</p>
//                 )}
//               </div>
//               <p className="message-timestamp">
//                 {message.timestamp.toLocaleTimeString()}
//               </p>
//             </div>
//           </motion.div>
//         ))}
//       </AnimatePresence>
//       <div ref={messagesEndRef} />
//     </div>
//   );
// }
// function TypingMarkdown({ content, speed = 20 }) {
//   const [displayedText, setDisplayedText] = useState("");
//   const [index, setIndex] = useState(0);

//   useEffect(() => {
//     // Reset state on new content
//     setDisplayedText("");
//     setIndex(0);

//     if (typeof content !== "string") return;

//     const interval = setInterval(() => {
//       setIndex((prevIndex) => {
//         const nextIndex = prevIndex + 1;

//         // When we reach the full length, stop
//         if (nextIndex > content.length) {
//           clearInterval(interval);
//           return prevIndex;
//         }

//         setDisplayedText(content.slice(0, nextIndex));
//         return nextIndex;
//       });
//     }, speed);

//     return () => clearInterval(interval);
//   }, [content, speed]);

//   return <ReactMarkdown>{displayedText}</ReactMarkdown>;
// }

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, X } from "lucide-react";
import { groupOf, metaFor } from "./tools";

const detail = (args = {}) => {
  const v =
    args.query ?? args.contact_name ?? args.title ?? args.to ?? args.name;
  return v ? String(v).slice(0, 48) : "";
};

const CHIP = {
  running: "border-amber-400/60 bg-amber-400/10 text-amber-200",
  done: "border-emerald-400/50 bg-emerald-400/10 text-emerald-200",
  error: "border-red-400/60 bg-red-400/10 text-red-200",
};

function ToolChip({ tool }) {
  const meta = metaFor(tool.name);
  const Icon = groupOf(meta.group)?.Icon;
  const extra = detail(tool.args);
  return (
    <div
      className={`flex items-center gap-2 rounded-md border px-2 py-1 text-[11px] ${CHIP[tool.status]}`}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
      <span className="truncate">
        {meta.verb}
        {extra && <span className="opacity-70"> · {extra}</span>}
      </span>
      <span className="ml-auto flex shrink-0 items-center gap-1">
        {tool.status === "running" && (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        )}
        {tool.status === "done" && <Check className="h-3.5 w-3.5" />}
        {tool.status === "error" && <X className="h-3.5 w-3.5" />}
        {tool.ms != null && <span className="opacity-60">{tool.ms} ms</span>}
      </span>
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
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 select-text">
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
                className={`max-w-[85%] rounded-xl border px-4 py-3 backdrop-blur ${
                  user
                    ? "border-emerald-500/30 bg-emerald-950/30"
                    : "border-cyan-500/30 bg-cyan-950/30"
                }`}
              >
                {tools.length > 0 && (
                  <div className="mb-2 flex flex-col gap-1.5">
                    {tools.map((t) => (
                      <ToolChip key={t.id} tool={t} />
                    ))}
                  </div>
                )}
                {m.pending && !m.content ? (
                  tools.length === 0 && <Dots />
                ) : (
                  <div className="text-sm leading-relaxed text-cyan-100 [&_code]:rounded [&_code]:bg-cyan-950 [&_code]:px-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5">
                    {user ? (
                      <p>{m.content}</p>
                    ) : (
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    )}
                  </div>
                )}
                <p className="mt-1 text-[10px] text-cyan-600">
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
