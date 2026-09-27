# GHOSTMIND

### Adaptive AI Narrative Game

GHOSTMIND is a cinematic AI narrative game where the world remembers the player.

Instead of following one fixed script, players interact with NOVA, an AI companion whose dialogue, quests, relationship state and story direction adapt to player decisions.

## Core idea

**The AI does not just generate dialogue. It generates a persistent game state.**

Player decisions are stored and used to influence:

- NOVA's future dialogue
- Trust, curiosity and fear
- Story path
- Active quests
- World interactions
- Memory fragments
- Final ending

## Gameplay loop

```text
Dialogue
   ↓
Player decision
   ↓
Persistent memory
   ↓
AI-generated quest
   ↓
World interaction
   ↓
Quest completion
   ↓
Reward + memory fragment
   ↓
New story state
   ↓
Ending
```

## Story paths

The player can naturally move toward three campaign directions:

- **TRUTH** — uncover why the facility existed and why NOVA's directives were altered.
- **TRUST** — build a partnership with NOVA and decide what should survive.
- **ESCAPE** — find a way out and decide what should be left behind.

Each campaign contains three major quests and an ending.

## Tech stack

- Next.js
- React
- TypeScript
- Gemini API via `@google/genai`
- File-based persistent game memory
- Next.js API routes

## AI architecture

The browser never talks directly to Gemini. The client sends gameplay decisions to `/api/chat`.

The server:

1. Loads persistent player memory.
2. Sends memory + the latest decision to Gemini.
3. Receives structured JSON for dialogue, choices and optional quest generation.
4. Preserves any existing active quest.
5. Saves the resulting memory to disk.

World actions are handled separately by `/api/world`, which validates the player's location and required action before completing a quest.

## Local setup

```bash
npm install
```

Create `.env.local`:

```env
GEMINI_API_KEY=your_key_here
```

Run:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Reset the campaign

Use the in-game reset button or:

```bash
curl -X POST http://localhost:3000/api/reset
```

## Security

Never commit `.env.local` or expose the Gemini API key in the browser.

## Hackathon pitch

GHOSTMIND turns generative AI into a gameplay system rather than a chat feature. NOVA remembers the player's decisions, the world validates physical actions, quests alter persistent state, and the story resolves through branching paths. The result is a game where the same AI system can create a different narrative experience from player to player.
