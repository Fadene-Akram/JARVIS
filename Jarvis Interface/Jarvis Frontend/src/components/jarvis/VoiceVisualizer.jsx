const FACTORS = Array.from(
  { length: 24 },
  (_, i) => 0.35 + 0.65 * Math.abs(Math.sin(i * 1.7)),
);

export default function VoiceVisualizer({ mode, level }) {
  return (
    <div className="flex h-10 items-end gap-1" aria-hidden="true">
      {FACTORS.map((f, i) =>
        mode === "speaking" ? (
          <div
            key={i}
            className="h-full w-1 origin-bottom rounded-full bg-emerald-400/80 animate-wave"
            style={{ animationDelay: `${(i % 8) * 0.09}s` }}
          />
        ) : (
          <div
            key={i}
            className={`w-1 rounded-full transition-[height] duration-100 ${
              mode === "listening"
                ? "bg-red-400"
                : mode === "thinking" || mode === "transcribing"
                  ? "animate-pulse bg-amber-400/60"
                  : "bg-cyan-500/40"
            }`}
            style={{
              height:
                mode === "listening"
                  ? `${Math.min(100, 8 + level * f * 1.6)}%`
                  : mode === "thinking" || mode === "transcribing"
                    ? `${20 + f * 40}%`
                    : "8%",
            }}
          />
        ),
      )}
    </div>
  );
}
