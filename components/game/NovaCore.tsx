"use client";

import { useEffect, useRef, useState } from "react";
import { NovaState, Memory } from "./types";

const STATE_COLORS: Record<NovaState, { primary: string; secondary: string; glow: string; glowRgb: [number, number, number] }> = {
  calm: { primary: "#63d8b0", secondary: "#8a9cff", glow: "rgba(99, 216, 176, 0.4)", glowRgb: [99, 216, 176] },
  curious: { primary: "#ffb86b", secondary: "#c896ff", glow: "rgba(255, 184, 107, 0.4)", glowRgb: [255, 184, 107] },
  alert: { primary: "#ff6b6b", secondary: "#ffb86b", glow: "rgba(255, 107, 107, 0.5)", glowRgb: [255, 107, 107] },
  afraid: { primary: "#ff6b9d", secondary: "#ff6b6b", glow: "rgba(255, 107, 157, 0.5)", glowRgb: [255, 107, 157] },
  trusting: { primary: "#63f5c2", secondary: "#63d8b0", glow: "rgba(99, 245, 194, 0.5)", glowRgb: [99, 245, 194] },
  corrupted: { primary: "#c896ff", secondary: "#ff6b6b", glow: "rgba(200, 150, 255, 0.5)", glowRgb: [200, 150, 255] },
};

interface NovaCoreProps {
  state: NovaState;
  isSpeaking: boolean;
  isProcessing: boolean;
  trust: number;
  fear: number;
  className?: string;
}

