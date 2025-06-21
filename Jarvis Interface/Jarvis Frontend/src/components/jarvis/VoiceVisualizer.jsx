import "./VoiceVisualizer.css";

export default function VoiceVisualizer({ isListening, audioLevel }) {
  const bars = Array.from({ length: 20 }, (_, i) => {
    const height = isListening ? Math.random() * audioLevel + 10 : 5;
    return (
      <div
        key={i}
        className="voice-bar"
        style={{
          height: `${height}%`,
          minHeight: "5px",
        }}
      />
    );
  });

  return <div className="voice-visualizer">{bars}</div>;
}
