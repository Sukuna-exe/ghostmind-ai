"use client";

import { useEffect, useRef, useState } from "react";
import { soundEngine } from "./SoundEngine";

interface DialoguePanelProps {
  dialogue: string;
  choices: string[];
  isLoading: boolean;
  onChoice: (choice: string) => void;
  novaState: "calm" | "curious" | "alert" | "afraid" | "trusting" | "corrupted";
  disabled?: boolean;
}

export function DialoguePanel({ dialogue, choices, isLoading, onChoice, novaState, disabled }: DialoguePanelProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentChoiceIndex, setCurrentChoiceIndex] = useState(-1);
  const typewriterRef = useRef<number | undefined>(undefined);
  const choiceAnimationRef = useRef<number | undefined>(undefined);
  const lastDialogueRef = useRef("");

  const stateColors: Record<string, string> = {
    calm: "#63d8b0",
    curious: "#ffb86b",
    alert: "#ff6b6b",
    afraid: "#ff6b9d",
    trusting: "#63f5c2",
    corrupted: "#c896ff",
  };

  const color = stateColors[novaState] || "#63d8b0";

  useEffect(() => {
    if (isLoading) {
      setDisplayedText("");
      if (typewriterRef.current) clearTimeout(typewriterRef.current);
      return;
    }

    if (dialogue !== lastDialogueRef.current) {
      lastDialogueRef.current = dialogue;
      setDisplayedText("");
      setCurrentChoiceIndex(-1);

      let i = 0;
      const type = () => {
        if (i < dialogue.length) {
          setDisplayedText(dialogue.slice(0, i + 1));
          if (i % 3 === 0) {
            soundEngine.playTone({ frequency: 600 + Math.random() * 200, duration: 0.02, type: "square", volume: 0.05 });
          }
          i++;
          typewriterRef.current = window.setTimeout(type, 18 + Math.random() * 12);
        } else {
          setCurrentChoiceIndex(0);
          soundEngine.playClick();
        }
      };
      type();
    }
  }, [dialogue, isLoading]);

  useEffect(() => {
    if (currentChoiceIndex >= 0 && currentChoiceIndex < choices.length) {
      choiceAnimationRef.current = window.setTimeout(() => {
        setCurrentChoiceIndex((c) => (c + 1) % choices.length);
      }, 3000);
    }
    return () => {
      if (choiceAnimationRef.current) clearTimeout(choiceAnimationRef.current);
    };
  }, [currentChoiceIndex, choices.length]);

  const handleChoiceClick = (choice: string, index: number) => {
    if (disabled || isLoading) return;
    soundEngine.playClick();
    onChoice(choice);
  };

  if (isLoading) {
    return (
      <div className="dialogue-panel loading">
        <div className="dialogue-header">
          <div className="nova-indicator" style={{ background: color }} />
          <span className="channel-label">NOVA // ACTIVE CHANNEL</span>
          <div className="signal-status processing">PROCESSING</div>
        </div>
        <div className="dialogue-content">
          <div className="typing-indicator">
            <span></span><span></span><span></span>
          </div>
          <p className="loading-text">NOVA is analyzing the facility state...</p>
        </div>
        <style jsx>{`
          .dialogue-panel { height: 100%; display: flex; flex-direction: column; }
          .dialogue-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
          .nova-indicator { width: 10px; height: 10px; border-radius: 50%; box-shadow: 0 0 12px currentColor; animation: pulse 1s ease-in-out infinite; }
          .channel-label { font-family: 'JetBrains Mono', monospace; font-size: 8px; font-weight: 900; letter-spacing: 0.15em; color: #8a9cff; }
          .signal-status { margin-left: auto; font-family: 'JetBrains Mono', monospace; font-size: 7px; font-weight: 800; letter-spacing: 0.1em; padding: 4px 8px; border-radius: 999px; background: rgba(255, 184, 107, 0.15); color: #ffb86b; border: 1px solid rgba(255, 184, 107, 0.3); animation: pulse 1s ease-in-out infinite; }
          .dialogue-content { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #919abc; padding: 40px 20px; }
          .typing-indicator { display: flex; gap: 4px; margin-bottom: 16px; }
          .typing-indicator span { width: 8px; height: 8px; border-radius: 50%; background: currentColor; animation: typing 1.4s ease-in-out infinite; }
          .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
          .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
          .loading-text { margin: 0; font-size: 11px; color: #68718d; }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
          @keyframes typing { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-8px); opacity: 1; } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="dialogue-panel">
      <div className="dialogue-header">
        <div className="nova-indicator" style={{ background: color, boxShadow: `0 0 12px ${color}` }} />
        <span className="channel-label">NOVA // ACTIVE CHANNEL</span>
        <div className="signal-status connected">CONNECTED</div>
      </div>

      <div className="dialogue-content">
        <div className="dialogue-mark">“</div>
        <div className="dialogue-text" style={{ borderLeftColor: color }}>
          {displayedText || "▌"}
        </div>
      </div>

      {choices.length > 0 && !disabled && (
        <div className="choices-container">
          {choices.map((choice, index) => (
            <button
              key={`${choice}-${index}`}
              className={`choice-button ${index === currentChoiceIndex ? "highlighted" : ""}`}
              onClick={() => handleChoiceClick(choice, index)}
              disabled={disabled || isLoading}
              style={{ borderLeftColor: color }}
            >
              <span className="choice-number">{String(index + 1).padStart(2, "0")}</span>
              <span className="choice-text">{choice}</span>
              {index === currentChoiceIndex && <span className="choice-caret" style={{ color }}>▶</span>}
            </button>
          ))}
        </div>
      )}

      <style jsx>{`
        .dialogue-panel { height: 100%; display: flex; flex-direction: column; min-height: 400px; }
        .dialogue-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
        .nova-indicator { width: 10px; height: 10px; border-radius: 50%; animation: pulse 2s ease-in-out infinite; }
        .channel-label { font-family: 'JetBrains Mono', monospace; font-size: 8px; font-weight: 900; letter-spacing: 0.15em; color: #8a9cff; }
        .signal-status { margin-left: auto; font-family: 'JetBrains Mono', monospace; font-size: 7px; font-weight: 800; letter-spacing: 0.1em; padding: 4px 8px; border-radius: 999px; background: rgba(99, 216, 176, 0.15); color: #63d8b0; border: 1px solid rgba(99, 216, 176, 0.3); }
        .dialogue-content { position: relative; flex: 1; min-height: 200px; display: flex; align-items: flex-start; gap: 12px; padding: 8px 0; }
        .dialogue-mark { position: relative; top: -4px; color: rgba(110, 125, 255, 0.15); font-size: 72px; line-height: 0.7; font-family: Georgia, serif; user-select: none; }
        .dialogue-text { flex: 1; padding: 0 16px 0 8px; font-size: clamp(16px, 2vw, 22px); font-weight: 500; line-height: 1.5; color: #edf0ff; border-left: 2px solid; padding-left: 14px; min-height: 120px; white-space: pre-wrap; word-wrap: break-word; }
        .choices-container { display: grid; gap: 10px; margin-top: 16px; }
        .choice-button { display: flex; align-items: center; gap: 12px; width: 100%; padding: 14px 16px; border: 1px solid rgba(131, 145, 255, 0.13); border-left-width: 3px; border-radius: 8px; background: rgba(14, 19, 35, 0.78); color: #dce2ff; text-align: left; cursor: pointer; transition: all 0.15s ease; }
        .choice-button:hover:not(:disabled) { transform: translateX(4px); border-color: rgba(125, 139, 255, 0.38); background: rgba(26, 32, 58, 0.88); }
        .choice-button:disabled { opacity: 0.55; cursor: not-allowed; }
        .choice-button.highlighted { border-left-color: inherit; background: rgba(110, 125, 255, 0.08); }
        .choice-number { font-family: 'JetBrains Mono', monospace; font-size: 8px; font-weight: 900; color: #7786ff; min-width: 24px; }
        .choice-text { font-size: 11px; line-height: 1.45; flex: 1; }
        .choice-caret { font-size: 10px; font-weight: bold; animation: blink 1s ease-in-out infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}