/**
 * RIFT — Système de combat au tour par tour
 * Comportements ennemis, patterns de boss, calculs de dégâts
 */

import { ENEMY_TYPES } from '../constants';

const SHOOTER_RANGE   = 3;
const BLOCKER_MOVE_P  = 0.25;

// ─── Point d'entrée ───────────────────────────────────────────────────────────

/**
 * Applique les statuts actifs d'un ennemi et retourne les effets résolus.
 * Appelé AVANT le traitement de l'action de l'ennemi.
 * @returns {{ skipTurn, skipMovement, dotDamage, updatedStatuses }}
 */
export function resolveEnemyStatuses(enemy) {
  let skipTurn      = false;
  let skipMovement  = false;
  let dotDamage     = 0;
  const updatedStatuses = [];

  for (const s of (enemy.statuses || [])) {
    const remaining = { ...s, duration: s.duration - 1 };

    switch (s.id) {
      case 'burn':
        dotDamage += s.value || 2;
        break;
      case 'freeze':
        skipMovement = true;
        break;
      case 'stun':
        skipTurn = true;
        break;
      case 'vulnerable':
        // Consommé dans calculateDamage — juste décrémenter
        break;
      default:
        break;
    }

    if (remaining.duration > 0) updatedStatuses.push(remaining);
  }

  return { skipTurn, skipMovement, dotDamage, updatedStatuses };
}

/**
 * Fusionne un nouveau statut dans la liste existante.
 * Si le statut existe déjà : refresh la durée (max des deux), additionne la valeur pour burn.
 */
export function mergeEnemyStatus(statuses, newStatus) {
  const existing = statuses.find(s => s.id === newStatus.id);
  if (!existing) return [...statuses, { ...newStatus }];
  return statuses.map(s =>
    s.id === newStatus.id
      ? { ...s, duration: Math.max(s.duration, newStatus.duration), value: (s.value || 0) + (newStatus.value || 0) }
      : s
  );
}

/**
 * Calcule l'action d'un ennemi pour son tour
 * @returns {{ moved, newX, newY, playerDamage, logs, turnCountUpdate?, healActions?, summon? }}
 */
export function processEnemyTurn(enemyId, state, skipMovement = false) {
  const { enemies, player, currentRoom } = state;
  const enemy = enemies.find(e => e.id === enemyId);
  if (!enemy || enemy.hp <= 0 || !currentRoom) return noAction();

  switch (enemy.behavior) {
    case 'chase':      return processChaserTurn(enemy, player, enemies, currentRoom, skipMovement);
    case 'shoot':      return processShooterTurn(enemy, player, enemies, currentRoom);
    case 'block':      return processBlockerTurn(enemy, player, enemies, currentRoom);
    case 'boss_void':     return processBossVoidTurn(enemy, player, enemies, currentRoom);
    case 'boss_pulse':    return processBossPulseTurn(enemy, player, enemies, currentRoom);
    case 'boss_rift':     return processBossRiftTurn(enemy, player, enemies, currentRoom);
    case 'boss_guardian': return processBossGuardianTurn(enemy, player, enemies, currentRoom);
    case 'boss_entity':   return processBossEntityTurn(enemy, player, enemies, currentRoom);
    case 'heal':       return processHealerTurn(enemy, player, enemies, currentRoom);
    case 'explode':    return processChaserTurn(enemy, player, enemies, currentRoom, skipMovement); // même IA que chaser
    case 'summon':     return processSummonerTurn(enemy, player, enemies, currentRoom);
    default:           return noAction();
  }
}

// ─── Comportements ────────────────────────────────────────────────────────────

function processChaserTurn(enemy, player, enemies, room, skipMovement = false) {
  // Gelé : peut encore frapper au corps à corps, mais ne peut pas se déplacer
  if (skipMovement) {
    if (manhattanDist(enemy, player) === 1) {
      return { moved: false, newX: enemy.x, newY: enemy.y, playerDamage: enemy.attack, logs: [`${enemy.type} frappe !`] };
    }
    return noAction();
  }

  const path = findPathGreedy(enemy, player, enemies, room);
  if (!path || path.length === 0) return noAction();

  const steps = Math.min(enemy.speed, path.length);
  let { x, y } = enemy;

  for (let i = 0; i < steps; i++) {
    const next = path[i];
    if (next.x === player.x && next.y === player.y) {
      return { moved: false, newX: x, newY: y, playerDamage: enemy.attack, logs: [`${enemy.type} frappe !`] };
    }
    if (isCellFree(next.x, next.y, enemies, room)) { x = next.x; y = next.y; }
  }

  return { moved: x !== enemy.x || y !== enemy.y, newX: x, newY: y, playerDamage: 0, logs: [] };
}

