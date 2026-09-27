"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { FacilityMap } from "@/components/game/FacilityMap";
import { NovaStateDisplay } from "@/components/game/NovaCore";
import { QuestPanel } from "@/components/game/QuestPanel";
import { MemoryHUD } from "@/components/game/MemoryHUD";
import { DialoguePanel } from "@/components/game/DialoguePanel";
import { SignalLock } from "@/components/game/SignalLock";
import { MemoryFragment } from "@/components/game/MemoryFragment";
import { CoreAlignment } from "@/components/game/CoreAlignment";
import { EndingSequence } from "@/components/game/EndingSequence";
import { StatusStrip } from "@/components/game/StatusStrip";
import { soundEngine } from "@/components/game/SoundEngine";

type StoryPath = "undecided" | "truth" | "trust" | "escape";

type Quest = {
  id: string;
  title: string;
  objective: string;
  reward: string;
  location: string;
  action: string;
  actionLabel: string;
  progress: number;
};

type Memory = {
  name: string;
  trust: number;
  curiosity: number;
  fear: number;
  choices: string[];
  memories: string[];
  questsCompleted: string[];
  activeQuest: Quest | null;
  relationship: string;
  storyPath: StoryPath;
  storyFlags: {
    terminalAccessed: boolean;
    archiveOpened: boolean;
    doorsScanned: boolean;
    subCoreEntered: boolean;
  };
  chapter: number;
  ending: string | null;
};

const STARTER_CHOICES = [
  "What happened here?",
  "Who are you?",
  "Can you remember me?",
];

const LOCATION_MINIGAME_MAP: Record<string, "signal-lock" | "memory-fragment" | "core-alignment"> = {
  "AUXILIARY TERMINAL": "signal-lock",
  ARCHIVE: "memory-fragment",
  "SUB-CORE": "core-alignment",
  "SECURITY HALL": "signal-lock",
  ENTRANCE: "signal-lock",
  ELEVATOR: "signal-lock",
};

const LOCATION_DIFFICULTY: Record<string, number> = {
  "AUXILIARY TERMINAL": 1,
  "SECURITY HALL": 1,
  ENTRANCE: 1,
  ELEVATOR: 2,
  ARCHIVE: 1,
  "SUB-CORE": 1,
};

