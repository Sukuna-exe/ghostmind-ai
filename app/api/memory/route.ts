import { getMemory, updateMemory } from "@/lib/memory";

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

function checkQuestCompletion(
  choice: string,
  activeQuest: {
    title: string;
    objective: string;
    reward: string;
  } | null
) {
  if (!activeQuest) {
    return false;
  }

  const text = choice.toLowerCase();

  /*
   * Quest-specific completion rules.
   */

  if (
    activeQuest.title === "Echoes of the Breach"
  ) {
    return (
      text.includes("access") &&
      text.includes("terminal")
    ) ||
      text.includes("retrieve") ||
      text.includes("incident log");
  }

  if (
    activeQuest.title === "THE ERASED ARCHIVE" ||
    activeQuest.title === "THE HIDDEN ARCHIVE"
  ) {
    return (
      text.includes("open the archive") ||
      text.includes("access the archive") ||
      text.includes("recover the") ||
      text.includes("show me the records")
    );
  }

  if (
    activeQuest.title === "THE FIRST MEMORY"
  ) {
    return (
      text.includes("show me your memories") ||
      text.includes("memory")
    );
  }

  if (
    activeQuest.title === "THE WATCHER"
  ) {
    return (
      text.includes("what noticed us") ||
      text.includes("monitor") ||
      text.includes("system")
    );
  }

  if (
    activeQuest.title === "THE NEURAL SIGNAL"
  ) {
    return (
      text.includes("access the system") ||
      text.includes("signal")
    );
  }

  if (
    activeQuest.title === "NOVA'S REQUEST"
  ) {
    return (
      text.includes("i'll help you") ||
      text.includes("help")
    );
  }

  if (
    activeQuest.title === "PROVE THE SIGNAL"
  ) {
    return (
      text.includes("prove") ||
      text.includes("what do you want me to see")
    );
  }

  /*
   * Generic fallback.
   */

  return (
    text.includes("complete") ||
    text.includes("retrieve") ||
    text.includes("access") ||
    text.includes("investigate")
  );
}

export async function GET() {
  const memory = getMemory();

  return Response.json(memory);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { choice, quest } = body;

    if (!choice) {
      return Response.json(
        {
          error: "Choice is required",
        },
        {
          status: 400,
        }
      );
    }

    const memory = getMemory();

    /*
     * --------------------------------
     * PLAYER STAT CHANGES
     * --------------------------------
     */

    let trustChange = 0;
    let curiosityChange = 0;
    let fearChange = 0;

    const text = choice.toLowerCase();

    if (
      text.includes("trust") ||
      text.includes("help") ||
      text.includes("believe")
    ) {
      trustChange += 5;
    }

    if (
      text.includes("why") ||
      text.includes("remember") ||
      text.includes("investigate") ||
      text.includes("find") ||
      text.includes("show")
    ) {
      curiosityChange += 5;
    }

    if (
      text.includes("alone") ||
      text.includes("danger") ||
      text.includes("afraid") ||
      text.includes("leave")
    ) {
      fearChange += 5;
    }

    /*
     * --------------------------------
     * QUEST COMPLETION
     * --------------------------------
     */

    const questCompleted = checkQuestCompletion(
      choice,
      memory.activeQuest
    );

    let completedQuests = [
      ...memory.questsCompleted,
    ];

    let memories = [...memory.memories];

    let activeQuest = quest ?? memory.activeQuest;

    if (questCompleted && memory.activeQuest) {
      const completedQuest = memory.activeQuest;

      /*
       * Prevent duplicate completion.
       */

      if (
        !completedQuests.includes(
          completedQuest.title
        )
      ) {
        completedQuests.push(
          completedQuest.title
        );
      }

      /*
       * Add reward to long-term memory.
       */

      memories.push(
        `Completed quest "${completedQuest.title}" and received: ${completedQuest.reward}`
      );

      /*
       * Quest rewards affect the player's personality.
       */

      curiosityChange += 10;
      trustChange += 5;

      /*
       * Remove active quest.
       */

      activeQuest = null;
    }

    /*
     * --------------------------------
     * SAVE EVERYTHING
     * --------------------------------
     */

    const updatedMemory = updateMemory({
      trust: clamp(
        memory.trust + trustChange
      ),

      curiosity: clamp(
        memory.curiosity + curiosityChange
      ),

      fear: clamp(
        memory.fear + fearChange
      ),

      choices: [
        ...memory.choices,
        choice,
      ],

      memories,

      questsCompleted: completedQuests,

      activeQuest,

      relationship:
        trustChange >= 5
          ? "ally"
          : memory.relationship,
    });

    return Response.json(
      updatedMemory
    );
  } catch (error) {
    console.error(
      "Memory update error:",
      error
    );

    return Response.json(
      {
        error: "Failed to update memory",
      },
      {
        status: 500,
      }
    );
  }
}
