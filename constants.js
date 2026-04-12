/**
 * RIFT — Constantes globales partagées
 * Source unique de vérité — évite les dépendances circulaires entre modules
 */

// ─── Grille ───────────────────────────────────────────────────────────────────
export const GRID_SIZE = 9;

// ─── Feature flags bêta ──────────────────────────────────────────────────────
export const PREMIUM_SHOP_ENABLED = false;

// ─── Classes du joueur (IDs legacy conservés) ───────────────────────────────
// IDs internes inchangés (compatibilité saves) — noms affichés via CLASS_INFO
export const PLAYER_SHAPES = {
  TRIANGLE: 'triangle', // Assassin  — Pierce, attaque en ligne
  CIRCLE:   'circle',   // Arcaniste — AoE autour de lui
  HEXAGON:  'hexagon',  // Colosse   — Défense, riposte
  SPECTRE:  'spectre',  // PREMIUM   — Téléportation passive
  SHADOW:   'shadow',   // ACHAT     — Embuscade : premier coup ×2
  PALADIN:  'paladin',  // ACHAT     — Dévotion : soigne sur dégâts reçus
};

export const CLASS_INFO = {
  triangle: { name: 'Assassin',  short: 'ASS', color: '#00FFCC' },
  circle:   { name: 'Arcaniste', short: 'ARC', color: '#FF66FF' },
  hexagon:  { name: 'Colosse',   short: 'COL', color: '#66AAFF' },
  spectre:  { name: 'Spectre',   short: 'SPE', color: '#BB44FF', locked: true, premium: true },
  shadow:   { name: 'Ombre',     short: 'OMB', color: '#FF6600', locked: true, purchasable: true },
  paladin:  { name: 'Paladin',   short: 'PAL', color: '#FFCC00', locked: true, purchasable: true },
};

export const ENEMY_INFO = {
  chaser:        { name: 'Écumeur',           short: 'ÉCU' },
  shooter:       { name: 'Tirailleur',        short: 'TIR' },
  blocker:       { name: 'Titan',             short: 'TIT' },
  boss_void:     { name: "L'Écho",           short: 'ÉCH', isBoss: true },
  boss_cinder:   { name: 'Le Veilleur de Cendre', short: 'CEN', isBoss: true },
  boss_mirror:   { name: 'La Mère-Écho',      short: 'MER', isBoss: true },
  boss_weaver:   { name: 'Le Tisseur de Ruines', short: 'TIS', isBoss: true },
  boss_rust:     { name: "L'Ange Rouillé",    short: 'ROU', isBoss: true },
  boss_cutter:   { name: "Le Fendeur d'Ombres", short: 'FEN', isBoss: true },
  boss_pulse:    { name: 'Tonnerre Incarné', short: 'TON', isBoss: true },
  boss_rift:     { name: 'Le Dévoreur',      short: 'DÉV', isBoss: true, isFinal: true },
  boss_guardian: { name: 'Le Gardien',       short: 'GAR', isBoss: true, isFinal: true },
  boss_entity:   { name: "L'Entité",         short: 'ENT', isBoss: true, isFinal: true },
  healer:        { name: 'Guérisseur',        short: 'GUÉ' },
  explosive:     { name: 'Explosif',          short: 'EXP' },
  summoner:      { name: 'Invocateur',        short: 'INV' },
  sentinel:      { name: 'Sentinelle',        short: 'SEN' },
};

// ─── Couleurs d'upgrades (synergies) ─────────────────────────────────────────
export const UPGRADE_COLORS = {
  RED:   'red',   // Offensif
  BLUE:  'blue',  // Utilitaire / défensif
  GREEN: 'green', // Soin / support
  CURSE: 'curse', // Malédiction (négatif pur)
};

