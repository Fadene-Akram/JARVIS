// import { Calendar, Users, Mail, Search } from "lucide-react";
// import { Card } from "../ui/Card";
// import "./ToolsPanel.css"; // CSS file

// export default function ToolsPanel() {
//   const tools = [
//     {
//       name: "Calendar",
//       icon: <Calendar className="tool-icon" />,
//       status: "active",
//       description: "Schedule management",
//     },
//     {
//       name: "Contacts",
//       icon: <Users className="tool-icon" />,
//       status: "active",
//       description: "Contact management",
//     },
//     {
//       name: "Email",
//       icon: <Mail className="tool-icon" />,
//       status: "active",
//       description: "Email operations",
//     },
//     {
//       name: "Web Search",
//       icon: <Search className="tool-icon" />,
//       status: "active",
//       description: "Information retrieval",
//     },
//   ];

//   return (
//     <div className="tools-grid">
//       {tools.map((tool) => (
//         <Card key={tool.name} className="tool-card">
//           <div className="tool-item">
//             <div className="tool-icon-wrapper">{tool.icon}</div>
//             <div className="tool-text">
//               <p className="tool-name">{tool.name}</p>
//               <p className="tool-description">{tool.description}</p>
//             </div>
//             <div
//               className={`tool-status ${
//                 tool.status === "active" ? "status-active" : "status-inactive"
//               }`}
//             />
//           </div>
//         </Card>
//       ))}
//     </div>
//   );
// }

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
    <div className="grid shrink-0 grid-cols-2 gap-3 md:grid-cols-5">
      {GROUPS.map(({ key, label, desc, Icon }) => {
        const active = running.has(key);
        return (
          <div
            key={key}
            className={`relative flex items-center gap-3 rounded-xl border p-3 backdrop-blur transition-all duration-300 ${
              active
                ? "border-amber-400 bg-amber-400/10 shadow-[0_0_25px_rgba(251,191,36,0.45)]"
                : "border-cyan-500/30 bg-cyan-950/30"
            }`}
          >
            <div
              className={`rounded-lg p-2 ${
                active
                  ? "bg-amber-400/20 text-amber-300"
                  : "bg-cyan-500/10 text-cyan-300"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "animate-pulse" : ""}`} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold tracking-wider">
                {label}
              </p>
              <p
                className={`truncate text-[10px] ${active ? "text-amber-300" : "text-cyan-500"}`}
              >
                {active ? "RUNNING…" : desc}
              </p>
            </div>
            {counts[key] > 0 && (
              <span className="absolute right-2 top-1.5 text-[10px] text-cyan-400/70">
                ×{counts[key]}
              </span>
            )}
            <span
              className={`absolute bottom-2 right-2 h-2 w-2 rounded-full ${
                active ? "animate-ping bg-amber-400" : "bg-emerald-400"
              }`}
            />
          </div>
        );
      })}
    </div>
  );
}
