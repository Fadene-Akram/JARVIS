import { useEffect, useRef, useState } from "react";
import { apiFetch, streamAssistant } from "../apis";

const uid = () => crypto.randomUUID();
const isAbort = (e) => e?.name === "AbortError";

export function useJarvis() {
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      type: "assistant",
      content: "System online. Ready to assist you, sir.",
      tools: [],
      timestamp: new Date(),
    },
  ]);
  // idle | listening | transcribing | thinking | speaking
  const [phase, setPhase] = useState("idle");
  const [muted, setMuted] = useState(false);
  const [level, setLevel] = useState(0);
  const [activeTools, setActiveTools] = useState({}); // call id -> tool name

  const mutedRef = useRef(false);
  const audioEl = useRef(null);
  const ttsUrl = useRef(null);
  const abortRef = useRef(null);
  const reqId = useRef(0);
  const recorder = useRef(null);
  const micStream = useRef(null);
  const micSource = useRef(null);
  const audioCtx = useRef(null);
  const raf = useRef(null);

  if (!audioEl.current && typeof Audio !== "undefined")
    audioEl.current = new Audio();

  // ---------------------------------------------------------------- helpers
  const addMessage = (type, content) =>
    setMessages((p) => [
      ...p,
      { id: uid(), type, content, tools: [], timestamp: new Date() },
    ]);

  const patch = (id, fn) =>
    setMessages((p) => p.map((m) => (m.id === id ? fn(m) : m)));

  const stopSpeaking = () => {
    const a = audioEl.current;
    if (a) {
      a.onended = null;
      a.onerror = null;
      a.pause();
    }
    if (ttsUrl.current) {
      URL.revokeObjectURL(ttsUrl.current);
      ttsUrl.current = null;
    }
  };

  const cleanupMic = () => {
    cancelAnimationFrame(raf.current);
    micSource.current?.disconnect();
    micSource.current = null;
    micStream.current?.getTracks().forEach((t) => t.stop());
    micStream.current = null;
    setLevel(0);
  };

  // Starts a new "turn": everything still running from the previous one
  // (requests, speech) becomes stale and is cancelled.
  const beginRequest = () => {
    reqId.current += 1;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    stopSpeaking();
    setActiveTools({});
    return { id: reqId.current, signal: controller.signal };
  };

  useEffect(
    () => () => {
      abortRef.current?.abort();
      cleanupMic();
      stopSpeaking();
    },
    [],
  );

  // ------------------------------------------------------------------- TTS
  const speak = async (text, id, signal) => {
    setPhase("speaking");
    try {
      const res = await apiFetch("/api/text-to-speech/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      if (id !== reqId.current) return; // user already moved on

      const url = URL.createObjectURL(blob);
      ttsUrl.current = url;
      const a = audioEl.current;
      a.src = url;
      a.onended = a.onerror = () => {
        stopSpeaking();
        if (id === reqId.current) setPhase("idle");
      };
      await a.play();
    } catch (e) {
      if (!isAbort(e)) console.error("TTS failed:", e);
      if (id === reqId.current) setPhase("idle");
    }
  };

  // ------------------------------------------------------------- assistant
  const runAssistant = async (text, id, signal) => {
    const msgId = uid();
    setMessages((p) => [
      ...p,
      {
        id: msgId,
        type: "assistant",
        content: "",
        pending: true,
        tools: [],
        timestamp: new Date(),
      },
    ]);
    setPhase("thinking");

    const stale = () => id !== reqId.current;
    const dropPending = () =>
      setMessages((p) => p.filter((m) => m.id !== msgId));
    let final = null;

    try {
      await streamAssistant(
        text,
        (ev) => {
          if (stale()) return;
          if (ev.type === "tool_start") {
            setActiveTools((p) => ({ ...p, [ev.id]: ev.name }));
            patch(msgId, (m) => ({
              ...m,
              tools: [
                ...m.tools,
                { id: ev.id, name: ev.name, args: ev.args, status: "running" },
              ],
            }));
          } else if (ev.type === "tool_end") {
            setActiveTools((p) => {
              const n = { ...p };
              delete n[ev.id];
              return n;
            });
            patch(msgId, (m) => ({
              ...m,
              tools: m.tools.map((t) =>
                t.id === ev.id
                  ? { ...t, status: ev.ok ? "done" : "error", ms: ev.ms }
                  : t,
              ),
            }));
          } else if (ev.type === "final") {
            final = ev.text;
          } else if (ev.type === "error") {
            throw new Error(ev.message);
          }
        },
        signal,
      );

      if (stale()) return dropPending();
      final = final || "I'm afraid I don't know, sir.";
      patch(msgId, (m) => ({ ...m, content: final, pending: false }));
      setActiveTools({});

      if (mutedRef.current) setPhase("idle");
      else await speak(final, id, signal);
    } catch (e) {
      if (isAbort(e) || stale()) return dropPending();
      console.error("Assistant error:", e);
      patch(msgId, (m) => ({
        ...m,
        content: "Sorry, I encountered an error processing your request.",
        pending: false,
      }));
      setActiveTools({});
      setPhase("idle");
    }
  };

  const handleAudio = async (blob) => {
    const { id, signal } = beginRequest();
    setPhase("transcribing");
    try {
      const form = new FormData();
      form.append(
        "audio",
        blob,
        blob.type.includes("mp4") ? "recording.mp4" : "recording.webm",
      );
      const res = await apiFetch("/api/speech-to-text/", {
        method: "POST",
        body: form,
        signal,
      });

      if (res.status === 400) {
        addMessage("assistant", "I didn't catch that, sir. Please try again.");
        return setPhase("idle");
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { text } = await res.json();
      if (id !== reqId.current) return;

      addMessage("user", text);
      await runAssistant(text, id, signal);
    } catch (e) {
      if (isAbort(e)) return;
      console.error("STT error:", e);
      addMessage(
        "assistant",
        "Sorry, there was an error processing your audio.",
      );
      if (id === reqId.current) setPhase("idle");
    }
  };

  const sendText = async (text) => {
    const clean = text.trim();
    if (!clean) return;
    const { id, signal } = beginRequest();
    addMessage("user", clean);
    await runAssistant(clean, id, signal);
  };

  // ------------------------------------------------------------- microphone
  const meter = (analyser) => {
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const avg = Math.round(data.reduce((s, v) => s + v, 0) / data.length);
      setLevel((prev) => (Math.abs(avg - prev) > 2 ? avg : prev));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };

  const startListening = async () => {
    beginRequest(); // barge-in: cancels any running request and stops the speaker
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStream.current = stream;

      audioCtx.current ??= new (
        window.AudioContext || window.webkitAudioContext
      )();
      await audioCtx.current.resume();
      const source = audioCtx.current.createMediaStreamSource(stream);
      const analyser = audioCtx.current.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      micSource.current = source;
      meter(analyser);

      const mime =
        ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((t) =>
          MediaRecorder.isTypeSupported(t),
        ) || "";
      const rec = new MediaRecorder(
        stream,
        mime ? { mimeType: mime } : undefined,
      );
      const chunks = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        cleanupMic();
        const blob = new Blob(chunks, { type: rec.mimeType });
        if (blob.size < 1000) {
          addMessage(
            "assistant",
            "I didn't catch anything, sir. Please try again.",
          );
          setPhase("idle");
        } else {
          handleAudio(blob);
        }
      };
      recorder.current = rec;
      rec.start();
      setPhase("listening");
    } catch (e) {
      console.error("Microphone error:", e);
      cleanupMic();
      setPhase("idle");
      addMessage(
        "assistant",
        "I can't access the microphone. Please check permissions.",
      );
    }
  };

  const stopListening = () => {
    if (recorder.current?.state === "recording") recorder.current.stop();
  };

  const toggleMic = () =>
    phase === "listening" ? stopListening() : startListening();

  const toggleMute = () => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    if (next) {
      stopSpeaking();
      setPhase((p) => (p === "speaking" ? "idle" : p));
    }
  };

  return {
    messages,
    phase,
    muted,
    level,
    activeTools,
    toggleMic,
    toggleMute,
    sendText,
  };
}
