import { describe, expect, it, vi } from 'vitest';
import { PassThrough } from 'stream';
import RtlSdrMultimonNgAdapter from '../../../adapter/rtl-sdr-multimon-ng/adapter.js';

function buildAdapter() {
  return new RtlSdrMultimonNgAdapter({
    label: 'unit-label',
    receiver: { frequencies: [172.5] },
    decoder: { protocols: ['POCSAG1200'] },
  });
}

describe('RtlSdrMultimonNgAdapter', () => {
  it('validates receiver and decoder config', () => {
    expect(() => {
      new RtlSdrMultimonNgAdapter({ receiver: {}, decoder: { protocols: ['POCSAG1200'] } });
    }).toThrow('receiver.frequencies');

    expect(() => {
      new RtlSdrMultimonNgAdapter({ receiver: { frequencies: [1] }, decoder: {} });
    }).toThrow('decoder.protocols');
  });

  it('returns adapter name', () => {
    const adapter = buildAdapter();
    expect(adapter.getName()).toBe('rtl-sdr-multimon-ng');
  });

  it('processes lines and routes parse errors to onError', async () => {
    const adapter = buildAdapter();
    const receiverOut = new PassThrough();
    const decoderIn = new PassThrough();
    const decoderOut = new PassThrough();

    adapter.receiver = {
      spawn: vi.fn(),
      getOutputStream: vi.fn(() => receiverOut),
      kill: vi.fn(),
      isRunning: vi.fn(() => true),
    };

    const parsed = {
      address: '1234',
      message: 'hello',
      source: 'unit-label',
      toPayload() {
        return this;
      },
    };

    adapter.decoder = {
      spawn: vi.fn(),
      getInputStream: vi.fn(() => decoderIn),
      getOutputStream: vi.fn(() => decoderOut),
      parseLine: vi
        .fn()
        .mockReturnValueOnce(parsed)
        .mockImplementationOnce(() => {
          throw new Error('decode fail');
        }),
      kill: vi.fn(),
      isRunning: vi.fn(() => true),
    };

    const onMessage = vi.fn();
    const onClose = vi.fn();
    const onError = vi.fn();

    adapter.start(onMessage, onClose, onError);

    decoderOut.write('{"ok":1}\n');
    decoderOut.write('{"broken":1}\n');

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(onMessage).toHaveBeenCalledWith(parsed);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'decode fail' }));

    decoderOut.end();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stops and exposes running state', () => {
    const adapter = buildAdapter();

    adapter.receiver = {
      spawn: vi.fn(),
      getOutputStream: vi.fn(),
      kill: vi.fn(),
      isRunning: vi.fn(() => true),
    };

    adapter.decoder = {
      spawn: vi.fn(),
      getInputStream: vi.fn(),
      getOutputStream: vi.fn(),
      parseLine: vi.fn(),
      kill: vi.fn(),
      isRunning: vi.fn(() => true),
    };

    adapter.running = true;
    expect(adapter.isRunning()).toBe(true);

    adapter.stop();
    expect(adapter.running).toBe(false);
    expect(adapter.receiver.kill).toHaveBeenCalledTimes(1);
    expect(adapter.decoder.kill).toHaveBeenCalledTimes(1);

    adapter.receiver.isRunning.mockReturnValue(false);
    expect(adapter.isRunning()).toBe(false);
  });
});
