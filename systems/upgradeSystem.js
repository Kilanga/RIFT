/**
 * RIFT — Système d'upgrades et de synergies
 */

import { UPGRADE_COLORS } from '../constants';

// ─── Catalogue ────────────────────────────────────────────────────────────────

export const ALL_UPGRADES = [

  // ── Rouge (offensif) ──────────────────────────────────────────────────────
  {
    id: 'momentum', name: 'Momentum', color: UPGRADE_COLORS.RED, rarity: 'common', maxStack: 1,
    description: 'Chaque déplacement charge une attaque. Charge max → dégâts ×2.',
    effect: { type: 'passive', trigger: 'onMove', action: 'addCharge' },
    tags: ['mouvement', 'dégâts'],
  },
  {
    id: 'echo', name: 'Écho', color: UPGRADE_COLORS.RED, rarity: 'rare', maxStack: 1,
    description: 'Les attaques rebondissent sur l\'ennemi le plus proche (60% dégâts).',
    effect: { type: 'passive', trigger: 'onAttack', action: 'bounceAttack', multiplier: 0.6 },
    tags: ['dégâts', 'rebond'],
  },
  {
    id: 'fracture', name: 'Fracture', color: UPGRADE_COLORS.RED, rarity: 'rare', maxStack: 1,
    description: 'Les ennemis tués explosent → 30% de leurs PV en AoE.',
    effect: { type: 'passive', trigger: 'onKill', action: 'explode', percent: 0.3 },
    tags: ['dégâts', 'aoe', 'kill'],
  },
  {
    id: 'chain_reaction', name: 'Réaction en chaîne', color: UPGRADE_COLORS.RED, rarity: 'epic', maxStack: 2,
    description: 'Après chaque kill, prochaine attaque +50%.',
    effect: { type: 'passive', trigger: 'onKill', action: 'attackBoost', multiplier: 1.5, duration: 1 },
    tags: ['dégâts', 'kill'],
  },
  {
    id: 'overload', name: 'Surcharge', color: UPGRADE_COLORS.RED, rarity: 'common', maxStack: 3,
    description: '+2 Attaque.',
    effect: { type: 'stat', stat: 'attack', value: 2 },
    tags: ['stat', 'dégâts'],
  },

  // ── Bleu (utilitaire / défensif) ──────────────────────────────────────────
  {
    id: 'shield_pulse', name: 'Impulsion Bouclier', color: UPGRADE_COLORS.BLUE, rarity: 'common', maxStack: 1,
    description: 'Après avoir subi des dégâts → bouclier pendant 1 tour.',
    effect: { type: 'passive', trigger: 'onDamaged', action: 'applyStatus', status: 'shield', duration: 1 },
    tags: ['défense', 'survie'],
  },
  {
    id: 'resonance', name: 'Résonance', color: UPGRADE_COLORS.BLUE, rarity: 'epic', maxStack: 1,
    description: '3 upgrades d\'une même couleur → toutes les stats ×2.',
    effect: { type: 'synergy', trigger: 'onSynergyActivated', action: 'statMultiplier', multiplier: 2 },
    tags: ['synergie', 'couleur'],
  },
  {
    id: 'blink', name: 'Clignotement', color: UPGRADE_COLORS.BLUE, rarity: 'rare', maxStack: 1,
    description: 'Une fois par salle : téléportation vers une case vide aléatoire.',
    effect: { type: 'active', usesPerRoom: 1, action: 'teleport' },
    tags: ['mouvement', 'escape'],
  },
  {
    id: 'absorb', name: 'Absorption', color: UPGRADE_COLORS.BLUE, rarity: 'common', maxStack: 3,
    description: '+1 Défense.',
    effect: { type: 'stat', stat: 'defense', value: 1 },
    tags: ['stat', 'défense'],
  },
  {
    id: 'phase_shift', name: 'Déphasage', color: UPGRADE_COLORS.BLUE, rarity: 'rare', maxStack: 1,
    description: 'Les Blockers t\'ignorent pendant 2 tours après un déplacement.',
    effect: { type: 'passive', trigger: 'onMove', action: 'applyStatusToType', enemyType: 'blocker', status: 'confused', duration: 2 },
    tags: ['défense', 'contrôle'],
  },

  // ── Vert (soin / support) ─────────────────────────────────────────────────
  {
    id: 'regen', name: 'Régénération', color: UPGRADE_COLORS.GREEN, rarity: 'common', maxStack: 3,
    description: '+1 PV par salle complétée.',
    effect: { type: 'passive', trigger: 'onRoomCleared', action: 'heal', value: 1 },
    tags: ['soin', 'survie'],
  },
  {
    id: 'vitality', name: 'Vitalité', color: UPGRADE_COLORS.GREEN, rarity: 'common', maxStack: 4,
    description: '+4 PV max.',
    effect: { type: 'stat', stat: 'maxHp', value: 4 },
    tags: ['stat', 'survie'],
  },
  {
    id: 'leech', name: 'Vol de vie', color: UPGRADE_COLORS.GREEN, rarity: 'rare', maxStack: 2,
    description: '+1 PV par ennemi tué.',
    effect: { type: 'passive', trigger: 'onKill', action: 'heal', value: 1 },
    tags: ['soin', 'kill'],
  },
  {
    id: 'overgrowth', name: 'Excroissance', color: UPGRADE_COLORS.GREEN, rarity: 'epic', maxStack: 1,
    description: 'Chaque upgrade vert → +3 PV instantanés.',
    effect: { type: 'passive', trigger: 'onUpgradeGained', colorFilter: UPGRADE_COLORS.GREEN, action: 'heal', value: 3 },
    tags: ['soin', 'synergie'],
  },
  {
    id: 'thorns', name: 'Épines', color: UPGRADE_COLORS.GREEN, rarity: 'rare', maxStack: 2,
    description: 'Renvoie 2 dégâts à chaque attaquant.',
    effect: { type: 'passive', trigger: 'onDamaged', action: 'reflect', value: 2 },
    tags: ['riposte', 'défense'],
  },
];

