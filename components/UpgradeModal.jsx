/**
 * RIFT — UpgradeModal
 * Choix d'upgrade après combat : cartes compactes, maintien pour détail
 */

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polygon, Circle, Rect, G } from 'react-native-svg';
import useGameStore from '../store/gameStore';
import { PALETTE, UPGRADE_COLORS } from '../constants';

const RARITY_COLORS = {
  common: PALETTE.textMuted,
  rare:   '#88CCFF',
  epic:   '#FF88FF',
};
const RARITY_LABELS = { common: 'COMMUN', rare: 'RARE', epic: 'ÉPIQUE' };

export default function UpgradeModal() {
  const upgradeChoices = useGameStore(s => s.upgradeChoices);
  const phase          = useGameStore(s => s.phase);
  const selectUpgrade  = useGameStore(s => s.selectUpgrade);
  const activeUpgrades = useGameStore(s => s.activeUpgrades);
  const run            = useGameStore(s => s.run);

  const [selected, setSelected] = useState(null);

  const visible = phase === 'upgradeChoice';
  if (!visible || upgradeChoices.length === 0) return null;

  const handleSelect = (id) => {
    setSelected(id);
    setTimeout(() => { selectUpgrade(id); setSelected(null); }, 180);
  };

  return (
    <Modal transparent animationType="slide" visible={visible}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.container}>

            {/* ── En-tête ─────────────────────────────────────────────── */}
            <View style={styles.header}>
              <Text style={styles.rewardLabel}>✦  RÉCOMPENSE  ✦</Text>
              <Text style={styles.subtitle}>
                Upgrade #{activeUpgrades.length + 1}  ·  Salle {run.roomsCleared}
              </Text>
            </View>

            {/* ── Barre de synergies ──────────────────────────────────── */}
            <SynergyBar upgrades={activeUpgrades} choices={upgradeChoices} />

            {/* ── Cartes compactes ────────────────────────────────────── */}
            <View style={styles.cards}>
              {upgradeChoices.map(upgrade => {
                const wouldSynergy = wouldActivateSynergy(upgrade, activeUpgrades);
                return (
                  <CompactCard
                    key={upgrade.id}
                    upgrade={upgrade}
                    wouldSynergy={wouldSynergy}
                    isSelected={selected === upgrade.id}
                    onPress={() => handleSelect(upgrade.id)}
                  />
                );
              })}
            </View>

            <Text style={styles.hint}>Appuie pour choisir</Text>

          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ─── Carte compacte ───────────────────────────────────────────────────────────

function CompactCard({ upgrade, wouldSynergy, isSelected, onPress }) {
  const color       = upgradeHex(upgrade.color);
  const rarityColor = RARITY_COLORS[upgrade.rarity] || RARITY_COLORS.common;
  const isEpic      = upgrade.rarity === 'epic';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { borderColor: wouldSynergy ? color : isEpic ? color + 'AA' : PALETTE.border },
        wouldSynergy && { backgroundColor: color + '12' },
        (pressed || isSelected) && { opacity: 0.7, transform: [{ scale: 0.97 }] },
      ]}
    >
      <View style={styles.cardRow}>
        {/* Mini icône SVG */}
        <View style={[styles.iconBox, { borderColor: color + '55' }]}>
          <Svg width={30} height={30} viewBox="0 0 44 44">
            <UpgradeIcon id={upgrade.id} color={color} />
          </Svg>
        </View>

        {/* Nom + description + méta */}
        <View style={styles.cardMeta}>
          <View style={styles.cardTopRow}>
            <Text style={[styles.cardName, { color: wouldSynergy || isEpic ? color : PALETTE.textPrimary }]}>
              {upgrade.name}
            </Text>
            <View style={styles.cardTags}>
              <Text style={[styles.cardRarity, { color: rarityColor }]}>
                {RARITY_LABELS[upgrade.rarity] || 'COMMUN'}
              </Text>
              <View style={[styles.colorDot, { backgroundColor: color }]} />
            </View>
          </View>
          <Text style={[styles.cardDesc, { color: color + 'CC' }]} numberOfLines={2}>
            {upgrade.description}
          </Text>
          {wouldSynergy && (
            <Text style={[styles.cardSynText, { color }]}>
              ✦ Déclenche synergie {colorLabel(upgrade.color)} !
            </Text>
          )}
        </View>

        {/* Badge synergie */}
        {wouldSynergy && (
          <Text style={[styles.synBadge, { color }]}>✦</Text>
        )}
      </View>
    </Pressable>
  );
}

// ─── Barre de synergies ───────────────────────────────────────────────────────

