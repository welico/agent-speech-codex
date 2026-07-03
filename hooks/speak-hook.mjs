#!/usr/bin/env node
import { readStdin, runHook } from '../lib/agent-speech.mjs';

const eventName = process.argv[2] || 'Stop';
const stdin = await readStdin(process.stdin);

await runHook(eventName, stdin);
