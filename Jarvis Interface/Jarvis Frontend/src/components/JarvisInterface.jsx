import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, VolumeX, Cpu } from "lucide-react";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import VoiceVisualizer from "./jarvis/VoiceVisualizer";
import ChatInterface from "./jarvis/ChatInterface";
import ToolsPanel from "./jarvis/ToolsPanel";
import SystemStatus from "./jarvis/SystemStatus";
import "./JarvisInterface.css";

export default function JarvisInterface() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false); // New state for muting TTS
  const [hasInitialized, setHasInitialized] = useState(false); // Track if we've done initial TTS
  const [hasUserInteracted, setHasUserInteracted] = useState(false); // Track user interaction for autoplay
  const [messages, setMessages] = useState([
    {
      id: "1",
      type: "assistant",
      content: "System online. Ready to assist you, sir.",
      timestamp: new Date(),
    },
  ]);
  const [currentInput, setCurrentInput] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioContext, setAudioContext] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [analyser, setAnalyser] = useState(null);

  const audioRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Initialize audio context and handle initial setup
  useEffect(() => {
    const initAudioContext = async () => {
      try {
        const context = new (window.AudioContext ||
          window.webkitAudioContext)();
        setAudioContext(context);
      } catch (error) {
        console.error("Error initializing audio context:", error);
      }
    };

    // Add click listener to detect first user interaction
    const handleFirstInteraction = () => {
      setHasUserInteracted(true);
      // Try to play initial message after first interaction
      if (!hasInitialized && !isMuted) {
        setHasInitialized(true);
        setTimeout(() => {
          playAssistantResponse("System online. Ready to assist you, sir.");
        }, 500);
      }
    };

    initAudioContext();

    // Listen for any user interaction
    if (!hasUserInteracted) {
      document.addEventListener("click", handleFirstInteraction, {
        once: true,
      });
      document.addEventListener("keydown", handleFirstInteraction, {
        once: true,
      });
      document.addEventListener("touchstart", handleFirstInteraction, {
        once: true,
      });
    }

    return () => {
      if (audioContext) {
        audioContext.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Clean up event listeners
      document.removeEventListener("click", handleFirstInteraction);
      document.removeEventListener("keydown", handleFirstInteraction);
      document.removeEventListener("touchstart", handleFirstInteraction);
    };
  }, [hasInitialized, isMuted, hasUserInteracted]);

  // Handle listening state changes
  useEffect(() => {
    if (isListening) {
      startRecording();
    } else {
      stopRecording();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isListening]);

  const startRecording = async () => {
    try {
      console.log("Starting recording...");

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;

      // Set up audio analysis for visualization
      if (audioContext && audioContext.state === "suspended") {
        await audioContext.resume();
      }

      if (audioContext) {
        const source = audioContext.createMediaStreamSource(stream);
        const analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize = 256;
        source.connect(analyserNode);
        setAnalyser(analyserNode);

        // Start audio level monitoring
        monitorAudioLevel(analyserNode);
      }

      // Check for MediaRecorder support and use appropriate MIME type
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/wav")) {
        mimeType = "audio/wav";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      }

      console.log(`Using MIME type: ${mimeType}`);

      const recorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        audioBitsPerSecond: 128000,
      });

      setMediaRecorder(recorder);

      const chunks = [];
      setAudioChunks(chunks);

      recorder.ondataavailable = (event) => {
        console.log("Data available:", event.data.size);
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstart = () => {
        console.log("Recording started");
      };

      recorder.onstop = async () => {
        console.log("Recording stopped, chunks:", chunks.length);

        if (chunks.length > 0) {
          // Create blob with the same MIME type used for recording
          const audioBlob = new Blob(chunks, { type: mimeType });
          console.log("Audio blob created:", audioBlob.size, "bytes");

          if (audioBlob.size > 0) {
            await sendAudioToBackend(audioBlob, mimeType);
          } else {
            console.error("Audio blob is empty");
            addMessage(
              "Sorry, no audio was recorded. Please try again.",
              "assistant"
            );
          }
        } else {
          console.error("No audio chunks recorded");
          addMessage(
            "Sorry, no audio was captured. Please try again.",
            "assistant"
          );
        }

        // Clean up
        stream.getTracks().forEach((track) => track.stop());
        setAudioLevel(0);
      };

      recorder.onerror = (event) => {
        console.error("MediaRecorder error:", event.error);
      };

      // Start recording
      recorder.start(100); // Collect data every 100ms
      console.log("MediaRecorder started");
    } catch (error) {
      console.error("Error starting recording:", error);
      setIsListening(false);
      addMessage(
        "Error accessing microphone. Please check permissions.",
        "assistant"
      );
    }
  };

  const stopRecording = () => {
    console.log("Stopping recording...");

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }
  };

  const monitorAudioLevel = (analyserNode) => {
    const dataArray = new Uint8Array(analyserNode.frequencyBinCount);

    const updateLevel = () => {
      if (!isListening) return;

      analyserNode.getByteFrequencyData(dataArray);

      // Calculate average volume
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      setAudioLevel(average);

      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();
  };

  const sendAudioToBackend = async (audioBlob, mimeType) => {
    try {
      console.log("Sending audio to backend:", audioBlob.size, "bytes");

      const formData = new FormData();

      // Convert to WAV if necessary
      let finalBlob = audioBlob;
      let filename = "recording.wav";

      if (mimeType !== "audio/wav") {
        // For non-WAV files, we'll send as-is and let the backend handle conversion
        // You might want to add client-side conversion here if needed
        filename = mimeType.includes("webm")
          ? "recording.webm"
          : "recording.audio";
      }

      formData.append("audio", finalBlob, filename);

      // Send audio to Django backend for speech-to-text
      const response = await fetch(
        "http://localhost:8000/api/speech-to-text/",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Backend response:", data);

      if (data.text && data.text.trim()) {
        // Add user message to chat
        addMessage(data.text, "user");

        // Get response from assistant
        const assistantResponse = await getAssistantResponse(data.text);

        // Convert assistant response to speech (only if not muted)
        if (assistantResponse && !isMuted) {
          await playAssistantResponse(assistantResponse);
        }
      } else {
        addMessage(
          "Sorry, I couldn't understand that. Please try again.",
          "assistant"
        );
      }
    } catch (error) {
      console.error("Error sending audio to backend:", error);
      addMessage(
        "Sorry, there was an error processing your audio. Please try again.",
        "assistant"
      );
    }
  };

  const getAssistantResponse = async (text) => {
    try {
      // Send text to Django backend for LLM processing
      const response = await fetch("http://localhost:8000/api/assistant/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.response) {
        addMessage(data.response, "assistant");
        return data.response;
      }
    } catch (error) {
      console.error("Error getting assistant response:", error);
      addMessage(
        "Sorry, I encountered an error processing your request.",
        "assistant"
      );
    }
    return null;
  };

  const playAssistantResponse = async (text) => {
    if (isMuted) return; // Don't play if muted

    try {
      setIsSpeaking(true);

      // Request TTS from Django backend
      const response = await fetch(
        "http://localhost:8000/api/text-to-speech/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Play the audio
      if (audioRef.current) {
        audioRef.current.src = audioUrl;

        audioRef.current.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl); // Clean up
        };

        audioRef.current.onerror = (error) => {
          console.error("Error playing audio:", error);
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };

        try {
          await audioRef.current.play();
        } catch (playError) {
          if (playError.name === "NotAllowedError") {
            console.log(
              "Audio autoplay blocked - waiting for user interaction"
            );
            setIsSpeaking(false);
            // Don't show error to user, just silently fail for autoplay
            if (!hasUserInteracted) {
              // Show a subtle message that audio will start after interaction
              console.log(
                "Audio will be available after first user interaction"
              );
            }
          } else {
            throw playError; // Re-throw other errors
          }
        }
      }
    } catch (error) {
      console.error("Error playing assistant response:", error);
      setIsSpeaking(false);
    }
  };

  // Toggle microphone recording
  const toggleListening = () => {
    if (isSpeaking) {
      // Don't allow listening while speaking
      return;
    }

    setIsListening(!isListening);
    setCurrentInput(!isListening ? "Listening..." : "");
  };

  // Toggle TTS mute/unmute and stop current speech if muting
  const toggleTTSMute = () => {
    if (!isMuted && isSpeaking) {
      // If we're currently speaking and user wants to mute, stop the audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsSpeaking(false);
    }
    setIsMuted(!isMuted);
  };

  const addMessage = (content, type) => {
    const newMessage = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  return (
    <div className="jarvis-wrapper">
      {/* Hidden audio element for playback */}
      <audio ref={audioRef} />

      {/* Grid Background */}
      <div className="jarvis-grid-pattern" />

      <div className="jarvis-container">
        {/* Header */}
        <div className="jarvis-header">
          <div className="jarvis-header-left">
            <div className="jarvis-logo-container">
              <div className="jarvis-logo-circle">
                <Cpu className="jarvis-logo-icon" />
              </div>
              <div className="jarvis-logo-ring" />
            </div>
            <div>
              <h1 className="jarvis-title">J.A.R.V.I.S.</h1>
              <p className="jarvis-subtitle">
                Just A Rather Very Intelligent System
              </p>
            </div>
          </div>

          <SystemStatus isOnline={true} />
        </div>

        <ToolsPanel />

        <Card className="jarvis-chat-card">
          <ChatInterface messages={messages} />

          <div className="jarvis-controls">
            <div className="jarvis-controls-inner">
              <div className="jarvis-buttons">
                {/* Microphone Button - For voice input recording */}
                <Button
                  onClick={toggleListening}
                  size="lg"
                  className={`jarvis-mic-button ${
                    isListening ? "jarvis-active" : ""
                  }`}
                  disabled={isSpeaking}
                  title={isListening ? "Stop Recording" : "Start Voice Input"}
                >
                  {isListening ? <MicOff /> : <Mic />}
                </Button>

                {/* TTS Mute/Unmute Button - Controls whether assistant speaks responses */}
                <Button
                  onClick={toggleTTSMute}
                  size="lg"
                  className={`jarvis-speak-button ${
                    isMuted
                      ? "jarvis-muted"
                      : isSpeaking
                      ? "jarvis-speaking"
                      : ""
                  }`}
                  disabled={isListening}
                  title={
                    isMuted
                      ? "Enable Voice Responses"
                      : "Disable Voice Responses"
                  }
                >
                  {isMuted ? <VolumeX /> : <Volume2 />}
                </Button>
              </div>

              <div className="jarvis-visualizer">
                <VoiceVisualizer
                  isListening={isListening || isSpeaking}
                  audioLevel={audioLevel}
                />
              </div>

              <div className="jarvis-status">
                <p className="jarvis-status-main">
                  {isListening
                    ? "Listening..."
                    : isSpeaking
                    ? "Speaking..."
                    : isMuted
                    ? "Ready (Muted)"
                    : "Ready"}
                </p>
                <p className="jarvis-status-sub">
                  {currentInput ||
                    (isMuted
                      ? "Voice responses disabled"
                      : !hasUserInteracted
                      ? "Click anywhere to enable audio"
                      : "Awaiting command")}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Ambient glow */}
      <div className="jarvis-glow cyan" />
      <div className="jarvis-glow blue" />
    </div>
  );
}

