import { describe, expect, it } from 'vitest';
import { SHARED_PACKAGE_NAME } from './index.js';

describe('shared scaffold', () => {
  it('exports package identifier', () => {
    expect(SHARED_PACKAGE_NAME).toBe('@super-millionaire/shared');
  });
});
