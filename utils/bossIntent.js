/**
 * Shared boss intent metadata for HUD and combat logs.
 */

const BOSS_INTENTS = {
  boss_void: {
    name: "L'Echo",
    label: 'VOID PULSE',
    effect: 'PORTEE 2',
    cycle: 3,
    warnColor: '#BB66FF',
    warnBg: '#1A1026',
    nowColor: '#FF66FF',
    nowBg: '#2A0F2A',
    textColor: '#E4B8FF',
  },
  boss_cinder: {
    name: 'Le Veilleur de Cendre',
    label: 'CENDRE',
    effect: 'RAYON 2',
    cycle: 3,
    warnColor: '#FF8A4A',
    warnBg: '#2A140A',
    nowColor: '#FF5C22',
    nowBg: '#351006',
    textColor: '#FFD0B8',
  },
  boss_mirror: {
    name: 'La Mere-Echo',
    label: 'MIROIR',
    effect: 'RYTHME',
    cycle: 2,
    warnColor: '#FF86C0',
    warnBg: '#2A1020',
    nowColor: '#FF4D99',
    nowBg: '#330E24',
    textColor: '#FFD2E7',
  },
  boss_weaver: {
    name: 'Le Tisseur de Ruines',
    label: 'FILS',
    effect: 'RENFORTS',
    cycle: 3,
    warnColor: '#C99BFF',
    warnBg: '#1F132E',
    nowColor: '#A86BFF',
    nowBg: '#27113D',
    textColor: '#E8D6FF',
  },
  boss_rust: {
    name: "L'Ange Rouille",
    label: 'ROUILLE',
    effect: 'BOUCLIER',
    cycle: 3,
    warnColor: '#C9B89B',
    warnBg: '#221D12',
    nowColor: '#A89271',
    nowBg: '#2C2314',
    textColor: '#E5D8BC',
  },
  boss_cutter: {
    name: "Le Fendeur d'Ombres",
    label: 'FENTE',
    effect: 'LIGNES',
    cycle: 2,
    warnColor: '#7DDFFF',
    warnBg: '#0D1D25',
    nowColor: '#33C5FF',
    nowBg: '#0A2530',
    textColor: '#D3F4FF',
  },
  boss_pulse: {
    name: 'Tonnerre Incarne',
    label: 'ONDE',
    effect: 'ALIGNEMENT',
    cycle: 2,
    warnColor: '#FFAA44',
    warnBg: '#2A1A0D',
    nowColor: '#FF7722',
    nowBg: '#301406',
    textColor: '#FFD4A0',
  },
  boss_rift: {
    name: 'Le Devoreur',
    label: 'RIFT PULSE',
    effect: '2-3 CASES',
    cycle: 3,
    warnColor: '#FF6688',
    warnBg: '#2A1118',
    nowColor: '#FF335C',
    nowBg: '#300C15',
    textColor: '#FFB3C6',
  },
  boss_guardian: {
    name: 'Le Gardien',
    label: 'ONDE SACREE',
    effect: 'PORTEE 3',
    cycle: 4,
    warnColor: '#66CCFF',
    warnBg: '#0F1E2A',
    nowColor: '#2FB8FF',
    nowBg: '#0C2130',
    textColor: '#BCEBFF',
  },
  boss_entity: {
    name: "L'Entite",
    label: 'DEFLAGRATION',
    effect: '2-3 CASES',
    cycle: 3,
    warnColor: '#FF4477',
    warnBg: '#2A1118',
    nowColor: '#FF1144',
    nowBg: '#310913',
    textColor: '#FFABC0',
  },
};

export function getBossIntentState(enemy) {
  if (!enemy?.type) return null;
  const meta = BOSS_INTENTS[enemy.type];
  if (!meta) return null;

  const turn = enemy.turnCount || 0;
  const countdown = meta.cycle > 0
    ? (meta.cycle - ((turn + 1) % meta.cycle)) % meta.cycle
    : 0;

  return {
    ...meta,
    countdown,
  };
}
