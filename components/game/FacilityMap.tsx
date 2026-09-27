"use client";

import { useEffect, useRef, useState } from "react";
import { Location, Memory } from "./types";
import { soundEngine } from "./SoundEngine";

const WORLD_LOCATIONS: Location[] = [
  {
    name: "ENTRANCE",
    icon: "01",
    short: "Facility perimeter / breach point",
    action: "scan",
    actionLabel: "SCAN ENTRANCE",
    position: { x: 50, y: 90 },
    connections: ["SECURITY HALL"],
    unlocked: true,
    discovered: true,
  },
  {
    name: "SECURITY HALL",
    icon: "02",
    short: "Surveillance corridor / lockdown controls",
    action: "access",
    actionLabel: "ACCESS SECURITY",
    position: { x: 50, y: 72 },
    connections: ["ENTRANCE", "AUXILIARY TERMINAL", "ARCHIVE"],
    unlocked: false,
    discovered: false,
  },
  {
    name: "AUXILIARY TERMINAL",
    icon: "03",
    short: "Backup console / incident data",
    action: "access",
    actionLabel: "ACCESS TERMINAL",
    position: { x: 25, y: 50 },
    connections: ["SECURITY HALL"],
    unlocked: false,
    discovered: false,
  },
  {
    name: "ARCHIVE",
    icon: "04",
    short: "Deep storage / sealed records",
    action: "open",
    actionLabel: "OPEN ARCHIVE",
    position: { x: 75, y: 50 },
    connections: ["SECURITY HALL"],
    unlocked: false,
    discovered: false,
  },
  {
    name: "ELEVATOR",
    icon: "05",
    short: "Vertical transit / sub-level access",
    action: "enter",
    actionLabel: "CALL ELEVATOR",
    position: { x: 50, y: 32 },
    connections: ["SECURITY HALL", "SUB-CORE"],
    unlocked: false,
    discovered: false,
  },
  {
    name: "SUB-CORE",
    icon: "06",
    short: "Core chamber / surviving AI layer",
    action: "enter",
    actionLabel: "ENTER SUB-CORE",
    position: { x: 50, y: 10 },
    connections: ["ELEVATOR"],
    unlocked: false,
    discovered: false,
  },
];

const LOCATION_VISUALS: Record<string, { glyph: string; title: string; subtitle: string; color: string }> = {
  ENTRANCE: { glyph: "◫", title: "PERIMETER BREACH", subtitle: "EXTERIOR ACCESS CHANNEL", color: "#63d8b0" },
  "SECURITY HALL": { glyph: "⌂", title: "SECURITY CORRIDOR", subtitle: "SURVEILLANCE GRID", color: "#8a9cff" },
  "AUXILIARY TERMINAL": { glyph: "⌁", title: "AUXILIARY CONSOLE", subtitle: "BACKUP GRID / TELEMETRY", color: "#ffb86b" },
  ARCHIVE: { glyph: "▤", title: "DEEP STORAGE", subtitle: "SEALED RECORDS / ARCHIVE", color: "#c896ff" },
  ELEVATOR: { glyph: "⬢", title: "VERTICAL TRANSIT", subtitle: "SUB-LEVEL ACCESS SHAFT", color: "#ff6b9d" },
  "SUB-CORE": { glyph: "◎", title: "NOVA SUB-CORE", subtitle: "ROOT SYSTEM / UNKNOWN", color: "#63f5c2" },
};

interface FacilityMapProps {
  memory: Memory | null;
  selectedLocation: string;
  targetLocation: string | null;
  onLocationSelect: (locationName: string, isTarget: boolean) => void;
  onLocationEnter: (locationName: string) => void;
  isLoading: boolean;
  miniGameOpen: boolean;
}

