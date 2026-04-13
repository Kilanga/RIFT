import {
  resolveEnemyStatuses,
  mergeEnemyStatus,
  calculateDamage,
  calculateAoeDamage,
  isAdjacent,
  processEnemyTurn,
} from '../../systems/combatSystem';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRoom(width = 9, height = 9) {
  const grid = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) =>
      x === 0 || y === 0 || x === width - 1 || y === height - 1 ? 'wall' : 'empty'
    )
  );
  return { width, height, grid };
}

function makeEnemy(overrides = {}) {
  return {
    id: 'e1',
    type: 'chaser',
    behavior: 'chase',
    x: 5,
    y: 5,
    hp: 10,
    maxHp: 10,
    attack: 3,
    defense: 0,
    speed: 1,
    statuses: [],
    turnCount: 0,
    spiralStep: 0,
    ...overrides,
  };
}

function makePlayer(overrides = {}) {
  return { x: 1, y: 1, hp: 20, maxHp: 20, defense: 0, statuses: [], ...overrides };
}

// ─── resolveEnemyStatuses ─────────────────────────────────────────────────────

describe('resolveEnemyStatuses', () => {
  test('returns default result for enemy with no statuses', () => {
    const result = resolveEnemyStatuses(makeEnemy({ statuses: [] }));
    expect(result.skipTurn).toBe(false);
    expect(result.skipMovement).toBe(false);
    expect(result.dotDamage).toBe(0);
    expect(result.updatedStatuses).toHaveLength(0);
  });

  test('burn status adds dotDamage', () => {
    const enemy = makeEnemy({ statuses: [{ id: 'burn', value: 3, duration: 2 }] });
    const result = resolveEnemyStatuses(enemy);
    expect(result.dotDamage).toBe(3);
  });

  test('burn uses default value 2 when no value field', () => {
    const enemy = makeEnemy({ statuses: [{ id: 'burn', duration: 1 }] });
    const result = resolveEnemyStatuses(enemy);
    expect(result.dotDamage).toBe(2);
  });

  test('freeze sets skipMovement to true', () => {
    const enemy = makeEnemy({ statuses: [{ id: 'freeze', duration: 1 }] });
    const result = resolveEnemyStatuses(enemy);
    expect(result.skipMovement).toBe(true);
    expect(result.skipTurn).toBe(false);
  });

  test('stun sets skipTurn to true', () => {
    const enemy = makeEnemy({ statuses: [{ id: 'stun', duration: 1 }] });
    const result = resolveEnemyStatuses(enemy);
    expect(result.skipTurn).toBe(true);
  });

  test('statuses with duration 1 are removed after resolution', () => {
    const enemy = makeEnemy({ statuses: [{ id: 'stun', duration: 1 }] });
    const result = resolveEnemyStatuses(enemy);
    expect(result.updatedStatuses).toHaveLength(0);
  });

  test('statuses with duration > 1 remain with decremented duration', () => {
    const enemy = makeEnemy({ statuses: [{ id: 'burn', value: 3, duration: 3 }] });
    const result = resolveEnemyStatuses(enemy);
    expect(result.updatedStatuses).toHaveLength(1);
    expect(result.updatedStatuses[0].duration).toBe(2);
  });

  test('multiple statuses are resolved independently', () => {
    const enemy = makeEnemy({
      statuses: [
        { id: 'burn', value: 4, duration: 2 },
        { id: 'freeze', duration: 1 },
        { id: 'stun', duration: 2 },
      ],
    });
    const result = resolveEnemyStatuses(enemy);
    expect(result.dotDamage).toBe(4);
    expect(result.skipMovement).toBe(true);
    expect(result.skipTurn).toBe(true);
    // freeze expires (duration 1→0), burn and stun remain
    expect(result.updatedStatuses).toHaveLength(2);
  });

  test('vulnerable status is decremented but does not affect skip/dot flags', () => {
    const enemy = makeEnemy({ statuses: [{ id: 'vulnerable', duration: 2 }] });
    const result = resolveEnemyStatuses(enemy);
    expect(result.skipTurn).toBe(false);
    expect(result.skipMovement).toBe(false);
    expect(result.dotDamage).toBe(0);
    expect(result.updatedStatuses).toHaveLength(1);
    expect(result.updatedStatuses[0].duration).toBe(1);
  });
});

