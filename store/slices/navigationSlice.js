/**
 * RIFT — Navigation Slice
 * Démarrage de run, navigation sur la carte, mort du joueur, méta-progression
 */

import { buildProceduralMap } from '../../utils/procGen';
import { pickPermanentUpgrades, isUnlockConditionMet } from '../../utils/metaHelpers';
import { getModifierById, getDailyModifier } from '../../utils/modifierCatalog';
import { getTalentById } from '../../utils/talentCatalog';
import { getUpgradeById, getUpgradeChoices } from '../../systems/upgradeSystem';
import { PLAYER_SHAPES, GAME_PHASES, ENEMY_TYPES, PERMANENT_UPGRADES_CATALOG, PREMIUM_SHOP_ENABLED } from '../../constants';
import { hapticError } from '../../utils/haptics';
import { checkNewAchievements, ACHIEVEMENTS_CATALOG, withUpdatedWeeklyQuest } from '../achievements';
import { checkNewEasterEggTitles } from '../../utils/easterEggs';
import { submitScore } from '../../services/leaderboardService';
import { trackAnalyticsEvent } from '../../services/analyticsService';
import { fetchServerPurchases } from '../../services/stripeService';
import {
  setMusicEnabled as setAudioMusic,
  setSfxEnabled   as setAudioSfx,
  setMusicVolume  as setAudioMusicVol,
  setSfxVolume    as setAudioSfxVol,
} from '../../services/audioService';

function applyPermanentBonuses(permanentUpgrades) {
  const bonuses = {};
  permanentUpgrades.forEach(u => {
    if (u.statBonus) {
      bonuses[u.statBonus.stat] = (bonuses[u.statBonus.stat] || 0) + u.statBonus.value;
    }
  });
  return bonuses;
}

function getUnlockablePermanentCount(meta) {
  return PERMANENT_UPGRADES_CATALOG.filter(u => isUnlockConditionMet(u, meta)).length;
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
  runId:             null,
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
  damageBySource:    {},
  tipsShown:         {},
  lastBossType:      null,
  enemyAdaptiveScale: 1,
  recentDamageRatios: [],
  // Easter egg tracking
  lastKillingAttackType: null, // Arrow in Knee: ranged or melee
  killsThisTurn:     0,    // Pentakill: resets each turn
};

// ─── Slice ────────────────────────────────────────────────────────────────────

