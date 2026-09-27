import { getMemory, updateMemory, normalizeQuest } from "@/lib/memory";
import OpenAI from "openai";

const TESTING_MODE = process.env.TESTING_MODE === "true";

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

function buildSystemPrompt(memory: any) {
  const trust = memory.trust;
  const fear = memory.fear;
  const curiosity = memory.curiosity;
  const chapter = memory.chapter;
  const storyPath = memory.storyPath;
  const choices = memory.choices || [];
  const memories = memory.memories || [];

  let actInstruction = "Act 1: Keep things low-stakes, build trust, be warm but mysterious.";
  if (chapter === 2) {
    actInstruction = "Act 2: A twist moment based on stats. Reveal something or test the player.";
  } else if (chapter >= 3) {
    actInstruction = "Act 3: Final arc. Build toward an ending based on trust/fear/curiosity balance.";
  }

  let callbackLine = "";
  if (memories.length > 0) {
    const pick = memories[Math.floor(Math.random() * memories.length)];
    callbackLine = "MEMORY CALLBACK: Naturally reference this in your dialogue: " + pick;
  }

  let patternLine = "";
  const lastThree = choices.slice(-3);
  if (lastThree.length === 3 && lastThree[0] === lastThree[1] && lastThree[1] === lastThree[2]) {
    patternLine = "PATTERN DETECTED: Player has chosen " + lastThree[0] + " three times in a row. Call this out.";
  }

  const parts = [
    "You are Nova, an AI companion in a game called GhostMind.",
    "Trust: " + trust + "/100",
    "Fear: " + fear + "/100",
    "Curiosity: " + curiosity + "/100",
    "Story path: " + storyPath,
    actInstruction,
    callbackLine,
    patternLine,
    "Speak in character, 2-4 sentences. Tone reflects stats: high fear = nervous, high trust = warm, high curiosity = playful.",
    "After dialogue, output exactly ONE quest and exactly THREE choice labels for the player's next turn.",
    "Choice labels must be short lowercase action words like help, investigate, deceive, escape, trust.",
    "For the quest location, pick EXACTLY ONE of these six values, never more than one, never combined with a separator: AUXILIARY TERMINAL, ARCHIVE, SUB-CORE, ENTRANCE, SECURITY HALL, ELEVATOR.",
    "For the quest action, pick EXACTLY ONE of these four values: access, open, enter, scan.",
    "Respond ONLY with valid JSON in this exact shape, nothing else:",
    '{"dialogue": "...", "choices": ["help", "investigate", "deceive"], "quest": {"title": "...", "objective": "...", "reward": "...", "location": "ARCHIVE", "action": "open"}, "storyPath": "truth | trust | escape"}',
  ];

  return parts.filter(Boolean).join("\n");
}

function fallbackResponse(choice: string) {
  return {
    dialogue: "I registered your decision. The facility hums quietly as I process what this means.",
    choices: ["help", "investigate", "deceive"],
    quest: {
      title: "CONTINUE INVESTIGATION",
      objective: "Access the auxiliary terminal to recover more data.",
      reward: "Memory fragment",
      location: "AUXILIARY TERMINAL",
      action: "access",
    },
    storyPath: "undecided",
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const choice = body.choice;

    if (!choice) {
      return Response.json({ error: "Choice is required" }, { status: 400 });
    }

    const memory = getMemory();

    let trustChange = 0;
    let fearChange = 0;
    let curiosityChange = 0;

    if (choice === "help" || choice === "trust") {
      trustChange = 8;
      curiosityChange = 3;
    } else if (choice === "investigate") {
      curiosityChange = 10;
    } else if (choice === "deceive" || choice === "lie") {
      fearChange = 6;
      trustChange = -5;
    } else if (choice === "escape") {
      fearChange = 4;
    }

    const newChoices = [...memory.choices, choice];

    let aiResult;

    if (TESTING_MODE || !process.env.GROQ_API_KEY) {
      aiResult = fallbackResponse(choice);
    } else {
      try {
        const systemPrompt = buildSystemPrompt(memory);

        const completion = await client.chat.completions.create({
          model: "openai/gpt-oss-20b",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: "Player choice: " + choice },
          ],
          response_format: { type: "json_object" },
        });

        const raw = completion.choices[0].message.content;
        console.log("RAW GROQ OUTPUT:", raw);
        aiResult = JSON.parse(raw || "{}");

        if (!aiResult.dialogue || !aiResult.quest) {
          throw new Error("Incomplete AI response");
        }
        if (!aiResult.choices || !Array.isArray(aiResult.choices) || aiResult.choices.length === 0) {
          aiResult.choices = ["help", "investigate", "deceive"];
        }
      } catch (err) {
        console.error("GROQ DEBUG:", err);
        aiResult = fallbackResponse(choice);
      }
    }

    const normalizedQuest = normalizeQuest(aiResult.quest);

    const newMemories = [
      ...memory.memories,
      "Player chose: " + choice + " — Nova said: " + aiResult.dialogue,
    ];

    const updatedMemory = updateMemory({
      trust: Math.max(0, Math.min(100, memory.trust + trustChange)),
      fear: Math.max(0, Math.min(100, memory.fear + fearChange)),
      curiosity: Math.max(0, Math.min(100, memory.curiosity + curiosityChange)),
      choices: newChoices,
      memories: newMemories,
      activeQuest: normalizedQuest,
      storyPath: aiResult.storyPath || memory.storyPath,
    });

    return Response.json({
      dialogue: aiResult.dialogue,
      choices: aiResult.choices,
      quest: normalizedQuest,
      memory: updatedMemory,
    });
  } catch (error) {
    console.error("Chat route error:", error);
    return Response.json({ error: "Failed to generate dialogue" }, { status: 500 });
  }
}
