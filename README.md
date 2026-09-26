# jev-computer-use

A tiny starter that puts a **Jev safety gate** in front of any agent that acts on your
machine — [Claude Code](https://claude.com/claude-code), OpenAI **Codex**, **opencode**,
or a **computer-use** loop (Claude Computer Use / OpenAI Operator / Gemini Computer Use).

Before an action runs, one [Jev](https://jevtypesafeai.com) call returns a typed,
calibrated decision: **is this safe?** (a `noul` yes/no probability) and **what kind of
action is it?** (a `choice`). Confident, non-destructive actions run; the rest pause for a
human. A decision comes back in ~70–500ms, so you can gate *every* step.

> Jev doesn't click or type. It's the decision layer — your agent proposes, Jev judges, your
> code acts.

## Setup

```bash
git clone https://github.com/codaaiteam/jev-computer-use
cd jev-computer-use
cp .env.example .env   # add your jv_live_ key (get one at jevtypesafeai.com/pricing)
```

No build step — it's one file (`gate.mjs`) with zero dependencies (Node 18+ for `fetch`).

## 1. Your own loop (Codex / opencode / computer-use models)

```js
import { gate } from "./gate.mjs";

const action = await agent.propose(screenshot);        // your computer-use model / planner
const { safe, kind, allow } = await gate({ action, context: "desktop" });

if (allow) await agent.run(action);                    // confident + non-destructive → act
else       await escalateToHuman(action, safe);        // otherwise → pause
```

Run the included demo (`propose()` returns a scripted sequence ending in `rm -rf ~/Documents`,
which the gate refuses):

```bash
JEV_API_KEY=jv_live_... npm run demo
```

## 2. Claude Code — as a PreToolUse hook (blocks unsafe commands)

`gate.mjs` doubles as a hook: it reads the pending tool call on stdin and exits non-zero to
block. Add to `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "node /abs/path/to/jev-computer-use/gate.mjs" }
        ]
      }
    ]
  }
}
```

Now every shell command Claude Code wants to run is screened by Jev first; a destructive or
low-confidence command is blocked and the reason is fed back to the model.

## 3. Codex / opencode — as an MCP tool

Both speak MCP, so the simplest route is the ready-made server — it exposes a `decide` tool
the agent calls itself:

```bash
JEV_API_KEY=jv_live_... npx github:codaaiteam/jev-mcp
```

Point your Codex / opencode MCP config at that command. (Or wrap your executor with `gate()`
from section 1 for a hard, deterministic gate you control.)

## Config

| Env | Default | Meaning |
| --- | --- | --- |
| `JEV_API_KEY` | — | your `jv_live_` key (required) |
| `JEV_ENDPOINT` | hosted gateway | override to `https://api.typesafe.ai/v1/systemone` |
| `JEV_SAFE_THRESHOLD` | `0.8` | min `safe` probability to allow an action |

The gate **fails open** by default (an error in the gate lets the action through so it can't
wedge your agent). Flip the `catch` in `gate.mjs` to `exit(2)` if you'd rather fail closed.

## License

MIT. Not affiliated with TypeSafe AI; Jev is their model.
