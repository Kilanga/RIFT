/**
 * RIFT — Progression Slice
 * Salles, upgrades, repos, shop, victoire
 */

import { generateRoom } from '../../utils/procGen';
import { applySynergies, getUpgradeChoices, getUpgradeById } from '../../systems/upgradeSystem';
import { pickPermanentUpgrades } from '../../utils/metaHelpers';
import { ROOM_TYPES, GAME_PHASES, ENEMY_TYPES } from '../../constants';
import { hapticSuccess, hapticMedium } from '../../utils/haptics';
import { checkNewAchievements, ACHIEVEMENTS_CATALOG } from '../achievements';
import { submitScore } from '../../services/leaderboardService';

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
  activeUpgrades:       [],
  upgradeChoices:       [],
  pendingUpgradeChoice: false,

  // ── Salle ────────────────────────────────────────────────────────────────────

  enterRoom: (roomNode) => {
    const { player, run } = get();
    const room = generateRoom(roomNode.type, run.currentLayerIndex + 1);

    const BOSS_TYPES = [ROOM_TYPES.BOSS_MINI, ROOM_TYPES.BOSS, ROOM_TYPES.BOSS_FINAL];
    const isBossRoom = BOSS_TYPES.includes(roomNode.type);

    const basePhase = {
      [ROOM_TYPES.COMBAT]:     GAME_PHASES.COMBAT,
      [ROOM_TYPES.BOSS_MINI]:  GAME_PHASES.BOSS_INTRO,
      [ROOM_TYPES.BOSS]:       GAME_PHASES.BOSS_INTRO,
      [ROOM_TYPES.BOSS_FINAL]: GAME_PHASES.BOSS_INTRO,
      [ROOM_TYPES.REST]:       GAME_PHASES.REST_ROOM,
      [ROOM_TYPES.SHOP]:       GAME_PHASES.SHOP_ROOM,
    }[roomNode.type] || GAME_PHASES.COMBAT;

    const bossType = isBossRoom
      ? (room.enemies?.[0]?.type || ENEMY_TYPES.BOSS_VOID)
      : null;

    set({
      currentRoom:  room,
      enemies:      room.enemies.map((e, i) => ({
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
      player:       { ...player, x: room.playerStart.x, y: room.playerStart.y },
      run:          { ...get().run, turnsInRoom: 0, damageTakenInRoom: 0 },
    });

    if (isBossRoom) {
      setTimeout(() => set({ phase: GAME_PHASES.COMBAT }), 2600);
    }
  },

  // ── Fin de salle ─────────────────────────────────────────────────────────────

  onRoomCleared: () => {
    const { roomMap, run, activeUpgrades, player } = get();
    const newLayerIndex = run.currentLayerIndex + 1;

    hapticSuccess();

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

    if (activeUpgrades.some(u => u.id === 'regen')) {
      get().healPlayer(1);
    }

    const updatedMap = markNodeCleared(roomMap, run.currentNodeId);

    // Victoire : toutes les couches complétées
    if (newLayerIndex >= roomMap.length) {
      set(state => {
        const finalScore    = state.run.score + 100;
        const shape         = state.player.shape;
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

        const newMeta = {
          ...state.meta,
          bestScore:  Math.max(state.meta.bestScore, finalScore),
          totalRuns:  state.meta.totalRuns + 1,
          permanentUpgrades: [...state.meta.permanentUpgrades, ...newPermanents],
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

        // Achievements à la victoire
        const newAch = checkNewAchievements(
          newMeta,
          { ...state.run, roomsCleared: state.run.roomsCleared + 1 },
          { hpRatio, upgradeCount, hasSynergy }
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
          phase:   GAME_PHASES.VICTORY,
          roomMap: updatedMap,
          run: {
            ...state.run,
            roomsCleared:      state.run.roomsCleared + 1,
            currentLayerIndex: newLayerIndex,
            score:             finalScore,
          },
          meta: newMeta,
        };
      });

      // Soumettre le score en ligne (fire-and-forget)
      const { meta: finalMeta, run: finalRun, player } = get();
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
      };
      // Achievement survivor (3 salles)
      const newAch = checkNewAchievements(state.meta, newRun);
      const newMeta = newAch.length > 0
        ? { ...state.meta, achievements: [...(state.meta.achievements || []), ...newAch] }
        : state.meta;

      return { roomMap: updatedMap, run: newRun, meta: newMeta };
    });

    const currentNode = roomMap.flat().find(n => n.id === run.currentNodeId);
    if (currentNode?.type === ROOM_TYPES.REST || currentNode?.type === ROOM_TYPES.SHOP) {
      set({ phase: GAME_PHASES.MAP });
    } else {
      get().generateUpgradeChoices();
    }
  },

  // ── Upgrades ─────────────────────────────────────────────────────────────────

  generateUpgradeChoices: () => {
    const choices = getUpgradeChoices(get().activeUpgrades, 3);
    set({ upgradeChoices: choices, pendingUpgradeChoice: true, phase: GAME_PHASES.UPGRADE_CHOICE });
  },

  selectUpgrade: (upgradeId) => {
    const { upgradeChoices, activeUpgrades } = get();
    const chosen = upgradeChoices.find(u => u.id === upgradeId);
    if (!chosen) return;

    hapticMedium();

    const newUpgrades  = [...activeUpgrades, chosen];
    const synergized   = applySynergies(newUpgrades);
    const upgradeCount = newUpgrades.length;
    const hasSynergy   = ['red','blue','green'].some(
      c => synergized.filter(u => u.color === c).length >= 3
    );

    if (chosen.color === 'green' && newUpgrades.some(u => u.id === 'overgrowth')) {
      get().healPlayer(3);
    }

    set(state => {
      // Achievements upgrade
      const newAch = checkNewAchievements(state.meta, state.run, { upgradeCount, hasSynergy });
      const newMeta = newAch.length > 0
        ? { ...state.meta, achievements: [...(state.meta.achievements || []), ...newAch] }
        : state.meta;

      return {
        activeUpgrades:       synergized,
        upgradeChoices:       [],
        pendingUpgradeChoice: false,
        phase:                GAME_PHASES.MAP,
        meta:                 newMeta,
      };
    });

    get().addLog(`✨ ${chosen.name}`);
  },

  // ── Salles spéciales ─────────────────────────────────────────────────────────

  interactWithAltar: () => {
    const { currentRoom } = get();
    if (!currentRoom?.altarPos) return;

    get().healPlayer(currentRoom.healAmount || 8);
    get().addLog(`💚 +${currentRoom.healAmount || 8} PV`);
    get().onRoomCleared();
  },

  leaveRoom: () => {
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

    set(state => ({
      player:         { ...state.player, fragments: state.player.fragments - item.price },
      activeUpgrades: applySynergies([...state.activeUpgrades, upgrade]),
      currentRoom: {
        ...state.currentRoom,
        shopItems: state.currentRoom.shopItems.map((it, i) =>
          i === itemIndex ? { ...it, bought: true } : it
        ),
      },
    }));

    hapticMedium();
    get().addLog(`🛍️ Acheté : ${upgrade.name}`);
  },
});
