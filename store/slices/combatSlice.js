/**
 * RIFT — Combat Slice
 * Mouvement, attaques, tours ennemis, logs, pops de dégâts, animations de mort
 */

import { processEnemyTurn } from '../../systems/combatSystem';
import { GAME_PHASES, PLAYER_SHAPES } from '../../constants';
import { hapticLight, hapticMedium, hapticHeavy, hapticError } from '../../utils/haptics';
import { checkNewAchievements, ACHIEVEMENTS_CATALOG } from '../achievements';

function findNearest(source, enemies) {
  return enemies.reduce((nearest, e) => {
    const dist     = Math.abs(e.x - source.x) + Math.abs(e.y - source.y);
    const bestDist = Math.abs(nearest.x - source.x) + Math.abs(nearest.y - source.y);
    return dist < bestDist ? e : nearest;
  });
}

export const createCombatSlice = (set, get) => ({

  // ── État ─────────────────────────────────────────────────────────────────────

  enemies:        [],
  isPlayerTurn:   true,
  combatLog:      [],
  damagePops:     [],   // [{ id, x, y, amount, isPlayer, isCombo }]
  dyingEnemies:   [],   // [{ ...enemySnapshot, dyingAt }]
  killsThisTurn:  0,    // Pour le système de combo

  // ── Mouvement joueur ─────────────────────────────────────────────────────────

  movePlayer: (dx, dy) => {
    const { player, enemies, currentRoom, phase, activeUpgrades } = get();
    if (phase !== GAME_PHASES.COMBAT) return;
    if (!get().isPlayerTurn) return;
    if (!currentRoom) return;

    const nx = player.x + dx;
    const ny = player.y + dy;

    if (nx < 0 || ny < 0 || nx >= currentRoom.width || ny >= currentRoom.height) return;
    if (currentRoom.grid[ny]?.[nx] === 'wall') return;

    const targetEnemy = enemies.find(e => e.x === nx && e.y === ny && e.hp > 0);
    if (targetEnemy) {
      get().playerAttack(targetEnemy.id);
      get().endPlayerTurn();
      return;
    }

    set(state => {
      const newPlayer = { ...state.player, x: nx, y: ny };
      if (state.activeUpgrades.some(u => u.id === 'momentum')) {
        newPlayer.charges = Math.min(newPlayer.charges + 1, newPlayer.maxCharges);
      }
      return { player: newPlayer };
    });

    get().endPlayerTurn();
  },

  // ── Attaque joueur ───────────────────────────────────────────────────────────

  playerAttack: (enemyId) => {
    const { player, enemies, activeUpgrades } = get();
    const enemy = enemies.find(e => e.id === enemyId);
    if (!enemy || enemy.hp <= 0) return;

    let dmg = Math.max(1, player.attack - enemy.defense);

    if (player.shape === PLAYER_SHAPES.TRIANGLE) {
      dmg = Math.max(1, player.attack - Math.floor(enemy.defense * 0.5));
    }

    if (player.shape === PLAYER_SHAPES.CIRCLE) {
      const adjEnemies = enemies.filter(e =>
        e.hp > 0 &&
        Math.abs(e.x - player.x) <= 1 &&
        Math.abs(e.y - player.y) <= 1
      );
      adjEnemies.forEach(e => get().damageEnemy(e.id, dmg));
      return;
    }

    if (activeUpgrades.some(u => u.id === 'momentum') && player.charges >= player.maxCharges) {
      dmg *= 2;
      set(state => ({ player: { ...state.player, charges: 0 } }));
      get().addLog(`⚡ MOMENTUM ! ${dmg} dégâts !`);
    }

    if (player.statuses?.some(s => s.id === 'attackBoost')) {
      dmg = Math.floor(dmg * 1.5);
      set(state => ({
        player: {
          ...state.player,
          statuses: state.player.statuses.filter(s => s.id !== 'attackBoost'),
        },
      }));
    }

    get().damageEnemy(enemyId, dmg);

    if (activeUpgrades.some(u => u.id === 'echo')) {
      const others = get().enemies.filter(e => e.id !== enemyId && e.hp > 0);
      if (others.length > 0) {
        const nearest  = findNearest(enemy, others);
        const echoDmg  = Math.max(1, Math.floor(dmg * 0.6));
        get().damageEnemy(nearest.id, echoDmg);
        get().addLog(`🔁 Echo : ${echoDmg} sur ${nearest.type}`);
      }
    }
  },

  // ── Dégâts ennemi ────────────────────────────────────────────────────────────

  damageEnemy: (enemyId, amount) => {
    const enemy = get().enemies.find(e => e.id === enemyId);

    set(state => ({
      enemies: state.enemies.map(e =>
        e.id === enemyId ? { ...e, hp: Math.max(0, e.hp - amount) } : e
      ),
    }));

    hapticLight();

    if (enemy) {
      get().addDamagePop(enemy.x, enemy.y, amount, false);
    }

    get().addLog(`💥 ${amount} dégâts`);

    const updated = get().enemies.find(e => e.id === enemyId);
    if (updated && updated.hp <= 0) {
      get().onEnemyKilled(updated);
    }
  },

  // ── Mort d'un ennemi ─────────────────────────────────────────────────────────

  onEnemyKilled: (enemy) => {
    const { activeUpgrades } = get();

    hapticMedium();
    get().addLog(`☠️ ${enemy.type} éliminé !`);

    // Supprimer l'ennemi du tableau actif → libère sa case immédiatement
    const dyingId = enemy.id;
    set(s => ({ enemies: s.enemies.filter(e => e.id !== dyingId) }));

    // Animation de mort (fantôme 500ms)
    set(s => ({ dyingEnemies: [...s.dyingEnemies, { ...enemy, dyingAt: Date.now() }] }));
    setTimeout(() => {
      set(s => ({ dyingEnemies: s.dyingEnemies.filter(e => e.id !== dyingId) }));
    }, 500);

    // Combo / streak
    const newKillsThisTurn = get().killsThisTurn + 1;
    set({ killsThisTurn: newKillsThisTurn });
    if (newKillsThisTurn >= 2) {
      const comboScore = newKillsThisTurn * 5;
      get().addComboPop(enemy.x, enemy.y, newKillsThisTurn);
      get().addLog(`🔥 COMBO x${newKillsThisTurn} ! +${comboScore} pts`);
      hapticMedium();
      set(state => ({ run: { ...state.run, score: state.run.score + comboScore } }));
    }

    // Score + fragments + kill counter
    const fragDrop = enemy.isBoss ? 10 : Math.floor(Math.random() * 3) + 1;
    set(state => ({
      run: {
        ...state.run,
        score:        state.run.score + (enemy.scoreValue || 10),
        killsThisRun: (state.run.killsThisRun || 0) + 1,
      },
      player: { ...state.player, fragments: state.player.fragments + fragDrop },
      meta:   { ...state.meta,   totalKills: state.meta.totalKills + 1 },
    }));

    // Achievements kill
    const { meta, run } = get();
    const newAch = checkNewAchievements(meta, run);
    if (newAch.length > 0) {
      set(s => ({ meta: { ...s.meta, achievements: [...s.meta.achievements, ...newAch] } }));
      newAch.forEach(id => {
        const a = ACHIEVEMENTS_CATALOG.find(x => x.id === id);
        if (a) get().addLog(`🏅 Succès : ${a.icon} ${a.name}`);
      });
    }

    // Upgrade Fracture
    if (activeUpgrades.some(u => u.id === 'fracture')) {
      const adjEnemies = get().enemies.filter(e =>
        e.hp > 0 &&
        Math.abs(e.x - enemy.x) <= 1 &&
        Math.abs(e.y - enemy.y) <= 1
      );
      const fragDmg = Math.floor(enemy.maxHp * 0.3);
      adjEnemies.forEach(e => {
        get().damageEnemy(e.id, fragDmg);
        get().addLog(`💢 Fracture : ${fragDmg}`);
      });
    }

    if (activeUpgrades.some(u => u.id === 'leech')) {
      get().healPlayer(1);
    }

    if (activeUpgrades.some(u => u.id === 'chain_reaction')) {
      set(state => ({
        player: {
          ...state.player,
          statuses: [...(state.player.statuses || []), { id: 'attackBoost', duration: 1 }],
        },
      }));
    }

    const remaining = get().enemies.filter(e => e.hp > 0);
    if (remaining.length === 0) {
      get().onRoomCleared();
    }
  },

  // ── Dégâts joueur ────────────────────────────────────────────────────────────

  damagePlayer: (amount, sourceId) => {
    const { player, activeUpgrades } = get();
    let finalDmg = Math.max(1, amount - player.defense);

    if (player.shape === PLAYER_SHAPES.HEXAGON) {
      finalDmg = Math.max(1, Math.floor(finalDmg * 0.5));
      if (sourceId) {
        const ripDmg = Math.floor(player.attack * 0.5);
        get().damageEnemy(sourceId, ripDmg);
        get().addLog(`🛡️ Riposte : ${ripDmg}`);
      }
    }

    if (player.statuses?.some(s => s.id === 'shield')) {
      finalDmg = Math.max(1, Math.floor(finalDmg * 0.5));
      set(state => ({
        player: {
          ...state.player,
          statuses: state.player.statuses.filter(s => s.id !== 'shield'),
        },
      }));
    }

    if (activeUpgrades.some(u => u.id === 'thorns') && sourceId) {
      get().damageEnemy(sourceId, 2);
      get().addLog(`🌿 Épines : 2`);
    }

    get().addLog(`❤️ -${finalDmg} PV`);
    get().addDamagePop(player.x, player.y, finalDmg, true);
    set(s => ({ run: { ...s.run, damageTakenInRoom: (s.run.damageTakenInRoom || 0) + finalDmg } }));

    // Haptique selon sévérité
    const newHp = player.hp - finalDmg;
    if (newHp <= 0) hapticError();
    else if (newHp / player.maxHp < 0.3) hapticHeavy();
    else hapticHeavy();

    set(state => ({
      player: { ...state.player, hp: Math.max(0, state.player.hp - finalDmg) },
    }));

    if (get().player.hp <= 0) {
      get().onPlayerDeath();
    }
  },

  healPlayer: (amount) => {
    set(state => ({
      player: {
        ...state.player,
        hp: Math.min(state.player.maxHp, state.player.hp + amount),
      },
    }));
  },

  // ── Tours ennemis ────────────────────────────────────────────────────────────

  endPlayerTurn: () => {
    set(s => ({ isPlayerTurn: false, run: { ...s.run, turnsInRoom: (s.run.turnsInRoom || 0) + 1 } }));
    setTimeout(() => get().runEnemyTurns(), 350);
  },

  runEnemyTurns: () => {
    const aliveIds = get().enemies.filter(e => e.hp > 0).map(e => e.id);

    const processNext = (index) => {
      if (index >= aliveIds.length) {
        set({ isPlayerTurn: true });
        return;
      }
      const current = get().enemies.find(e => e.id === aliveIds[index]);
      if (current && current.hp > 0) {
        get().runOneEnemyTurn(aliveIds[index]);
      }
      setTimeout(() => processNext(index + 1), 200);
    };

    processNext(0);
    // Reset combo counter dès que le tour ennemi commence
    set({ killsThisTurn: 0 });
  },

  runOneEnemyTurn: (enemyId) => {
    const state  = get();
    const result = processEnemyTurn(enemyId, state);
    if (!result) return;

    if (result.moved) {
      set(s => ({
        enemies: s.enemies.map(e =>
          e.id === enemyId ? { ...e, x: result.newX, y: result.newY } : e
        ),
      }));
    }

    if (result.turnCountUpdate !== undefined) {
      set(s => ({
        enemies: s.enemies.map(e =>
          e.id === enemyId ? { ...e, turnCount: result.turnCountUpdate } : e
        ),
      }));
    }

    // Fix spiralStep (BOSS_VOID)
    if (result.spiralStepUpdate !== undefined) {
      set(s => ({
        enemies: s.enemies.map(e =>
          e.id === enemyId ? { ...e, spiralStep: result.spiralStepUpdate } : e
        ),
      }));
    }

    if (result.playerDamage > 0) {
      get().damagePlayer(result.playerDamage, enemyId);
    }

    if (result.logs) {
      result.logs.forEach(l => get().addLog(l));
    }
  },

  // ── Utilitaires ──────────────────────────────────────────────────────────────

  addLog: (message) => {
    set(state => ({
      combatLog: [
        ...state.combatLog.slice(-24),
        { text: message, time: Date.now() },
      ],
    }));
  },

  addDamagePop: (x, y, amount, isPlayer = false) => {
    const id = `pop_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    set(s => ({ damagePops: [...s.damagePops.slice(-8), { id, x, y, amount, isPlayer }] }));
    setTimeout(() => {
      set(s => ({ damagePops: s.damagePops.filter(p => p.id !== id) }));
    }, 900);
  },

  addComboPop: (x, y, count) => {
    const id = `combo_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    set(s => ({ damagePops: [...s.damagePops.slice(-8), { id, x, y, amount: count, isCombo: true }] }));
    setTimeout(() => {
      set(s => ({ damagePops: s.damagePops.filter(p => p.id !== id) }));
    }, 1200);
  },
});