function processShooterTurn(enemy, player, enemies, room) {
  const dist = manhattanDist(enemy, player);

  // Dans la portée avec ligne de vue → tir
  if (dist <= SHOOTER_RANGE && hasLineOfSight(enemy, player, room)) {
    return { moved: false, newX: enemy.x, newY: enemy.y, playerDamage: enemy.attack, logs: [`${enemy.type} tire !`] };
  }

  // Trop près → recule ; coincé → tire quand même (pas d'issue)
  if (dist < 2) {
    const retreat = findRetreat(enemy, player, enemies, room);
    if (retreat) return { moved: true, newX: retreat.x, newY: retreat.y, playerDamage: 0, logs: [] };
    return { moved: false, newX: enemy.x, newY: enemy.y, playerDamage: enemy.attack, logs: [`${enemy.type} tire à bout portant !`] };
  }

  // Trop loin OU ligne de vue bloquée → s'approche pour obtenir un angle
  const path = findPathGreedy(enemy, player, enemies, room);
  if (path?.length > 0 && isCellFree(path[0].x, path[0].y, enemies, room)) {
    return { moved: true, newX: path[0].x, newY: path[0].y, playerDamage: 0, logs: [] };
  }

  return noAction();
}

function processBlockerTurn(enemy, player, enemies, room) {
  // Phase Shift : le joueur est insaisissable, le Titan l'ignore
  if (player.statuses?.some(s => s.id === 'phaseShift')) {
    return noAction();
  }
  if (manhattanDist(enemy, player) === 1) {
    return { moved: false, newX: enemy.x, newY: enemy.y, playerDamage: enemy.attack, logs: [`${enemy.type} écrase !`] };
  }
  if (Math.random() < BLOCKER_MOVE_P) {
    const path = findPathGreedy(enemy, player, enemies, room);
    if (path?.length > 0 && isCellFree(path[0].x, path[0].y, enemies, room)) {
      return { moved: true, newX: path[0].x, newY: path[0].y, playerDamage: 0, logs: [] };
    }
  }
  return noAction();
}

// ─── Boss patterns ────────────────────────────────────────────────────────────

function processBossVoidTurn(enemy, player, enemies, room) {
  const enraged = enemy.hp / enemy.maxHp <= 0.5;
  const dist    = manhattanDist(enemy, player);

  if (dist === 1) {
    const dmg = enraged ? enemy.attack * 2 : enemy.attack;
    return { moved: false, newX: enemy.x, newY: enemy.y, playerDamage: dmg, logs: [`VOID ${enraged ? '🔥 ENRAGÉ' : ''} : ${dmg} !`] };
  }

  if (enraged) {
    const path = findPathGreedy(enemy, player, enemies, room);
    if (path?.length > 0) {
      const steps = Math.min(enemy.speed + 1, path.length);
      const next  = path[steps - 1];
      if (isCellFree(next.x, next.y, enemies, room)) {
        return { moved: true, newX: next.x, newY: next.y, playerDamage: 0, logs: [] };
      }
    }
  } else {
    const spiral = nextSpiralStep(enemy, room);
    if (spiral && isCellFree(spiral.x, spiral.y, enemies, room)) {
      return { moved: true, newX: spiral.x, newY: spiral.y, playerDamage: 0, logs: [], spiralStepUpdate: (enemy.spiralStep || 0) + 1 };
    }
  }

  return noAction();
}

function processBossPulseTurn(enemy, player, enemies, room) {
  const enraged = enemy.hp / enemy.maxHp <= 0.5;
  const turn    = (enemy.turnCount || 0) + 1;

  // Attaque en croix tous les 2 tours
  if (turn % 2 === 0) {
    const dmg = (enemy.x === player.x || enemy.y === player.y)
      ? (enraged ? enemy.attack * 2 : enemy.attack)
      : 0;
    return {
      moved: false, newX: enemy.x, newY: enemy.y,
      playerDamage: dmg,
      logs: [`PULSE ${enraged ? '🔥' : ''} onde !`],
      turnCountUpdate: turn,
    };
  }

  // Déplacement
  const path = findPathGreedy(enemy, player, enemies, room);
  if (path?.length > 0 && isCellFree(path[0].x, path[0].y, enemies, room)) {
    return { moved: true, newX: path[0].x, newY: path[0].y, playerDamage: 0, logs: [], turnCountUpdate: turn };
  }

  return { ...noAction(), turnCountUpdate: turn };
}

