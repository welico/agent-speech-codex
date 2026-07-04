# agent-speech-codex

macOS text-to-speech hooks for Codex.

This is the Codex hook version of `agent-speech-claude-code`. It uses Codex
plugin packaging (`.codex-plugin/plugin.json`) and Codex lifecycle hooks instead
of a Claude Code MCP server.

## What It Does

- Speaks the last Codex assistant response when a turn stops.
- Speaks subagent completion text when available.
- Uses the native macOS `say` command.
- Runs in the background and never blocks Codex.
- Keeps config in `~/.agent-speech-codex/config.json`.

## Plugin Layout

```text
.codex-plugin/plugin.json   Codex plugin manifest
hooks/hooks.json            Codex lifecycle hook config
hooks.json                  Codex plugin hook discovery file
hooks/speak-hook.mjs        Hook entrypoint
scripts/agent-speech.mjs    Small CLI for config and manual tests
lib/agent-speech.mjs        Shared TTS and hook logic
commands/agent-speech.md    Slash command prompt
skills/agent-speech/SKILL.md
```

## Install From Marketplace

Add this repository as a Codex marketplace, then install the plugin:

```bash
codex plugin marketplace add https://github.com/welico/agent-speech-codex
codex plugin add agent-speech-codex@welico
```

The marketplace registers as `welico`. Codex loads the root `hooks.json` from
the enabled plugin.

## CLI

```bash
node scripts/agent-speech.mjs init
node scripts/agent-speech.mjs status
node scripts/agent-speech.mjs set-voice Samantha
node scripts/agent-speech.mjs set-rate 200
node scripts/agent-speech.mjs set-volume 50
node scripts/agent-speech.mjs set-language ko
node scripts/agent-speech.mjs enable
node scripts/agent-speech.mjs disable
node scripts/agent-speech.mjs toggle
node scripts/agent-speech.mjs reset
node scripts/agent-speech.mjs speak "Hello from Codex"
node scripts/agent-speech.mjs list-voices
```

After plugin installation, Codex also exposes `/agent-speech` as a slash
command:

```text
/agent-speech speak 안녕하세요.
/agent-speech status
/agent-speech set-language ko
```

## Config

```json
{
  "version": "0.1.1",
  "enabled": true,
  "voice": "Samantha",
  "language": "en",
  "rate": 200,
  "volume": 50,
  "minLength": 1,
  "maxLength": 500,
  "filters": {
    "sensitive": false,
    "skipCodeBlocks": true,
    "skipCommands": true
  },
  "events": {
    "Stop": true,
    "SubagentStop": true,
    "SessionEnd": false,
    "PermissionRequest": false
  },
  "summary": {
    "mode": "first-paragraph",
    "maxChars": 500,
    "fallback": "Codex turn completed."
  }
}
```

## Test

```bash
npm test
```
