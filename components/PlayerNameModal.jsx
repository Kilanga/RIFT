/**
 * RIFT — PlayerNameModal
 * Saisie du pseudo pour le leaderboard online (affiché au premier lancement)
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import useGameStore from '../store/gameStore';
import { PALETTE } from '../constants';

export default function PlayerNameModal({ visible, onDone }) {
  const setPlayerName = useGameStore(s => s.setPlayerName);
  const [name, setName]       = useState('');
  const [error, setError]     = useState('');

  const handleConfirm = () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) { setError('2 caractères minimum'); return; }
    setPlayerName(trimmed);
    onDone();
  };

  const handleSkip = () => {
    onDone();
  };

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.card}>
          <Text style={styles.title}>LEADERBOARD ONLINE</Text>
          <Text style={styles.subtitle}>
            Choisis ton nom de joueur.{'\n'}Il apparaîtra dans le classement mondial.
          </Text>

          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            placeholder="Ton pseudo (max 16 car.)"
            placeholderTextColor={PALETTE.textDim}
            value={name}
            onChangeText={t => { setName(t.slice(0, 16)); setError(''); }}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleConfirm}
          />
          {error ? <Text style={styles.errorTxt}>{error}</Text> : null}

          <TouchableOpacity style={styles.btnConfirm} onPress={handleConfirm} activeOpacity={0.8}>
            <Text style={styles.btnConfirmTxt}>✓  CONFIRMER</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnSkip} onPress={handleSkip} activeOpacity={0.8}>
            <Text style={styles.btnSkipTxt}>Passer (scores locaux seulement)</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent:  'center',
    alignItems:      'center',
    padding:         24,
  },
  card: {
    width:           '100%',
    backgroundColor: PALETTE.bgCard,
    borderRadius:    16,
    borderWidth:     1,
    borderColor:     PALETTE.borderLight,
    padding:         24,
    gap:             14,
    alignItems:      'center',
  },
  title:    { color: PALETTE.textPrimary, fontSize: 18, fontWeight: 'bold', letterSpacing: 4 },
  subtitle: { color: PALETTE.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20 },

  input: {
    width:             '100%',
    backgroundColor:   PALETTE.bgDark,
    borderWidth:       1,
    borderColor:       PALETTE.borderLight,
    borderRadius:      10,
    paddingHorizontal: 14,
    paddingVertical:   12,
    color:             PALETTE.textPrimary,
    fontSize:          16,
    textAlign:         'center',
    letterSpacing:     2,
  },
  inputError: { borderColor: PALETTE.upgradeRed },
  errorTxt:   { color: PALETTE.upgradeRed, fontSize: 11 },

  btnConfirm: {
    width:           '100%',
    backgroundColor: '#001A10',
    borderWidth:     2,
    borderColor:     PALETTE.triangle,
    borderRadius:    12,
    paddingVertical: 14,
    alignItems:      'center',
  },
  btnConfirmTxt: { color: PALETTE.triangle, fontSize: 15, fontWeight: 'bold', letterSpacing: 3 },

  btnSkip: { paddingVertical: 6 },
  btnSkipTxt: { color: PALETTE.textDim, fontSize: 12 },
});
