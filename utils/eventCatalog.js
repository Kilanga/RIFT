/**
 * RIFT — Catalogue des événements narratifs
 * Chaque événement a un titre, une description, et 2-3 choix avec effets.
 *
 * Types d'effets :
 *   { type: 'none' }
 *   { type: 'heal', value }
 *   { type: 'damage', value }
 *   { type: 'stat_delta', changes: [{stat, delta}] }
 *   { type: 'fragments', value }
 *   { type: 'score', value }
 *   { type: 'composite', effects: [...] }
 *   { type: 'gamble', chance, success, fail }
 *   { type: 'upgrade_choice' }        → ouvre un choix d'upgrade
 */

export const EVENT_CATALOG = [
  {
    id: 'mystery_altar',
    title: 'Autel des Sacrifices',
    description: 'Un autel antique, taché de sang séché, attend ton offrande. La magie ici est ancienne et avide.',
    choices: [
      {
        id: 'sacrifice_hp',
        label: '💔 Sacrifier 5 PV → +2 ATQ',
        effect: { type: 'composite', effects: [
          { type: 'damage', value: 5 },
          { type: 'stat_delta', changes: [{ stat: 'attack', delta: 2 }] },
        ]},
      },
      {
        id: 'sacrifice_frag',
        label: '◈ Sacrifier 5 fragments → Soigner 12 PV',
        effect: { type: 'composite', effects: [
          { type: 'fragments', value: -5 },
          { type: 'heal', value: 12 },
        ]},
        requireFragments: 5,
      },
      {
        id: 'ignore',
        label: '↩ Ignorer',
        effect: { type: 'none' },
      },
    ],
  },
  {
    id: 'rift_echo',
    title: 'Éclat du Rift',
    description: "Un fragment de rift flotte dans l'air, vibrant d'une énergie instable. L'absorber pourrait te transformer... ou te briser.",
    choices: [
      {
        id: 'absorb',
        label: '✨ Absorber (50% : +4 ATQ / 50% : -10 PV)',
        effect: { type: 'gamble', chance: 0.5,
          success: { type: 'stat_delta', changes: [{ stat: 'attack', delta: 4 }] },
          fail:    { type: 'damage', value: 10 },
        },
      },
      {
        id: 'channel',
        label: '⚡ Canaliser → +1 upgrade (choix libre)',
        effect: { type: 'upgrade_choice' },
      },
      {
        id: 'ignore',
        label: '↩ Ignorer',
        effect: { type: 'none' },
      },
    ],
  },
  {
    id: 'wandering_merchant',
    title: 'Marchand Errant',
    description: 'Un marchand poussiéreux surgit de nulle part, son chariot rempli de curiosités douteuses.',
    choices: [
      {
        id: 'buy_hp',
        label: '◈ Soigner 15 PV (5 fragments)',
        effect: { type: 'composite', effects: [
          { type: 'fragments', value: -5 },
          { type: 'heal', value: 15 },
        ]},
        requireFragments: 5,
      },
      {
        id: 'buy_atk',
        label: '◈ +3 ATQ (8 fragments)',
        effect: { type: 'composite', effects: [
          { type: 'fragments', value: -8 },
          { type: 'stat_delta', changes: [{ stat: 'attack', delta: 3 }] },
        ]},
        requireFragments: 8,
      },
      {
        id: 'ignore',
        label: '↩ Partir',
        effect: { type: 'none' },
      },
    ],
  },
  {
    id: 'cursed_fountain',
    title: 'Fontaine Maudite',
    description: "L'eau brille d'une couleur violette inquiétante. Une inscription en langue ancienne dit : « tout don a un prix ».",
    choices: [
      {
        id: 'drink_full',
        label: '💧 Boire → PV max +8, mais ATQ -1',
        effect: { type: 'stat_delta', changes: [{ stat: 'maxHp', delta: 8 }, { stat: 'attack', delta: -1 }] },
      },
      {
        id: 'drink_power',
        label: '⚗ Avaler le fond → ATQ +3, DEF -1',
        effect: { type: 'stat_delta', changes: [{ stat: 'attack', delta: 3 }, { stat: 'defense', delta: -1 }] },
      },
      {
        id: 'ignore',
        label: '↩ Ignorer',
        effect: { type: 'none' },
      },
    ],
  },
  {
    id: 'old_library',
    title: 'Bibliothèque Oubliée',
    description: 'Des grimoires poussiéreux s\'empilent jusqu\'au plafond. La sagesse ici a survécu à des âges de silence.',
    choices: [
      {
        id: 'study',
        label: '📚 Étudier → +80 score, -3 PV',
        effect: { type: 'composite', effects: [
          { type: 'score', value: 80 },
          { type: 'damage', value: 3 },
        ]},
      },
      {
        id: 'take_tome',
        label: '📖 Empocher un tome → +2 DEF, -4 PV max',
        effect: { type: 'stat_delta', changes: [{ stat: 'defense', delta: 2 }, { stat: 'maxHp', delta: -4 }] },
      },
      {
        id: 'ignore',
        label: '↩ Ignorer',
        effect: { type: 'none' },
      },
    ],
  },
  {
    id: 'wounded_warrior',
    title: 'Guerrier Blessé',
    description: 'Un combattant gît contre le mur, à demi conscient. Il tient une relique dans sa main tremblante.',
    choices: [
      {
        id: 'help',
        label: '🤝 Soigner → +1 upgrade (choix libre)',
        effect: { type: 'upgrade_choice' },
      },
      {
        id: 'take',
        label: '⚔ Prendre la relique → +6 ATQ, -10 PV',
        effect: { type: 'composite', effects: [
          { type: 'stat_delta', changes: [{ stat: 'attack', delta: 6 }] },
          { type: 'damage', value: 10 },
        ]},
      },
      {
        id: 'ignore',
        label: '↩ Passer son chemin',
        effect: { type: 'none' },
      },
    ],
  },
];

/**
 * Retourne un événement aléatoire du catalogue.
 */
export function pickRandomEvent() {
  return EVENT_CATALOG[Math.floor(Math.random() * EVENT_CATALOG.length)];
}
