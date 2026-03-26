/**
 * RIFT — CombatLog
 * Affiche les derniers messages de combat en bas de l'écran
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import useGameStore from '../store/gameStore';
import { PALETTE } from '../constants';

export default function CombatLog({ maxLines = 4 }) {
  const combatLog  = useGameStore(s => s.combatLog);
  const scrollRef  = useRef(null);
  const last = combatLog.slice(-maxLines);

  // Auto-scroll vers le bas à chaque nouveau message
  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [combatLog.length]);

  if (last.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView ref={scrollRef} style={styles.scroll} showsVerticalScrollIndicator={false}>
        {last.map((entry, i) => (
          <Text key={`${entry.time}_${i}`} style={[styles.line, { opacity: 0.5 + (i / last.length) * 0.5 }]}>
            {entry.text}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width:           '100%',
    maxHeight:       72,
    backgroundColor: '#08080F',
    borderTopWidth:  1,
    borderTopColor:  PALETTE.border,
    paddingHorizontal: 12,
    paddingVertical:   4,
  },
  scroll: { flex: 1 },
  line: {
    color:     PALETTE.textMuted,
    fontSize:  11,
    lineHeight: 16,
    fontFamily: 'monospace',
  },
});