const UPGRADE_MAP = ALL_UPGRADES.reduce((acc, u) => { acc[u.id] = u; return acc; }, {});

// ─── API ──────────────────────────────────────────────────────────────────────

/**
 * Sélectionne N upgrades à proposer au joueur (pondéré par rareté, sans doublons max-stack)
 */
export function getUpgradeChoices(activeUpgrades, count = 3) {
  const stackCount = {};
  activeUpgrades.forEach(u => { stackCount[u.id] = (stackCount[u.id] || 0) + 1; });

  const available = ALL_UPGRADES.filter(u => (stackCount[u.id] || 0) < u.maxStack);
  if (available.length <= count) return [...available];

  const weighted = available.flatMap(u => {
    if (u.rarity === 'common') return [u, u, u];
    if (u.rarity === 'rare')   return [u, u];
    return [u];
  });

  const selected = [];
  const usedIds  = new Set();
  let attempts   = 0;

  while (selected.length < count && attempts < 200) {
    attempts++;
    const candidate = weighted[Math.floor(Math.random() * weighted.length)];
    if (!usedIds.has(candidate.id)) {
      usedIds.add(candidate.id);
      selected.push(candidate);
    }
  }

  return selected;
}

/**
 * Détecte et marque les synergies couleur (3 upgrades d'une même couleur)
 */
export function applySynergies(upgrades) {
  const colorCount = countByColor(upgrades);
  const activeColors = Object.entries(colorCount)
    .filter(([, c]) => c >= 3)
    .map(([color]) => color);

  return upgrades.map(u => ({
    ...u,
    synergyActive: activeColors.includes(u.color),
  }));
}

/**
 * Calcule les stats finales du joueur avec tous les upgrades
 */
export function computePlayerStats(basePlayer, activeUpgrades) {
  let stats = { ...basePlayer };

  activeUpgrades.forEach(u => {
    if (u.effect.type === 'stat') {
      const { stat, value } = u.effect;
      if (stats[stat] !== undefined) stats[stat] += value;
    }
  });

  // Résonance : ×2 sur attaque et défense si 3 upgrades même couleur
  if (activeUpgrades.some(u => u.id === 'resonance')) {
    const colorCount = countByColor(activeUpgrades);
    const hasTriple  = Object.values(colorCount).some(c => c >= 3);
    if (hasTriple) {
      stats.attack  *= 2;
      stats.defense *= 2;
      stats.maxHp    = Math.round(stats.maxHp * 1.5);
      stats._resonanceActive = true;
    }
  }

  stats.hp = Math.min(stats.hp, stats.maxHp);
  return stats;
}

export function getUpgradeById(id)             { return UPGRADE_MAP[id] || null; }
export function hasUpgrade(upgrades, id)       { return upgrades.some(u => u.id === id); }
export function getUpgradesByColor(upgrades, color) { return upgrades.filter(u => u.color === color); }

/**
 * Résumé des synergies pour l'UI (badge de couleur)
 */
export function getSynergySummary(activeUpgrades) {
  const colorCount = countByColor(activeUpgrades);
  return Object.entries(colorCount).map(([color, count]) => ({
    color, count, active: count >= 3,
  }));
}

function countByColor(upgrades) {
  const count = { [UPGRADE_COLORS.RED]: 0, [UPGRADE_COLORS.BLUE]: 0, [UPGRADE_COLORS.GREEN]: 0 };
  upgrades.forEach(u => { if (count[u.color] !== undefined) count[u.color]++; });
  return count;
}
