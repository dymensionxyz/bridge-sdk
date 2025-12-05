import { describe, it, expect } from 'vitest';

describe('Bridge SDK Infrastructure', () => {
  it('should have basic test infrastructure working', () => {
    expect(true).toBe(true);
  });

  it('should be able to import modules', async () => {
    const { isValidHyperlaneAddress } = await import('../utils/address.js');
    expect(typeof isValidHyperlaneAddress).toBe('function');
  });
});
