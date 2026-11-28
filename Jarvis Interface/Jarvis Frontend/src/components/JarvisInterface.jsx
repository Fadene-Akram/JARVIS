// import { useState, useEffect, useRef } from "react";
// import { Mic, MicOff, Volume2, VolumeX, Cpu } from "lucide-react";
// import { Button } from "./ui/Button";
// import { Card } from "./ui/Card";
// import VoiceVisualizer from "./jarvis/VoiceVisualizer";
// import ChatInterface from "./jarvis/ChatInterface";
// import ToolsPanel from "./jarvis/ToolsPanel";
// import SystemStatus from "./jarvis/SystemStatus";
// import "./JarvisInterface.css";
// import { apiFetch } from "../apis"; // adjust the path to where api.js lives

// export default function JarvisInterface() {
//   const [isListening, setIsListening] = useState(false);
//   const [isSpeaking, setIsSpeaking] = useState(false);
//   const [isMuted, setIsMuted] = useState(false);
//   const [hasInitialized, setHasInitialized] = useState(false);
//   const [hasUserInteracted, setHasUserInteracted] = useState(false);
//   const [systemPulse, setSystemPulse] = useState(0);
//   const [messages, setMessages] = useState([
//     {
//       id: "1",
//       type: "assistant",
//       content: "System online. Ready to assist you, sir.",
//       timestamp: new Date(),
//     },
//   ]);
//   const [currentInput, setCurrentInput] = useState("");
//   const [audioLevel, setAudioLevel] = useState(0);
//   const [audioContext, setAudioContext] = useState(null);
//   const [mediaRecorder, setMediaRecorder] = useState(null);
//   const [audioChunks, setAudioChunks] = useState([]);
//   const [analyser, setAnalyser] = useState(null);

//   const audioRef = useRef(null);
//   const mediaStreamRef = useRef(null);
//   const animationFrameRef = useRef(null);
//   const pulseIntervalRef = useRef(null);
//   const audioLevelRef = useRef(0);

//   // Add refs to prevent layout shifts
//   const lastAudioUpdateRef = useRef(0);
//   const isTransitioningRef = useRef(false);

//   // System pulse animation for the core reactor
//   useEffect(() => {
//     pulseIntervalRef.current = setInterval(() => {
//       setSystemPulse((prev) => (prev + 1) % 100);
//     }, 50);

//     return () => {
//       if (pulseIntervalRef.current) {
//         clearInterval(pulseIntervalRef.current);
//       }
//     };
//   }, []);

//   // Initialize audio context and handle initial setup
//   useEffect(() => {
//     const initAudioContext = async () => {
//       try {
//         const context = new (
//           window.AudioContext || window.webkitAudioContext
//         )();
//         setAudioContext(context);
//       } catch (error) {
//         console.error("Error initializing audio context:", error);
//       }
//     };

//     // Add click listener to detect first user interaction
//     const handleFirstInteraction = () => {
//       setHasUserInteracted(true);
//       // Try to play initial message after first interaction
//       if (!hasInitialized && !isMuted) {
//         setHasInitialized(true);
//         setTimeout(() => {
//           playAssistantResponse("System online. Ready to assist you, sir.");
//         }, 500);
//       }
//     };

//     initAudioContext();

//     // Listen for any user interaction
//     if (!hasUserInteracted) {
//       document.addEventListener("click", handleFirstInteraction, {
//         once: true,
//       });
//       document.addEventListener("keydown", handleFirstInteraction, {
//         once: true,
//       });
//       document.addEventListener("touchstart", handleFirstInteraction, {
//         once: true,
//       });
//     }

//     return () => {
//       if (audioContext) {
//         audioContext.close();
//       }
//       if (animationFrameRef.current) {
//         cancelAnimationFrame(animationFrameRef.current);
//       }
//       // Clean up event listeners
//       document.removeEventListener("click", handleFirstInteraction);
//       document.removeEventListener("keydown", handleFirstInteraction);
//       document.removeEventListener("touchstart", handleFirstInteraction);
//     };
//   }, [hasInitialized, isMuted, hasUserInteracted]);