// ─── Types de salles ──────────────────────────────────────────────────────────
export const ROOM_TYPES = {
  COMBAT:     'combat',
  REST:       'rest',
  SHOP:       'shop',
  BOSS_MINI:  'boss_mini',   // Fin d'acte 1 — mini-boss
  BOSS:       'boss',        // Fin d'acte 2 — boss normal
  BOSS_FINAL: 'boss_final',  // Fin d'acte 3 — boss final (très fort)
  ELITE:      'elite',       // Ennemis renforcés, double récompense
  EVENT:      'event',       // Événement narratif avec choix
};

// ─── Phases de jeu ────────────────────────────────────────────────────────────
export const GAME_PHASES = {
  MENU:               'menu',
  PROLOGUE:           'prologue',
  SHAPE_SELECT:       'shapeSelect',
  MAP:                'map',
  COMBAT:             'combat',
  BOSS_INTRO:         'bossIntro',
  REST_ROOM:          'restRoom',
  SHOP_ROOM:          'shopRoom',
  UPGRADE_CHOICE:     'upgradeChoice',
  EVENT_ROOM:         'eventRoom',
  TALENT_TREE:        'talentTree',
  PREMIUM_SHOP:       'premiumShop',
  GAME_OVER:          'gameOver',
  VICTORY:            'victory',
  ORIGINE_ENCOUNTER:  'origineEncounter',
  MULTIPLAYER:        'multiplayer',
  ACHIEVEMENTS:       'achievements',
  LORE:               'lore',
  SETTINGS:           'settings',
  PRIVACY:            'privacy',
  LEGAL:              'legal',
};

// ─── Types d'ennemis ──────────────────────────────────────────────────────────
export const ENEMY_TYPES = {
  CHASER:         'chaser',         // Suit le joueur, rapide
  SHOOTER:        'shooter',        // Tire à distance
  BLOCKER:        'blocker',        // Se déplace peu, très résistant
  BOSS_VOID:      'boss_void',      // Mini-boss / Boss acte 1 — spirale
  BOSS_CINDER:    'boss_cinder',    // Boss acte 1 — cendres / feu
  BOSS_MIRROR:    'boss_mirror',    // Boss acte 1 — imitation / tempo
  BOSS_WEAVER:    'boss_weaver',    // Boss acte 1 — invocations / fils
  BOSS_RUST:      'boss_rust',      // Boss acte 1 — bouclier / rouille
  BOSS_CUTTER:    'boss_cutter',    // Boss acte 1 — lignes / dashes
  BOSS_PULSE:     'boss_pulse',     // Boss acte 2 — onde de choc
  BOSS_RIFT:      'boss_rift',      // Boss final acte 3A — Le Dévoreur
  BOSS_GUARDIAN:  'boss_guardian',  // Boss final acte 3B — Le Gardien
  BOSS_ENTITY:    'boss_entity',    // Boss final acte 3C — L'Entité (permanent)
  HEALER:         'healer',         // Soigne les ennemis adjacents, fuit le joueur
  EXPLOSIVE:      'explosive',      // Explose à la mort (AoE rayon 2)
  SUMMONER:       'summoner',       // Invoque des Chasseurs tous les 3 tours
};

export const ACT1_BOSS_TYPES = [
  ENEMY_TYPES.BOSS_VOID,
  ENEMY_TYPES.BOSS_CINDER,
  ENEMY_TYPES.BOSS_MIRROR,
  ENEMY_TYPES.BOSS_WEAVER,
  ENEMY_TYPES.BOSS_RUST,
  ENEMY_TYPES.BOSS_CUTTER,
];

export const RUST_BOSS_UNLOCK_THRESHOLD = 8;

// ─── Types de cellules ────────────────────────────────────────────────────────
export const CELL_TYPES = {
  EMPTY:    'empty',
  WALL:     'wall',
  EXIT:     'exit',
  CHEST:    'chest',
  ALTAR:    'altar',
  LAVA:     'lava',      // Inflige 2 dégâts quand le joueur marche dessus
  TELEPORT: 'teleport',  // Téléporte vers la case liée
};

