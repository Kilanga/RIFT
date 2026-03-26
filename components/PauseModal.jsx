/**
 * RIFT — PauseModal
 * Menu de pause : upgrades actifs, stats, reprendre / abandonner
 */

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useGameStore from '../store/gameStore';
import { PALETTE } from '../constants';

function upgradeHex(color) {
  return { red: PALETTE.upgradeRed, blue: PALETTE.upgradeBlue, green: PALETTE.upgradeGreen }[color] || '#888';
}

export default function PauseModal({ visible, onResume }) {
  const player         = useGameStore(s => s.player);
  const run            = useGameStore(s => s.run);
  const activeUpgrades = useGameStore(s => s.activeUpgrades);
  const goToMenu       = useGameStore(s => s.goToMenu);

  const [confirmAbandon, setConfirmAbandon] = useState(false);

  const handleAbandon = () => {
    if (!confirmAbandon) {
      setConfirmAbandon(true);
      return;
    }
    goToMenu();
  };

  const handleResume = () => {
    setConfirmAbandon(false);
    onResume();
  };

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safe}>
          <ScrollView contentContainerStyle={styles.container} bounces={false}>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>⏸  PAUSE</Text>
              <Text style={styles.subtitle}>Salle {run.roomsCleared + 1} · Score {run.score}</Text>
            </View>

            {/* Stats joueur */}
            <View style={styles.statsBox}>
              <Text style={styles.sectionLabel}>JOUEUR</Text>
              <View style={styles.statsRow}>
                <StatItem icon="❤" label="PV"       value={`${player.hp}/${player.maxHp}`} color={PALETTE.hp} />
                <StatItem icon="⚔" label="ATQ"      value={player.attack}  color={PALETTE.upgradeRed} />
                <StatItem icon="🛡" label="DÉF"      value={player.defense} color={PALETTE.upgradeBlue} />
                <StatItem icon="◈" label="Fragments" value={player.fragments} color={PALETTE.fragment} />
              </View>
            </View>

            {/* Upgrades actifs */}
            {activeUpgrades.length > 0 && (
              <View style={styles.upgradesBox}>
                <Text style={styles.sectionLabel}>
                  BUILD ACTUEL — {activeUpgrades.length} upgrade{activeUpgrades.length > 1 ? 's' : ''}
                </Text>
                {activeUpgrades.map((u, i) => {
                  const color = upgradeHex(u.color);
                  return (
                    <View
                      key={`${u.id}_${i}`}
                      style={[
                        styles.upgradeRow,
                        u.synergyActive && { borderColor: color, backgroundColor: color + '0A' },
                      ]}
                    >
                      <View style={[styles.colorDot, { backgroundColor: color }]} />
                      <View style={styles.upgradeTexts}>
                        <Text style={[styles.upgradeName, { color: u.synergyActive ? color : PALETTE.textPrimary }]}>
                          {u.synergyActive ? '✦ ' : ''}{u.name}
                        </Text>
                        <Text style={styles.upgradeDesc}>{u.description}</Text>
                      </View>
                      {u.synergyActive && (
                        <Text style={[styles.synergyTag, { color }]}>SYNERGIE</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* Boutons */}
            <View style={styles.buttons}>
              <TouchableOpacity style={styles.btnResume} onPress={handleResume} activeOpacity={0.8}>
                <Text style={styles.btnResumeTxt}>▶  REPRENDRE</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnAbandon, confirmAbandon && styles.btnAbandonConfirm]}
                onPress={handleAbandon}
                activeOpacity={0.8}
              >
                <Text style={[styles.btnAbandonTxt, confirmAbandon && { color: PALETTE.upgradeRed }]}>
                  {confirmAbandon ? '⚠ CONFIRMER L\'ABANDON ?' : '✕  ABANDONNER LE RUN'}
                </Text>
                {confirmAbandon && (
                  <Text style={styles.btnAbandonSub}>Score et kills seront perdus</Text>
                )}
              </TouchableOpacity>

              {confirmAbandon && (
                <TouchableOpacity style={styles.btnCancel} onPress={() => setConfirmAbandon(false)} activeOpacity={0.8}>
                  <Text style={styles.btnCancelTxt}>Non, continuer</Text>
                </TouchableOpacity>
              )}
            </View>

          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function StatItem({ icon, label, value, color }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center' },
  safe:    { maxHeight: '90%' },

  container: {
    margin:          20,
    backgroundColor: PALETTE.bgCard,
    borderRadius:    16,
    borderWidth:     1,
    borderColor:     PALETTE.borderLight,
    padding:         20,
    gap:             16,
  },

  header:   { alignItems: 'center', gap: 4 },
  title:    { color: PALETTE.textPrimary, fontSize: 22, fontWeight: 'bold', letterSpacing: 4 },
  subtitle: { color: PALETTE.textMuted, fontSize: 12 },

  sectionLabel: { color: PALETTE.textMuted, fontSize: 9, letterSpacing: 3, fontWeight: 'bold', marginBottom: 4 },

  statsBox:  { gap: 8 },
  statsRow:  { flexDirection: 'row', justifyContent: 'space-around' },
  statItem:  { alignItems: 'center', gap: 2 },
  statIcon:  { fontSize: 14 },
  statValue: { fontSize: 16, fontWeight: 'bold' },
  statLabel: { color: PALETTE.textMuted, fontSize: 9 },

  upgradesBox: { gap: 6 },
  upgradeRow: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               10,
    borderWidth:       1,
    borderColor:       PALETTE.border,
    borderRadius:      8,
    paddingHorizontal: 10,
    paddingVertical:   7,
    backgroundColor:   PALETTE.bgDark,
  },
  colorDot:     { width: 8, height: 8, borderRadius: 4 },
  upgradeTexts: { flex: 1, gap: 1 },
  upgradeName:  { fontSize: 13, fontWeight: 'bold' },
  upgradeDesc:  { color: PALETTE.textMuted, fontSize: 10, lineHeight: 14 },
  synergyTag:   { fontSize: 9, fontWeight: 'bold', letterSpacing: 1 },

  buttons:   { gap: 8 },
  btnResume: {
    backgroundColor: '#001A10',
    borderWidth:     2,
    borderColor:     '#00CC66',
    borderRadius:    12,
    paddingVertical: 16,
    alignItems:      'center',
  },
  btnResumeTxt: { color: '#00FF88', fontSize: 16, fontWeight: 'bold', letterSpacing: 3 },

  btnAbandon: {
    borderWidth:     1,
    borderColor:     PALETTE.border,
    borderRadius:    10,
    paddingVertical: 12,
    alignItems:      'center',
    gap:             2,
  },
  btnAbandonConfirm: {
    borderColor:     PALETTE.upgradeRed + '88',
    backgroundColor: PALETTE.upgradeRed + '08',
  },
  btnAbandonTxt: { color: PALETTE.textMuted, fontSize: 13, fontWeight: 'bold' },
  btnAbandonSub: { color: PALETTE.textDim, fontSize: 10 },

  btnCancel: {
    borderWidth:     1,
    borderColor:     PALETTE.borderLight,
    borderRadius:    8,
    paddingVertical: 10,
    alignItems:      'center',
  },
  btnCancelTxt: { color: PALETTE.textMuted, fontSize: 13 },
});
