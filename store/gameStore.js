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
    spectre:  { runs: 0, bestScore: 0, wins: 0 },
    shadow:   { runs: 0, bestScore: 0, wins: 0 },
    paladin:  { runs: 0, bestScore: 0, wins: 0 },
  },
  isPremium:         false,     // Accès au contenu premium (Spectre, Hardcore, thème)
  hardcoreMode:      false,     // La mort réinitialise toute la méta-progression
  premiumTheme:      'default', // 'default' ou 'neon' (thème alternatif)
  gridTheme:         'default', // Thème cosmétique actif du plateau de jeu
  purchasedThemes:   [],        // Thèmes achetés individuellement
  purchasedClasses:  [],        // Classes achetées individuellement
  // ── Lore / progression narrative ──────────────────────────────────────────
  prologueShown:     false,     // Prologue affiché une seule fois
  devoreurDefeated:  false,     // Le Dévoreur a été vaincu → débloque Le Gardien
  gardienDefeated:   false,     // Le Gardien a été vaincu → débloque L'Entité
  act3Victories:     0,         // Nb total de victoires contre un boss acte 3
  origineActive:     false,     // L'Origine est disponible (non battue)
  entityDefeated:    false,     // L'Entité a été vaincue
  seenEnemies:       [],        // Types d'ennemis rencontrés (pour le Codex)
  // ── Préférences ────────────────────────────────────────────────────────────
  musicEnabled:      true,      // Musique de fond activée
  sfxEnabled:        true,      // Effets sonores activés
  musicVolume:       0.4,       // Volume musique 0-1
  sfxVolume:         0.7,       // Volume SFX 0-1
  preferredLanguage: '',        // 'fr' | 'en' | '' (auto-detect)
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
            purchasedClasses: persisted.meta?.purchasedClasses  || [],
            prologueShown:    persisted.meta?.prologueShown     ?? false,
            devoreurDefeated: persisted.meta?.devoreurDefeated  ?? false,
            gardienDefeated:  persisted.meta?.gardienDefeated   ?? false,
            act3Victories:    persisted.meta?.act3Victories     ?? 0,
            origineActive:    persisted.meta?.origineActive     ?? false,
            entityDefeated:   persisted.meta?.entityDefeated    ?? false,
            seenEnemies:      persisted.meta?.seenEnemies       || [],
            musicEnabled:      persisted.meta?.musicEnabled      ?? true,
            sfxEnabled:        persisted.meta?.sfxEnabled        ?? true,
            musicVolume:       persisted.meta?.musicVolume       ?? 0.4,
            sfxVolume:         persisted.meta?.sfxVolume         ?? 0.7,
            preferredLanguage: persisted.meta?.preferredLanguage ?? '',
          },
        }),
      }
    )
  )
);

export default useGameStore;
