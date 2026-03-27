/**
 * RIFT — BossIntroOverlay
 * Écran d'intro avant une salle boss — 2.6s avant le combat
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Polygon, G, Line } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { PALETTE, ENEMY_TYPES } from '../constants';

const BOSS_DATA = {
  [ENEMY_TYPES.BOSS_VOID]: {
    name:     "L'ÉCHO",
    subtitle: 'Fin de l\'Acte I — Mini-boss',
    color:    PALETTE.boss,
    warning:  'Pattern en spirale · S\'enrage à 50 % PV',
  },
  [ENEMY_TYPES.BOSS_PULSE]: {
    name:     'TONNERRE INCARNÉ',
    subtitle: 'Fin de l\'Acte II — Boss',
    color:    '#FF6644',
    warning:  'Attaques en croix · Alterne déplacement et attaque',
  },
  [ENEMY_TYPES.BOSS_RIFT]: {
    name:     'LE DÉVOREUR',
    subtitle: 'Fin de l\'Acte III — Boss Final',
    color:    '#FF2266',
    warning:  'Frappe × 3 en phase finale · Pulse de rift tous les 3 tours · S\'accélère à 30 % PV',
  },
};

export default function BossIntroOverlay({ bossType }) {
  const { t } = useTranslation();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => (t + 1) % 60), 50);
    return () => clearInterval(id);
  }, []);

  const data  = BOSS_DATA[bossType] || BOSS_DATA[ENEMY_TYPES.BOSS_VOID];
  const color = data.color;
  const pulse = 0.7 + 0.3 * Math.sin(tick * 0.2);

  return (
    <View style={styles.overlay}>
      {/* Fond animé */}
      <View style={[styles.bg, { opacity: 0.08 + 0.04 * Math.sin(tick * 0.15) }]}>
        <Svg width={320} height={320} viewBox="0 0 320 320">
          {/* Anneaux concentriques */}
          {[80, 110, 140].map((r, i) => (
            <Circle
              key={i}
              cx={160} cy={160} r={r}
              fill="none"
              stroke={color}
              strokeWidth={1}
              opacity={0.3 + 0.1 * Math.sin(tick * 0.1 + i)}
            />
          ))}
          {/* Croix */}
          <Line x1={160} y1={20} x2={160} y2={300} stroke={color} strokeWidth={0.5} opacity={0.2} />
          <Line x1={20} y1={160} x2={300} y2={160} stroke={color} strokeWidth={0.5} opacity={0.2} />
        </Svg>
      </View>

      {/* Icône boss animée */}
      <View style={styles.iconArea}>
        <Svg width={120} height={120} viewBox="0 0 120 120">
          <G opacity={pulse}>
            <Circle cx={60} cy={60} r={38} fill={color} opacity={0.15} />
            <Circle cx={60} cy={60} r={28} fill={color} opacity={0.25} />
            <Circle cx={60} cy={60} r={18} fill={color} />
            <Polygon
              points={starPts(60, 60, 42, 18, 6)}
              fill="none"
              stroke={color}
              strokeWidth={2}
              opacity={0.6}
            />
          </G>
        </Svg>
      </View>

      {/* Texte */}
      <View style={styles.textArea}>
        <Text style={[styles.warningLabel, { color: color + 'CC' }]}>⚠  BOSS</Text>
        <Text style={[styles.bossName, { color }]}>{data.name}</Text>
        <Text style={styles.bossSubtitle}>{data.subtitle}</Text>
        <View style={[styles.warningBox, { borderColor: color + '44' }]}>
          <Text style={[styles.warningText, { color: color + 'BB' }]}>{data.warning}</Text>
        </View>
      </View>

      {/* Barre de compte à rebours */}
      <View style={styles.countdown}>
        <Text style={styles.countdownTxt}>{t('boss_intro.preparing')}</Text>
        <View style={styles.countdownBar}>
          <View
            style={[
              styles.countdownFill,
              {
                width:           `${Math.min(100, (tick / 52) * 100)}%`,
                backgroundColor: color,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

// Star polygon helper
const starPts = (cx, cy, ro, ri, n) =>
  Array.from({ length: n * 2 }, (_, i) => {
    const a = (Math.PI / n) * i - Math.PI / 2;
    const r = i % 2 === 0 ? ro : ri;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(' ');

const styles = StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: '#05050E',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             24,
    paddingHorizontal: 32,
  },

  bg: {
    position:  'absolute',
    top:       0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconArea: { alignItems: 'center' },

  textArea:      { alignItems: 'center', gap: 8 },
  warningLabel:  { fontSize: 11, fontWeight: 'bold', letterSpacing: 5 },
  bossName:      { fontSize: 38, fontWeight: 'bold', letterSpacing: 6, textAlign: 'center' },
  bossSubtitle:  { color: PALETTE.textMuted, fontSize: 13, letterSpacing: 2 },
  warningBox: {
    borderWidth:       1,
    borderRadius:      8,
    paddingHorizontal: 14,
    paddingVertical:   8,
    marginTop:         4,
  },
  warningText: { fontSize: 12, textAlign: 'center', lineHeight: 18 },

  countdown: { width: '100%', gap: 6, alignItems: 'center' },
  countdownTxt: { color: PALETTE.textDim, fontSize: 11, letterSpacing: 2 },
  countdownBar: {
    width:           '100%',
    height:          3,
    backgroundColor: PALETTE.bgCard,
    borderRadius:    2,
    overflow:        'hidden',
  },
  countdownFill: { height: 3, borderRadius: 2 },
});
