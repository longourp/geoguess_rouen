import { parseHash } from './useHashRoute';

describe('parseHash', () => {
  it('strips the leading #/ and trailing slash', () => {
    expect(parseHash('')).toBe('');
    expect(parseHash('#')).toBe('');
    expect(parseHash('#/')).toBe('');
    expect(parseHash('#/astuce')).toBe('astuce');
    expect(parseHash('#/astuce/')).toBe('astuce');
    expect(parseHash('#editeur')).toBe('editeur');
  });
});
