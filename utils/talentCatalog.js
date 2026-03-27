/**
 * RIFT — Catalogue des talents permanents
 * Points gagnés : 1 par run terminé (mort ou victoire).
 * Les talents s'appliquent à chaque run dès le départ.
 */

export const TALENT_CATALOG = [
  // ── Offensif ────────────────────────────────────────────────────────────────
  {
    id:       'tranchant',
    name:     'Lame Acérée',
    icon:     '⚔',
    cost:     1,
    category: 'offense',
    desc:     '+1 ATQ au départ de chaque run.',
    statBonus: { stat: 'attack', value: 1 },
  },
  {
    id:       'precision',
    name:     'Précision',
    icon:     '🎯',
    cost:     2,
    category: 'offense',
    desc:     'Chaque run démarre avec 1 stack de Critique gratuit.',
    passive:  'free_critique',
  },

  // ── Défensif ─────────────────────────────────────────────────────────────────
  {
    id:       'vigueur',
    name:     'Vigueur',
    icon:     '❤',
    cost:     1,
    category: 'defense',
    desc:     '+5 PV max au départ de chaque run.',
    statBonus: { stat: 'maxHp', value: 5 },
  },
  {
    id:       'armure',
    name:     'Armure',
    icon:     '🛡',
    cost:     1,
    category: 'defense',
    desc:     '+1 DEF au départ de chaque run.',
    statBonus: { stat: 'defense', value: 1 },
  },
  {
    id:       'constitution',
    name:     'Constitution',
    icon:     '💪',
    cost:     2,
    category: 'defense',
    desc:     '+10 PV max au départ de chaque run.',
    requires: 'vigueur',
    statBonus: { stat: 'maxHp', value: 10 },
  },
  {
    id:           'resilience',
    name:         'Résilience',
    icon:         '🌿',
    cost:         2,
    category:     'defense',
    desc:         'Soigne 2 PV après chaque salle terminée.',
    passive:      'room_regen',
    passiveValue: 2,
  },

  // ── Utilitaire ───────────────────────────────────────────────────────────────
  {
    id:           'collecteur',
    name:         'Collecteur',
    icon:         '💎',
    cost:         1,
    category:     'utility',
    desc:         'Commence chaque run avec 3 fragments.',
    passive:      'start_fragments',
    passiveValue: 3,
  },
  {
    id:       'maestro',
    name:     'Maestro',
    icon:     '✨',
    cost:     3,
    category: 'utility',
    desc:     'Commence chaque run avec 1 upgrade aléatoire.',
    passive:  'start_upgrade',
  },
];

export function getTalentById(id) {
  return TALENT_CATALOG.find(t => t.id === id) || null;
}
