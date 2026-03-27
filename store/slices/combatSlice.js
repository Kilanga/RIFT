/**
 * RIFT — Combat Slice
 * Mouvement, attaques, tours ennemis, logs, pops de dégâts, animations de mort
 */

import { processEnemyTurn, resolveEnemyStatuses, mergeEnemyStatus } from '../../systems/combatSystem';
import { GAME_PHASES, PLAYER_SHAPES, CELL_TYPES } from '../../constants';
import { hapticLight, hapticMedium, hapticHeavy, hapticError } from '../../utils/haptics';
import { checkNewAchievements, ACHIEVEMENTS_CATALOG } from '../achievements';
import { hasCurseSynergy } from '../../systems/upgradeSystem';

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
  blinkUsed:      false, // Clignotement (upgrade actif, 1 usage par salle)
  secondWindUsed: false, // Second Souffle (upgrade actif, 1 usage par run)
  hitEnemyIds:    new Set(), // IDs ennemis touchés pour le flash visuel
  lastCritAt:     0,         // Timestamp du dernier critique (pour le screen shake)

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
      if (state.activeUpgrades.some(u => u.id === 'phase_shift')) {
        const others = (newPlayer.statuses || []).filter(s => s.id !== 'phaseShift');
        newPlayer.statuses = [...others, { id: 'phaseShift', turnsLeft: 2 }];
      }
      return { player: newPlayer };
    });

    // Pièges environnementaux (Spectre est immunisé — passif Éthéré)
    if (get().player.shape !== PLAYER_SHAPES.SPECTRE) {
      const cellType = get().currentRoom?.grid[ny]?.[nx];
      if (cellType === CELL_TYPES.LAVA) {
        get().damagePlayer(2);
        get().addLog(`🌋 Lave ! -2 PV`);
      } else if (cellType === CELL_TYPES.TELEPORT) {
        const pairs = get().currentRoom?.teleportPairs;
        if (pairs) {
          const pair = pairs.find(p =>
            (p.a.x === nx && p.a.y === ny) || (p.b.x === nx && p.b.y === ny)
          );
          if (pair) {
            const dest = (pair.a.x === nx && pair.a.y === ny) ? pair.b : pair.a;
            set(s => ({ player: { ...s.player, x: dest.x, y: dest.y } }));
            get().addLog(`🌀 Téléportation !`);
          }
        }
      }
    }

    // Malédiction : chaque déplacement coûte 1 PV (×2 si pacte maudit)
    if (get().activeUpgrades.some(u => u.id === 'malediction')) {
      const cm = hasCurseSynergy(get().activeUpgrades) ? 2 : 1;
      get().damagePlayer(cm);
    }

    if (get().player.hp > 0) {
      get().endPlayerTurn();
    }
  },

  // ── Attaque joueur ───────────────────────────────────────────────────────────

  playerAttack: (enemyId) => {
    const { player, enemies, activeUpgrades } = get();
    const enemy = enemies.find(e => e.id === enemyId);
    if (!enemy || enemy.hp <= 0) return;

    const curseMult = hasCurseSynergy(activeUpgrades) ? 2 : 1;

    // Tranchant : pénétration d'armure (2 pts par stack, ×2 si pacte maudit)
    const piercing = activeUpgrades.filter(u => u.id === 'tranchant').length * 2 * curseMult;
    const effectiveDef = Math.max(0, enemy.defense - piercing);

    let dmg = Math.max(1, player.attack - effectiveDef);

    if (player.shape === PLAYER_SHAPES.TRIANGLE) {
      dmg = Math.max(1, player.attack - Math.floor(effectiveDef * 0.5));
    }

    // Spectre — Éthéré : ignore entièrement la défense ennemie
    if (player.shape === PLAYER_SHAPES.SPECTRE) {
      dmg = player.attack;
    }

    if (player.shape === PLAYER_SHAPES.CIRCLE) {
      const adjEnemies = enemies.filter(e =>
        e.hp > 0 &&
        Math.abs(e.x - player.x) <= 1 &&
        Math.abs(e.y - player.y) <= 1
      );
      adjEnemies.forEach(e => get().damageEnemy(e.id, dmg));
      const hitIds = adjEnemies.map(e => e.id);
      if (activeUpgrades.some(u => u.id === 'ignition') && hitIds.length > 0) {
        set(s => ({ enemies: s.enemies.map(e => hitIds.includes(e.id) ? { ...e, statuses: mergeEnemyStatus(e.statuses || [], { id: 'burn', duration: 2, value: 3 }) } : e) }));
        get().addLog(`🔥 Ignition : brûlure AoE !`);
      }
      if (activeUpgrades.some(u => u.id === 'gelbomb') && hitIds.length > 0) {
        set(s => ({ enemies: s.enemies.map(e => hitIds.includes(e.id) ? { ...e, statuses: mergeEnemyStatus(e.statuses || [], { id: 'freeze', duration: 1 }) } : e) }));
        get().addLog(`❄️ Gelbomb : gel AoE !`);
      }
      return;
    }

    if (activeUpgrades.some(u => u.id === 'momentum') && player.charges >= player.maxCharges) {
      dmg *= 2;
      set(state => ({ player: { ...state.player, charges: 0 } }));
      get().addLog(`⚡ MOMENTUM ! ${dmg} dégâts !`);
    }

    // Critique : 15%×stacks de chance, ×3 dégâts (×6 si pacte maudit)
    const critCount = activeUpgrades.filter(u => u.id === 'critique').length;
    if (critCount > 0 && Math.random() < Math.min(1.0, critCount * 0.15 * curseMult)) {
      dmg *= 3 * curseMult;
      set({ lastCritAt: Date.now() });
      get().addLog(`💥 CRITIQUE${curseMult > 1 ? ' ×MAUDIT' : ''} ! ${dmg} dégâts !`);
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

    // Berserker : ATQ ×2 sous 30% de PV
    if (activeUpgrades.some(u => u.id === 'berserker') && player.hp <= player.maxHp * 0.3) {
      dmg *= 2;
      get().addLog(`🔴 Berserker ! ${dmg} dégâts !`);
    }

    get().damageEnemy(enemyId, dmg);

    // Ignition : brûlure sur l'ennemi ciblé (3 dégâts/tour, 2 tours)
    if (activeUpgrades.some(u => u.id === 'ignition')) {
      set(s => ({ enemies: s.enemies.map(e => e.id === enemyId ? { ...e, statuses: mergeEnemyStatus(e.statuses || [], { id: 'burn', duration: 2, value: 3 }) } : e) }));
      get().addLog(`🔥 Ignition : brûlure !`);
    }
    // Gelbomb : gel sur l'ennemi ciblé (bloque le mouvement 1 tour)
    if (activeUpgrades.some(u => u.id === 'gelbomb')) {
      set(s => ({ enemies: s.enemies.map(e => e.id === enemyId ? { ...e, statuses: mergeEnemyStatus(e.statuses || [], { id: 'freeze', duration: 1 }) } : e) }));
      get().addLog(`❄️ Gelbomb : gel !`);
    }

    // Cyclone : frappe aussi les ennemis adjacents à 50% (non-Cercle seulement)
    if (player.shape !== PLAYER_SHAPES.CIRCLE && activeUpgrades.some(u => u.id === 'cyclone')) {
      const cycloneDmg = Math.max(1, Math.floor(dmg * 0.5));
      const adjEnemies = get().enemies.filter(e =>
        e.id !== enemyId && e.hp > 0 &&
        Math.abs(e.x - player.x) <= 1 && Math.abs(e.y - player.y) <= 1
      );
      adjEnemies.forEach(e => get().damageEnemy(e.id, cycloneDmg));
      if (adjEnemies.length > 0) get().addLog(`🌀 Cyclone : ${cycloneDmg} ×${adjEnemies.length}`);
    }

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
      // Flash visuel
      set(s => ({ hitEnemyIds: new Set([...s.hitEnemyIds, enemyId]) }));
      setTimeout(() => {
        set(s => { const next = new Set(s.hitEnemyIds); next.delete(enemyId); return { hitEnemyIds: next }; });
      }, 200);
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
    const curseMult = hasCurseSynergy(activeUpgrades) ? 2 : 1;

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

    // EXPLOSIVE : explose à la mort, AoE rayon 2
    if (enemy.behavior === 'explode') {
      const aoeDmg = 4;
      const { player: explP } = get();
      if (Math.abs(explP.x - enemy.x) + Math.abs(explP.y - enemy.y) <= 2) {
        get().damagePlayer(aoeDmg);
        get().addLog(`💥 EXPLOSION ! -${aoeDmg} PV !`);
      }
      const blastTargets = get().enemies.filter(e => e.hp > 0 && Math.abs(e.x - enemy.x) + Math.abs(e.y - enemy.y) <= 2);
      blastTargets.forEach(e => get().damageEnemy(e.id, aoeDmg));
      if (blastTargets.length > 0) get().addLog(`💥 Explosion frappe ${blastTargets.length} ennemi(s)`);
    }

    // Combo / streak
    const newKillsThisTurn = get().killsThisTurn + 1;
    set({ killsThisTurn: newKillsThisTurn });
    if (newKillsThisTurn >= 2) {
      const comboScore = newKillsThisTurn * 5;
      get().addComboPop(enemy.x, enemy.y, newKillsThisTurn);
      get().addLog(`🔥 COMBO x${newKillsThisTurn} ! +${comboScore} pts`);
      hapticMedium();
      set(state => ({
        run: {
          ...state.run,
          score:            state.run.score + comboScore,
          maxComboThisRun:  Math.max(state.run.maxComboThisRun || 0, newKillsThisTurn),
        },
      }));

      // Parasitisme : soigne 3 PV par stack lors d'un combo (×curseMult)
      const parasCount = get().activeUpgrades.filter(u => u.id === 'parasitisme').length;
      if (parasCount > 0) {
        const parasHeal = parasCount * 3 * curseMult;
        get().healPlayer(parasHeal);
        get().addLog(`💚 Parasitisme : +${parasHeal} PV`);
      }

      // Combustion : AoE 3 autour du joueur sur chaque combo (×curseMult)
      const combustCount = get().activeUpgrades.filter(u => u.id === 'combustion').length;
      if (combustCount > 0) {
        const { player: p, enemies: alive } = get();
        const adjEnemies = alive.filter(e =>
          e.hp > 0 && Math.abs(e.x - p.x) <= 1 && Math.abs(e.y - p.y) <= 1
        );
        const combustDmg = combustCount * 3 * curseMult;
        adjEnemies.forEach(e => {
          get().damageEnemy(e.id, combustDmg);
        });
        if (adjEnemies.length > 0) get().addLog(`🔥 Combustion : ${combustDmg} AoE`);
      }
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

    // Upgrade Fracture (×curseMult)
    if (activeUpgrades.some(u => u.id === 'fracture')) {
      const adjEnemies = get().enemies.filter(e =>
        e.hp > 0 &&
        Math.abs(e.x - enemy.x) <= 1 &&
        Math.abs(e.y - enemy.y) <= 1
      );
      const fragDmg = Math.floor(enemy.maxHp * Math.min(1.0, 0.3 * curseMult));
      adjEnemies.forEach(e => {
        get().damageEnemy(e.id, fragDmg);
        get().addLog(`💢 Fracture : ${fragDmg}`);
      });
    }

    if (activeUpgrades.some(u => u.id === 'leech')) {
      get().healPlayer(curseMult);
    }

    // Soif de Sang : -1 PV par kill (×curseMult = malus amplifié)
    if (activeUpgrades.some(u => u.id === 'soif_sang')) {
      get().damagePlayer(curseMult);
      get().addLog(`🩸 Soif de Sang : -${curseMult} PV`);
    }

    if (activeUpgrades.some(u => u.id === 'chain_reaction')) {
      set(state => ({
        player: {
          ...state.player,
          statuses: [...(state.player.statuses || []), { id: 'attackBoost', duration: 1 }],
        },
      }));
    }

    // Shockwave : étourdit les ennemis adjacents au joueur après un kill
    const shockCount = get().activeUpgrades.filter(u => u.id === 'shockwave').length;
    if (shockCount > 0) {
      const { player: shockP, enemies: shockTargets } = get();
      const stunnable = shockTargets.filter(e => e.hp > 0 && Math.abs(e.x - shockP.x) + Math.abs(e.y - shockP.y) <= 1);
      if (stunnable.length > 0) {
        const stunIds = new Set(stunnable.map(e => e.id));
        set(s => ({
          enemies: s.enemies.map(e =>
            stunIds.has(e.id) ? { ...e, statuses: mergeEnemyStatus(e.statuses || [], { id: 'stun', duration: 1 }) } : e
          ),
        }));
        get().addLog(`⚡ Shockwave : ${stunnable.length} ennemi(s) étourdi(s) !`);
      }
    }

    const remaining = get().enemies.filter(e => e.hp > 0);
    if (remaining.length === 0 && get().player.hp > 0) {
      get().onRoomCleared();
    }
  },

  // ── Dégâts joueur ────────────────────────────────────────────────────────────

  damagePlayer: (amount, sourceId) => {
    const { player, activeUpgrades } = get();
    const curseMult = hasCurseSynergy(activeUpgrades) ? 2 : 1;

    // Esquive : 20%×stacks de chance d'annuler (×curseMult, cap 80%)
    const esquiveCount = activeUpgrades.filter(u => u.id === 'esquive').length;
    if (esquiveCount > 0 && Math.random() < Math.min(0.8, esquiveCount * 0.2 * curseMult)) {
      get().addLog(`💨 Esquive !`);
      return;
    }

    let finalDmg = Math.max(1, amount - player.defense);

    // Résistance : -35% dégâts si PV > 50% (×curseMult → jusqu'à -70%)
    if (activeUpgrades.some(u => u.id === 'resistance') && player.hp > player.maxHp * 0.5) {
      const reduction = Math.min(0.8, 0.35 * curseMult);
      finalDmg = Math.max(1, Math.round(finalDmg * (1 - reduction)));
    }

    // Fardeau / Âme Maudite : uniquement sur attaques ennemies (pas les auto-dégâts)
    if (sourceId !== undefined) {
      if (activeUpgrades.some(u => u.id === 'fardeau')) {
        finalDmg += 2 * curseMult;
      }
      if (activeUpgrades.some(u => u.id === 'ame_maudite')) {
        finalDmg += 2 * curseMult;
      }
    }

    if (player.shape === PLAYER_SHAPES.HEXAGON) {
      finalDmg = Math.max(1, Math.floor(finalDmg * 0.5));
      if (sourceId) {
        const ripDmg = Math.floor(player.attack * 0.5);
        get().damageEnemy(sourceId, ripDmg);
        get().addLog(`🛡️ Riposte : ${ripDmg}`);
      }
    }

    const hadShield = player.statuses?.some(s => s.id === 'shield');
    if (hadShield) {
      finalDmg = Math.max(1, Math.floor(finalDmg * 0.5));
      set(state => ({
        player: {
          ...state.player,
          statuses: state.player.statuses.filter(s => s.id !== 'shield'),
        },
      }));
      // Regain : chaque stack = +2 PV quand le bouclier absorbe (×curseMult)
      const regainCount = activeUpgrades.filter(u => u.id === 'regain').length;
      if (regainCount > 0) {
        const regainHeal = regainCount * 2 * curseMult;
        get().healPlayer(regainHeal);
        get().addLog(`💚 Regain : +${regainHeal} PV`);
      }
    }

    const thornsCount = activeUpgrades.filter(u => u.id === 'thorns').length;
    if (thornsCount > 0 && sourceId) {
      const thornsDmg = thornsCount * 2 * curseMult;
      get().damageEnemy(sourceId, thornsDmg);
      get().addLog(`🌿 Épines : ${thornsDmg}`);
    }

    get().addLog(`❤️ -${finalDmg} PV`);
    get().addDamagePop(player.x, player.y, finalDmg, true);
    set(s => ({ run: { ...s.run, damageTakenInRoom: (s.run.damageTakenInRoom || 0) + finalDmg } }));

    // Haptique selon sévérité
    const newHp = player.hp - finalDmg;
    if (newHp <= 0) hapticError();
    else hapticHeavy();

    set(state => {
      let hp = Math.max(0, state.player.hp - finalDmg);

      // Second Souffle : survit une fois par run à un coup fatal
      const secondWindFired = hp <= 0 && activeUpgrades.some(u => u.id === 'second_wind') && !state.secondWindUsed;
      if (secondWindFired) {
        hp = 1;
        get().addLog(`💨 SECOND SOUFFLE ! Tu survives !`);
        hapticError();
        // Succès Miraculé — déclenché dès l'activation, pas seulement en cas de victoire
        const { meta, run } = get();
        const ach = checkNewAchievements(meta, run, { usedSecondWind: true });
        if (ach.length > 0) {
          set(s => ({ meta: { ...s.meta, achievements: [...s.meta.achievements, ...ach] } }));
          ach.forEach(id => {
            const a = ACHIEVEMENTS_CATALOG.find(x => x.id === id);
            if (a) get().addLog(`🏅 Succès : ${a.icon} ${a.name}`);
          });
        }
      }

      // Nettoyer le statut phaseShift après avoir été touché
      const statuses = (state.player.statuses || []).filter(s => s.id !== 'phaseShift');

      // Shield Pulse : bouclier après coup ennemi uniquement (pas les auto-dégâts)
      if (sourceId !== undefined && activeUpgrades.some(u => u.id === 'shield_pulse') && !statuses.some(s => s.id === 'shield')) {
        statuses.push({ id: 'shield', duration: 1 });
      }

      return {
        player:         { ...state.player, hp, statuses },
        secondWindUsed: secondWindFired ? true : state.secondWindUsed,
      };
    });

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
    const { player, currentRoom, meta } = get();
    
    // Téléportation passive Spectre (20% de chance chaque tour)
    if (meta.isPremium && player.shape === PLAYER_SHAPES.SPECTRE && currentRoom) {
      const teleportRoll = Math.random();
      if (teleportRoll < 0.2) { // 20% de chance
        let emptyCell = null;
        for (let attempt = 0; attempt < 20; attempt++) {
          const x = Math.floor(Math.random() * currentRoom.width);
          const y = Math.floor(Math.random() * currentRoom.height);
          const cell = currentRoom.grid[y]?.[x];
          if (cell === 'empty' || cell === 'exit' || cell === 'chest') {
            emptyCell = { x, y };
            break;
          }
        }
        if (emptyCell) {
          set(s => ({
            player: { ...s.player, x: emptyCell.x, y: emptyCell.y },
          }));
          get().addLog(`👻 Spectre se téléporte !`);
        }
      }
    }
    
    set(s => ({ isPlayerTurn: false, run: { ...s.run, turnsInRoom: (s.run.turnsInRoom || 0) + 1 } }));
    setTimeout(() => get().runEnemyTurns(), 350);
  },

  runEnemyTurns: () => {
    // Décrémenter les statuts à durée du joueur (phaseShift, etc.)
    set(s => ({
      player: {
        ...s.player,
        statuses: (s.player.statuses || [])
          .map(st => st.turnsLeft !== undefined ? { ...st, turnsLeft: st.turnsLeft - 1 } : st)
          .filter(st => st.turnsLeft === undefined || st.turnsLeft > 0),
      },
    }));

    // Vigile : inflige 1 dégât aux ennemis adjacents en fin de tour joueur (×curseMult)
    const vigileUpgrades = get().activeUpgrades;
    const vigileCurseMult = hasCurseSynergy(vigileUpgrades) ? 2 : 1;
    const vigileCount = vigileUpgrades.filter(u => u.id === 'vigile').length;
    if (vigileCount > 0) {
      const { player: p } = get();
      const adjEnemies = get().enemies.filter(e =>
        e.hp > 0 && Math.abs(e.x - p.x) <= 1 && Math.abs(e.y - p.y) <= 1
      );
      const vigileDmg = vigileCount * vigileCurseMult;
      adjEnemies.forEach(e => get().damageEnemy(e.id, vigileDmg));
      if (adjEnemies.length > 0) get().addLog(`🔵 Vigile : ${vigileDmg} ×${adjEnemies.length}`);
    }

    // Corruption (malédiction) : perd 1 PV au début du tour ennemi (×curseMult = malus amplifié)
    if (get().activeUpgrades.some(u => u.id === 'corruption')) {
      get().damagePlayer(vigileCurseMult);
      get().addLog(`💀 Corruption : -${vigileCurseMult} PV`);
    }

    // Joueur mort par corruption → stop les tours ennemis
    if (get().player.hp <= 0) return;

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
    const enemy = get().enemies.find(e => e.id === enemyId);
    if (!enemy || enemy.hp <= 0) return;

    // 1. Résoudre les statuts actifs (burn, freeze, stun)
    const { skipTurn, skipMovement, dotDamage, updatedStatuses } = resolveEnemyStatuses(enemy);

    // 2. Appliquer brûlure + mise à jour statuts
    if (dotDamage > 0) {
      const newHp = Math.max(0, enemy.hp - dotDamage);
      set(s => ({
        enemies: s.enemies.map(e =>
          e.id === enemyId ? { ...e, hp: newHp, statuses: updatedStatuses } : e
        ),
      }));
      get().addLog(`🔥 ${enemy.type} brûle : -${dotDamage} PV`);
      if (newHp <= 0) {
        const dead = get().enemies.find(e => e.id === enemyId);
        if (dead) get().onEnemyKilled(dead);
        return;
      }
    } else {
      set(s => ({
        enemies: s.enemies.map(e =>
          e.id === enemyId ? { ...e, statuses: updatedStatuses } : e
        ),
      }));
    }

    // 3. Étourdi → passe son tour
    if (skipTurn) {
      get().addLog(`💫 ${enemy.type} est étourdi !`);
      return;
    }

    // 4. Traiter l'action (skipMovement=true si gelé)
    const result = processEnemyTurn(enemyId, get(), skipMovement);
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

    if (result.spiralStepUpdate !== undefined) {
      set(s => ({
        enemies: s.enemies.map(e =>
          e.id === enemyId ? { ...e, spiralStep: result.spiralStepUpdate } : e
        ),
      }));
    }

    // Guérisseur : soigne les alliés adjacents
    if (result.healActions?.length > 0) {
      set(s => ({
        enemies: s.enemies.map(e => {
          const ha = result.healActions.find(a => a.id === e.id);
          return ha ? { ...e, hp: Math.min(e.maxHp, e.hp + ha.amount) } : e;
        }),
      }));
    }

    // Invocateur : spawn un nouveau Chasseur
    if (result.summon) {
      const newChaser = {
        id: `summoned_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        type: 'chaser', behavior: 'chase',
        x: result.summonX, y: result.summonY,
        hp: 5, maxHp: 5, attack: 3, defense: 0, speed: 1,
        scoreValue: 5, statuses: [],
      };
      set(s => ({ enemies: [...s.enemies, newChaser] }));
      set(s => ({
        enemies: s.enemies.map(e =>
          e.id === enemyId ? { ...e, summonCount: result.summonCountUpdate } : e
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

  // ── Blink (upgrade actif) ────────────────────────────────────────────────────

  useBlink: () => {
    const { activeUpgrades, blinkUsed, currentRoom, enemies, player, phase } = get();
    if (phase !== 'combat') return;
    if (blinkUsed) return;
    if (!activeUpgrades.some(u => u.id === 'blink')) return;
    if (!currentRoom) return;

    const { grid, width, height } = currentRoom;
    const freeCells = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (grid[y]?.[x] === 'wall') continue;
        if (x === player.x && y === player.y) continue;
        if (enemies.some(e => e.x === x && e.y === y)) continue;
        freeCells.push({ x, y });
      }
    }
    if (freeCells.length === 0) return;

    const target = freeCells[Math.floor(Math.random() * freeCells.length)];
    set(s => ({
      player:    { ...s.player, x: target.x, y: target.y },
      blinkUsed: true,
    }));
    get().addLog(`⚡ Clignotement !`);
    hapticMedium();
  },

  addComboPop: (x, y, count) => {
    const id = `combo_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    set(s => ({ damagePops: [...s.damagePops.slice(-8), { id, x, y, amount: count, isCombo: true }] }));
    setTimeout(() => {
      set(s => ({ damagePops: s.damagePops.filter(p => p.id !== id) }));
    }, 1200);
  },
});
