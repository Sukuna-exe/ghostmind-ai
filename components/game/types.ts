export type StoryPath = "undecided" | "truth" | "trust" | "escape";

export type Quest = {
  id: string;
  title: string;
  objective: string;
  reward: string;
  location: string;
  action: string;
  actionLabel: string;
  progress: number;
};

export type Memory = {
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

export type Location = {
  name: string;
  icon: string;
  short: string;
  action: string;
  actionLabel: string;
  position: { x: number; y: number };
  connections: string[];
  unlocked: boolean;
  discovered: boolean;
};

export type GamePhase = "boot" | "playing" | "mini-game" | "dialogue" | "ending";

export type MiniGameType = "signal-lock" | "memory-fragment" | "core-alignment";

export type MiniGameState = {
  type: MiniGameType | null;
  location: string;
  isOpen: boolean;
  progress: number;
  success: boolean | null;
};

export type NovaState = "calm" | "curious" | "alert" | "afraid" | "trusting" | "corrupted";

export type SoundEffect = "click" | "success" | "failure" | "warning" | "terminal" | "scan" | "unlock" | "ambient";