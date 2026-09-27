"use client";

import { useEffect, useRef, useState } from "react";
import { soundEngine } from "./SoundEngine";

interface CoreAlignmentProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onFailure: () => void;
  locationName: string;
}

interface Ring {
  angle: number;
  targetAngle: number;
  speed: number;
  radius: number;
  nodes: number;
  aligned: boolean;
  color: string;
  thickness: number;
}

export function CoreAlignment({ isOpen, onClose, onSuccess, onFailure, locationName }: CoreAlignmentProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const ringsRef = useRef<Ring[]>([]);
  const [progress, setProgress] = useState(0);
  const [activeRing, setActiveRing] = useState(0);
  const [phase, setPhase] = useState<"playing" | "complete">("playing");
  const pulsePhaseRef = useRef(0);
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
  const energyPulseRef = useRef(0);
  const centerRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!isOpen) return;

    ringsRef.current = [
      { angle: 0, targetAngle: 0, speed: 0.8, radius: 80, nodes: 6, aligned: false, color: "#63d8b0", thickness: 4 },
      { angle: Math.PI * 0.3, targetAngle: Math.PI * 1.2, speed: -0.5, radius: 120, nodes: 8, aligned: false, color: "#8a9cff", thickness: 3 },
      { angle: Math.PI * 1.5, targetAngle: Math.PI * 0.7, speed: 0.6, radius: 160, nodes: 10, aligned: false, color: "#ffb86b", thickness: 3 },
      { angle: Math.PI * 0.8, targetAngle: Math.PI * 1.8, speed: -0.4, radius: 200, nodes: 12, aligned: false, color: "#c896ff", thickness: 2 },
    ];

    ringsRef.current.forEach((ring) => {
      ring.targetAngle = (Math.random() * 2 - 1) * Math.PI;
    });

    setProgress(0);
    setActiveRing(0);
    setPhase("playing");
    energyPulseRef.current = 0;
    particlesRef.current = [];
    soundEngine.playTerminal();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

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
      centerRef.current = { x: centerX, y: centerY };

      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = "#020306";
      ctx.fillRect(0, 0, width, height);

      const gridSize = 40;
      ctx.strokeStyle = "rgba(110, 125, 255, 0.03)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      pulsePhaseRef.current += 0.015;

      for (let i = 3; i >= 0; i--) {
        const r = 240 + i * 30 + Math.sin(pulsePhaseRef.current + i) * 5;
        const alpha = 0.015;
        const gradient = ctx.createRadialGradient(centerX, centerY, r * 0.5, centerX, centerY, r);
        gradient.addColorStop(0, `rgba(99, 216, 176, ${alpha * 2})`);
        gradient.addColorStop(1, "rgba(99, 216, 176, 0)");
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      energyPulseRef.current += 0.02;
      const pulseAlpha = (Math.sin(energyPulseRef.current * 3) * 0.5 + 0.5) * 0.3;
      const pulseGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 60);
      pulseGradient.addColorStop(0, `rgba(99, 245, 194, ${pulseAlpha})`);
      pulseGradient.addColorStop(0.5, `rgba(138, 156, 255, ${pulseAlpha * 0.5})`);
      pulseGradient.addColorStop(1, "rgba(99, 216, 176, 0)");
      ctx.beginPath();
      ctx.arc(centerX, centerY, 60, 0, Math.PI * 2);
      ctx.fillStyle = pulseGradient;
      ctx.fill();

      ringsRef.current.forEach((ring, ringIndex) => {
        if (!ring.aligned) {
          const diff = ring.targetAngle - ring.angle;
          const normalizedDiff = ((diff + Math.PI) % (2 * Math.PI)) - Math.PI;
          ring.angle += normalizedDiff * 0.02;
        }

        const isActive = ringIndex === activeRing && phase === "playing";

        ctx.beginPath();
        ctx.arc(centerX, centerY, ring.radius, 0, Math.PI * 2);
        ctx.strokeStyle = ring.aligned ? `${ring.color}88` : isActive ? `${ring.color}44` : `${ring.color}22`;
        ctx.lineWidth = ring.thickness;
        ctx.setLineDash(ring.aligned ? [] : [15, 10]);
        ctx.lineDashOffset = -pulsePhaseRef.current * 30;
        ctx.stroke();
        ctx.setLineDash([]);

        for (let i = 0; i < ring.nodes; i++) {
          const nodeAngle = ring.angle + (i / ring.nodes) * Math.PI * 2;
          const nx = centerX + Math.cos(nodeAngle) * ring.radius;
          const ny = centerY + Math.sin(nodeAngle) * ring.radius;

          const targetNodeAngle = ring.targetAngle + (i / ring.nodes) * Math.PI * 2;
          const tx = centerX + Math.cos(targetNodeAngle) * ring.radius;
          const ty = centerY + Math.sin(targetNodeAngle) * ring.radius;

          if (!ring.aligned) {
            ctx.beginPath();
            ctx.moveTo(nx, ny);
            ctx.lineTo(tx, ty);
            ctx.strokeStyle = `${ring.color}33`;
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.lineDashOffset = -pulsePhaseRef.current * 20;
            ctx.stroke();
            ctx.setLineDash([]);
          }

          const nodePulse = isActive && !ring.aligned ? Math.sin(pulsePhaseRef.current * 6) * 0.5 + 0.5 : 0;
          const nodeSize = ring.aligned ? 10 : 8 + nodePulse * 4;

          const nodeGradient = ctx.createRadialGradient(nx, ny, 0, nx, ny, nodeSize);
          nodeGradient.addColorStop(0, ring.aligned ? ring.color : isActive ? "#fff" : ring.color);
          nodeGradient.addColorStop(1, ring.aligned ? `${ring.color}00` : isActive ? `${ring.color}00` : `${ring.color}00`);
          ctx.beginPath();
          ctx.arc(nx, ny, nodeSize, 0, Math.PI * 2);
          ctx.fillStyle = nodeGradient;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(nx, ny, ring.aligned ? 8 : 6, 0, Math.PI * 2);
          ctx.fillStyle = ring.aligned ? ring.color : isActive ? "#fff" : ring.color;
          ctx.fill();
        }

        if (ring.aligned) {
          for (let i = 0; i < ring.nodes; i++) {
            const nodeAngle = ring.angle + (i / ring.nodes) * Math.PI * 2;
            const nx = centerX + Math.cos(nodeAngle) * ring.radius;
            const ny = centerY + Math.sin(nodeAngle) * ring.radius;

            if (Math.random() < 0.05) {
              particlesRef.current.push({
                x: nx,
                y: ny,
                vx: Math.cos(nodeAngle) * (Math.random() * 1 + 0.5),
                vy: Math.sin(nodeAngle) * (Math.random() * 1 + 0.5) - 0.5,
                size: Math.random() * 3 + 1,
                alpha: 0.6,
                life: 40,
                color: ring.color,
              });
            }
          }
        }
      });

      particlesRef.current.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.alpha = (p.life / 60) * 0.8;

        if (p.life <= 0) {
          particlesRef.current.splice(idx, 1);
          return;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${Math.floor(p.alpha * 255).toString(16).padStart(2, "0")}`;
        ctx.fill();
      });

      const coreRadius = 40;
      const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreRadius);
      coreGradient.addColorStop(0, "#63f5c2");
      coreGradient.addColorStop(0.5, "#63d8b0");
      coreGradient.addColorStop(1, "#0a1520");
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
      ctx.fillStyle = coreGradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(99, 245, 194, ${0.5 + Math.sin(pulsePhaseRef.current * 4) * 0.3})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      const allAligned = ringsRef.current.every((r) => r.aligned);
      if (allAligned) {
        const syncPulse = Math.sin(pulsePhaseRef.current * 8) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, coreRadius + 10 + syncPulse * 20, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(99, 245, 194, ${0.4 + syncPulse * 0.3})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isOpen, phase, activeRing]);

  const handleRotate = (direction: number) => {
    if (phase !== "playing") return;

    const ring = ringsRef.current[activeRing];
    if (!ring || ring.aligned) return;

    ring.targetAngle += direction * 0.4;
    soundEngine.playTone({ frequency: 400 + activeRing * 100, duration: 0.05, type: "sine", volume: 0.15 });

    const diff = ring.targetAngle - ring.angle;
    const normalizedDiff = ((diff + Math.PI) % (2 * Math.PI)) - Math.PI;

    if (Math.abs(normalizedDiff) < 0.08) {
      ring.aligned = true;
      ring.targetAngle = ring.angle;
      soundEngine.playSuccess();

      setProgress((p) => {
        const newProgress = Math.round((ringsRef.current.filter((r) => r.aligned).length / ringsRef.current.length) * 100);
        return newProgress;
      });

      const nextRing = ringsRef.current.findIndex((r, i) => i > activeRing && !r.aligned);
      if (nextRing !== -1) {
        setActiveRing(nextRing);
      } else if (ringsRef.current.every((r) => r.aligned)) {
        setPhase("complete");
        energyPulseRef.current = 0;
        soundEngine.playObjectiveComplete();

        const { x: centerX, y: centerY } = centerRef.current;
        for (let i = 0; i < 30; i++) {
          const angle = (i / 30) * Math.PI * 2;
          particlesRef.current.push({
            x: centerX,
            y: centerY,
            vx: Math.cos(angle) * (Math.random() * 4 + 2),
            vy: Math.sin(angle) * (Math.random() * 4 + 2),
            size: Math.random() * 5 + 2,
            alpha: 0.9,
            life: 80,
            color: ["#63d8b0", "#8a9cff", "#ffb86b", "#c896ff"][i % 4],
          });
        }

        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      }
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!isOpen || phase !== "playing") return;
      if (e.code === "ArrowLeft" || e.code === "KeyA") {
        handleRotate(-1);
      }
      if (e.code === "ArrowRight" || e.code === "KeyD") {
        handleRotate(1);
      }
      if (e.code === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, phase, onClose]);

  if (!isOpen) return null;

  return (
    <div className="minigame-overlay">
      <div className="minigame-modal">
        <div className="minigame-header">
          <div>
            <div className="minigame-title">CORE SYNCHRONIZATION // {locationName}</div>
            <div className="minigame-subtitle">ROTATE RINGS TO ALIGN NODES — RING {activeRing + 1}/4</div>
          </div>
          <button className="minigame-close" onClick={(e) => { e.stopPropagation(); onClose(); }}>×</button>
        </div>
        <div className="minigame-canvas-wrapper">
          <canvas ref={canvasRef} className="minigame-canvas" />
          <div className="progress-overlay">
            <div className="progress-ring">
              <svg viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="rgba(110, 125, 255, 0.15)"
                  strokeWidth="8"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="#63d8b0"
                  strokeWidth="8"
                  strokeDasharray="339"
                  strokeDashoffset={339 - (339 * progress) / 100}
                  strokeLinecap="round"
                  style={{ transform: "rotate(-90deg)", transformOrigin: "60px 60px", transition: "stroke-dashoffset 0.3s ease" }}
                />
              </svg>
              <div className="progress-text">
                <span className="progress-value">{progress}%</span>
                <span className="progress-label">SYNCHRONIZED</span>
              </div>
            </div>
          </div>
        </div>
        <div className="minigame-footer">
          <div className="controls-hint">
            <kbd>←</kbd><kbd>→</kbd> or <kbd>A</kbd><kbd>D</kbd> to rotate active ring
          </div>
          <div className="ring-status">
            {ringsRef.current.map((ring, i) => (
              <span key={i} className={`ring-indicator ${ring.aligned ? "aligned" : i === activeRing ? "active" : ""}`}>
                {i + 1}
              </span>
            ))}
          </div>
        </div>
      </div>
      <style jsx>{`
        .minigame-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(2, 4, 9, 0.9);
          backdrop-filter: blur(20px);
          animation: fadeIn 0.2s ease-out;
        }
        .minigame-modal {
          width: min(700px, 100%);
          max-height: 90vh;
          border: 1px solid rgba(99, 216, 176, 0.3);
          border-radius: 16px;
          background: linear-gradient(180deg, rgba(12, 17, 32, 0.98), rgba(5, 7, 13, 0.99));
          box-shadow: 0 30px 100px rgba(0, 0, 0, 0.5), inset 0 0 100px rgba(99, 216, 176, 0.03);
          overflow: hidden;
          animation: slideUp 0.3s ease-out;
        }
        .minigame-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          padding: 20px 24px;
          border-bottom: 1px solid rgba(99, 216, 176, 0.15);
        }
        .minigame-title {
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
          font-weight: 900;
          letter-spacing: 0.08em;
          color: #e6eaff;
        }
        .minigame-subtitle {
          margin-top: 4px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 7px;
          font-weight: 800;
          letter-spacing: 0.15em;
          color: #63d8b0;
        }
        .minigame-close {
          width: 36px;
          height: 36px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.02);
          color: #9da7c3;
          cursor: pointer;
          font-size: 22px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }
        .minigame-close:hover {
          background: rgba(255, 85, 111, 0.1);
          border-color: rgba(255, 85, 111, 0.3);
          color: #ff9aab;
        }
        .minigame-canvas-wrapper {
          position: relative;
          padding: 24px;
          min-height: 420px;
        }
        .minigame-canvas {
          width: 100%;
          height: 420px;
          display: block;
          border-radius: 8px;
          cursor: crosshair;
        }
        .progress-overlay {
          position: absolute;
          top: 24px;
          right: 24px;
        }
        .progress-ring {
          width: 120px;
          height: 120px;
        }
        .progress-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          pointer-events: none;
        }
        .progress-value {
          display: block;
          font-family: 'JetBrains Mono', monospace;
          font-size: 20px;
          font-weight: 900;
          color: #63f5c2;
          line-height: 1;
        }
        .progress-label {
          display: block;
          margin-top: 2px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 7px;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: #59627e;
        }
        .minigame-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px 20px;
          border-top: 1px solid rgba(99, 216, 176, 0.1);
          background: rgba(5, 7, 13, 0.5);
        }
        .controls-hint {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 7px;
          color: #59627e;
        }
        .controls-hint kbd {
          padding: 2px 6px;
          background: rgba(20, 25, 45, 0.8);
          border: 1px solid rgba(110, 125, 255, 0.2);
          border-radius: 4px;
          font-family: inherit;
          font-size: inherit;
          color: #8a9cff;
        }
        .ring-status {
          display: flex;
          gap: 8px;
        }
        .ring-indicator {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 900;
          background: rgba(20, 25, 45, 0.8);
          border: 1px solid rgba(80, 90, 120, 0.4);
          color: #59627e;
        }
        .ring-indicator.active {
          border-color: #ffb86b;
          color: #ffb86b;
          box-shadow: 0 0 10px rgba(255, 184, 107, 0.4);
          animation: pulse 1s ease-in-out infinite;
        }
        .ring-indicator.aligned {
          background: #63d8b0;
          border-color: #63d8b0;
          color: #05070d;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}