//   // Handle listening state changes with smoother transitions
//   useEffect(() => {
//     if (isListening) {
//       isTransitioningRef.current = true;
//       startRecording().finally(() => {
//         isTransitioningRef.current = false;
//       });
//     } else {
//       isTransitioningRef.current = true;
//       stopRecording();
//       // Smooth audio level transition to 0
//       const smoothStop = () => {
//         if (audioLevelRef.current > 1) {
//           audioLevelRef.current *= 0.8; // Gradual decay
//           setAudioLevel(Math.round(audioLevelRef.current));
//           requestAnimationFrame(smoothStop);
//         } else {
//           audioLevelRef.current = 0;
//           setAudioLevel(0);
//           isTransitioningRef.current = false;
//         }
//       };
//       requestAnimationFrame(smoothStop);
//     }

//     return () => {
//       if (animationFrameRef.current) {
//         cancelAnimationFrame(animationFrameRef.current);
//       }
//     };
//   }, [isListening]);

//   const startRecording = async () => {
//     try {
//       console.log("Starting recording...");

//       // Request microphone access
//       const stream = await navigator.mediaDevices.getUserMedia({
//         audio: {
//           echoCancellation: true,
//           noiseSuppression: true,
//           autoGainControl: true,
//         },
//       });

//       mediaStreamRef.current = stream;

//       // Set up audio analysis for visualization
//       if (audioContext && audioContext.state === "suspended") {
//         await audioContext.resume();
//       }

//       if (audioContext) {
//         const source = audioContext.createMediaStreamSource(stream);
//         const analyserNode = audioContext.createAnalyser();
//         analyserNode.fftSize = 256;
//         analyserNode.smoothingTimeConstant = 0.9; // Increased smoothing
//         source.connect(analyserNode);
//         setAnalyser(analyserNode);

//         // Start audio level monitoring with better throttling
//         monitorAudioLevel(analyserNode);
//       }

//       // Check for MediaRecorder support and use appropriate MIME type
//       let mimeType = "audio/webm";
//       if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
//         mimeType = "audio/webm;codecs=opus";
//       } else if (MediaRecorder.isTypeSupported("audio/wav")) {
//         mimeType = "audio/wav";
//       } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
//         mimeType = "audio/mp4";
//       }

//       console.log(`Using MIME type: ${mimeType}`);

//       const recorder = new MediaRecorder(stream, {
//         mimeType: mimeType,
//         audioBitsPerSecond: 128000,
//       });

//       setMediaRecorder(recorder);

//       const chunks = [];
//       setAudioChunks(chunks);

//       recorder.ondataavailable = (event) => {
//         console.log("Data available:", event.data.size);
//         if (event.data.size > 0) {
//           chunks.push(event.data);
//         }
//       };

//       recorder.onstart = () => {
//         console.log("Recording started");
//       };

//       recorder.onstop = async () => {
//         console.log("Recording stopped, chunks:", chunks.length);

//         if (chunks.length > 0) {
//           // Create blob with the same MIME type used for recording
//           const audioBlob = new Blob(chunks, { type: mimeType });
//           console.log("Audio blob created:", audioBlob.size, "bytes");

//           if (audioBlob.size > 0) {
//             await sendAudioToBackend(audioBlob, mimeType);
//           } else {
//             console.error("Audio blob is empty");
//             addMessage(
//               "Sorry, no audio was recorded. Please try again.",
//               "assistant",
//             );
//           }
//         } else {
//           console.error("No audio chunks recorded");
//           addMessage(
//             "Sorry, no audio was captured. Please try again.",
//             "assistant",
//           );
//         }

//         // Clean up stream
//         stream.getTracks().forEach((track) => track.stop());
//       };

//       recorder.onerror = (event) => {
//         console.error("MediaRecorder error:", event.error);
//       };

//       // Start recording
//       recorder.start(100); // Collect data every 100ms
//       console.log("MediaRecorder started");
//     } catch (error) {
//       console.error("Error starting recording:", error);
//       setIsListening(false);
//       addMessage(
//         "Error accessing microphone. Please check permissions.",
//         "assistant",
//       );
//     }
//   };

