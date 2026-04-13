import { generateRoom } from '../../utils/procGen';
import { ROOM_TYPES, CELL_TYPES, GRID_SIZE } from '../../constants';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns all cell values in a grid as a flat array */
function flatGrid(room) {
  return room.grid.flat();
}

/** Counts how many cells match a given value */
function countCells(room, value) {
  return flatGrid(room).filter(c => c === value).length;
}

/**
 * Verifies that all interior non-wall cells are reachable from the player start
 * using a flood-fill (BFS).
 */
function isFullyConnected(room) {
  const { grid, width, height, playerStart } = room;
  const visited = Array.from({ length: height }, () => new Array(width).fill(false));
  const queue = [{ x: playerStart.x, y: playerStart.y }];
  visited[playerStart.y][playerStart.x] = true;
  const DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0]];

  while (queue.length > 0) {
    const { x, y } = queue.shift();
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      if (visited[ny][nx] || grid[ny][nx] === CELL_TYPES.WALL) continue;
      visited[ny][nx] = true;
      queue.push({ x: nx, y: ny });
    }
  }

  // Every non-wall interior cell should have been visited
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (grid[y][x] !== CELL_TYPES.WALL && !visited[y][x]) return false;
    }
  }
  return true;
}

// ─── generateRoom — REST ──────────────────────────────────────────────────────

describe('generateRoom — REST', () => {
  const room = generateRoom(ROOM_TYPES.REST, 1, 42);

  test('has correct type', () => {
    expect(room.type).toBe(ROOM_TYPES.REST);
  });

  test('has expected dimensions', () => {
    expect(room.width).toBe(GRID_SIZE);
    expect(room.height).toBe(GRID_SIZE);
    expect(room.grid).toHaveLength(GRID_SIZE);
    expect(room.grid[0]).toHaveLength(GRID_SIZE);
  });

  test('has no enemies', () => {
    expect(room.enemies).toHaveLength(0);
  });

  test('contains exactly one altar', () => {
    expect(countCells(room, CELL_TYPES.ALTAR)).toBe(1);
  });

  test('provides a healAmount', () => {
    expect(typeof room.healAmount).toBe('number');
    expect(room.healAmount).toBeGreaterThan(0);
  });

  test('has a valid playerStart inside the grid', () => {
    expect(room.playerStart.x).toBeGreaterThanOrEqual(0);
    expect(room.playerStart.y).toBeGreaterThanOrEqual(0);
    expect(room.playerStart.x).toBeLessThan(GRID_SIZE);
    expect(room.playerStart.y).toBeLessThan(GRID_SIZE);
  });

  test('altar position matches altarPos property', () => {
    const { altarPos, grid } = room;
    expect(grid[altarPos.y][altarPos.x]).toBe(CELL_TYPES.ALTAR);
  });
});

// ─── generateRoom — SHOP ──────────────────────────────────────────────────────

describe('generateRoom — SHOP', () => {
  const room = generateRoom(ROOM_TYPES.SHOP, 1, 7);

  test('has correct type', () => {
    expect(room.type).toBe(ROOM_TYPES.SHOP);
  });

  test('has no enemies', () => {
    expect(room.enemies).toHaveLength(0);
  });

  test('contains chest cells', () => {
    expect(countCells(room, CELL_TYPES.CHEST)).toBeGreaterThan(0);
  });

  test('has shopItems array', () => {
    expect(Array.isArray(room.shopItems)).toBe(true);
  });

  test('has chestPositions array', () => {
    expect(Array.isArray(room.chestPositions)).toBe(true);
    expect(room.chestPositions.length).toBeGreaterThan(0);
  });
});

// ─── generateRoom — EVENT ─────────────────────────────────────────────────────

describe('generateRoom — EVENT', () => {
  const room = generateRoom(ROOM_TYPES.EVENT, 1, 0);

  test('has correct type', () => {
    expect(room.type).toBe(ROOM_TYPES.EVENT);
  });

  test('has no enemies', () => {
    expect(room.enemies).toHaveLength(0);
  });

  test('grid is empty (no extra walls or special tiles inside)', () => {
    // Only border walls should exist
    for (let y = 1; y < GRID_SIZE - 1; y++) {
      for (let x = 1; x < GRID_SIZE - 1; x++) {
        expect(room.grid[y][x]).toBe(CELL_TYPES.EMPTY);
      }
    }
  });
});

// ─── generateRoom — COMBAT ────────────────────────────────────────────────────

