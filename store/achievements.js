/**
 * RIFT — Achievements
 * Catalogue des succès + fonction de vérification
 */

import { PERMANENT_UPGRADES_CATALOG } from '../constants';

// ─── Catalogue ────────────────────────────────────────────────────────────────

export const ACHIEVEMENTS_CATALOG = [
  {
    id:   'first_blood',
    name: 'Premier Sang',
    icon: '⚔',
    desc: 'Tuer un premier ennemi',
    check: (meta) => meta.totalKills >= 1,
  },
  {
    id:   'survivor',
    name: 'Survivant',
    icon: '🛡',
    desc: 'Terminer 3 salles dans un même run',
    check: (meta, run) => run && run.roomsCleared >= 3,
  },
  {
    id:   'builder',
    name: 'Architecte',
    icon: '✨',
    desc: 'Avoir 5 upgrades simultanément',
    check: (meta, run, extra) => extra && extra.upgradeCount >= 5,
  },
  {
    id:   'synergy',
    name: 'Résonance',
    icon: '✦',
    desc: 'Activer une synergie de couleur',
    check: (meta, run, extra) => extra && extra.hasSynergy,
  },
  {
    id:   'veteran',
    name: 'Vétéran',
    icon: '☠',
    desc: '50 ennemis tués au total',
    check: (meta) => meta.totalKills >= 50,
  },
  {
    id:   'perfectionist',
    name: 'Perfectionniste',
    icon: '💎',
    desc: 'Terminer un run avec plus de 70% des PV',
    check: (meta, run, extra) => extra && extra.hpRatio >= 0.7,
  },
  {
    id:   'collector',
    name: 'Collectionneur',
    icon: '🏆',
    desc: 'Débloquer 10 upgrades permanents',
    check: (meta) => (meta.permanentUpgrades?.length || 0) >= 10,
  },
  {
    id:   'decathlete',
    name: 'Acharné',
    icon: '🔥',
    desc: '10 runs complétées',
    check: (meta) => meta.totalRuns >= 10,
  },
  {
    id:   'all_shapes',
    name: 'Polymorphe',
    icon: '🔺',
    desc: 'Gagner avec les 3 formes',
    check: (meta) => {
      const s = meta.shapeStats || {};
      return (s.triangle?.wins || 0) > 0
          && (s.circle?.wins   || 0) > 0
          && (s.hexagon?.wins  || 0) > 0;
    },
  },
  {
    id:   'first_win',
    name: 'Première Victoire',
    icon: '🎖',
    desc: 'Gagner son premier run',
    check: (meta) => Object.values(meta.shapeStats || {}).some(s => (s.wins || 0) >= 1),
  },
  {
    id:   'centurion',
    name: 'Centurion',
    icon: '💀',
    desc: '100 ennemis tués au total',
    check: (meta) => meta.totalKills >= 100,
  },
  {
    id:   'score_500',
    name: 'Chasseur de Scores',
    icon: '🎯',
    desc: 'Atteindre 500 points dans un run',
    check: (meta) => meta.bestScore >= 500,
  },
  {
    id:   'score_1000',
    name: 'Légende',
    icon: '⭐',
    desc: 'Atteindre 1000 points dans un run',
    check: (meta) => meta.bestScore >= 1000,
  },
  {
    id:   'hoarder',
    name: 'Accumulateur',
    icon: '🎒',
    desc: 'Avoir 8 upgrades actifs en même temps',
    check: (meta, run, extra) => extra && extra.upgradeCount >= 8,
  },
  {
    id:   'explorer',
    name: 'Explorateur',
    icon: '🗺',
    desc: 'Terminer 5 salles dans un même run',
    check: (meta, run) => run && run.roomsCleared >= 5,
  },
  {
    id:   'boss_reach',
    name: 'Tueur de Boss',
    icon: '👹',
    desc: 'Atteindre la couche 5 du Rift',
    check: (meta, run) => run && run.currentLayerIndex >= 4,
  },
];

// ─── Vérificateur ─────────────────────────────────────────────────────────────

/**
 * Retourne les IDs des achievements nouvellement débloqués.
 * @param {object} meta   - Méta-state actuel (après mise à jour)
 * @param {object} run    - État du run courant (optionnel)
 * @param {object} extra  - Données contextuelles (upgradeCount, hasSynergy, hpRatio…)
 */
export function checkNewAchievements(meta, run = null, extra = {}) {
  const unlocked = meta.achievements || [];
  return ACHIEVEMENTS_CATALOG
    .filter(a => !unlocked.includes(a.id) && a.check(meta, run, extra))
    .map(a => a.id);
}
