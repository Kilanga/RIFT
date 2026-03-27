/**
 * RIFT — RestRoomOverlay
 * Écran d'interaction avec l'autel de soin
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Circle, Polygon, G, Line } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import useGameStore from '../store/gameStore';
import { PALETTE } from '../constants';

export default function RestRoomOverlay() {
  const { t } = useTranslation();
  const player           = useGameStore(s => s.player);
  const currentRoom      = useGameStore(s => s.currentRoom);
  const interactWithAltar = useGameStore(s => s.interactWithAltar);
  const leaveRoom        = useGameStore(s => s.leaveRoom);

  const healAmount = currentRoom?.healAmount || 8;
  const isFull     = player.hp >= player.maxHp;
  const hpAfter    = Math.min(player.maxHp, player.hp + healAmount);

  return (
    <View style={styles.container}>
      {/* Titre */}
      <Text style={styles.roomType}>{t('rest.room_type')}</Text>

      {/* Autel animé (SVG statique) */}
      <View style={styles.altarBox}>
        <Svg width={120} height={120} viewBox="0 0 120 120">
          <G>
            {/* Halo extérieur */}
            <Circle cx={60} cy={60} r={50} fill="none" stroke="#AA44FF" strokeWidth={1} opacity={0.2} />
            <Circle cx={60} cy={60} r={38} fill="none" stroke="#AA44FF" strokeWidth={1} opacity={0.35} />
            {/* Autel hexagonal */}
            <Polygon points={hexPoints(60, 60, 28)} fill="#1A0D2E" stroke="#BB55FF" strokeWidth={2} />
            {/* Croix de soin */}
            <Line x1={60} y1={44} x2={60} y2={76} stroke="#44FF88" strokeWidth={4} strokeLinecap="round" />
            <Line x1={44} y1={60} x2={76} y2={60} stroke="#44FF88" strokeWidth={4} strokeLinecap="round" />
            {/* Points de lumière */}
            {[0, 60, 120, 180, 240, 300].map(deg => {
              const r   = 44;
              const rad = (deg * Math.PI) / 180;
              return (
                <Circle
                  key={deg}
                  cx={60 + r * Math.cos(rad)}
                  cy={60 + r * Math.sin(rad)}
                  r={3}
                  fill="#BB55FF"
                  opacity={0.6}
                />
              );
            })}
          </G>
        </Svg>
      </View>

      {/* Info PV */}
      <View style={styles.hpInfo}>
        <View style={styles.hpRow}>
          <Text style={styles.hpLabel}>{t('rest.hp_current')}</Text>
          <Text style={styles.hpValue}>{player.hp} / {player.maxHp}</Text>
        </View>
        <View style={styles.hpBar}>
          <View style={[styles.hpFill, { width: `${(player.hp / player.maxHp) * 100}%` }]} />
        </View>

        {!isFull && (
          <View style={styles.hpRow}>
            <Text style={styles.hpLabel}>{t('rest.hp_after')}</Text>
            <Text style={[styles.hpValue, { color: PALETTE.hp }]}>+{Math.min(healAmount, player.maxHp - player.hp)} → {hpAfter}</Text>
          </View>
        )}

        {isFull && (
          <Text style={styles.fullText}>{t('rest.hp_full')}</Text>
        )}
      </View>

      {/* Boutons */}
      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.btnHeal, isFull && styles.btnDisabled]}
          onPress={!isFull ? interactWithAltar : leaveRoom}
          activeOpacity={0.8}
        >
          <Text style={styles.btnHealTxt}>
            {isFull ? t('rest.skip_btn') : t('rest.heal_btn', { amount: Math.min(healAmount, player.maxHp - player.hp) })}
          </Text>
        </TouchableOpacity>

        {!isFull && (
          <TouchableOpacity style={styles.btnSkip} onPress={leaveRoom} activeOpacity={0.8}>
            <Text style={styles.btnSkipTxt}>{t('rest.skip_altar')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function hexPoints(cx, cy, r) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(' ');
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'center',
    paddingHorizontal: 32,
    gap:             24,
  },
  roomType: {
    color:       '#BB55FF',
    fontSize:    12,
    fontWeight:  'bold',
    letterSpacing: 3,
  },
  altarBox: { alignItems: 'center' },

  hpInfo: {
    width:           '100%',
    backgroundColor: PALETTE.bgCard,
    borderRadius:    12,
    borderWidth:     1,
    borderColor:     PALETTE.border,
    padding:         16,
    gap:             8,
  },
  hpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hpLabel: { color: PALETTE.textMuted, fontSize: 12 },
  hpValue: { color: PALETTE.textPrimary, fontSize: 14, fontWeight: 'bold' },
  hpBar: {
    height:          8,
    backgroundColor: '#0D1A10',
    borderRadius:    4,
    overflow:        'hidden',
  },
  hpFill: {
    height:          8,
    backgroundColor: PALETTE.hp,
    borderRadius:    4,
  },
  fullText: {
    color:     PALETTE.textMuted,
    fontSize:  12,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  buttons: { width: '100%', gap: 10 },
  btnHeal: {
    backgroundColor: '#1A3020',
    borderWidth:     1,
    borderColor:     PALETTE.hp,
    borderRadius:    10,
    paddingVertical: 14,
    alignItems:      'center',
  },
  btnDisabled: { borderColor: PALETTE.border, backgroundColor: PALETTE.bgCard },
  btnHealTxt:  { color: PALETTE.hp, fontSize: 15, fontWeight: 'bold' },
  btnSkip: {
    borderWidth:     1,
    borderColor:     PALETTE.border,
    borderRadius:    10,
    paddingVertical: 10,
    alignItems:      'center',
  },
  btnSkipTxt: { color: PALETTE.textMuted, fontSize: 13 },
});
