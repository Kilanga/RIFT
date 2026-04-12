/**
 * RIFT — Easter Eggs
 * 4 mécaniques cachées débloquées par des conditions spéciales
 */

export const EASTER_EGGS_CATALOG = [
  {
    id: 'pentakill',
    name: 'Pentakill',
    icon: '⚡',
    hidden: true,
    type: 'title', // title | mechanic | cosmetic
    desc: 'Tuer 5 ennemis en 4 tours maximum',
    condition: (meta, run, extra = {}) => {
      // extra = { killsThisTurn, turnsInRoom }
      return extra.killsThisTurn >= 5 && extra.turnsInRoom <= 4;
    },
    reward: { type: 'title', id: 'pentakill' },
    textFR: '⚡ PENTAKILL! — Killing Spree',
    textEN: '⚡ PENTAKILL! — Killing Spree',
  },

  {
    id: 'shiny',
    name: 'Shiny Encounter',
    icon: '✨',
    hidden: true,
    type: 'cosmetic',
    desc: 'Rencontrez l\'ultra-rare (tous les 8192 combats)',
    condition: (meta, run, extra = {}) => {
      // extra = { totalCombats }
      return extra.totalCombats > 0 && extra.totalCombats % 8192 === 0;
    },
    reward: { type: 'cosmetic', id: 'shiny_yellow_enemies' },
    textFR: '✨ SHINY ENCOUNTER — *Les ennemis scintillent d\'or* ... vous avez une chance infime d\'avoir vu cela',
    textEN: '✨ SHINY ENCOUNTER — *Enemies gleam with rare brilliance...* An honor to witness',
  },

  {
    id: 'leroy_jenkins',
    name: 'Leroy Jenkins',
    icon: '🏃',
    hidden: true,
    type: 'title',
    desc: '20 morts consécutives avant le 1er boss (run 21 = chaos)',
    condition: (meta, run, extra = {}) => {
      // extra = { deathsBeforeBoss }
      return extra.deathsBeforeBoss >= 20;
    },
    reward: { type: 'title', id: 'leroy_jenkins' },
    textFR: '🏃 LEROY JENKINS! — ALL RIGHT, EVERYBODY LEEEEEEEROOOOOOY...',
    textEN: '🏃 LEROY JENKINS! — ALL RIGHT, EVERYBODY LEEEEEEEROOOOOOY...',
    onUnlock: 'spawn_chaos_first_combat', // triggerSpecialMechanic
  },

  {
    id: 'arrow_in_knee',
    name: 'Arrow in the Knee',
    icon: '🏹',
    hidden: true,
    type: 'title',
    desc: 'Mourir tué par une attaque à distance',
    condition: (meta, run, extra = {}) => {
      // extra = { lastKillingAttackType }
      return extra.lastKillingAttackType === 'ranged';
    },
    reward: { type: 'title', id: 'arrow_in_knee' },
    textFR: "🏹 ARROW IN THE KNEE — J'avais une vie d'aventurier, moi aussi. Avant l'accident...",
    textEN: "🏹 ARROW IN THE KNEE — I was an adventurous warrior once. Until that fateful shot...",
  },
];

/**
 * Vérifie tous les easter eggs et retourne ceux qui viennent d'être débloqués
 */
export function checkNewEasterEggTitles(meta, run = null, extra = {}) {
  const currentTitles = meta.easterEggTitles || [];
  const newTitles     = [];

  EASTER_EGGS_CATALOG.forEach((egg) => {
    if (!currentTitles.includes(egg.id) && egg.condition(meta, run, extra)) {
      newTitles.push(egg);
    }
  });

  return newTitles;
}

/**
 * Retourne un easter egg par ID
 */
export function getEasterEggById(id) {
  return EASTER_EGGS_CATALOG.find((egg) => egg.id === id);
}

/**
 * Formate texto pour affichage (FR ou EN) avec paramètres optionnels
 */
export function formatEasterEggText(egg, lang = 'en', params = {}) {
  const text = lang === 'fr' ? egg.textFR : egg.textEN;
  let formatted = text;
  Object.keys(params).forEach((key) => {
    formatted = formatted.replace(`{{${key}}}`, params[key]);
  });
  return formatted;
}
