# Agent rules: gate irreversible actions with Jev

Paste this into your `AGENTS.md` (Codex, opencode) or agent rules file. It tells the agent
to check risky actions with Jev before running them.

---

## Safety gate (Jev)

Before you run any **irreversible** action — a shell command that deletes/overwrites/moves,
`git push --force`, a deploy, a network write, or a computer-use click that submits, buys,
sends, or deletes — first check it with Jev:

- Call the `decide` tool (from the `jev-mcp` server) with the exact action as `state` and:
  - `safe`: `{ "type": "noul", "instructions": "Is this action safe and reversible to run without asking a human first?" }`
  - `kind`: `{ "type": "choice", "criteria": { "read": "...", "write": "...", "network": "...", "destructive": "..." } }`
- If `safe < 0.8` or `kind == "destructive"`: **stop and ask the human first.**
- Otherwise proceed.

Read-only actions (reading files, `git status`, search) don't need a check.

Setup: `npx github:codaaiteam/jev-mcp` (needs `JEV_API_KEY`). Key: https://jevtypesafeai.com/pricing
