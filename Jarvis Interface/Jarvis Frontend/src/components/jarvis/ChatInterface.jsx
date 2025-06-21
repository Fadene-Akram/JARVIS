import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import "./ChatInterface.css";

export default function ChatInterface({ messages }) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="chat-container">
      <AnimatePresence initial={false}>
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className={`chat-message-wrapper ${
              message.type === "user" ? "align-right" : "align-left"
            }`}
          >
            <div
              className={`chat-bubble ${
                message.type === "user" ? "user-bubble" : "assistant-bubble"
              }`}
            >
              <div className="message-content">
                {message.type === "assistant" ? (
                  <TypingMarkdown content={message.content} />
                ) : (
                  <p>{message.content}</p>
                )}
              </div>
              <p className="message-timestamp">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <div ref={messagesEndRef} />
    </div>
  );
}
function TypingMarkdown({ content, speed = 20 }) {
  const [displayedText, setDisplayedText] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // Reset state on new content
    setDisplayedText("");
    setIndex(0);

    if (typeof content !== "string") return;

    const interval = setInterval(() => {
      setIndex((prevIndex) => {
        const nextIndex = prevIndex + 1;

        // When we reach the full length, stop
        if (nextIndex > content.length) {
          clearInterval(interval);
          return prevIndex;
        }

        setDisplayedText(content.slice(0, nextIndex));
        return nextIndex;
      });
    }, speed);

    return () => clearInterval(interval);
  }, [content, speed]);

  return <ReactMarkdown>{displayedText}</ReactMarkdown>;
}
