import { getShieldBlockValue } from '../../utils/shield';

describe('getShieldBlockValue', () => {
  test('returns 2 for a player with 0 maxHp', () => {
    expect(getShieldBlockValue({ maxHp: 0 })).toBe(2);
  });

  test('returns 2 for a player with low maxHp (5)', () => {
    expect(getShieldBlockValue({ maxHp: 5 })).toBe(2);
  });

  test('computes 20% of maxHp for moderate HP pools', () => {
    // maxHp=20 → 20*0.2=4
    expect(getShieldBlockValue({ maxHp: 20 })).toBe(4);
    // maxHp=30 → 30*0.2=6
    expect(getShieldBlockValue({ maxHp: 30 })).toBe(6);
  });

  test('caps at 8 for high maxHp values', () => {
    expect(getShieldBlockValue({ maxHp: 100 })).toBe(8);
    expect(getShieldBlockValue({ maxHp: 50 })).toBe(8);
  });

  test('handles undefined player gracefully', () => {
    expect(getShieldBlockValue(undefined)).toBe(2);
  });

  test('handles null player gracefully', () => {
    expect(getShieldBlockValue(null)).toBe(2);
  });

  test('rounds to nearest integer', () => {
    // maxHp=15 → 15*0.2=3.0
    expect(getShieldBlockValue({ maxHp: 15 })).toBe(3);
    // maxHp=17 → 17*0.2=3.4 → rounds to 3
    expect(getShieldBlockValue({ maxHp: 17 })).toBe(3);
    // maxHp=18 → 18*0.2=3.6 → rounds to 4
    expect(getShieldBlockValue({ maxHp: 18 })).toBe(4);
  });
});