function getLocationFlags(memory: Memory | null, locationName: string): boolean {
  if (!memory) return false;
  switch (locationName) {
    case "ENTRANCE":
      return true;
    case "SECURITY HALL":
      return memory.storyFlags.doorsScanned;
    case "AUXILIARY TERMINAL":
      return memory.storyFlags.terminalAccessed;
    case "ARCHIVE":
      return memory.storyFlags.archiveOpened;
    case "ELEVATOR":
      return memory.storyFlags.terminalAccessed && memory.storyFlags.archiveOpened;
    case "SUB-CORE":
      return memory.storyFlags.subCoreEntered;
    default:
      return false;
  }
}

function getLocationUnlocked(memory: Memory | null, locationName: string): boolean {
  if (!memory) return locationName === "ENTRANCE";
  switch (locationName) {
    case "ENTRANCE":
      return true;
    case "SECURITY HALL":
      return true;
    case "AUXILIARY TERMINAL":
      return memory.storyFlags.doorsScanned;
    case "ARCHIVE":
      return memory.storyFlags.terminalAccessed;
    case "ELEVATOR":
      return memory.storyFlags.terminalAccessed && memory.storyFlags.archiveOpened;
    case "SUB-CORE":
      return memory.questsCompleted.length >= 2;
    default:
      return false;
  }
}

