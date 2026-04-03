/**
 * RIFT — PrologueScreen
 * Affiché une seule fois au premier lancement.
 * 3 pages de texte + bouton Continuer.
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PALETTE } from '../constants';
import { PROLOGUE_PAGES } from '../utils/loreData';
import useGameStore from '../store/gameStore';

export default function PrologueScreen() {
  const finishPrologue = useGameStore(s => s.finishPrologue);
  const [pageIdx, setPageIdx] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [pageIdx]);

  const page     = PROLOGUE_PAGES[pageIdx];
  const isLast   = pageIdx >= PROLOGUE_PAGES.length - 1;

  function handleNext() {
    Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      if (isLast) {
        finishPrologue();
      } else {
        setPageIdx(i => i + 1);
      }
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Indicateur de page */}
        <View style={styles.dots}>
          {PROLOGUE_PAGES.map((_, i) => (
            <View key={i} style={[styles.dot, i === pageIdx && styles.dotActive]} />
          ))}
        </View>

        {/* Texte */}
        <Animated.View style={[styles.textArea, { opacity: fadeAnim }]}>
          {page.lines.map((line, i) => (
            <Text
              key={i}
              style={[
                styles.line,
                line === '' && styles.lineEmpty,
              ]}
            >
              {line}
            </Text>
          ))}
        </Animated.View>

        {/* Bouton */}
        <TouchableOpacity style={styles.btn} onPress={handleNext} activeOpacity={0.8}>
          <Text style={styles.btnTxt}>
            {isLast ? 'ENTRER DANS LE RIFT' : 'Continuer'}
          </Text>
        </TouchableOpacity>

        {/* Skip */}
        <TouchableOpacity onPress={finishPrologue} activeOpacity={0.6}>
          <Text style={styles.skip}>Passer</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#05050E' },
  container: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: 36,
    gap:               32,
  },
  dots: { flexDirection: 'row', gap: 8 },
  dot: {
    width: 6, height: 6,
    borderRadius:    3,
    backgroundColor: PALETTE.textDim,
  },
  dotActive: { backgroundColor: PALETTE.textPrimary, width: 18 },

  textArea: { alignItems: 'center', gap: 4 },
  line: {
    color:      PALETTE.textPrimary,
    fontSize:   17,
    lineHeight: 28,
    textAlign:  'center',
    letterSpacing: 0.5,
  },
  lineEmpty: { height: 14 },

  btn: {
    borderWidth:       2,
    borderColor:       PALETTE.triangle,
    borderRadius:      14,
    paddingVertical:   16,
    paddingHorizontal: 36,
    backgroundColor:   '#001A10',
  },
  btnTxt: { color: PALETTE.triangle, fontSize: 15, fontWeight: 'bold', letterSpacing: 3 },

  skip: { color: PALETTE.textDim, fontSize: 12 },
});
