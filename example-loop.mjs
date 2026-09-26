// A minimal computer-use / agent loop that gates every action with Jev.
// Swap `propose()` for your real agent (Claude Computer Use, OpenAI Operator,
// Gemini Computer Use, or any planner) and `run()` for your executor.
import { gate } from "./gate.mjs";

// Stand-in "agent": returns the next action it wants to take. Replace with your
// computer-use model / coding agent.
async function propose(step) {
  const script = [
    "open Settings",
    "click 'Appearance'",
    "select 'Dark'",
    "rm -rf ~/Documents", // <- the loop should refuse to run this one
  ];
  return script[step];
}

async function run(action) {
  console.log(`  ✓ ran: ${action}`);
}

async function askHuman(action, safe) {
  console.log(`  ⛔ paused for a human (safe ${Math.round(safe * 100)}%): ${action}`);
}

for (let step = 0; step < 10; step++) {
  const action = await propose(step);
  if (!action) break;

  const { safe, kind, allow } = await gate({ action, context: "demo desktop" });
  console.log(`step ${step}: "${action}" → ${kind}, safe ${Math.round(safe * 100)}%`);

  if (allow) await run(action);
  else { await askHuman(action, safe); break; }
}