export default function GamePage() {
  const [memory, setMemory] = useState<Memory | null>(null);
  const [dialogue, setDialogue] = useState(
    "FACILITY UPLINK ESTABLISHED. NOVA CORE ONLINE. Neural interface active — awaiting your directive, Operator."
  );
  const [choices, setChoices] = useState<string[]>(STARTER_CHOICES);
  const [loading, setLoading] = useState(false);
  const [loadingWorld, setLoadingWorld] = useState(false);
  const [systemMessage, setSystemMessage] = useState("NOVA ONLINE");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState("AUXILIARY TERMINAL");
  const [sceneLog, setSceneLog] = useState<string[]>([
    "Facility uplink established.",
    "Long-range sensors are returning incomplete data.",
  ]);
  const [showEnding, setShowEnding] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [ambientEnabled, setAmbientEnabled] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [miniGame, setMiniGame] = useState<{
    type: "signal-lock" | "memory-fragment" | "core-alignment" | null;
    location: string;
    isOpen: boolean;
  }>({ type: null, location: "", isOpen: false });

  const activeQuest = memory?.activeQuest;
  const targetLocation = activeQuest?.location ?? null;
  const recentChoices = useMemo(
    () => memory?.choices?.slice(-5).reverse() ?? [],
    [memory]
  );
  const completedCount = memory?.questsCompleted.length ?? 0;
  const chapterDisplay = Math.min(memory?.chapter ?? 1, 3);
  const campaignPercent = memory?.ending
    ? 100
    : Math.min(100, (completedCount / 3) * 100);
  const signalStrength = 95 + Math.floor(Math.random() * 5);

  const novaState = useMemo(() => {
    if (!memory) return "calm" as const;
    const { trust, fear, curiosity, storyPath } = memory;
    if (fear > 60) return "afraid" as const;
    if (fear > 30) return "alert" as const;
    if (trust > 75) return "trusting" as const;
    if (curiosity > 75) return "curious" as const;
    if (storyPath === "escape" && fear > 20) return "alert" as const;
    return "calm" as const;
  }, [memory]);

  const addLog = useCallback((message: string) => {
    setSceneLog((current) => [message, ...current].slice(0, 5));
  }, []);

  const loadMemory = useCallback(async () => {
    try {
      const response = await fetch("/api/memory", { cache: "no-store" });
      const data = await response.json();
      setMemory(data);
    } catch (error) {
      console.error("Memory load failed:", error);
      setSystemMessage("MEMORY CONNECTION ERROR");
    }
  }, []);

  useEffect(() => {
    loadMemory();
  }, [loadMemory]);

  useEffect(() => {
    if (memory) {
      const timer = setTimeout(() => {
        setInitialLoading(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [memory]);

  useEffect(() => {
    if (memory?.activeQuest?.location) {
      setSelectedLocation(memory.activeQuest.location);
    }
  }, [memory?.activeQuest?.location]);

  const sendToNova = useCallback(async (message: string) => {
    if (memory?.ending) return;

    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice: message }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Chat failed");
      }

      setDialogue(data.dialogue);
      setChoices(data.choices ?? []);
      setMemory(data.memory);
      setSystemMessage("NOVA RESPONSE RECEIVED");
      addLog("NOVA updated the active narrative state.");
    } catch (error) {
      console.error(error);
      setSystemMessage("NOVA CONNECTION ERROR");
      addLog("NOVA uplink failed. Local systems remain online.");
    } finally {
      setLoading(false);
    }
  }, [memory?.ending, addLog]);

  const handleChoice = useCallback(async (choice: string) => {
    if (loading || loadingWorld || memory?.ending) return;
    await sendToNova(choice);
  }, [loading, loadingWorld, memory?.ending, sendToNova]);

  const inspectLocation = useCallback((locationName: string, isTarget: boolean) => {
    setSelectedLocation(locationName);

    if (isTarget) {
      setSystemMessage(`OBJECTIVE LOCKED — ${locationName}`);
      addLog(`Target acquired: ${locationName}. Interactive access available.`);
      soundEngine.playScan();
      return;
    }

    setSystemMessage(`SCANNING — ${locationName}`);
    addLog(`Inspected ${locationName}. No active quest signal detected here.`);
    soundEngine.playClick();
  }, [addLog]);

  const startMiniGame = useCallback((locationName: string) => {
    const miniGameType = LOCATION_MINIGAME_MAP[locationName] || "signal-lock";
    const difficulty = LOCATION_DIFFICULTY[locationName] || 1;

    setMiniGame({ type: miniGameType, location: locationName, isOpen: true });
    setSystemMessage(`INTERFACE OPEN — ${miniGameType.toUpperCase().replace("-", " ")}`);
    addLog(`Engaged ${locationName}. Manual synchronization required.`);
    soundEngine.playTerminal();
  }, [addLog]);

  const handleMiniGameSuccess = useCallback(async () => {
    const location = miniGame.location;
    const action = activeQuest?.action || "access";
    const actionLabel = activeQuest?.actionLabel || "ACCESS";

    if (!location) return;

    setLoadingWorld(true);
    setSystemMessage(`PROCESSING ${location.toUpperCase()}...`);

    try {
      const response = await fetch("/api/world", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location, action }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "World action failed");
      }

      setMemory(data.memory);
      setSystemMessage(data.message ?? "WORLD STATE UPDATED");
      addLog(data.message ?? `World state updated at ${location}.`);

      if (data.success && data.ending) {
        setDialogue(data.novaEvent ?? "The final system responds.");
        setChoices([]);
        addLog(`ENDING UNLOCKED — ${data.endingTitle}`);
        setShowEnding(true);
        return;
      }

      if (data.success) {
        setDialogue(data.novaEvent ?? "The facility responds.");
        addLog(`Reward acquired: ${data.reward}`);
        await sendToNova(
          `I ${actionLabel.toLowerCase()} at the ${location.toLowerCase()}.`
        );
        setSystemMessage(`QUEST COMPLETE — ${data.reward}`);
      }
    } catch (error) {
      console.error(error);
      setSystemMessage("WORLD SYSTEM ERROR");
      addLog("World interaction failed.");
    } finally {
      setLoadingWorld(false);
      setMiniGame({ type: null, location: "", isOpen: false });
    }
  }, [miniGame.location, activeQuest, addLog, sendToNova]);

  const handleMiniGameFailure = useCallback(() => {
    const location = miniGame.location;
    setSystemMessage(`SYNCHRONIZATION FAILED — ${location.toUpperCase()}`);
    addLog(`Mini-game failed at ${location}. Systems destabilized.`);
    soundEngine.playWarning();

    if (memory) {
      const newFear = Math.min(100, memory.fear + 10);
      const newTrust = Math.max(0, memory.trust - 5);
      setMemory((prev) => prev ? { ...prev, fear: newFear, trust: newTrust } : null);
    }

    setMiniGame({ type: null, location: "", isOpen: false });
  }, [miniGame.location, memory, addLog]);

  const handleMiniGameClose = useCallback(() => {
    setMiniGame({ type: null, location: "", isOpen: false });
    soundEngine.playClick();
  }, []);

  const resetGame = useCallback(async () => {
    setShowResetConfirm(false);
    setMiniGame({ type: null, location: "", isOpen: false });
    setShowEnding(false);

    try {
      const response = await fetch("/api/reset", { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Reset failed");
      }

      setMemory(data.memory);
      setDialogue("Connection established. The facility remembers more than you do.");
      setChoices(STARTER_CHOICES);
      setSelectedLocation("AUXILIARY TERMINAL");
      setSceneLog([
        "New campaign initialized.",
        "Facility uplink established.",
      ]);
      setSystemMessage("NEW CAMPAIGN INITIALIZED");
      setInitialLoading(true);
      setTimeout(() => setInitialLoading(false), 100);
    } catch (error) {
      console.error(error);
      setSystemMessage("RESET FAILED");
    }
  }, []);

  const handleReplay = useCallback(() => {
    setShowEnding(false);
    resetGame();
  }, [resetGame]);

  return (
    <main className="game-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="noise" />

      {initialLoading && (
        <div className="loading-screen">
          <div className="loading-core">
            <svg viewBox="0 0 120 120" className="loading-svg">
              <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(99, 216, 176, 0.15)" strokeWidth="3" />
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="#63d8b0"
                strokeWidth="4"
                strokeDasharray="314"
                strokeDashoffset="314"
                strokeLinecap="round"
                style={{ transform: "rotate(-90deg)", transformOrigin: "60px 60px", filter: "drop-shadow(0 0 8px #63d8b0)" }}
                className="loading-ring"
              />
            </svg>
          </div>
          <div className="loading-text">ESTABLISHING UPLINK</div>
          <div className="loading-sub">CONNECTING TO FACILITY...</div>
          <div className="loading-bar">
            <div className="loading-progress" />
          </div>
        </div>
      )}

      {!initialLoading && (
        <>
          <header className="topbar">
            <div className="topbar-left">
              <div className="brand">GHOSTMIND</div>
              <div className="eyebrow">ADAPTIVE AI EXPERIENCE</div>
            </div>

            <div className="topbar-center">
              <span className="hud-chip">CH {chapterDisplay}/3</span>
              <span className="hud-chip path">{memory?.storyPath?.toUpperCase() ?? "UNDECIDED"}</span>
            </div>

            <div className="topbar-right">
              <div className="sound-toggle" title={soundEnabled ? "Disable sounds" : "Enable sounds"} onClick={() => { setSoundEnabled(!soundEnabled); soundEngine.setEnabled(!soundEnabled); }}>
                <span className="sound-icon">{soundEnabled ? "🔊" : "🔇"}</span>
                <span className="sound-label">SFX</span>
              </div>
              <div className="sound-toggle" title={ambientEnabled ? "Disable ambient" : "Enable ambient"} onClick={() => { setAmbientEnabled(!ambientEnabled); soundEngine.setAmbientEnabled(!ambientEnabled); }}>
                <span className="sound-icon">{ambientEnabled ? "🎵" : "🔇"}</span>
                <span className="sound-label">AMB</span>
              </div>
              <span className="status-dot" />
              NOVA ONLINE
            </div>
          </header>

          <StatusStrip
            memory={memory}
            systemMessage={systemMessage}
            chapter={chapterDisplay}
            storyPath={memory?.storyPath ?? "undecided"}
            signalStrength={signalStrength}
          />

          <div className="campaign-bar panel">
            <div>
              <div className="eyebrow">CAMPAIGN PROGRESS</div>
              <div className="campaign-line">
                <strong>CHAPTER {chapterDisplay}</strong>
                <span>/ 3</span>
                <span className="path-chip">{memory?.storyPath?.toUpperCase() ?? "UNDECIDED"}</span>
              </div>
            </div>

            <div className="campaign-progress">
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${campaignPercent}%` }} />
              </div>
              <span>{Math.round(campaignPercent)}%</span>
            </div>
          </div>

          {showEnding && memory && (
            <EndingSequence memory={memory} onReplay={handleReplay} />
          )}

          <section className="main-grid">
            <aside className="left-column">
              <section className="panel panel-map">
                <div className="panel-header">
                  <span className="panel-tag">WORLD // FACILITY MAP</span>
                </div>
                <FacilityMap
                  memory={memory}
                  selectedLocation={selectedLocation}
                  targetLocation={targetLocation}
                  onLocationSelect={inspectLocation}
                  onLocationEnter={startMiniGame}
                  isLoading={loading || loadingWorld}
                  miniGameOpen={miniGame.isOpen}
                />
              </section>

              <section className="panel">
                <div className="panel-header">
                  <span className="panel-tag">NOVA // NEURAL INTERFACE</span>
                </div>
                <NovaStateDisplay
                  memory={memory}
                  isSpeaking={!loading && dialogue.length > 0}
                  isProcessing={loading}
                />
              </section>
            </aside>

            <section className="center-column">
              <section className="panel dialogue-panel" style={{ opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s ease' }}>
                <DialoguePanel
                  dialogue={dialogue}
                  choices={choices}
                  isLoading={loading}
                  onChoice={handleChoice}
                  novaState={novaState}
                  disabled={loading || loadingWorld || !!memory?.ending}
                />
              </section>

              <section className="panel quest-panel" style={{ opacity: loadingWorld ? 0.7 : 1, transition: 'opacity 0.2s ease' }}>
                <QuestPanel
                  quest={activeQuest ?? null}
                  memory={memory}
                  onQuestComplete={() => {}}
                />
              </section>
            </section>

            <aside className="right-column">
              <section className="panel" style={{ opacity: loadingWorld ? 0.6 : 1, transition: 'opacity 0.2s ease' }}>
                <div className="panel-header">
                  <span className="panel-tag">MEMORY CORE</span>
                </div>
                <MemoryHUD memory={memory} compact={false} />
              </section>

              <section className="panel" style={{ opacity: loadingWorld ? 0.6 : 1, transition: 'opacity 0.2s ease' }}>
                <div className="panel-header">
                  <span className="panel-tag">MISSION STATUS</span>
                </div>
                <div className="mission-status">
                  <div className="status-item">
                    <span className="status-label">ACTIVE SECTOR</span>
                    <span className="status-value target">{targetLocation ?? "NO ACTIVE TARGET"}</span>
                  </div>
                  {!targetLocation && memory && !memory.ending && (
                    <div className="status-warning">⚠ NO ACTIVE OBJECTIVE — AWAITING DIRECTIVE</div>
                  )}
                  <div className="status-grid">
                    <div>
                      <span className="status-label">CHAPTER</span>
                      <span className="status-value">{chapterDisplay}/3</span>
                    </div>
                    <div>
                      <span className="status-label">QUESTS</span>
                      <span className="status-value">{completedCount}/3</span>
                    </div>
                    <div>
                      <span className="status-label">PATH</span>
                      <span className="status-value path">{memory?.storyPath?.toUpperCase() ?? "UNDECIDED"}</span>
                    </div>
                    <div>
                      <span className="status-label">NOVA LINK</span>
                      <span className="status-value">{signalStrength}%</span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="panel" style={{ opacity: loadingWorld ? 0.6 : 1, transition: 'opacity 0.2s ease' }}>
                <div className="panel-header">
                  <span className="panel-tag">DECISION TRACE</span>
                </div>
                {recentChoices.length ? (
                  <div className="decision-list">
                    {recentChoices.map((item, index) => (
                      <div key={`${item}-${index}`} className="decision-item">
                        <span className="decision-index">{String(index + 1).padStart(2, "0")}</span>
                        <p className="decision-text">{item}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">No decisions recorded.</div>
                )}
              </section>

              <section className="panel" style={{ opacity: loadingWorld ? 0.6 : 1, transition: 'opacity 0.2s ease' }}>
                <div className="panel-header">
                  <span className="panel-tag">CAMPAIGN ARCHIVE</span>
                </div>
                {memory?.questsCompleted?.length ? (
                  <div className="completed-list">
                    {memory.questsCompleted
                      .slice()
                      .reverse()
                      .map((quest, index) => (
                        <div key={`${quest}-${index}`} className="completed-item">
                          <span className="completed-check">✓</span>
                          <p>{quest}</p>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="empty-state">Campaign has just begun.</div>
                )}
              </section>
            </aside>
          </section>

          <footer className="footer">
            <button className="reset-button" onClick={() => setShowResetConfirm(true)}>
              RESET CAMPAIGN
            </button>
          </footer>

          {showResetConfirm && (
            <div className="modal-backdrop" onClick={() => setShowResetConfirm(false)}>
              <div className="modal panel" onClick={(e) => e.stopPropagation()}>
                <div className="eyebrow">SYSTEM WARNING</div>
                <h2>RESET CAMPAIGN?</h2>
                <p>This clears the current player memory, quests, story path and ending.</p>
                <div className="modal-actions">
                  <button className="secondary-button" onClick={() => setShowResetConfirm(false)}>
                    CANCEL
                  </button>
                  <button className="danger-button" onClick={resetGame}>
                    RESET
                  </button>
                </div>
              </div>
            </div>
          )}

          {miniGame.isOpen && miniGame.type && (
            <>
              {miniGame.type === "signal-lock" && (
                <SignalLock
                  isOpen={true}
                  onClose={handleMiniGameClose}
                  onSuccess={handleMiniGameSuccess}
                  onFailure={handleMiniGameFailure}
                  difficulty={LOCATION_DIFFICULTY[miniGame.location] || 1}
                  locationName={miniGame.location}
                />
              )}
              {miniGame.type === "memory-fragment" && (
                <MemoryFragment
                  isOpen={true}
                  onClose={handleMiniGameClose}
                  onSuccess={handleMiniGameSuccess}
                  onFailure={handleMiniGameFailure}
                  difficulty={LOCATION_DIFFICULTY[miniGame.location] || 1}
                  locationName={miniGame.location}
                />
              )}
              {miniGame.type === "core-alignment" && (
                <CoreAlignment
                  isOpen={true}
                  onClose={handleMiniGameClose}
                  onSuccess={handleMiniGameSuccess}
                  onFailure={handleMiniGameFailure}
                  locationName={miniGame.location}
                />
              )}
            </>
          )}
        </>
      )}

      <style jsx>{`
        * { box-sizing: border-box; }
        .game-shell {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          background: #05070d;
          color: #edf0ff;
          font-family: 'Inter', 'JetBrains Mono', Arial, sans-serif;
        }
        .ambient {
          position: fixed;
          width: 420px;
          height: 420px;
          border-radius: 50%;
          filter: blur(100px);
          opacity: .16;
          pointer-events: none;
          z-index: 0;
        }
        .ambient-one { background: #5868ff; top: -180px; left: 24%; }
        .ambient-two { background: #7b4dff; right: -180px; top: 42%; }
        .noise {
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: .04;
          background-image: repeating-linear-gradient(
            180deg,
            rgba(255,255,255,.08) 0,
            rgba(255,255,255,.08) 1px,
            transparent 1px,
            transparent 4px
          );
          z-index: 1;
        }

        .topbar {
          position: sticky;
          top: 0;
          z-index: 20;
          height: 72px;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 18px;
          padding: 0 28px;
          border-bottom: 1px solid rgba(255,255,255,.07);
          background: rgba(5,7,13,.88);
          backdrop-filter: blur(20px);
        }
        .topbar-left { display: flex; flex-direction: column; gap: 2px; }
        .topbar-center { display: flex; gap: 8px; justify-content: center; }
        .topbar-right { justify-self: end; display: flex; align-items: center; gap: 9px; font-size: 10px; letter-spacing: .14em; color: #bcc4de; }
        .brand { font-size: 20px; font-weight: 950; letter-spacing: .18em; }
        .eyebrow { font-size: 9px; line-height: 1; font-weight: 850; letter-spacing: .2em; color: #6e7897; }
        .hud-chip {
          padding: 6px 8px;
          border: 1px solid rgba(111,126,255,.16);
          border-radius: 999px;
          background: rgba(24,30,56,.55);
          color: #8d99de;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: .1em;
        }
        .hud-chip.path { border-color: rgba(200,150,255,.3); color: #c896ff; }
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #63f5c2;
          box-shadow: 0 0 14px rgba(99,245,194,.85);
          animation: pulse 1.5s ease-in-out infinite;
        }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

        .campaign-bar {
          margin: 16px 28px 0;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }
        .campaign-line { display: flex; align-items: center; gap: 6px; margin-top: 6px; }
        .campaign-line strong { font-size: 14px; letter-spacing: .08em; }
        .campaign-line > span { color: #606985; }
        .path-chip {
          margin-left: 8px;
          padding: 4px 8px;
          border: 1px solid rgba(116,130,255,.25);
          border-radius: 999px;
          color: #96a0ff !important;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: .12em;
        }
        .campaign-progress { width: min(280px, 35%); display: flex; align-items: center; gap: 10px; color: #747e9d; font-size: 9px; }
        .progress-track { height: 4px; flex: 1; overflow: hidden; border-radius: 999px; background: #161a29; }
        .progress-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, #5d6dff, #927cff); box-shadow: 0 0 12px rgba(105,121,255,.35); transition: width .35s ease; }

        .main-grid {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: 280px minmax(0,1fr) 300px;
          gap: 16px;
          padding: 16px 28px 24px;
        }
        .left-column, .right-column, .center-column { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
        .panel { position: relative; z-index: 1; border: 1px solid rgba(255,255,255,.07); border-radius: 12px; background: linear-gradient(180deg, rgba(18,22,39,.92), rgba(8,11,19,.94)); box-shadow: 0 16px 48px rgba(0,0,0,.2); }
        .panel-header { margin-bottom: 14px; }
        .panel-tag { font-family: 'JetBrains Mono', monospace; font-size: 7px; font-weight: 900; letter-spacing: .15em; color: #59627e; }

        .left-column .panel, .right-column .panel, .center-column .panel { padding: 16px; }

        .mission-status { display: flex; flex-direction: column; gap: 12px; }
        .status-item { display: flex; flex-direction: column; gap: 4px; }
        .status-label { font-family: 'JetBrains Mono', monospace; font-size: 6px; font-weight: 900; letter-spacing: .15em; color: #59627e; }
        .status-value { font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 800; color: #8a9cff; }
        .status-value.target { color: #ffb86b; }
        .status-value.path { color: #c896ff; }
        .status-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .status-grid > div { display: flex; flex-direction: column; gap: 4px; padding: 8px; background: rgba(255,255,255,.015); border: 1px solid rgba(255,255,255,.05); border-radius: 8px; }

        .decision-list { display: flex; flex-direction: column; gap: 8px; }
        .decision-item { display: grid; grid-template-columns: 22px 1fr; gap: 8px; }
        .decision-index { color: #5967a1; font-size: 8px; font-weight: 900; padding-top: 2px; }
        .decision-text { margin: 0; padding-left: 8px; border-left: 2px solid #5967ff; color: #aab2cc; font-size: 9px; line-height: 1.45; }

        .completed-list { display: flex; flex-direction: column; gap: 8px; }
        .completed-item { display: grid; grid-template-columns: 18px 1fr; gap: 7px; }
        .completed-check { color: #63f5c2; font-weight: 900; }
        .completed-item p { margin: 0; color: #919ab4; font-size: 9px; line-height: 1.45; }

        .empty-state { color: #626b87; font-size: 10px; line-height: 1.55; text-align: center; padding: 20px; }

        .panel {
          transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
        }
        .panel:hover {
          border-color: rgba(110, 125, 255, 0.2);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25), inset 0 0 1px rgba(110, 125, 255, 0.1);
        }
        .panel:has(.quest-panel), .panel:has(.dialogue-panel) {
          transition: none;
        }

        .status-item .status-value.target {
          transition: color 0.3s ease, text-shadow 0.3s ease;
        }
        .status-item .status-value.target:not(:empty) {
          text-shadow: 0 0 10px #ffb86b;
        }
        .status-warning {
          font-family: 'JetBrains Mono', monospace;
          font-size: 7px;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: #ff6b6b;
          padding: 4px 8px;
          background: rgba(255, 107, 107, 0.1);
          border: 1px solid rgba(255, 107, 107, 0.2);
          border-radius: 4px;
          text-align: center;
          animation: warningPulse 1.5s ease-in-out infinite;
        }
        @keyframes warningPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        .decision-item {
          transition: transform 0.15s ease, opacity 0.15s ease;
        }
        .decision-item:hover {
          transform: translateX(4px);
        }
        .decision-item:hover .decision-text {
          color: #c8d0ff;
        }

        .completed-item {
          transition: transform 0.15s ease;
        }
        .completed-item:hover {
          transform: translateX(4px);
        }
        .completed-item:hover p {
          color: #c8d0ff;
        }

        .footer {
          position: relative;
          z-index: 2;
          display: flex;
          justify-content: space-between;
          gap: 14px;
          padding: 0 28px 22px;
          color: #454d68;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: .13em;
        }
        .reset-button {
          border: 0;
          background: transparent;
          color: #616a88;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: .13em;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
        }
        .reset-button:hover { color: #ff6b6b; background: rgba(255, 107, 107, 0.1); }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 80;
          display: grid;
          place-items: center;
          padding: 18px;
          background: rgba(2,4,9,.85);
          backdrop-filter: blur(16px);
          animation: fadeIn 0.2s ease-out;
        }
        .modal { width: min(420px, 100%); padding: 22px; border-color: rgba(119,132,255,.22); }
        .modal h2 { margin: 8px 0; font-size: 22px; letter-spacing: .06em; }
        .modal p { margin: 0 0 20px; color: #7f89a7; font-size: 11px; line-height: 1.55; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 8px; }
        .secondary-button, .danger-button {
          border: 0;
          border-radius: 8px;
          padding: 11px 14px;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .13em;
          cursor: pointer;
        }
        .secondary-button { background: rgba(255,255,255,.05); color: #a6aec7; border: 1px solid rgba(255,255,255,.08); }
        .danger-button { background: rgba(255,85,111,.13); color: #ff9aab; border: 1px solid rgba(255,85,111,.22); }

        .sound-toggle {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          border: 1px solid rgba(110, 125, 255, 0.2);
          border-radius: 8px;
          background: rgba(10, 15, 30, 0.6);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .sound-toggle:hover {
          background: rgba(110, 125, 255, 0.15);
          border-color: rgba(110, 125, 255, 0.4);
        }
        .sound-icon { font-size: 12px; }
        .sound-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 6px;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: #8a9cff;
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .loading-screen {
          position: fixed;
          inset: 0;
          z-index: 200;
          background: #020306;
          display: grid;
          place-items: center;
          flex-direction: column;
          gap: 24px;
          padding: 40px;
        }
        .loading-core {
          width: 120px;
          height: 120px;
          animation: corePulse 2s ease-in-out infinite;
        }
        .loading-svg { width: 100%; height: 100%; }
        .loading-ring { animation: ringDraw 2s ease-out forwards, ringSpin 3s linear infinite; }
        @keyframes corePulse { 0%, 100% { transform: scale(1); filter: drop-shadow(0 0 20px rgba(99, 216, 176, 0.4)); } 50% { transform: scale(1.05); filter: drop-shadow(0 0 40px rgba(99, 216, 176, 0.7)); } }
        @keyframes ringDraw { from { stroke-dashoffset: 314; } to { stroke-dashoffset: 0; } }
        @keyframes ringSpin { to { transform: rotate(-90deg) rotate(360deg); transform-origin: 60px 60px; } }
        .loading-text {
          font-family: 'JetBrains Mono', monospace;
          font-size: clamp(16px, 3vw, 24px);
          font-weight: 900;
          letter-spacing: 0.15em;
          color: #63f5c2;
          text-shadow: 0 0 30px rgba(99, 245, 194, 0.5);
        }
        .loading-sub {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.2em;
          color: #8a9cff;
        }
        .loading-bar {
          width: 300px;
          max-width: 80vw;
          height: 3px;
          background: rgba(20, 25, 45, 0.8);
          border-radius: 2px;
          overflow: hidden;
        }
        .loading-progress {
          height: 100%;
          width: 0%;
          background: linear-gradient(90deg, #63d8b0, #63f5c2);
          border-radius: 2px;
          animation: loadProgress 2.5s ease-out forwards;
          box-shadow: 0 0 12px rgba(99, 216, 176, 0.5);
        }
        @keyframes loadProgress { from { width: 0%; } to { width: 100%; } }

        @media (max-width: 1200px) {
          .main-grid { grid-template-columns: 260px minmax(0,1fr); }
          .right-column { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(2, 1fr); align-items: start; gap: 16px; }
        }
        @media (max-width: 900px) {
          .topbar { grid-template-columns: 1fr auto; padding: 0 18px; }
          .topbar-center { display: none; }
          .main-grid { grid-template-columns: 1fr; padding: 12px 18px 20px; }
          .right-column { grid-column: auto; display: grid; grid-template-columns: repeat(2, 1fr); }
          .campaign-bar { flex-direction: column; align-items: flex-start; gap: 12px; }
          .campaign-progress { width: 100%; }
        }
        @media (max-width: 640px) {
          .right-column { grid-template-columns: 1fr; }
          .brand { font-size: 17px; }
          .topbar-right { font-size: 8px; }
        }
      `}</style>
    </main>
  );
}