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
  {
    id: 'rift_forge',
    title: 'Forge Spectrale',
    description: "Un forgeron fantôme travaille en silence sur une enclume de rift. Il t'offre ses services pour quelques fragments.",
    choices: [
      {
        id: 'forge_atk',
        label: '⚔ Forger une lame → +2 ATQ (10 fragments)',
        effect: { type: 'composite', effects: [
          { type: 'fragments', value: -10 },
          { type: 'stat_delta', changes: [{ stat: 'attack', delta: 2 }] },
        ]},
        requireFragments: 10,
      },
      {
        id: 'forge_def',
        label: '🛡 Forger une armure → +2 DEF (10 fragments)',
        effect: { type: 'composite', effects: [
          { type: 'fragments', value: -10 },
          { type: 'stat_delta', changes: [{ stat: 'defense', delta: 2 }] },
        ]},
        requireFragments: 10,
      },
      {
        id: 'ignore',
        label: '↩ Partir',
        effect: { type: 'none' },
      },
    ],
  },
  {
    id: 'echo_dead',
    title: 'Écho des Morts',
    description: "Des voix de guerriers tombés te murmurent des secrets du Rift. Tu peux choisir d'écouter... ou de fermer les yeux.",
    choices: [
      {
        id: 'listen',
        label: '👂 Écouter (70% : +120 score / 30% : malédiction)',
        effect: { type: 'gamble', chance: 0.7,
          success: { type: 'score', value: 120 },
          fail:    { type: 'stat_delta', changes: [{ stat: 'attack', delta: -2 }, { stat: 'defense', delta: -1 }] },
        },
      },
      {
        id: 'offer',
        label: '💀 Offrir ton sang → +1 upgrade (choix libre), -8 PV',
        effect: { type: 'composite', effects: [
          { type: 'damage', value: 8 },
          { type: 'upgrade_choice' },
        ]},
      },
      {
        id: 'ignore',
        label: '↩ Ignorer',
        effect: { type: 'none' },
      },
    ],
  },
  {
    id: 'trapped_chest',
    title: 'Coffre Lumineux',
    description: "Un coffre brille d'une lueur dorée au centre de la pièce. Trop beau pour être honnête, mais l'appel est fort.",
    choices: [
      {
        id: 'open',
        label: '🎲 Ouvrir (65% : +10 fragments / 35% : -12 PV)',
        effect: { type: 'gamble', chance: 0.65,
          success: { type: 'fragments', value: 10 },
          fail:    { type: 'damage', value: 12 },
        },
      },
      {
        id: 'ignore',
        label: '↩ Ignorer',
        effect: { type: 'none' },
      },
    ],
  },
  {
    id: 'sleeping_guardian',
    title: 'Gardien Assoupi',
    description: "Un colosse de pierre sommeille en travers du couloir, ses bras serrant une relique ancienne.",
    choices: [
      {
        id: 'sneak',
        label: '🤫 Se faufiler silencieusement → +6 fragments',
        effect: { type: 'fragments', value: 6 },
      },
      {
        id: 'steal',
        label: '⚡ Voler la relique → +1 upgrade (choix libre), risque -15 PV',
        effect: { type: 'gamble', chance: 0.5,
          success: { type: 'upgrade_choice' },
          fail:    { type: 'composite', effects: [
            { type: 'upgrade_choice' },
            { type: 'damage', value: 15 },
          ]},
        },
      },
      {
        id: 'ignore',
        label: '↩ Rebrousser chemin',
        effect: { type: 'none' },
      },
    ],
  },
  {
    id: 'rift_rain',
    title: 'Pluie de Fragments',
    description: "Le plafond saigne. Des fragments de rift tombent en pluie fine, mais l'air devient instable et corrosif.",
    choices: [
      {
        id: 'collect_all',
        label: '💨 Tout récolter → +12 fragments, -5 PV',
        effect: { type: 'composite', effects: [
          { type: 'fragments', value: 12 },
          { type: 'damage', value: 5 },
        ]},
      },
      {
        id: 'collect_safe',
        label: '🌂 Récolter prudemment → +5 fragments',
        effect: { type: 'fragments', value: 5 },
      },
      {
        id: 'ignore',
        label: '↩ Éviter la zone',
        effect: { type: 'none' },
      },
    ],
  },
  {
    id: 'blood_contract',
    title: 'Contrat de Sang',
    description: 'Une encre vivante trace ton nom sur un parchemin ancien. Le pacte promet de la puissance immédiate.',
    choices: [
      {
        id: 'sign',
        label: '🩸 Signer → +4 ATQ, -8 PV max',
        effect: { type: 'stat_delta', changes: [{ stat: 'attack', delta: 4 }, { stat: 'maxHp', delta: -8 }] },
      },
      {
        id: 'tear',
        label: '🔥 Brûler le pacte → +70 score, -4 PV',
        effect: { type: 'composite', effects: [
          { type: 'score', value: 70 },
          { type: 'damage', value: 4 },
        ]},
      },
      { id: 'ignore', label: '↩ Refuser', effect: { type: 'none' } },
    ],
  },
  {
    id: 'unstable_relic',
    title: 'Relique Instable',
    description: 'Une relique crépite d\'énergie. Elle peut exploser ou t\'accorder un avantage durable.',
    choices: [
      {
        id: 'bind',
        label: '⚡ Lier la relique (60% : +2 DEF / 40% : -9 PV)',
        effect: { type: 'gamble', chance: 0.6,
          success: { type: 'stat_delta', changes: [{ stat: 'defense', delta: 2 }] },
          fail: { type: 'damage', value: 9 },
        },
      },
      {
        id: 'dismantle',
        label: '🛠 Démanteler → +9 fragments',
        effect: { type: 'fragments', value: 9 },
      },
    ],
  },
  {
    id: 'rift_tax_collector',
    title: 'Percepteur du Rift',
    description: 'Une silhouette masquée exige son dû. Négocier est possible, mais risqué.',
    choices: [
      {
        id: 'pay',
        label: '◈ Payer 7 fragments → +1 upgrade',
        requireFragments: 7,
        effect: { type: 'composite', effects: [
          { type: 'fragments', value: -7 },
          { type: 'upgrade_choice' },
        ]},
      },
      {
        id: 'bluff',
        label: '🎭 Bluffer (50% : +10 fragments / 50% : -10 PV)',
        effect: { type: 'gamble', chance: 0.5,
          success: { type: 'fragments', value: 10 },
          fail: { type: 'damage', value: 10 },
        },
      },
      { id: 'flee', label: '↩ Fuir', effect: { type: 'none' } },
    ],
  },
  {
    id: 'mercenary_camp',
    title: 'Camp de Mercenaires',
    description: 'Des survivants du Rift vendent leur aide contre fragments ou loyauté.',
    choices: [
      {
        id: 'hire',
        label: '💰 Engager (8 fragments) → +2 ATQ, +1 DEF',
        requireFragments: 8,
        effect: { type: 'composite', effects: [
          { type: 'fragments', value: -8 },
          { type: 'stat_delta', changes: [{ stat: 'attack', delta: 2 }, { stat: 'defense', delta: 1 }] },
        ]},
      },
      {
        id: 'duel',
        label: '⚔ Duel rituel → +1 upgrade, -6 PV',
        effect: { type: 'composite', effects: [
          { type: 'damage', value: 6 },
          { type: 'upgrade_choice' },
        ]},
      },
      { id: 'leave', label: '↩ Continuer seul', effect: { type: 'none' } },
    ],
  },
  {
    id: 'void_lottery',
    title: 'Loterie du Néant',
    description: 'Trois runes tournent dans le vide. Une seule distribue une vraie fortune.',
    choices: [
      {
        id: 'one_spin',
        label: '🎰 Lancer unique (33% jackpot +18 fragments / sinon -4 PV)',
        effect: { type: 'gamble', chance: 0.33,
          success: { type: 'fragments', value: 18 },
          fail: { type: 'damage', value: 4 },
        },
      },
      {
        id: 'double_spin',
        label: '🎰🎰 Double spin (50% +1 upgrade / 50% -12 PV)',
        effect: { type: 'gamble', chance: 0.5,
          success: { type: 'upgrade_choice' },
          fail: { type: 'damage', value: 12 },
        },
      },
    ],
  },
  {
    id: 'echo_tunnel',
    title: 'Tunnel des Échos',
    description: 'Le passage compresse le temps. Traverser vite coûte des ressources, traverser lentement coûte des forces.',
    choices: [
      {
        id: 'rush',
        label: '🏃 Traverser vite → -6 fragments, +90 score',
        requireFragments: 6,
        effect: { type: 'composite', effects: [
          { type: 'fragments', value: -6 },
          { type: 'score', value: 90 },
        ]},
      },
      {
        id: 'endure',
        label: '🧱 Endurer → -7 PV, +2 DEF',
        effect: { type: 'composite', effects: [
          { type: 'damage', value: 7 },
          { type: 'stat_delta', changes: [{ stat: 'defense', delta: 2 }] },
        ]},
      },
      { id: 'turn_back', label: '↩ Contourner', effect: { type: 'none' } },
    ],
  },
  {
    id: 'faded_shrine',
    title: 'Sanctuaire Fané',
    description: 'Un sanctuaire usé propose une bénédiction incomplète. Tu choisis ce que tu abandonnes.',
    choices: [
      {
        id: 'vigor',
        label: '💚 Vitalité → +12 PV, -1 ATQ',
        effect: { type: 'composite', effects: [
          { type: 'heal', value: 12 },
          { type: 'stat_delta', changes: [{ stat: 'attack', delta: -1 }] },
        ]},
      },
      {
        id: 'fury',
        label: '🔥 Fureur → +3 ATQ, -6 PV',
        effect: { type: 'composite', effects: [
          { type: 'stat_delta', changes: [{ stat: 'attack', delta: 3 }] },
          { type: 'damage', value: 6 },
        ]},
      },
      { id: 'silent', label: '↩ Se taire et partir', effect: { type: 'none' } },
    ],
  },
  {
    id: 'fractured_portal',
    title: 'Portail Fracturé',
    description: 'Le portail peut t\'offrir une faveur instantanée, mais laisse une trace sur ton corps.',
    choices: [
      {
        id: 'step_in',
        label: '🌀 Entrer → +1 upgrade, -5 PV max',
        effect: { type: 'composite', effects: [
          { type: 'upgrade_choice' },
          { type: 'stat_delta', changes: [{ stat: 'maxHp', delta: -5 }] },
        ]},
      },
      {
        id: 'stabilize',
        label: '🔧 Stabiliser → +8 fragments, +40 score',
        effect: { type: 'composite', effects: [
          { type: 'fragments', value: 8 },
          { type: 'score', value: 40 },
        ]},
      },
      { id: 'avoid', label: '↩ Éviter', effect: { type: 'none' } },
    ],
  },
];

/**
 * Retourne un événement aléatoire du catalogue.
 */
export function pickRandomEvent() {
  return EVENT_CATALOG[Math.floor(Math.random() * EVENT_CATALOG.length)];
}
