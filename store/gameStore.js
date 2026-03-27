/**
 * RIFT — Store Zustand principal (v4)
 * Combine les slices + persistence AsyncStorage + méta étendue
 *
 * Persistence : seule la clé `meta` est sauvegardée sur le disque.
 * Tout le reste (run, combat, room) repart de zéro à chaque session.
 *
 * Slices :
 *   navigationSlice  — run, carte, mort, méta-progression
 *   progressionSlice — salles, upgrades, repos, shop
 *   combatSlice      — mouvement, attaques, tours ennemis, dégâts, animations
 */

import { create } from 'zustand';
import { subscribeWithSelector, persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { createNavigationSlice }  from './slices/navigationSlice';
import { createProgressionSlice } from './slices/progressionSlice';
import { createCombatSlice }      from './slices/combatSlice';

// ─── Méta initiale ────────────────────────────────────────────────────────────

export const INITIAL_META = {
  permanentUpgrades: [],
  bestScore:         0,
  totalRuns:         0,
  totalKills:        0,
  lastRunSummary:    null,
  achievements:      [],
  runHistory:        [],   // 5 dernières runs [{score, shape, kills, layers, won, date}]
  localLeaderboard:  [],   // Top 5 scores [{score, shape, kills, layers, won, date}]
  playerName:        '',   // Pseudo online (leaderboard Supabase)
  talentPoints:      0,    // Points dépensables dans l'arbre de talents
  unlockedTalents:   [],   // IDs des talents débloqués
  shapeStats: {
    triangle: { runs: 0, bestScore: 0, wins: 0 },
    circle:   { runs: 0, bestScore: 0, wins: 0 },
    hexagon:  { runs: 0, bestScore: 0, wins: 0 },
  },
  isPremium:         false,     // Accès au contenu premium (Spectre, Hardcore, thème)
  hardcoreMode:      false,     // La mort réinitialise toute la méta-progression
  premiumTheme:      'default', // 'default' ou 'neon' (thème alternatif)
  gridTheme:         'default', // Thème cosmétique actif du plateau de jeu
  purchasedThemes:   [],        // Thèmes achetés individuellement
};

// ─── Store ────────────────────────────────────────────────────────────────────

const useGameStore = create(
  subscribeWithSelector(
    persist(
      (set, get) => ({

        meta: { ...INITIAL_META },

        ...createNavigationSlice(set, get),
        ...createProgressionSlice(set, get),
        ...createCombatSlice(set, get),

      }),
      {
        name:    'rift-meta-v1',
        storage: createJSONStorage(() => AsyncStorage),
        // Seule la méta est persistée — le run repart toujours de zéro
        partialize: (state) => ({ meta: state.meta }),
        // Merge profond pour ne pas écraser les nouvelles clés de INITIAL_META
        merge: (persisted, current) => ({
          ...current,
          meta: {
            ...INITIAL_META,
            ...persisted.meta,
            shapeStats: {
              ...INITIAL_META.shapeStats,
              ...(persisted.meta?.shapeStats || {}),
            },
            runHistory:       persisted.meta?.runHistory       || [],
            localLeaderboard: persisted.meta?.localLeaderboard || [],
            playerName:       persisted.meta?.playerName       || '',
            talentPoints:     persisted.meta?.talentPoints     ?? 0,
            unlockedTalents:  persisted.meta?.unlockedTalents  || [],
            isPremium:        persisted.meta?.isPremium         ?? false,
            hardcoreMode:     persisted.meta?.hardcoreMode      ?? false,
            premiumTheme:     persisted.meta?.premiumTheme      ?? 'default',
            gridTheme:        persisted.meta?.gridTheme         ?? 'default',
            purchasedThemes:  persisted.meta?.purchasedThemes   || [],
          },
        }),
      }
    )
  )
);

export default useGameStore;
