"use client";

import { useEffect, useRef, useState } from "react";
import { Quest, Memory } from "./types";
import { soundEngine } from "./SoundEngine";

interface QuestPanelProps {
  quest: Quest | null;
  memory: Memory | null;
  onQuestComplete: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  color: string;
}

export function QuestPanel({ quest, memory, onQuestComplete }: QuestPanelProps) {
  const [displayProgress, setDisplayProgress] = useState(0);
  const [showReward, setShowReward] = useState(false);
  const [phase, setPhase] = useState<"idle" | "active" | "complete" | "celebrating">("idle");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const particlesRef = useRef<Particle[]>([]);
  const celebrationPhaseRef = useRef(0);
  const flashRef = useRef(0);

  useEffect(() => {
    if (quest) {
      setPhase("active");
      setDisplayProgress(quest.progress);
      setShowReward(false);
    } else if (memory?.ending) {
      setPhase("complete");
    } else {
      setPhase("idle");
    }
  }, [quest, memory]);

  useEffect(() => {
    if (quest && displayProgress < quest.progress) {
      const timer = setInterval(() => {
        setDisplayProgress((p) => Math.min(quest.progress, p + 2));
      }, 50);
      return () => clearInterval(timer);
    }
  }, [quest]);

  useEffect(() => {
    if (quest && displayProgress >= 100 && !showReward) {
      setShowReward(true);
      setPhase("celebrating");
      soundEngine.playObjectiveComplete();
      flashRef.current = 30;

      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        for (let i = 0; i < 50; i++) {
          const angle = (i / 50) * Math.PI * 2;
          const speed = 2 + Math.random() * 4;
          particlesRef.current.push({
            x: centerX,
            y: centerY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            size: 3 + Math.random() * 5,
            alpha: 1,
            life: 90,
            color: ["#63d8b0", "#63f5c2", "#ffb86b", "#c896ff", "#8a9cff"][Math.floor(Math.random() * 5)],
          });
        }

        for (let i = 0; i < 30; i++) {
          const angle = Math.random() * Math.PI * 2;
          particlesRef.current.push({
            x: centerX + Math.cos(angle) * 50,
            y: centerY + Math.sin(angle) * 50,
            vx: Math.cos(angle) * (1 + Math.random() * 2),
            vy: Math.sin(angle) * (1 + Math.random() * 2),
            size: 2 + Math.random() * 3,
            alpha: 0.8,
            life: 60,
            color: "#63f5c2",
          });
        }
      }

      setTimeout(() => {
        onQuestComplete();
        setPhase("active");
        setShowReward(false);
      }, 2000);
    }
  }, [displayProgress, quest, showReward, onQuestComplete]);

  useEffect(() => {
    if (phase !== "celebrating" && particlesRef.current.length === 0 && flashRef.current === 0) return;

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

      ctx.clearRect(0, 0, width, height);

      celebrationPhaseRef.current += 0.05;

      if (flashRef.current > 0) {
        const flashAlpha = flashRef.current / 30;
        const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height));
        gradient.addColorStop(0, `rgba(99, 245, 194, ${flashAlpha * 0.3})`);
        gradient.addColorStop(1, "rgba(99, 245, 194, 0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        flashRef.current--;
      }

      particlesRef.current.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.life--;
        p.alpha = (p.life / 90) * 0.9;

        if (p.life <= 0) {
          particlesRef.current.splice(idx, 1);
          return;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${Math.floor(p.alpha * 255).toString(16).padStart(2, "0")}`;
        ctx.fill();
      });

      if (phase === "celebrating") {
        const ringCount = 3;
        for (let r = 0; r < ringCount; r++) {
          const ringProgress = (celebrationPhaseRef.current * 0.5 + r * 0.33) % 1;
          const radius = ringProgress * Math.max(width, height) * 0.7;
          const alpha = (1 - ringProgress) * 0.5;

          ctx.beginPath();
          ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(99, 216, 176, ${alpha})`;
          ctx.lineWidth = 3;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(width / 2, height / 2, radius * 0.6, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(99, 245, 194, ${alpha * 0.7})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        const textScale = 1 + Math.sin(celebrationPhaseRef.current * 8) * 0.1;
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.scale(textScale, textScale);
        ctx.font = "bold 24px 'JetBrains Mono', monospace";
        ctx.fillStyle = "#63f5c2";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "#63d8b0";
        ctx.shadowBlur = 20;
        ctx.fillText("OBJECTIVE COMPLETE", 0, 0);
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      if (particlesRef.current.length > 0 || flashRef.current > 0 || phase === "celebrating") {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [phase]);

  const getLocationVisual = (location: string) => {
    const visuals: Record<string, { glyph: string; color: string }> = {
      ENTRANCE: { glyph: "◫", color: "#63d8b0" },
      "SECURITY HALL": { glyph: "⌂", color: "#8a9cff" },
      "AUXILIARY TERMINAL": { glyph: "⌁", color: "#ffb86b" },
      ARCHIVE: { glyph: "▤", color: "#c896ff" },
      ELEVATOR: { glyph: "⬢", color: "#ff6b9d" },
      "SUB-CORE": { glyph: "◎", color: "#63f5c2" },
    };
    return visuals[location] || { glyph: "?", color: "#59627e" };
  };

  if (phase === "idle") {
    return (
      <div className="quest-panel idle">
        <canvas ref={canvasRef} className="celebration-canvas" />
        <div className="panel-header">
          <span className="panel-tag">ACTIVE OBJECTIVE</span>
        </div>
        <div className="quest-empty">
          <div className="empty-glyph">◎</div>
          <p>{memory?.ending ? "Campaign complete. All objectives fulfilled." : "Awaiting directive from NOVA..."}</p>
        </div>
        <style jsx>{`
          .quest-panel { height: 100%; display: flex; flex-direction: column; position: relative; }
          .celebration-canvas { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }
          .panel-header { margin-bottom: 16px; position: relative; z-index: 1; }
          .panel-tag { font-family: 'JetBrains Mono', monospace; font-size: 7px; font-weight: 900; letter-spacing: 0.15em; color: #59627e; }
          .quest-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #59627e; padding: 20px; position: relative; z-index: 1; }
          .empty-glyph { font-size: 32px; color: rgba(110, 125, 255, 0.3); margin-bottom: 12px; }
          .quest-empty p { margin: 0; font-family: 'JetBrains Mono', monospace; font-size: 9px; line-height: 1.6; }
        `}</style>
      </div>
    );
  }

  if (phase === "complete") {
    return (
      <div className="quest-panel complete">
        <canvas ref={canvasRef} className="celebration-canvas" />
        <div className="panel-header">
          <span className="panel-tag">CAMPAIGN COMPLETE</span>
        </div>
        <div className="quest-complete">
          <div className="complete-glyph">◎</div>
          <h3>ALL OBJECTIVES FULFILLED</h3>
          <p>The facility has revealed its secrets. NOVA awaits your final decision.</p>
          <div className="ending-hint">ENDING: {memory?.ending}</div>
        </div>
        <style jsx>{`
          .quest-panel { height: 100%; display: flex; flex-direction: column; position: relative; }
          .celebration-canvas { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }
          .panel-header { margin-bottom: 16px; position: relative; z-index: 1; }
          .panel-tag { font-family: 'JetBrains Mono', monospace; font-size: 7px; font-weight: 900; letter-spacing: 0.15em; color: #63d8b0; }
          .quest-complete { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 20px; position: relative; z-index: 1; }
          .complete-glyph { font-size: 40px; color: #63d8b0; margin-bottom: 16px; animation: pulse 2s ease-in-out infinite; }
          .quest-complete h3 { margin: 0 0 8px; font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 900; color: #e6eaff; letter-spacing: 0.05em; }
          .quest-complete p { margin: 0 0 16px; font-size: 10px; color: #8a9cff; line-height: 1.5; }
          .ending-hint { font-family: 'JetBrains Mono', monospace; font-size: 8px; font-weight: 800; color: #c896ff; padding: 6px 12px; border: 1px solid rgba(200, 150, 255, 0.3); border-radius: 999px; background: rgba(200, 150, 255, 0.1); }
          @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.05); opacity: 0.8; } }
        `}</style>
      </div>
    );
  }

  const visual = getLocationVisual(quest?.location || "");

  return (
    <div className="quest-panel active">
      <canvas ref={canvasRef} className="celebration-canvas" />
      <div className="panel-header">
        <span className="panel-tag">ACTIVE OBJECTIVE</span>
        <div className="chapter-badge">CHAPTER {memory?.chapter ?? 1} / 3</div>
      </div>

      <div className="quest-main">
        <div className="quest-title-row">
          <div className="quest-glyph" style={{ color: visual.color }}>{visual.glyph}</div>
          <div className="quest-info">
            <h2>{quest?.title}</h2>
            <p className="quest-objective">{quest?.objective}</p>
          </div>
        </div>

        <div className="quest-target">
          <span className="target-label">TARGET SECTOR</span>
          <div className="target-info">
            <span className="target-name">{quest?.location}</span>
            <span className="target-action">[{quest?.actionLabel}]</span>
          </div>
        </div>

        <div className="quest-progress">
          <div className="progress-header">
            <span>SYNCHRONIZATION</span>
            <span className="progress-value">{displayProgress}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${displayProgress}%` }} />
          </div>
          <div className="progress-milestones">
            {[33, 66, 100].map((m) => (
              <div key={m} className={`milestone ${displayProgress >= m ? "reached" : ""}`} style={{ left: `${m}%` }} />
            ))}
          </div>
        </div>

        <div className="quest-reward">
          <span className="reward-label">REWARD</span>
          <span className="reward-text">{quest?.reward}</span>
        </div>

        {showReward && (
          <div className="reward-unlock">
            <div className="unlock-glyph">✓</div>
            <span>OBJECTIVE COMPLETE — {quest?.reward}</span>
          </div>
        )}
      </div>

      <style jsx>{`
        .quest-panel { height: 100%; display: flex; flex-direction: column; position: relative; }
        .celebration-canvas { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }
        .panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; position: relative; z-index: 1; }
        .panel-tag { font-family: 'JetBrains Mono', monospace; font-size: 7px; font-weight: 900; letter-spacing: 0.15em; color: #59627e; }
        .chapter-badge { font-family: 'JetBrains Mono', monospace; font-size: 7px; font-weight: 800; color: #8a9cff; padding: 3px 8px; border: 1px solid rgba(138, 156, 255, 0.2); border-radius: 999px; background: rgba(138, 156, 255, 0.1); }

        .quest-main { flex: 1; display: flex; flex-direction: column; gap: 16px; position: relative; z-index: 1; }
        .quest-title-row { display: flex; gap: 12px; }
        .quest-glyph { font-size: 28px; flex-shrink: 0; }
        .quest-info { flex: 1; min-width: 0; }
        .quest-info h2 { margin: 0 0 6px; font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 900; letter-spacing: 0.04em; color: #e6eaff; line-height: 1.2; }
        .quest-objective { margin: 0; font-size: 9px; color: #919ab7; line-height: 1.5; }

        .quest-target { padding: 10px 12px; background: rgba(110, 125, 255, 0.05); border: 1px solid rgba(110, 125, 255, 0.1); border-radius: 8px; }
        .target-label { display: block; font-family: 'JetBrains Mono', monospace; font-size: 6px; font-weight: 900; letter-spacing: 0.15em; color: #59627e; margin-bottom: 4px; }
        .target-info { display: flex; align-items: center; gap: 8px; }
        .target-name { font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 800; color: #8a9cff; }
        .target-action { font-family: 'JetBrains Mono', monospace; font-size: 7px; font-weight: 800; color: #ffb86b; background: rgba(255, 184, 107, 0.1); padding: 2px 6px; border-radius: 4px; }

        .quest-progress { margin-top: 4px; }
        .progress-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .progress-header span:first-child { font-family: 'JetBrains Mono', monospace; font-size: 7px; font-weight: 900; letter-spacing: 0.15em; color: #59627e; }
        .progress-value { font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 800; color: #63d8b0; }
        .progress-bar { height: 6px; background: rgba(20, 25, 45, 0.8); border-radius: 3px; overflow: hidden; position: relative; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #63d8b0, #63f5c2); border-radius: 3px; transition: width 0.4s ease-out; box-shadow: 0 0 12px rgba(99, 216, 176, 0.5); }
        .progress-milestones { position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; }
        .milestone { position: absolute; top: -2px; width: 2px; height: 10px; background: rgba(80, 90, 120, 0.4); transform: translateX(-50%); transition: background 0.3s ease; }
        .milestone.reached { background: #63d8b0; box-shadow: 0 0 8px #63d8b0; }

        .quest-reward { padding-top: 8px; border-top: 1px solid rgba(255, 255, 255, 0.05); display: flex; justify-content: space-between; align-items: center; }
        .reward-label { font-family: 'JetBrains Mono', monospace; font-size: 7px; font-weight: 900; letter-spacing: 0.15em; color: #59627e; }
        .reward-text { font-size: 9px; color: #c896ff; text-align: right; max-width: 70%; }

        .reward-unlock { margin-top: 12px; padding: 12px; background: rgba(99, 216, 176, 0.1); border: 1px solid rgba(99, 216, 176, 0.3); border-radius: 8px; display: flex; align-items: center; gap: 10px; animation: slideIn 0.4s ease-out; }
        .unlock-glyph { font-size: 18px; color: #63f5c2; }
        .reward-unlock span { font-family: 'JetBrains Mono', monospace; font-size: 8px; font-weight: 900; letter-spacing: 0.1em; color: #63d8b0; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}