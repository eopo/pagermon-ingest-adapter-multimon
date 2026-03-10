import { describe, expect, it } from 'vitest';
import Adapter from '../../adapter/rtl-sdr-multimon-ng/adapter.js';

describe('adapter entry', () => {
  it('exports a constructable adapter class', () => {
    expect(typeof Adapter).toBe('function');
  });
});