export const createNavigationSlice = (set, get) => ({

  player:        { ...INITIAL_PLAYER },
  playerBase:    { ...INITIAL_PLAYER }, // stats avant upgrades, pour recalcul
  run:           { ...INITIAL_RUN },
  roomMap:       [],
  phase:               GAME_PHASES.MENU,
  isDailySelect:       false,
  settingsReturnPhase: GAME_PHASES.MENU,

  setPlayerName: (name) => set(s => ({ meta: { ...s.meta, playerName: name.trim().slice(0, 22) } })),

  setPhase: (phase) => set({ phase }),

  goToShapeSelect: () => {
    const { meta } = get();
    if (!meta.prologueShown) {
      set({ phase: GAME_PHASES.PROLOGUE });
    } else {
      set({ phase: GAME_PHASES.SHAPE_SELECT, isDailySelect: false });
    }
  },
  goToDailyShapeSelect: () => {
    const { meta } = get();
    if (!meta.prologueShown) {
      set({ phase: GAME_PHASES.PROLOGUE });
    } else {
      set({ phase: GAME_PHASES.SHAPE_SELECT, isDailySelect: true });
    }
  },
  goToTalentTree:        () => set({ phase: GAME_PHASES.TALENT_TREE }),
  goToPremiumShop:       () => set({ phase: PREMIUM_SHOP_ENABLED ? GAME_PHASES.PREMIUM_SHOP : GAME_PHASES.MENU }),
  goToMultiplayer:       () => set({ phase: GAME_PHASES.MULTIPLAYER }),
  goToAchievements:      () => set({ phase: GAME_PHASES.ACHIEVEMENTS }),
  goToLore:              () => set({ phase: GAME_PHASES.LORE }),
  goToPrivacy:           () => set({ phase: GAME_PHASES.PRIVACY }),
  goToLegal:             () => set({ phase: GAME_PHASES.LEGAL }),
  goToSettings: (returnPhase) => set({
    phase: GAME_PHASES.SETTINGS,
    settingsReturnPhase: returnPhase || GAME_PHASES.MENU,
  }),

  // ── Préférences ──────────────────────────────────────────────────────────
  setMusicEnabled: (val) => {
    setAudioMusic(val);
    set(s => ({ meta: { ...s.meta, musicEnabled: val } }));
  },
  setSfxEnabled: (val) => {
    setAudioSfx(val);
    set(s => ({ meta: { ...s.meta, sfxEnabled: val } }));
  },
  setMusicVolume: (vol) => {
    setAudioMusicVol(vol);
    set(s => ({ meta: { ...s.meta, musicVolume: vol } }));
  },
  setSfxVolume: (vol) => {
    setAudioSfxVol(vol);
    set(s => ({ meta: { ...s.meta, sfxVolume: vol } }));
  },
  setLanguage: (lang) => {
    set(s => ({ meta: { ...s.meta, preferredLanguage: lang } }));
  },

  toggleThreatPreview: () => {
    set(s => ({
      meta: {
        ...s.meta,
        threatPreviewEnabled: !(s.meta?.threatPreviewEnabled ?? true),
      },
    }));
  },

  resetProgress: () => set(s => ({
    meta: {
      permanentUpgrades: [],
      bestScore:         0,
      totalRuns:         0,
      totalKills:        0,
      lastRunSummary:    null,
      achievements:      [],
      runHistory:        [],
      localLeaderboard:  [],
      playerName:        s.meta.playerName,
      talentPoints:      0,
      unlockedTalents:   [],
      shapeStats: {
        triangle: { runs: 0, bestScore: 0, wins: 0 },
        circle:   { runs: 0, bestScore: 0, wins: 0 },
        hexagon:  { runs: 0, bestScore: 0, wins: 0 },
        spectre:  { runs: 0, bestScore: 0, wins: 0 },
        shadow:   { runs: 0, bestScore: 0, wins: 0 },
        paladin:  { runs: 0, bestScore: 0, wins: 0 },
      },
      isPremium:         s.meta.isPremium,
      purchasedThemes:   s.meta.purchasedThemes,
      purchasedClasses:  s.meta.purchasedClasses,
      threatPreviewEnabled: true,
      weeklyQuest: {
        weekKey: '',
        counters: { kills: 0, runs: 0, wins: 0 },
      },
      hardcoreMode:      false,
      premiumTheme:      'default',
      gridTheme:         'default',
      prologueShown:     false,
      devoreurDefeated:  false,
      gardienDefeated:   false,
      entityDefeated:    false,
      act3Victories:     0,
      origineActive:     false,
      seenEnemies:       [],
      musicEnabled:      true,
      sfxEnabled:        true,
      musicVolume:       0.4,
      sfxVolume:         0.7,
      preferredLanguage: '',
      playerName:        '',
      easterEggTitles:   [],    // Easter egg titles unlocked
      totalCombats:      0,     // Global combat counter (for Shiny)
      deathsBeforeBossStreak: 0, // Track consecutive deaths before boss (for Leroy Jenkins)
    },
    phase: GAME_PHASES.MENU,
  })),

  setPremium:          () => set(s => ({ meta: { ...s.meta, isPremium: true } })),
  toggleHardcoreMode:  () => set(s => ({ meta: { ...s.meta, hardcoreMode: !s.meta.hardcoreMode } })),
  setPremiumTheme: (theme) => set(s => ({ meta: { ...s.meta, premiumTheme: theme } })),
  setGridTheme:    (id)    => set(s => ({ meta: { ...s.meta, gridTheme: id } })),
  addPurchasedClass: (id) => set(s => ({
    meta: {
      ...s.meta,
      purchasedClasses: s.meta.purchasedClasses?.includes(id)
        ? s.meta.purchasedClasses
        : [...(s.meta.purchasedClasses || []), id],
    },
  })),

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
        isPremium:        result.isPremium       || s.meta.isPremium,
        purchasedThemes:  Array.from(new Set([
          ...(s.meta.purchasedThemes  || []),
          ...(result.purchasedThemes  || []),
        ])),
        purchasedClasses: Array.from(new Set([
          ...(s.meta.purchasedClasses || []),
          ...(result.purchasedClasses || []),
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

      let newMeta = {
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

      newMeta = withUpdatedWeeklyQuest(newMeta, {
        kills: run.killsThisRun || 0,
        runs: 1,
        wins: 0,
      });

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

    const state = get();
    trackAnalyticsEvent('run_end', {
      runId: state.run?.runId,
      result: 'abandon',
      score: state.run?.score || 0,
      layers: state.run?.currentLayerIndex || 0,
      kills: state.run?.killsThisRun || 0,
      roomsCleared: state.run?.roomsCleared || 0,
      shape: state.player?.shape,
      bossType: state.run?.lastBossType || state.run?.finalBossType || null,
      permanentCount: (state.meta?.permanentUpgrades || []).length,
      unlockablePermanentCount: getUnlockablePermanentCount(state.meta || {}),
    });
  },

  // ── Actions narratives ──────────────────────────────────────────────────────

  // Prologue terminé → marquer comme vu + aller au sélecteur de classe
  finishPrologue: () => {
    set(s => ({
      phase: GAME_PHASES.SHAPE_SELECT,
      meta:  { ...s.meta, prologueShown: true },
    }));
  },

  // L'Origine battue → désactiver + aller à la victoire
  finishOrigine: () => {
    set(s => ({
      phase: GAME_PHASES.VICTORY,
      meta:  { ...s.meta, origineActive: false },
    }));
  },

  // ────────────────────────────────────────────────────────────────────────────

  startRun: (shape = PLAYER_SHAPES.TRIANGLE, isDailyRun = false, multiOptions = null, modifierId = 'standard') => {
    const { meta } = get();

    // Déterminer le boss final selon la progression narrative
    const finalBossType = !meta.devoreurDefeated  ? ENEMY_TYPES.BOSS_RIFT
                        : !meta.gardienDefeated   ? ENEMY_TYPES.BOSS_GUARDIAN
                        :                           ENEMY_TYPES.BOSS_ENTITY;
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

    // Stats de base par classe
    if (shape === PLAYER_SHAPES.TRIANGLE) {
      basePlayer.maxHp   = 23;
      basePlayer.attack  = 5;
      basePlayer.defense = 0;
    }
    if (shape === PLAYER_SHAPES.CIRCLE) {
      basePlayer.maxHp   = 25;
      basePlayer.attack  = 4;
      basePlayer.defense = 1;
    }
    if (shape === PLAYER_SHAPES.HEXAGON) {
      basePlayer.maxHp   = 27;
      basePlayer.attack  = 3;
      basePlayer.defense = 1;
    }

    // Classes premium/achat
    if (shape === PLAYER_SHAPES.SPECTRE) {
      basePlayer.maxHp   = 15;
      basePlayer.attack  = 6;
      basePlayer.defense = 0;
    }
    if (shape === PLAYER_SHAPES.SHADOW) {
      basePlayer.maxHp   = 14;
      basePlayer.attack  = 7;
      basePlayer.defense = 0;
    }
    if (shape === PLAYER_SHAPES.PALADIN) {
      basePlayer.maxHp   = 22;
      basePlayer.attack  = 3;
      basePlayer.defense = 4;
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

    // Contrainte start_no_fragments
    if (modifier.constraints?.includes('start_no_fragments')) {
      basePlayer.fragments = 0;
    }

    // Contrainte start_1hp
    if (modifier.constraints?.includes('start_1hp')) {
      basePlayer.hp = 1;
    } else {
      basePlayer.hp = basePlayer.maxHp;
    }

    const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Leroy Jenkins: check si 20+ morts avant boss → trigger chaos spawn
    const isLeroyJenkinsRun = (meta.deathsBeforeBossStreak || 0) >= 20;

    set({
      player:               basePlayer,
      playerBase:           { ...basePlayer },
      secondWindUsed:       false,
      isDailySelect:        false,
      run:                  {
        ...INITIAL_RUN,
        runId,
        startedAt:      Date.now(),
        isDailyRun,
        mapSeed,
        actBoundaries:  actBoundaries || [],
        multiCode:      multiOptions?.multiCode || null,
        multiRole:      multiOptions?.multiRole || null,
        modifier:       modifier,
        finalBossType,
        isLeroyJenkinsRun,  // Flag pour spawn chaos au premier combat
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

    trackAnalyticsEvent('run_start', {
      runId,
      shape,
      isDailyRun,
      modifierId,
      mapSeed,
      finalBossType,
      permanentCount: (meta.permanentUpgrades || []).length,
      unlockablePermanentCount: getUnlockablePermanentCount(meta),
      baseStats: {
        hp: basePlayer.hp,
        maxHp: basePlayer.maxHp,
        attack: basePlayer.attack,
        defense: basePlayer.defense,
      },
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
    set(state => ({ run: { ...state.run, currentNodeId: node.id } }));
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

      let newMeta = {
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

      newMeta = withUpdatedWeeklyQuest(newMeta, {
        kills: run.killsThisRun || 0,
        runs: 1,
        wins: 0,
      });

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

      // Easter Egg Titles : vérifier les conditions de déblocage
      const isDeathBoss = state.currentRoom?.isBossRoom;
      const newDeathsBefore = !isDeathBoss ? (state.meta.deathsBeforeBossStreak || 0) + 1 : 0;
      const wasDeathBeforeBoss = !isDeathBoss ? newDeathsBefore : 0;
      const newEasterEggs = checkNewEasterEggTitles(newMeta, state.run, {
        lastKillingAttackType: state.run.lastKillingAttackType || null,
        deathsBeforeBoss: wasDeathBeforeBoss,
        totalCombats: newMeta.totalCombats || 0,
        killsThisTurn: state.run.killsThisTurn || 0,
        turnsInRoom: state.run.turnsInRoom || 0,
      });
      if (newEasterEggs.length > 0) {
        newMeta.easterEggTitles = [
          ...(newMeta.easterEggTitles || []),
          ...newEasterEggs.map(egg => egg.id),
        ];
      }
      
      // Update deathsBeforeBossStreak para Leroy Jenkins
      newMeta.deathsBeforeBossStreak = newDeathsBefore;

      newMeta.lastRunSummary = {
        score:           finalScore,
        layersCleared:   state.run.currentLayerIndex,
        killsThisRun:    state.run.killsThisRun || 0,
        shape,
        upgradeCount:    state.activeUpgrades.length,
        newUnlock:       newPermanent || null,
        newAchievements: newAch.map(id => ACHIEVEMENTS_CATALOG.find(a => a.id === id)).filter(Boolean),
        newEasterEggs:   newEasterEggs,
        deathReasons:    Object.entries(state.run.damageBySource || {})
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([source, damage]) => ({ source, damage })),
        won:             false,
      };

      return {
        phase: GAME_PHASES.GAME_OVER,
        run:   { ...state.run, isAlive: false },
        meta:  newMeta,
      };
    });

    const deathReasons = Object.entries(get().run?.damageBySource || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([source, damage]) => ({ source, damage }));
    const finalMeta = get().meta;

    trackAnalyticsEvent('run_end', {
      runId: get().run?.runId,
      result: 'death',
      score: finalScore,
      layers: run.currentLayerIndex,
      kills: run.killsThisRun || 0,
      roomsCleared: run.roomsCleared || 0,
      shape: get().player.shape,
      bossType: get().run?.lastBossType || get().run?.finalBossType || null,
      killedBy: deathReasons[0]?.source || null,
      permanentCount: (finalMeta.permanentUpgrades || []).length,
      unlockablePermanentCount: getUnlockablePermanentCount(finalMeta),
      deathReasons,
    });

    if (get().meta.lastRunSummary?.newUnlock) {
      get().addLog(`🏆 Débloqué : ${get().meta.lastRunSummary.newUnlock.name}`);
    }

    // Afficher les nouveaux titres easter egg
    if (get().meta.lastRunSummary?.newEasterEggs?.length > 0) {
      const lang = (get().meta?.preferredLanguage || '').toLowerCase();
      get().meta.lastRunSummary.newEasterEggs.forEach(egg => {
        get().addLog(`✨ ${lang.startsWith('fr') ? egg.textFR : egg.textEN}`);
      });
    }

    // Soumettre le score en ligne (fire-and-forget)
    const finalMetaAfterDeath = get().meta;
    if (finalMetaAfterDeath.playerName) {
      submitScore({
        playerName: finalMetaAfterDeath.playerName,
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