export function NovaCore({ state, isSpeaking, isProcessing, trust, fear, className = "" }: NovaCoreProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const waveformRef = useRef<number[]>(Array(64).fill(0));
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
      maxLife: number;
      color: string;
    }>
  >([]);
  const prevTrustRef = useRef(trust);
  const prevFearRef = useRef(fear);
  const reactionRef = useRef(0);

  const colors = STATE_COLORS[state];

  useEffect(() => {
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

      ctx.clearRect(0, 0, width, height);

      const trustChange = trust - prevTrustRef.current;
      const fearChange = fear - prevFearRef.current;
      if (Math.abs(trustChange) > 0.5 || Math.abs(fearChange) > 0.5) {
        reactionRef.current = 1;
        prevTrustRef.current = trust;
        prevFearRef.current = fear;
      }
      if (reactionRef.current > 0) {
        reactionRef.current -= 0.015;
      }

      pulsePhaseRef.current += isSpeaking ? 0.08 : isProcessing ? 0.05 : 0.02;

      const baseRadius = Math.min(width, height) * 0.35;
      const pulseAmount = isSpeaking ? 15 : isProcessing ? 8 : 3;
      const radius = baseRadius + Math.sin(pulsePhaseRef.current * 2) * pulseAmount;

      for (let i = 5; i > 0; i--) {
        const r = radius + i * 12 + Math.sin(pulsePhaseRef.current + i) * 4;
        const alpha = 0.03 * (1 - i * 0.15);
        const gradient = ctx.createRadialGradient(centerX, centerY, r * 0.5, centerX, centerY, r);
        const glowAlpha = Math.floor(alpha * 255 * 3) / 255;
        gradient.addColorStop(0, `rgba(${colors.glowRgb.join(",")}, ${glowAlpha})`);
        gradient.addColorStop(1, `${colors.primary}00`);
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      const ringCount = isSpeaking ? 4 : isProcessing ? 3 : 2;
      for (let i = 0; i < ringCount; i++) {
        const ringRadius = radius + 20 + i * 18 + Math.sin(pulsePhaseRef.current * (0.5 + i * 0.2)) * 6;
        const rotation = pulsePhaseRef.current * (0.3 + i * 0.1) * (i % 2 === 0 ? 1 : -1);

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(rotation);

        for (let seg = 0; seg < 12; seg++) {
          const angle = (seg / 12) * Math.PI * 2;
          const segLength = isSpeaking ? 0.4 : isProcessing ? 0.3 : 0.15;
          const alpha = 0.3 + Math.sin(pulsePhaseRef.current * 4 + seg) * 0.2;
          ctx.beginPath();
          ctx.arc(0, 0, ringRadius, angle, angle + segLength);
          ctx.strokeStyle = `${colors.primary}${Math.floor(alpha * 255).toString(16).padStart(2, "0")}`;
          ctx.lineWidth = 2;
          ctx.lineCap = "round";
          ctx.stroke();
        }

        ctx.restore();
      }

      const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      coreGradient.addColorStop(0, `${colors.primary}ff`);
      coreGradient.addColorStop(0.4, `${colors.primary}cc`);
      coreGradient.addColorStop(0.7, `${colors.secondary}88`);
      coreGradient.addColorStop(1, "#05070d");

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = coreGradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `${colors.primary}88`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (isSpeaking) {
        const barCount = 32;
        const barWidth = (radius * 1.8) / barCount;
        const maxHeight = radius * 0.8;

        for (let i = 0; i < barCount; i++) {
          const waveValue = waveformRef.current[i] || 0;
          const barHeight = maxHeight * waveValue;
          const x = centerX - radius * 0.9 + i * barWidth;
          const y = centerY;

          const barGradient = ctx.createLinearGradient(x, y - barHeight, x, y + barHeight);
          barGradient.addColorStop(0, colors.primary);
          barGradient.addColorStop(0.5, colors.secondary);
          barGradient.addColorStop(1, colors.primary);

          ctx.fillStyle = barGradient;
          ctx.fillRect(x, y - barHeight / 2, barWidth * 0.7, barHeight);
        }

        waveformRef.current = waveformRef.current.map((v, i) => {
          const target = 0.3 + Math.random() * 0.7;
          return v + (target - v) * 0.3;
        });
      } else {
        waveformRef.current = waveformRef.current.map((v) => v * 0.9);
      }

      if (state === "alert" || state === "afraid" || state === "corrupted") {
        const glitchCount = state === "corrupted" ? 6 : 3;
        for (let i = 0; i < glitchCount; i++) {
          if (Math.random() < 0.02) {
            const gx = centerX + (Math.random() - 0.5) * radius * 2;
            const gy = centerY + (Math.random() - 0.5) * radius * 2;
            const gr = Math.random() * 20 + 5;
            ctx.beginPath();
            ctx.arc(gx, gy, gr, 0, Math.PI * 2);
            ctx.fillStyle = `${colors.primary}${Math.floor(Math.random() * 100 + 50).toString(16).padStart(2, "0")}`;
            ctx.fill();
          }
        }
      }

      particlesRef.current.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.alpha = (p.life / p.maxLife) * 0.6;

        if (p.life <= 0) {
          particlesRef.current.splice(idx, 1);
          return;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${Math.floor(p.alpha * 255).toString(16).padStart(2, "0")}`;
        ctx.fill();
      });

      if (isSpeaking && Math.random() < 0.3) {
        const angle = Math.random() * Math.PI * 2;
        const dist = radius * (0.8 + Math.random() * 0.4);
        particlesRef.current.push({
          x: centerX + Math.cos(angle) * dist,
          y: centerY + Math.sin(angle) * dist,
          vx: Math.cos(angle) * (Math.random() * 0.5 + 0.2),
          vy: Math.sin(angle) * (Math.random() * 0.5 + 0.2),
          size: Math.random() * 2 + 1,
          alpha: 0.6,
          life: 30,
          maxLife: 30,
          color: Math.random() > 0.5 ? colors.primary : colors.secondary,
        });
      }

      if (trust > 70 && Math.random() < 0.02) {
        const angle = Math.random() * Math.PI * 2;
        const dist = radius * 1.2;
        particlesRef.current.push({
          x: centerX + Math.cos(angle) * dist,
          y: centerY + Math.sin(angle) * dist,
          vx: -Math.cos(angle) * 0.3,
          vy: -Math.sin(angle) * 0.3 - 0.5,
          size: Math.random() * 3 + 2,
          alpha: 0.8,
          life: 60,
          maxLife: 60,
          color: "#63f5c2",
        });
      }

      if (fear > 50 && Math.random() < 0.015) {
        const angle = Math.random() * Math.PI * 2;
        const dist = radius * 1.1;
        particlesRef.current.push({
          x: centerX + Math.cos(angle) * dist,
          y: centerY + Math.sin(angle) * dist,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          size: Math.random() * 2 + 1,
          alpha: 0.7,
          life: 40,
          maxLife: 40,
          color: "#ff6b6b",
        });
      }

      if (reactionRef.current > 0) {
        const reactionIntensity = reactionRef.current;
        for (let r = 0; r < 3; r++) {
          const ringProgress = 1 - reactionIntensity + r * 0.1;
          if (ringProgress > 0 && ringProgress < 1) {
            const ringRadius = radius * (1.2 + ringProgress * 0.5);
            const alpha = (1 - ringProgress) * 0.6;
            ctx.beginPath();
            ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
            const reactionColor = trustChange > 0 ? colors.primary : colors.secondary;
            ctx.strokeStyle = `${reactionColor}${Math.floor(alpha * 255).toString(16).padStart(2, "0")}`;
            ctx.lineWidth = 3;
            ctx.stroke();
          }
        }

        if (reactionIntensity > 0.3) {
          for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const dist = radius * (1.3 + (1 - reactionIntensity) * 0.5);
            const px = centerX + Math.cos(angle) * dist;
            const py = centerY + Math.sin(angle) * dist;
            ctx.beginPath();
            ctx.arc(px, py, 4 * reactionIntensity, 0, Math.PI * 2);
            const reactionColor = trustChange > 0 ? colors.primary : colors.secondary;
            ctx.fillStyle = `${reactionColor}${Math.floor(reactionIntensity * 255).toString(16).padStart(2, "0")}`;
            ctx.fill();
          }
        }

        if (reactionIntensity > 0.7) {
          for (let i = 0; i < 8; i++) {
            particlesRef.current.push({
              x: centerX,
              y: centerY,
              vx: Math.cos((i / 8) * Math.PI * 2) * (2 + Math.random() * 2),
              vy: Math.sin((i / 8) * Math.PI * 2) * (2 + Math.random() * 2) - 1,
              size: 3 + Math.random() * 3,
              alpha: 1,
              life: 50,
              maxLife: 50,
              color: trustChange > 0 ? colors.primary : colors.secondary,
            });
          }
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [state, isSpeaking, isProcessing, trust, fear]);

  return (
    <div className={`nova-core ${className}`}>
      <canvas ref={canvasRef} className="nova-canvas" aria-label="NOVA core visualization" />
      <div className="nova-status">
        <span className={`status-indicator ${state}`} />
        <span className="status-label">{state.toUpperCase()}</span>
        <span className="status-link">LINK {Math.floor(95 + Math.random() * 5)}%</span>
      </div>
      <style jsx>{`
        .nova-core {
          position: relative;
          width: 100%;
          aspect-ratio: 1;
          max-width: 280px;
          margin: 0 auto;
          padding-bottom: 50px;
        }
        .nova-canvas {
          width: 100%;
          height: 100%;
          display: block;
        }
        .nova-status {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 10px;
          white-space: nowrap;
        }
        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse 1.5s ease-in-out infinite;
        }
        .status-indicator.calm { background: #63d8b0; box-shadow: 0 0 10px #63d8b0; }
        .status-indicator.curious { background: #ffb86b; box-shadow: 0 0 10px #ffb86b; }
        .status-indicator.alert { background: #ff6b6b; box-shadow: 0 0 10px #ff6b6b; animation: pulse 0.5s ease-in-out infinite; }
        .status-indicator.afraid { background: #ff6b9d; box-shadow: 0 0 10px #ff6b9d; animation: pulse 0.8s ease-in-out infinite; }
        .status-indicator.trusting { background: #63f5c2; box-shadow: 0 0 10px #63f5c2; }
        .status-indicator.corrupted { background: #c896ff; box-shadow: 0 0 10px #c896ff; animation: pulse 0.6s ease-in-out infinite; }
        .status-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.15em;
          color: #8a9cff;
          text-transform: uppercase;
        }
        .status-link {
          font-family: 'JetBrains Mono', monospace;
          font-size: 7px;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: #59627e;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}

interface NovaStateDisplayProps {
  memory: Memory | null;
  isSpeaking: boolean;
  isProcessing: boolean;
}

export function NovaStateDisplay({ memory, isSpeaking, isProcessing }: NovaStateDisplayProps) {
  const trust = memory?.trust ?? 50;
  const fear = memory?.fear ?? 0;
  const curiosity = memory?.curiosity ?? 50;

  let state: NovaState = "calm";
  if (fear > 60) state = "afraid";
  else if (fear > 30) state = "alert";
  else if (trust > 75) state = "trusting";
  else if (curiosity > 75) state = "curious";
  else if (memory?.storyPath === "escape" && fear > 20) state = "alert";

  return (
    <div className="nova-state-display">
      <NovaCore state={state} isSpeaking={isSpeaking} isProcessing={isProcessing} trust={trust} fear={fear} />
      <div className="state-metrics">
        <div className="metric">
          <span className="metric-label">TRUST</span>
          <div className="metric-bar"><div className="metric-fill" style={{ width: `${trust}%`, background: "linear-gradient(90deg, #63d8b0, #63f5c2)" }} /></div>
          <span className="metric-value">{trust}</span>
        </div>
        <div className="metric">
          <span className="metric-label">CURIOSITY</span>
          <div className="metric-bar"><div className="metric-fill" style={{ width: `${curiosity}%`, background: "linear-gradient(90deg, #ffb86b, #c896ff)" }} /></div>
          <span className="metric-value">{curiosity}</span>
        </div>
        <div className="metric">
          <span className="metric-label">FEAR</span>
          <div className="metric-bar"><div className="metric-fill" style={{ width: `${fear}%`, background: "linear-gradient(90deg, #ff6b9d, #ff6b6b)" }} /></div>
          <span className="metric-value">{fear}</span>
        </div>
      </div>
      <style jsx>{`
        .nova-state-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }
        .state-metrics {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
          max-width: 280px;
        }
        .metric {
          display: grid;
          grid-template-columns: 60px 1fr 30px;
          align-items: center;
          gap: 10px;
        }
        .metric-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.1em;
          color: #59627e;
        }
        .metric-bar {
          height: 4px;
          background: rgba(20, 25, 45, 0.8);
          border-radius: 2px;
          overflow: hidden;
        }
        .metric-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.5s ease-out;
        }
        .metric-value {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 800;
          color: #a4adff;
          text-align: right;
        }
      `}</style>
    </div>
  );
}