describe('generateRoom — COMBAT', () => {
  test('floor 1 produces exactly 1 enemy (opening fight)', () => {
    // Fixed seed so result is deterministic
    const room = generateRoom(ROOM_TYPES.COMBAT, 1, 123);
    expect(room.type).toBe(ROOM_TYPES.COMBAT);
    expect(room.enemies).toHaveLength(1);
  });

  test('higher floors produce more enemies (up to cap)', () => {
    const room = generateRoom(ROOM_TYPES.COMBAT, 8, 42);
    expect(room.enemies.length).toBeGreaterThan(0);
    expect(room.enemies.length).toBeLessThanOrEqual(4);
  });

  test('floor-1 enemy stats are reduced (onboarding smoothing)', () => {
    const room = generateRoom(ROOM_TYPES.COMBAT, 1, 99);
    room.enemies.forEach(e => {
      expect(e.hp).toBeGreaterThanOrEqual(6);
      expect(e.attack).toBeGreaterThanOrEqual(1);
    });
  });

  test('all enemies have required fields', () => {
    const room = generateRoom(ROOM_TYPES.COMBAT, 5, 77);
    room.enemies.forEach(e => {
      expect(e).toHaveProperty('hp');
      expect(e).toHaveProperty('maxHp');
      expect(e).toHaveProperty('attack');
      expect(e).toHaveProperty('x');
      expect(e).toHaveProperty('y');
      expect(e).toHaveProperty('behavior');
    });
  });

  test('enemies do not spawn in the player start safe zone', () => {
    // Player always starts at (1,1), safe zone is 3 cells
    const room = generateRoom(ROOM_TYPES.COMBAT, 5, 55);
    room.enemies.forEach(e => {
      const dist = Math.abs(e.x - 1) + Math.abs(e.y - 1);
      expect(dist).toBeGreaterThanOrEqual(3);
    });
  });

  test('grid border is all walls', () => {
    const room = generateRoom(ROOM_TYPES.COMBAT, 1, 1);
    const { grid, width, height } = room;
    for (let x = 0; x < width; x++) {
      expect(grid[0][x]).toBe(CELL_TYPES.WALL);
      expect(grid[height - 1][x]).toBe(CELL_TYPES.WALL);
    }
    for (let y = 0; y < height; y++) {
      expect(grid[y][0]).toBe(CELL_TYPES.WALL);
      expect(grid[y][width - 1]).toBe(CELL_TYPES.WALL);
    }
  });

  test('interior is connected from player start', () => {
    // Use a seed to make the test deterministic
    const room = generateRoom(ROOM_TYPES.COMBAT, 5, 321);
    expect(isFullyConnected(room)).toBe(true);
  });

  test('enemies are not stacked on the same cell', () => {
    const room = generateRoom(ROOM_TYPES.COMBAT, 6, 888);
    const positions = room.enemies.map(e => `${e.x},${e.y}`);
    const unique = new Set(positions);
    expect(unique.size).toBe(positions.length);
  });

  test('deterministic seed produces identical rooms', () => {
    const roomA = generateRoom(ROOM_TYPES.COMBAT, 4, 12345);
    const roomB = generateRoom(ROOM_TYPES.COMBAT, 4, 12345);
    expect(JSON.stringify(roomA.grid)).toBe(JSON.stringify(roomB.grid));
    expect(roomA.enemies.length).toBe(roomB.enemies.length);
  });
});

// ─── generateRoom — BOSS (act 2) ─────────────────────────────────────────────

describe('generateRoom — BOSS', () => {
  const room = generateRoom(ROOM_TYPES.BOSS, 6, 10);

  test('has correct type', () => {
    expect(room.type).toBe(ROOM_TYPES.BOSS);
  });

  test('contains exactly one boss enemy', () => {
    expect(room.enemies).toHaveLength(1);
    expect(room.enemies[0].isBoss).toBe(true);
  });

  test('isBossRoom flag is set', () => {
    expect(room.isBossRoom).toBe(true);
  });

  test('boss starts at the centre of the grid', () => {
    const boss = room.enemies[0];
    expect(boss.x).toBe(Math.floor(GRID_SIZE / 2));
    expect(boss.y).toBe(Math.floor(GRID_SIZE / 2));
  });
});

// ─── generateRoom — BOSS_FINAL ────────────────────────────────────────────────

describe('generateRoom — BOSS_FINAL', () => {
  const room = generateRoom(ROOM_TYPES.BOSS_FINAL, 10, 5, 'boss_rift');

  test('has correct type', () => {
    expect(room.type).toBe(ROOM_TYPES.BOSS_FINAL);
  });

  test('contains a boss and two guards (3 enemies total)', () => {
    expect(room.enemies).toHaveLength(3);
  });

  test('the first enemy is the requested boss', () => {
    expect(room.enemies[0].type).toBe('boss_rift');
  });

  test('isFinal flag is set on the boss', () => {
    expect(room.enemies[0].isFinal).toBe(true);
  });
});

// ─── generateRoom — ELITE ─────────────────────────────────────────────────────

describe('generateRoom — ELITE', () => {
  const room = generateRoom(ROOM_TYPES.ELITE, 4, 99);

  test('has correct type', () => {
    expect(room.type).toBe(ROOM_TYPES.ELITE);
  });

  test('isElite flag is set', () => {
    expect(room.isElite).toBe(true);
  });

  test('has at least one enemy', () => {
    expect(room.enemies.length).toBeGreaterThanOrEqual(1);
  });

  test('interior is connected from player start', () => {
    expect(isFullyConnected(room)).toBe(true);
  });
});

// ─── generateRoom — unknown type (fallback) ───────────────────────────────────

describe('generateRoom — unknown type fallback', () => {
  const room = generateRoom('nonexistent_type', 1, 1);

  test('falls back to COMBAT type', () => {
    expect(room.type).toBe(ROOM_TYPES.COMBAT);
  });
});
