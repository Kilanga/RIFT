/**
 * RIFT — OrigineEncounterScreen
 * Rencontre narrative avec L'Origine.
 * Déclenchée toutes les 3 victoires sur un boss d'acte 3.
 * Aucun combat — dialogue pur, voix neutre.
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line } from 'react-native-svg';
import { PALETTE } from '../constants';
import { ORIGINE_DIALOGUE } from '../utils/loreData';
import useGameStore from '../store/gameStore';

const ORIGINE_COLOR = '#AADDFF';

export default function OrigineEncounterScreen() {
  const finishOrigine = useGameStore(s => s.finishOrigine);
  const [lineIdx, setLineIdx] = useState(0);
  const [tick, setTick]       = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const id = setInterval(() => setTick(t => (t + 1) % 120), 50);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [lineIdx]);

  const isLast = lineIdx >= ORIGINE_DIALOGUE.length - 1;

  function handleNext() {
    Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
      if (isLast) {
        finishOrigine();
      } else {
        setLineIdx(i => i + 1);
      }
    });
  }

  const pulse = 0.4 + 0.3 * Math.sin(tick * 0.06);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Visuel L'Origine — anneaux concentriques lumineux */}
        <View style={styles.visual}>
          <Svg width={140} height={140} viewBox="0 0 140 140">
            {[55, 42, 30, 18].map((r, i) => (
              <Circle key={i} cx={70} cy={70} r={r}
                fill="none"
                stroke={ORIGINE_COLOR}
                strokeWidth={i === 3 ? 2 : 0.8}
                opacity={(0.15 + 0.12 * i) * (0.7 + 0.3 * Math.sin(tick * 0.08 + i))}
              />
            ))}
            {/* Croix de lumière */}
            <Line x1={70} y1={14} x2={70} y2={126} stroke={ORIGINE_COLOR} strokeWidth={0.5} opacity={0.2 * pulse} />
            <Line x1={14} y1={70} x2={126} y2={70} stroke={ORIGINE_COLOR} strokeWidth={0.5} opacity={0.2 * pulse} />
            {/* Point central */}
            <Circle cx={70} cy={70} r={5} fill={ORIGINE_COLOR} opacity={0.6 + 0.4 * pulse} />
          </Svg>
        </View>

        {/* Label */}
        <View style={styles.labelArea}>
          <Text style={styles.label}>L'ORIGINE</Text>
          <Text style={styles.sublabel}>La mémoire des bâtisseurs</Text>
        </View>

        {/* Ligne de dialogue */}
        <Animated.View style={[styles.dialogBox, { opacity: fadeAnim }]}>
          <Text style={styles.dialogText}>{ORIGINE_DIALOGUE[lineIdx]}</Text>
        </Animated.View>

        {/* Indicateur de progression */}
        <View style={styles.progress}>
          {ORIGINE_DIALOGUE.map((_, i) => (
            <View key={i} style={[styles.dot, i <= lineIdx && styles.dotDone]} />
          ))}
        </View>

        {/* Bouton */}
        <TouchableOpacity style={styles.btn} onPress={handleNext} activeOpacity={0.8}>
          <Text style={styles.btnTxt}>
            {isLast ? 'QUITTER' : 'Écouter la suite'}
          </Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#03050E' },
  container: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: 28,
    gap:               24,
  },

  visual: { alignItems: 'center' },

  labelArea:  { alignItems: 'center', gap: 4 },
  label:      { color: ORIGINE_COLOR, fontSize: 20, fontWeight: 'bold', letterSpacing: 6 },
  sublabel:   { color: PALETTE.textMuted, fontSize: 11, letterSpacing: 2 },

  dialogBox: {
    backgroundColor: '#080C16',
    borderWidth:     1,
    borderColor:     ORIGINE_COLOR + '44',
    borderRadius:    14,
    padding:         20,
    width:           '100%',
  },
  dialogText: {
    color:      PALETTE.textPrimary,
    fontSize:   14,
    lineHeight: 22,
    textAlign:  'center',
    fontStyle:  'italic',
  },

  progress:   { flexDirection: 'row', gap: 6 },
  dot:        { width: 5, height: 5, borderRadius: 3, backgroundColor: PALETTE.textDim },
  dotDone:    { backgroundColor: ORIGINE_COLOR },

  btn: {
    borderWidth:       1,
    borderColor:       ORIGINE_COLOR + '88',
    borderRadius:      12,
    paddingVertical:   14,
    paddingHorizontal: 32,
  },
  btnTxt: { color: ORIGINE_COLOR, fontSize: 14, letterSpacing: 2 },
});