// ─── Palette de couleurs UI ───────────────────────────────────────────────────
export const PALETTE = {
  bg:           '#0A0A0F',
  bgCard:       '#12121A',
  bgDark:       '#080810',
  border:       '#1E1E30',
  borderLight:  '#2A2A44',
  textPrimary:  '#E0E0F0',
  textMuted:    '#666680',
  textDim:      '#44446A',

  // Classes joueur
  triangle:     '#00FFCC',
  circle:       '#FF66FF',
  hexagon:      '#66AAFF',

  // Ennemis
  chaser:       '#FF4444',
  shooter:      '#4488FF',
  blocker:      '#888899',
  boss:         '#BB44FF',

  // Upgrades
  upgradeRed:   '#FF4455',
  upgradeBlue:  '#4488FF',
  upgradeGreen: '#44FF88',

  // Salles
  roomCombat:   '#FF4455',
  roomRest:     '#44FF88',
  roomShop:     '#FFCC44',
  roomBoss:     '#BB44FF',
  roomElite:    '#FF8800',
  roomEvent:    '#FF88FF',

  // Nouveaux ennemis
  healer:    '#44FF88',
  explosive: '#FF8800',
  summoner:  '#CC44FF',
  sentinel:  '#44DDE6',

  // Statuts ennemis
  statusBurn:       '#FF6600',
  statusFreeze:     '#44CCFF',
  statusStun:       '#AAAAAA',
  statusVulnerable: '#FFFF44',

  // Jeu
  hp:           '#44FF88',
  charge:       '#FFCC00',
  fragment:     '#FF8844',
};

