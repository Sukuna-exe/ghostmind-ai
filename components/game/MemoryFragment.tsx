"use client";

import { useEffect, useRef, useState } from "react";
import { soundEngine } from "./SoundEngine";

const SYMBOLS = ["◆", "▲", "●", "■", "⬢", "⬡", "◈", "◇"];

interface MemoryFragmentProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onFailure: () => void;
  difficulty?: number;
  locationName: string;
}

export function MemoryFragment({ isOpen, onClose, onSuccess, onFailure, difficulty = 1, locationName }: MemoryFragmentProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const [phase, setPhase] = useState<"showing" | "input" | "result" | "complete">("showing");
  const [sequence, setSequence] = useState<string[]>([]);
  const [playerInput, setPlayerInput] = useState<string[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [totalRounds] = useState(3 + difficulty);
  const [showResult, setShowResult] = useState<"success" | "failure" | null>(null);
  const [revealedIndex, setRevealedIndex] = useState(-1);
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

  useEffect(() => {
    if (!isOpen) return;

    const newSequence = Array.from({ length: 3 + currentRound }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
    setSequence(newSequence);
    setPlayerInput([]);
    setCurrentRound(1);
    setPhase("showing");
    setShowResult(null);
    setRevealedIndex(-1);
    particlesRef.current = [];
    soundEngine.playTerminal();

    let index = 0;
    const showInterval = setInterval(() => {
      setRevealedIndex(index);
      soundEngine.playTone({ frequency: 500 + index * 100, duration: 0.2, type: "sine", volume: 0.3 });
      index++;
      if (index >= newSequence.length) {
        clearInterval(showInterval);
        setTimeout(() => {
          setPhase("input");
          setRevealedIndex(-1);
        }, 800);
      }
    }, 900);

    return () => clearInterval(showInterval);
  }, [isOpen, currentRound, difficulty]);

  useEffect(() => {
    if (!isOpen || phase !== "showing" && phase !== "input") return;

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

      const gridSize = 30;
      ctx.strokeStyle = "rgba(110, 125, 255, 0.04)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      pulsePhaseRef.current += 0.02;

      for (let i = 0; i < 3; i++) {
        const y = height * 0.2 + i * height * 0.2 + Math.sin(pulsePhaseRef.current + i) * 10;
        const alpha = 0.02 + Math.sin(pulsePhaseRef.current * 0.5 + i) * 0.01;
        ctx.strokeStyle = `rgba(200, 150, 255, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      particlesRef.current.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.02;
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

      const centerX = width / 2;
      const symbolSize = 70;
      const spacing = 100;
      const startX = centerX - ((sequence.length - 1) * spacing) / 2;

      if (phase === "showing") {
        sequence.forEach((symbol, i) => {
          const x = startX + i * spacing;
          const y = height / 2;

          const isRevealed = i === revealedIndex;
          const isPast = i < revealedIndex;

          if (isRevealed) {
            const pulse = Math.sin(pulsePhaseRef.current * 8) * 0.3 + 0.7;
            const glowRadius = symbolSize * 1.5 * pulse;

            const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
            gradient.addColorStop(0, `rgba(255, 184, 107, ${0.4 * pulse})`);
            gradient.addColorStop(1, "rgba(255, 184, 107, 0)");
            ctx.beginPath();
            ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();

            for (let r = 0; r < 3; r++) {
              ctx.beginPath();
              ctx.arc(x, y, symbolSize * 0.8 + r * 15 + pulsePhaseRef.current * 20, 0, Math.PI * 2);
              ctx.strokeStyle = `rgba(255, 184, 107, ${0.2 - r * 0.05})`;
              ctx.lineWidth = 2;
              ctx.stroke();
            }
          }

          ctx.font = `bold ${symbolSize}px 'JetBrains Mono', monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          if (isRevealed) {
            ctx.shadowColor = "#ffb86b";
            ctx.shadowBlur = 30;
            ctx.fillStyle = "#fff";
          } else if (isPast) {
            ctx.fillStyle = "rgba(200, 150, 255, 0.4)";
          } else {
            ctx.fillStyle = "rgba(80, 90, 120, 0.2)";
          }

          ctx.fillText(symbol, x, y);
          ctx.shadowBlur = 0;
        });

        ctx.font = "bold 10px 'JetBrains Mono', monospace";
        ctx.fillStyle = "#c896ff";
        ctx.textAlign = "center";
        ctx.fillText(`MEMORIZING SEQUENCE ${currentRound}/${totalRounds}`, centerX, height * 0.85);
      } else if (phase === "input") {
        sequence.forEach((symbol, i) => {
          const x = startX + i * spacing;
          const y = height * 0.25;

          const filled = i < playerInput.length;
          const current = i === playerInput.length;

          ctx.beginPath();
          ctx.arc(x, y, symbolSize * 0.7, 0, Math.PI * 2);
          ctx.fillStyle = filled ? "rgba(200, 150, 255, 0.15)" : "rgba(15, 20, 35, 0.8)";
          ctx.fill();
          ctx.strokeStyle = current ? "#ffb86b" : filled ? "#c896ff" : "rgba(80, 90, 120, 0.3)";
          ctx.lineWidth = current ? 3 : 2;
          ctx.stroke();

          if (filled) {
            ctx.font = `bold ${symbolSize * 0.9}px 'JetBrains Mono', monospace`;
            ctx.fillStyle = "#c896ff";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(playerInput[i], x, y);
          } else if (current) {
            const pulse = Math.sin(pulsePhaseRef.current * 4) * 0.5 + 0.5;
            ctx.font = `bold ${symbolSize * 0.9}px 'JetBrains Mono', monospace`;
            ctx.fillStyle = `rgba(255, 184, 107, ${pulse})`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("_", x, y + 4);
          }
        });

        const optionY = height * 0.55;
        const optionSpacing = 70;
        const optionStartX = centerX - ((SYMBOLS.length - 1) * optionSpacing) / 2;

        SYMBOLS.forEach((symbol, i) => {
          const x = optionStartX + i * optionSpacing;
          const selected = playerInput.length < sequence.length && false;

          ctx.beginPath();
          ctx.arc(x, optionY, 40, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(15, 20, 35, 0.9)";
          ctx.fill();
          ctx.strokeStyle = "rgba(200, 150, 255, 0.3)";
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.font = "bold 40px 'JetBrains Mono', monospace";
          ctx.fillStyle = "#a4adff";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(symbol, x, optionY);
        });

        ctx.font = "9px 'JetBrains Mono', monospace";
        ctx.fillStyle = "#59627e";
        ctx.textAlign = "center";
        ctx.fillText("SELECT SYMBOLS IN ORDER — CLICK OR PRESS 1-8", centerX, height * 0.85);
      } else if (phase === "result") {
        const y = height / 2;
        const isSuccess = showResult === "success";

        if (isSuccess) {
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const dist = 100 + Math.sin(pulsePhaseRef.current * 3 + i) * 30;
            const x = centerX + Math.cos(angle) * dist;
            const py = y + Math.sin(angle) * dist * 0.5;

            ctx.beginPath();
            ctx.arc(x, py, 8, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(200, 150, 255, ${0.6 + Math.sin(pulsePhaseRef.current * 4 + i) * 0.3})`;
            ctx.fill();
          }
        }

        ctx.font = `bold ${isSuccess ? 32 : 28}px 'JetBrains Mono', monospace`;
        ctx.fillStyle = isSuccess ? "#c896ff" : "#ff6b6b";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = isSuccess ? "#c896ff" : "#ff6b6b";
        ctx.shadowBlur = 30;
        ctx.fillText(isSuccess ? "MEMORY FRAGMENT RESTORED" : "ARCHIVE CORRUPTION", centerX, y);
        ctx.shadowBlur = 0;

        if (currentRound < totalRounds) {
          ctx.font = "10px 'JetBrains Mono', monospace";
          ctx.fillStyle = "rgba(200, 150, 255, 0.7)";
          ctx.fillText(isSuccess ? `Round ${currentRound + 1} initializing...` : `Retrying round ${currentRound}...`, centerX, y + 60);
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [phase, sequence, playerInput, currentRound, totalRounds, showResult, revealedIndex]);

  const handleSymbolSelect = (symbol: string) => {
    if (phase !== "input" || playerInput.length >= sequence.length) return;

    soundEngine.playClick();
    setPlayerInput((prev) => [...prev, symbol]);

    if (playerInput.length + 1 === sequence.length) {
      setTimeout(() => checkResult(), 300);
    }
  };

  const checkResult = () => {
    const correct = playerInput.every((s, i) => s === sequence[i]);

    if (correct) {
      soundEngine.playSuccess();
      setShowResult("success");
      setPhase("result");

      for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        particlesRef.current.push({
          x: canvasRef.current?.width ? canvasRef.current.width / 2 / window.devicePixelRatio : 200,
          y: canvasRef.current?.height ? canvasRef.current.height / 2 / window.devicePixelRatio : 200,
          vx: Math.cos(angle) * (Math.random() * 3 + 1),
          vy: Math.sin(angle) * (Math.random() * 3 + 1) - 2,
          size: Math.random() * 4 + 2,
          alpha: 0.8,
          life: 60,
          color: "#c896ff",
        });
      }

      if (currentRound < totalRounds) {
        setTimeout(() => {
          setCurrentRound((r) => r + 1);
        }, 1500);
      } else {
        setTimeout(() => {
          setPhase("complete");
          onSuccess();
          onClose();
        }, 1500);
      }
    } else {
      soundEngine.playFailure();
      setShowResult("failure");
      setPhase("result");

      for (let i = 0; i < 10; i++) {
        particlesRef.current.push({
          x: canvasRef.current?.width ? canvasRef.current.width / 2 / window.devicePixelRatio : 200,
          y: canvasRef.current?.height ? canvasRef.current.height / 2 / window.devicePixelRatio : 200,
          vx: (Math.random() - 0.5) * 5,
          vy: (Math.random() - 0.5) * 5,
          size: Math.random() * 3 + 1,
          alpha: 0.8,
          life: 40,
          color: "#ff6b6b",
        });
      }

      setTimeout(() => {
        setPlayerInput([]);
        setShowResult(null);
        setPhase("showing");
      }, 1500);
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!isOpen || phase !== "input") return;
      const num = parseInt(e.key);
      if (num >= 1 && num <= 8) {
        handleSymbolSelect(SYMBOLS[num - 1]);
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
    <div className="minigame-overlay" onClick={() => {}}>
      <div className="minigame-modal">
        <div className="minigame-header">
          <div>
            <div className="minigame-title">MEMORY RECONSTRUCTION // {locationName}</div>
            <div className="minigame-subtitle">PATTERN RECOVERY PROTOCOL — ROUND {currentRound}/{totalRounds}</div>
          </div>
          <button className="minigame-close" onClick={(e) => { e.stopPropagation(); onClose(); }}>×</button>
        </div>
        <div className="minigame-canvas-wrapper">
          <canvas ref={canvasRef} className="minigame-canvas" />
        </div>
        <div className="minigame-footer">
          <div className="round-progress">
            {Array.from({ length: totalRounds }, (_, i) => (
              <span key={i} className={`round-dot ${i < currentRound - 1 ? "complete" : i === currentRound - 1 ? "current" : ""}`} />
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
          border: 1px solid rgba(200, 150, 255, 0.3);
          border-radius: 16px;
          background: linear-gradient(180deg, rgba(12, 17, 32, 0.98), rgba(5, 7, 13, 0.99));
          box-shadow: 0 30px 100px rgba(0, 0, 0, 0.5), inset 0 0 100px rgba(200, 150, 255, 0.03);
          overflow: hidden;
          animation: slideUp 0.3s ease-out;
        }
        .minigame-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          padding: 20px 24px;
          border-bottom: 1px solid rgba(200, 150, 255, 0.15);
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
          color: #c896ff;
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
          min-height: 380px;
        }
        .minigame-canvas {
          width: 100%;
          height: 380px;
          display: block;
          border-radius: 8px;
          cursor: crosshair;
        }
        .minigame-footer {
          display: flex;
          justify-content: center;
          padding: 16px 24px 20px;
          border-top: 1px solid rgba(200, 150, 255, 0.1);
          background: rgba(5, 7, 13, 0.5);
        }
        .round-progress {
          display: flex;
          gap: 8px;
        }
        .round-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: rgba(80, 90, 120, 0.3);
          border: 1px solid rgba(80, 90, 120, 0.5);
        }
        .round-dot.complete {
          background: #c896ff;
          border-color: #c896ff;
          box-shadow: 0 0 10px #c896ff;
        }
        .round-dot.current {
          background: #ffb86b;
          border-color: #ffb86b;
          box-shadow: 0 0 10px #ffb86b;
          animation: pulse 1s ease-in-out infinite;
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
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}