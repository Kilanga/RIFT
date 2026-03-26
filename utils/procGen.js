/**
 * RIFT — Générateur procédural de salles et d'ennemis
 */

import {
  GRID_SIZE,
  ROOM_TYPES,
  ENEMY_TYPES,
  CELL_TYPES,
} from '../constants';

// ─── Templates ennemis ────────────────────────────────────────────────────────

const ENEMY_TEMPLATES = {
  [ENEMY_TYPES.CHASER]: {
    type: ENEMY_TYPES.CHASER, hp: 10, maxHp: 10,
    attack: 2, defense: 0, speed: 2,
    behavior: 'chase', scoreValue: 10, color: '#FF4444',
  },
  [ENEMY_TYPES.SHOOTER]: {
    type: ENEMY_TYPES.SHOOTER, hp: 8, maxHp: 8,
    attack: 3, defense: 0, speed: 1, range: 3,
    behavior: 'shoot', scoreValue: 15, color: '#4488FF',
  },
  [ENEMY_TYPES.BLOCKER]: {
    type: ENEMY_TYPES.BLOCKER, hp: 12, maxHp: 12,
    attack: 2, defense: 1, speed: 1,
    behavior: 'block', scoreValue: 20, color: '#888899',
  },
  // Mini-boss (fin acte 1) — plus accessible
  [ENEMY_TYPES.BOSS_VOID]: {
    type: ENEMY_TYPES.BOSS_VOID, hp: 25, maxHp: 25,
    attack: 4, defense: 0, speed: 2,
    behavior: 'boss_void', scoreValue: 80, color: '#BB44FF', isBoss: true,
  },
  // Boss (fin acte 2) — intermédiaire
  [ENEMY_TYPES.BOSS_PULSE]: {
    type: ENEMY_TYPES.BOSS_PULSE, hp: 40, maxHp: 40,
    attack: 5, defense: 1, speed: 1,
    behavior: 'boss_pulse', scoreValue: 150, color: '#FF6600', isBoss: true,
  },
  // Boss final (fin acte 3) — très puissant
  [ENEMY_TYPES.BOSS_RIFT]: {
    type: ENEMY_TYPES.BOSS_RIFT, hp: 80, maxHp: 80,
    attack: 8, defense: 2, speed: 2,
    behavior: 'boss_rift', scoreValue: 300, color: '#FF2266', isBoss: true, isFinal: true,
  },
};

// ─── API principale ───────────────────────────────────────────────────────────

/**
 * Génère une salle complète selon son type et l'étage courant
 */
export function generateRoom(type, floor = 1) {
  switch (type) {
    case ROOM_TYPES.COMBAT:     return generateCombatRoom(floor);
    case ROOM_TYPES.BOSS_MINI:  return generateBossRoom(floor, 'mini');
    case ROOM_TYPES.BOSS:       return generateBossRoom(floor, 'normal');
    case ROOM_TYPES.BOSS_FINAL: return generateBossRoom(floor, 'final');
    case ROOM_TYPES.REST:       return generateRestRoom();
    case ROOM_TYPES.SHOP:       return generateShopRoom();
    default:                    return generateCombatRoom(floor);
  }
}

// ─── Générateurs ─────────────────────────────────────────────────────────────

function generateCombatRoom(floor) {
  const width = GRID_SIZE, height = GRID_SIZE;
  const grid = createEmptyGrid(width, height);

  addRandomWalls(grid, width, height, 0.08);

  const enemyCount = Math.min(1 + Math.floor(floor / 2), 4);
  const enemies = spawnEnemies(grid, width, height, enemyCount, floor, [
    ENEMY_TYPES.CHASER,
    ENEMY_TYPES.SHOOTER,
    ENEMY_TYPES.BLOCKER,
  ]);

  return { type: ROOM_TYPES.COMBAT, width, height, grid, enemies, playerStart: { x: 1, y: 1 } };
}

