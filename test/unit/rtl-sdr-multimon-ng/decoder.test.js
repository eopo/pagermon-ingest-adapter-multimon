import { describe, expect, it } from 'vitest';
import MultimonNgDecoder from '../../../adapter/rtl-sdr-multimon-ng/decoder.js';

describe('MultimonNgDecoder.parseLine', () => {
  it('parses POCSAG alpha JSON line into Message', () => {
    const decoder = new MultimonNgDecoder({ protocols: ['POCSAG1200'] });
    const line = JSON.stringify({
      demod_name: 'POCSAG1200',
      address: '123456',
      function: '1',
      alpha: 'TEST MESSAGE',
      timestamp: '2026-03-09T10:00:00.000Z',
    });

    const msg = decoder.parseLine(line, 'unit-test');
    expect(msg).not.toBe(null);
    expect(msg.address).toBe('1234561');
    expect(msg.message).toBe('TEST MESSAGE');
    expect(msg.format).toBe('alpha');
    expect(msg.source).toBe('unit-test');
  });

  it('returns null on invalid input', () => {
    const decoder = new MultimonNgDecoder({ protocols: ['POCSAG1200'] });
    expect(decoder.parseLine('not-json', 'unit-test')).toBe(null);
    expect(decoder.parseLine('', 'unit-test')).toBe(null);
  });

  it('parses FLEX message and normalizes numeric format', () => {
    const decoder = new MultimonNgDecoder({ protocols: ['FLEX'] });
    const line = JSON.stringify({
      demod_name: 'FLEX1600',
      capcode: '54321',
      format: 'numeric',
      message: '42',
      timestamp: '2026-03-09T11:00:00.000Z',
    });

    const msg = decoder.parseLine(line, 'unit-test');
    expect(msg).not.toBe(null);
    expect(msg.address).toBe('54321');
    expect(msg.format).toBe('numeric');
    expect(msg.message).toBe('42');
  });

  it('returns null for unknown protocols and invalid alpha payloads', () => {
    const decoder = new MultimonNgDecoder({ protocols: ['POCSAG1200', 'FLEX'] });

    const unknown = JSON.stringify({
      demod_name: 'UNKNOWN',
      address: '111',
      message: 'x',
      timestamp: '2026-03-09T12:00:00.000Z',
    });
    expect(decoder.parseLine(unknown, 'unit-test')).toBe(null);

    const numericPocsag = JSON.stringify({
      demod_name: 'POCSAG1200',
      address: '999',
      function: '1',
      alpha: '',
      numeric: '',
      timestamp: '2026-03-09T12:00:00.000Z',
    });
    const parsedNumeric = decoder.parseLine(numericPocsag, 'unit-test');
    expect(parsedNumeric).not.toBe(null);
    expect(parsedNumeric.format).toBe('numeric');
    expect(parsedNumeric.message).toBe('');

    const invalidAlphaFlex = JSON.stringify({
      demod_name: 'FLEX1600',
      address: '999',
      format: 'alpha',
      message: '',
      timestamp: '2026-03-09T12:00:00.000Z',
    });
    expect(decoder.parseLine(invalidAlphaFlex, 'unit-test')).toBe(null);
  });

  it('handles corrupt or incomplete JSON from multimon-ng', () => {
    const decoder = new MultimonNgDecoder({ protocols: ['POCSAG1200'] });

    // Incomplete JSON (common with signal loss)
    expect(decoder.parseLine('{"demod_name":"POCSAG1200","addr', 'unit-test')).toBe(null);

    // Empty line (multimon-ng outputs blank lines during silence)
    expect(decoder.parseLine('', 'unit-test')).toBe(null);
    expect(decoder.parseLine('   ', 'unit-test')).toBe(null);
    expect(decoder.parseLine('\n', 'unit-test')).toBe(null);

    // Malformed JSON
    expect(decoder.parseLine('{invalid json}', 'unit-test')).toBe(null);
  });

  it('handles whitespace and special characters in messages', () => {
    const decoder = new MultimonNgDecoder({ protocols: ['POCSAG1200'] });

    // Leading/trailing whitespace is trimmed by decoder (see decoder.js:133, 157)
    const withWhitespace = JSON.stringify({
      demod_name: 'POCSAG1200',
      address: '123',
      function: '1',
      alpha: '  ALERT MESSAGE  ',
      timestamp: '2026-03-09T10:00:00.000Z',
    });
    const msg = decoder.parseLine(withWhitespace, 'unit-test');
    expect(msg.message).toBe('ALERT MESSAGE');

    // Special characters common in pager messages
    const special = JSON.stringify({
      demod_name: 'POCSAG1200',
      address: '456',
      function: '2',
      alpha: 'CODE: #123 @FIRE\nLOC:Main St',
      timestamp: '2026-03-09T10:00:00.000Z',
    });
    const msgSpecial = decoder.parseLine(special, 'unit-test');
    expect(msgSpecial.message).toContain('#123');
    expect(msgSpecial.message).toContain('@FIRE');
  });

  it('handles rapid successive messages (frequency hopping scenario)', () => {
    const decoder = new MultimonNgDecoder({ protocols: ['POCSAG1200', 'POCSAG512'] });

    // Simulate messages arriving in quick succession from different frequencies
    const msg1 = JSON.stringify({
      demod_name: 'POCSAG1200',
      address: '111',
      function: '1',
      alpha: 'MSG1',
      timestamp: '2026-03-09T10:00:00.000Z',
    });
    const msg2 = JSON.stringify({
      demod_name: 'POCSAG512',
      address: '222',
      function: '2',
      alpha: 'MSG2',
      timestamp: '2026-03-09T10:00:00.001Z',
    });

    const parsed1 = decoder.parseLine(msg1, 'unit-test');
    const parsed2 = decoder.parseLine(msg2, 'unit-test');

    expect(parsed1).not.toBe(null);
    expect(parsed2).not.toBe(null);
    expect(parsed1.message).toBe('MSG1');
    expect(parsed2.message).toBe('MSG2');
    expect(parsed1.address).not.toBe(parsed2.address);
  });
});
