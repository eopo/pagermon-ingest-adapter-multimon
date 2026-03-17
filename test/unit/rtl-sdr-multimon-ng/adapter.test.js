import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'events';
import { createMockLogger, createMockMetrics } from '@pagermon/ingest-core/testing';
import RtlSdrMultimonNgAdapter from '../../../adapter/rtl-sdr-multimon-ng/adapter.js';

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

function buildAdapter(metrics = createMockMetrics()) {
  const logger = createMockLogger(vi);
  return new RtlSdrMultimonNgAdapter({
    label: 'unit-label',
    receiver: { frequencies: [172.5] },
    decoder: { protocols: ['POCSAG1200'] },
    logger,
    metrics,
  });
}

describe('RtlSdrMultimonNgAdapter Unified', () => {
  beforeEach(() => {
    spawnMock.mockReset();
    createInterfaceMock.mockReset();
  });

  describe('configuration validations', () => {
    it('validates receiver and decoder config', () => {
      expect(() => {
        new RtlSdrMultimonNgAdapter({
          receiver: {},
          decoder: { protocols: ['POCSAG1200'] },
          logger: createMockLogger(vi),
        });
      }).toThrow('receiver.frequencies');

      expect(() => {
        new RtlSdrMultimonNgAdapter({
          receiver: { frequencies: [1] },
          decoder: {},
          logger: createMockLogger(vi),
        });
      }).toThrow('decoder.protocols');
    });

    it('returns adapter name', () => {
      const adapter = buildAdapter();
      expect(adapter.getName()).toBe('rtl-sdr-multimon-ng');
    });
  });

  describe('argument generation', () => {
    it('builds receiver correctly', () => {
      const adapter = new RtlSdrMultimonNgAdapter({
        receiver: {
          frequencies: [172.5, 173.1],
          gain: 25,
          squelch: 5,
          ppm: 1,
          device: 2,
          sampleRate: '24000',
          extraArgs: ['-M', 'fm'],
        },
        decoder: { protocols: ['POCSAG1200'] },
        logger: createMockLogger(vi),
      });

      expect(adapter._buildReceiverArgs()).toEqual([
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
      ]);
    });

    it('builds decoder correctly', () => {
      const adapter = new RtlSdrMultimonNgAdapter({
        receiver: { frequencies: [172.5] },
        decoder: {
          protocols: ['POCSAG1200', 'FLEX'],
          charset: 'UTF-8',
          format: 'alpha',
          extraArgs: ['--label', 'test'],
        },
        logger: createMockLogger(vi),
      });

      expect(adapter._buildDecoderArgs()).toEqual([
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
      ]);
    });
  });

  describe('lifecycle (start / stop / error handling)', () => {
    it('spawns a combined sh pipeline and handles stdout lines', () => {
      const adapter = buildAdapter();

      const proc = createFakeProcess();
      spawnMock.mockReturnValue(proc);

      const stdoutInterface = new EventEmitter();
      stdoutInterface.close = vi.fn();
      createInterfaceMock.mockReturnValue(stdoutInterface);

      const onMessage = vi.fn();
      const onClose = vi.fn();
      const onError = vi.fn();

      adapter.start(onMessage, onClose, onError);

      expect(spawnMock).toHaveBeenCalledWith(
        'sh',
        [
          '-c',
          'rtl_fm -s 22050 -f 172.5 -E dc -F 0 -A fast | multimon-ng -a POCSAG1200 -t raw --timestamp --iso8601 --json -',
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] }
      );

      adapter.parseLine = vi.fn().mockReturnValueOnce({ test: true });
      stdoutInterface.emit('line', 'dummy_line');

      expect(onMessage).toHaveBeenCalledWith(expect.objectContaining({ test: true }));

      adapter.stop();
      expect(proc.kill).toHaveBeenCalledWith('SIGTERM');
      expect(adapter.isRunning()).toBe(false);
    });
  });

  describe('parseLine logic', () => {
    it('ignores empty lines', () => {
      const adapter = buildAdapter();
      expect(adapter.parseLine('')).toBeNull();
      expect(adapter.parseLine('   ')).toBeNull();
    });

    it('parses valid pocsag', () => {
      const adapter = buildAdapter();
      const result = adapter.parseLine(
        JSON.stringify({
          demod_name: 'POCSAG',
          alpha: 'hello-world',
          address: 1234,
          function: 1,
          timestamp: '2023-01-01T12:00:00.000Z',
        }),
        'unit-label'
      );
      expect(result.message).toBe('hello-world');
      expect(result.format).toBe('alpha');
      expect(result.address).toBe('12341');
    });

    it('parses valid flex', () => {
      const adapter = buildAdapter();
      const result = adapter.parseLine(
        JSON.stringify({
          demod_name: 'FLEX',
          message: 'flex message',
          message_type: 'alpha',
          capcode: 5678,
          timestamp: '2023-01-01T13:00:00.000Z',
        }),
        'unit-label'
      );
      expect(result.message).toBe('flex message');
      expect(result.format).toBe('alpha');
      expect(result.address).toBe('5678');
    });

    it('ignores unknown demod', () => {
      const adapter = buildAdapter();
      const result = adapter.parseLine(
        JSON.stringify({
          demod_name: 'EAS',
          message: '...',
        }),
        'unit-label'
      );
      expect(result).toBeNull();
    });
  });
});
