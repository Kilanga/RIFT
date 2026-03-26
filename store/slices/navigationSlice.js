/**
 * RIFT — Navigation Slice
 * Démarrage de run, navigation sur la carte, mort du joueur, méta-progression
 */

import { buildProceduralMap } from '../../utils/procGen';
import { pickPermanentUpgrades } from '../../utils/metaHelpers';
import { PLAYER_SHAPES, GAME_PHASES } from '../../constants';
import { hapticError } from '../../utils/haptics';
import { checkNewAchievements, ACHIEVEMENTS_CATALOG } from '../achievements';
import { submitScore } from '../../services/leaderboardService';

function applyPermanentBonuses(permanentUpgrades) {
  const bonuses = {};
  permanentUpgrades.forEach(u => {
    if (u.statBonus) {
      bonuses[u.statBonus.stat] = (bonuses[u.statBonus.stat] || 0) + u.statBonus.value;
    }
  });
  return bonuses;
}

// ─── État initial ─────────────────────────────────────────────────────────────

const INITIAL_PLAYER = {
  x: 4, y: 4,
  hp: 25, maxHp: 25,
  attack: 4, defense: 0, speed: 1,
  shape: PLAYER_SHAPES.TRIANGLE,
  charges: 0, maxCharges: 5,
  statuses: [],
  fragments: 0,
};

const INITIAL_RUN = {
  floor:             1,
  roomsCleared:      0,
  score:             0,
  killsThisRun:      0,
  isAlive:           true,
  startedAt:         null,
  currentLayerIndex: 0,
  currentNodeId:     null,
  isDailyRun:        false,
  maxComboThisRun:   0,    // Pour le succès Maître du Combo
  // Compteurs de performance par salle (reset à chaque enterRoom)
  turnsInRoom:       0,
  damageTakenInRoom: 0,
};

// ─── Slice ────────────────────────────────────────────────────────────────────