// ─── mergeEnemyStatus ─────────────────────────────────────────────────────────

describe('mergeEnemyStatus', () => {
  test('adds new status when it does not exist', () => {
    const result = mergeEnemyStatus([], { id: 'burn', value: 3, duration: 2 });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'burn', value: 3, duration: 2 });
  });

  test('refreshes duration to the max of the two when status already exists', () => {
    const existing = [{ id: 'freeze', duration: 1 }];
    const result = mergeEnemyStatus(existing, { id: 'freeze', duration: 3 });
    expect(result[0].duration).toBe(3);
  });

  test('keeps the higher of the two durations', () => {
    const existing = [{ id: 'freeze', duration: 5 }];
    const result = mergeEnemyStatus(existing, { id: 'freeze', duration: 2 });
    expect(result[0].duration).toBe(5);
  });

  test('adds values together for burn stacks', () => {
    const existing = [{ id: 'burn', value: 3, duration: 2 }];
    const result = mergeEnemyStatus(existing, { id: 'burn', value: 2, duration: 2 });
    expect(result[0].value).toBe(5);
  });

  test('does not mutate the original statuses array', () => {
    const existing = [{ id: 'stun', duration: 1 }];
    mergeEnemyStatus(existing, { id: 'freeze', duration: 2 });
    expect(existing).toHaveLength(1);
  });

  test('returns a new array instance', () => {
    const existing = [{ id: 'stun', duration: 1 }];
    const result = mergeEnemyStatus(existing, { id: 'freeze', duration: 1 });
    expect(result).not.toBe(existing);
  });

  test('unrelated statuses are preserved unchanged', () => {
    const existing = [{ id: 'stun', duration: 2 }, { id: 'freeze', duration: 1 }];
    const result = mergeEnemyStatus(existing, { id: 'burn', value: 3, duration: 2 });
    expect(result).toHaveLength(3);
    const stun = result.find(s => s.id === 'stun');
    expect(stun.duration).toBe(2);
  });
});

// ─── calculateDamage ─────────────────────────────────────────────────────────

describe('calculateDamage', () => {
  test('subtracts defender defense from raw damage', () => {
    expect(calculateDamage(10, { defense: 3, statuses: [] })).toBe(7);
  });

  test('minimum damage is 1 (never zero)', () => {
    expect(calculateDamage(1, { defense: 10, statuses: [] })).toBe(1);
  });

  test('shield status halves damage (minimum 1)', () => {
    // 10 raw - 0 defense = 10 → halved → 5
    expect(calculateDamage(10, { defense: 0, statuses: [{ id: 'shield' }] })).toBe(5);
  });

  test('shield halves after defense reduction', () => {
    // 10 raw - 2 defense = 8 → halved → 4
    expect(calculateDamage(10, { defense: 2, statuses: [{ id: 'shield' }] })).toBe(4);
  });

  test('shield damage minimum is 1', () => {
    // 2 raw - 0 def = 2 → shield halved → 1
    expect(calculateDamage(2, { defense: 0, statuses: [{ id: 'shield' }] })).toBe(1);
  });

  test('vulnerable status multiplies damage by 1.5', () => {
    // 10 raw - 0 def = 10 → ×1.5 = 15
    expect(calculateDamage(10, { defense: 0, statuses: [{ id: 'vulnerable' }] })).toBe(15);
  });

  test('shield takes priority before vulnerable', () => {
    // Both shield and vulnerable: shield applied first then vulnerable
    // 10 - 0 = 10 → shield ×0.5 = 5 → vulnerable ×1.5 = 7
    const dmg = calculateDamage(10, { defense: 0, statuses: [{ id: 'shield' }, { id: 'vulnerable' }] });
    expect(dmg).toBe(7);
  });

  test('handles undefined statuses gracefully', () => {
    expect(calculateDamage(5, { defense: 0 })).toBe(5);
  });
});

// ─── calculateAoeDamage ───────────────────────────────────────────────────────

