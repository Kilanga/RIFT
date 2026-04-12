/**
 * RIFT — Progression Slice
 * Salles, upgrades, repos, shop, victoire
 */

import { generateRoom } from '../../utils/procGen';
import { ALL_UPGRADES, applySynergies, getUpgradeChoices, getUpgradeById, computePlayerStats, hasCurseSynergy } from '../../systems/upgradeSystem';
import { pickPermanentUpgrades, isUnlockConditionMet } from '../../utils/metaHelpers';
import { ROOM_TYPES, GAME_PHASES, ENEMY_TYPES, PERMANENT_UPGRADES_CATALOG, ACT1_BOSS_TYPES, RUST_BOSS_UNLOCK_THRESHOLD } from '../../constants';
import { hapticSuccess, hapticMedium } from '../../utils/haptics';
import { playSfx } from '../../services/audioService';
import { checkNewAchievements, ACHIEVEMENTS_CATALOG, withUpdatedWeeklyQuest } from '../achievements';
import { submitScore } from '../../services/leaderboardService';
import { pickRandomEvent } from '../../utils/eventCatalog';
import { TALENT_CATALOG, getTalentById } from '../../utils/talentCatalog';
import { trackAnalyticsEvent } from '../../services/analyticsService';
import { getShieldBlockValue } from '../../utils/shield';