//   const stopRecording = () => {
//     console.log("Stopping recording...");

//     // Cancel animation frame first to prevent further updates
//     if (animationFrameRef.current) {
//       cancelAnimationFrame(animationFrameRef.current);
//       animationFrameRef.current = null;
//     }

//     if (mediaRecorder && mediaRecorder.state !== "inactive") {
//       mediaRecorder.stop();
//     }

//     if (mediaStreamRef.current) {
//       mediaStreamRef.current.getTracks().forEach((track) => track.stop());
//       mediaStreamRef.current = null;
//     }
//   };

//   const monitorAudioLevel = (analyserNode) => {
//     const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
//     let lastUpdateTime = 0;
//     const updateInterval = 150; // Increased interval to reduce jitter

//     const updateLevel = (currentTime) => {
//       if (!isListening || isTransitioningRef.current) return;

//       // More aggressive throttling
//       if (currentTime - lastUpdateTime >= updateInterval) {
//         analyserNode.getByteFrequencyData(dataArray);

//         // Calculate average volume with noise gate
//         let sum = 0;
//         for (let i = 0; i < dataArray.length; i++) {
//           sum += dataArray[i];
//         }
//         const average = sum / dataArray.length;

//         // Apply noise gate and smoothing
//         const noiseGate = 8; // Higher threshold
//         const newLevel = average > noiseGate ? average : 0;

//         // More aggressive smoothing
//         const smoothingFactor = 0.2;
//         audioLevelRef.current =
//           audioLevelRef.current * (1 - smoothingFactor) +
//           newLevel * smoothingFactor;

//         // Only update state if change is significant and not too frequent
//         const now = Date.now();
//         if (
//           Math.abs(audioLevelRef.current - audioLevel) > 5 &&
//           now - lastAudioUpdateRef.current > 100
//         ) {
//           setAudioLevel(Math.round(audioLevelRef.current));
//           lastAudioUpdateRef.current = now;
//         }

//         lastUpdateTime = currentTime;
//       }

//       if (isListening && !isTransitioningRef.current) {
//         animationFrameRef.current = requestAnimationFrame(updateLevel);
//       }
//     };

//     animationFrameRef.current = requestAnimationFrame(updateLevel);
//   };

//   const sendAudioToBackend = async (audioBlob, mimeType) => {
//     try {
//       console.log("Sending audio to backend:", audioBlob.size, "bytes");

//       const formData = new FormData();

//       // Convert to WAV if necessary
//       let finalBlob = audioBlob;
//       let filename = "recording.wav";

//       if (mimeType !== "audio/wav") {
//         // For non-WAV files, we'll send as-is and let the backend handle conversion
//         // You might want to add client-side conversion here if needed
//         filename = mimeType.includes("webm")
//           ? "recording.webm"
//           : "recording.audio";
//       }

//       formData.append("audio", finalBlob, filename);

//       // Send audio to Django backend for speech-to-text
//       const response = await apiFetch("/api/speech-to-text/", {
//         method: "POST",
//         body: formData,
//       });

//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }

//       const data = await response.json();
//       console.log("Backend response:", data);

//       if (data.text && data.text.trim()) {
//         // Add user message to chat
//         addMessage(data.text, "user");

//         // Get response from assistant
//         const assistantResponse = await getAssistantResponse(data.text);

//         // Convert assistant response to speech (only if not muted)
//         if (assistantResponse && !isMuted) {
//           await playAssistantResponse(assistantResponse);
//         }
//       } else {
//         addMessage(
//           "Sorry, I couldn't understand that. Please try again.",
//           "assistant",
//         );
//       }
//     } catch (error) {
//       console.error("Error sending audio to backend:", error);
//       addMessage(
//         "Sorry, there was an error processing your audio. Please try again.",
//         "assistant",
//       );
//     }
//   };

//   const getAssistantResponse = async (text) => {
//     try {
//       // Send text to Django backend for LLM processing
//       const response = await apiFetch("/api/assistant/", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ text }),
//       });

//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }

//       const data = await response.json();