function processBossRiftTurn(enemy, player, enemies, room) {
  const hpRatio  = enemy.hp / enemy.maxHp;
  const enraged  = hpRatio <= 0.3;
  const angry    = hpRatio <= 0.6;
  const turn     = (enemy.turnCount || 0) + 1;
  const dist     = manhattanDist(enemy, player);

  // Contact : attaque — dégâts triplés en enragé, doublés à 60 % PV
  if (dist === 1) {
    const dmg = enraged ? enemy.attack * 3 : (angry ? enemy.attack * 2 : enemy.attack);
    return {
      moved: false, newX: enemy.x, newY: enemy.y,
      playerDamage: dmg,
      logs: [`LE DÉVOREUR ${enraged ? '💀 DÉCHAÎNÉ' : angry ? '🔥' : ''} : ${dmg} !`],
      turnCountUpdate: turn,
    };
  }

  // Tous les 3 tours : pulse de rift — dégâts à portée 2 quelle que soit la position
  if (turn % 3 === 0) {
    const dmg = dist <= 2 ? Math.floor(enemy.attack * 0.8) : 0;
    return {
      moved: false, newX: enemy.x, newY: enemy.y,
      playerDamage: dmg,
      logs: [`💠 RIFT PULSE${dmg > 0 ? ` : ${dmg} !` : ''}`],
      turnCountUpdate: turn,
    };
  }

  // Déplacement : agressif, 2 cases par tour en phase enragée
  const path  = findPathGreedy(enemy, player, enemies, room);
  const steps = enraged ? Math.min(2, path?.length || 0) : 1;
  if (path?.length > 0) {
    const target = path[Math.min(steps - 1, path.length - 1)];
    if (isCellFree(target.x, target.y, enemies, room)) {
      return { moved: true, newX: target.x, newY: target.y, playerDamage: 0, logs: [], turnCountUpdate: turn };
    }
  }

  return { ...noAction(), turnCountUpdate: turn };
}

// Le Gardien — lent, très résistant, frappe fort, onde de choc tous les 4 tours
function processBossGuardianTurn(enemy, player, enemies, room) {
  const hpRatio = enemy.hp / enemy.maxHp;
  const enraged = hpRatio <= 0.3;
  const turn    = (enemy.turnCount || 0) + 1;
  const dist    = manhattanDist(enemy, player);

  // Tous les 4 tours : onde de choc — frappe à portée 3
  if (turn % 4 === 0) {
    const dmg = dist <= 3 ? Math.floor(enemy.attack * 0.9) : 0;
    return {
      moved: false, newX: enemy.x, newY: enemy.y,
      playerDamage: dmg,
      logs: [`⛓ LE GARDIEN — Onde sacrée${dmg > 0 ? ` : ${dmg} !` : ' (hors portée)'}` ],
      turnCountUpdate: turn,
    };
  }

  // Contact : frappe lourde, doublée en enragé
  if (dist === 1) {
    const dmg = enraged ? enemy.attack * 2 : enemy.attack;
    return {
      moved: false, newX: enemy.x, newY: enemy.y,
      playerDamage: dmg,
      logs: [`⛓ LE GARDIEN${enraged ? ' 💢 BRISÉ' : ''} : ${dmg} !`],
      turnCountUpdate: turn,
    };
  }

  // Déplacement lent (speed 1, avance toujours)
  const path = findPathGreedy(enemy, player, enemies, room);
  if (path?.length > 0 && isCellFree(path[0].x, path[0].y, enemies, room)) {
    return { moved: true, newX: path[0].x, newY: path[0].y, playerDamage: 0, logs: [], turnCountUpdate: turn };
  }

  return { ...noAction(), turnCountUpdate: turn };
}

