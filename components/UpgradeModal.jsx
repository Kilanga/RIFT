/**
 * RIFT — UpgradeModal
 * Choix d'upgrade après combat : cartes compactes, maintien pour détail
 */

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, Pressable, ScrollView, useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polygon, Circle, Rect, G } from 'react-native-svg';
import useGameStore from '../store/gameStore';
import { PALETTE, UPGRADE_COLORS } from '../constants';
import { getBuildRecommendation } from '../systems/upgradeSystem';

const RARITY_COLORS = {
  common: PALETTE.textMuted,
  rare:   '#88CCFF',
  epic:   '#FF88FF',
  curse:  '#CC66FF',
};
// RARITY_LABELS are now produced via t() inside the component

export default function UpgradeModal() {
  const { t } = useTranslation();
  const upgradeChoices = useGameStore(s => s.upgradeChoices);
  const phase          = useGameStore(s => s.phase);
  const selectUpgrade  = useGameStore(s => s.selectUpgrade);
  const activeUpgrades = useGameStore(s => s.activeUpgrades);
  const run            = useGameStore(s => s.run);
  const buildRecommendation = getBuildRecommendation(activeUpgrades);
  const countByColor = {
    red: activeUpgrades.filter(u => u.color === 'red').length,
    blue: activeUpgrades.filter(u => u.color === 'blue').length,
    green: activeUpgrades.filter(u => u.color === 'green').length,
    curse: activeUpgrades.filter(u => u.color === 'curse').length,
  };

  const [selected, setSelected] = useState(null);
  const [showBuildSheet, setShowBuildSheet] = useState(false);
  const [selectedBuild, setSelectedBuild] = useState(null);

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
              <Text style={styles.rewardLabel}>{t('upgrade_modal.reward')}</Text>
              <Text style={styles.subtitle}>
                {t('upgrade_modal.subtitle', { num: activeUpgrades.length + 1, room: run.roomsCleared })}
              </Text>
              {buildRecommendation && (
                <View style={styles.buildHint}>
                  <Text style={[styles.buildHintTxt, { color: upgradeHex(buildRecommendation.color) }]}>
                    {t('upgrade_modal.build_hint', {
                      color: colorLabel(buildRecommendation.color, t),
                    })}
                  </Text>
                </View>
              )}
            </View>

            {/* ── Barre de synergies ──────────────────────────────────── */}
            <SynergyBar upgrades={activeUpgrades} choices={upgradeChoices} />
            <SynergyLegend />
            {activeUpgrades.length > 0 && (
              <TouchableOpacity style={styles.buildBtn} onPress={() => setShowBuildSheet(true)} activeOpacity={0.75}>
                <Text style={styles.buildBtnTxt}>
                  ◎ {t('victory.build_final')} · R {countByColor.red} · B {countByColor.blue} · V {countByColor.green}
                  {countByColor.curse > 0 ? ` · ☠ ${countByColor.curse}` : ''}
                </Text>
              </TouchableOpacity>
            )}

            {/* ── Cartes compactes ────────────────────────────────────── */}
            <View style={styles.cards}>
              {upgradeChoices.map(upgrade => {
                const wouldSynergy = wouldActivateSynergy(upgrade, activeUpgrades);
                const isRecommended = buildRecommendation?.color === upgrade.color && upgrade.color !== UPGRADE_COLORS.CURSE;
                return (
                  <CompactCard
                    key={upgrade.id}
                    upgrade={upgrade}
                    wouldSynergy={wouldSynergy}
                    isRecommended={isRecommended}
                    isSelected={selected === upgrade.id}
                    onPress={() => handleSelect(upgrade.id)}
                  />
                );
              })}
            </View>

            <Text style={styles.hint}>{t('upgrade_modal.hint')}</Text>

            <BuildSnapshotSheet
              visible={showBuildSheet}
              upgrades={activeUpgrades}
              selected={selectedBuild}
              onSelect={setSelectedBuild}
              onClose={() => {
                setShowBuildSheet(false);
                setSelectedBuild(null);
              }}
            />

          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ─── Carte compacte ───────────────────────────────────────────────────────────

function CompactCard({ upgrade, wouldSynergy, isRecommended, isSelected, onPress }) {
  const { t } = useTranslation();
  const color       = upgradeHex(upgrade.color);
  const rarityColor = RARITY_COLORS[upgrade.rarity] || RARITY_COLORS.common;
  const isEpic      = upgrade.rarity === 'epic';
  const rarityLabels = {
    common: t('upgrade_modal.rarity_common'),
    rare:   t('upgrade_modal.rarity_rare'),
    epic:   t('upgrade_modal.rarity_epic'),
    curse:  t('upgrade_modal.rarity_curse'),
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { borderColor: wouldSynergy ? color : isRecommended ? color + '88' : isEpic ? color + 'AA' : PALETTE.border },
        wouldSynergy && { backgroundColor: color + '12' },
        isRecommended && !wouldSynergy && { backgroundColor: color + '08' },
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
              {t(`upgrade.${upgrade.id}.name`, { defaultValue: upgrade.name })}
            </Text>
            <View style={styles.cardTags}>
              {isRecommended && (
                <Text style={[styles.cardRecommend, { color }]}>● {t('upgrade_modal.recommended')}</Text>
              )}
              <Text style={[styles.cardRarity, { color: rarityColor }]}>
                {rarityLabels[upgrade.rarity] || t('upgrade_modal.rarity_common')}
              </Text>
              <View style={[styles.colorDot, { backgroundColor: color }]} />
            </View>
          </View>
          <Text style={[styles.cardDesc, { color: color + 'CC' }]} numberOfLines={2}>
            {t(`upgrade.${upgrade.id}.desc`, { defaultValue: upgrade.description })}
          </Text>
                  {wouldSynergy && (
                    <Text style={[styles.cardSynText, { color }]}>
                      {t('upgrade_modal.synergy_trigger_with_effect', {
                        color: colorLabel(upgrade.color, t),
                        effect: synergyEffectLabel(upgrade.color, t),
                      })}
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
  const { width } = useWindowDimensions();
  const allColors = [UPGRADE_COLORS.RED, UPGRADE_COLORS.BLUE, UPGRADE_COLORS.GREEN, UPGRADE_COLORS.CURSE];
  const curseInChoices = choices.some(c => c.color === UPGRADE_COLORS.CURSE);
  const curseInActive  = upgrades.some(u => u.color === UPGRADE_COLORS.CURSE);
  const counts = Object.fromEntries(
    allColors
      // N'affiche la ligne curse que s'il y en a déjà ou si c'est proposé
      .filter(c => c !== UPGRADE_COLORS.CURSE || curseInActive || curseInChoices)
      .map(c => [c, upgrades.filter(u => u.color === c).length])
  );

  return (
    <View style={styles.synergyBar}>
      {Object.entries(counts).map(([color, count]) => {
        const hex    = upgradeHex(color);
        const target = color === UPGRADE_COLORS.CURSE ? 3 : 7;
        const dense = target > 4 && width < 390;
        const active = count >= target;
        const almost = count === (target - 1) && choices.some(c => c.color === color);
        return (
          <View
            key={color}
            style={[
              styles.synItem,
              active && { backgroundColor: hex + '22', borderColor: hex, borderWidth: 1, borderRadius: 8 },
              almost && { backgroundColor: hex + '10', borderColor: hex + '55', borderWidth: 1, borderRadius: 8 },
            ]}
          >
            <View style={[styles.synDots, dense && styles.synDotsDense]}>
              {Array.from({ length: target }, (_, i) => (
                <View key={i} style={[
                  styles.synDot,
                  dense && styles.synDotDense,
                  { backgroundColor: i < count ? hex : 'transparent', borderColor: hex, opacity: i < count ? 1 : 0.3 },
                ]} />
              ))}
            </View>
            <Text style={[styles.synCount, { color: active ? hex : almost ? hex : PALETTE.textMuted }]}>
              {count}/{target}{active ? (color === UPGRADE_COLORS.CURSE ? ' ☠' : ' ✦') : almost ? ' →' : ''}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function SynergyLegend() {
  const { t } = useTranslation();
  return (
    <Text style={styles.synergyLegend}>
      {t('upgrade_modal.synergy_legend')}
    </Text>
  );
}

function BuildSnapshotSheet({ visible, upgrades, selected, onSelect, onClose }) {
  const { t } = useTranslation();

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <Pressable style={styles.sheetBox} onPress={e => e.stopPropagation()}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{t('victory.build_final')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.sheetClose} activeOpacity={0.7}>
              <Text style={styles.sheetCloseTxt}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sheetSynergiesRow}>
            {['red', 'blue', 'green', 'curse'].map(color => {
              const count = upgrades.filter(u => u.color === color).length;
              if (color === 'curse' && count === 0) return null;
              const active = color === UPGRADE_COLORS.CURSE ? count >= 3 : count >= 7;
              const hex = upgradeHex(color);
              return (
                <View
                  key={color}
                  style={[
                    styles.sheetSynergyBadge,
                    {
                      borderColor: active ? hex : PALETTE.border,
                      backgroundColor: active ? hex + '18' : PALETTE.bgDark,
                    },
                  ]}
                >
                  <View style={[styles.sheetSynDot, { backgroundColor: hex, opacity: active ? 1 : 0.3 }]} />
                  <Text style={[styles.sheetSynCount, { color: active ? hex : PALETTE.textMuted }]}>{count}/{color === UPGRADE_COLORS.CURSE ? 3 : 7}</Text>
                  {active && <Text style={[styles.sheetSynActive, { color: hex }]}>{color === 'curse' ? '☠' : '✦'}</Text>}
                </View>
              );
            })}
          </View>

          {upgrades.filter(u => u.color === 'curse').length >= 3 && (
            <View style={styles.sheetCurseBanner}>
              <Text style={styles.sheetCurseBannerTxt}>{t('game.curse_synergy')}</Text>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetUpgradesList}>
            {upgrades.map((u, i) => {
              const hex = upgradeHex(u.color);
              const isSelected = selected?.id === u.id && selected?._idx === i;
              return (
                <TouchableOpacity
                  key={`${u.id}_${i}`}
                  activeOpacity={0.7}
                  onPress={() => onSelect(isSelected ? null : { ...u, _idx: i })}
                  style={[
                    styles.sheetUpgradeChip,
                    {
                      borderColor: hex + (isSelected ? 'FF' : '88'),
                      backgroundColor: isSelected ? hex + '22' : 'transparent',
                    },
                  ]}
                >
                  <Text style={[styles.sheetChipTxt, { color: hex }]}>{t(`upgrade.${u.id}.name`, { defaultValue: u.name })}</Text>
                  {u.synergyActive && <Text style={[styles.sheetChipSyn, { color: hex }]}>✦</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {selected && (
            <View style={[styles.sheetChipDesc, { borderColor: upgradeHex(selected.color) + '66' }]}>
              <Text style={[styles.sheetChipDescName, { color: upgradeHex(selected.color) }]}>
                {t(`upgrade.${selected.id}.name`, { defaultValue: selected.name })}
              </Text>
              <Text style={styles.sheetChipDescTxt}>
                {t(`upgrade.${selected.id}.desc`, { defaultValue: selected.description || '—' })}
              </Text>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
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
  const count = activeUpgrades.filter(u => u.color === upgrade.color).length;
  const target = upgrade.color === UPGRADE_COLORS.CURSE ? 3 : 7;
  return count === (target - 1);
}

function upgradeHex(color) {
  return { red: PALETTE.upgradeRed, blue: PALETTE.upgradeBlue, green: PALETTE.upgradeGreen, curse: '#AA44CC' }[color] || '#888';
}

function colorLabel(color, t) {
  if (t) {
    return {
      red:   t('upgrade_modal.color_offensive'),
      blue:  t('upgrade_modal.color_utility'),
      green: t('upgrade_modal.color_support'),
      curse: t('upgrade_modal.color_cursed'),
    }[color] || color;
  }
  return { red: 'OFFENSIF', blue: 'UTILITAIRE', green: 'SOUTIEN', curse: 'MAUDIT' }[color] || color;
}

function synergyEffectLabel(color, t) {
  if (t) {
    return {
      red:   t('upgrade_modal.synergy_effect_red'),
      blue:  t('upgrade_modal.synergy_effect_blue'),
      green: t('upgrade_modal.synergy_effect_green'),
      curse: t('upgrade_modal.synergy_effect_curse'),
    }[color] || t('upgrade_modal.synergy_effect_generic');
  }
  return {
    red:   'active les effets de synergie des upgrades rouges ✦',
    blue:  'active les effets de synergie des upgrades bleus ✦',
    green: 'active les effets de synergie des upgrades verts ✦',
    curse: 'x2 tous les effets des upgrades maudits',
  }[color] || 'active les effets de synergie ✦';
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
  buildHint: { alignItems: 'center' },
  buildHintTxt: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  buildBtn: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: PALETTE.borderLight,
    backgroundColor: PALETTE.bgDark,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  buildBtnTxt: { color: PALETTE.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1 },

  // Synergy bar
  synergyBar: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  synItem:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4 },
  synDots:    { flexDirection: 'row', gap: 3 },
  synDot:     { width: 8, height: 8, borderRadius: 4, borderWidth: 1 },
  synDotsDense: { gap: 2 },
  synDotDense:  { width: 6, height: 6, borderRadius: 3 },
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
  cardRecommend: { fontSize: 9, fontWeight: 'bold', letterSpacing: 1 },
  cardRarity:  { fontSize: 9, fontWeight: 'bold', letterSpacing: 1 },
  colorDot:    { width: 6, height: 6, borderRadius: 3 },
  cardDesc:    { fontSize: 11, lineHeight: 16 },
  cardSynText: { fontSize: 10, fontWeight: 'bold', marginTop: 2 },
  synBadge:    { fontSize: 16, fontWeight: 'bold', paddingLeft: 6 },

  synergyLegend: { color: PALETTE.textDim, fontSize: 10, textAlign: 'center', marginTop: 2 },

  hint: { color: PALETTE.textDim, fontSize: 10, textAlign: 'center', letterSpacing: 1 },

  // Build sheet (in-upgrade screen)
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetBox: {
    backgroundColor: PALETTE.bgCard,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderTopWidth: 1,
    borderColor: PALETTE.borderLight,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    maxHeight: '68%',
    gap: 10,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { color: PALETTE.textPrimary, fontSize: 12, fontWeight: 'bold', letterSpacing: 2 },
  sheetClose: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PALETTE.border,
    backgroundColor: PALETTE.bgDark,
  },
  sheetCloseTxt: { color: PALETTE.textMuted, fontWeight: 'bold' },
  sheetSynergiesRow: { flexDirection: 'row', gap: 8 },
  sheetSynergyBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 5,
  },
  sheetSynDot: { width: 7, height: 7, borderRadius: 3.5 },
  sheetSynCount: { fontSize: 11, fontWeight: '700' },
  sheetSynActive: { fontSize: 11, fontWeight: '900' },
  sheetCurseBanner: {
    borderWidth: 1,
    borderColor: '#AA44CC88',
    backgroundColor: '#160B1F',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sheetCurseBannerTxt: { color: '#D08BFF', fontSize: 10, textAlign: 'center' },
  sheetUpgradesList: { gap: 7, paddingBottom: 4 },
  sheetUpgradeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: PALETTE.bgDark,
  },
  sheetChipTxt: { fontSize: 12, fontWeight: '700', flexShrink: 1 },
  sheetChipSyn: { fontSize: 12, fontWeight: '900', marginLeft: 8 },
  sheetChipDesc: {
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#0A0A15',
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 3,
  },
  sheetChipDescName: { fontSize: 12, fontWeight: 'bold' },
  sheetChipDescTxt: { color: PALETTE.textMuted, fontSize: 11, lineHeight: 16 },
});
