# /agent-speech

Manage Agent Speech for Codex.

## Arguments

- `command`: `status`, `speak`, `enable`, `disable`, `toggle`, `reset`, `set-voice`, `set-rate`, `set-volume`, `set-language`, `set-min-length`, `set-max-length`, `sensitive`, `skip-code`, `skip-commands`, `list-voices`, or `init`
- `args`: command arguments

## Commands

- `/agent-speech status`: Check the current status and configuration.
- `/agent-speech speak <text>`: Speak the specified text.
- `/agent-speech enable`: Enable text-to-speech output.
- `/agent-speech disable`: Disable text-to-speech output.
- `/agent-speech toggle`: Toggle speech output on or off.
- `/agent-speech reset`: Reset speech settings to defaults.
- `/agent-speech set-voice <name>`: Set the voice to use.
- `/agent-speech set-rate <50-400>`: Set the speech rate.
- `/agent-speech set-volume <0-100>`: Set the stored audio volume preference.
- `/agent-speech set-language <code>`: Set language and its default voice. Supported: `en`, `ko`, `ja`, `zh-CN`, `es`, `fr`, `de`, `it`.
- `/agent-speech list-voices`: List all available system voices.

## Workflow

1. If no command is provided, use `status`.
2. If `scripts/agent-speech.mjs` exists in the current repository, run `node scripts/agent-speech.mjs <command> <args...>`.
3. Otherwise, run `agent-speech-codex <command> <args...>` if the plugin bin is available on `PATH`.
4. If the bin is not available, locate the installed `agent-speech-codex` plugin root and run `node <plugin-root>/scripts/agent-speech.mjs <command> <args...>`.
5. For `/agent-speech speak <text>`, pass the remaining text as the speech text.
6. Report the command result briefly.
