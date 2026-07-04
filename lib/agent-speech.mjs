import { spawn, spawnSync } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';

export const defaultConfig = Object.freeze({
  version: '0.1.1',
  enabled: true,
  voice: 'Samantha',
  language: 'en',
  rate: 200,
  volume: 50,
  minLength: 1,
  maxLength: 500,
  filters: {
    sensitive: false,
    skipCodeBlocks: true,
    skipCommands: true,
  },
  events: {
    Stop: true,
    SubagentStop: true,
    SessionEnd: false,
    PermissionRequest: false,
  },
  summary: {
    mode: 'first-paragraph',
    maxChars: 500,
    fallback: 'Codex turn completed.',
  },
});

export const supportedLanguages = Object.freeze({
  en: 'Samantha',
  ko: 'Yuna',
  ja: 'Kyoko',
  'zh-CN': 'Tingting',
  es: 'Monica',
  fr: 'Thomas',
  de: 'Anna',
  it: 'Alice',
});

const sensitivePatterns = [
  /(?:api[\s_-]?key|apikey|api-key)['":\s=]*([a-zA-Z0-9_\-]{20,})/gi,
  /(?:password|passwd|pwd)['":\s=]*([^\s,;]{6,})/gi,
  /(?:token|bearer|auth)['":\s=]*([a-zA-Z0-9._\-]{20,})/gi,
  /(?:secret|private[_-]?key|privatekey)['":\s=]*([a-zA-Z0-9_\-]{20,})/gi,
  /AKIA[0-9A-Z]{16}/g,
];

export function configPath() {
  return process.env.AGENT_SPEECH_CONFIG || join(homedir(), '.agent-speech-codex', 'config.json');
}

export async function readStdin(stream) {
  let input = '';
  for await (const chunk of stream) input += chunk;
  return input;
}

export async function loadConfig() {
  try {
    const parsed = JSON.parse(await readFile(configPath(), 'utf8'));
    return mergeConfig(parsed);
  } catch {
    return mergeConfig({});
  }
}

export async function saveConfig(config) {
  const next = mergeConfig(config);
  await mkdir(dirname(configPath()), { recursive: true });
  await writeFile(configPath(), `${JSON.stringify(next, null, 2)}\n`, 'utf8');
}

export function mergeConfig(config) {
  return {
    ...defaultConfig,
    ...config,
    language: validateLanguage(config.language ?? defaultConfig.language),
    rate: validateRate(Number(config.rate ?? defaultConfig.rate)),
    volume: validateVolume(Number(config.volume ?? defaultConfig.volume)),
    minLength: validateLength(Number(config.minLength ?? defaultConfig.minLength)),
    maxLength: validateLength(Number(config.maxLength ?? defaultConfig.maxLength)),
    filters: { ...defaultConfig.filters, ...(config.filters || {}) },
    events: { ...defaultConfig.events, ...(config.events || {}) },
    summary: { ...defaultConfig.summary, ...(config.summary || {}) },
  };
}

export function validateLanguage(language) {
  if (!Object.hasOwn(supportedLanguages, language)) {
    throw new Error(`language must be one of: ${Object.keys(supportedLanguages).join(', ')}`);
  }
  return language;
}

export function validateRate(rate) {
  if (!Number.isInteger(rate) || rate < 50 || rate > 400) {
    throw new Error('rate must be an integer from 50 to 400');
  }
  return rate;
}

export function validateLength(length) {
  if (!Number.isInteger(length) || length < 0) {
    throw new Error('length must be a non-negative integer');
  }
  return length;
}

export function validateVolume(volume) {
  if (!Number.isInteger(volume) || volume < 0 || volume > 100) {
    throw new Error('volume must be an integer from 0 to 100');
  }
  return volume;
}

export async function runHook(eventName, rawInput) {
  try {
    const config = await loadConfig();
    if (!config.enabled || !config.events[eventName]) return;

    const input = parseHookInput(rawInput);
    const text = await textForEvent(eventName, input, config);
    await speakText(text, config);
  } catch (error) {
    if (process.env.AGENT_SPEECH_DEBUG) console.error(error);
  }
}

export function parseHookInput(rawInput) {
  if (!rawInput.trim()) return {};
  try {
    return JSON.parse(rawInput);
  } catch {
    return { text: rawInput };
  }
}

export async function textForEvent(eventName, input, config = defaultConfig) {
  if (eventName === 'SessionEnd') return 'Codex session ended.';
  if (eventName === 'PermissionRequest') return permissionText(input);

  const direct = directText(input);
  const transcript = await transcriptText(input.transcript_path || input.transcriptPath);
  return summarize(direct || transcript || config.summary.fallback, config.summary);
}

function permissionText(input) {
  const tool = input.tool_name || input.toolName || input.tool || input.name || 'a tool';
  return `Codex is requesting permission to use ${tool}.`;
}

function directText(input) {
  const candidates = [
    input.response,
    input.message,
    input.text,
    input.summary,
    input.output,
    input.result,
    input.assistant_response,
    input.assistantResponse,
  ];
  for (const candidate of candidates) {
    const text = contentText(candidate);
    if (text) return text;
  }
  return '';
}

async function transcriptText(path) {
  if (!path) return '';

  let last = '';
  try {
    const lines = createInterface({ input: createReadStream(path, 'utf8'), crlfDelay: Infinity });
    for await (const line of lines) {
      const parsed = parseJsonLine(line);
      if (!parsed) continue;

      const role = messageRole(parsed);
      const text = contentText(messageContent(parsed));
      if (text && (role === 'assistant' || parsed.type === 'assistant_message')) {
        last = text;
      }
    }
  } catch {
    return '';
  }
  return last;
}

function parseJsonLine(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function messageRole(entry) {
  return (
    entry.role ||
    entry.message?.role ||
    entry.payload?.role ||
    entry.payload?.message?.role ||
    entry.type
  );
}

function messageContent(entry) {
  return (
    entry.content ??
    entry.message?.content ??
    entry.payload?.content ??
    entry.payload?.message?.content ??
    entry.text ??
    entry.payload?.text
  );
}

function contentText(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(contentText).filter(Boolean).join('\n');
  if (typeof value === 'object') return contentText(value.text || value.content || value.message);
  return '';
}

export function summarize(text, options = defaultConfig.summary) {
  let cleaned = stripMarkdown(String(text || ''));
  const mode = options.mode || 'first-paragraph';

  if (mode === 'first-sentence') {
    cleaned = cleaned.match(/^[\s\S]*?[.!?](?:\s|$)/)?.[0] || cleaned;
  } else if (mode === 'first-paragraph') {
    cleaned = cleaned.split(/\n\s*\n/)[0] || cleaned;
  }

  return clampText(cleaned, options.maxChars || 500);
}

export function filterText(text, config) {
  if (!text || !text.trim()) return '';
  if (config.minLength > 0 && text.length < config.minLength) return '';
  if (config.maxLength > 0 && text.length > config.maxLength) return '';

  let next = text;
  if (config.filters.sensitive) next = filterSensitive(next);
  if (config.filters.skipCodeBlocks) next = removeCodeBlocks(next);
  if (config.filters.skipCommands) next = removeCommandOutput(next);
  return cleanupWhitespace(next);
}

export async function speakText(text, config) {
  const filtered = filterText(text, config);
  if (!filtered || process.platform !== 'darwin') return false;

  const child = spawn('say', ['-v', config.voice, '-r', String(config.rate), filtered], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  return true;
}

export async function listVoices() {
  if (process.platform !== 'darwin') return [];
  const result = spawnSync('say', ['-v', '?'], { encoding: 'utf8' });
  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function stripMarkdown(text) {
  return cleanupWhitespace(
    text
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^[>*\-+]\s+/gm, '')
      .replace(/\*\*|__/g, ''),
  );
}

function filterSensitive(text) {
  return sensitivePatterns.reduce((next, pattern) => next.replace(pattern, '[redacted]'), text);
}

function removeCodeBlocks(text) {
  return text.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`]+`/g, ' ');
}

function removeCommandOutput(text) {
  return text
    .replace(/^[\s]*[>$]\s+.+$/gm, ' ')
    .replace(/^\s*(BUILD|FAILED|SUCCESS|INFO|DEBUG|WARN|ERROR)\b.*$/gim, ' ');
}

function cleanupWhitespace(text) {
  return text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function clampText(text, maxChars) {
  if (!maxChars || text.length <= maxChars) return text;
  const sliced = text.slice(0, maxChars);
  return `${sliced.replace(/\s+\S*$/, '') || sliced}...`;
}
