/**
 * RIFT — Cosmetic Catalog
 * Thèmes de couleurs pour le plateau de jeu.
 * Achetés individuellement (0,99 € chacun) dans la boutique.
 */

export const GRID_THEMES = {
  default: {
    id:        'default',
    name:      'Défaut',
    emoji:     '🌑',
    floor0:    '#0C0C16',
    floor1:    '#0A0A14',
    wall:      '#1A1A28',
    wallInner: '#111120',
    wallLine:  '#2A2A40',
    gridLine:  '#1A1A2E',
  },
  blood: {
    id:        'blood',
    name:      'Sang',
    emoji:     '🩸',
    floor0:    '#160808',
    floor1:    '#120606',
    wall:      '#281010',
    wallInner: '#1A0808',
    wallLine:  '#3A1818',
    gridLine:  '#2E0A0A',
  },
  ice: {
    id:        'ice',
    name:      'Glace',
    emoji:     '❄️',
    floor0:    '#060C18',
    floor1:    '#040A16',
    wall:      '#0A1828',
    wallInner: '#060E1E',
    wallLine:  '#1A3050',
    gridLine:  '#0A1830',
  },
  void: {
    id:        'void',
    name:      'Néant',
    emoji:     '🕳️',
    floor0:    '#040408',
    floor1:    '#020206',
    wall:      '#0C0C14',
    wallInner: '#080810',
    wallLine:  '#1A1A2A',
    gridLine:  '#0A0A12',
  },
};

export const GRID_THEMES_LIST = Object.values(GRID_THEMES);
