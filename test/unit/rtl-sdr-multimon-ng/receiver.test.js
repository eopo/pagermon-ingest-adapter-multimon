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

import RtlSdrReceiver from '../../../adapter/rtl-sdr-multimon-ng/receiver.js';

function createFakeProcess() {
  const proc = new EventEmitter();
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.killed = false;
  proc.kill = vi.fn(() => {
    proc.killed = true;
  });
  return proc;
}

describe('RtlSdrReceiver', () => {
  beforeEach(() => {
    spawnMock.mockReset();
    createInterfaceMock.mockReset();
  });

  it('builds rtl_fm arguments including optional device tuning parameters', () => {
    const proc = createFakeProcess();
    spawnMock.mockReturnValue(proc);

    const stderrReader = new EventEmitter();
    createInterfaceMock.mockReturnValue(stderrReader);

    const receiver = new RtlSdrReceiver({
      frequencies: [172.5, 173.1],
      gain: 25,
      squelch: 5,
      ppm: 1,
      device: 2,
      sampleRate: '24000',
      extraArgs: ['-M', 'fm'],
      logger: createMockLogger(vi),
    });

    receiver.spawn();

    expect(spawnMock).toHaveBeenCalledWith(
      'rtl_fm',
      [
        '-s',
        '24000',
        '-f',
        '172.5',
        '-f',
        '173.1',
        '-g',
        '25',
        '-p',
        '1',
        '-l',
        '5',
        '-d',
        '2',
        '-E',
        'dc',
        '-F',
        '0',
        '-A',
        'fast',
        '-M',
        'fm',
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );
  });

  it('exits on spawn error and non-zero status line (device loss path)', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`exit:${code}`);
    });

    const proc = createFakeProcess();
    spawnMock.mockReturnValue(proc);

    const stderrReader = new EventEmitter();
    createInterfaceMock.mockReturnValue(stderrReader);

    const receiver = new RtlSdrReceiver({ frequencies: [172.5], logger: createMockLogger(vi) });
    receiver.spawn();

    expect(() => {
      proc.emit('error', new Error('No supported devices found'));
    }).toThrow('exit:1');

    expect(() => {
      stderrReader.emit('line', 'status: 3');
    }).toThrow('exit:3');

    exitSpy.mockRestore();
  });

  it('reports running state and stream access behavior', () => {
    const receiver = new RtlSdrReceiver({ frequencies: [172.5], logger: createMockLogger(vi) });

    expect(receiver.isRunning()).toBeFalsy();
    expect(() => receiver.getOutputStream()).toThrow('rtl_fm not running');

    receiver.process = { killed: false, stdout: new EventEmitter(), kill: vi.fn() };
    expect(receiver.isRunning()).toBe(true);
    expect(receiver.getOutputStream()).toBe(receiver.process.stdout);

    receiver.kill();
    expect(receiver.process.kill).toHaveBeenCalledWith('SIGTERM');
  });
});