describe('calculateAoeDamage', () => {
  const targets = [
    { id: 'a', x: 1, y: 1, hp: 10 }, // dist 0 from origin
    { id: 'b', x: 2, y: 1, hp: 10 }, // dist 1
    { id: 'c', x: 3, y: 1, hp: 10 }, // dist 2
    { id: 'd', x: 4, y: 1, hp: 10 }, // dist 3 — outside radius 2
    { id: 'dead', x: 2, y: 1, hp: 0 }, // dead, should be excluded
  ];
  const origin = { x: 1, y: 1 };

  test('only includes targets within radius', () => {
    const hits = calculateAoeDamage(origin, 2, 6, targets);
    const ids = hits.map(h => h.id);
    expect(ids).toContain('a');
    expect(ids).toContain('b');
    expect(ids).toContain('c');
    expect(ids).not.toContain('d');
  });

  test('excludes dead targets (hp 0)', () => {
    const hits = calculateAoeDamage(origin, 2, 6, targets);
    expect(hits.some(h => h.id === 'dead')).toBe(false);
  });

  test('damage decreases with distance', () => {
    const hits = calculateAoeDamage(origin, 3, 6, targets);
    const dmgAt0 = hits.find(h => h.id === 'a')?.damage;
    const dmgAt2 = hits.find(h => h.id === 'c')?.damage;
    const dmgAt3 = hits.find(h => h.id === 'd')?.damage;
    // damage = max(1, base - floor(dist * 0.5))
    // dist 0 → base−0=6, dist 2 → base−1=5, dist 3 → base−1=5
    expect(dmgAt0).toBeGreaterThan(dmgAt2);
    // Damage must not increase further out
    expect(dmgAt2).toBeGreaterThanOrEqual(dmgAt3 ?? 0);
  });

  test('minimum AoE damage is 1', () => {
    // Very low base damage should still deal at least 1
    const hits = calculateAoeDamage(origin, 3, 1, targets);
    hits.forEach(h => expect(h.damage).toBeGreaterThanOrEqual(1));
  });

  test('returns empty array when no targets in range', () => {
    const hits = calculateAoeDamage(origin, 1, 6, [{ id: 'far', x: 5, y: 5, hp: 10 }]);
    expect(hits).toHaveLength(0);
  });
});

// ─── isAdjacent ───────────────────────────────────────────────────────────────

describe('isAdjacent', () => {
  test('returns true for cells 1 apart horizontally', () => {
    expect(isAdjacent({ x: 1, y: 1 }, { x: 2, y: 1 })).toBe(true);
  });

  test('returns true for cells 1 apart vertically', () => {
    expect(isAdjacent({ x: 1, y: 1 }, { x: 1, y: 2 })).toBe(true);
  });

  test('returns false for the same cell', () => {
    expect(isAdjacent({ x: 1, y: 1 }, { x: 1, y: 1 })).toBe(false);
  });

  test('returns false for diagonal cells', () => {
    expect(isAdjacent({ x: 1, y: 1 }, { x: 2, y: 2 })).toBe(false);
  });

  test('returns false for cells 2+ apart', () => {
    expect(isAdjacent({ x: 1, y: 1 }, { x: 3, y: 1 })).toBe(false);
  });
});

// ─── processEnemyTurn ─────────────────────────────────────────────────────────