// import { useState, useEffect, useRef } from "react";
// import { Mic, MicOff, Volume2, VolumeX, Cpu } from "lucide-react";
// import { Button } from "./ui/Button";
// import { Card } from "./ui/Card";
// import VoiceVisualizer from "./jarvis/VoiceVisualizer";
// import ChatInterface from "./jarvis/ChatInterface";
// import ToolsPanel from "./jarvis/ToolsPanel";
// import SystemStatus from "./jarvis/SystemStatus";
// import "./JarvisInterface.css";

// export default function JarvisInterface() {
//   const [isListening, setIsListening] = useState(false);
//   const [isSpeaking, setIsSpeaking] = useState(false);
//   const [isMuted, setIsMuted] = useState(false); // New state for muting TTS
//   const [hasInitialized, setHasInitialized] = useState(false); // Track if we've done initial TTS
//   const [hasUserInteracted, setHasUserInteracted] = useState(false); // Track user interaction for autoplay
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

//   // Initialize audio context and handle initial setup
//   useEffect(() => {
//     const initAudioContext = async () => {
//       try {
//         const context = new (window.AudioContext ||
//           window.webkitAudioContext)();
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

//   // Handle listening state changes
//   useEffect(() => {
//     if (isListening) {
//       startRecording();
//     } else {
//       stopRecording();
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
//         source.connect(analyserNode);
//         setAnalyser(analyserNode);