function SynergyBar({ upgrades, choices }) {
  const counts = {
    [UPGRADE_COLORS.RED]:   upgrades.filter(u => u.color === UPGRADE_COLORS.RED).length,
    [UPGRADE_COLORS.BLUE]:  upgrades.filter(u => u.color === UPGRADE_COLORS.BLUE).length,
    [UPGRADE_COLORS.GREEN]: upgrades.filter(u => u.color === UPGRADE_COLORS.GREEN).length,
  };

  return (
    <View style={styles.synergyBar}>
      {Object.entries(counts).map(([color, count]) => {
        const hex    = upgradeHex(color);
        const active = count >= 3;
        const almost = count === 2 && choices.some(c => c.color === color);
        return (
          <View
            key={color}
            style={[
              styles.synItem,
              active && { backgroundColor: hex + '22', borderColor: hex, borderWidth: 1, borderRadius: 8 },
              almost && { backgroundColor: hex + '10', borderColor: hex + '55', borderWidth: 1, borderRadius: 8 },
            ]}
          >
            <View style={styles.synDots}>
              {[0,1,2].map(i => (
                <View key={i} style={[
                  styles.synDot,
                  { backgroundColor: i < count ? hex : 'transparent', borderColor: hex, opacity: i < count ? 1 : 0.3 },
                ]} />
              ))}
            </View>
            <Text style={[styles.synCount, { color: active ? hex : almost ? hex : PALETTE.textMuted }]}>
              {count}/3{active ? ' ✦' : almost ? ' →' : ''}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Icônes géométriques ──────────────────────────────────────────────────────

function UpgradeIcon({ id, color }) {
  const cx = 22, cy = 22, r = 14;
  switch (id) {
    case 'momentum':       return <Polygon points={`${cx},${cy-r} ${cx+r},${cy+r} ${cx-r},${cy+r}`} fill={color} />;
    case 'echo':           return <G><Circle cx={cx} cy={cy} r={9} fill="none" stroke={color} strokeWidth={2}/><Circle cx={cx} cy={cy} r={4} fill={color}/></G>;
    case 'fracture':       return <Polygon points={`${cx},${cy-r} ${cx+r*.5},${cy} ${cx},${cy+r} ${cx-r*.5},${cy}`} fill={color}/>;
    case 'chain_reaction': return <Polygon points={starPts(cx, cy, r, r*.4, 4)} fill={color}/>;
    case 'shield_pulse':   return <Polygon points={hexPts(cx, cy, r)} fill="none" stroke={color} strokeWidth={3}/>;
    case 'resonance':      return <G><Polygon points={starPts(cx,cy,r,r*.4,3)} fill={color} opacity={0.6}/><Circle cx={cx} cy={cy} r={5} fill={color}/></G>;
    case 'blink':          return <G><Circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={1} strokeDasharray="4,4"/><Circle cx={cx} cy={cy} r={4} fill={color}/></G>;
    case 'regen':          return <G><Rect x={cx-2} y={cy-r} width={4} height={r*2} fill={color} rx={2}/><Rect x={cx-r} y={cy-2} width={r*2} height={4} fill={color} rx={2}/></G>;
    case 'leech':          return <Polygon points={`${cx},${cy-r} ${cx+r},${cy} ${cx},${cy+r} ${cx-r},${cy}`} fill={color}/>;
    case 'thorns':         return <Polygon points={starPts(cx, cy, r, r*.3, 6)} fill={color}/>;
    case 'overgrowth':     return <G><Circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={1.5}/><Rect x={cx-2} y={cy-r*.7} width={4} height={r*1.4} fill={color} rx={2}/></G>;
    default:               return <Circle cx={cx} cy={cy} r={r*.7} fill={color}/>;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function wouldActivateSynergy(upgrade, activeUpgrades) {
  return activeUpgrades.filter(u => u.color === upgrade.color).length === 2;
}

function upgradeHex(color) {
  return { red: PALETTE.upgradeRed, blue: PALETTE.upgradeBlue, green: PALETTE.upgradeGreen }[color] || '#888';
}

function colorLabel(color) {
  return { red: 'OFFENSIF', blue: 'UTILITAIRE', green: 'SOUTIEN' }[color] || color;
}

const hexPts = (cx, cy, r) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(' ');

const starPts = (cx, cy, ro, ri, n) =>
  Array.from({ length: n * 2 }, (_, i) => {
    const a = (Math.PI / n) * i - Math.PI / 2;
    const r = i % 2 === 0 ? ro : ri;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(' ');

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'flex-end' },
  safe:    { maxHeight: '62%' },

  container: {
    backgroundColor:      PALETTE.bgCard,
    borderTopLeftRadius:  18,
    borderTopRightRadius: 18,
    borderTopWidth:       1,
    borderLeftWidth:      1,
    borderRightWidth:     1,
    borderColor:          PALETTE.borderLight,
    padding:              18,
    gap:                  12,
  },

  header:      { alignItems: 'center', gap: 3 },
  rewardLabel: { color: PALETTE.charge, fontSize: 14, fontWeight: 'bold', letterSpacing: 4 },
  subtitle:    { color: PALETTE.textMuted, fontSize: 11 },

  // Synergy bar
  synergyBar: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  synItem:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4 },
  synDots:    { flexDirection: 'row', gap: 3 },
  synDot:     { width: 8, height: 8, borderRadius: 4, borderWidth: 1 },
  synCount:   { fontSize: 11, fontWeight: 'bold' },

  // Cards
  cards: { gap: 8 },
  card: {
    backgroundColor: '#0A0A16',
    borderWidth:     1,
    borderRadius:    11,
    overflow:        'hidden',
  },
  cardRow: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingHorizontal: 12,
    paddingVertical:   10,
    gap:            10,
  },
  iconBox: {
    width: 36, height: 36,
    borderWidth:    1,
    borderRadius:   8,
    alignItems:     'center',
    justifyContent: 'center',
  },
  cardMeta:    { flex: 1, gap: 3 },
  cardTopRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardName:    { fontSize: 14, fontWeight: 'bold', flex: 1 },
  cardTags:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardRarity:  { fontSize: 9, fontWeight: 'bold', letterSpacing: 1 },
  colorDot:    { width: 6, height: 6, borderRadius: 3 },
  cardDesc:    { fontSize: 11, lineHeight: 16 },
  cardSynText: { fontSize: 10, fontWeight: 'bold', marginTop: 2 },
  synBadge:    { fontSize: 16, fontWeight: 'bold', paddingLeft: 6 },

  hint: { color: PALETTE.textDim, fontSize: 10, textAlign: 'center', letterSpacing: 1 },
});
