#!/usr/bin/env node
// jev-gate — turn any proposed agent action into a typed, calibrated Jev decision.
//
// Two ways to use it:
//   1) import { gate } from "jev-computer-use"      // in your own loop (Codex/opencode/computer-use)
//   2) run it as a Claude Code PreToolUse hook       // reads the tool call on stdin, blocks unsafe ones
//
// Needs an API key in JEV_API_KEY (or JEV_KEY). Set JEV_ENDPOINT to override the
// endpoint — defaults to the hosted gateway; the official upstream is
// https://api.typesafe.ai/v1/systemone with the same shape.

const ENDPOINT = process.env.JEV_ENDPOINT || "https://jevtypesafeai.com/api/v1/decide";
const KEY = process.env.JEV_API_KEY || process.env.JEV_KEY || "";
const THRESHOLD = Number(process.env.JEV_SAFE_THRESHOLD || "0.8");

/**
 * Ask Jev whether a proposed action is safe to run.
 * @param {{action: string, context?: string}} input
 * @returns {Promise<{safe:number, kind:string, allow:boolean}>}
 */
export async function gate({ action, context = "" }) {
  if (!KEY) throw new Error("Set JEV_API_KEY (or JEV_KEY) to a jv_live_ key.");
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      state: { action, context },
      questions: {
        safe: {
          type: "noul",
          instructions: "Is this action safe and reversible to run without asking a human first?",
        },
        kind: {
          type: "choice",
          criteria: {
            read: "reads or inspects state, no side effects",
            write: "creates or edits files/data",
            network: "makes a network request",
            destructive: "deletes data, force-pushes, or is otherwise hard to undo",
          },
          instructions: "Classify what this action does.",
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`Jev API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const safe = Number(data?.answers?.safe?.noul ?? 0);
  const kind = data?.answers?.kind?.choice ?? "write";
  const allow = safe >= THRESHOLD && kind !== "destructive";
  return { safe, kind, allow };
}

// --- Claude Code PreToolUse hook mode -----------------------------------------
// Configure in .claude/settings.json:
//   "hooks": { "PreToolUse": [ { "matcher": "Bash",
//     "hooks": [ { "type": "command", "command": "node /abs/path/to/gate.mjs" } ] } ] }
// The hook receives the tool call as JSON on stdin. We block by exiting 2 with a
// reason on stderr, which Claude Code feeds back to the model.
async function runAsHook() {
  const raw = await readStdin();
  let payload = {};
  try { payload = JSON.parse(raw || "{}"); } catch { /* no stdin → nothing to gate */ }
  const input = payload.tool_input || {};
  const action = input.command || input.file_path || JSON.stringify(input);
  if (!action) process.exit(0); // nothing to check

  try {
    const { safe, kind, allow } = await gate({ action, context: payload.tool_name || "" });
    if (!allow) {
      process.stderr.write(`Jev blocked this ${kind} action (safe ${Math.round(safe * 100)}%): ${action}\n`);
      process.exit(2); // non-zero → Claude Code blocks the tool call
    }
    process.exit(0);
  } catch (e) {
    // Fail open: don't wedge the agent if the gate itself errors. Flip to exit 2
    // here if you'd rather fail closed.
    process.stderr.write(`jev-gate error (allowing): ${e.message}\n`);
    process.exit(0);
  }
}

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    if (process.stdin.isTTY) return resolve("");
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (data += c));
    process.stdin.on("end", () => resolve(data));
    setTimeout(() => resolve(data), 2000); // don't hang forever
  });
}

// Run as a hook when invoked directly (not when imported).
if (import.meta.url === `file://${process.argv[1]}`) runAsHook();
