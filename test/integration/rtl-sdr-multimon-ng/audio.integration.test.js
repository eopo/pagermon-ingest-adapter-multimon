import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { access } from 'fs/promises';
import { constants } from 'fs';
import { spawn } from 'child_process';
import { execSync } from 'child_process';
import path from 'path';
import http from 'http';
import { once } from 'events';
import MultimonNgDecoder from '../../../adapter/rtl-sdr-multimon-ng/decoder.js';
import ApiClient from '@pagermon/ingest-core/lib/core/ApiClient.js';

const SAMPLE_WAV_PATH = path.resolve('test/fixtures/pocsag1200.wav');

/**
 * Check if multimon-ng is available in PATH
 */
function isMultimonAvailable() {
  try {
    execSync('which multimon-ng', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function assertWavFixtureAvailable() {
  await access(SAMPLE_WAV_PATH, constants.R_OK);
}

function runProcess(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to spawn ${command}: ${err.message}`));
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${command} exited with code ${code}: ${stderr}`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function decodeWithMultimon(wavPath) {
  return runProcess('multimon-ng', [
    '-t',
    'wav',
    '-a',
    'POCSAG1200',
    '-f',
    'alpha',
    '--timestamp',
    '--iso8601',
    '--json',
    wavPath,
  ]);
}

describe('multimon-ng audio integration', () => {
  let server;
  let baseUrl;
  let receivedRequest;

  beforeAll(async () => {
    server = http.createServer(async (req, res) => {
      if (req.url === '/api/messages' && req.method === 'POST') {
        let body = '';
        for await (const chunk of req) {
          body += chunk.toString();
        }

        receivedRequest = {
          method: req.method,
          url: req.url,
          apiKey: req.headers['apikey'],
          payload: JSON.parse(body || '{}'),
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ accepted: true }));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    });

    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    if (!server) return;
    server.close();
    await once(server, 'close');
  });

  it('decodes pocsag1200.wav and submits the expected API payload', async () => {
    if (!isMultimonAvailable()) {
      console.log('[SKIP] multimon-ng not found in PATH');
      return;
    }

    await assertWavFixtureAvailable();

    const output = await decodeWithMultimon(SAMPLE_WAV_PATH);
    const combinedOutput = `${output.stdout}\n${output.stderr}`.trim();
    expect(combinedOutput.length).toBeGreaterThan(0);

    const decoder = new MultimonNgDecoder({ protocols: ['POCSAG1200'] });
    const firstJsonLine = combinedOutput
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.startsWith('{') && line.endsWith('}'));

    expect(firstJsonLine).toBeTruthy();
    const rawDecoded = JSON.parse(firstJsonLine);
    expect(rawDecoded.demod_name).toBe('POCSAG1200');
    expect(rawDecoded.address).toBe(123456);
    expect(rawDecoded.function).toBe(3);
    expect(rawDecoded.alpha).toBe('ALPHA123');

    const message = decoder.parseLine(firstJsonLine, 'audio-integration');
    expect(message).not.toBeNull();

    const client = new ApiClient({ url: baseUrl, apiKey: 'audio-test-key' });
    const result = await client.submitMessage(message);

    expect(result.accepted).toBe(true);
    expect(receivedRequest).toBeDefined();
    expect(receivedRequest.method).toBe('POST');
    expect(receivedRequest.url).toBe('/api/messages');
    expect(receivedRequest.apiKey).toBe('audio-test-key');

    // Verify decoder -> Message -> API payload transformation
    expect(receivedRequest.payload.address).toBe(`${rawDecoded.address}${rawDecoded.function}`);
    expect(receivedRequest.payload.message).toBe(rawDecoded.alpha.trim());
    expect(receivedRequest.payload.format).toBe('alpha');
    expect(receivedRequest.payload.source).toBe('audio-integration');
    expect(receivedRequest.payload.time).toBe(rawDecoded.timestamp);
    expect(receivedRequest.payload.timestamp).toBe(Math.floor(new Date(rawDecoded.timestamp).getTime() / 1000));
  }, 30000);
});
