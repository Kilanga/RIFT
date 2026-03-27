/**
 * RIFT — EventRoomOverlay
 * Affiche un événement narratif avec des choix interactifs.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import useGameStore from '../store/gameStore';
import { PALETTE } from '../constants';

export default function EventRoomOverlay() {
  const currentEvent   = useGameStore(s => s.currentEvent);
  const applyEventChoice = useGameStore(s => s.applyEventChoice);
  const player         = useGameStore(s => s.player);

  if (!currentEvent) return null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.tag}>ÉVÉNEMENT</Text>
        <Text style={styles.title}>{currentEvent.title}</Text>
      </View>

      {/* Description */}
      <View style={styles.descBox}>
        <Text style={styles.desc}>{currentEvent.description}</Text>
      </View>

      {/* Choix */}
      <View style={styles.choices}>
        {currentEvent.choices.map(choice => {
          const locked = choice.requireFragments && player.fragments < choice.requireFragments;
          return (
            <TouchableOpacity
              key={choice.id}
              style={[styles.choiceBtn, locked && styles.choiceLocked]}
              onPress={() => !locked && applyEventChoice(choice.id)}
              activeOpacity={locked ? 1 : 0.7}
            >
              <Text style={[styles.choiceLabel, locked && styles.choiceLabelLocked]}>
                {choice.label}
              </Text>
              {locked && (
                <Text style={styles.lockedHint}>
                  Fragments insuffisants ({choice.requireFragments} requis)
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Stats joueur */}
      <View style={styles.statsRow}>
        <Text style={styles.stat}>❤ {player.hp}/{player.maxHp}</Text>
        <Text style={styles.stat}>⚔ {player.attack}</Text>
        <Text style={styles.stat}>🛡 {player.defense}</Text>
        <Text style={styles.stat}>◈ {player.fragments}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  tag: {
    fontSize: 11,
    letterSpacing: 3,
    color: PALETTE.roomEvent || '#FF88FF',
    fontWeight: '700',
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: PALETTE.textPrimary,
    textAlign: 'center',
  },
  descBox: {
    backgroundColor: PALETTE.bgCard,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PALETTE.borderLight,
    padding: 16,
    marginBottom: 24,
    width: '100%',
  },
  desc: {
    fontSize: 14,
    color: PALETTE.textPrimary,
    lineHeight: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  choices: {
    width: '100%',
    gap: 10,
  },
  choiceBtn: {
    backgroundColor: PALETTE.bgCard,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PALETTE.borderLight,
    padding: 14,
    alignItems: 'center',
  },
  choiceLocked: {
    opacity: 0.5,
    borderColor: PALETTE.textDim,
  },
  choiceLabel: {
    fontSize: 14,
    color: PALETTE.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
  choiceLabelLocked: {
    color: PALETTE.textMuted,
  },
  lockedHint: {
    fontSize: 11,
    color: PALETTE.textMuted,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 24,
  },
  stat: {
    fontSize: 13,
    color: PALETTE.textMuted,
  },
});
