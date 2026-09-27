"use client";

import { Memory } from "./types";

interface StatusStripProps {
  memory: Memory | null;
  systemMessage: string;
  chapter: number;
  storyPath: string;
  signalStrength: number;
}

export function StatusStrip({ memory, systemMessage, chapter, storyPath, signalStrength }: StatusStripProps) {
  const trust = memory?.trust ?? 50;
  const curiosity = memory?.curiosity ?? 50;
  const fear = memory?.fear ?? 0;

  const getPathName = (path: string) => {
    switch (path) {
      case "truth": return "TRUTH";
      case "trust": return "TRUST";
      case "escape": return "ESCAPE";
      default: return "UNDECIDED";
    }
  };

  return (
    <div className="status-strip">
      <div className="status-left">
        <span className="status-live">●</span>
        <span className="system-message">{systemMessage}</span>
      </div>
      <div className="status-center">
        <div className="mini-hud">
          <span className="mini-stat trust" title="Trust">{trust}</span>
          <span className="mini-stat curiosity" title="Curiosity">{curiosity}</span>
          <span className="mini-stat fear" title="Fear">{fear}</span>
        </div>
      </div>
      <div className="status-right">
        <span className="status-chip">CH {chapter}/3</span>
        <span className="status-chip path">{getPathName(storyPath)}</span>
        <span className="status-chip signal">SIG {signalStrength}%</span>
      </div>
      <style jsx>{`
        .status-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 10px 16px;
          background: rgba(8, 11, 19, 0.85);
          border: 1px solid rgba(110, 125, 255, 0.12);
          border-radius: 10px;
          backdrop-filter: blur(12px);
          flex-wrap: wrap;
        }
        .status-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 200px; }
        .status-live {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #63f5c2;
          box-shadow: 0 0 12px rgba(99, 245, 194, 0.8);
          animation: pulse 1.5s ease-in-out infinite;
        }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .system-message {
          font-family: 'JetBrains Mono', monospace;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: #8e9ac0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .status-center { display: flex; justify-content: center; gap: 8px; }
        .mini-hud { display: flex; gap: 16px; }
        .mini-stat {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .mini-stat::before {
          content: "";
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
        .mini-stat.trust::before { background: #63d8b0; box-shadow: 0 0 8px #63d8b0; }
        .mini-stat.curiosity::before { background: #ffb86b; box-shadow: 0 0 8px #ffb86b; }
        .mini-stat.fear::before { background: #ff6b9d; box-shadow: 0 0 8px #ff6b9d; }
        .status-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
        .status-chip {
          font-family: 'JetBrains Mono', monospace;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.1em;
          padding: 4px 8px;
          border: 1px solid rgba(110, 125, 255, 0.16);
          border-radius: 999px;
          background: rgba(24, 30, 56, 0.55);
          color: #8d99de;
        }
        .status-chip.path { border-color: rgba(200, 150, 255, 0.3); color: #c896ff; }
        .status-chip.signal { border-color: rgba(99, 216, 176, 0.3); color: #63d8b0; }
      `}</style>
    </div>
  );
}