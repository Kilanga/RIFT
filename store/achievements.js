/**
 * RIFT — Achievements
 * Catalogue des succès + fonction de vérification
 * Raretés : common | rare | epic | legendary
 */

import { PERMANENT_UPGRADES_CATALOG } from '../constants';

// ─── Catalogue ────────────────────────────────────────────────────────────────

export const ACHIEVEMENTS_CATALOG = [

  // ── Premiers pas ────────────────────────────────────────────────────────────
  {
    id:     'first_blood',
    name:   'Premier Sang',
    icon:   '⚔',
    desc:   'Tuer un premier ennemi',
    rarity: 'common',
    check:  (meta) => meta.totalKills >= 1,
  },
  {
    id:     'first_win',
    name:   'Première Victoire',
    icon:   '🎖',
    desc:   'Gagner son premier run',
    rarity: 'common',
    check:  (meta) => Object.values(meta.shapeStats || {}).some(s => (s.wins || 0) >= 1),
  },
  {
    id:     'survivor',
    name:   'Survivant',
    icon:   '🛡',
    desc:   'Terminer 3 salles dans un même run',
    rarity: 'common',
    check:  (meta, run) => run && run.roomsCleared >= 3,
  },
  {
    id:     'explorer',
    name:   'Explorateur',
    icon:   '🗺',
    desc:   'Terminer 5 salles dans un même run',
    rarity: 'common',
    check:  (meta, run) => run && run.roomsCleared >= 5,
  },

  // ── Combat ──────────────────────────────────────────────────────────────────
  {
    id:     'veteran',
    name:   'Vétéran',
    icon:   '☠',
    desc:   '50 ennemis tués au total',
    rarity: 'common',
    check:  (meta) => meta.totalKills >= 50,
  },
  {
    id:     'centurion',
    name:   'Centurion',
    icon:   '💀',
    desc:   '100 ennemis tués au total',
    rarity: 'rare',
    check:  (meta) => meta.totalKills >= 100,
  },
  {
    id:     'exterminator',
    name:   'Exterminateur',
    icon:   '🩸',
    desc:   '200 ennemis tués au total',
    rarity: 'epic',
    check:  (meta) => meta.totalKills >= 200,
  },
  {
    id:     'combo_master',
    name:   'Maître du Combo',
    icon:   '⚔',
    desc:   'Réaliser un combo x3 ou plus',
    rarity: 'rare',
    check:  (meta, run) => run && (run.maxComboThisRun || 0) >= 3,
  },
  {
    id:     'last_breath',
    name:   'Dernier Souffle',
    icon:   '❤',
    desc:   'Gagner un run avec 5 PV ou moins',
    rarity: 'epic',
    check:  (meta, run, extra) => extra && extra.hpAbs !== undefined && extra.hpAbs <= 5,
  },
  {
    id:     'perfectionist',
    name:   'Perfectionniste',
    icon:   '💎',
    desc:   'Terminer un run avec plus de 70% des PV',
    rarity: 'rare',
    check:  (meta, run, extra) => extra && extra.hpRatio >= 0.7,
  },
  {
    id:     'second_chance',
    name:   'Miraculé',
    icon:   '🕊',
    desc:   'Survivre grâce au Second Souffle',
    rarity: 'rare',
    check:  (meta, run, extra) => extra && extra.usedSecondWind === true,
  },

  // ── Upgrades & builds ────────────────────────────────────────────────────────
  {
    id:     'builder',
    name:   'Architecte',
    icon:   '✨',
    desc:   'Avoir 5 upgrades simultanément',
    rarity: 'common',
    check:  (meta, run, extra) => extra && extra.upgradeCount >= 5,
  },
  {
    id:     'hoarder',
    name:   'Accumulateur',
    icon:   '🎒',
    desc:   'Avoir 8 upgrades actifs en même temps',
    rarity: 'rare',
    check:  (meta, run, extra) => extra && extra.upgradeCount >= 8,
  },
  {
    id:     'synergy',
    name:   'Résonance',
    icon:   '✦',
    desc:   'Activer une synergie de couleur',
    rarity: 'common',
    check:  (meta, run, extra) => extra && extra.hasSynergy,
  },
  {
    id:     'damne',
    name:   'Damné',
    icon:   '☠',
    desc:   'Réunir 3 malédictions dans un même run',
    rarity: 'rare',
    check:  (meta, run, extra) => extra && extra.curseCount >= 3,
  },
  {
    id:     'maudit_triomphant',
    name:   'Maudit Triomphant',
    icon:   '💀',
    desc:   'Terminer un run avec le Pacte Maudit actif',
    rarity: 'epic',
    check:  (meta, run, extra) => extra && extra.curseSynergyActive === true,
  },
  {
    id:     'collector',
    name:   'Collectionneur',
    icon:   '🏆',
    desc:   'Débloquer 10 upgrades permanents',
    rarity: 'rare',
    check:  (meta) => (meta.permanentUpgrades?.length || 0) >= 10,
  },

  // ── Progression ─────────────────────────────────────────────────────────────
  {
    id:     'decathlete',
    name:   'Acharné',
    icon:   '🎲',
    desc:   '10 runs complétées',
    rarity: 'common',
    check:  (meta) => meta.totalRuns >= 10,
  },
  {
    id:     'unstoppable',
    name:   'Inarrêtable',
    icon:   '⚡',
    desc:   'Compléter 25 runs',
    rarity: 'rare',
    check:  (meta) => meta.totalRuns >= 25,
  },
  {
    id:     'all_shapes',
    name:   'Polymorphe',
    icon:   '🔺',
    desc:   'Gagner avec les 3 classes de base',
    rarity: 'rare',
    check:  (meta) => {
      const s = meta.shapeStats || {};
      return (s.triangle?.wins || 0) > 0
          && (s.circle?.wins   || 0) > 0
          && (s.hexagon?.wins  || 0) > 0;
    },
  },
  {
    id:     'specialist',
    name:   'Spécialiste',
    icon:   '🥇',
    desc:   'Gagner 5 fois avec la même classe',
    rarity: 'epic',
    check:  (meta) => Object.values(meta.shapeStats || {}).some(s => (s.wins || 0) >= 5),
  },

  // ── Scores ──────────────────────────────────────────────────────────────────
  {
    id:     'boss_reach',
    name:   'Tueur de Boss',
    icon:   '👹',
    desc:   'Atteindre la couche 5 du Rift',
    rarity: 'common',
    check:  (meta, run) => run && run.currentLayerIndex >= 4,
  },
  {
    id:     'deep_rift',
    name:   'Profondeurs du Rift',
    icon:   '🌀',
    desc:   'Atteindre la couche 10',
    rarity: 'rare',
    check:  (meta, run) => run && run.currentLayerIndex >= 10,
  },
  {
    id:     'score_500',
    name:   'Chasseur de Scores',
    icon:   '🎯',
    desc:   'Atteindre 500 points dans un run',
    rarity: 'common',
    check:  (meta) => meta.bestScore >= 500,
  },
  {
    id:     'score_1000',
    name:   'Légende',
    icon:   '⭐',
    desc:   'Atteindre 1000 points dans un run',
    rarity: 'epic',
    check:  (meta) => meta.bestScore >= 1000,
  },

  // ── Lore & narration ────────────────────────────────────────────────────────
  {
    id:     'prologue_seen',
    name:   'La Première Fissure',
    icon:   '📖',
    desc:   'Lire le prologue',
    rarity: 'common',
    check:  (meta) => meta.prologueShown === true,
  },
  {
    id:     'echo_slain',
    name:   "Silence de l'Écho",
    icon:   '👁',
    desc:   "Vaincre L'Écho, gardien de l'acte I",
    rarity: 'common',
    // Pour vaincre L'Écho (boss_void), le joueur doit avoir rencontré le boss acte 2
    // (boss_pulse), car on ne peut atteindre l'acte 2 qu'après avoir survécu l'acte 1.
    check:  (meta) => (meta.seenEnemies || []).includes('boss_pulse') || (meta.act3Victories || 0) >= 1,
  },
  {
    id:     'tonnerre_slain',
    name:   'Tonnerre Brisé',
    icon:   '⚡',
    desc:   'Vaincre Tonnerre Incarné, arme de l\'acte II',
    rarity: 'rare',
    check:  (meta) => meta.devoreurDefeated === true || (meta.act3Victories || 0) >= 1,
  },
  {
    id:     'devoreur_slain',
    name:   'Chair du Dévoreur',
    icon:   '🌀',
    desc:   'Vaincre Le Dévoreur pour la première fois',
    rarity: 'epic',
    check:  (meta) => meta.devoreurDefeated === true,
  },
  {
    id:     'gardien_slain',
    name:   'La Porte Brisée',
    icon:   '🔱',
    desc:   'Vaincre Le Gardien pour la première fois',
    rarity: 'epic',
    check:  (meta) => meta.gardienDefeated === true,
  },
  {
    id:     'entity_slain',
    name:   "Au-delà du Rift",
    icon:   '🔴',
    desc:   "Vaincre L'Entité pour la première fois",
    rarity: 'legendary',
    check:  (meta) => meta.entityDefeated === true,
  },
  {
    id:     'origine_witness',
    name:   "Voix de l'Origine",
    icon:   '✦',
    desc:   "Rencontrer L'Origine pour la première fois",
    rarity: 'legendary',
    check:  (meta) => (meta.act3Victories || 0) >= 3,
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