function generateBossRoom(floor, tier = 'normal') {
  const width = GRID_SIZE, height = GRID_SIZE;
  const grid = createEmptyGrid(width, height);

  addSymmetricPillars(grid, width, height);

  const bossType = tier === 'mini'  ? ENEMY_TYPES.BOSS_VOID
                 : tier === 'final' ? ENEMY_TYPES.BOSS_RIFT
                 : ENEMY_TYPES.BOSS_PULSE;

  const roomType = tier === 'mini'  ? ROOM_TYPES.BOSS_MINI
                 : tier === 'final' ? ROOM_TYPES.BOSS_FINAL
                 : ROOM_TYPES.BOSS;

  const boss = {
    ...scaledEnemy(ENEMY_TEMPLATES[bossType], floor),
    x: Math.floor(width / 2),
    y: Math.floor(height / 2),
    turnCount: 0,
    spiralStep: 0,
  };

  // Boss final : ajoute 2 gardes
  const enemies = [boss];
  if (tier === 'final') {
    enemies.push({
      ...scaledEnemy(ENEMY_TEMPLATES[ENEMY_TYPES.BLOCKER], floor),
      x: Math.floor(width / 2) - 2, y: Math.floor(height / 2),
      id: `guard_l_${Date.now()}`, turnCount: 0, spiralStep: 0,
    });
    enemies.push({
      ...scaledEnemy(ENEMY_TEMPLATES[ENEMY_TYPES.BLOCKER], floor),
      x: Math.floor(width / 2) + 2, y: Math.floor(height / 2),
      id: `guard_r_${Date.now()}`, turnCount: 0, spiralStep: 0,
    });
  }

  return {
    type: roomType, width, height, grid,
    enemies,
    playerStart: { x: 1, y: height - 2 },
    isBossRoom: true,
    bossFloor: tier,
  };
}

function generateRestRoom() {
  const width = GRID_SIZE, height = GRID_SIZE;
  const grid = createEmptyGrid(width, height);

  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  grid[cy][cx] = CELL_TYPES.ALTAR;

  return {
    type: ROOM_TYPES.REST, width, height, grid,
    enemies: [],
    playerStart: { x: 1, y: 1 },
    altarPos: { x: cx, y: cy },
    healAmount: 10,
  };
}

function generateShopRoom() {
  const width = GRID_SIZE, height = GRID_SIZE;
  const grid = createEmptyGrid(width, height);

  const chestPositions = [
    { x: 2, y: 2 }, { x: 4, y: 2 }, { x: 6, y: 2 },
  ];
  chestPositions.forEach(({ x, y }) => { grid[y][x] = CELL_TYPES.CHEST; });

  return {
    type: ROOM_TYPES.SHOP, width, height, grid,
    enemies: [],
    playerStart: { x: 4, y: height - 2 },
    shopItems: generateShopItems(),
    chestPositions,
  };
}

// ─── Helpers de génération ────────────────────────────────────────────────────

function createEmptyGrid(width, height) {
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) return CELL_TYPES.WALL;
      return CELL_TYPES.EMPTY;
    })
  );
}

function addRandomWalls(grid, width, height, density) {
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      if (x <= 2 && y <= 2) continue; // Zone spawn joueur
      if (Math.abs(x - cx) <= 1 && Math.abs(y - cy) <= 1) continue; // Centre libre
      if (Math.random() < density) grid[y][x] = CELL_TYPES.WALL;
    }
  }
  ensureConnectivity(grid, width, height, 1, 1);
}

/**
 * Garantit que toutes les cases libres sont accessibles depuis (startX, startY).
 * Supprime les murs intérieurs qui isoleraient des cases.
 */
function ensureConnectivity(grid, width, height, startX, startY) {
  const DIRS = [[0,-1],[0,1],[-1,0],[1,0]];

  function floodFill() {
    const visited = Array.from({ length: height }, () => new Array(width).fill(false));
    const queue   = [{ x: startX, y: startY }];
    visited[startY][startX] = true;
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
    return visited;
  }

  // Répéter jusqu'à ce que toutes les cases libres soient connectées
  for (let pass = 0; pass < 20; pass++) {
    const visited = floodFill();
    let fixed = false;
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        // Case libre non atteinte → chercher un mur intérieur adjacent à supprimer
        if (grid[y][x] !== CELL_TYPES.WALL && !visited[y][x]) {
          for (const [dx, dy] of DIRS) {
            const nx = x + dx, ny = y + dy;
            if (nx <= 0 || ny <= 0 || nx >= width - 1 || ny >= height - 1) continue;
            if (grid[ny][nx] === CELL_TYPES.WALL) {
              grid[ny][nx] = CELL_TYPES.EMPTY;
              fixed = true;
              break;
            }
          }
        }
      }
    }
    if (!fixed) break;
  }
}

