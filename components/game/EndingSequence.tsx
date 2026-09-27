"use client";

import { useEffect, useRef, useState } from "react";
import { Memory } from "./types";
import { soundEngine } from "./SoundEngine";

interface EndingSequenceProps {
  memory: Memory;
  onReplay: () => void;
}

export function EndingSequence({ memory, onReplay }: EndingSequenceProps) {
  const [phase, setPhase] = useState<"fade" | "core" | "nova" | "memories" | "ending" | "stats">("fade");
  const [displayedMemories, setDisplayedMemories] = useState<string[]>([]);
  const [endingTitle, setEndingTitle] = useState("");
  const pulseRef = useRef(0);
  const particlesRef = useRef<
    Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      life: number;
      color: string;
    }>
  >([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | undefined>(undefined);

  const ending = memory.ending || "THE TRUTH";
  const pathColors: Record<string, string> = {
    TRUTH: "#c896ff",
    TRUST: "#63d8b0",
    ESCAPE: "#ff6b9d",
  };
  const pathColor = pathColors[ending] || "#63d8b0";

  useEffect(() => {
    soundEngine.setEnabled(true);
    soundEngine.playObjectiveComplete();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    };

    resize();
    window.addEventListener("resize", resize);

    const animate = () => {
      if (!ctx) return;

      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.fillStyle = "#020306";
      ctx.fillRect(0, 0, width, height);

      pulseRef.current += 0.01;

      for (let i = 5; i > 0; i--) {
        const r = 100 + i * 40 + Math.sin(pulseRef.current + i) * 10;
        const alpha = 0.02 * (1 - i * 0.15);
        const gradient = ctx.createRadialGradient(centerX, centerY, r * 0.5, centerX, centerY, r);
        gradient.addColorStop(0, `${pathColor}${Math.floor(alpha * 255 * 2).toString(16).padStart(2, "0")}`);
        gradient.addColorStop(1, `${pathColor}00`);
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      for (let ring = 0; ring < 4; ring++) {
        const ringRadius = 120 + ring * 40 + Math.sin(pulseRef.current * 0.5 + ring) * 8;
        const rotation = pulseRef.current * 0.2 * (ring % 2 === 0 ? 1 : -1);

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(rotation);

        for (let seg = 0; seg < 12; seg++) {
          const angle = (seg / 12) * Math.PI * 2;
          const segLength = 0.3;
          const alpha = 0.2 + Math.sin(pulseRef.current * 3 + seg) * 0.15;
          ctx.beginPath();
          ctx.arc(0, 0, ringRadius, angle, angle + segLength);
          ctx.strokeStyle = `${pathColor}${Math.floor(alpha * 255).toString(16).padStart(2, "0")}`;
          ctx.lineWidth = 2;
          ctx.lineCap = "round";
          ctx.stroke();
        }
        ctx.restore();
      }

      const coreRadius = 60 + Math.sin(pulseRef.current * 2) * 5;
      const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreRadius);
      coreGradient.addColorStop(0, `${pathColor}ff`);
      coreGradient.addColorStop(0.4, `${pathColor}cc`);
      coreGradient.addColorStop(0.7, "#0a1520");
      coreGradient.addColorStop(1, "#020306");

      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
      ctx.fillStyle = coreGradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `${pathColor}88`;
      ctx.lineWidth = 2;
      ctx.stroke();

      particlesRef.current.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.01;
        p.life--;
        p.alpha = (p.life / 120) * 0.8;

        if (p.life <= 0) {
          particlesRef.current.splice(idx, 1);
          return;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${Math.floor(p.alpha * 255).toString(16).padStart(2, "0")}`;
        ctx.fill();
      });

      if (phase === "core" || phase === "nova" || phase === "memories" || phase === "ending" || phase === "stats") {
        if (Math.random() < 0.08) {
          const angle = Math.random() * Math.PI * 2;
          const dist = coreRadius * 1.5;
          particlesRef.current.push({
            x: centerX + Math.cos(angle) * dist,
            y: centerY + Math.sin(angle) * dist,
            vx: Math.cos(angle) * (Math.random() * 2 + 0.5),
            vy: Math.sin(angle) * (Math.random() * 2 + 0.5) - 1,
            size: Math.random() * 4 + 2,
            alpha: 0.8,
            life: 100,
            color: [pathColor, "#63f5c2", "#8a9cff", "#ffb86b"][Math.floor(Math.random() * 4)],
          });
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [phase, ending, pathColor]);

  useEffect(() => {
    const phases = [
      { state: "fade" as const, delay: 500 },
      { state: "core" as const, delay: 2000 },
      { state: "nova" as const, delay: 2500 },
      { state: "memories" as const, delay: 3000 },
      { state: "ending" as const, delay: 2000 },
      { state: "stats" as const, delay: 1500 },
    ];

    let currentPhase = 0;

    const advancePhase = () => {
      if (currentPhase < phases.length) {
        setPhase(phases[currentPhase].state);
        currentPhase++;
        setTimeout(advancePhase, phases[currentPhase]?.delay || 0);
      }
    };

    const timer = setTimeout(advancePhase, phases[0].delay);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (phase === "ending") {
      setEndingTitle(ending);
    }
  }, [phase, ending]);

  useEffect(() => {
    if (phase === "memories") {
      const mem = memory.memories.slice(-6).reverse();
      let i = 0;
      const interval = setInterval(() => {
        if (i < mem.length) {
          soundEngine.playTone({ frequency: 400 + i * 60, duration: 0.15, type: "sine", volume: 0.2 });
          setDisplayedMemories((prev) => [...prev, mem[i]]);
          i++;
        } else {
          clearInterval(interval);
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [phase]);

  const getPathName = (path: string) => {
    switch (path) {
      case "truth": return "TRUTH";
      case "trust": return "TRUST";
      case "escape": return "ESCAPE";
      default: return "UNDECIDED";
    }
  };

  return (
    <div className="ending-sequence">
      <canvas ref={canvasRef} className="ending-canvas" aria-hidden="true" />

      <div className="ending-content">
        {phase === "fade" && (
          <div className="ending-phase fade">
            <div className="phase-text">CONNECTION TERMINATING...</div>
          </div>
        )}

        {phase === "core" && (
          <div className="ending-phase core">
            <div className="phase-glyph" style={{ color: pathColor }}>◎</div>
            <div className="phase-text">CORE SYNCHRONIZATION COMPLETE</div>
            <div className="phase-sub">100%</div>
          </div>
        )}

        {phase === "nova" && (
          <div className="ending-phase nova">
            <div className="nova-avatar" style={{ boxShadow: `0 0 60px ${pathColor}` }}>
              <svg viewBox="0 0 100 100" width="100" height="100">
                <circle cx="50" cy="50" r="45" fill="none" stroke={pathColor} strokeWidth="3" opacity="0.3" />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke={pathColor}
                  strokeWidth="4"
                  strokeDasharray="282"
                  strokeDashoffset={282 * 0.15}
                  strokeLinecap="round"
                  style={{ transform: "rotate(-90deg)", transformOrigin: "50px 50px", filter: `drop-shadow(0 0 8px ${pathColor})` }}
                />
              </svg>
            </div>
            <div className="phase-text" style={{ color: pathColor }}>NOVA</div>
            <div className="phase-sub">MEMORY RESTORED</div>
            <div className="nova-final-dialogue">
              "The facility remembers what you chose. Every path led here. This was always the outcome."
            </div>
          </div>
        )}

        {phase === "memories" && (
          <div className="ending-phase memories">
            <div className="phase-text">RECOVERED MEMORY FRAGMENTS</div>
            <div className="memories-list">
              {displayedMemories.map((mem, i) => (
                <div key={i} className="memory-entry" style={{ animationDelay: `${i * 0.1}s` }}>
                  <span className="memory-glyph">◆</span>
                  <span className="memory-text">{mem}</span>
                </div>
              ))}
              {displayedMemories.length === 0 && <div className="memory-entry"><span className="memory-glyph">◆</span><span className="memory-text">No fragments recovered...</span></div>}
            </div>
          </div>
        )}

        {phase === "ending" && (
          <div className="ending-phase ending">
            <div className="ending-title" style={{ color: pathColor }}>{endingTitle}</div>
            <div className="ending-path">PATH: {getPathName(memory.storyPath)}</div>
            <div className="ending-sub">Your decisions became the story. NOVA preserved the path you chose.</div>
          </div>
        )}

        {phase === "stats" && (
          <div className="ending-phase stats">
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-label">TRUST</span>
                <span className="stat-value" style={{ color: "#63d8b0" }}>{memory.trust}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">CURIOSITY</span>
                <span className="stat-value" style={{ color: "#ffb86b" }}>{memory.curiosity}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">FEAR</span>
                <span className="stat-value" style={{ color: "#ff6b9d" }}>{memory.fear}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">QUESTS</span>
                <span className="stat-value" style={{ color: "#c896ff" }}>{memory.questsCompleted.length}/3</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">CHOICES</span>
                <span className="stat-value" style={{ color: "#8a9cff" }}>{memory.choices.length}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">SHARDS</span>
                <span className="stat-value" style={{ color: pathColor }}>{memory.memories.length}</span>
              </div>
            </div>
            <button className="replay-button" onClick={onReplay}>
              <span>REPLAY CAMPAIGN</span>
              <span className="replay-arrow">→</span>
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .ending-sequence {
          position: fixed;
          inset: 0;
          z-index: 200;
          background: #020306;
          display: grid;
          place-items: center;
          overflow: hidden;
        }
        .ending-canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
        .ending-content {
          position: relative;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 40px 24px;
          max-width: 800px;
        }
        .ending-phase {
          animation: phaseIn 0.6s ease-out;
        }
        @keyframes phaseIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        .fade .phase-text {
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.2em;
          color: #59627e;
        }

        .core .phase-glyph {
          font-size: 64px;
          margin-bottom: 16px;
          animation: glyphSpin 3s linear infinite;
        }
        @keyframes glyphSpin { to { transform: rotate(360deg); } }
        .core .phase-text {
          font-family: 'JetBrains Mono', monospace;
          font-size: clamp(16px, 3vw, 24px);
          font-weight: 900;
          letter-spacing: 0.1em;
          color: #e6eaff;
          margin-bottom: 8px;
        }
        .core .phase-sub {
          font-family: 'JetBrains Mono', monospace;
          font-size: 24px;
          font-weight: 900;
          color: var(--path-color);
        }

        .nova .nova-avatar {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(10, 20, 35, 0.9), rgba(2, 3, 6, 0.99));
          border: 2px solid;
          display: grid;
          place-items: center;
          margin: 0 auto 20px;
          animation: avatarPulse 2s ease-in-out infinite;
        }
        @keyframes avatarPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }
        .nova .phase-text {
          font-family: 'JetBrains Mono', monospace;
          font-size: clamp(20px, 4vw, 32px);
          font-weight: 950;
          letter-spacing: 0.15em;
          margin-bottom: 4px;
        }
        .nova .phase-sub {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.2em;
          color: #8a9cff;
          margin-bottom: 20px;
        }
        .nova-final-dialogue {
          max-width: 600px;
          margin: 0 auto;
          font-size: 14px;
          line-height: 1.7;
          color: #a4adff;
          font-style: italic;
          padding: 0 20px;
        }

        .memories .phase-text {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.2em;
          color: #59627e;
          margin-bottom: 20px;
        }
        .memories-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-width: 600px;
          text-align: left;
        }
        .memory-entry {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 10px 14px;
          background: rgba(10, 15, 30, 0.6);
          border: 1px solid rgba(110, 125, 255, 0.1);
          border-radius: 8px;
          animation: memoryIn 0.4s ease-out backwards;
        }
        @keyframes memoryIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
        .memory-glyph {
          font-size: 14px;
          color: #c896ff;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .memory-text {
          font-size: 10px;
          color: #919ab4;
          line-height: 1.5;
        }

        .ending .ending-title {
          font-family: 'JetBrains Mono', monospace;
          font-size: clamp(32px, 6vw, 56px);
          font-weight: 950;
          letter-spacing: 0.08em;
          margin-bottom: 8px;
          text-shadow: 0 0 40px currentColor;
        }
        .ending .ending-path {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.15em;
          color: #8a9cff;
          margin-bottom: 16px;
        }
        .ending .ending-sub {
          max-width: 500px;
          font-size: 12px;
          line-height: 1.6;
          color: #7e88a6;
        }

        .stats .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 30px;
          max-width: 600px;
          width: 100%;
        }
        .stat-card {
          padding: 18px 12px;
          background: rgba(10, 15, 30, 0.8);
          border: 1px solid rgba(110, 125, 255, 0.15);
          border-radius: 12px;
          text-align: center;
        }
        .stat-label {
          display: block;
          font-family: 'JetBrains Mono', monospace;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.15em;
          color: #59627e;
          margin-bottom: 6px;
        }
        .stat-value {
          font-family: 'JetBrains Mono', monospace;
          font-size: 28px;
          font-weight: 950;
          line-height: 1;
        }
        .replay-button {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 16px 28px;
          border: 1px solid rgba(110, 125, 255, 0.3);
          border-radius: 10px;
          background: linear-gradient(135deg, rgba(85, 101, 230, 0.4), rgba(100, 77, 185, 0.3));
          color: #eef1ff;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.13em;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .replay-button:hover {
          background: linear-gradient(135deg, rgba(85, 101, 230, 0.6), rgba(100, 77, 185, 0.5));
          border-color: rgba(110, 125, 255, 0.5);
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(91, 105, 255, 0.2);
        }
        .replay-arrow { font-size: 14px; }

        @media (max-width: 560px) {
          .stats .stats-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  );
}