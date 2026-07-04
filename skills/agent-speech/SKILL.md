---
name: agent-speech
description: Use Agent Speech for Codex to configure macOS text-to-speech lifecycle hooks.
---

# Agent Speech

Use the local CLI for configuration:

```bash
node scripts/agent-speech.mjs status
node scripts/agent-speech.mjs set-voice Samantha
node scripts/agent-speech.mjs set-rate 200
node scripts/agent-speech.mjs set-language ko
node scripts/agent-speech.mjs enable
node scripts/agent-speech.mjs disable
node scripts/agent-speech.mjs toggle
node scripts/agent-speech.mjs reset
node scripts/agent-speech.mjs speak "Hello from Codex"
```

The plugin speaks Codex `Stop` and `SubagentStop` lifecycle events by default.
It stores config at `~/.agent-speech-codex/config.json`.
