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

  {
    id: 'critique', name: 'Frappe Critique', color: UPGRADE_COLORS.RED, rarity: 'rare', maxStack: 3,
    description: '+15% de chance de tripler les dégâts (cumulable).',
    effect: { type: 'passive', trigger: 'onAttack', action: 'criticalHit', chance: 0.15, multiplier: 3 },
    tags: ['dégâts', 'chance'],
  },
  {
    id: 'combustion', name: 'Combustion', color: UPGRADE_COLORS.RED, rarity: 'rare', maxStack: 2,
    description: 'Combo x2+ : inflige 3 dégâts à tous les ennemis adjacents. Cumulable.',
    effect: { type: 'passive', trigger: 'onCombo', action: 'aoeAroundPlayer', value: 3 },
    tags: ['dégâts', 'combo', 'aoe'],
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
    description: 'Renvoie 2 dégâts à chaque attaquant. Cumulable.',
    effect: { type: 'passive', trigger: 'onDamaged', action: 'reflect', value: 2 },
    tags: ['riposte', 'défense'],
  },
  {
    id: 'second_wind', name: 'Second Souffle', color: UPGRADE_COLORS.GREEN, rarity: 'epic', maxStack: 1,
    description: 'Une fois par run : survie à un coup fatal avec 1 PV.',
    effect: { type: 'passive', trigger: 'onFatalHit', action: 'survive' },
    tags: ['survie', 'vie'],
  },
  {
    id: 'regain', name: 'Regain', color: UPGRADE_COLORS.GREEN, rarity: 'rare', maxStack: 2,
    description: 'Quand le bouclier absorbe un coup : +2 PV. Cumulable.',
    effect: { type: 'passive', trigger: 'onShieldBlock', action: 'heal', value: 2 },
    tags: ['soin', 'défense', 'bouclier'],
  },

  // ── Rouge offensif supplémentaire ─────────────────────────────────────────
  {
    id: 'tranchant', name: 'Tranchant', color: UPGRADE_COLORS.RED, rarity: 'common', maxStack: 3,
    description: 'Perce 2 pts de défense ennemie par attaque. Cumulable.',
    effect: { type: 'passive', trigger: 'onAttack', action: 'pierceDefense', value: 2 },
    tags: ['dégâts', 'pénétration'],
  },
  {
    id: 'berserker', name: 'Berserker', color: UPGRADE_COLORS.RED, rarity: 'epic', maxStack: 1,
    description: 'Sous 30% de PV : ATQ doublée.',
    effect: { type: 'passive', trigger: 'onAttack', action: 'berserk', threshold: 0.3 },
    tags: ['dégâts', 'survie'],
  },
  {
    id: 'cyclone', name: 'Cyclone', color: UPGRADE_COLORS.RED, rarity: 'rare', maxStack: 1,
    description: 'Chaque attaque frappe aussi les ennemis adjacents pour 50% des dégâts.',
    effect: { type: 'passive', trigger: 'onAttack', action: 'aoeOnAttack', multiplier: 0.5 },
    tags: ['dégâts', 'aoe'],
  },

  // ── Bleu utilitaire supplémentaire ────────────────────────────────────────
  {
    id: 'fortifie', name: 'Fortifié', color: UPGRADE_COLORS.BLUE, rarity: 'epic', maxStack: 1,
    description: 'Début de chaque salle : bouclier actif automatiquement.',
    effect: { type: 'passive', trigger: 'onRoomEnter', action: 'applyStatus', status: 'shield' },
    tags: ['défense', 'bouclier'],
  },
  {
    id: 'esquive', name: 'Esquive', color: UPGRADE_COLORS.BLUE, rarity: 'rare', maxStack: 2,
    description: '20% de chance d\'esquiver complètement une attaque par stack.',
    effect: { type: 'passive', trigger: 'onDamaged', action: 'dodge', chancePerStack: 0.2 },
    tags: ['défense', 'chance'],
  },
  {
    id: 'vigile', name: 'Vigile', color: UPGRADE_COLORS.BLUE, rarity: 'rare', maxStack: 2,
    description: 'Fin de chaque tour : inflige 1 dégât aux ennemis adjacents. Cumulable.',
    effect: { type: 'passive', trigger: 'onTurnEnd', action: 'damageAdjacent', value: 1 },
    tags: ['dégâts', 'aoe'],
  },

  // ── Vert soin supplémentaire ──────────────────────────────────────────────
  {
    id: 'parasitisme', name: 'Parasitisme', color: UPGRADE_COLORS.GREEN, rarity: 'rare', maxStack: 2,
    description: 'Lors d\'un combo (×2+) : soigne 3 PV. Cumulable.',
    effect: { type: 'passive', trigger: 'onCombo', action: 'heal', value: 3 },
    tags: ['soin', 'combo'],
  },
  {
    id: 'resistance', name: 'Résistance', color: UPGRADE_COLORS.GREEN, rarity: 'epic', maxStack: 1,
    description: 'Si PV > 50% : dégâts reçus réduits de 35%.',
    effect: { type: 'passive', trigger: 'onDamaged', action: 'reduceDamage', threshold: 0.5, reduction: 0.35 },
    tags: ['défense', 'survie'],
  },
  {
    id: 'renaissance', name: 'Renaissance', color: UPGRADE_COLORS.GREEN, rarity: 'epic', maxStack: 1,
    description: 'Fin de salle : soigne jusqu\'à 60% des PV max.',
    effect: { type: 'passive', trigger: 'onRoomCleared', action: 'healToPercent', percent: 0.6 },
    tags: ['soin', 'salle'],
  },

  // ── Risque / Récompense ───────────────────────────────────────────────────
  {
    id: 'pacte_sang', name: 'Pacte de Sang', color: UPGRADE_COLORS.RED, rarity: 'epic', maxStack: 1,
    description: '+8 ATQ — mais −8 PV max. Le pouvoir a un prix.',
    effect: { type: 'stat', changes: [{ stat: 'attack', value: 8 }, { stat: 'maxHp', value: -8 }] },
    tags: ['dégâts', 'risque', 'malus'],
  },
  {
    id: 'verre_trempe', name: 'Verre Trempé', color: UPGRADE_COLORS.BLUE, rarity: 'epic', maxStack: 1,
    description: '+5 DEF — mais −4 ATQ. Blindé, mais maladroit.',
    effect: { type: 'stat', changes: [{ stat: 'defense', value: 5 }, { stat: 'attack', value: -4 }] },
    tags: ['défense', 'risque', 'malus'],
  },
  {
    id: 'soif_sang', name: 'Soif de Sang', color: UPGRADE_COLORS.RED, rarity: 'epic', maxStack: 1,
    description: '+5 ATQ — mais perd 1 PV à chaque kill.',
    effect: { type: 'stat', stat: 'attack', value: 5 },
    tags: ['dégâts', 'risque', 'malus'],
  },
  {
    id: 'ame_maudite', name: 'Âme Maudite', color: UPGRADE_COLORS.RED, rarity: 'epic', maxStack: 1,
    description: '+6 ATQ — mais chaque coup reçu inflige +2 dégâts bonus.',
    effect: { type: 'stat', stat: 'attack', value: 6 },
    tags: ['dégâts', 'risque', 'malus'],
  },
  {
    id: 'contrat_mortel', name: 'Contrat Mortel', color: UPGRADE_COLORS.GREEN, rarity: 'epic', maxStack: 1,
    description: '+12 PV max — mais commence chaque salle à 60% de tes PV.',
    effect: { type: 'stat', stat: 'maxHp', value: 12 },
    tags: ['survie', 'risque', 'malus'],
  },

  // ── Malédictions (upgrades négatives pures) ───────────────────────────────
  {
    id: 'fragilite', name: 'Fragilité', color: UPGRADE_COLORS.CURSE, rarity: 'curse', maxStack: 1,
    description: '☠ MALÉDICTION — −5 PV max et −1 DEF.',
    effect: { type: 'stat', changes: [{ stat: 'maxHp', value: -5 }, { stat: 'defense', value: -1 }] },
    tags: ['malus', 'survie'],
  },
  {
    id: 'malediction', name: 'Malédiction', color: UPGRADE_COLORS.CURSE, rarity: 'curse', maxStack: 1,
    description: '☠ MALÉDICTION — Chaque déplacement coûte 1 PV.',
    effect: { type: 'passive', trigger: 'onMove', action: 'selfDamage', value: 1 },
    tags: ['malus', 'mouvement'],
  },
  {
    id: 'fardeau', name: 'Fardeau', color: UPGRADE_COLORS.CURSE, rarity: 'curse', maxStack: 1,
    description: '☠ MALÉDICTION — Chaque attaque ennemie inflige +2 dégâts bonus.',
    effect: { type: 'passive', trigger: 'onDamaged', action: 'extraDamage', value: 2 },
    tags: ['malus', 'défense'],
  },
  {
    id: 'corruption', name: 'Corruption', color: UPGRADE_COLORS.CURSE, rarity: 'curse', maxStack: 1,
    description: '☠ MALÉDICTION — Perd 1 PV au début de chaque tour ennemi.',
    effect: { type: 'passive', trigger: 'onEnemyTurnStart', action: 'selfDamage', value: 1 },
    tags: ['malus', 'tour'],
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
    return [u]; // epic + curse = weight 1
  });

  const selected    = [];
  const usedIds     = new Set();
  let   cursePicked = false;
  let   attempts    = 0;

  while (selected.length < count && attempts < 200) {
    attempts++;
    const candidate = weighted[Math.floor(Math.random() * weighted.length)];
    // Au plus 1 malédiction par sélection
    if (candidate.rarity === 'curse' && cursePicked) continue;
    if (!usedIds.has(candidate.id)) {
      usedIds.add(candidate.id);
      selected.push(candidate);
      if (candidate.rarity === 'curse') cursePicked = true;
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
      // Support single stat or multi-stat changes array
      const changes = u.effect.changes || [{ stat: u.effect.stat, value: u.effect.value }];
      changes.forEach(({ stat, value }) => {
        if (stats[stat] !== undefined) stats[stat] += value;
      });
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

  // Clamp — les malus ne peuvent pas rendre les stats négatives
  stats.attack  = Math.max(1, stats.attack);
  stats.defense = Math.max(0, stats.defense);
  stats.maxHp   = Math.max(1, stats.maxHp);
  stats.hp      = Math.min(stats.hp, stats.maxHp);
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
  const count = { [UPGRADE_COLORS.RED]: 0, [UPGRADE_COLORS.BLUE]: 0, [UPGRADE_COLORS.GREEN]: 0, [UPGRADE_COLORS.CURSE]: 0 };
  upgrades.forEach(u => { if (count[u.color] !== undefined) count[u.color]++; });
  return count;
}
