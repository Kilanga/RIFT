import {
  checkNewEasterEggTitles,
  getEasterEggById,
  formatEasterEggText,
  EASTER_EGGS_CATALOG,
} from '../../utils/easterEggs';

describe('EASTER_EGGS_CATALOG', () => {
  test('contains 4 entries', () => {
    expect(EASTER_EGGS_CATALOG).toHaveLength(4);
  });

  test('all entries have required fields', () => {
    EASTER_EGGS_CATALOG.forEach(egg => {
      expect(egg).toHaveProperty('id');
      expect(egg).toHaveProperty('condition');
      expect(egg).toHaveProperty('reward');
      expect(egg).toHaveProperty('textFR');
      expect(egg).toHaveProperty('textEN');
    });
  });
});

describe('getEasterEggById', () => {
  test('returns the correct egg for a known id', () => {
    const egg = getEasterEggById('pentakill');
    expect(egg).toBeDefined();
    expect(egg.id).toBe('pentakill');
  });

  test('returns undefined for an unknown id', () => {
    expect(getEasterEggById('nonexistent')).toBeUndefined();
  });

  test('returns shiny egg', () => {
    const egg = getEasterEggById('shiny');
    expect(egg.id).toBe('shiny');
  });
});

describe('formatEasterEggText', () => {
  const egg = {
    textFR: 'Bonjour {{name}} !',
    textEN: 'Hello {{name}}!',
  };

  test('returns English text when lang is "en"', () => {
    expect(formatEasterEggText(egg, 'en', { name: 'World' })).toBe('Hello World!');
  });

  test('returns French text when lang is "fr"', () => {
    expect(formatEasterEggText(egg, 'fr', { name: 'Monde' })).toBe('Bonjour Monde !');
  });

  test('defaults to English when lang is unrecognised', () => {
    expect(formatEasterEggText(egg, 'de', {})).toBe('Hello {{name}}!');
  });

  test('returns text unchanged when no params are provided', () => {
    expect(formatEasterEggText(egg, 'en', {})).toBe('Hello {{name}}!');
  });

  test('replaces multiple placeholders', () => {
    const multiEgg = { textFR: '', textEN: '{{a}} + {{b}} = {{c}}' };
    expect(formatEasterEggText(multiEgg, 'en', { a: '1', b: '2', c: '3' })).toBe('1 + 2 = 3');
  });
});

describe('checkNewEasterEggTitles', () => {
  describe('pentakill condition', () => {
    test('unlocks when 5 kills happen within 4 turns', () => {
      const meta = { easterEggTitles: [] };
      const result = checkNewEasterEggTitles(meta, null, { killsThisTurn: 5, turnsInRoom: 4 });
      expect(result.some(e => e.id === 'pentakill')).toBe(true);
    });

    test('does not unlock when fewer than 5 kills', () => {
      const meta = { easterEggTitles: [] };
      const result = checkNewEasterEggTitles(meta, null, { killsThisTurn: 4, turnsInRoom: 4 });
      expect(result.some(e => e.id === 'pentakill')).toBe(false);
    });

    test('does not unlock when more than 4 turns have passed', () => {
      const meta = { easterEggTitles: [] };
      const result = checkNewEasterEggTitles(meta, null, { killsThisTurn: 5, turnsInRoom: 5 });
      expect(result.some(e => e.id === 'pentakill')).toBe(false);
    });

    test('does not re-unlock an already earned egg', () => {
      const meta = { easterEggTitles: ['pentakill'] };
      const result = checkNewEasterEggTitles(meta, null, { killsThisTurn: 10, turnsInRoom: 1 });
      expect(result.some(e => e.id === 'pentakill')).toBe(false);
    });
  });

  describe('shiny condition', () => {
    test('unlocks when totalCombats is exactly 8192', () => {
      const meta = { easterEggTitles: [] };
      const result = checkNewEasterEggTitles(meta, null, { totalCombats: 8192 });
      expect(result.some(e => e.id === 'shiny')).toBe(true);
    });

    test('does not unlock at 0 combats', () => {
      const meta = { easterEggTitles: [] };
      const result = checkNewEasterEggTitles(meta, null, { totalCombats: 0 });
      expect(result.some(e => e.id === 'shiny')).toBe(false);
    });

    test('does not unlock for non-multiple of 8192', () => {
      const meta = { easterEggTitles: [] };
      const result = checkNewEasterEggTitles(meta, null, { totalCombats: 8191 });
      expect(result.some(e => e.id === 'shiny')).toBe(false);
    });

    test('unlocks at 16384 (second multiple)', () => {
      const meta = { easterEggTitles: [] };
      const result = checkNewEasterEggTitles(meta, null, { totalCombats: 16384 });
      expect(result.some(e => e.id === 'shiny')).toBe(true);
    });
  });

  describe('leroy_jenkins condition', () => {
    test('unlocks when 20 or more deaths before boss', () => {
      const meta = { easterEggTitles: [] };
      const result = checkNewEasterEggTitles(meta, null, { deathsBeforeBoss: 20 });
      expect(result.some(e => e.id === 'leroy_jenkins')).toBe(true);
    });

    test('does not unlock when fewer than 20 deaths before boss', () => {
      const meta = { easterEggTitles: [] };
      const result = checkNewEasterEggTitles(meta, null, { deathsBeforeBoss: 19 });
      expect(result.some(e => e.id === 'leroy_jenkins')).toBe(false);
    });
  });

  describe('arrow_in_knee condition', () => {
    test('unlocks when killed by ranged attack', () => {
      const meta = { easterEggTitles: [] };
      const result = checkNewEasterEggTitles(meta, null, { lastKillingAttackType: 'ranged' });
      expect(result.some(e => e.id === 'arrow_in_knee')).toBe(true);
    });

    test('does not unlock when killed by melee', () => {
      const meta = { easterEggTitles: [] };
      const result = checkNewEasterEggTitles(meta, null, { lastKillingAttackType: 'melee' });
      expect(result.some(e => e.id === 'arrow_in_knee')).toBe(false);
    });
  });

  test('can unlock multiple eggs in one check', () => {
    const meta = { easterEggTitles: [] };
    const result = checkNewEasterEggTitles(meta, null, {
      killsThisTurn: 5,
      turnsInRoom: 1,
      lastKillingAttackType: 'ranged',
    });
    expect(result.some(e => e.id === 'pentakill')).toBe(true);
    expect(result.some(e => e.id === 'arrow_in_knee')).toBe(true);
  });

  test('returns empty array when no conditions are met', () => {
    const meta = { easterEggTitles: [] };
    const result = checkNewEasterEggTitles(meta, null, {});
    expect(result).toHaveLength(0);
  });

  test('defaults easterEggTitles to empty array when not present on meta', () => {
    const meta = {};
    const result = checkNewEasterEggTitles(meta, null, { killsThisTurn: 5, turnsInRoom: 3 });
    expect(result.some(e => e.id === 'pentakill')).toBe(true);
  });
});