//         // Start audio level monitoring
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
//               "assistant"
//             );
//           }
//         } else {
//           console.error("No audio chunks recorded");
//           addMessage(
//             "Sorry, no audio was captured. Please try again.",
//             "assistant"
//           );
//         }

//         // Clean up
//         stream.getTracks().forEach((track) => track.stop());
//         setAudioLevel(0);
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
//         "assistant"
//       );
//     }
//   };

//   const stopRecording = () => {
//     console.log("Stopping recording...");

//     if (animationFrameRef.current) {
//       cancelAnimationFrame(animationFrameRef.current);
//     }

//     if (mediaRecorder && mediaRecorder.state !== "inactive") {
//       mediaRecorder.stop();
//     }

//     if (mediaStreamRef.current) {
//       mediaStreamRef.current.getTracks().forEach((track) => track.stop());
//     }
//   };

//   const monitorAudioLevel = (analyserNode) => {
//     const dataArray = new Uint8Array(analyserNode.frequencyBinCount);

//     const updateLevel = () => {
//       if (!isListening) return;

//       analyserNode.getByteFrequencyData(dataArray);

//       // Calculate average volume
//       let sum = 0;
//       for (let i = 0; i < dataArray.length; i++) {
//         sum += dataArray[i];
//       }
//       const average = sum / dataArray.length;
//       setAudioLevel(average);