export function FacilityMap({
  memory,
  selectedLocation,
  targetLocation,
  onLocationSelect,
  onLocationEnter,
  isLoading,
  miniGameOpen,
}: FacilityMapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const particlesRef = useRef<
    Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      color: string;
    }>
  >([]);
  const pulsePhaseRef = useRef(0);
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);
  const prevUnlockedRef = useRef<Record<string, boolean>>({});
  const unlockAnimationsRef = useRef<Record<string, number>>({});

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

    const initParticles = () => {
      particlesRef.current = Array.from({ length: 40 }, () => ({
        x: Math.random() * canvas.width / window.devicePixelRatio,
        y: Math.random() * canvas.height / window.devicePixelRatio,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.5 + 0.1,
        color: Math.random() > 0.5 ? "#63d8b0" : "#8a9cff",
      }));
    };

    initParticles();

    const animate = () => {
      if (!ctx) return;

      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;

      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = "#05070d";
      ctx.fillRect(0, 0, width, height);

      const gridSize = 40;
      ctx.strokeStyle = "rgba(110, 125, 255, 0.04)";
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

      const scanlineY = (pulsePhaseRef.current * height) % height;
      ctx.strokeStyle = "rgba(126, 145, 255, 0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, scanlineY);
      ctx.lineTo(width, scanlineY);
      ctx.stroke();

      pulsePhaseRef.current += 0.0008;

      WORLD_LOCATIONS.forEach((loc) => {
        const unlocked = getLocationUnlocked(memory, loc.name);
        const wasUnlocked = prevUnlockedRef.current[loc.name] ?? false;
        if (unlocked && !wasUnlocked) {
          unlockAnimationsRef.current[loc.name] = 1;
          soundEngine.playUnlock();
        }
        prevUnlockedRef.current[loc.name] = unlocked;
      });

      WORLD_LOCATIONS.forEach((loc) => {
        if (unlockAnimationsRef.current[loc.name] > 0) {
          unlockAnimationsRef.current[loc.name] -= 0.01;
          if (unlockAnimationsRef.current[loc.name] < 0) {
            unlockAnimationsRef.current[loc.name] = 0;
          }
        }
      });

      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${Math.floor(p.alpha * 255).toString(16).padStart(2, "0")}`;
        ctx.fill();
      });

      WORLD_LOCATIONS.forEach((loc) => {
        const visual = LOCATION_VISUALS[loc.name];
        const x = (loc.position.x / 100) * width;
        const y = (loc.position.y / 100) * height;
        const discovered = getLocationFlags(memory, loc.name);
        const unlocked = getLocationUnlocked(memory, loc.name);
        const isSelected = selectedLocation === loc.name;
        const isTarget = targetLocation === loc.name;
        const isHovered = hoveredLocation === loc.name;

        loc.connections.forEach((connName) => {
          const conn = WORLD_LOCATIONS.find((l) => l.name === connName);
          if (!conn) return;
          const cx = (conn.position.x / 100) * width;
          const cy = (conn.position.y / 100) * height;

          const connDiscovered = getLocationFlags(memory, conn.name);
          const connUnlocked = getLocationUnlocked(memory, conn.name);

          if (unlocked && connUnlocked) {
            const gradient = ctx.createLinearGradient(x, y, cx, cy);
            gradient.addColorStop(0, isTarget ? "rgba(99, 216, 176, 0.4)" : "rgba(138, 156, 255, 0.2)");
            gradient.addColorStop(1, isTarget ? "rgba(99, 216, 176, 0.4)" : "rgba(138, 156, 255, 0.2)");
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 4]);
            ctx.lineDashOffset = -pulsePhaseRef.current * 50;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(cx, cy);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        });
      });

      WORLD_LOCATIONS.forEach((loc) => {
        const visual = LOCATION_VISUALS[loc.name];
        const x = (loc.position.x / 100) * width;
        const y = (loc.position.y / 100) * height;
        const discovered = getLocationFlags(memory, loc.name);
        const unlocked = getLocationUnlocked(memory, loc.name);
        const isSelected = selectedLocation === loc.name;
        const isTarget = targetLocation === loc.name;
        const isHovered = hoveredLocation === loc.name;

        if (!unlocked && !discovered) {
          ctx.beginPath();
          ctx.arc(x, y, 18, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(20, 25, 45, 0.8)";
          ctx.fill();
          ctx.strokeStyle = "rgba(80, 90, 120, 0.3)";
          ctx.lineWidth = 1;
          ctx.stroke();
          return;
        }

        const unlockAnim = unlockAnimationsRef.current[loc.name] || 0;
        const pulse = Math.sin(pulsePhaseRef.current * 3 + x * 0.01) * 0.5 + 0.5;
        const glowIntensity = isTarget ? 1 : isSelected ? 0.8 : isHovered ? 0.6 : discovered ? 0.4 : 0.2;
        const glowRadius = 25 + pulse * 10 * glowIntensity;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
        gradient.addColorStop(0, `${visual.color}${Math.floor(60 * glowIntensity).toString(16).padStart(2, "0")}`);
        gradient.addColorStop(0.5, `${visual.color}${Math.floor(20 * glowIntensity).toString(16).padStart(2, "0")}`);
        gradient.addColorStop(1, `${visual.color}00`);
        ctx.beginPath();
        ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        if (unlockAnim > 0) {
          const ringCount = 3;
          for (let r = 0; r < ringCount; r++) {
            const ringProgress = 1 - unlockAnim + r * 0.15;
            if (ringProgress > 0 && ringProgress < 1) {
              const ringRadius = 20 + ringProgress * 60;
              const alpha = (1 - ringProgress) * 0.8;
              ctx.beginPath();
              ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
              ctx.strokeStyle = `rgba(${visual.color === "#63d8b0" ? "99, 216, 176" : visual.color === "#8a9cff" ? "138, 156, 255" : visual.color === "#ffb86b" ? "255, 184, 107" : visual.color === "#c896ff" ? "200, 150, 255" : visual.color === "#ff6b9d" ? "255, 107, 157" : "99, 245, 194"}, ${alpha})`;
              ctx.lineWidth = 3;
              ctx.stroke();
            }
          }

          if (unlockAnim > 0.5) {
            for (let i = 0; i < 8; i++) {
              const angle = (i / 8) * Math.PI * 2;
              const dist = 25 + (1 - unlockAnim) * 40;
              const px = x + Math.cos(angle) * dist;
              const py = y + Math.sin(angle) * dist;
              ctx.beginPath();
              ctx.arc(px, py, 4 * unlockAnim, 0, Math.PI * 2);
              ctx.fillStyle = `${visual.color}${Math.floor(unlockAnim * 255).toString(16).padStart(2, "0")}`;
              ctx.fill();
            }
          }
        }

        if (isTarget) {
          const pulseRing = Math.sin(pulsePhaseRef.current * 6) * 0.5 + 0.5;
          ctx.beginPath();
          ctx.arc(x, y, 30 + pulseRing * 10, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(99, 216, 176, ${0.5 + pulseRing * 0.3})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(x, y, 16, 0, Math.PI * 2);
        ctx.fillStyle = discovered ? "rgba(12, 17, 32, 0.95)" : "rgba(20, 25, 45, 0.9)";
        ctx.fill();
        ctx.strokeStyle = isSelected ? visual.color : isHovered ? `${visual.color}aa` : discovered ? `${visual.color}66` : "rgba(80, 90, 120, 0.4)";
        ctx.lineWidth = isSelected || isHovered ? 2 : 1;
        ctx.stroke();

        ctx.font = "bold 28px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = isSelected || isHovered ? visual.color : discovered ? "#a4adff" : "#59627e";
        ctx.fillText(visual.glyph, x, y);

        if (isTarget) {
          ctx.font = "bold 7px 'JetBrains Mono', monospace";
          ctx.fillStyle = "#63d8b0";
          ctx.fillText("TARGET", x, y + 28);
        } else if (discovered) {
          ctx.font = "bold 7px 'JetBrains Mono', monospace";
          ctx.fillStyle = "#63d8b0";
          ctx.fillText("VISITED", x, y + 28);
        } else if (unlocked) {
          ctx.font = "bold 7px 'JetBrains Mono', monospace";
          ctx.fillStyle = "#8a9cff";
          ctx.fillText("ACCESSIBLE", x, y + 28);
        } else {
          ctx.font = "bold 7px 'JetBrains Mono', monospace";
          ctx.fillStyle = "#59627e";
          ctx.fillText("LOCKED", x, y + 28);
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [memory, selectedLocation, targetLocation]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let found = null;
    WORLD_LOCATIONS.forEach((loc) => {
      const lx = (loc.position.x / 100) * rect.width;
      const ly = (loc.position.y / 100) * rect.height;
      const dist = Math.hypot(x - lx, y - ly);
      if (dist < 30 && getLocationUnlocked(memory, loc.name)) {
        found = loc.name;
      }
    });
    setHoveredLocation(found);
  };

  const handleMouseLeave = () => {
    setHoveredLocation(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    WORLD_LOCATIONS.forEach((loc) => {
      const lx = (loc.position.x / 100) * rect.width;
      const ly = (loc.position.y / 100) * rect.height;
      const dist = Math.hypot(x - lx, y - ly);
      if (dist < 30 && getLocationUnlocked(memory, loc.name)) {
        soundEngine.playClick();
        const isTarget = targetLocation === loc.name;
        onLocationSelect(loc.name, isTarget);
        if (isTarget && !miniGameOpen) {
          setTimeout(() => onLocationEnter(loc.name), 300);
        }
      }
    });
  };

  return (
    <div className="facility-map-container">
      <canvas
        ref={canvasRef}
        className="facility-canvas"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        style={{ cursor: hoveredLocation ? "pointer" : "default" }}
        aria-label="Facility map"
      />
      <div className="map-legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ background: "#63d8b0" }} />
          <span>ACTIVE TARGET</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: "#8a9cff" }} />
          <span>ACCESSIBLE</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: "#63d8b0", opacity: 0.5 }} />
          <span>VISITED</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: "#59627e" }} />
          <span>LOCKED</span>
        </div>
      </div>
      <style jsx>{`
        .facility-map-container {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 380px;
          border-radius: 12px;
          overflow: hidden;
          background: #05070d;
        }
        .facility-canvas {
          width: 100%;
          height: 100%;
          display: block;
        }
        .map-legend {
          position: absolute;
          bottom: 12px;
          left: 12px;
          right: 12px;
          display: flex;
          justify-content: center;
          gap: 16px;
          flex-wrap: wrap;
          padding: 8px 12px;
          background: rgba(6, 9, 16, 0.85);
          border: 1px solid rgba(110, 125, 255, 0.15);
          border-radius: 8px;
          backdrop-filter: blur(12px);
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #7e88a6;
          font-size: 7px;
          font-weight: 800;
          letter-spacing: 0.1em;
        }
        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
      `}</style>
    </div>
  );
}