function addSymmetricPillars(grid, width, height) {
  [
    { x: 2, y: 2 }, { x: width - 3, y: 2 },
    { x: 2, y: height - 3 }, { x: width - 3, y: height - 3 },
    { x: 2, y: Math.floor(height / 2) }, { x: width - 3, y: Math.floor(height / 2) },
  ].forEach(({ x, y }) => { grid[y][x] = CELL_TYPES.WALL; });
}

function spawnEnemies(grid, width, height, count, floor, allowedTypes) {
  const enemies  = [];
  const occupied = new Set();
  const safeZone = 3;
  let attempts   = 0;

  while (enemies.length < count && attempts < 150) {
    attempts++;
    const x = randomInt(safeZone, width - 2);
    const y = randomInt(safeZone, height - 2);
    const key = `${x},${y}`;

    if (grid[y][x] !== CELL_TYPES.EMPTY || occupied.has(key)) continue;

    occupied.add(key);
    const type = allowedTypes[Math.floor(Math.random() * allowedTypes.length)];
    enemies.push({ ...scaledEnemy(ENEMY_TEMPLATES[type], floor), x, y, turnCount: 0, spiralStep: 0 });
  }
  return enemies;
}

function scaledEnemy(template, floor) {
  const m = 1 + (floor - 1) * 0.1;
  return {
    ...template,
    hp:     Math.round(template.hp * m),
    maxHp:  Math.round(template.maxHp * m),
    attack: Math.round(template.attack * (1 + (floor - 1) * 0.07)),
  };
}

function generateShopItems() {
  const upgradeIds = [
    'momentum', 'echo', 'fracture', 'shield_pulse', 'regen', 'leech',
    'vitality', 'absorb', 'thorns', 'overload', 'critique', 'combustion',
    'second_wind', 'regain', 'chain_reaction', 'blink',
    'tranchant', 'berserker', 'cyclone', 'fortifie', 'esquive', 'vigile',
    'parasitisme', 'resistance', 'renaissance',
    'pacte_sang', 'verre_trempe', 'soif_sang', 'ame_maudite', 'contrat_mortel',
  ];
  const shuffle = [...upgradeIds].sort(() => Math.random() - 0.5);
  return shuffle.slice(0, 3).map(id => ({ upgradeId: id, price: randomInt(3, 8), bought: false }));
}

// ─── Générateur de carte procédural ──────────────────────────────────────────

/**
 * RNG déterministe (mulberry32) — même seed → même carte
 * Utilisé pour le multijoueur (les deux joueurs ont la même map)
 */
function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Génère une carte de run entièrement procédurale.
 * @param {number} [seed]  Graine optionnelle — si absente, aléatoire (solo)
 * @returns {{ map: Array, seed: number }}
 */
/**
 * Génère un acte (5-7 couches + boss final d'acte)
 * @param {Function} rng       RNG déterministe
 * @param {number}   actIndex  0=acte1, 1=acte2, 2=acte3
 * @param {number}   layerOffset Décalage pour les IDs de couche uniques
 */