export const createNavigationSlice = (set, get) => ({

  player:     { ...INITIAL_PLAYER },
  playerBase: { ...INITIAL_PLAYER }, // stats avant upgrades, pour recalcul
  run:        { ...INITIAL_RUN },
  roomMap:    [],
  phase:      GAME_PHASES.MENU,

  setPlayerName: (name) => set(s => ({ meta: { ...s.meta, playerName: name.trim().slice(0, 16) } })),

  goToShapeSelect:   () => set({ phase: GAME_PHASES.SHAPE_SELECT }),
  goToMultiplayer:   () => set({ phase: GAME_PHASES.MULTIPLAYER }),

  goToMenu: () => {
    set({
      phase:                GAME_PHASES.MENU,
      currentRoom:          null,
      enemies:              [],
      activeUpgrades:       [],
      upgradeChoices:       [],
      combatLog:            [],
      damagePops:           [],
      dyingEnemies:         [],
    });
  },

  pauseRun: () => {
    set(s => ({
      phase:        GAME_PHASES.MENU,
      run:          { ...s.run, isPaused: true },
      currentRoom:  null,
      enemies:      [],
      combatLog:    [],
      damagePops:   [],
      dyingEnemies: [],
    }));
  },

  resumeRun: () => {
    set(s => ({
      phase: GAME_PHASES.MAP,
      run:   { ...s.run, isPaused: false },
    }));
  },

  abandonRun: () => {
    hapticError();
    set(state => {
      const { run, player, activeUpgrades } = state;
      const shape      = player.shape;
      const shapeStats = state.meta.shapeStats || {};
      const prevShape  = shapeStats[shape] || { runs: 0, bestScore: 0, wins: 0 };

      const runEntry = {
        score:  run.score,
        shape,
        kills:  run.killsThisRun || 0,
        layers: run.currentLayerIndex,
        won:    false,
        date:   Date.now(),
      };
      const newRunHistory  = [runEntry, ...(state.meta.runHistory || [])].slice(0, 5);
      const allScores      = [...(state.meta.localLeaderboard || []), runEntry];
      const newLeaderboard = allScores.sort((a, b) => b.score - a.score).slice(0, 5);

      const newMeta = {
        ...state.meta,
        totalRuns:  state.meta.totalRuns + 1,
        bestScore:  Math.max(state.meta.bestScore, run.score),
        shapeStats: {
          ...shapeStats,
          [shape]: {
            runs:      prevShape.runs + 1,
            bestScore: Math.max(prevShape.bestScore, run.score),
            wins:      prevShape.wins,
          },
        },
        runHistory:       newRunHistory,
        localLeaderboard: newLeaderboard,
      };

      newMeta.lastRunSummary = {
        score:         run.score,
        layersCleared: run.currentLayerIndex,
        killsThisRun:  run.killsThisRun || 0,
        shape,
        upgradeCount:  activeUpgrades.length,
        newUnlock:     null,
        newAchievements: [],
        won:           false,
        abandoned:     true,
      };

      return {
        phase:        GAME_PHASES.GAME_OVER,
        run:          { ...run, isAlive: false, isPaused: false },
        currentRoom:  null,
        enemies:      [],
        activeUpgrades: [],
        upgradeChoices: [],
        combatLog:    [],
        damagePops:   [],
        dyingEnemies: [],
        meta:         newMeta,
      };
    });
  },

  startRun: (shape = PLAYER_SHAPES.TRIANGLE, isDailyRun = false, multiOptions = null) => {
    const { meta } = get();
    // Génération procédurale — seed fixe si multijoueur/daily, sinon aléatoire
    const { map: runMap, seed: mapSeed, actBoundaries } = buildProceduralMap(multiOptions?.seed);

    const bonuses    = applyPermanentBonuses(meta.permanentUpgrades);
    const basePlayer = { ...INITIAL_PLAYER, shape, ...bonuses };
    // PV de départ = PV max (les bonus permanents de maxHp doivent être pleins au départ)
    basePlayer.hp = basePlayer.maxHp;

    set({
      player:               basePlayer,
      playerBase:           { ...basePlayer },
      secondWindUsed:       false,
      run:                  {
        ...INITIAL_RUN,
        startedAt:     Date.now(),
        isDailyRun,
        mapSeed,
        actBoundaries: actBoundaries || [],
        multiCode:     multiOptions?.multiCode || null,
        multiRole:     multiOptions?.multiRole || null,
      },
      enemies:              [],
      activeUpgrades:       [],
      upgradeChoices:       [],
      pendingUpgradeChoice: false,
      roomMap:              runMap,
      combatLog:            [],
      damagePops:           [],
      dyingEnemies:         [],
      phase:                GAME_PHASES.MAP,
    });
  },

  startDailyRun: (shape = PLAYER_SHAPES.TRIANGLE) => {
    // Seed basé sur la date — identique pour tous les joueurs le même jour
    const now   = new Date();
    const daily = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    get().startRun(shape, true, { seed: daily });
  },

  selectNode: (nodeId) => {
    const { roomMap } = get();
    const node = roomMap.flat().find(n => n.id === nodeId);
    if (!node) return;

    set(state => ({ run: { ...state.run, currentNodeId: nodeId } }));
    get().enterRoom(node);
  },

  onPlayerDeath: () => {
    const { run } = get();
    const currentMeta    = get().meta;
    const metaForPick  = { ...currentMeta, totalRuns: currentMeta.totalRuns + 1 };
    const newPermanents = pickPermanentUpgrades(currentMeta.permanentUpgrades, metaForPick, 1);
    const newPermanent  = newPermanents[0] || null;

    hapticError();

    set(state => {
      const shape      = state.player.shape;
      const shapeStats = state.meta.shapeStats || {};
      const prevShape  = shapeStats[shape] || { runs: 0, bestScore: 0, wins: 0 };

      const runEntry = {
        score:   run.score,
        shape,
        kills:   run.killsThisRun || 0,
        layers:  run.currentLayerIndex,
        won:     false,
        date:    Date.now(),
      };
      const newRunHistory  = [runEntry, ...(state.meta.runHistory || [])].slice(0, 5);
      const allScores      = [...(state.meta.localLeaderboard || []), runEntry];
      const newLeaderboard = allScores
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      const newMeta = {
        ...state.meta,
        totalRuns:         state.meta.totalRuns + 1,
        bestScore:         Math.max(state.meta.bestScore, run.score),
        permanentUpgrades: newPermanent
          ? [...state.meta.permanentUpgrades, ...newPermanents]
          : state.meta.permanentUpgrades,
        shapeStats: {
          ...shapeStats,
          [shape]: {
            runs:      prevShape.runs + 1,
            bestScore: Math.max(prevShape.bestScore, run.score),
            wins:      prevShape.wins,
          },
        },
        runHistory:       newRunHistory,
        localLeaderboard: newLeaderboard,
      };

      // Achievements à la mort (total runs, total kills, collector…)
      const newAch = checkNewAchievements(newMeta, state.run);
      if (newAch.length > 0) {
        newMeta.achievements = [...(newMeta.achievements || []), ...newAch];
      }

      newMeta.lastRunSummary = {
        score:           state.run.score,
        layersCleared:   state.run.currentLayerIndex,
        killsThisRun:    state.run.killsThisRun || 0,
        shape,
        upgradeCount:    state.activeUpgrades.length,
        newUnlock:       newPermanent || null,
        newAchievements: newAch.map(id => ACHIEVEMENTS_CATALOG.find(a => a.id === id)).filter(Boolean),
        won:             false,
      };

      return {
        phase: GAME_PHASES.GAME_OVER,
        run:   { ...state.run, isAlive: false },
        meta:  newMeta,
      };
    });

    if (get().meta.lastRunSummary?.newUnlock) {
      get().addLog(`🏆 Débloqué : ${get().meta.lastRunSummary.newUnlock.name}`);
    }

    // Soumettre le score en ligne (fire-and-forget)
    const finalMeta = get().meta;
    if (finalMeta.playerName) {
      submitScore({
        playerName: finalMeta.playerName,
        score:      run.score,
        shape:      get().player.shape,
        kills:      run.killsThisRun || 0,
        layers:     run.currentLayerIndex,
        won:        false,
        isDaily:    run.isDailyRun,
      });
    }
  },

  getSelectableNodeIds: () => {
    const { roomMap, run } = get();
    if (!roomMap || roomMap.length === 0) return [];

    if (run.currentNodeId === null) {
      return (roomMap[0] || []).map(n => n.id);
    }

    const currentNode = roomMap.flat().find(n => n.id === run.currentNodeId);
    return currentNode?.connections || [];
  },
});
