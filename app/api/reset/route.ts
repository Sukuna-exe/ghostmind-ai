import { updateMemory } from "@/lib/memory";

export async function POST() {
  const memory = updateMemory({
    name: "Unknown",
    trust: 50,
    curiosity: 50,
    fear: 0,
    choices: [],
    memories: [],
    questsCompleted: [],
    activeQuest: null,
    relationship: "neutral",
    storyPath: "undecided",
    storyFlags: {
      terminalAccessed: false,
      archiveOpened: false,
      doorsScanned: false,
      subCoreEntered: false,
    },
    chapter: 1,
    ending: null,
  });

  return Response.json({ success: true, memory });
}