// ─── Catalogue des upgrades permanents (méta-progression) ────────────────────
// unlockCondition types :
//   null                                → toujours disponible
//   { type:'runs',      value:N }       → totalRuns >= N
//   { type:'kills',     value:N }       → totalKills >= N
//   { type:'wins',      value:N }       → total victoires >= N
//   { type:'score',     value:N }       → bestScore >= N
//   { type:'shape_win', shape:'xxx' }   → gagner 1 fois avec cette classe
//   { type:'all_shapes' }               → gagner avec les 3 classes de base
// hidden:true → condition affichée en "???" tant que non débloquée
export const PERMANENT_UPGRADES_CATALOG = [

  // ── Toujours disponibles ──────────────────────────────────────────────────
  {
    id: 'perm_hp1', name: '+5 PV max', icon: '❤',
    desc: 'Commence chaque run avec 5 PV supplémentaires.',
    statBonus: { stat: 'maxHp', value: 5 },
    unlockCondition: null, hidden: false,
  },
  {
    id: 'perm_atk1', name: '+1 Attaque', icon: '⚔',
    desc: 'Dégâts de base augmentés de 1.',
    statBonus: { stat: 'attack', value: 1 },
    unlockCondition: null, hidden: false,
  },
  {
    id: 'perm_def1', name: '+1 Défense', icon: '🛡',
    desc: 'Réduit les dégâts reçus de 1 point.',
    statBonus: { stat: 'defense', value: 1 },
    unlockCondition: null, hidden: false,
  },
  {
    id: 'perm_frag1', name: '+3 Fragments', icon: '◈',
    desc: 'Commence avec 3 fragments pour le shop.',
    statBonus: { stat: 'fragments', value: 3 },
    unlockCondition: null, hidden: false,
  },

  // ── Débloquables par runs ─────────────────────────────────────────────────
  {
    id: 'perm_hp2', name: '+8 PV max', icon: '💗',
    desc: 'Robustesse accrue. +8 PV de départ.',
    statBonus: { stat: 'maxHp', value: 8 },
    unlockCondition: { type: 'runs', value: 3, desc: '3 runs joués' },
    hidden: false,
  },
  {
    id: 'perm_charge1', name: '+2 Charges max', icon: '⚡',
    desc: 'Capacité de charge augmentée de 2.',
    statBonus: { stat: 'maxCharges', value: 2 },
    unlockCondition: { type: 'runs', value: 3, desc: '3 runs joués' },
    hidden: false,
  },
  {
    id: 'perm_atk2', name: '+2 Attaque', icon: '🗡',
    desc: 'Dégâts de base augmentés de 2.',
    statBonus: { stat: 'attack', value: 2 },
    unlockCondition: { type: 'runs', value: 6, desc: '6 runs joués' },
    hidden: false,
  },
  {
    id: 'perm_frag2', name: '+6 Fragments', icon: '💎',
    desc: 'Commence avec 6 fragments supplémentaires.',
    statBonus: { stat: 'fragments', value: 6 },
    unlockCondition: { type: 'runs', value: 6, desc: '6 runs joués' },
    hidden: false,
  },
  {
    id: 'perm_def2', name: '+2 Défense', icon: '🔰',
    desc: 'Armure renforcée. Réduit les dégâts de 2.',
    statBonus: { stat: 'defense', value: 2 },
    unlockCondition: { type: 'runs', value: 12, desc: '12 runs joués' },
    hidden: false,
  },
  {
    id: 'perm_hp3', name: '+12 PV max', icon: '💖',
    desc: 'Vitalité accrue. +12 PV de base.',
    statBonus: { stat: 'maxHp', value: 12 },
    unlockCondition: { type: 'runs', value: 12, desc: '12 runs joués' },
    hidden: false,
  },

  // ── Débloquables par kills ────────────────────────────────────────────────
  {
    id: 'perm_slayer', name: 'Tueur +1 ATK', icon: '🩸',
    desc: '+1 ATK. L\'expérience du combat te forge.',
    statBonus: { stat: 'attack', value: 1 },
    unlockCondition: { type: 'kills', value: 20, desc: '20 ennemis tués' },
    hidden: false,
  },
  {
    id: 'perm_slayer2', name: '+2 ATK', icon: '☠',
    desc: '+2 ATK. Le Rift t\'a endurci.',
    statBonus: { stat: 'attack', value: 2 },
    unlockCondition: { type: 'kills', value: 80, desc: '80 ennemis tués' },
    hidden: true,
  },

  // ── Débloquables par victoires ────────────────────────────────────────────
  {
    id: 'perm_victor', name: '+10 PV', icon: '🏆',
    desc: '+10 PV max. Récompense de la première victoire.',
    statBonus: { stat: 'maxHp', value: 10 },
    unlockCondition: { type: 'wins', value: 1, desc: 'Gagner 1 run' },
    hidden: false,
  },
  {
    id: 'perm_veteran', name: '+3 ATK', icon: '🔥',
    desc: '+3 ATK. Maîtrise acquise au fil des victoires.',
    statBonus: { stat: 'attack', value: 3 },
    unlockCondition: { type: 'wins', value: 3, desc: 'Gagner 3 runs' },
    hidden: false,
  },

  // ── Débloquables par victoire de classe ──────────────────────────────────
  {
    id: 'perm_pierce', name: '+2 ATK', icon: '🔱',
    desc: '+2 ATK. Maîtrise de l\'Assassin.',
    statBonus: { stat: 'attack', value: 2 },
    unlockCondition: { type: 'shape_win', shape: 'triangle', desc: 'Gagner avec l\'Assassin' },
    hidden: false,
  },
  {
    id: 'perm_aura', name: '+6 PV', icon: '🔮',
    desc: '+6 PV max. Maîtrise de l\'Arcaniste.',
    statBonus: { stat: 'maxHp', value: 6 },
    unlockCondition: { type: 'shape_win', shape: 'circle', desc: 'Gagner avec l\'Arcaniste' },
    hidden: false,
  },
  {
    id: 'perm_fortress', name: '+2 DEF', icon: '🏰',
    desc: '+2 DEF. Maîtrise du Colosse.',
    statBonus: { stat: 'defense', value: 2 },
    unlockCondition: { type: 'shape_win', shape: 'hexagon', desc: 'Gagner avec le Colosse' },
    hidden: false,
  },

  // ── Débloquables par score ────────────────────────────────────────────────
  {
    id: 'perm_scorer', name: '+8 Fragments', icon: '💰',
    desc: '+8 fragments de départ. Secret du marchand.',
    statBonus: { stat: 'fragments', value: 8 },
    unlockCondition: { type: 'score', value: 600, desc: 'Score de 600' },
    hidden: true,
  },

  // ── Nouvelles classes (Ombre / Paladin) ───────────────────────────────────
  {
    id: 'perm_shadow_mastery', name: 'Instinct +2 ATK', icon: '🌑',
    desc: '+2 ATK. Maîtrise de l\'Ombre.',
    statBonus: { stat: 'attack', value: 2 },
    unlockCondition: { type: 'shape_win', shape: 'shadow', desc: 'Gagner avec l\'Ombre' },
    hidden: false,
  },
  {
    id: 'perm_paladin_mastery', name: 'Foi +3 DEF', icon: '⚔️',
    desc: '+3 DEF. Maîtrise du Paladin.',
    statBonus: { stat: 'defense', value: 3 },
    unlockCondition: { type: 'shape_win', shape: 'paladin', desc: 'Gagner avec le Paladin' },
    hidden: false,
  },

  // ── Progression avancée ───────────────────────────────────────────────────
  {
    id: 'perm_frag3', name: '+10 Fragments', icon: '💰',
    desc: 'Commence avec 10 fragments. Richesse accumulée.',
    statBonus: { stat: 'fragments', value: 10 },
    unlockCondition: { type: 'runs', value: 20, desc: '20 runs joués' },
    hidden: false,
  },
  {
    id: 'perm_atk3', name: '+3 Attaque', icon: '🔥',
    desc: '+3 ATK. Vétéran des profondeurs.',
    statBonus: { stat: 'attack', value: 3 },
    unlockCondition: { type: 'kills', value: 200, desc: '200 ennemis tués' },
    hidden: true,
  },
  {
    id: 'perm_hp4', name: '+15 PV max', icon: '💝',
    desc: '+15 PV max. Corps éprouvé par le Rift.',
    statBonus: { stat: 'maxHp', value: 15 },
    unlockCondition: { type: 'score', value: 1200, desc: 'Score de 1200' },
    hidden: true,
  },
  {
    id: 'perm_charge2', name: '+3 Charges max', icon: '⚡',
    desc: '+3 charges max. Réserve d\'énergie étendue.',
    statBonus: { stat: 'maxCharges', value: 3 },
    unlockCondition: { type: 'wins', value: 5, desc: 'Gagner 5 runs' },
    hidden: false,
  },

  // ── Légendaires ───────────────────────────────────────────────────────────
  {
    id: 'perm_master', name: '+4 ATK', icon: '👑',
    desc: '+4 ATK. Maître du Rift — victoire avec les 3 classes de base.',
    statBonus: { stat: 'attack', value: 4 },
    unlockCondition: { type: 'all_shapes', desc: 'Gagner avec les 3 classes de base' },
    hidden: true,
  },
  {
    id: 'perm_transcend', name: '+20 PV', icon: '✨',
    desc: '+20 PV max. La plus haute progression.',
    statBonus: { stat: 'maxHp', value: 20 },
    unlockCondition: { type: 'wins', value: 8, desc: 'Gagner 8 runs' },
    hidden: true,
  },
];

// ─── Carte du run (template de 6 couches) ────────────────────────────────────
// Inspiraion Slay the Spire : combat → choix → boss
export const RUN_MAP_TEMPLATE = [
  [ROOM_TYPES.COMBAT, ROOM_TYPES.REST],
  [ROOM_TYPES.COMBAT, ROOM_TYPES.SHOP, ROOM_TYPES.COMBAT],
  [ROOM_TYPES.COMBAT, ROOM_TYPES.REST],
  [ROOM_TYPES.BOSS],
  [ROOM_TYPES.COMBAT, ROOM_TYPES.SHOP],
  [ROOM_TYPES.BOSS],
];
