/**
 * RIFT — Haptics
 * Retours haptiques sur mobile — silencieux sur web/simulateurs
 */

import * as Haptics from 'expo-haptics';

const safe = (fn) => () => { try { fn(); } catch {} };

// Coup léger (joueur inflige des dégâts)
export const hapticLight = safe(() =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
);

// Coup moyen (kill ennemi, sélection upgrade)
export const hapticMedium = safe(() =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
);

// Coup fort (joueur reçoit des dégâts, boss attaque)
export const hapticHeavy = safe(() =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
);

// Succès (salle terminée, victoire, unlock)
export const hapticSuccess = safe(() =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
);

// Échec (mort du joueur)
export const hapticError = safe(() =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
);

// Avertissement (dégâts critiques, PV bas)
export const hapticWarning = safe(() =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
);