function generateAct(rng, actIndex, layerOffset) {
  const layerCount   = Math.floor(rng() * 3) + 5; // 5, 6 ou 7 couches
  const bossFinalLayer = layerCount;               // boss = couche après les N couches
  const template     = [];
  let hasRest  = false;
  let hasShop  = false;

  for (let li = 0; li < layerCount; li++) {
    const isOpening  = li < 2;
    const isPreBoss  = li === layerCount - 1;

    // Force repos avant boss si aucun encore dans cet acte
    if (isPreBoss && !hasRest) {
      template.push([ROOM_TYPES.REST]);
      hasRest = true;
      continue;
    }

    const nodeCount = isOpening
      ? Math.floor(rng() * 2) + 2  // 2 ou 3 nœuds en ouverture
      : Math.floor(rng() * 3) + 1; // 1 à 3 nœuds ensuite

    const layer = [];
    for (let ni = 0; ni < nodeCount; ni++) {
      const r = rng();
      let type;

      if (isOpening) {
        type = ROOM_TYPES.COMBAT;
      } else if (!hasShop && li >= 3 && ni === 0) {
        // Force un shop pas trop tard dans l'acte
        type = ROOM_TYPES.SHOP;
      } else {
        // Pondération selon l'acte (acte 3 plus dur, moins de repos)
        const combatW = actIndex === 2 ? 0.65 : 0.55;
        const restW   = actIndex === 2 ? 0.15 : 0.25;
        type = r < combatW           ? ROOM_TYPES.COMBAT
             : r < combatW + restW   ? ROOM_TYPES.REST
             :                         ROOM_TYPES.SHOP;
      }

      if (type === ROOM_TYPES.REST) hasRest = true;
      if (type === ROOM_TYPES.SHOP) hasShop = true;
      layer.push(type);
    }

    // ── Règle post-génération : pas de doublons non-combat sur la même couche ─
    if (layer.length > 1) {
      const seenNonCombat = new Set();
      for (let i = 0; i < layer.length; i++) {
        if (layer[i] !== ROOM_TYPES.COMBAT) {
          if (seenNonCombat.has(layer[i])) {
            layer[i] = ROOM_TYPES.COMBAT;
          } else {
            seenNonCombat.add(layer[i]);
          }
        }
      }
    }

    template.push(layer);
  }

  // Boss de fin d'acte
  const bossType = actIndex === 0 ? ROOM_TYPES.BOSS_MINI
                 : actIndex === 1 ? ROOM_TYPES.BOSS
                 :                  ROOM_TYPES.BOSS_FINAL;
  template.push([bossType]);

  return template;
}

/**
 * Génère une carte de run en 3 actes entièrement procédurale.
 * Structure : Acte 1 (5-7 + mini-boss) → Acte 2 (5-7 + boss) → Acte 3 (5-7 + boss final)
 * @param {number} [seed]  Graine optionnelle pour le multijoueur / daily run
 */
export function buildProceduralMap(seed) {
  const mapSeed = seed !== undefined ? seed : Math.floor(Math.random() * 999999) + 1;
  const rng     = mulberry32(mapSeed);

  // Générer les 3 actes
  const act1 = generateAct(rng, 0, 0);
  const act2 = generateAct(rng, 1, act1.length);
  const act3 = generateAct(rng, 2, act1.length + act2.length);

  const template = [...act1, ...act2, ...act3];

  // Marquer l'appartenance à chaque acte pour l'affichage
  const actBoundaries = [act1.length, act1.length + act2.length];

  // Construction des nœuds
  const map = template.map((layer, li) =>
    layer.map((type, ni) => ({
      id:          `${li}_${ni}`,
      type,
      layer:       li,
      position:    ni,
      cleared:     false,
      connections: [],
      act:         li < actBoundaries[0] ? 1 : li < actBoundaries[1] ? 2 : 3,
    }))
  );

  // Connexions entre couches
  for (let li = 0; li < map.length - 1; li++) {
    const current = map[li];
    const next    = map[li + 1];

    current.forEach((node, ni) => {
      const targets = [];
      for (let nj = 0; nj < next.length; nj++) {
        if (Math.abs(ni - nj) <= 1) targets.push(next[nj].id);
      }
      if (targets.length === 0) targets.push(next[0].id);
      node.connections = targets;
    });

    // Garantit que chaque nœud suivant est accessible
    const reachable = new Set(current.flatMap(n => n.connections));
    next.forEach(n => {
      if (!reachable.has(n.id)) {
        const closest = current.reduce((best, node) =>
          Math.abs(node.position - n.position) < Math.abs(best.position - n.position) ? node : best
        , current[0]);
        if (!closest.connections.includes(n.id)) closest.connections.push(n.id);
      }
    });
  }

  return { map, seed: mapSeed, actBoundaries };
}


// ─── Utils ────────────────────────────────────────────────────────────────────

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