// L'Entité — rapide, très puissante, phase aléatoire tous les 3 tours
function processBossEntityTurn(enemy, player, enemies, room) {
  const hpRatio  = enemy.hp / enemy.maxHp;
  const enraged  = hpRatio <= 0.25;
  const turn     = (enemy.turnCount || 0) + 1;
  const dist     = manhattanDist(enemy, player);

  // Tous les 3 tours : déflagration — dégâts même à portée 3, triples en enragé
  if (turn % 3 === 0) {
    const base = Math.floor(enemy.attack * (dist <= 2 ? 1.2 : dist <= 3 ? 0.7 : 0));
    const dmg  = enraged ? base * 2 : base;
    if (dmg > 0) {
      return {
        moved: false, newX: enemy.x, newY: enemy.y,
        playerDamage: dmg,
        logs: [`💀 L'ENTITÉ — Déflagration${enraged ? ' ☠' : ''} : ${dmg} !`],
        turnCountUpdate: turn,
      };
    }
  }

  // Contact : attaque dévastatrice
  if (dist === 1) {
    const dmg = enraged ? enemy.attack * 3 : enemy.attack;
    return {
      moved: false, newX: enemy.x, newY: enemy.y,
      playerDamage: dmg,
      logs: [`💀 L'ENTITÉ${enraged ? ' ☠ DÉCHAÎNÉE' : ''} : ${dmg} !`],
      turnCountUpdate: turn,
    };
  }

  // Déplacement rapide (speed 2) — avance de 2 cases vers le joueur en enragé
  const path  = findPathGreedy(enemy, player, enemies, room);
  const steps = enraged ? Math.min(2, path?.length || 0) : 1;
  if (path?.length > 0) {
    const target = path[Math.min(steps - 1, path.length - 1)];
    if (isCellFree(target.x, target.y, enemies, room)) {
      return { moved: true, newX: target.x, newY: target.y, playerDamage: 0, logs: [], turnCountUpdate: turn };
    }
  }

  return { ...noAction(), turnCountUpdate: turn };
}

// ─── Nouveaux comportements ennemis ───────────────────────────────────────────

function processHealerTurn(enemy, player, enemies, room) {
  const livingAllies = enemies.filter(e => e.id !== enemy.id && e.hp > 0);

  // Dernier ennemi vivant : plus de raison de fuir → charge
  if (livingAllies.length === 0) {
    return processChaserTurn(enemy, player, enemies, room);
  }

  // Soigne les alliés adjacents blessés
  const adjAllies = enemies.filter(e =>
    e.id !== enemy.id && e.hp > 0 && e.hp < e.maxHp &&
    Math.abs(e.x - enemy.x) + Math.abs(e.y - enemy.y) === 1
  );
  const healActions = adjAllies.map(e => ({ id: e.id, amount: 2 }));

  // Fuite : s'éloigne du joueur
  const retreat = findRetreat(enemy, player, enemies, room);
  if (retreat) {
    return { moved: true, newX: retreat.x, newY: retreat.y, playerDamage: 0,
             logs: healActions.length > 0 ? [`💚 Guérisseur soigne !`] : [], healActions };
  }

  // Coincé sans retraite possible → attaque
  if (manhattanDist(enemy, player) === 1) {
    return { moved: false, newX: enemy.x, newY: enemy.y, playerDamage: enemy.attack,
             logs: [`💚 Guérisseur acculé !`], healActions };
  }

  return { moved: false, newX: enemy.x, newY: enemy.y, playerDamage: 0, logs: [], healActions };
}

function processSummonerTurn(enemy, player, enemies, room) {
  const turn = (enemy.turnCount || 0) + 1;
  const summonCount = enemy.summonCount || 0;
  const livingAllies = enemies.filter(e => e.id !== enemy.id && e.hp > 0);

  // Dernier ennemi vivant : plus d'alliés à protéger → charge
  if (livingAllies.length === 0) {
    const result = processChaserTurn(enemy, player, enemies, room);
    return { ...result, turnCountUpdate: turn };
  }

  // Invoque un Chasseur tous les 3 tours si moins de 2 invocations actives
  if (turn % 3 === 0 && summonCount < 2) {
    // Cherche une case libre adjacente
    const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
    let spawnPos = null;
    for (const d of dirs) {
      const nx = enemy.x + d.x, ny = enemy.y + d.y;
      if (nx >= 0 && ny >= 0 && nx < room.width && ny < room.height &&
          room.grid[ny]?.[nx] !== 'wall' && isCellFree(nx, ny, enemies, room)) {
        spawnPos = { x: nx, y: ny };
        break;
      }
    }
    if (spawnPos) {
      return { moved: false, newX: enemy.x, newY: enemy.y, playerDamage: 0,
               logs: [`👹 Invocateur : un Chasseur apparaît !`],
               summon: true, summonX: spawnPos.x, summonY: spawnPos.y,
               summonCountUpdate: summonCount + 1, turnCountUpdate: turn };
    }
  }

  // Fuite lente
  const retreat = findRetreat(enemy, player, enemies, room);
  if (retreat) {
    return { moved: true, newX: retreat.x, newY: retreat.y, playerDamage: 0,
             logs: [], turnCountUpdate: turn };
  }
  return { moved: false, newX: enemy.x, newY: enemy.y, playerDamage: 0,
           logs: [], turnCountUpdate: turn };
}

