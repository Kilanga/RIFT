/**
 * RIFT — Catalogue des modificateurs de run
 * Chaque modificateur offre un bonus de score et une contrainte de gameplay.
 *
 * scoreMult : multiplicateur appliqué au score final (ex: 1.5 = +50%)
 * scoreBonus: bonus fixe ajouté au score final
 */

export const MODIFIER_CATALOG = [
  {
    id: 'pacifist',
    name: 'Non-Violence',
    icon: '🕊',
    description: 'Tu ne peux pas attaquer directement — uniquement Cyclone, Vigile et effets indirects.',
    difficulty: 'extrême',
    scoreMult: 2.0,
    constraints: ['no_direct_attack'],
  },
  {
    id: 'berserker_mode',
    name: 'Berserker',
    icon: '🔴',
    description: 'Commence avec 1 PV. Second Souffle désactivé.',
    difficulty: 'extrême',
    scoreMult: 1.8,
    constraints: ['start_1hp', 'no_second_wind'],
  },
  {
    id: 'no_upgrades',
    name: 'Mains Nues',
    icon: '✊',
    description: 'Aucun upgrade ne peut être sélectionné.',
    difficulty: 'difficile',
    scoreMult: 1.6,
    constraints: ['no_upgrades'],
  },
  {
    id: 'glass_cannon',
    name: 'Canon de Verre',
    icon: '💎',
    description: '+5 ATQ, mais PV max divisés par 2.',
    difficulty: 'difficile',
    scoreMult: 1.4,
    statDeltas: [{ stat: 'attack', delta: 5 }, { stat: 'maxHp', mult: 0.5 }],
    constraints: [],
  },
  {
    id: 'speed_run',
    name: 'Contre-la-Montre',
    icon: '⚡',
    description: 'Chaque salle doit être terminée en 5 tours ou moins, sinon -10 PV.',
    difficulty: 'moyen',
    scoreMult: 1.3,
    constraints: ['turn_limit_5'],
  },
  {
    id: 'cursed_run',
    name: 'Run Maudit',
    icon: '💀',
    description: 'Commence avec une malédiction aléatoire.',
    difficulty: 'moyen',
    scoreMult: 1.25,
    constraints: ['start_with_curse'],
  },
  {
    id: 'double_trouble',
    name: 'Double Peine',
    icon: '👥',
    description: 'Chaque salle de combat a 1 ennemi supplémentaire.',
    difficulty: 'moyen',
    scoreMult: 1.2,
    constraints: ['extra_enemy'],
  },
  {
    id: 'fragile',
    name: 'Fragile',
    icon: '🥚',
    description: 'Défense permanentement à 0.',
    difficulty: 'facile',
    scoreMult: 1.15,
    constraints: ['no_defense'],
  },
  {
    id: 'standard',
    name: 'Standard',
    icon: '—',
    description: 'Aucun modificateur. Score normal.',
    difficulty: 'normal',
    scoreMult: 1.0,
    constraints: [],
  },
  {
    id: 'fragment_fever',
    name: 'Fièvre des Fragments',
    icon: '💰',
    description: 'Commence avec +15 fragments supplémentaires, mais ATQ -2.',
    difficulty: 'facile',
    scoreMult: 1.1,
    statDeltas: [{ stat: 'fragments', delta: 15 }, { stat: 'attack', delta: -2 }],
    constraints: [],
  },
  {
    id: 'titan',
    name: 'Titan',
    icon: '🏔',
    description: '+6 DEF au départ, mais ATQ divisée par 2.',
    difficulty: 'difficile',
    scoreMult: 1.45,
    statDeltas: [{ stat: 'defense', delta: 6 }, { stat: 'attack', mult: 0.5 }],
    constraints: [],
  },
  {
    id: 'shadow_realm',
    name: 'Royaume des Ombres',
    icon: '🌑',
    description: 'PV max réduits de 40%, mais DEF +4 et ATQ +2.',
    difficulty: 'difficile',
    scoreMult: 1.5,
    statDeltas: [{ stat: 'maxHp', mult: 0.6 }, { stat: 'defense', delta: 4 }, { stat: 'attack', delta: 2 }],
    constraints: [],
  },
  {
    id: 'ascetic',
    name: 'Ascète',
    icon: '🧘',
    description: 'Pas de fragments au départ, mais ATQ +3 et DEF +2.',
    difficulty: 'moyen',
    scoreMult: 1.3,
    statDeltas: [{ stat: 'attack', delta: 3 }, { stat: 'defense', delta: 2 }],
    constraints: ['start_no_fragments'],
  },
];

/**
 * Retourne 3 modificateurs aléatoires à proposer au joueur (dont le Standard).
 */
export function pickModifierChoices() {
  const others = MODIFIER_CATALOG.filter(m => m.id !== 'standard');
  const shuffled = [...others].sort(() => Math.random() - 0.5).slice(0, 2);
  return [MODIFIER_CATALOG.find(m => m.id === 'standard'), ...shuffled];
}

export function getModifierById(id) {
  return MODIFIER_CATALOG.find(m => m.id === id) || MODIFIER_CATALOG.find(m => m.id === 'standard');
}

// Pool de modificateurs pour le Daily (exclu standard, pacifist, no_upgrades)
const DAILY_MOD_POOL = ['fragile', 'double_trouble', 'cursed_run', 'speed_run', 'glass_cannon', 'berserker_mode', 'titan', 'shadow_realm', 'ascetic'];

/**
 * Retourne le modificateur forcé du jour (déterministe via la date).
 */
export function getDailyModifier() {
  const now   = new Date();
  const daily = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  const id    = DAILY_MOD_POOL[daily % DAILY_MOD_POOL.length];
  return MODIFIER_CATALOG.find(m => m.id === id);
}
