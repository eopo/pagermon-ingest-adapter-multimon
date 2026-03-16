import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'events';
import { createMockLogger } from '@pagermon/ingest-core/testing';

const spawnMock = vi.fn();
const createInterfaceMock = vi.fn();

vi.mock('child_process', () => ({
  spawn: (...args) => spawnMock(...args),
}));

vi.mock('readline', () => ({
  default: {
    createInterface: (...args) => createInterfaceMock(...args),
  },
}));

import MultimonNgDecoder from '../../../adapter/rtl-sdr-multimon-ng/decoder.js';

function createFakeProcess() {
  const proc = new EventEmitter();
  proc.stdin = new EventEmitter();
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.killed = false;
  proc.kill = vi.fn(() => {
    proc.killed = true;
  });
  return proc;
}

describe('MultimonNgDecoder.spawn', () => {
  beforeEach(() => {
    spawnMock.mockReset();
    createInterfaceMock.mockReset();
  });

  it('builds multimon-ng args including passthrough extra args', () => {
    const proc = createFakeProcess();
    spawnMock.mockReturnValue(proc);

    const stderrReader = new EventEmitter();
    createInterfaceMock.mockReturnValue(stderrReader);

    const decoder = new MultimonNgDecoder({
      protocols: ['POCSAG1200', 'FLEX'],
      charset: 'UTF-8',
      format: 'alpha',
      extraArgs: ['--label', 'test'],
      logger: createMockLogger(vi),
    });

    decoder.spawn();

    expect(spawnMock).toHaveBeenCalledWith(
      'multimon-ng',
      [
        '-a',
        'FLEX',
        '-a',
        'POCSAG1200',
        '-t',
        'raw',
        '-C',
        'UTF-8',
        '-f',
        'alpha',
        '--timestamp',
        '--iso8601',
        '--json',
        '-',
        '--label',
        'test',
      ],
      { stdio: ['pipe', 'pipe', 'pipe'] }
    );
  });

  it('does not pass -f when format is not configured', () => {
    const proc = createFakeProcess();
    spawnMock.mockReturnValue(proc);

    const stderrReader = new EventEmitter();
    createInterfaceMock.mockReturnValue(stderrReader);

    const decoder = new MultimonNgDecoder({
      protocols: ['POCSAG1200'],
      charset: 'UTF-8',
      logger: createMockLogger(vi),
    });

    decoder.spawn();

    expect(spawnMock).toHaveBeenCalledWith(
      'multimon-ng',
      ['-a', 'POCSAG1200', '-t', 'raw', '-C', 'UTF-8', '--timestamp', '--iso8601', '--json', '-'],
      { stdio: ['pipe', 'pipe', 'pipe'] }
    );
  });
});
