import { isUnlockConditionMet, pickPermanentUpgrades } from '../../utils/metaHelpers';
import { PERMANENT_UPGRADES_CATALOG } from '../../constants';

// ─── isUnlockConditionMet ─────────────────────────────────────────────────────

describe('isUnlockConditionMet', () => {
  const baseMeta = {
    totalRuns: 0,
    totalKills: 0,
    bestScore: 0,
    shapeStats: {},
  };

  test('returns true when upgrade has no unlock condition', () => {
    const upgrade = { id: 'always_available', unlockCondition: null };
    expect(isUnlockConditionMet(upgrade, baseMeta)).toBe(true);
  });

  describe('type: runs', () => {
    const upgrade = { unlockCondition: { type: 'runs', value: 3 } };

    test('returns false when totalRuns is below threshold', () => {
      expect(isUnlockConditionMet(upgrade, { ...baseMeta, totalRuns: 2 })).toBe(false);
    });

    test('returns true when totalRuns equals threshold', () => {
      expect(isUnlockConditionMet(upgrade, { ...baseMeta, totalRuns: 3 })).toBe(true);
    });

    test('returns true when totalRuns exceeds threshold', () => {
      expect(isUnlockConditionMet(upgrade, { ...baseMeta, totalRuns: 10 })).toBe(true);
    });
  });

  describe('type: kills', () => {
    const upgrade = { unlockCondition: { type: 'kills', value: 20 } };

    test('returns false when totalKills is below threshold', () => {
      expect(isUnlockConditionMet(upgrade, { ...baseMeta, totalKills: 19 })).toBe(false);
    });

    test('returns true when totalKills meets threshold', () => {
      expect(isUnlockConditionMet(upgrade, { ...baseMeta, totalKills: 20 })).toBe(true);
    });
  });

  describe('type: wins', () => {
    const upgrade = { unlockCondition: { type: 'wins', value: 1 } };

    test('returns false when no wins recorded', () => {
      expect(isUnlockConditionMet(upgrade, baseMeta)).toBe(false);
    });

    test('returns true when total wins across shapes meets threshold', () => {
      const meta = { ...baseMeta, shapeStats: { triangle: { wins: 1 } } };
      expect(isUnlockConditionMet(upgrade, meta)).toBe(true);
    });

    test('sums wins across multiple shapes', () => {
      const upgrade3 = { unlockCondition: { type: 'wins', value: 3 } };
      const meta = {
        ...baseMeta,
        shapeStats: { triangle: { wins: 1 }, circle: { wins: 1 }, hexagon: { wins: 1 } },
      };
      expect(isUnlockConditionMet(upgrade3, meta)).toBe(true);
    });
  });

  describe('type: score', () => {
    const upgrade = { unlockCondition: { type: 'score', value: 600 } };

    test('returns false when bestScore is below threshold', () => {
      expect(isUnlockConditionMet(upgrade, { ...baseMeta, bestScore: 599 })).toBe(false);
    });

    test('returns true when bestScore meets threshold', () => {
      expect(isUnlockConditionMet(upgrade, { ...baseMeta, bestScore: 600 })).toBe(true);
    });
  });

  describe('type: shape_win', () => {
    const upgrade = { unlockCondition: { type: 'shape_win', shape: 'triangle' } };

    test('returns false when shape has no wins', () => {
      expect(isUnlockConditionMet(upgrade, baseMeta)).toBe(false);
    });

    test('returns false when shape stat is missing', () => {
      const meta = { ...baseMeta, shapeStats: { circle: { wins: 2 } } };
      expect(isUnlockConditionMet(upgrade, meta)).toBe(false);
    });

    test('returns true when specified shape has at least 1 win', () => {
      const meta = { ...baseMeta, shapeStats: { triangle: { wins: 1 } } };
      expect(isUnlockConditionMet(upgrade, meta)).toBe(true);
    });
  });

  describe('type: all_shapes', () => {
    const upgrade = { unlockCondition: { type: 'all_shapes' } };

    test('returns false when no shapes have wins', () => {
      expect(isUnlockConditionMet(upgrade, baseMeta)).toBe(false);
    });

    test('returns false when only some shapes have wins', () => {
      const meta = {
        ...baseMeta,
        shapeStats: { triangle: { wins: 1 }, circle: { wins: 1 } },
      };
      expect(isUnlockConditionMet(upgrade, meta)).toBe(false);
    });

    test('returns true when all three base shapes have wins', () => {
      const meta = {
        ...baseMeta,
        shapeStats: {
          triangle: { wins: 1 },
          circle: { wins: 1 },
          hexagon: { wins: 1 },
        },
      };
      expect(isUnlockConditionMet(upgrade, meta)).toBe(true);
    });
  });

  test('returns true for unknown condition type (default)', () => {
    const upgrade = { unlockCondition: { type: 'unknown_type', value: 99 } };
    expect(isUnlockConditionMet(upgrade, baseMeta)).toBe(true);
  });
});

// ─── pickPermanentUpgrades ────────────────────────────────────────────────────

describe('pickPermanentUpgrades', () => {
  const richMeta = {
    totalRuns: 99,
    totalKills: 999,
    bestScore: 9999,
    shapeStats: {
      triangle: { wins: 5 },
      circle: { wins: 5 },
      hexagon: { wins: 5 },
      shadow: { wins: 5 },
      paladin: { wins: 5 },
    },
  };

  test('returns empty array when all upgrades are already owned', () => {
    const allIds = PERMANENT_UPGRADES_CATALOG.map(u => u.id);
    const existing = allIds.map(id => ({ id }));
    const result = pickPermanentUpgrades(existing, richMeta, 2);
    expect(result).toHaveLength(0);
  });

  test('returns at most count upgrades', () => {
    const result = pickPermanentUpgrades([], richMeta, 2);
    expect(result.length).toBeLessThanOrEqual(2);
  });

  test('does not return an upgrade already in existing list', () => {
    const allIds = PERMANENT_UPGRADES_CATALOG.map(u => u.id);
    // Keep one upgrade out of existing so there is exactly one to pick
    const excluded = allIds[0];
    const existing = allIds.slice(1).map(id => ({ id }));
    const result = pickPermanentUpgrades(existing, richMeta, 1);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(excluded);
  });

  test('returns fewer upgrades if pool is smaller than count', () => {
    const allIds = PERMANENT_UPGRADES_CATALOG.map(u => u.id);
    // Remove only the first two from existing, leaving just two in pool
    const existing = allIds.slice(2).map(id => ({ id }));
    const result = pickPermanentUpgrades(existing, richMeta, 5);
    expect(result.length).toBeLessThanOrEqual(2);
  });

  test('only offers upgrades whose unlock conditions are met', () => {
    // With a sparse meta, runs-gated upgrades should not appear
    const sparseMeta = {
      totalRuns: 0,
      totalKills: 0,
      bestScore: 0,
      shapeStats: {},
    };
    const result = pickPermanentUpgrades([], sparseMeta, 10);
    // All returned upgrades must have their condition met
    result.forEach(u => {
      expect(isUnlockConditionMet(u, sparseMeta)).toBe(true);
    });
  });

  test('returns upgrades as objects with id and statBonus', () => {
    const result = pickPermanentUpgrades([], richMeta, 1);
    if (result.length > 0) {
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('statBonus');
    }
  });

  test('returned upgrades are unique (no duplicates)', () => {
    const result = pickPermanentUpgrades([], richMeta, 5);
    const ids = result.map(u => u.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});
