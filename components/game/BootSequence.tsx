"use client";

import { useEffect, useRef, useState } from "react";
import { soundEngine } from "./SoundEngine";

interface BootSequenceProps {
  onComplete: () => void;
}

export function BootSequence({ onComplete }: BootSequenceProps) {
  const [phase, setPhase] = useState<"black" | "system" | "nova" | "facility" | "reveal">("black");
  const [systemLines, setSystemLines] = useState<string[]>([]);
  const [scanProgress, setScanProgress] = useState(0);
  const pulseRef = useRef(0);

  useEffect(() => {
    soundEngine.setEnabled(true);
    soundEngine.setVolume(0.25);
    // Ambient disabled by default - user can enable via sound toggle

    const phases = [
      { state: "black" as const, delay: 800 },
      { state: "system" as const, delay: 2500 },
      { state: "nova" as const, delay: 2000 },
      { state: "facility" as const, delay: 1500 },
      { state: "reveal" as const, delay: 1000 },
    ];

    let currentPhase = 0;

    const advancePhase = () => {
      if (currentPhase < phases.length) {
        setPhase(phases[currentPhase].state);
        currentPhase++;
        setTimeout(advancePhase, phases[currentPhase]?.delay || 0);
      } else {
        setTimeout(() => {
          soundEngine.playObjectiveComplete();
          onComplete();
        }, 500);
      }
    };

    const timer = setTimeout(advancePhase, phases[0].delay);
    return () => clearTimeout(timer);
  }, [onComplete]);

  useEffect(() => {
    if (phase === "system") {
      const lines = [
        "SYSTEM BOOTING...",
        "MEMORY CORE // ONLINE",
        "NEURAL INTERFACE // ONLINE",
        "FACILITY UPLINK // ESTABLISHING",
        "LONG-RANGE SENSORS // CALIBRATING",
        "NOVA CORE // INITIALIZING",
      ];
      let i = 0;
      const interval = setInterval(() => {
        if (i < lines.length) {
          soundEngine.playTone({ frequency: 400 + i * 80, duration: 0.08, type: "square", volume: 0.2 });
          setSystemLines((prev) => [...prev, lines[i]]);
          i++;
        } else {
          clearInterval(interval);
        }
      }, 350);
      return () => clearInterval(interval);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "facility") {
      const interval = setInterval(() => {
        setScanProgress((p) => {
          if (p >= 100) return 100;
          return p + Math.random() * 15;
        });
      }, 200);
      return () => clearInterval(interval);
    }
  }, [phase]);

  const renderPhase = () => {
    switch (phase) {
      case "black":
        return (
          <div className="boot-phase black">
            <div className="boot-text">GHOSTMIND</div>
            <div className="boot-sub">AI + GAMES // AGENTHON 2026</div>
            <div className="boot-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        );
      case "system":
        return (
          <div className="boot-phase system">
            <div className="boot-title">SYSTEM INITIALIZATION</div>
            <div className="boot-lines">
              {systemLines.map((line, i) => (
                <div key={i} className="boot-line">{line}</div>
              ))}
            </div>
            <div className="boot-progress">
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${(systemLines.length / 6) * 100}%` }} /></div>
            </div>
          </div>
        );
      case "nova":
        return (
          <div className="boot-phase nova">
            <div className="nova-boot-core">
              <svg viewBox="0 0 200 200" className="nova-svg">
                <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(99, 216, 176, 0.2)" strokeWidth="2" />
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  fill="none"
                  stroke="#63d8b0"
                  strokeWidth="3"
                  strokeDasharray="502"
                  strokeDashoffset={502 - (502 * 0.85)}
                  strokeLinecap="round"
                  style={{ transform: "rotate(-90deg)", transformOrigin: "100px 100px", filter: "drop-shadow(0 0 8px #63d8b0)" }}
                />
              </svg>
            </div>
            <div className="nova-boot-text">NOVA ONLINE</div>
            <div className="nova-boot-sub">ADAPTIVE AI // MEMORY PERSISTENT</div>
            <div className="nova-link">NEURAL LINK: 98%</div>
          </div>
        );
      case "facility":
        return (
          <div className="boot-phase facility">
            <div className="boot-title">FACILITY CONNECTION</div>
            <div className="facility-scan">
              <div className="scan-display">
                <div className="scan-grid" />
                <div className="scan-line" style={{ top: `${scanProgress}%` }} />
                <div className="scan-targets">
                  <div className="scan-target" style={{ top: "15%", left: "20%" }}>ENTRANCE</div>
                  <div className="scan-target" style={{ top: "35%", left: "50%" }}>SECURITY HALL</div>
                  <div className="scan-target" style={{ top: "55%", left: "25%" }}>AUX TERMINAL</div>
                  <div className="scan-target" style={{ top: "55%", left: "75%" }}>ARCHIVE</div>
                  <div className="scan-target" style={{ top: "75%", left: "50%" }}>SUB-CORE</div>
                </div>
              </div>
            </div>
            <div className="boot-progress">
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${scanProgress}%` }} /></div>
              <span className="scan-status">SCANNING SECTORS... {Math.min(100, Math.round(scanProgress))}%</span>
            </div>
          </div>
        );
      case "reveal":
        return (
          <div className="boot-phase reveal">
            <div className="reveal-text">FACILITY CONNECTION ESTABLISHED</div>
            <div className="reveal-sub">OBJECTIVE: INVESTIGATE THE AUXILIARY TERMINAL</div>
            <div className="reveal-key">PRESS ANY KEY TO BEGIN</div>
          </div>
        );
      default:
        return null;
    }
  };

  useEffect(() => {
    const handleKey = () => {
      if (phase === "reveal") {
        onComplete();
      }
    };
    window.addEventListener("keydown", handleKey);
    window.addEventListener("click", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("click", handleKey);
    };
  }, [phase, onComplete]);

  return (
    <div className="boot-sequence" aria-hidden="true">
      {renderPhase()}
      <style jsx>{`
        .boot-sequence {
          position: fixed;
          inset: 0;
          z-index: 200;
          background: #020306;
          display: grid;
          place-items: center;
          overflow: hidden;
        }
        .boot-phase {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          animation: fadeIn 0.5s ease-out;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .black .boot-text {
          font-family: 'JetBrains Mono', monospace;
          font-size: clamp(32px, 6vw, 64px);
          font-weight: 950;
          letter-spacing: 0.3em;
          color: #e6eaff;
          margin-bottom: 8px;
        }
        .black .boot-sub {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.2em;
          color: #59627e;
        }
        .black .boot-dots {
          display: flex;
          gap: 6px;
          margin-top: 30px;
        }
        .black .boot-dots span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(110, 125, 255, 0.4);
          animation: dotPulse 1.2s ease-in-out infinite;
        }
        .black .boot-dots span:nth-child(2) { animation-delay: 0.2s; }
        .black .boot-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes dotPulse { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 1; transform: scale(1.3); } }

        .system .boot-title {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.2em;
          color: #63d8b0;
          margin-bottom: 20px;
        }
        .system .boot-lines {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #a4adff;
          text-align: left;
          min-width: 380px;
          max-height: 200px;
        }
        .system .boot-line {
          padding: 4px 0;
          border-left: 2px solid #63d8b0;
          padding-left: 12px;
          animation: slideIn 0.3s ease-out backwards;
        }
        .system .boot-line:nth-child(1) { animation-delay: 0ms; }
        .system .boot-line:nth-child(2) { animation-delay: 350ms; }
        .system .boot-line:nth-child(3) { animation-delay: 700ms; }
        .system .boot-line:nth-child(4) { animation-delay: 1050ms; }
        .system .boot-line:nth-child(5) { animation-delay: 1400ms; }
        .system .boot-line:nth-child(6) { animation-delay: 1750ms; }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
        .system .boot-progress { margin-top: 24px; width: 380px; }
        .progress-bar { height: 4px; background: rgba(20, 25, 45, 0.8); border-radius: 2px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #63d8b0, #63f5c2); border-radius: 2px; transition: width 0.3s ease; box-shadow: 0 0 12px rgba(99, 216, 176, 0.5); }

        .nova .nova-boot-core {
          width: 160px;
          height: 160px;
          animation: corePulse 2s ease-in-out infinite;
        }
        .nova .nova-svg { width: 100%; height: 100%; }
        @keyframes corePulse { 0%, 100% { transform: scale(1); filter: drop-shadow(0 0 20px rgba(99, 216, 176, 0.4)); } 50% { transform: scale(1.05); filter: drop-shadow(0 0 40px rgba(99, 216, 176, 0.7)); } }
        .nova .nova-boot-text {
          margin-top: 20px;
          font-family: 'JetBrains Mono', monospace;
          font-size: clamp(24px, 4vw, 36px);
          font-weight: 950;
          letter-spacing: 0.15em;
          color: #63f5c2;
          text-shadow: 0 0 30px rgba(99, 245, 194, 0.5);
        }
        .nova .nova-boot-sub {
          margin-top: 8px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.2em;
          color: #8a9cff;
        }
        .nova .nova-link {
          margin-top: 24px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 800;
          color: #59627e;
          padding: 6px 16px;
          border: 1px solid rgba(110, 125, 255, 0.2);
          border-radius: 999px;
          background: rgba(110, 125, 255, 0.05);
        }

        .facility .boot-title {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.2em;
          color: #8a9cff;
          margin-bottom: 20px;
        }
        .facility-scan { position: relative; width: 300px; height: 300px; border: 1px solid rgba(110, 125, 255, 0.2); border-radius: 12px; overflow: hidden; background: radial-gradient(circle at center, rgba(12, 17, 32, 0.9), rgba(5, 7, 13, 0.99)); }
        .scan-display { position: relative; width: 100%; height: 100%; }
        .scan-grid { position: absolute; inset: 0; opacity: 0.15; background-image: linear-gradient(rgba(118, 133, 255, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(118, 133, 255, 0.3) 1px, transparent 1px); background-size: 25px 25px; }
        .scan-line { position: absolute; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, transparent, #63d8b0, transparent); box-shadow: 0 0 15px #63d8b0; animation: scanMove 2s linear infinite; }
        @keyframes scanMove { 0% { top: 0; } 100% { top: 100%; } }
        .scan-targets { position: absolute; inset: 0; pointer-events: none; }
        .scan-target { position: absolute; font-family: 'JetBrains Mono', monospace; font-size: 7px; font-weight: 900; letter-spacing: 0.1em; color: rgba(99, 216, 176, 0.6); transform: translate(-50%, -50%); animation: targetBlink 1.5s ease-in-out infinite; }
        .scan-target:nth-child(2) { animation-delay: 0.3s; }
        .scan-target:nth-child(3) { animation-delay: 0.6s; }
        .scan-target:nth-child(4) { animation-delay: 0.9s; }
        .scan-target:nth-child(5) { animation-delay: 1.2s; }
        @keyframes targetBlink { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; color: #63f5c2; text-shadow: 0 0 10px #63d8b0; } }
        .facility .boot-progress { margin-top: 16px; width: 300px; text-align: center; }
        .facility .scan-status { display: block; margin-top: 8px; font-family: 'JetBrains Mono', monospace; font-size: 8px; color: #68718d; }

        .reveal .reveal-text {
          font-family: 'JetBrains Mono', monospace;
          font-size: clamp(16px, 3vw, 24px);
          font-weight: 900;
          letter-spacing: 0.08em;
          color: #e6eaff;
          margin-bottom: 12px;
          animation: revealPulse 2s ease-in-out infinite;
        }
        @keyframes revealPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        .reveal .reveal-sub {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.15em;
          color: #ffb86b;
          margin-bottom: 24px;
        }
        .reveal .reveal-key {
          font-family: 'JetBrains Mono', monospace;
          font-size: 8px;
          color: #59627e;
          padding: 10px 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.02);
          animation: keyPulse 1.5s ease-in-out infinite;
        }
        @keyframes keyPulse { 0%, 100% { border-color: rgba(255, 255, 255, 0.1); } 50% { border-color: rgba(110, 125, 255, 0.5); background: rgba(110, 125, 255, 0.05); } }
      `}</style>
    </div>
  );
}

const pulseRef = { current: 0 };