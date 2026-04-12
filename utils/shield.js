/**
 * Shared shield helpers.
 */

export function getShieldBlockValue(player) {
  // Keep shield power readable and bounded across progression.
  return Math.min(8, Math.max(2, Math.round((player?.maxHp || 0) * 0.2)));
}
