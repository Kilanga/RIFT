/**
 * RIFT — Progression Slice
 * Salles, upgrades, repos, shop, victoire
 */

import { generateRoom } from '../../utils/procGen';
import { applySynergies, getUpgradeChoices, getUpgradeById, computePlayerStats, hasCurseSynergy } from '../../systems/upgradeSystem';
import { pickPermanentUpgrades } from '../../utils/metaHelpers';
import { ROOM_TYPES, GAME_PHASES, ENEMY_TYPES } from '../../constants';
import { hapticSuccess, hapticMedium } from '../../utils/haptics';
import { playSfx } from '../../services/audioService';
import { checkNewAchievements, ACHIEVEMENTS_CATALOG } from '../achievements';
import { submitScore } from '../../services/leaderboardService';
import { pickRandomEvent } from '../../utils/eventCatalog';
import { TALENT_CATALOG, getTalentById } from '../../utils/talentCatalog';

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
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
    const roomSeed = ((run.mapSeed || 0) ^ hashString(roomNode.id || '')) >>> 0;
    const room = generateRoom(roomNode.type, run.currentLayerIndex + 1, roomSeed);

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

    // Fortifié : bouclier automatique au début de chaque salle
    const hasFortifie = get().activeUpgrades.some(u => u.id === 'fortifie');
    // Contrat Mortel : commence chaque salle à 60% des PV max
    const hasContratMortel = get().activeUpgrades.some(u => u.id === 'contrat_mortel');
    const cappedHp = hasContratMortel
      ? Math.min(player.hp, Math.floor(player.maxHp * 0.6))
      : player.hp;
    const startStatuses = hasFortifie
      ? [...(player.statuses || []).filter(s => s.id !== 'shield'), { id: 'shield', duration: 1 }]
      : (player.statuses || []);

    const event = roomNode.type === ROOM_TYPES.EVENT ? pickRandomEvent() : null;

    set({
      currentRoom:  room,
      currentEvent: event,
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
      blinkUsed:    false,
      player:       { ...player, x: room.playerStart.x, y: room.playerStart.y, hp: cappedHp, statuses: startStatuses },
      run:          { ...get().run, turnsInRoom: 0, damageTakenInRoom: 0 },
    });

    if (isBossRoom) {
      const nodeId = roomNode.id;
      setTimeout(() => {
        const s = get();
        if (s.run.currentNodeId === nodeId && s.phase === GAME_PHASES.BOSS_INTRO) {
          set({ phase: GAME_PHASES.COMBAT });
        }
      }, 2600);
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
      const cm = hasCurseSynergy(activeUpgrades) ? 2 : 1;
      get().healPlayer(cm);
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
          talentPoints: (state.meta.talentPoints || 0) + 1,
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

    const newUpgrades  = [...activeUpgrades, chosen];
    const synergized   = applySynergies(newUpgrades);
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