//       if (data.response) {
//         addMessage(data.response, "assistant");
//         return data.response;
//       }
//     } catch (error) {
//       console.error("Error getting assistant response:", error);
//       addMessage(
//         "Sorry, I encountered an error processing your request.",
//         "assistant",
//       );
//     }
//     return null;
//   };

//   const playAssistantResponse = async (text) => {
//     if (isMuted) return; // Don't play if muted

//     try {
//       setIsSpeaking(true);

//       // Request TTS from Django backend
//       const response = await apiFetch("/api/text-to-speech/", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ text }),
//       });

//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }

//       const audioBlob = await response.blob();
//       const audioUrl = URL.createObjectURL(audioBlob);

//       // Play the audio
//       if (audioRef.current) {
//         audioRef.current.src = audioUrl;

//         audioRef.current.onended = () => {
//           setIsSpeaking(false);
//           URL.revokeObjectURL(audioUrl); // Clean up
//         };

//         audioRef.current.onerror = (error) => {
//           console.error("Error playing audio:", error);
//           setIsSpeaking(false);
//           URL.revokeObjectURL(audioUrl);
//         };

//         try {
//           await audioRef.current.play();
//         } catch (playError) {
//           if (playError.name === "NotAllowedError") {
//             console.log(
//               "Audio autoplay blocked - waiting for user interaction",
//             );
//             setIsSpeaking(false);
//             // Don't show error to user, just silently fail for autoplay
//             if (!hasUserInteracted) {
//               // Show a subtle message that audio will start after interaction
//               console.log(
//                 "Audio will be available after first user interaction",
//               );
//             }
//           } else {
//             throw playError; // Re-throw other errors
//           }
//         }
//       }
//     } catch (error) {
//       console.error("Error playing assistant response:", error);
//       setIsSpeaking(false);
//     }
//   };

//   // Toggle microphone recording
//   const toggleListening = () => {
//     if (isSpeaking) {
//       // Don't allow listening while speaking
//       return;
//     }

//     setIsListening(!isListening);
//     setCurrentInput(!isListening ? "Listening..." : "");
//   };

//   // Toggle TTS mute/unmute and stop current speech if muting
//   const toggleTTSMute = () => {
//     if (!isMuted && isSpeaking) {
//       // If we're currently speaking and user wants to mute, stop the audio
//       if (audioRef.current) {
//         audioRef.current.pause();
//         audioRef.current.currentTime = 0;
//       }
//       setIsSpeaking(false);
//     }
//     setIsMuted(!isMuted);
//   };

//   const addMessage = (content, type) => {
//     const newMessage = {
//       id: Date.now().toString(),
//       type,
//       content,
//       timestamp: new Date(),
//     };
//     setMessages((prev) => [...prev, newMessage]);
//   };

//   return (
//     <div className="jarvis-wrapper">
//       {/* Hidden audio element for playback */}
//       <audio ref={audioRef} />

//       {/* Animated Grid Background */}
//       <div className="jarvis-grid-pattern" />

//       {/* Floating Particles */}
//       <div className="jarvis-particles">
//         {[...Array(20)].map((_, i) => (
//           <div
//             key={i}
//             className="jarvis-particle"
//             style={{
//               left: `${Math.random() * 100}%`,
//               top: `${Math.random() * 100}%`,
//               animationDelay: `${Math.random() * 5}s`,
//               animationDuration: `${3 + Math.random() * 4}s`,
//             }}
//           />
//         ))}
//       </div>

//       {/* Scanning Lines */}
//       <div className="jarvis-scan-line jarvis-scan-horizontal" />
//       <div className="jarvis-scan-line jarvis-scan-vertical" />

