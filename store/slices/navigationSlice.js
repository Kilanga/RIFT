/**
 * RIFT — Navigation Slice
 * Démarrage de run, navigation sur la carte, mort du joueur, méta-progression
 */

import { buildProceduralMap } from '../../utils/procGen';
import { pickPermanentUpgrades } from '../../utils/metaHelpers';
import { getModifierById, getDailyModifier } from '../../utils/modifierCatalog';
import { getTalentById } from '../../utils/talentCatalog';
import { getUpgradeById, getUpgradeChoices } from '../../systems/upgradeSystem';
import { PLAYER_SHAPES, GAME_PHASES } from '../../constants';
import { hapticError } from '../../utils/haptics';
import { checkNewAchievements, ACHIEVEMENTS_CATALOG } from '../achievements';
import { submitScore } from '../../services/leaderboardService';
import { fetchServerPurchases } from '../../services/stripeService';

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

  player:        { ...INITIAL_PLAYER },
  playerBase:    { ...INITIAL_PLAYER }, // stats avant upgrades, pour recalcul
  run:           { ...INITIAL_RUN },
  roomMap:       [],
  phase:         GAME_PHASES.MENU,
  isDailySelect: false,

  setPlayerName: (name) => set(s => ({ meta: { ...s.meta, playerName: name.trim().slice(0, 22) } })),

  goToShapeSelect:       () => set({ phase: GAME_PHASES.SHAPE_SELECT, isDailySelect: false }),
  goToDailyShapeSelect: () => set({ phase: GAME_PHASES.SHAPE_SELECT, isDailySelect: true }),
  goToTalentTree:        () => set({ phase: GAME_PHASES.TALENT_TREE }),
  goToPremiumShop:       () => set({ phase: GAME_PHASES.PREMIUM_SHOP }),
  goToMultiplayer:       () => set({ phase: GAME_PHASES.MULTIPLAYER }),

  setPremium:          () => set(s => ({ meta: { ...s.meta, isPremium: true } })),
  toggleHardcoreMode:  () => set(s => ({ meta: { ...s.meta, hardcoreMode: !s.meta.hardcoreMode } })),
  setPremiumTheme: (theme) => set(s => ({ meta: { ...s.meta, premiumTheme: theme } })),
  setGridTheme:    (id)    => set(s => ({ meta: { ...s.meta, gridTheme: id } })),
  addPurchasedTheme: (id) => set(s => ({
    meta: {
      ...s.meta,
      purchasedThemes: s.meta.purchasedThemes?.includes(id)
        ? s.meta.purchasedThemes
        : [...(s.meta.purchasedThemes || []), id],
      gridTheme: id,
    },
  })),

  /**
   * Synchronise l'état premium/achats avec la vérité serveur (Stripe).
   * Appelé au démarrage — silencieux si offline.
   */
  syncPurchases: async () => {
    const result = await fetchServerPurchases();
    if (!result) return; // offline, on garde l'état AsyncStorage
    set(s => ({
      meta: {
        ...s.meta,
        isPremium:       result.isPremium      || s.meta.isPremium,
        purchasedThemes: Array.from(new Set([
          ...(s.meta.purchasedThemes || []),
          ...result.purchasedThemes,
        ])),
      },
    }));
  },

  goToMenu: () => {
    set({
      phase:                GAME_PHASES.MENU,
      isDailySelect:        false,
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

      const modifier   = run.modifier || { scoreMult: 1.0 };
      const runScore   = Math.round(run.score * modifier.scoreMult);

      const runEntry = {
        score:  runScore,
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
        bestScore:  Math.max(state.meta.bestScore, runScore),
        shapeStats: {
          ...shapeStats,
          [shape]: {
            runs:      prevShape.runs + 1,
            bestScore: Math.max(prevShape.bestScore, runScore),
            wins:      prevShape.wins,
          },
        },
        runHistory:       newRunHistory,
        localLeaderboard: newLeaderboard,
      };

      newMeta.lastRunSummary = {
        score:         runScore,
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

  startRun: (shape = PLAYER_SHAPES.TRIANGLE, isDailyRun = false, multiOptions = null, modifierId = 'standard') => {
    const { meta } = get();
    // Génération procédurale — seed fixe si multijoueur/daily, sinon aléatoire
    const { map: runMap, seed: mapSeed, actBoundaries } = buildProceduralMap(multiOptions?.seed);

    const modifier   = getModifierById(modifierId);
    const bonuses    = applyPermanentBonuses(meta.permanentUpgrades);
    const basePlayer = { ...INITIAL_PLAYER, shape, ...bonuses };

    // Appliquer les statDeltas du modificateur
    if (modifier.statDeltas) {
      modifier.statDeltas.forEach(({ stat, delta, mult }) => {
        if (delta !== undefined) basePlayer[stat] = (basePlayer[stat] || 0) + delta;
        if (mult  !== undefined) basePlayer[stat] = Math.max(1, Math.round((basePlayer[stat] || 0) * mult));
      });
    }

    // Classe Spectre : PV réduits, attaque élevée, défense nulle
    if (shape === PLAYER_SHAPES.SPECTRE) {
      basePlayer.maxHp  = 15;
      basePlayer.attack = 6;
      basePlayer.defense = 0;
    }

    // Talents permanents : stat bonuses + passifs de départ
    const startingUpgrades = [];
    (meta.unlockedTalents || []).forEach(talentId => {
      const t = getTalentById(talentId);
      if (!t) return;
      if (t.statBonus) {
        basePlayer[t.statBonus.stat] = (basePlayer[t.statBonus.stat] || 0) + t.statBonus.value;
      }
      if (t.passive === 'start_fragments') {
        basePlayer.fragments = (basePlayer.fragments || 0) + t.passiveValue;
      }
      if (t.passive === 'free_critique') {
        const critiqueUpgrade = getUpgradeById('critique');
        if (critiqueUpgrade) startingUpgrades.push(critiqueUpgrade);
      }
      if (t.passive === 'start_upgrade') {
        const choices = getUpgradeChoices(startingUpgrades, 1);
        if (choices.length > 0) startingUpgrades.push(choices[0]);
      }
    });

    // Contrainte start_1hp
    if (modifier.constraints?.includes('start_1hp')) {
      basePlayer.hp = 1;
    } else {
      basePlayer.hp = basePlayer.maxHp;
    }

    set({
      player:               basePlayer,
      playerBase:           { ...basePlayer },
      secondWindUsed:       false,
      isDailySelect:        false,
      run:                  {
        ...INITIAL_RUN,
        startedAt:     Date.now(),
        isDailyRun,
        mapSeed,
        actBoundaries: actBoundaries || [],
        multiCode:     multiOptions?.multiCode || null,
        multiRole:     multiOptions?.multiRole || null,
        modifier:      modifier,
      },
      enemies:              [],
      activeUpgrades:       startingUpgrades,
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
    const now      = new Date();
    const daily    = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    const dailyMod = getDailyModifier();
    get().startRun(shape, true, { seed: daily }, dailyMod.id);
  },

  selectNode: (nodeId) => {
    const { roomMap } = get();
    const node = roomMap.flat().find(n => n.id === nodeId);
    if (!node) return;

    set(state => ({ run: { ...state.run, currentNodeId: nodeId } }));
    get().enterRoom(node);
  },

  onPlayerDeath: () => {
    if (get().phase === GAME_PHASES.GAME_OVER) return; // évite le double-fire (corruption + tour ennemi)
    const { run } = get();
    const currentMeta   = get().meta;
    const metaForPick   = { ...currentMeta, totalRuns: currentMeta.totalRuns + 1 };
    const newPermanents = pickPermanentUpgrades(currentMeta.permanentUpgrades, metaForPick, 1);
    const newPermanent  = newPermanents[0] || null;

    // Calcul du score final avec multiplicateur de modificateur (hors set())
    const modifier   = run.modifier || { scoreMult: 1.0 };
    const finalScore = Math.round(run.score * modifier.scoreMult);

    hapticError();

    set(state => {
      const shape      = state.player.shape;
      const shapeStats = state.meta.shapeStats || {};
      const prevShape  = shapeStats[shape] || { runs: 0, bestScore: 0, wins: 0 };

      const runEntry = {
        score:   finalScore,
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
        bestScore:         Math.max(state.meta.bestScore, finalScore),
        talentPoints:      (state.meta.talentPoints || 0) + 1,
        permanentUpgrades: newPermanent
          ? [...state.meta.permanentUpgrades, ...newPermanents]
          : state.meta.permanentUpgrades,
        shapeStats: {
          ...shapeStats,
          [shape]: {
            runs:      prevShape.runs + 1,
            bestScore: Math.max(prevShape.bestScore, finalScore),
            wins:      prevShape.wins,
          },
        },
        runHistory:       newRunHistory,
        localLeaderboard: newLeaderboard,
      };

      // Hardcore mode : perte totale de la méta à la mort
      if (state.meta.hardcoreMode) {
        newMeta.permanentUpgrades = [];
        newMeta.unlockedTalents   = [];
        newMeta.talentPoints      = 0;
      }

      // Achievements à la mort (total runs, total kills, collector…)
      const newAch = checkNewAchievements(newMeta, state.run);
      if (newAch.length > 0) {
        newMeta.achievements = [...(newMeta.achievements || []), ...newAch];
      }

      newMeta.lastRunSummary = {
        score:           finalScore,
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
        score:      finalScore,
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
