"use client";

import { Memory } from "./types";

interface MemoryHUDProps {
  memory: Memory | null;
  compact?: boolean;
}

export function MemoryHUD({ memory, compact = false }: MemoryHUDProps) {
  const trust = memory?.trust ?? 50;
  const curiosity = memory?.curiosity ?? 50;
  const fear = memory?.fear ?? 0;
  const relationship = memory?.relationship ?? "neutral";
  const storyPath = memory?.storyPath ?? "undecided";
  const memoriesCount = memory?.memories.length ?? 0;
  const questsCompleted = memory?.questsCompleted.length ?? 0;

  const getPathName = (path: string) => {
    switch (path) {
      case "truth": return "TRUTH";
      case "trust": return "TRUST";
      case "escape": return "ESCAPE";
      default: return "UNDECIDED";
    }
  };

  const getPathColor = (path: string) => {
    switch (path) {
      case "truth": return "#c896ff";
      case "trust": return "#63d8b0";
      case "escape": return "#ff6b9d";
      default: return "#8a9cff";
    }
  };

  if (compact) {
    return (
      <div className="memory-hud compact">
        <div className="hud-ring trust">
          <svg viewBox="0 0 60 60">
            <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(99, 216, 176, 0.15)" strokeWidth="4" />
            <circle
              cx="30"
              cy="30"
              r="26"
              fill="none"
              stroke="#63d8b0"
              strokeWidth="4"
              strokeDasharray="163"
              strokeDashoffset={163 - (163 * trust) / 100}
              strokeLinecap="round"
              style={{ transform: "rotate(-90deg)", transformOrigin: "30px 30px", transition: "stroke-dashoffset 0.5s ease" }}
            />
          </svg>
          <div className="ring-label">
            <span className="ring-value">{trust}</span>
            <span className="ring-name">TRUST</span>
          </div>
        </div>
        <div className="hud-ring curiosity">
          <svg viewBox="0 0 60 60">
            <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(255, 184, 107, 0.15)" strokeWidth="4" />
            <circle
              cx="30"
              cy="30"
              r="26"
              fill="none"
              stroke="#ffb86b"
              strokeWidth="4"
              strokeDasharray="163"
              strokeDashoffset={163 - (163 * curiosity) / 100}
              strokeLinecap="round"
              style={{ transform: "rotate(-90deg)", transformOrigin: "30px 30px", transition: "stroke-dashoffset 0.5s ease" }}
            />
          </svg>
          <div className="ring-label">
            <span className="ring-value">{curiosity}</span>
            <span className="ring-name">CURIO</span>
          </div>
        </div>
        <div className="hud-ring fear">
          <svg viewBox="0 0 60 60">
            <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(255, 107, 157, 0.15)" strokeWidth="4" />
            <circle
              cx="30"
              cy="30"
              r="26"
              fill="none"
              stroke="#ff6b9d"
              strokeWidth="4"
              strokeDasharray="163"
              strokeDashoffset={163 - (163 * fear) / 100}
              strokeLinecap="round"
              style={{ transform: "rotate(-90deg)", transformOrigin: "30px 30px", transition: "stroke-dashoffset 0.5s ease" }}
            />
          </svg>
          <div className="ring-label">
            <span className="ring-value">{fear}</span>
            <span className="ring-name">FEAR</span>
          </div>
        </div>
        <style jsx>{`
          .memory-hud.compact { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
          .hud-ring { position: relative; width: 60px; height: 60px; }
          .hud-ring svg { width: 60px; height: 60px; transform: rotate(-90deg); }
          .ring-label { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; pointer-events: none; }
          .ring-value { display: block; font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 900; color: #e6eaff; line-height: 1; }
          .ring-name { display: block; font-family: 'JetBrains Mono', monospace; font-size: 5px; font-weight: 800; letter-spacing: 0.1em; color: #59627e; margin-top: 2px; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="memory-hud full">
      <div className="hud-header">
        <span className="hud-title">MEMORY CORE</span>
        <span className="hud-status">ACTIVE</span>
      </div>

      <div className="hud-rings">
        <div className="hud-ring trust">
          <svg viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(99, 216, 176, 0.1)" strokeWidth="5" />
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="#63d8b0"
              strokeWidth="5"
              strokeDasharray="226"
              strokeDashoffset={226 - (226 * trust) / 100}
              strokeLinecap="round"
              style={{ transform: "rotate(-90deg)", transformOrigin: "40px 40px", transition: "stroke-dashoffset 0.6s ease" }}
            />
          </svg>
          <div className="ring-content">
            <span className="ring-value">{trust}</span>
            <span className="ring-name">TRUST</span>
            <div className="ring-bar"><div className="ring-bar-fill" style={{ width: `${trust}%` }} /></div>
          </div>
        </div>

        <div className="hud-ring curiosity">
          <svg viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255, 184, 107, 0.1)" strokeWidth="5" />
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="#ffb86b"
              strokeWidth="5"
              strokeDasharray="226"
              strokeDashoffset={226 - (226 * curiosity) / 100}
              strokeLinecap="round"
              style={{ transform: "rotate(-90deg)", transformOrigin: "40px 40px", transition: "stroke-dashoffset 0.6s ease" }}
            />
          </svg>
          <div className="ring-content">
            <span className="ring-value">{curiosity}</span>
            <span className="ring-name">CURIOSITY</span>
            <div className="ring-bar"><div className="ring-bar-fill" style={{ width: `${curiosity}%`, background: "linear-gradient(90deg, #ffb86b, #c896ff)" }} /></div>
          </div>
        </div>

        <div className="hud-ring fear">
          <svg viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255, 107, 157, 0.1)" strokeWidth="5" />
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="#ff6b9d"
              strokeWidth="5"
              strokeDasharray="226"
              strokeDashoffset={226 - (226 * fear) / 100}
              strokeLinecap="round"
              style={{ transform: "rotate(-90deg)", transformOrigin: "40px 40px", transition: "stroke-dashoffset 0.6s ease" }}
            />
          </svg>
          <div className="ring-content">
            <span className="ring-value">{fear}</span>
            <span className="ring-name">FEAR</span>
            <div className="ring-bar"><div className="ring-bar-fill" style={{ width: `${fear}%`, background: "linear-gradient(90deg, #ff6b9d, #ff6b6b)" }} /></div>
          </div>
        </div>
      </div>

      <div className="hud-meta">
        <div className="meta-item">
          <span className="meta-label">RELATIONSHIP</span>
          <span className="meta-value relationship">{relationship.toUpperCase()}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">STORY PATH</span>
          <span className="meta-value path" style={{ color: getPathColor(storyPath) }}>{getPathName(storyPath)}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">MEMORY SHARDS</span>
          <span className="meta-value">{memoriesCount}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">QUESTS COMPLETED</span>
          <span className="meta-value">{questsCompleted}/3</span>
        </div>
      </div>

      <style jsx>{`
        .memory-hud.full { display: flex; flex-direction: column; gap: 16px; }
        .hud-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
        .hud-title { font-family: 'JetBrains Mono', monospace; font-size: 8px; font-weight: 900; letter-spacing: 0.2em; color: #59627e; }
        .hud-status { font-family: 'JetBrains Mono', monospace; font-size: 7px; font-weight: 800; color: #63d8b0; padding: 2px 8px; border: 1px solid rgba(99, 216, 176, 0.3); border-radius: 999px; background: rgba(99, 216, 176, 0.1); }

        .hud-rings { display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; }
        .hud-ring { position: relative; width: 80px; height: 80px; }
        .hud-ring svg { width: 80px; height: 80px; transform: rotate(-90deg); filter: drop-shadow(0 0 8px currentColor); }
        .hud-ring.trust svg { color: #63d8b0; }
        .hud-ring.curiosity svg { color: #ffb86b; }
        .hud-ring.fear svg { color: #ff6b9d; }
        .ring-content { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; pointer-events: none; }
        .ring-value { display: block; font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 900; color: #e6eaff; line-height: 1; }
        .ring-name { display: block; font-family: 'JetBrains Mono', monospace; font-size: 6px; font-weight: 800; letter-spacing: 0.1em; color: #59627e; margin-top: 2px; }
        .ring-bar { margin-top: 6px; height: 3px; background: rgba(20, 25, 45, 0.8); border-radius: 2px; overflow: hidden; width: 50px; }
        .ring-bar-fill { height: 100%; border-radius: 2px; transition: width 0.5s ease-out; background: linear-gradient(90deg, #63d8b0, #63f5c2); }

        .hud-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; }
        .meta-item { padding: 10px; background: rgba(10, 15, 30, 0.6); border: 1px solid rgba(110, 125, 255, 0.08); border-radius: 8px; }
        .meta-label { display: block; font-family: 'JetBrains Mono', monospace; font-size: 6px; font-weight: 900; letter-spacing: 0.12em; color: #59627e; margin-bottom: 4px; }
        .meta-value { font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 800; color: #a4adff; }
        .meta-value.relationship { color: #63d8b0; }
        .meta-value.path { font-weight: 900; }
      `}</style>
    </div>
  );
}