function getSynergyActiveColors(upgrades) {
  const counts = upgrades.reduce((acc, u) => {
    acc[u.color] = (acc[u.color] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .filter(([, count]) => count >= 7)
    .map(([color]) => color);
}

function getUnlockablePermanentCount(meta) {
  return PERMANENT_UPGRADES_CATALOG.filter(u => isUnlockConditionMet(u, meta)).length;
}

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const REST_SKIP_FRAGMENT_REWARD = 5;

function getActLocalLayerIndex(node, run) {
  const bounds = run.actBoundaries || [];
  if (node.act === 1) return node.layer;
  if (node.act === 2) return node.layer - (bounds[0] || 0);
  return node.layer - (bounds[1] || 0);
}

function getBaseActMultipliers(act, localLayerIndex) {
  if (act === 1) {
    return { mob: 1, elite: 1, boss: 1 };
  }

  if (act === 2) {
    if (localLayerIndex <= 0) return { mob: 1.12, elite: 1.15, boss: 1.12 };
    return { mob: 1.2, elite: 1.25, boss: 1.2 };
  }

  if (localLayerIndex <= 0) return { mob: 1.35, elite: 1.45, boss: 1.4 };
  return { mob: 1.45, elite: 1.55, boss: 1.5 };
}

function buildEnemyBalanceProfile(roomNode, run) {
  const localLayerIndex = getActLocalLayerIndex(roomNode, run);
  const base = getBaseActMultipliers(roomNode.act, localLayerIndex);
  const adaptiveScale = clamp(run.enemyAdaptiveScale || 1, 0.9, 1.12);

  return {
    categoryMultipliers: {
      mob: clamp(base.mob * adaptiveScale, 0.9, 1.8),
      elite: clamp(base.elite * adaptiveScale, 0.9, 1.9),
      boss: clamp(base.boss * adaptiveScale, 0.9, 1.8),
    },
    attackWeight: 0.7,
    defenseWeight: 0.5,
    defenseCaps: {
      mob: 3,
      elite: 4,
      boss: 6,
    },
  };
}

function applyEventEffect(effect, get, set) {
  if (!effect) return;

  switch (effect.type) {
    case 'none': break;

    case 'heal':
      get().healPlayer(effect.value);
      break;

    case 'damage':
      get().damagePlayer(effect.value);
      break;

    case 'fragments':
      set(s => ({ player: { ...s.player, fragments: Math.max(0, s.player.fragments + effect.value) } }));
      break;

    case 'score':
      set(s => ({ run: { ...s.run, score: s.run.score + effect.value } }));
      break;

    case 'stat_delta': {
      const { playerBase, activeUpgrades, player } = get();
      const newBase = { ...playerBase };
      effect.changes.forEach(({ stat, delta }) => {
        if (newBase[stat] !== undefined) newBase[stat] += delta;
      });
      const newStats = computePlayerStats(newBase, activeUpgrades);
      const hpGain = Math.max(0, newStats.maxHp - player.maxHp);
      set(s => ({
        playerBase: newBase,
        player: {
          ...s.player,
          attack:  newStats.attack,
          defense: newStats.defense,
          maxHp:   newStats.maxHp,
          hp:      Math.min(s.player.hp + hpGain, newStats.maxHp),
        },
      }));
      break;
    }

    case 'gamble': {
      const success = Math.random() < effect.chance;
      applyEventEffect(success ? effect.success : effect.fail, get, set);
      break;
    }

    case 'composite':
      (effect.effects || []).forEach(e => applyEventEffect(e, get, set));
      break;

    case 'upgrade_choice':
      // Handled in applyEventChoice
      break;

    default: break;
  }
}

function markNodeCleared(roomMap, nodeId) {
  return roomMap.map(layer =>
    layer.map(node =>
      node.id === nodeId ? { ...node, cleared: true } : node
    )
  );
}

export const createProgressionSlice = (set, get) => ({

  // ── État ─────────────────────────────────────────────────────────────────────

  currentRoom:          null,
  bossIntroType:        null,
  currentEvent:         null,
  activeUpgrades:       [],
  upgradeChoices:       [],
  pendingUpgradeChoice: false,

  // ── Salle ────────────────────────────────────────────────────────────────────

  enterRoom: (roomNode) => {
    const { player, run } = get();
    const metaSnapshot = get().meta;
    const roomSeed = ((run.mapSeed || 0) ^ hashString(roomNode.id || '')) >>> 0;
    const permanentCount = (metaSnapshot.permanentUpgrades || []).length;
    const unlockablePermanentUpgrades = PERMANENT_UPGRADES_CATALOG.filter(u => isUnlockConditionMet(u, metaSnapshot));
    const unlockablePermanentCount = unlockablePermanentUpgrades.length;
    const missingPermanentUpgrades = Math.max(0, unlockablePermanentCount - permanentCount);
    const act1BossPool = permanentCount >= RUST_BOSS_UNLOCK_THRESHOLD
      ? ACT1_BOSS_TYPES
      : ACT1_BOSS_TYPES.filter(t => t !== ENEMY_TYPES.BOSS_RUST);
    const enemyBalanceProfile = buildEnemyBalanceProfile(roomNode, run);
    const room = generateRoom(
      roomNode.type,
      run.currentLayerIndex + 1,
      roomSeed,
      run.finalBossType || null,
      act1BossPool,
      enemyBalanceProfile
    );

    const BOSS_TYPES = [ROOM_TYPES.BOSS_MINI, ROOM_TYPES.BOSS, ROOM_TYPES.BOSS_FINAL];
    const isBossRoom = BOSS_TYPES.includes(roomNode.type);

    const basePhase = {
      [ROOM_TYPES.COMBAT]:     GAME_PHASES.COMBAT,
      [ROOM_TYPES.ELITE]:      GAME_PHASES.COMBAT,
      [ROOM_TYPES.BOSS_MINI]:  GAME_PHASES.BOSS_INTRO,
      [ROOM_TYPES.BOSS]:       GAME_PHASES.BOSS_INTRO,
      [ROOM_TYPES.BOSS_FINAL]: GAME_PHASES.BOSS_INTRO,
      [ROOM_TYPES.REST]:       GAME_PHASES.REST_ROOM,
      [ROOM_TYPES.SHOP]:       GAME_PHASES.SHOP_ROOM,
      [ROOM_TYPES.EVENT]:      GAME_PHASES.EVENT_ROOM,
    }[roomNode.type] || GAME_PHASES.COMBAT;

    const bossType = isBossRoom
      ? (room.enemies?.[0]?.type || ENEMY_TYPES.BOSS_VOID)
      : null;

    const isCombatRoom = [
      ROOM_TYPES.COMBAT,
      ROOM_TYPES.ELITE,
      ROOM_TYPES.BOSS_MINI,
      ROOM_TYPES.BOSS,
      ROOM_TYPES.BOSS_FINAL,
    ].includes(roomNode.type);

    let rustPressure = 0;
    if (bossType === ENEMY_TYPES.BOSS_RUST && room.enemies?.length > 0) {
      rustPressure = unlockablePermanentCount > 0 ? missingPermanentUpgrades / unlockablePermanentCount : 0;
      room.enemies = room.enemies.map((enemy, index) => {
        if (index !== 0) return enemy;
        const shieldValue = Math.min(6, 2 + Math.floor(missingPermanentUpgrades / 5));
        return {
          ...enemy,
          hp: Math.round(enemy.hp * (1 + rustPressure * 0.7)),
          maxHp: Math.round(enemy.maxHp * (1 + rustPressure * 0.7)),
          attack: enemy.attack + Math.floor(missingPermanentUpgrades / 4),
          defense: enemy.defense + Math.floor(missingPermanentUpgrades / 6),
          statuses: missingPermanentUpgrades > 0
            ? [...(enemy.statuses || []), { id: 'shield', duration: 1, value: shieldValue }]
            : (enemy.statuses || []),
        };
      });
    }

    // Fortifié : bouclier automatique au début de chaque salle
    const hasFortifie   = get().activeUpgrades.some(u => u.id === 'fortifie');
    // Talent Garde Permanente : bouclier de départ chaque salle de combat
    const hasStartShield = (get().meta?.unlockedTalents || []).some(id => {
      const t = getTalentById(id);
      return t?.passive === 'start_shield';
    });
    // Contrat Mortel : commence chaque salle à 60% des PV max
    const hasContratMortel = get().activeUpgrades.some(u => u.id === 'contrat_mortel');
    const cappedHp = hasContratMortel
      ? Math.min(player.hp, Math.floor(player.maxHp * 0.6))
      : player.hp;
    const shieldValue = getShieldBlockValue(player);
    const startStatuses = (hasFortifie || hasStartShield)
      ? [...(player.statuses || []).filter(s => s.id !== 'shield'), { id: 'shield', duration: 1, value: shieldValue }]
      : (player.statuses || []);

    const event = roomNode.type === ROOM_TYPES.EVENT ? pickRandomEvent() : null;

    // Leroy Jenkins : premier combat de la run 21 apres 20 morts avant boss => chaos.
    let roomEnemies = [...(room.enemies || [])];
    let leroyChaosTriggered = false;
    if (isCombatRoom && run.isLeroyJenkinsRun && !run.leroyChaosConsumed && roomEnemies.length > 0) {
      const template = roomEnemies[0];
      const occupied = new Set(roomEnemies.map(e => `${e.x},${e.y}`));
      occupied.add(`${room.playerStart.x},${room.playerStart.y}`);

      for (let y = 0; y < room.height; y += 1) {
        for (let x = 0; x < room.width; x += 1) {
          if (room.grid[y]?.[x] === 'wall') continue;
          if (occupied.has(`${x},${y}`)) continue;
          roomEnemies.push({
            ...template,
            x,
            y,
            type: template.type || ENEMY_TYPES.CHASER,
            behavior: template.behavior || 'chase',
            isBoss: false,
            hp: Math.max(1, Math.floor((template.maxHp || template.hp || 4) * 0.6)),
            maxHp: Math.max(1, Math.floor((template.maxHp || template.hp || 4) * 0.6)),
            attack: Math.max(1, Math.floor((template.attack || 2) * 0.8)),
            defense: Math.max(0, template.defense || 0),
            scoreValue: Math.max(3, Math.floor((template.scoreValue || 10) * 0.5)),
          });
          occupied.add(`${x},${y}`);
        }
      }
      leroyChaosTriggered = true;
    }

    // Marquer les ennemis de cette salle comme "vus" dans le Codex
    const newTypes = roomEnemies.map(e => e.type).filter(Boolean);
    const prevSeen = get().meta?.seenEnemies || [];
    const nextSeen = newTypes.some(t => !prevSeen.includes(t))
      ? [...new Set([...prevSeen, ...newTypes])]
      : prevSeen;

    const currentMeta = get().meta;
    const nextMeta = {
      ...currentMeta,
      totalCombats: (currentMeta.totalCombats || 0) + (isCombatRoom ? 1 : 0),
      deathsBeforeBossStreak: isBossRoom ? 0 : (currentMeta.deathsBeforeBossStreak || 0),
      ...(nextSeen !== prevSeen ? { seenEnemies: nextSeen } : {}),
    };

    set({
      meta: nextMeta,
      currentRoom:  room,
      currentEvent: event,
      enemies:      roomEnemies.map((e, i) => ({
        ...e,
        id:        `enemy_${i}_${Date.now()}`,
        turnCount: 0,
      })),
      phase:        basePhase,
      bossIntroType: bossType,
      isPlayerTurn: true,
      combatLog:    [],
      damagePops:   [],
      dyingEnemies: [],
      killsThisTurn: 0,
      blinkUsed:         false,
      shadowAmbushUsed:  false,
      player:       { ...player, x: room.playerStart.x, y: room.playerStart.y, hp: cappedHp, statuses: startStatuses },
      run:          {
        ...get().run,
        turnsInRoom: 0,
        damageTakenInRoom: 0,
        damageBlockedInRoom: 0,
        murmurShownThisRoom: false,
        lastBossType: bossType || get().run.lastBossType || null,
        leroyChaosConsumed: get().run.leroyChaosConsumed || leroyChaosTriggered,
      },
    });

    if (leroyChaosTriggered) {
      get().addLog('🏃 LEROY JENKINS ! Le Rift se dechaine...');
    }

    trackAnalyticsEvent('room_enter', {
      runId: run.runId,
      roomId: roomNode.id,
      roomType: roomNode.type,
      roomIndex: run.roomsCleared + 1,
      layer: run.currentLayerIndex + 1,
      act: roomNode.act,
      hp: get().player.hp,
      maxHp: get().player.maxHp,
      atk: get().player.attack,
      def: get().player.defense,
      upgradesCount: get().activeUpgrades.length,
      enemiesCount: roomEnemies.length || 0,
      isBossRoom,
      bossType: bossType || null,
      enemyBalance: enemyBalanceProfile.categoryMultipliers,
      enemyAdaptiveScale: run.enemyAdaptiveScale || 1,
      permanentCount,
      unlockablePermanentCount,
      rustPressure: bossType === ENEMY_TYPES.BOSS_RUST ? Number(rustPressure.toFixed(4)) : null,
    });

    const tips = get().run?.tipsShown || {};
    if (roomNode.type === ROOM_TYPES.COMBAT && !tips.combat) {
      get().addLog('💡 Astuce: élimine les ennemis proches en priorité pour limiter les dégâts subis.');
      set(s => ({ run: { ...s.run, tipsShown: { ...(s.run.tipsShown || {}), combat: true } } }));
    }
    if ((roomNode.type === ROOM_TYPES.COMBAT || roomNode.type === ROOM_TYPES.ELITE || isBossRoom) && hasFortifie) {
      get().addLog('🛡 Fortifié : bouclier actif en début de salle.');
    }
    if (roomNode.type === ROOM_TYPES.SHOP && !tips.shop) {
      get().addLog('💡 Astuce: achète pour compléter une couleur et viser une synergie 7/7.');
      set(s => ({ run: { ...s.run, tipsShown: { ...(s.run.tipsShown || {}), shop: true } } }));
    }
    if (roomNode.type === ROOM_TYPES.EVENT && !tips.event) {
      get().addLog('💡 Astuce: les événements peuvent accélérer ta progression, mais certains sont risqués.');
      set(s => ({ run: { ...s.run, tipsShown: { ...(s.run.tipsShown || {}), event: true } } }));
    }

    // Onboarding progressif : tutoriel complet étalé sur les 3 premières salles du premier run.
    const roomIndex = (run.roomsCleared || 0) + 1;
    if ((metaSnapshot.totalRuns || 0) === 0) {
      if (roomIndex === 1 && !tips.onboarding_1) {
        get().addLog('🧭 Étape 1/3 : explore prudemment et termine la salle en limitant les coups reçus.');
        set(s => ({ run: { ...s.run, tipsShown: { ...(s.run.tipsShown || {}), onboarding_1: true } } }));
      }
      if (roomIndex === 2 && !tips.onboarding_2) {
        get().addLog('🧩 Étape 2/3 : pense synergies, fragments et positionnement avant chaque action.');
        set(s => ({ run: { ...s.run, tipsShown: { ...(s.run.tipsShown || {}), onboarding_2: true } } }));
      }
      if (roomIndex === 3 && !tips.onboarding_3) {
        get().addLog('🏁 Étape 3/3 : prépare le boss de fin d\'acte (PV, upgrades clés, plan de sortie).');
        set(s => ({ run: { ...s.run, tipsShown: { ...(s.run.tipsShown || {}), onboarding_3: true } } }));
      }
    }

    // Le dialogue de boss (BossIntroOverlay) gère lui-même la transition vers COMBAT
  },

  // ── Fin de salle ─────────────────────────────────────────────────────────────

  onRoomCleared: () => {
    const { roomMap, run, activeUpgrades, player } = get();
    const newLayerIndex = run.currentLayerIndex + 1;

    hapticSuccess();

    trackAnalyticsEvent('room_end', {
      runId: run.runId,
      roomId: run.currentNodeId,
      roomIndex: run.roomsCleared + 1,
      layer: run.currentLayerIndex + 1,
      turnsInRoom: run.turnsInRoom || 0,
      damageTakenInRoom: run.damageTakenInRoom || 0,
      damageBlockedInRoom: run.damageBlockedInRoom || 0,
      hpEnd: player.hp,
      maxHp: player.maxHp,
      score: run.score,
      kills: run.killsThisRun || 0,
      bossType: run.lastBossType || null,
    });

    // ── Bonus de performance de salle ──────────────────────────────────────────
    const turnsUsed    = run.turnsInRoom    || 0;
    const damageTaken  = run.damageTakenInRoom || 0;
    const hpRatio      = player.maxHp > 0 ? player.hp / player.maxHp : 0;
    const speedBonus   = Math.max(0, (5 - turnsUsed)) * 10;   // +10 par tour économisé sous 5
    const noDmgBonus   = damageTaken === 0 ? 25 : 0;           // salle sans dégâts
    const hpBonus      = Math.floor(hpRatio * 15);             // 0–15 selon PV restants
    const roomBonus    = speedBonus + noDmgBonus + hpBonus;

    if (roomBonus > 0) {
      set(s => ({ run: { ...s.run, score: s.run.score + roomBonus } }));
      const parts = [];
      if (speedBonus  > 0) parts.push(`⚡ +${speedBonus} rapidité`);
      if (noDmgBonus  > 0) parts.push(`✦ +${noDmgBonus} sans dégâts`);
      if (hpBonus     > 0) parts.push(`❤ +${hpBonus} PV`);
      get().addLog(`🏆 Bonus salle : ${parts.join(' · ')}`);
    }

    // Director adaptatif léger: ajuste la prochaine salle selon la pression récente.
    const roomDamageRatio = player.maxHp > 0 ? damageTaken / player.maxHp : 0;
    const recentDamageRatios = [...(run.recentDamageRatios || []), roomDamageRatio].slice(-2);
    const avgRecentDamage = recentDamageRatios.reduce((sum, ratio) => sum + ratio, 0) / recentDamageRatios.length;
    const prevAdaptiveScale = run.enemyAdaptiveScale || 1;
    let adaptiveDelta = 0;
    if (avgRecentDamage >= 0.45) adaptiveDelta = -0.08;
    else if (avgRecentDamage >= 0.3) adaptiveDelta = -0.04;
    else if (avgRecentDamage <= 0.08 && turnsUsed <= 3) adaptiveDelta = 0.05;
    else if (avgRecentDamage <= 0.15 && turnsUsed <= 4) adaptiveDelta = 0.03;
    const nextAdaptiveScale = clamp(prevAdaptiveScale + adaptiveDelta, 0.9, 1.12);

    if (Math.abs(nextAdaptiveScale - prevAdaptiveScale) >= 0.01) {
      get().addLog(nextAdaptiveScale < prevAdaptiveScale
        ? '📉 Le Rift ralentit un instant...'
        : '📈 Le Rift se durcit...');
    }

    const regenCount = activeUpgrades.filter(u => u.id === 'regen').length;
    if (regenCount > 0) {
      const cm = hasCurseSynergy(activeUpgrades) ? 2 : 1;
      get().healPlayer(regenCount * cm);
    }

    // Talent Résilience : soigne 2 PV après chaque salle
    if ((get().meta.unlockedTalents || []).includes('resilience')) {
      get().healPlayer(2);
    }

    // Renaissance : soigne jusqu'à 60% des PV max (×curseMult, cap 100%)
    if (activeUpgrades.some(u => u.id === 'renaissance')) {
      const { player: p } = get();
      const cm     = hasCurseSynergy(activeUpgrades) ? 2 : 1;
      const target = Math.floor(p.maxHp * Math.min(1.0, 0.6 * cm));
      if (p.hp < target) {
        get().healPlayer(target - p.hp);
        get().addLog(`🌿 Renaissance : soigné jusqu'à ${target} PV`);
      }
    }

    const updatedMap = markNodeCleared(roomMap, run.currentNodeId);

    // Victoire : toutes les couches complétées
    if (newLayerIndex >= roomMap.length) {
      set(state => {
        const modifier    = state.run.modifier || { scoreMult: 1.0 };
        const finalScore  = Math.round((state.run.score + 100) * modifier.scoreMult);
        const shape         = state.player.shape;

        // ── Progression narrative acte 3 ────────────────────────────────────
        const finalBossType   = state.run.finalBossType;
        const ACT3_BOSSES     = [ENEMY_TYPES.BOSS_RIFT, ENEMY_TYPES.BOSS_GUARDIAN, ENEMY_TYPES.BOSS_ENTITY];
        const isAct3Victory   = ACT3_BOSSES.includes(finalBossType);
        const newAct3Victories = isAct3Victory
          ? (state.meta.act3Victories || 0) + 1
          : (state.meta.act3Victories || 0);
        const newDevoreurDefeated  = state.meta.devoreurDefeated  || finalBossType === ENEMY_TYPES.BOSS_RIFT;
        const newGardienDefeated   = state.meta.gardienDefeated   || finalBossType === ENEMY_TYPES.BOSS_GUARDIAN;
        const newEntityDefeated    = state.meta.entityDefeated    || finalBossType === ENEMY_TYPES.BOSS_ENTITY;
        // L'Origine : toutes les 3 victoires acte 3, si pas déjà active
        const newOrigineActive = isAct3Victory && !state.meta.origineActive && newAct3Victories % 3 === 0
          ? true
          : state.meta.origineActive;
        const shapeStats    = state.meta.shapeStats || {};
        const prevShape     = shapeStats[shape] || { runs: 0, bestScore: 0, wins: 0 };
        const hpRatio       = state.player.maxHp > 0 ? state.player.hp / state.player.maxHp : 0;
        const upgradeCount  = state.activeUpgrades.length;
        const hasSynergy    = ['red','blue','green'].some(
          c => state.activeUpgrades.filter(u => u.color === c).length >= 3
        );

        const runEntry = {
          score:   finalScore,
          shape,
          kills:   state.run.killsThisRun || 0,
          layers:  newLayerIndex,
          won:     true,
          date:    Date.now(),
        };
        const newRunHistory  = [runEntry, ...(state.meta.runHistory || [])].slice(0, 5);
        const allScores      = [...(state.meta.localLeaderboard || []), runEntry];
        const newLeaderboard = allScores.sort((a, b) => b.score - a.score).slice(0, 5);

        // Victoire = 2 upgrades permanents (récompense plus généreuse que la mort)
        const metaForPick    = { ...state.meta, totalRuns: state.meta.totalRuns + 1, bestScore: Math.max(state.meta.bestScore, finalScore) };
        const newPermanents  = pickPermanentUpgrades(state.meta.permanentUpgrades, metaForPick, 2);

        let newMeta = {
          ...state.meta,
          bestScore:  Math.max(state.meta.bestScore, finalScore),
          totalRuns:  state.meta.totalRuns + 1,
          talentPoints: (state.meta.talentPoints || 0) + 1,
          permanentUpgrades: [...state.meta.permanentUpgrades, ...newPermanents],
          devoreurDefeated:  newDevoreurDefeated,
          gardienDefeated:   newGardienDefeated,
          entityDefeated:    newEntityDefeated,
          act3Victories:     newAct3Victories,
          origineActive:     newOrigineActive,
          shapeStats: {
            ...shapeStats,
            [shape]: {
              runs:      prevShape.runs + 1,
              bestScore: Math.max(prevShape.bestScore, finalScore),
              wins:      prevShape.wins + 1,
            },
          },
          runHistory:       newRunHistory,
          localLeaderboard: newLeaderboard,
        };

        newMeta = withUpdatedWeeklyQuest(newMeta, {
          kills: state.run.killsThisRun || 0,
          runs: 1,
          wins: 1,
        });

        // Achievements à la victoire
        const newAch = checkNewAchievements(
          newMeta,
          { ...state.run, roomsCleared: state.run.roomsCleared + 1 },
          { hpRatio, upgradeCount, hasSynergy, hpAbs: state.player.hp, usedSecondWind: state.secondWindUsed, curseSynergyActive: hasCurseSynergy(state.activeUpgrades) }
        );
        if (newAch.length > 0) {
          newMeta.achievements = [...(newMeta.achievements || []), ...newAch];
        }

        newMeta.lastRunSummary = {
          score:           finalScore,
          layersCleared:   newLayerIndex,
          killsThisRun:    state.run.killsThisRun || 0,
          shape,
          upgradeCount,
          newUnlocks:      newPermanents,           // tableau (2 unlocks)
          newUnlock:       newPermanents[0] || null, // compat affichage
          newAchievements: newAch.map(id => ACHIEVEMENTS_CATALOG.find(a => a.id === id)).filter(Boolean),
          won:             true,
        };

        return {
          phase:   newOrigineActive ? GAME_PHASES.ORIGINE_ENCOUNTER : GAME_PHASES.VICTORY,
          roomMap: updatedMap,
          run: {
            ...state.run,
            roomsCleared:      state.run.roomsCleared + 1,
            currentLayerIndex: newLayerIndex,
            score:             finalScore,
            recentDamageRatios,
            enemyAdaptiveScale: nextAdaptiveScale,
          },
          meta: newMeta,
        };
      });

      // Soumettre le score en ligne (fire-and-forget)
      const { meta: finalMeta, run: finalRun, player } = get();
      const unlockablePermanentCount = getUnlockablePermanentCount(finalMeta);
      trackAnalyticsEvent('run_end', {
        runId: finalRun.runId,
        result: 'victory',
        score: finalRun.score,
        layers: finalRun.currentLayerIndex,
        kills: finalRun.killsThisRun || 0,
        roomsCleared: finalRun.roomsCleared || 0,
        shape: player.shape,
        bossType: finalRun.lastBossType || finalRun.finalBossType || null,
        permanentCount: (finalMeta.permanentUpgrades || []).length,
        unlockablePermanentCount,
      });
      if (finalMeta.playerName) {
        submitScore({
          playerName: finalMeta.playerName,
          score:      finalRun.score,
          shape:      player.shape,
          kills:      finalRun.killsThisRun || 0,
          layers:     finalRun.currentLayerIndex,
          won:        true,
          isDaily:    finalRun.isDailyRun,
        });
      }
      return;
    }

    // Salle normale terminée
    set(state => {
      const newRun = {
        ...state.run,
        roomsCleared:      state.run.roomsCleared + 1,
        score:             state.run.score + 50,
        currentLayerIndex: newLayerIndex,
        recentDamageRatios,
        enemyAdaptiveScale: nextAdaptiveScale,
      };
      // Achievement survivor (3 salles)
      const newAch = checkNewAchievements(state.meta, newRun);
      const newMeta = newAch.length > 0
        ? { ...state.meta, achievements: [...(state.meta.achievements || []), ...newAch] }
        : state.meta;

      return { roomMap: updatedMap, run: newRun, meta: newMeta };
    });

    const currentNode = roomMap.flat().find(n => n.id === run.currentNodeId);
    if (currentNode?.type === ROOM_TYPES.REST || currentNode?.type === ROOM_TYPES.SHOP || currentNode?.type === ROOM_TYPES.EVENT) {
      set({ phase: GAME_PHASES.MAP });
    } else if (currentNode?.type === ROOM_TYPES.ELITE) {
      // Salle élite : 2 choix d'upgrade + bonus score
      set(s => ({ run: { ...s.run, score: s.run.score + 50 } })); // +50 bonus en plus des +50 normaux
      get().generateUpgradeChoices(2);
    } else {
      get().generateUpgradeChoices();
    }
  },

  // ── Upgrades ─────────────────────────────────────────────────────────────────

  generateUpgradeChoices: (count = 3) => {
    const choices = getUpgradeChoices(get().activeUpgrades, count);
    set({ upgradeChoices: choices, pendingUpgradeChoice: true, phase: GAME_PHASES.UPGRADE_CHOICE });
  },

  selectUpgrade: (upgradeId) => {
    const { upgradeChoices, activeUpgrades, playerBase } = get();
    const chosen = upgradeChoices.find(u => u.id === upgradeId);
    if (!chosen) return;

    hapticMedium();
    playSfx('upgrade_pick');

    const beforeActiveColors = getSynergyActiveColors(activeUpgrades);
    const newUpgrades  = [...activeUpgrades, chosen];
    const synergized   = applySynergies(newUpgrades);
    const afterActiveColors = getSynergyActiveColors(synergized);
    const newlyActivatedColors = afterActiveColors.filter(c => !beforeActiveColors.includes(c));
    const upgradeCount = newUpgrades.length;
    const hasSynergy   = ['red','blue','green'].some(
      c => synergized.filter(u => u.color === c).length >= 3
    );
    const curseCount          = synergized.filter(u => u.color === 'curse').length;

    // Recalcul des stats joueur avec tous les upgrades (gère stacking + résonance)
    const newStats = computePlayerStats(playerBase, synergized);

    if (chosen.color === 'green' && synergized.some(u => u.id === 'overgrowth')) {
      const cm = hasCurseSynergy(synergized) ? 2 : 1;
      get().healPlayer(3 * cm);
    }

    // Compute achievements before set() so they can be logged afterward
    const newAch = checkNewAchievements(get().meta, get().run, { upgradeCount, hasSynergy, curseCount });

    set(state => {
      const hpGain = Math.max(0, newStats.maxHp - state.player.maxHp);
      const newMeta = newAch.length > 0
        ? { ...state.meta, achievements: [...(state.meta.achievements || []), ...newAch] }
        : state.meta;

      return {
        activeUpgrades:       synergized,
        upgradeChoices:       [],
        pendingUpgradeChoice: false,
        phase:                GAME_PHASES.MAP,
        meta:                 newMeta,
        player: {
          ...state.player,
          attack:  newStats.attack,
          defense: newStats.defense,
          maxHp:   newStats.maxHp,
          hp:      Math.min(state.player.hp + hpGain, newStats.maxHp),
        },
      };
    });

    get().addLog(`✨ ${chosen.name}`);

    trackAnalyticsEvent('upgrade_pick', {
      runId: get().run?.runId,
      roomId: get().run?.currentNodeId,
      roomIndex: get().run?.roomsCleared + 1,
      upgradeId: chosen.id,
      color: chosen.color,
      rarity: chosen.rarity,
      upgradesCount: newUpgrades.length,
    });

    if (newlyActivatedColors.length > 0) {
      newlyActivatedColors.forEach(color => {
        if (color === 'red') get().addLog('✦ Synergie Rouge active: +2 ATQ');
        else if (color === 'blue') get().addLog('✦ Synergie Bleue active: +2 DEF');
        else if (color === 'green') get().addLog('✦ Synergie Verte active: +6 PV max');
        else if (color === 'curse') get().addLog('☠ Synergie Maudite active: effets ×2');
      });

      newlyActivatedColors.forEach(color => {
        trackAnalyticsEvent('synergy_activate', {
          runId: get().run?.runId,
          roomId: get().run?.currentNodeId,
          roomIndex: get().run?.roomsCleared + 1,
          color,
          upgradesCount: newUpgrades.length,
        });
      });
    }

    newAch.forEach(id => {
      const a = ACHIEVEMENTS_CATALOG.find(x => x.id === id);
      if (a) get().addLog(`🏅 Succès : ${a.icon} ${a.name}`);
    });
  },

  // ── Événements ───────────────────────────────────────────────────────────────

  applyEventChoice: (choiceId) => {
    const { currentEvent, player } = get();
    if (!currentEvent) return;

    const choice = currentEvent.choices.find(c => c.id === choiceId);
    if (!choice) return;

    applyEventEffect(choice.effect, get, set);
    get().addLog(`📖 ${currentEvent.title} : ${choice.label}`);

    if (choice.effect.type === 'upgrade_choice') {
      // onRoomCleared() marque la salle comme terminée, puis generateUpgradeChoices(1) override la phase
      get().onRoomCleared();
      get().generateUpgradeChoices(1);
    } else {
      get().onRoomCleared();
    }
  },

  // ── Salles spéciales ─────────────────────────────────────────────────────────

  interactWithAltar: () => {
    const { currentRoom } = get();
    if (!currentRoom?.altarPos) return;

    playSfx('heal');
    get().healPlayer(currentRoom.healAmount || 8);
    get().addLog(`💚 +${currentRoom.healAmount || 8} PV`);
    get().onRoomCleared();
  },

  leaveRoom: () => {
    get().onRoomCleared();
  },

  skipRestForFragments: () => {
    set(s => ({
      player: {
        ...s.player,
        fragments: (s.player.fragments || 0) + REST_SKIP_FRAGMENT_REWARD,
      },
    }));
    get().addLog(`⏭ Repos ignoré : +${REST_SKIP_FRAGMENT_REWARD} fragments`);
    get().onRoomCleared();
  },

  buyShopItem: (itemIndex) => {
    const { currentRoom, player } = get();
    const item = currentRoom?.shopItems?.[itemIndex];
    if (!item) return;
    if (player.fragments < item.price) {
      get().addLog(`💸 Fragments insuffisants`);
      return;
    }

    const upgrade = getUpgradeById(item.upgradeId);
    if (!upgrade) return;

    playSfx('upgrade_buy');
    const newUpgrades = applySynergies([...get().activeUpgrades, upgrade]);
    const newStats    = computePlayerStats(get().playerBase, newUpgrades);

    set(state => {
      const hpGain = Math.max(0, newStats.maxHp - state.player.maxHp);
      return {
        player: {
          ...state.player,
          fragments: state.player.fragments - item.price,
          attack:    newStats.attack,
          defense:   newStats.defense,
          maxHp:     newStats.maxHp,
          hp:        Math.min(state.player.hp + hpGain, newStats.maxHp),
        },
        activeUpgrades: newUpgrades,
        currentRoom: {
          ...state.currentRoom,
          shopItems: state.currentRoom.shopItems.map((it, i) =>
            i === itemIndex ? { ...it, bought: true } : it
          ),
        },
      };
    });

    hapticMedium();
    get().addLog(`🛍️ Acheté : ${upgrade.name}`);

    // Vérifier les succès liés aux upgrades (builder, hoarder, synergy)
    const upgradeCount = get().activeUpgrades.length;
    const hasSynergy   = ['red','blue','green'].some(
      c => get().activeUpgrades.filter(u => u.color === c).length >= 3
    );
    const curseCount = get().activeUpgrades.filter(u => u.color === 'curse').length;
    const newAch = checkNewAchievements(get().meta, get().run, { upgradeCount, hasSynergy, curseCount });
    if (newAch.length > 0) {
      set(s => ({ meta: { ...s.meta, achievements: [...(s.meta.achievements || []), ...newAch] } }));
      newAch.forEach(id => {
        const a = ACHIEVEMENTS_CATALOG.find(x => x.id === id);
        if (a) get().addLog(`🏅 Succès : ${a.icon} ${a.name}`);
      });
    }
  },

  // ── Forge ────────────────────────────────────────────────────────────────────

  forgeUpgrade: (upgradeId) => {
    const COST = 20;
    const { player, activeUpgrades } = get();
    if (player.fragments < COST) {
      get().addLog(`💸 Fragments insuffisants`);
      return false;
    }
    const upgrade = getUpgradeById(upgradeId);
    if (!upgrade) return false;

    // Vérifier maxStack
    const stackCount = activeUpgrades.filter(u => u.id === upgradeId).length;
    if (stackCount >= upgrade.maxStack) {
      get().addLog(`🔨 Amélioration déjà au maximum`);
      return false;
    }

    playSfx('upgrade_buy');
    const newUpgrades = applySynergies([...activeUpgrades, upgrade]);
    const newStats    = computePlayerStats(get().playerBase, newUpgrades);

    set(state => {
      const hpGain = Math.max(0, newStats.maxHp - state.player.maxHp);
      return {
        player: {
          ...state.player,
          fragments: state.player.fragments - COST,
          attack:    newStats.attack,
          defense:   newStats.defense,
          maxHp:     newStats.maxHp,
          hp:        Math.min(state.player.hp + hpGain, newStats.maxHp),
        },
        activeUpgrades: newUpgrades,
      };
    });

    hapticMedium();
    get().addLog(`🔨 Forgé : ${upgrade.name} (×${stackCount + 1})`);
    return true;
  },

  forgeCreateByColor: (color) => {
    const COST = 15;
    const { player, activeUpgrades } = get();
    if (player.fragments < COST) {
      get().addLog(`💸 Fragments insuffisants`);
      return null;
    }

    const stackCount = {};
    activeUpgrades.forEach(u => { stackCount[u.id] = (stackCount[u.id] || 0) + 1; });

    const pool = ALL_UPGRADES.filter(
      u => u.color === color && (stackCount[u.id] || 0) < u.maxStack
    );
    if (pool.length === 0) {
      get().addLog(`🔨 Aucune amélioration disponible pour cette couleur`);
      return null;
    }

    const upgrade = pool[Math.floor(Math.random() * pool.length)];
    playSfx('upgrade_pick');
    const newUpgrades = applySynergies([...activeUpgrades, upgrade]);
    const newStats    = computePlayerStats(get().playerBase, newUpgrades);

    set(state => {
      const hpGain = Math.max(0, newStats.maxHp - state.player.maxHp);
      return {
        player: {
          ...state.player,
          fragments: state.player.fragments - COST,
          attack:    newStats.attack,
          defense:   newStats.defense,
          maxHp:     newStats.maxHp,
          hp:        Math.min(state.player.hp + hpGain, newStats.maxHp),
        },
        activeUpgrades: newUpgrades,
      };
    });

    hapticMedium();
    get().addLog(`🔥 Créé : ${upgrade.name}`);
    return upgrade;
  },

  // ── Arbre de talents ─────────────────────────────────────────────────────────

  unlockTalent: (talentId) => {
    set(s => {
      const talent = TALENT_CATALOG.find(t => t.id === talentId);
      if (!talent) return s;
      if ((s.meta.talentPoints || 0) < talent.cost) return s;
      if ((s.meta.unlockedTalents || []).includes(talentId)) return s;
      if (talent.requires && !(s.meta.unlockedTalents || []).includes(talent.requires)) return s;
      return {
        meta: {
          ...s.meta,
          talentPoints:    s.meta.talentPoints - talent.cost,
          unlockedTalents: [...(s.meta.unlockedTalents || []), talentId],
        },
      };
    });
  },
});
