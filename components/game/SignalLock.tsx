"use client";

import { useEffect, useRef, useState } from "react";
import { soundEngine } from "./SoundEngine";

interface SignalLockProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onFailure: () => void;
  difficulty?: number;
  locationName: string;
}

export function SignalLock({ isOpen, onClose, onSuccess, onFailure, difficulty = 1, locationName }: SignalLockProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const markerRef = useRef(0);
  const directionRef = useRef(1);
  const locksRef = useRef(0);
  const targetZoneRef = useRef({ start: 40, end: 60 });
  const shakeRef = useRef(0);
  const flashRef = useRef(0);
  const modalShakeRef = useRef(0);
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number; life: number; color: string }>>([]);
  const [showResult, setShowResult] = useState<"success" | "failure" | null>(null);
  const [phase, setPhase] = useState<"playing" | "complete" | "failed">("playing");

  useEffect(() => {
    if (!isOpen) return;

    locksRef.current = 0;
    markerRef.current = 10;
    directionRef.current = 1;
    targetZoneRef.current = { start: 35 + difficulty * 5, end: 65 - difficulty * 5 };
    setPhase("playing");
    setShowResult(null);
    shakeRef.current = 0;
    flashRef.current = 0;
    soundEngine.playTerminal();
  }, [isOpen, difficulty]);

  useEffect(() => {
    if (!isOpen || phase !== "playing") return;

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

      ctx.fillStyle = "#03050a";
      ctx.fillRect(0, 0, width, height);

      const gridSize = 20;
      ctx.strokeStyle = "rgba(110, 125, 255, 0.06)";
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

      const scanY = (Date.now() * 0.05) % height;
      ctx.strokeStyle = "rgba(126, 145, 255, 0.15)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, scanY);
      ctx.lineTo(width, scanY);
      ctx.stroke();

      const meterY = height * 0.35;
      const meterHeight = 60;
      const meterX = width * 0.1;
      const meterWidth = width * 0.8;

      const modalShakeX = modalShakeRef.current > 0 ? (Math.random() - 0.5) * 15 : 0;
      const modalShakeY = modalShakeRef.current > 0 ? (Math.random() - 0.5) * 15 : 0;
      if (modalShakeRef.current > 0) modalShakeRef.current -= 1;

      const shakeX = shakeRef.current > 0 ? (Math.random() - 0.5) * 10 : 0;
      if (shakeRef.current > 0) shakeRef.current -= 1;

      ctx.save();
      ctx.translate(modalShakeX + shakeX, modalShakeY);

      const gradient = ctx.createLinearGradient(meterX, meterY, meterX + meterWidth, meterY);
      gradient.addColorStop(0, "rgba(10, 15, 30, 0.9)");
      gradient.addColorStop(0.5, "rgba(15, 20, 40, 0.95)");
      gradient.addColorStop(1, "rgba(10, 15, 30, 0.9)");

      ctx.fillStyle = gradient;
      ctx.fillRect(meterX, meterY, meterWidth, meterHeight);
      ctx.strokeStyle = "rgba(110, 125, 255, 0.3)";
      ctx.lineWidth = 2;
      ctx.strokeRect(meterX, meterY, meterWidth, meterHeight);

      const zoneStart = meterX + (targetZoneRef.current.start / 100) * meterWidth;
      const zoneWidth = ((targetZoneRef.current.end - targetZoneRef.current.start) / 100) * meterWidth;

      const zoneGradient = ctx.createLinearGradient(zoneStart, meterY, zoneStart + zoneWidth, meterY);
      zoneGradient.addColorStop(0, "rgba(99, 216, 176, 0.15)");
      zoneGradient.addColorStop(0.5, "rgba(99, 245, 194, 0.25)");
      zoneGradient.addColorStop(1, "rgba(99, 216, 176, 0.15)");

      ctx.fillStyle = zoneGradient;
      ctx.fillRect(zoneStart, meterY, zoneWidth, meterHeight);

      ctx.strokeStyle = "rgba(99, 216, 176, 0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(zoneStart, meterY);
      ctx.lineTo(zoneStart, meterY + meterHeight);
      ctx.moveTo(zoneStart + zoneWidth, meterY);

      // Render particles
      particlesRef.current.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
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

      for (let i = 0; i < 5; i++) {
        const x = meterX + (i / 4) * meterWidth;
        ctx.strokeStyle = `rgba(110, 125, 255, ${i === 0 || i === 4 ? 0.4 : 0.15})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x, meterY);
        ctx.lineTo(x, meterY + meterHeight);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      markerRef.current += directionRef.current * (1.5 + difficulty * 0.5);
      if (markerRef.current >= 95) {
        markerRef.current = 95;
        directionRef.current = -1;
      }
      if (markerRef.current <= 5) {
        markerRef.current = 5;
        directionRef.current = 1;
      }

      const markerX = meterX + (markerRef.current / 100) * meterWidth;

      ctx.fillStyle = flashRef.current > 0 ? "#ffffff" : "#eff2ff";
      if (flashRef.current > 0) flashRef.current -= 1;

      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 15;
      ctx.fillRect(markerX - 3, meterY + 5, 6, meterHeight - 10);
      ctx.shadowBlur = 0;

      ctx.restore();

      const lockY = meterY + meterHeight + 30;
      for (let i = 0; i < 3; i++) {
        const lx = meterX + (i / 2) * meterWidth + meterWidth / 4;
        const locked = i >= locksRef.current;
        ctx.beginPath();
        ctx.arc(lx, lockY, 14, 0, Math.PI * 2);
        ctx.fillStyle = locked ? "rgba(20, 25, 45, 0.8)" : "rgba(99, 216, 176, 0.2)";
        ctx.fill();
        ctx.strokeStyle = locked ? "rgba(80, 90, 120, 0.5)" : "#63d8b0";
        ctx.lineWidth = 2;
        ctx.stroke();

        if (!locked) {
          ctx.font = "bold 14px 'JetBrains Mono', monospace";
          ctx.fillStyle = "#63f5c2";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("✓", lx, lockY + 1);
        }
      }

      ctx.font = "bold 9px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#63d8b0";
      ctx.textAlign = "center";
      ctx.fillText(`SIGNAL ${String(locksRef.current + 1).padStart(2, "0")}/03`, width / 2, lockY + 35);

      const hintY = lockY + 55;
      ctx.font = "8px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#59627e";
      ctx.textAlign = "center";
      ctx.fillText("PRESS [SPACE] OR CLICK WHEN MARKER IS IN CYAN ZONE", width / 2, hintY);

      if (showResult) {
        ctx.fillStyle = showResult === "success" ? "rgba(99, 216, 176, 0.9)" : "rgba(255, 107, 107, 0.9)";
        ctx.fillRect(0, 0, width, height);

        ctx.font = "bold 28px 'JetBrains Mono', monospace";
        ctx.fillStyle = "#05070d";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(showResult === "success" ? "ACCESS GRANTED" : "SIGNAL LOST", width / 2, height / 2);

        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.fillStyle = "rgba(5, 7, 13, 0.7)";
        ctx.fillText(showResult === "success" ? "Terminal decrypted successfully" : "Alignment failed. Signal reset.", width / 2, height / 2 + 40);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isOpen, phase, showResult, difficulty]);

  const handleLock = () => {
    if (phase !== "playing") return;

    const inZone = markerRef.current >= targetZoneRef.current.start && markerRef.current <= targetZoneRef.current.end;
    const canvas = canvasRef.current;
    const width = canvas ? canvas.width / window.devicePixelRatio : 700;
    const height = canvas ? canvas.height / window.devicePixelRatio : 400;
    const meterY = height * 0.35;
    const meterHeight = 60;
    const meterX = width * 0.1;
    const meterWidth = width * 0.8;
    const markerX = meterX + (markerRef.current / 100) * meterWidth;
    const lockY = meterY + meterHeight + 30;

    if (inZone) {
      locksRef.current++;
      soundEngine.playSuccess();
      flashRef.current = 8;
      modalShakeRef.current = 8;

      for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        const speed = 2 + Math.random() * 3;
        particlesRef.current.push({
          x: markerX,
          y: meterY + meterHeight / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          size: 3 + Math.random() * 4,
          alpha: 1,
          life: 60,
          color: ["#63d8b0", "#63f5c2", "#ffb86b", "#ffffff"][Math.floor(Math.random() * 4)],
        });
      }

      if (locksRef.current >= 3) {
        setPhase("complete");
        setShowResult("success");
        soundEngine.playObjectiveComplete();
        modalShakeRef.current = 20;

        for (let i = 0; i < 50; i++) {
          const angle = (i / 50) * Math.PI * 2;
          particlesRef.current.push({
            x: width / 2,
            y: height / 2,
            vx: Math.cos(angle) * (3 + Math.random() * 4),
            vy: Math.sin(angle) * (3 + Math.random() * 4) - 3,
            size: 4 + Math.random() * 5,
            alpha: 1,
            life: 90,
            color: ["#63d8b0", "#63f5c2", "#ffb86b", "#c896ff", "#8a9cff"][Math.floor(Math.random() * 5)],
          });
        }

        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        targetZoneRef.current = {
          start: Math.max(20, targetZoneRef.current.start - 5),
          end: Math.min(80, targetZoneRef.current.end + 5),
        };
      }
    } else {
      locksRef.current = 0;
      soundEngine.playFailure();
      shakeRef.current = 20;
      modalShakeRef.current = 25;

      for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        particlesRef.current.push({
          x: markerX,
          y: meterY + meterHeight / 2,
          vx: Math.cos(angle) * (2 + Math.random() * 4),
          vy: Math.sin(angle) * (2 + Math.random() * 4),
          size: 2 + Math.random() * 3,
          alpha: 1,
          life: 40,
          color: ["#ff6b6b", "#ff6b9d", "#ff8844"][Math.floor(Math.random() * 3)],
        });
      }

      targetZoneRef.current = { start: 35 + difficulty * 5, end: 65 - difficulty * 5 };
      setShowResult("failure");
      setPhase("failed");
      setTimeout(() => {
        setShowResult(null);
        setPhase("playing");
      }, 1000);
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!isOpen || phase !== "playing") return;
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        handleLock();
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
    <div className="minigame-overlay" onClick={handleLock}>
      <div className="minigame-modal">
        <div className="minigame-header">
          <div>
            <div className="minigame-title">MANUAL INTERFACE // {locationName}</div>
            <div className="minigame-subtitle">SIGNAL LOCK PROTOCOL</div>
          </div>
          <button className="minigame-close" onClick={(e) => { e.stopPropagation(); onClose(); }}>×</button>
        </div>
        <div className="minigame-canvas-wrapper">
          <canvas ref={canvasRef} className="minigame-canvas" />
        </div>
        <div className="minigame-footer">
          <div className="lock-status">LOCKS SECURED: <strong>{locksRef.current}/3</strong></div>
          <div className="target-window">TARGET WINDOW: <strong>{targetZoneRef.current.start}–{targetZoneRef.current.end}</strong></div>
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
          border: 1px solid rgba(110, 125, 255, 0.3);
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
          border-bottom: 1px solid rgba(110, 125, 255, 0.15);
        }
        .minigame-title {
          font-family: 'JetBrains Mono', monospace;
          font-size: 16px;
          font-weight: 900;
          letter-spacing: 0.08em;
          color: #e6eaff;
        }
        .minigame-subtitle {
          margin-top: 4px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 8px;
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
          padding: 24px;
          min-height: 320px;
        }
        .minigame-canvas {
          width: 100%;
          height: 320px;
          display: block;
          border-radius: 8px;
          cursor: crosshair;
        }
        .minigame-footer {
          display: flex;
          justify-content: space-between;
          padding: 16px 24px 20px;
          border-top: 1px solid rgba(110, 125, 255, 0.1);
          background: rgba(5, 7, 13, 0.5);
        }
        .lock-status, .target-window {
          font-family: 'JetBrains Mono', monospace;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: #66718f;
        }
        .lock-status strong, .target-window strong {
          color: #8d99ff;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}