describe('processEnemyTurn', () => {
  const room = makeRoom();

  test('returns no action for an enemy not found in list', () => {
    const state = {
      enemies: [],
      player: makePlayer(),
      currentRoom: room,
    };
    const result = processEnemyTurn('missing_id', state);
    expect(result.playerDamage).toBe(0);
    expect(result.moved).toBe(false);
  });

  test('returns no action for a dead enemy', () => {
    const dead = makeEnemy({ id: 'e1', hp: 0 });
    const state = {
      enemies: [dead],
      player: makePlayer(),
      currentRoom: room,
    };
    const result = processEnemyTurn('e1', state);
    expect(result.playerDamage).toBe(0);
  });

  test('returns no action when currentRoom is null', () => {
    const state = {
      enemies: [makeEnemy({ id: 'e1' })],
      player: makePlayer(),
      currentRoom: null,
    };
    const result = processEnemyTurn('e1', state);
    expect(result.playerDamage).toBe(0);
  });

  test('chaser adjacent to player deals attack damage', () => {
    const enemy = makeEnemy({ id: 'e1', x: 2, y: 1, behavior: 'chase', attack: 5 });
    const player = makePlayer({ x: 1, y: 1 });
    const state = { enemies: [enemy], player, currentRoom: room };
    const result = processEnemyTurn('e1', state);
    expect(result.playerDamage).toBe(5);
    expect(result.moved).toBe(false);
  });

  test('chaser not adjacent to player moves toward player', () => {
    const enemy = makeEnemy({ id: 'e1', x: 7, y: 7, behavior: 'chase', speed: 1 });
    const player = makePlayer({ x: 1, y: 1 });
    const state = { enemies: [enemy], player, currentRoom: room };
    const result = processEnemyTurn('e1', state);
    // Enemy should have moved closer
    expect(result.moved).toBe(true);
    expect(result.playerDamage).toBe(0);
  });

  test('blocker ignores player when player has phaseShift status', () => {
    const enemy = makeEnemy({ id: 'e1', x: 2, y: 1, behavior: 'block', attack: 4 });
    const player = makePlayer({ x: 1, y: 1, statuses: [{ id: 'phaseShift' }] });
    const state = { enemies: [enemy], player, currentRoom: room };
    const result = processEnemyTurn('e1', state);
    // Blocker should take no action due to phaseShift
    expect(result.playerDamage).toBe(0);
    expect(result.moved).toBe(false);
  });

  test('blocker adjacent to player without phaseShift deals damage', () => {
    const enemy = makeEnemy({ id: 'e1', x: 2, y: 1, behavior: 'block', attack: 3 });
    const player = makePlayer({ x: 1, y: 1 });
    const state = { enemies: [enemy], player, currentRoom: room };
    const result = processEnemyTurn('e1', state);
    expect(result.playerDamage).toBe(3);
  });

  test('frozen chaser skips movement but can still strike adjacent player', () => {
    const enemy = makeEnemy({ id: 'e1', x: 2, y: 1, behavior: 'chase', attack: 4 });
    const player = makePlayer({ x: 1, y: 1 });
    const state = { enemies: [enemy], player, currentRoom: room };
    const result = processEnemyTurn('e1', state, true); // skipMovement=true
    expect(result.playerDamage).toBe(4);
    expect(result.moved).toBe(false);
  });

  test('frozen chaser not adjacent returns no action (skipMovement)', () => {
    const enemy = makeEnemy({ id: 'e1', x: 5, y: 5, behavior: 'chase' });
    const player = makePlayer({ x: 1, y: 1 });
    const state = { enemies: [enemy], player, currentRoom: room };
    const result = processEnemyTurn('e1', state, true); // skipMovement=true
    expect(result.playerDamage).toBe(0);
    expect(result.moved).toBe(false);
  });

  test('unknown behavior returns no action', () => {
    const enemy = makeEnemy({ id: 'e1', behavior: 'unknown_behavior' });
    const state = { enemies: [enemy], player: makePlayer(), currentRoom: room };
    const result = processEnemyTurn('e1', state);
    expect(result.playerDamage).toBe(0);
    expect(result.moved).toBe(false);
  });

  test('healer with only frontline allies attempts to retreat', () => {
    const healer = makeEnemy({ id: 'h1', x: 4, y: 4, behavior: 'heal', attack: 2 });
    const frontline = makeEnemy({ id: 'f1', x: 3, y: 3, behavior: 'chase' });
    const player = makePlayer({ x: 1, y: 1 });
    const state = { enemies: [healer, frontline], player, currentRoom: room };
    const result = processEnemyTurn('h1', state);
    // Healer should try to flee — may move or stay depending on room geometry, but should not deal damage
    // when not cornered.  We verify no damage when not adjacent.
    expect(result.playerDamage).toBe(0);
  });

  test('healer with no frontline allies behaves like a chaser', () => {
    const healer = makeEnemy({ id: 'h1', x: 2, y: 1, behavior: 'heal', attack: 2 });
    const player = makePlayer({ x: 1, y: 1 });
    // No other enemies → healer should engage
    const state = { enemies: [healer], player, currentRoom: room };
    const result = processEnemyTurn('h1', state);
    expect(result.playerDamage).toBe(2);
  });
});