//       animationFrameRef.current = requestAnimationFrame(updateLevel);
//     };

//     updateLevel();
//   };

//   const sendAudioToBackend = async (audioBlob, mimeType) => {
//     try {
//       console.log("Sending audio to backend:", audioBlob.size, "bytes");

//       const formData = new FormData();

//       // Convert to WAV if necessary
//       const finalBlob = audioBlob;
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
//       const response = await fetch(
//         "http://localhost:8000/api/speech-to-text/",
//         {
//           method: "POST",
//           body: formData,
//         }
//       );

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
//           "assistant"
//         );
//       }
//     } catch (error) {
//       console.error("Error sending audio to backend:", error);
//       addMessage(
//         "Sorry, there was an error processing your audio. Please try again.",
//         "assistant"
//       );
//     }
//   };

//   const getAssistantResponse = async (text) => {
//     try {
//       // Send text to Django backend for LLM processing
//       const response = await fetch("http://localhost:8000/api/assistant/", {
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
//         "assistant"
//       );
//     }
//     return null;
//   };

//   const playAssistantResponse = async (text) => {
//     if (isMuted) return; // Don't play if muted

//     try {
//       setIsSpeaking(true);

//       // Request TTS from Django backend
//       const response = await fetch(
//         "http://localhost:8000/api/text-to-speech/",
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify({ text }),
//         }
//       );

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
//               "Audio autoplay blocked - waiting for user interaction"
//             );
//             setIsSpeaking(false);
//             // Don't show error to user, just silently fail for autoplay
//             if (!hasUserInteracted) {
//               // Show a subtle message that audio will start after interaction
//               console.log(
//                 "Audio will be available after first user interaction"
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

//       {/* Enhanced Grid Background with scan lines */}
//       <div className="jarvis-grid-pattern" />
//       {/* Enhanced space effects */}
//       <div className="jarvis-scan-lines" />
//       <div className="jarvis-particles">
//         {[...Array(20)].map((_, i) => (
//           <div
//             key={i}
//             className="jarvis-particle"
//             style={{
//               left: `${Math.random() * 100}%`,
//               animationDelay: `${Math.random() * 4}s`,
//               animationDuration: `${3 + Math.random() * 2}s`,
//             }}
//           />
//         ))}
//       </div>
//       <div className="jarvis-scan-lines" />

//       {/* Hexagonal overlay pattern */}
//       <div className="jarvis-hex-pattern" />