//       <div className="jarvis-container">
//         {/* Enhanced Header */}
//         <div className="jarvis-header">
//           <div className="jarvis-header-left">
//             <div className="jarvis-logo-container">
//               <div
//                 className={`jarvis-logo-circle ${
//                   isListening
//                     ? "jarvis-listening"
//                     : isSpeaking
//                       ? "jarvis-speaking"
//                       : ""
//                 }`}
//               >
//                 <Cpu className="jarvis-logo-icon" />
//                 <div
//                   className="jarvis-core-pulse"
//                   style={{
//                     transform: `scale(${
//                       1 + Math.sin(systemPulse * 0.1) * 0.1
//                     })`,
//                   }}
//                 />
//               </div>
//               <div className="jarvis-logo-ring jarvis-ring-1" />
//               <div className="jarvis-logo-ring jarvis-ring-2" />
//               <div className="jarvis-logo-ring jarvis-ring-3" />
//             </div>
//             <div>
//               <h1 className="jarvis-title">
//                 <span className="jarvis-title-glow">J.A.R.V.I.S.</span>
//               </h1>
//               <p className="jarvis-subtitle jarvis-subtitle-animated">
//                 Just A Rather Very Intelligent System
//               </p>
//             </div>
//           </div>

//           <SystemStatus isOnline={true} />
//         </div>

//         <ToolsPanel />

//         <Card className="jarvis-chat-card">
//           <ChatInterface messages={messages} />

//           <div className="jarvis-controls">
//             <div className="jarvis-controls-inner">
//               <div className="jarvis-buttons">
//                 {/* Enhanced Microphone Button */}
//                 <Button
//                   onClick={toggleListening}
//                   size="lg"
//                   className={`jarvis-mic-button ${
//                     isListening ? "jarvis-active jarvis-pulse-red" : ""
//                   }`}
//                   disabled={isSpeaking}
//                   title={isListening ? "Stop Recording" : "Start Voice Input"}
//                 >
//                   <div className="jarvis-button-inner">
//                     {isListening ? <MicOff /> : <Mic />}
//                     {isListening && <div className="jarvis-ripple-effect" />}
//                   </div>
//                 </Button>

//                 {/* Enhanced TTS Button */}
//                 <Button
//                   onClick={toggleTTSMute}
//                   size="lg"
//                   className={`jarvis-speak-button ${
//                     isMuted
//                       ? "jarvis-muted"
//                       : isSpeaking
//                         ? "jarvis-speaking jarvis-pulse-green"
//                         : ""
//                   }`}
//                   disabled={isListening}
//                   title={
//                     isMuted
//                       ? "Enable Voice Responses"
//                       : "Disable Voice Responses"
//                   }
//                 >
//                   <div className="jarvis-button-inner">
//                     {isMuted ? <VolumeX /> : <Volume2 />}
//                     {isSpeaking && (
//                       <div className="jarvis-ripple-effect jarvis-ripple-green" />
//                     )}
//                   </div>
//                 </Button>
//               </div>

//               <div className="jarvis-visualizer">
//                 <VoiceVisualizer
//                   isListening={isListening || isSpeaking}
//                   audioLevel={audioLevel}
//                 />
//               </div>

//               <div className="jarvis-status">
//                 <p className="jarvis-status-main jarvis-status-animated">
//                   {isListening
//                     ? "LISTENING..."
//                     : isSpeaking
//                       ? "SPEAKING..."
//                       : isMuted
//                         ? "READY (MUTED)"
//                         : "READY"}
//                 </p>
//                 <p className="jarvis-status-sub">
//                   {currentInput ||
//                     (isMuted
//                       ? "Voice responses disabled"
//                       : !hasUserInteracted
//                         ? "Click anywhere to enable audio"
//                         : "Awaiting command")}
//                 </p>
//               </div>
//             </div>
//           </div>
//         </Card>
//       </div>

//       {/* Enhanced ambient glows with animation */}
//       <div className="jarvis-glow cyan jarvis-glow-animated" />
//       <div className="jarvis-glow blue jarvis-glow-animated" />
//       <div className="jarvis-glow arc-reactor" />
//     </div>
//   );
// }
import { useMemo, useState } from "react";
import { Cpu, Mic, Square, Send, Volume2, VolumeX, Zap } from "lucide-react";
import { useJarvis } from "../hooks/useJarvis";
import { groupOf, metaFor } from "./jarvis/tools";
import ChatInterface from "./jarvis/ChatInterface";
import ToolsPanel from "./jarvis/ToolsPanel";
import VoiceVisualizer from "./jarvis/VoiceVisualizer";

