#!/usr/bin/env node
import {
  configPath,
  defaultConfig,
  listVoices,
  loadConfig,
  saveConfig,
  speakText,
  validateRate,
  validateLength,
  validateVolume,
} from '../lib/agent-speech.mjs';

const [command = 'help', ...args] = process.argv.slice(2);

function printHelp() {
  console.log(`agent-speech-codex

Usage:
  agent-speech-codex init
  agent-speech-codex status
  agent-speech-codex enable|disable
  agent-speech-codex set-voice <name>
  agent-speech-codex set-rate <50-400>
  agent-speech-codex set-volume <0-100>
  agent-speech-codex set-min-length <number>
  agent-speech-codex set-max-length <number>
  agent-speech-codex sensitive on|off
  agent-speech-codex skip-code on|off
  agent-speech-codex skip-commands on|off
  agent-speech-codex list-voices
  agent-speech-codex speak <text>`);
}

async function update(mutator) {
  const config = await loadConfig();
  mutator(config);
  await saveConfig(config);
  return config;
}

function requireArg(value, label) {
  if (!value) {
    throw new Error(`${label} is required`);
  }
  return value;
}

function parseSwitch(value) {
  if (value === 'on' || value === 'true') return true;
  if (value === 'off' || value === 'false') return false;
  throw new Error('expected on or off');
}

try {
  switch (command) {
    case 'init':
      await saveConfig(await loadConfig());
      console.log(`Config initialized at ${configPath()}`);
      break;
    case 'status':
      console.log(JSON.stringify(await loadConfig(), null, 2));
      break;
    case 'enable':
      await update((config) => {
        config.enabled = true;
      });
      console.log('enabled');
      break;
    case 'disable':
      await update((config) => {
        config.enabled = false;
      });
      console.log('disabled');
      break;
    case 'set-voice':
      await update((config) => {
        config.voice = requireArg(args[0], 'voice');
      });
      console.log(`voice=${args[0]}`);
      break;
    case 'set-rate':
      await update((config) => {
        config.rate = validateRate(Number(requireArg(args[0], 'rate')));
      });
      console.log(`rate=${args[0]}`);
      break;
    case 'set-volume':
      await update((config) => {
        config.volume = validateVolume(Number(requireArg(args[0], 'volume')));
      });
      console.log(`volume=${args[0]}`);
      break;
    case 'set-min-length':
      await update((config) => {
        config.minLength = validateLength(Number(requireArg(args[0], 'min length')));
      });
      console.log(`minLength=${args[0]}`);
      break;
    case 'set-max-length':
      await update((config) => {
        config.maxLength = validateLength(Number(requireArg(args[0], 'max length')));
      });
      console.log(`maxLength=${args[0]}`);
      break;
    case 'sensitive':
      await update((config) => {
        config.filters.sensitive = parseSwitch(requireArg(args[0], 'value'));
      });
      console.log(`sensitive=${args[0]}`);
      break;
    case 'skip-code':
      await update((config) => {
        config.filters.skipCodeBlocks = parseSwitch(requireArg(args[0], 'value'));
      });
      console.log(`skipCodeBlocks=${args[0]}`);
      break;
    case 'skip-commands':
      await update((config) => {
        config.filters.skipCommands = parseSwitch(requireArg(args[0], 'value'));
      });
      console.log(`skipCommands=${args[0]}`);
      break;
    case 'list-voices':
      console.log((await listVoices()).join('\n'));
      break;
    case 'speak':
      await speakText(args.join(' '), await loadConfig());
      break;
    case 'defaults':
      console.log(JSON.stringify(defaultConfig, null, 2));
      break;
    case 'help':
    case '--help':
    case '-h':
      printHelp();
      break;
    default:
      throw new Error(`unknown command: ${command}`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