//       <div className="jarvis-container">
//         {/* Enhanced Header */}
//         <div className="jarvis-header">
//           <div className="jarvis-header-left">
//             <div className="jarvis-logo-container">
//               <div className="jarvis-logo-circle">
//                 <Cpu className="jarvis-logo-icon" />
//                 <div className="jarvis-logo-inner-ring" />
//               </div>
//               <div className="jarvis-logo-ring" />
//               <div className="jarvis-logo-outer-ring" />
//             </div>
//             <div className="jarvis-title-container">
//               <h1 className="jarvis-title">
//                 <span className="jarvis-title-glow">J.A.R.V.I.S.</span>
//               </h1>
//               <p className="jarvis-subtitle">
//                 Just A Rather Very Intelligent System
//               </p>
//               {/* <div className="jarvis-status-bar">
//                 <div className="jarvis-status-indicator active" />
//                 <span className="jarvis-status-text">ONLINE</span>
//               </div> */}
//             </div>
//           </div>

//           <SystemStatus isOnline={true} />
//         </div>

//         <ToolsPanel />

//         <Card className="jarvis-chat-card">
//           <div className="jarvis-arc-reactor">
//             <div className="jarvis-arc-core"></div>
//             <div className="jarvis-arc-ring-1"></div>
//             <div className="jarvis-arc-ring-2"></div>
//             <div className="jarvis-arc-ring-3"></div>
//             <div className="jarvis-arc-hexagon"></div>
//           </div>
//           <ChatInterface messages={messages} />

//           <div className="jarvis-controls">
//             <div className="jarvis-controls-inner">
//               <div className="jarvis-buttons">
//                 {/* Enhanced Microphone Button */}
//                 <div className="jarvis-button-container">
//                   <Button
//                     onClick={toggleListening}
//                     size="lg"
//                     className={`jarvis-mic-button ${
//                       isListening ? "jarvis-active" : ""
//                     }`}
//                     disabled={isSpeaking}
//                     title={isListening ? "Stop Recording" : "Start Voice Input"}
//                   >
//                     {isListening ? <MicOff /> : <Mic />}
//                     <div className="jarvis-button-ring" />
//                   </Button>
//                   <div className="jarvis-button-glow" />
//                 </div>

//                 {/* Enhanced TTS Button */}
//                 <div className="jarvis-button-container">
//                   <Button
//                     onClick={toggleTTSMute}
//                     size="lg"
//                     className={`jarvis-speak-button ${
//                       isMuted
//                         ? "jarvis-muted"
//                         : isSpeaking
//                         ? "jarvis-speaking"
//                         : ""
//                     }`}
//                     disabled={isListening}
//                     title={
//                       isMuted
//                         ? "Enable Voice Responses"
//                         : "Disable Voice Responses"
//                     }
//                   >
//                     {isMuted ? <VolumeX /> : <Volume2 />}
//                     <div className="jarvis-button-ring" />
//                   </Button>
//                   <div className="jarvis-button-glow" />
//                 </div>
//               </div>

//               <div className="jarvis-visualizer">
//                 <VoiceVisualizer
//                   isListening={isListening || isSpeaking}
//                   audioLevel={audioLevel}
//                 />
//               </div>

//               <div className="jarvis-status">
//                 <div className="jarvis-status-panel">
//                   <p className="jarvis-status-main">
//                     {isListening
//                       ? "LISTENING..."
//                       : isSpeaking
//                       ? "PROCESSING..."
//                       : isMuted
//                       ? "STANDBY (MUTED)"
//                       : "READY"}
//                   </p>
//                   <p className="jarvis-status-sub">
//                     {currentInput ||
//                       (isMuted
//                         ? "Voice responses disabled"
//                         : !hasUserInteracted
//                         ? "Click anywhere to enable audio"
//                         : "Awaiting command")}
//                   </p>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </Card>
//       </div>

//       {/* Enhanced ambient effects */}
//       <div className="jarvis-ambient-effects">
//         <div className="jarvis-glow cyan" />
//         <div className="jarvis-glow blue" />
//         <div className="jarvis-glow gold" />
//       </div>

//       {/* Particle effects */}
//       <div className="jarvis-particles">
//         {[...Array(20)].map((_, i) => (
//           <div
//             key={i}
//             className="jarvis-particle"
//             style={{
//               left: `${Math.random() * 100}%`,
//               animationDelay: `${Math.random() * 4}s`,
//               animationDuration: `${3 + Math.random() * 2}s`,
//             }}
//           />
//         ))}
//       </div>
//     </div>
//   );
// }