const PHASES = {
  idle: {
    label: "READY",
    tone: "text-cyan-300",
    ring: "border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.5)]",
    hint: "Awaiting command",
  },
  listening: {
    label: "LISTENING",
    tone: "text-red-400",
    ring: "animate-pulse border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.8)]",
    hint: "Press the button again to send",
  },
  transcribing: {
    label: "TRANSCRIBING",
    tone: "text-amber-300",
    ring: "animate-pulse border-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.6)]",
    hint: "Converting speech to text",
  },
  thinking: {
    label: "PROCESSING",
    tone: "text-amber-300",
    ring: "animate-pulse border-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.6)]",
    hint: "Working on it",
  },
  speaking: {
    label: "SPEAKING",
    tone: "text-emerald-400",
    ring: "animate-pulse border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.8)]",
    hint: "Press the mic to interrupt",
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
    <div className="relative h-full overflow-hidden bg-[radial-gradient(ellipse_at_center,#001a1a_0%,#000_70%)] font-hud text-cyan-50">
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

      <div className="relative z-10 mx-auto flex h-full max-w-5xl flex-col gap-4 p-4">
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full border-2 bg-cyan-500/10 transition-all duration-300 ${p.ring}`}
            >
              <Cpu className="h-6 w-6 text-cyan-300" />
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-cyan-300 to-sky-400 bg-clip-text text-2xl font-black uppercase tracking-widest text-transparent sm:text-3xl">
                J.A.R.V.I.S.
              </h1>
              <p className="text-[10px] tracking-wider text-cyan-400/80 sm:text-xs">
                Just A Rather Very Intelligent System
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-400/50 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
            <Zap className="h-3.5 w-3.5" />
            Online
          </div>
        </header>

        <ToolsPanel activeTools={activeTools} messages={messages} />

        {/* Chat + controls */}
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-cyan-500/30 bg-[rgba(0,26,26,0.6)] shadow-[0_0_40px_rgba(6,182,212,0.2)] backdrop-blur-xl">
          <ChatInterface messages={messages} />

          <div className="flex flex-wrap items-center gap-4 border-t border-cyan-500/20 bg-cyan-950/30 p-4">
            <div className="flex items-center gap-3">
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
                className={`relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 transition-all hover:scale-105 ${
                  listening
                    ? "border-red-500 bg-red-500/10 text-red-400 shadow-[0_0_40px_rgba(239,68,68,0.8)]"
                    : "border-cyan-400 bg-cyan-500/10 text-cyan-300 hover:shadow-[0_0_30px_rgba(34,211,238,0.8)]"
                }`}
              >
                {listening && (
                  <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ripple" />
                )}
                {listening ? (
                  <Square className="relative h-6 w-6" />
                ) : (
                  <Mic className="relative h-7 w-7" />
                )}
              </button>

              <button
                onClick={toggleMute}
                title={
                  muted ? "Enable voice responses" : "Disable voice responses"
                }
                className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all hover:scale-105 ${
                  muted
                    ? "border-red-500/60 text-red-400 opacity-70"
                    : phase === "speaking"
                      ? "animate-pulse border-emerald-400 text-emerald-300 shadow-[0_0_25px_rgba(52,211,153,0.7)]"
                      : "border-cyan-400 text-cyan-300"
                }`}
              >
                {muted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </button>
            </div>

            <form
              onSubmit={submit}
              className="flex min-w-[12rem] flex-1 items-center gap-2"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={listening}
                placeholder="Type a command…"
                className="min-w-0 flex-1 rounded-lg border border-cyan-500/30 bg-cyan-950/40 px-3 py-2 text-sm text-cyan-50 placeholder:text-cyan-700 focus:border-cyan-300 focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!draft.trim() || listening}
                className="rounded-lg border border-cyan-500/40 p-2 text-cyan-300 transition hover:bg-cyan-500/10 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>

            <div className="flex items-center gap-4">
              <VoiceVisualizer mode={phase} level={level} />
              <div className="min-w-[9rem] text-right">
                <p className={`text-sm font-bold tracking-widest ${p.tone}`}>
                  {p.label}
                </p>
                <p
                  className={`text-[11px] ${runningName ? "text-amber-300" : "text-cyan-500"}`}
                >
                  {subText}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
