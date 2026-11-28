// const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";
// const TOKEN = import.meta.env.VITE_API_TOKEN;

// export function apiFetch(path, options = {}) {
//   return fetch(`${API_BASE}${path}`, {
//     ...options,
//     headers: { ...(options.headers || {}), Authorization: `Token ${TOKEN}` },
//   });
// }

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";
const TOKEN = import.meta.env.VITE_API_TOKEN;

export function apiFetch(path, options = {}) {
  const url = /^https?:\/\//.test(path) ? path : `${API_BASE}${path}`;
  return fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Token ${TOKEN}` },
  });
}

// Calls /api/assistant/stream/ and invokes onEvent for every JSON line:
// {type:"tool_start"|"tool_end"|"final"|"error", ...}
export async function streamAssistant(text, onEvent, signal) {
  const res = await apiFetch("/api/assistant/stream/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line) onEvent(JSON.parse(line));
    }
  }
}
