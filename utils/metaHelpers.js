/**
 * RIFT — Helpers partagés pour la méta-progression
 * Utilisés par navigationSlice (mort) et progressionSlice (victoire)
 */

import { PERMANENT_UPGRADES_CATALOG } from '../constants';

export function isUnlockConditionMet(upgrade, meta) {
  const cond = upgrade.unlockCondition;
  if (!cond) return true;
  const totalWins = Object.values(meta.shapeStats || {}).reduce((s, v) => s + (v.wins || 0), 0);
  switch (cond.type) {
    case 'runs':       return meta.totalRuns >= cond.value;
    case 'kills':      return meta.totalKills >= cond.value;
    case 'wins':       return totalWins >= cond.value;
    case 'score':      return meta.bestScore >= cond.value;
    case 'shape_win':  return (meta.shapeStats?.[cond.shape]?.wins || 0) >= 1;
    case 'all_shapes': {
      const s = meta.shapeStats || {};
      return (s.triangle?.wins || 0) > 0 && (s.circle?.wins || 0) > 0 && (s.hexagon?.wins || 0) > 0;
    }
    default: return true;
  }
}

/**
 * Pioche `count` upgrades permanents non encore obtenus et dont la condition est remplie.
 * @param {Array}  existing  Upgrades déjà possédés
 * @param {Object} meta      État méta courant (totalRuns, totalKills, etc.)
 * @param {number} count     Nombre à piocher (1 à la mort, 2 à la victoire)
 * @returns {Array}          Tableau d'upgrades (peut être plus court si le pool est vide)
 */
export function pickPermanentUpgrades(existing, meta, count = 1) {
  const existingIds = existing.map(u => u.id);
  const pool = PERMANENT_UPGRADES_CATALOG.filter(
    u => !existingIds.includes(u.id) && isUnlockConditionMet(u, meta)
  );
  const results = [];
  const remaining = [...pool];
  for (let i = 0; i < count && remaining.length > 0; i++) {
    const idx = Math.floor(Math.random() * remaining.length);
    results.push(remaining.splice(idx, 1)[0]);
  }
  return results;
}
