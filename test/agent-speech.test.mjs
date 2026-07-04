import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  defaultConfig,
  filterText,
  parseHookInput,
  summarize,
  textForEvent,
  validateLanguage,
  validateRate,
} from '../lib/agent-speech.mjs';

test('filters short, code, command, and sensitive text', () => {
  const config = {
    ...defaultConfig,
    minLength: 0,
    filters: { sensitive: true, skipCodeBlocks: true, skipCommands: true },
  };

  const text = 'API key: sk-12345678901234567890\n```js\nsecret()\n```\nSUCCESS done\nKeep this.';
  const result = filterText(text, config);

  assert.equal(result.includes('sk-12345678901234567890'), false);
  assert.equal(result.includes('secret()'), false);
  assert.equal(result.includes('SUCCESS'), false);
  assert.equal(result.includes('Keep this.'), true);
});

test('extracts last assistant message from transcript_path', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'agent-speech-'));
  const transcript = join(dir, 'transcript.jsonl');
  await writeFile(
    transcript,
    [
      JSON.stringify({ role: 'assistant', content: [{ type: 'text', text: 'first' }] }),
      JSON.stringify({ role: 'user', content: 'ignore me' }),
      JSON.stringify({ message: { role: 'assistant', content: [{ type: 'text', text: 'last answer' }] } }),
    ].join('\n'),
  );

  const text = await textForEvent('Stop', { transcript_path: transcript }, defaultConfig);
  assert.equal(text, 'last answer');
});

test('extracts last assistant message from Codex response_item transcript', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'agent-speech-'));
  const transcript = join(dir, 'codex-transcript.jsonl');
  await writeFile(
    transcript,
    [
      JSON.stringify({
        type: 'response_item',
        payload: {
          type: 'message',
          role: 'assistant',
          content: [{ type: 'output_text', text: 'codex first' }],
        },
      }),
      JSON.stringify({
        type: 'response_item',
        payload: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text: 'ignore me' }],
        },
      }),
      JSON.stringify({
        type: 'response_item',
        payload: {
          type: 'message',
          role: 'assistant',
          content: [{ type: 'output_text', text: 'codex last answer' }],
        },
      }),
    ].join('\n'),
  );

  const text = await textForEvent('Stop', { transcript_path: transcript }, defaultConfig);
  assert.equal(text, 'codex last answer');
});

test('parses raw stdin fallback and validates rate', () => {
  assert.deepEqual(parseHookInput('plain text'), { text: 'plain text' });
  assert.throws(() => validateRate(401), /rate/);
  assert.equal(validateLanguage('ko'), 'ko');
  assert.throws(() => validateLanguage('pt'), /language/);
});

test('summarizes first paragraph with max chars', () => {
  assert.equal(summarize('One paragraph.\n\nTwo paragraph.', { mode: 'first-paragraph', maxChars: 200 }), 'One paragraph.');
  assert.equal(summarize('abcdef ghi', { mode: 'full', maxChars: 6 }), 'abcdef...');
});