// ─── Pathfinding & utilitaires ────────────────────────────────────────────────

function findPathGreedy(from, to, allEnemies, room, maxSteps = 12) {
  const path    = [];
  let current   = { x: from.x, y: from.y };

  for (let step = 0; step < maxSteps; step++) {
    if (current.x === to.x && current.y === to.y) break;

    const neighbors = getNeighbors(current, room);
    const free      = neighbors.filter(n => {
      if (n.x === to.x && n.y === to.y) return true;
      return isCellFree(n.x, n.y, allEnemies, room);
    });

    if (free.length === 0) break;

    const best = free.reduce((a, b) =>
      manhattanDist(a, to) < manhattanDist(b, to) ? a : b
    );
    path.push(best);
    current = best;
  }
  return path;
}

function getNeighbors({ x, y }, room) {
  return [
    { x, y: y - 1 }, { x, y: y + 1 },
    { x: x - 1, y }, { x: x + 1, y },
  ].filter(n =>
    n.x >= 0 && n.y >= 0 &&
    n.x < room.width && n.y < room.height &&
    room.grid[n.y]?.[n.x] !== 'wall'
  );
}

function isCellFree(x, y, enemies, room) {
  if (!room?.grid) return false;
  if (room.grid[y]?.[x] === 'wall') return false;
  return !enemies.some(e => e.hp > 0 && e.x === x && e.y === y);
}

function hasLineOfSight(from, to, room) {
  let { x, y } = from;
  const dx = Math.abs(to.x - x), dy = Math.abs(to.y - y);
  const sx = x < to.x ? 1 : -1, sy = y < to.y ? 1 : -1;
  let err = dx - dy;

  for (let i = 0; i < 20; i++) {
    if (x === to.x && y === to.y) return true;
    if (room.grid[y]?.[x] === 'wall') return false;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx)  { err += dx; y += sy; }
  }
  return false;
}

function findRetreat(enemy, player, enemies, room) {
  const free = getNeighbors(enemy, room).filter(n => isCellFree(n.x, n.y, enemies, room));
  if (!free.length) return null;
  return free.reduce((a, b) =>
    manhattanDist(a, player) > manhattanDist(b, player) ? a : b
  );
}

function nextSpiralStep(enemy, room) {
  const DIRS = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }];
  const dir  = DIRS[(Math.floor((enemy.spiralStep || 0) / 2)) % 4];
  const nx   = enemy.x + dir.x;
  const ny   = enemy.y + dir.y;

  if (nx < 1 || ny < 1 || nx >= room.width - 1 || ny >= room.height - 1) {
    return { x: Math.floor(room.width / 2), y: Math.floor(room.height / 2) };
  }
  return { x: nx, y: ny };
}

export function calculateDamage(raw, defender) {
  let dmg = Math.max(1, raw - (defender.defense || 0));
  if (defender.statuses?.some(s => s.id === 'shield'))     dmg = Math.max(1, Math.floor(dmg * 0.5));
  if (defender.statuses?.some(s => s.id === 'vulnerable')) dmg = Math.floor(dmg * 1.5);
  return dmg;
}

export function calculateAoeDamage(origin, radius, damage, targets) {
  return targets
    .filter(t => t.hp > 0 && manhattanDist(origin, t) <= radius)
    .map(t => ({ id: t.id, damage: Math.max(1, damage - Math.floor(manhattanDist(origin, t) * 0.5)) }));
}

export function isAdjacent(a, b) { return manhattanDist(a, b) === 1; }

function manhattanDist(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
function noAction()           { return { moved: false, newX: 0, newY: 0, playerDamage: 0, logs: [] }; }
