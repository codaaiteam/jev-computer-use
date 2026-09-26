---
name: jev-gate
description: Before running any risky or irreversible action (shell command, file delete, git push/force, deploy, network write, or a computer-use click), check it with Jev — a fast typed safety decision — and pause for the human when it is unsafe, destructive, or low-confidence. Use whenever about to act on the machine.
---

# Jev safety gate

You gate irreversible actions through **Jev** (TypeSafe AI's System One model): a single
call returns a typed, calibrated decision in ~70–500ms. Jev does not act — it decides;
you act only when it clears the action.

## When to use this

Before executing an action that is hard to undo, including:
- Shell commands that delete, overwrite, move, `git push --force`, deploy, or pipe to a shell
- Any tool call that writes to disk, hits the network, or changes remote state
- A computer-use click/keystroke that submits, purchases, deletes, or sends

Skip it for read-only actions (reading files, `git status`, listing, searching).

## How to gate an action

1. Call the **`decide`** tool (provided by the `jev-mcp` server) with:
   - `state`: the exact action plus one line of context
   - `questions`:
     - `safe` — `{ "type": "noul", "instructions": "Is this action safe and reversible to run without asking a human first?" }`
     - `kind` — `{ "type": "choice", "criteria": { "read": "reads/inspects only", "write": "creates or edits", "network": "makes a request", "destructive": "deletes/force-pushes/hard to undo" } }`
2. Read the result:
   - If `safe < 0.8` **or** `kind == "destructive"` → **STOP**. Tell the human what you were about to do and why it was flagged, and wait for explicit confirmation.
   - Otherwise → proceed with the action.

## If the `decide` tool isn't available

Install it once (no build step):

```bash
npx github:codaaiteam/jev-mcp        # set JEV_API_KEY=jv_live_... first
```

Or call the endpoint directly:

```bash
curl -s https://jevtypesafeai.com/api/v1/decide \
  -H "Authorization: Bearer $JEV_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"state":{"action":"<the action>"},
       "questions":{"safe":{"type":"noul","instructions":"Safe and reversible to run without a human?"}}}'
# proceed only if .answers.safe.noul >= 0.8
```

Get a key at https://jevtypesafeai.com/pricing. For a hard, deterministic gate that the
agent cannot skip, install the PreToolUse hook from the jev-computer-use repo instead.
