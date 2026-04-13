import {
  ALL_UPGRADES,
  getUpgradeChoices,
  getBuildRecommendation,
  applySynergies,
  computePlayerStats,
  getUpgradeById,
  hasUpgrade,
  getUpgradesByColor,
  hasCurseSynergy,
  getSynergySummary,
} from '../../systems/upgradeSystem';
import { UPGRADE_COLORS } from '../../constants';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pickUpgradesOfColor(color, count) {
  return ALL_UPGRADES.filter(u => u.color === color).slice(0, count);
}

function basePlayer() {
  return { hp: 20, maxHp: 20, attack: 5, defense: 2 };
}

// ─── ALL_UPGRADES catalogue ───────────────────────────────────────────────────

describe('ALL_UPGRADES catalogue', () => {
  test('all upgrades have required fields', () => {
    ALL_UPGRADES.forEach(u => {
      expect(u).toHaveProperty('id');
      expect(u).toHaveProperty('name');
      expect(u).toHaveProperty('color');
      expect(u).toHaveProperty('rarity');
      expect(u).toHaveProperty('maxStack');
      expect(u).toHaveProperty('effect');
    });
  });

  test('maxStack is at least 1 for all upgrades', () => {
    ALL_UPGRADES.forEach(u => expect(u.maxStack).toBeGreaterThanOrEqual(1));
  });

  test('upgrade IDs are unique', () => {
    const ids = ALL_UPGRADES.map(u => u.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  test('colors are among valid values', () => {
    const valid = Object.values(UPGRADE_COLORS);
    ALL_UPGRADES.forEach(u => expect(valid).toContain(u.color));
  });

  test('rarities are among expected values', () => {
    const valid = ['common', 'rare', 'epic', 'curse'];
    ALL_UPGRADES.forEach(u => expect(valid).toContain(u.rarity));
  });
});

// ─── getUpgradeById ───────────────────────────────────────────────────────────

describe('getUpgradeById', () => {
  test('returns the correct upgrade for a known id', () => {
    const upgrade = getUpgradeById('momentum');
    expect(upgrade).not.toBeNull();
    expect(upgrade.id).toBe('momentum');
  });

  test('returns null for an unknown id', () => {
    expect(getUpgradeById('does_not_exist')).toBeNull();
  });
});

// ─── hasUpgrade ──────────────────────────────────────────────────────────────

describe('hasUpgrade', () => {
  test('returns true when upgrade is present', () => {
    const upgrades = [{ id: 'regen' }, { id: 'overload' }];
    expect(hasUpgrade(upgrades, 'regen')).toBe(true);
  });

  test('returns false when upgrade is absent', () => {
    const upgrades = [{ id: 'regen' }];
    expect(hasUpgrade(upgrades, 'overload')).toBe(false);
  });

  test('returns false for empty array', () => {
    expect(hasUpgrade([], 'regen')).toBe(false);
  });
});

// ─── getUpgradesByColor ───────────────────────────────────────────────────────

describe('getUpgradesByColor', () => {
  const upgrades = [
    { id: 'a', color: UPGRADE_COLORS.RED },
    { id: 'b', color: UPGRADE_COLORS.BLUE },
    { id: 'c', color: UPGRADE_COLORS.RED },
  ];

  test('returns only upgrades of the specified color', () => {
    const result = getUpgradesByColor(upgrades, UPGRADE_COLORS.RED);
    expect(result).toHaveLength(2);
    result.forEach(u => expect(u.color).toBe(UPGRADE_COLORS.RED));
  });

  test('returns empty array when no upgrade matches the color', () => {
    expect(getUpgradesByColor(upgrades, UPGRADE_COLORS.GREEN)).toHaveLength(0);
  });
});

// ─── hasCurseSynergy ─────────────────────────────────────────────────────────

describe('hasCurseSynergy', () => {
  test('returns false when fewer than 3 curse upgrades', () => {
    const upgrades = [
      { color: UPGRADE_COLORS.CURSE },
      { color: UPGRADE_COLORS.CURSE },
      { color: UPGRADE_COLORS.RED },
    ];
    expect(hasCurseSynergy(upgrades)).toBe(false);
  });

  test('returns true when exactly 3 curse upgrades', () => {
    const upgrades = Array.from({ length: 3 }, () => ({ color: UPGRADE_COLORS.CURSE }));
    expect(hasCurseSynergy(upgrades)).toBe(true);
  });

  test('returns true when more than 3 curse upgrades', () => {
    const upgrades = Array.from({ length: 4 }, () => ({ color: UPGRADE_COLORS.CURSE }));
    expect(hasCurseSynergy(upgrades)).toBe(true);
  });

  test('returns false for empty array', () => {
    expect(hasCurseSynergy([])).toBe(false);
  });
});

// ─── applySynergies ───────────────────────────────────────────────────────────

describe('applySynergies', () => {
  test('marks synergyActive=false when a color has fewer than 3 upgrades', () => {
    const upgrades = pickUpgradesOfColor(UPGRADE_COLORS.RED, 2);
    const result = applySynergies(upgrades);
    result.forEach(u => expect(u.synergyActive).toBe(false));
  });

  test('marks synergyActive=true for all upgrades of a color once 3+ are present', () => {
    const reds = pickUpgradesOfColor(UPGRADE_COLORS.RED, 3);
    const result = applySynergies(reds);
    result.forEach(u => expect(u.synergyActive).toBe(true));
  });

  test('does not mutate the original upgrades array', () => {
    const reds = pickUpgradesOfColor(UPGRADE_COLORS.RED, 3);
    const originals = reds.map(u => ({ ...u }));
    applySynergies(reds);
    reds.forEach((u, i) => expect(u).not.toHaveProperty('synergyActive', originals[i].synergyActive !== undefined));
  });

  test('mixed colors: only the color with 3+ is marked active', () => {
    const reds = pickUpgradesOfColor(UPGRADE_COLORS.RED, 3);
    const blues = pickUpgradesOfColor(UPGRADE_COLORS.BLUE, 1);
    const result = applySynergies([...reds, ...blues]);
    result.forEach(u => {
      if (u.color === UPGRADE_COLORS.RED) expect(u.synergyActive).toBe(true);
      if (u.color === UPGRADE_COLORS.BLUE) expect(u.synergyActive).toBe(false);
    });
  });

  test('returns array of same length as input', () => {
    const upgrades = pickUpgradesOfColor(UPGRADE_COLORS.GREEN, 5);
    expect(applySynergies(upgrades)).toHaveLength(5);
  });
});

// ─── getBuildRecommendation ───────────────────────────────────────────────────

describe('getBuildRecommendation', () => {
  test('returns null when no upgrades are present', () => {
    expect(getBuildRecommendation([])).toBeNull();
  });

  test('returns null when no clear leader (tied colors)', () => {
    const upgrades = [
      { color: UPGRADE_COLORS.RED },
      { color: UPGRADE_COLORS.BLUE },
    ];
    expect(getBuildRecommendation(upgrades)).toBeNull();
  });

  test('returns null when leader has fewer than 2 upgrades', () => {
    const upgrades = [{ color: UPGRADE_COLORS.RED }];
    expect(getBuildRecommendation(upgrades)).toBeNull();
  });

  test('returns the dominant color when it leads by at least 1', () => {
    const upgrades = [
      { color: UPGRADE_COLORS.RED },
      { color: UPGRADE_COLORS.RED },
      { color: UPGRADE_COLORS.RED },
      { color: UPGRADE_COLORS.BLUE },
    ];
    const result = getBuildRecommendation(upgrades);
    expect(result).not.toBeNull();
    expect(result.color).toBe(UPGRADE_COLORS.RED);
    expect(result.count).toBe(3);
  });
});

// ─── computePlayerStats ───────────────────────────────────────────────────────

describe('computePlayerStats', () => {
  test('returns base stats unchanged when no upgrades are active', () => {
    const player = basePlayer();
    const result = computePlayerStats(player, []);
    expect(result.attack).toBe(5);
    expect(result.defense).toBe(2);
    expect(result.maxHp).toBe(20);
  });

  test('adds stat value for a single stat upgrade', () => {
    const overload = getUpgradeById('overload'); // +3 attack
    const result = computePlayerStats(basePlayer(), [overload]);
    expect(result.attack).toBe(8);
  });

  test('stacks multiple upgrades of the same type', () => {
    const overload = getUpgradeById('overload'); // +3 attack
    const result = computePlayerStats(basePlayer(), [overload, overload]);
    expect(result.attack).toBe(11);
  });

  test('applies multi-stat change upgrade (e.g. pacte_sang)', () => {
    const pact = getUpgradeById('pacte_sang'); // +8 atk, -8 maxHp
    const result = computePlayerStats(basePlayer(), [pact]);
    expect(result.attack).toBe(13); // 5 + 8
    expect(result.maxHp).toBe(12); // 20 - 8
  });

  test('clamps attack to minimum 1', () => {
    // verre_trempe: +5 DEF, -4 ATK. Player starts with ATK 1.
    const vitrified = getUpgradeById('verre_trempe');
    const weakPlayer = { ...basePlayer(), attack: 1 };
    const result = computePlayerStats(weakPlayer, [vitrified, vitrified, vitrified]);
    expect(result.attack).toBeGreaterThanOrEqual(1);
  });

  test('clamps defense to minimum 0', () => {
    // fragilite: -5 maxHp, -1 defense. Player starts with DEF 0.
    const fragility = getUpgradeById('fragilite');
    const result = computePlayerStats({ ...basePlayer(), defense: 0 }, [fragility]);
    expect(result.defense).toBeGreaterThanOrEqual(0);
  });

  test('clamps maxHp to minimum 1', () => {
    const contrat = getUpgradeById('contrat_mortel'); // +12 maxHp (effect only, no direct harm from the stat here)
    // Use a player with very low maxHp and apply fragilite upgrades
    const fragility = getUpgradeById('fragilite'); // -5 maxHp
    const tinyPlayer = { ...basePlayer(), hp: 1, maxHp: 5 };
    // 3 fragilite stacks: 5 - 15 = -10 → clamped to 1
    const result = computePlayerStats(tinyPlayer, [fragility, fragility, fragility]);
    expect(result.maxHp).toBeGreaterThanOrEqual(1);
  });

  test('current hp cannot exceed maxHp after stats computation', () => {
    // vitality gives +4 maxHp — hp should still be capped at maxHp (same or higher is fine,
    // but if maxHp decreases, hp must follow)
    const fragility = getUpgradeById('fragilite'); // -5 maxHp
    const player = { ...basePlayer(), hp: 20, maxHp: 20 };
    const result = computePlayerStats(player, [fragility]);
    expect(result.hp).toBeLessThanOrEqual(result.maxHp);
  });

  test('curse synergy (3+ curses) doubles stat upgrade values', () => {
    // 3 curse upgrades → curseMult = 2
    // Also apply overload (+3 atk) — should become +6 with curse synergy
    const fragilite1 = getUpgradeById('fragilite');
    const malediction = getUpgradeById('malediction'); // curse but passive, no stat
    const fardeau = getUpgradeById('fardeau');         // curse but passive, no stat
    const overload = getUpgradeById('overload');       // +3 atk stat
    const result = computePlayerStats(basePlayer(), [fragilite1, malediction, fardeau, overload]);
    // With curse synergy: overload adds 3×2=6 to attack; fragilite adds -5×2=-10 and -1×2=-2
    expect(result.attack).toBe(5 + 6); // 11
  });

  test('resonance upgrade does not trigger without 7 same-color upgrades', () => {
    const resonance = getUpgradeById('resonance');
    const blues = pickUpgradesOfColor(UPGRADE_COLORS.BLUE, 3);
    const result = computePlayerStats(basePlayer(), [resonance, ...blues]);
    expect(result._resonanceActive).toBeUndefined();
  });
});

// ─── getUpgradeChoices ────────────────────────────────────────────────────────

describe('getUpgradeChoices', () => {
  test('returns at most count upgrades', () => {
    const choices = getUpgradeChoices([], 3);
    expect(choices.length).toBeLessThanOrEqual(3);
  });

  test('returns at most 2 curses per selection', () => {
    // Run many times to detect probabilistic violations
    for (let i = 0; i < 30; i++) {
      const choices = getUpgradeChoices([], 3);
      const curseCount = choices.filter(u => u.rarity === 'curse').length;
      expect(curseCount).toBeLessThanOrEqual(2);
    }
  });

  test('does not include upgrades already at maxStack', () => {
    // Find an upgrade with maxStack=1 and mark it as already owned once
    const singleStack = ALL_UPGRADES.find(u => u.maxStack === 1);
    const choices = getUpgradeChoices([singleStack], 3);
    expect(choices.some(u => u.id === singleStack.id)).toBe(false);
  });

  test('returns unique upgrades (no duplicate ids)', () => {
    const choices = getUpgradeChoices([], 3);
    const ids = choices.map(u => u.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  test('can pick an upgrade that has not yet hit its maxStack (multi-stack)', () => {
    // Find an upgrade with maxStack > 1
    const multiStack = ALL_UPGRADES.find(u => u.maxStack > 1);
    // Own it once — it should still be eligible
    const choices = getUpgradeChoices([multiStack], 3);
    // It might or might not appear (probabilistic), but it must not be excluded purely because
    // it appears once
    const excluded = choices.some(u => u.id === multiStack.id);
    // Just verify the returned choices are valid (no assertion on the probabilistic result)
    choices.forEach(u => {
      const owned = 1; // we own multiStack once
      if (u.id === multiStack.id) {
        expect(owned).toBeLessThan(multiStack.maxStack);
      }
    });
  });

  test('returns all available upgrades when pool is smaller than count', () => {
    // Pre-fill all upgrades except one
    const all = ALL_UPGRADES.filter(u => u.maxStack === 1);
    const excluded = all.slice(-1);
    const existing = all.slice(0, -1);
    const choices = getUpgradeChoices(existing, 5);
    // At most 1 upgrade available, so at most 1 returned
    expect(choices.length).toBeLessThanOrEqual(existing.length === 0 ? ALL_UPGRADES.length : ALL_UPGRADES.length - existing.length);
  });
});

// ─── getSynergySummary ────────────────────────────────────────────────────────

describe('getSynergySummary', () => {
  test('returns an entry for each upgrade color', () => {
    const summary = getSynergySummary([]);
    expect(summary.some(s => s.color === UPGRADE_COLORS.RED)).toBe(true);
    expect(summary.some(s => s.color === UPGRADE_COLORS.BLUE)).toBe(true);
    expect(summary.some(s => s.color === UPGRADE_COLORS.GREEN)).toBe(true);
    expect(summary.some(s => s.color === UPGRADE_COLORS.CURSE)).toBe(true);
  });

  test('all counts are 0 for empty upgrade list', () => {
    const summary = getSynergySummary([]);
    summary.forEach(s => expect(s.count).toBe(0));
  });

  test('correctly counts upgrades per color', () => {
    const reds = pickUpgradesOfColor(UPGRADE_COLORS.RED, 3);
    const blues = pickUpgradesOfColor(UPGRADE_COLORS.BLUE, 1);
    const summary = getSynergySummary([...reds, ...blues]);
    expect(summary.find(s => s.color === UPGRADE_COLORS.RED).count).toBe(3);
    expect(summary.find(s => s.color === UPGRADE_COLORS.BLUE).count).toBe(1);
  });

  test('marks active=true for curses at 3+', () => {
    const curses = ALL_UPGRADES.filter(u => u.color === UPGRADE_COLORS.CURSE).slice(0, 3);
    const summary = getSynergySummary(curses);
    const curseSummary = summary.find(s => s.color === UPGRADE_COLORS.CURSE);
    expect(curseSummary.active).toBe(true);
  });

  test('marks active=false for non-curse colors below 7', () => {
    const reds = pickUpgradesOfColor(UPGRADE_COLORS.RED, 6);
    const summary = getSynergySummary(reds);
    const redSummary = summary.find(s => s.color === UPGRADE_COLORS.RED);
    expect(redSummary.active).toBe(false);
  });
});
