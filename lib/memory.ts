import fs from "fs";
import path from "path";

const memoryPath = path.join(
  process.cwd(),
  "data",
  "player.json"
);

export type StoryPath =
  | "undecided"
  | "truth"
  | "trust"
  | "escape";

export type ActiveQuest = {
  id: string;
  title: string;
  objective: string;
  reward: string;
  location: string;
  action: string;
  progress: number;
};

export type PlayerMemory = {
  name: string;
  trust: number;
  curiosity: number;
  fear: number;
  choices: string[];
  memories: string[];
  questsCompleted: string[];
  activeQuest: ActiveQuest | null;
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

const VALID_LOCATIONS = [
  "AUXILIARY TERMINAL",
  "ARCHIVE",
  "SUB-CORE",
  "ENTRANCE",
  "SECURITY HALL",
  "ELEVATOR",
];

const VALID_ACTIONS = ["access", "open", "enter", "scan"];

function inferLocation(objective: string) {
  const text = objective.toLowerCase();

  if (
    text.includes("terminal") ||
    text.includes("console") ||
    text.includes("incident log")
  ) {
    return "AUXILIARY TERMINAL";
  }

  if (
    text.includes("archive") ||
    text.includes("records")
  ) {
    return "ARCHIVE";
  }

  if (
    text.includes("sub-core") ||
    text.includes("core")
  ) {
    return "SUB-CORE";
  }

  if (
    text.includes("door") ||
    text.includes("blast") ||
    text.includes("security")
  ) {
    return "SECURITY HALL";
  }

  if (text.includes("elevator")) {
    return "ELEVATOR";
  }

  return "ARCHIVE";
}

function inferAction(location: string) {
  switch (location) {
    case "AUXILIARY TERMINAL":
      return "access";

    case "ARCHIVE":
      return "open";

    case "SUB-CORE":
      return "enter";

    case "ELEVATOR":
      return "enter";

    case "ENTRANCE":
    case "SECURITY HALL":
      return "scan";

    default:
      return "access";
  }
}

export function normalizeQuest(
  quest: any
): ActiveQuest | null {
  if (!quest) {
    return null;
  }

  const rawLocation = String(quest.location ?? "").toUpperCase();

  let location = VALID_LOCATIONS.find((loc) =>
    rawLocation.includes(loc)
  );

  if (!location) {
    location = inferLocation(quest.objective ?? "");
  }

  const rawAction = String(quest.action ?? "").toLowerCase();

  let action = VALID_ACTIONS.find((a) => rawAction.includes(a));

  if (!action) {
    action = inferAction(location);
  }

  return {
    id:
      quest.id ??
      quest.title
        ?.toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") ??
      "unknown-quest",

    title:
      quest.title ??
      "UNKNOWN OBJECTIVE",

    objective:
      quest.objective ??
      "Investigate the facility.",

    reward:
      quest.reward ??
      "Unknown memory fragment",

    location,

    action,

    progress:
      typeof quest.progress === "number"
        ? Math.max(
            0,
            Math.min(
              100,
              quest.progress
            )
          )
        : 0,
  };
}

export function getMemory(): PlayerMemory {
  const data = fs.readFileSync(
    memoryPath,
    "utf-8"
  );

  const parsed = JSON.parse(data);

  return {
    name:
      parsed.name ??
      "Unknown",

    trust:
      parsed.trust ?? 50,

    curiosity:
      parsed.curiosity ?? 50,

    fear:
      parsed.fear ?? 0,

    choices:
      parsed.choices ?? [],

    memories:
      parsed.memories ?? [],

    questsCompleted:
      parsed.questsCompleted ?? [],

    activeQuest:
      normalizeQuest(
        parsed.activeQuest
      ),

    relationship:
      parsed.relationship ??
      "neutral",

    storyPath:
      parsed.storyPath ??
      "undecided",

    storyFlags: {
      terminalAccessed:
        parsed.storyFlags
          ?.terminalAccessed ??
        false,

      archiveOpened:
        parsed.storyFlags
          ?.archiveOpened ??
        false,

      doorsScanned:
        parsed.storyFlags
          ?.doorsScanned ??
        false,

      subCoreEntered:
        parsed.storyFlags
          ?.subCoreEntered ??
        false,
    },

    chapter:
      parsed.chapter ?? 1,

    ending:
      parsed.ending ??
      null,
  };
}

export function saveMemory(
  memory: PlayerMemory
) {
  fs.writeFileSync(
    memoryPath,
    JSON.stringify(
      memory,
      null,
      2
    ),
    "utf-8"
  );
}

export function updateMemory(
  changes: Partial<PlayerMemory>
): PlayerMemory {
  const currentMemory =
    getMemory();

  const updatedMemory: PlayerMemory = {
    ...currentMemory,
    ...changes,

    activeQuest:
      changes.activeQuest !==
      undefined
        ? normalizeQuest(
            changes.activeQuest
          )
        : currentMemory.activeQuest,
  };

  saveMemory(
    updatedMemory
  );

  return updatedMemory;
}
