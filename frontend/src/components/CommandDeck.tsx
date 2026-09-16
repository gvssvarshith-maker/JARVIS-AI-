"use client";

import React, { useState, useRef, useEffect } from "react";
import { Mic, Send, Radio } from "lucide-react";
import { ChamferedButton, playTacticalChirp } from "./ChamferedButton";
import { SystemState } from "@/types/hud";

interface CommandDeckProps {
  systemState: SystemState;
  onSend: (message: string) => void;
  onStateChange: (state: SystemState) => void;
}

export const CommandDeck: React.FC<CommandDeckProps> = ({
  systemState,
  onSend,
  onStateChange,
}) => {
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Initialize Web Speech API for Mic Input
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsRecording(true);
        onStateChange("listening");
        playTacticalChirp(1200, 0.08);
      };

      rec.onresult = (event: any) => {
        let interim = "";
        let final = "";
        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        const text = (final || interim).trim();
        transcriptRef.current = text;
        setInput(text);
      };

      rec.onerror = (event: any) => {
        setIsRecording(false);
        onStateChange("idle");
        if (event?.error === "network") {
          console.warn("Speech recognition network error: In Brave browser, check brave://settings/privacy to ensure Google speech services are permitted.");
        }
      };

      rec.onend = () => {
        setIsRecording(false);
        const query = transcriptRef.current.trim();
        transcriptRef.current = "";
        if (query) {
          playTacticalChirp(1600, 0.1);
          setInput("");
          if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
          }
          onSend(query);
        } else {
          onStateChange("idle");
        }
      };

      recognitionRef.current = rec;
    }
  }, [onSend, onStateChange]);

  const toggleMic = async () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Brave with speech services enabled.");
      return;
    }
    if (isRecording) {
      try {
        recognitionRef.current.stop();
      } catch {}
    } else {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((t) => t.stop());
        }
      } catch (err: any) {
        if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
          alert("Microphone permission denied. Please allow microphone permissions in your browser address bar.");
          return;
        }
      }

      try {
        transcriptRef.current = "";
        setInput("");
        recognitionRef.current.start();
      } catch {
        try {
          recognitionRef.current.stop();
          setTimeout(() => recognitionRef.current?.start(), 150);
        } catch {}
      }
    }
  };

  const handleSend = () => {
    if (!input.trim() || systemState === "processing") return;
    onSend(input.trim());
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
  };

  return (
    <div className="relative p-2.5 bg-surface-card border border-cyan-neon/30 clip-chamfer backdrop-blur-xl shadow-[0_10px_35px_rgba(0,0,0,0.8)]">
      {/* Corner crosshairs */}
      <span className="absolute top-1 left-2 font-mono text-[10px] text-cyan-neon/60 pointer-events-none">+</span>
      <span className="absolute top-1 right-2 font-mono text-[10px] text-cyan-neon/60 pointer-events-none">+</span>
      <span className="absolute bottom-1 left-2 font-mono text-[10px] text-cyan-neon/60 pointer-events-none">+</span>
      <span className="absolute bottom-1 right-2 font-mono text-[10px] text-cyan-neon/60 pointer-events-none">+</span>

      <div className="flex items-end gap-3">
        {/* Mic Speech-to-Text Button */}
        <button
          type="button"
          onClick={toggleMic}
          className={`relative flex items-center justify-center w-10 h-10 clip-chamfer transition-all duration-200 ${
            isRecording
              ? "bg-red-500/30 border border-red-500 text-red-400 shadow-[0_0_20px_#EF4444] animate-pulse"
              : "bg-cyan-neon/10 border border-cyan-neon/40 text-cyan-neon hover:bg-cyan-neon/20 hover:shadow-[0_0_15px_#00F2FE]"
          }`}
          title={isRecording ? "Listening..." : "Engage Vocal Link"}
        >
          {isRecording ? <Radio className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Text Input */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="ENTER TACTICAL COMMAND OR QUERY... (PRESS ENTER TO ENGAGE)"
          rows={1}
          className="flex-1 bg-transparent border-none outline-none text-white font-tech text-base font-semibold tracking-wide placeholder:text-slate-500 placeholder:font-display placeholder:text-xs resize-none py-1.5"
        />

        {/* Engage Button */}
        <ChamferedButton
          variant="cyan"
          size="md"
          statusLed={systemState === "processing" ? "amber" : "cyan"}
          badge="EXEC"
          icon={<Send className="w-3.5 h-3.5" />}
          onClick={handleSend}
          disabled={!input.trim() || systemState === "processing"}
        >
          Engage
        </ChamferedButton>
      </div>
    </div>
  );
};
