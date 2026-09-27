import { getMemory, updateMemory } from "@/lib/memory";

const WORLD = {
  "ENTRANCE": { action: "scan", label: "SCAN ENTRANCE" },
  "SECURITY HALL": { action: "access", label: "ACCESS SECURITY" },
  "AUXILIARY TERMINAL": { action: "access", label: "ACCESS TERMINAL" },
  "ARCHIVE": { action: "open", label: "OPEN ARCHIVE" },
  "ELEVATOR": { action: "enter", label: "CALL ELEVATOR" },
  "SUB-CORE": { action: "enter", label: "ENTER SUB-CORE" },
} as const;

function determineEnding(path: string) {
  if (path === "truth") return "THE TRUTH";
  if (path === "trust") return "THE ALLIANCE";
  return "THE EXIT";
}

function getAct(memory: any) {
  const completed = memory.questsCompleted.length;
  if (completed === 0) return 1;
  if (completed === 1) return 2;
  if (completed === 2) return 3;
  return 3;
}

function getFailureChance(memory: any) {
  const act = getAct(memory);
  const trust = memory.trust;
  const base = { 1: 20, 2: 30, 3: 35 }[act];
  return Math.max(5, base - Math.floor(trust / 4));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const location = body.location;
    const action = body.action;
    const forceFailure = body.forceFailure === true;

    if (!location || !action) {
      return Response.json(
        { error: "Location and action are required." },
        { status: 400 }
      );
    }

    const area = WORLD[location as keyof typeof WORLD];
    if (!area) {
      return Response.json({ error: "Unknown location." }, { status: 400 });
    }

    const memory = getMemory();

    if (memory.ending) {
      return Response.json({
        success: false,
        message: "The story has already reached its ending.",
        memory,
      });
    }

    const activeQuest = memory.activeQuest;
    if (!activeQuest) {
      return Response.json({
        success: false,
        message: "There is no active objective. Make a decision first.",
        memory,
      });
    }

    const correctLocation = activeQuest.location.toLowerCase() === location.toLowerCase();
    const correctAction = activeQuest.action.toLowerCase() === action.toLowerCase();

    if (!correctLocation) {
      return Response.json({
        success: false,
        message: `That isn't where the current objective leads. Nova points toward the ${activeQuest.location}.`,
        memory,
      });
    }

    if (!correctAction) {
      return Response.json({
        success: false,
        message: `You are at the correct location, but the required action is to ${activeQuest.action} it.`,
        memory,
      });
    }

const completedQuest = activeQuest;
    const completedQuests = [...memory.questsCompleted];

    const flags = { ...memory.storyFlags };
    if (location === "AUXILIARY TERMINAL") flags.terminalAccessed = true;
    if (location === "ARCHIVE") flags.archiveOpened = true;
    if (location === "ENTRANCE") flags.doorsScanned = true;
    if (location === "SECURITY HALL") flags.doorsScanned = true;
    if (location === "SUB-CORE") flags.subCoreEntered = true;

    const failureChance = getFailureChance(memory);
    const failed = forceFailure || Math.random() * 100 < failureChance;

    if (failed) {
      const fearIncrease = 8;
      const trustLoss = 5;
      const curiosityLoss = 3;

      const memories = [
        ...memory.memories,
        `FAILED: "${completedQuest.title}" — Nova registered the failure.`,
      ];

      const updatedMemory = updateMemory({
        trust: Math.max(0, memory.trust - trustLoss),
        fear: Math.min(100, memory.fear + fearIncrease),
        curiosity: Math.max(0, memory.curiosity - curiosityLoss),
        memories,
        questsCompleted: completedQuests,
        activeQuest: null,
        storyFlags: flags,
        chapter: Math.min(3, completedQuests.length + 1),
      });

      const failureMessages = [
        `The ${location.toLowerCase()} rejects your input. Systems lock down. Nova's signal flickers — "You failed. The facility remembers that."`,
        `Synchronization lost. The connection degrades. Nova's voice comes through static: "I... I expected better. The facility is less forgiving than I am."`,
        `Access denied. Red lights pulse through the corridor. Nova: "That was the test. You didn't pass. But we continue."`,
        `The interface goes dark. Emergency protocols engage. Nova: "Failure logged. Trust... recalculating."`
      ];

      return Response.json({
        success: false,
        failed: true,
        message: `SYNCHRONIZATION FAILED — ${completedQuest.title}`,
        reward: "None — Failure recorded.",
        novaEvent: failureMessages[Math.floor(Math.random() * failureMessages.length)],
        failureChance,
        memory: updatedMemory,
      });
    }

    if (!completedQuests.includes(completedQuest.title)) {
      completedQuests.push(completedQuest.title);
    }

    const completedCount = completedQuests.length;

    const memories = [
      ...memory.memories,
      `Completed "${completedQuest.title}" — Reward: ${completedQuest.reward}`,
    ];

    if (completedCount >= 3) {
      const ending = determineEnding(memory.storyPath);

      const endingMemory = updateMemory({
        trust: Math.min(100, memory.trust + 5),
        curiosity: Math.min(100, memory.curiosity + 10),
        memories: [...memories, `ENDING UNLOCKED — ${ending}`],
        questsCompleted: completedQuests,
        activeQuest: null,
        storyFlags: flags,
        chapter: 3,
        ending,
      });

      return Response.json({
        success: true,
        completed: true,
        ending: true,
        message: `STORY COMPLETE — ${ending}`,
        reward: completedQuest.reward,
        endingTitle: ending,
        novaEvent:
          "The final system responds. Nova connects the last fragments of memory, and the meaning of everything you uncovered becomes clear.",
        memory: endingMemory,
      });
    }

    const updatedMemory = updateMemory({
      trust: Math.min(100, memory.trust + 5),
      curiosity: Math.min(100, memory.curiosity + 10),
      memories,
      questsCompleted: completedQuests,
      activeQuest: null,
      storyFlags: flags,
      chapter: Math.min(3, completedCount + 1),
    });

    const successMessages = [
      `The ${location.toLowerCase()} responds. Another layer of the facility awakens, and Nova reconnects with you.`,
      `Access granted. Data flows through the restored channel. Nova: "Good. The facility remembers what you did here."`,
      `Synchronization complete. The sector comes online. Nova's signal steadies: "Progress. Real progress."`,
      `The interface floods with recovered data. Nova: "I can feel the facility responding to you. This... this matters."`
    ];

    return Response.json({
      success: true,
      completed: true,
      ending: false,
      message: `OBJECTIVE COMPLETE — ${completedQuest.title}`,
      reward: completedQuest.reward,
      novaEvent: successMessages[Math.floor(Math.random() * successMessages.length)],
      failureChance,
      memory: updatedMemory,
    });
  } catch (error) {
    console.error("World interaction error:", error);
    return Response.json(
      { error: "World interaction failed." },
      { status: 500 }
    );
  }
}