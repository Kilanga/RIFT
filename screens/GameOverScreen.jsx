/**
 * RIFT — GameOverScreen
 * Fin de run : score, progression, nouvel unlock, hook émotionnel fort
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polygon, Circle, G, Line } from 'react-native-svg';
import useGameStore from '../store/gameStore';
import { PALETTE, PERMANENT_UPGRADES_CATALOG } from '../constants';

const TOTAL_UNLOCKS = PERMANENT_UPGRADES_CATALOG.length;

export default function GameOverScreen() {
  const { t } = useTranslation();
  const run            = useGameStore(s => s.run);
  const meta           = useGameStore(s => s.meta);
  const activeUpgrades = useGameStore(s => s.activeUpgrades);
  const goToMenu        = useGameStore(s => s.goToMenu);
  const goToShapeSelect = useGameStore(s => s.goToShapeSelect);
  const goToSettings    = useGameStore(s => s.goToSettings);

  const isNewBest    = run.score > 0 && run.score >= meta.bestScore;
  const newUnlock    = meta.lastRunSummary?.newUnlock || null;
  const layerReached = run.currentLayerIndex;
  const totalLayers  = run.mapSeed ? layerReached + 1 : 6; // fallback 6 si ancien run
  const pct          = Math.min(layerReached / Math.max(totalLayers, 1), 1);
  const hasMoreUnlocks = meta.permanentUpgrades.length < TOTAL_UNLOCKS;
  const killsThisRun = run.killsThisRun || 0;

  return (
    <SafeAreaView style={styles.safe}>
      <TouchableOpacity style={styles.btnGear} onPress={() => goToSettings('gameOver')} activeOpacity={0.7}>
        <Text style={styles.btnGearTxt}>⚙</Text>
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.container} bounces={false}>

        {/* ── Icône mort ─────────────────────────────────────────────────── */}
        <DeathIcon />

        {/* ── Titre + record ─────────────────────────────────────────────── */}
        <View style={styles.titleBox}>
          <Text style={styles.title}>{t('game_over.title')}</Text>
          {isNewBest && <Text style={styles.newBest}>{t('game_over.new_record')}</Text>}
        </View>

        {/* ── Score ──────────────────────────────────────────────────────── */}
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>{t('game_over.score_label')}</Text>
          <Text style={[styles.scoreValue, isNewBest && { color: PALETTE.charge }]}>
            {run.score.toLocaleString()}
          </Text>
          {meta.bestScore > 0 && !isNewBest && (
            <Text style={styles.prevBest}>{t('game_over.prev_best', { score: meta.bestScore.toLocaleString() })}</Text>
          )}
        </View>

        {/* ── Stats du run ───────────────────────────────────────────────── */}
        <View style={styles.statsGrid}>
          <RunStat icon="⚔" label={t('game_over.stat_rooms')}    value={run.roomsCleared} />
          <RunStat icon="☠" label={t('game_over.stat_kills')}    value={killsThisRun} color={PALETTE.upgradeRed} />
          <RunStat icon="✨" label={t('game_over.stat_upgrades')} value={activeUpgrades.length} color={PALETTE.charge} />
          <RunStat icon="◈" label={t('game_over.stat_floor')}    value={run.currentLayerIndex} />
        </View>

        {/* ── Progression dans le donjon ─────────────────────────────────── */}
        <LayerProgress layerReached={layerReached} total={totalLayers} pct={pct} />

        {/* ── Nouvel unlock permanent ────────────────────────────────────── */}
        {newUnlock && <UnlockCard unlock={newUnlock} />}

        {/* ── Nouveaux succès débloqués ──────────────────────────────────── */}
        {meta.lastRunSummary?.newAchievements?.length > 0 && (
          <NewAchievements achievements={meta.lastRunSummary.newAchievements} />
        )}

        {/* ── Hook : prochain unlock dispo ───────────────────────────────── */}
        {!newUnlock && hasMoreUnlocks && <NextUnlockHint count={meta.permanentUpgrades.length} />}

        {/* ── Upgrades acquis ce run ─────────────────────────────────────── */}
        {activeUpgrades.length > 0 && (
          <BuildSummary upgrades={activeUpgrades} />
        )}

        {/* ── Boutons ────────────────────────────────────────────────────── */}
        <View style={styles.buttons}>
          <TouchableOpacity style={styles.btnRetry} onPress={goToShapeSelect} activeOpacity={0.8}>
            <Text style={styles.btnRetryTxt}>{t('game_over.retry')}</Text>
            <Text style={styles.btnRetrySub}>
              {newUnlock ? t('game_over.retry_sub_unlock', { name: t(`perm_upgrade.${newUnlock.id}.name`, { defaultValue: newUnlock.name }) }) : t('game_over.retry_sub_default')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnMenu} onPress={goToMenu} activeOpacity={0.8}>
            <Text style={styles.btnMenuTxt}>{t('common.menu')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.runCount}>{t('game_over.run_count', { run: meta.totalRuns, kills: meta.totalKills })}</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Composants ───────────────────────────────────────────────────────────────

function DeathIcon() {
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={90} height={90} viewBox="0 0 100 100">
        <Circle cx={50} cy={50} r={40} fill="none" stroke={PALETTE.upgradeRed} strokeWidth={1.5}
          strokeDasharray="6,4" opacity={0.45} />
        <Line x1={28} y1={28} x2={72} y2={72} stroke={PALETTE.upgradeRed} strokeWidth={2.5} strokeLinecap="round" />
        <Line x1={72} y1={28} x2={28} y2={72} stroke={PALETTE.upgradeRed} strokeWidth={2.5} strokeLinecap="round" />
        <Circle cx={50} cy={50} r={7} fill={PALETTE.upgradeRed} opacity={0.5} />
      </Svg>
    </View>
  );
}

function RunStat({ icon, label, value, color }) {
  return (
    <View style={styles.runStat}>
      <Text style={styles.runStatIcon}>{icon}</Text>
      <Text style={[styles.runStatValue, color ? { color } : {}]}>{value}</Text>
      <Text style={styles.runStatLabel}>{label}</Text>
    </View>
  );
}

function LayerProgress({ layerReached, total, pct }) {
  const { t } = useTranslation();
  const getMsg = () => {
    if (layerReached === 0) return t('game_over.layer_msg_zero');
    if (pct < 0.34) return t('game_over.layer_msg_early', { reached: layerReached, total });
    if (pct < 0.67) return t('game_over.layer_msg_mid', { reached: layerReached, total });
    if (pct < 1.0)  return t('game_over.layer_msg_late', { reached: layerReached, total });
    return t('game_over.layer_msg_end', { reached: layerReached, total });
  };

  const barColor = pct < 0.34 ? PALETTE.upgradeRed
    : pct < 0.67 ? PALETTE.upgradeBlue
    : PALETTE.triangle;

  return (
    <View style={styles.layerBox}>
      <View style={styles.layerHeader}>
        <Text style={styles.sectionTitle}>{t('game_over.progression')}</Text>
        <Text style={[styles.layerFraction, { color: barColor }]}>
          {t('game_over.layers_count', { reached: layerReached, total })}
        </Text>
      </View>

      <View style={styles.layerBarBg}>
        <View style={[styles.layerBarFill, { width: `${pct * 100}%`, backgroundColor: barColor }]} />
      </View>

      {/* Marqueurs de couches */}
      <View style={styles.layerMarkers}>
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={[
              styles.layerDot,
              { backgroundColor: i < layerReached ? barColor : PALETTE.bgDark,
                borderColor:     i < layerReached ? barColor : PALETTE.border },
            ]}
          />
        ))}
      </View>

      <Text style={styles.layerMsg}>{getMsg()}</Text>
    </View>
  );
}

function UnlockCard({ unlock }) {
  const { t } = useTranslation();
  return (
    <View style={styles.unlockBox}>
      <Text style={styles.unlockLabel}>{t('game_over.unlocked_label')}</Text>
      <View style={styles.unlockCard}>
        <Text style={styles.unlockIcon}>{unlock.icon || '✦'}</Text>
        <View style={styles.unlockTexts}>
          <Text style={styles.unlockName}>{t(`perm_upgrade.${unlock.id}.name`, { defaultValue: unlock.name })}</Text>
          <Text style={styles.unlockDesc}>{t('game_over.unlock_passive')}</Text>
        </View>
      </View>
    </View>
  );
}

function NextUnlockHint({ count }) {
  const { t } = useTranslation();
  const remaining = PERMANENT_UPGRADES_CATALOG.length - count;
  return (
    <View style={styles.nextUnlockBox}>
      <Text style={styles.nextUnlockTitle}>{t('game_over.next_unlock_title')}</Text>
      <View style={styles.nextUnlockCard}>
        <Text style={styles.nextUnlockQuestion}>?</Text>
        <View style={styles.nextUnlockTexts}>
          <Text style={styles.nextUnlockName}>{t('game_over.next_unlock_name')}</Text>
          <Text style={styles.nextUnlockDesc}>
            {remaining > 1 ? t('game_over.next_unlock_desc_plural', { count: remaining }) : t('game_over.next_unlock_desc', { count: remaining })}
          </Text>
        </View>
      </View>
      <Text style={styles.nextUnlockHint}>{t('game_over.next_unlock_hint')}</Text>
    </View>
  );
}

function NewAchievements({ achievements }) {
  const { t } = useTranslation();
  return (
    <View style={styles.newAchBox}>
      <Text style={styles.newAchLabel}>
        {achievements.length > 1 ? t('game_over.achievements_label_plural') : t('game_over.achievements_label')}
      </Text>
      {achievements.map(a => (
        <View key={a.id} style={styles.newAchCard}>
          <Text style={styles.newAchIcon}>{a.icon}</Text>
          <View style={styles.newAchTexts}>
            <Text style={styles.newAchName}>{t(`achievement.${a.id}_name`, { defaultValue: a.name })}</Text>
            <Text style={styles.newAchDesc}>{t(`achievement.${a.id}_desc`, { defaultValue: a.desc })}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function BuildSummary({ upgrades }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(null);

  return (
    <View style={styles.runUpgrades}>
      <Text style={styles.sectionTitle}>{t('game_over.build_title')}</Text>
      <View style={styles.upgradesList}>
        {upgrades.map((u, i) => {
          const hex = upgradeHex(u.color);
          const isSelected = selected?.id === u.id && selected?._idx === i;
          return (
            <TouchableOpacity
              key={`${u.id}_${i}`}
              activeOpacity={0.7}
              onPress={() => setSelected(isSelected ? null : { ...u, _idx: i })}
              style={[styles.upgradeChip, { borderColor: hex, backgroundColor: isSelected ? hex + '22' : 'transparent' }]}
            >
              <View style={[styles.chipDot, { backgroundColor: hex }]} />
              <Text style={[styles.chipTxt, { color: hex }]}>{t(`upgrade.${u.id}.name`, { defaultValue: u.name })}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {selected && (
        <View style={[styles.chipDesc, { borderColor: upgradeHex(selected.color) + '66' }]}>
          <Text style={[styles.chipDescName, { color: upgradeHex(selected.color) }]}>{t(`upgrade.${selected.id}.name`, { defaultValue: selected.name })}</Text>
          <Text style={styles.chipDescTxt}>{t(`upgrade.${selected.id}.desc`, { defaultValue: selected.desc || selected.description || '—' })}</Text>
        </View>
      )}
    </View>
  );
}

function upgradeHex(color) {
  return { red: PALETTE.upgradeRed, blue: PALETTE.upgradeBlue, green: PALETTE.upgradeGreen, curse: '#AA44CC' }[color] || '#888';
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: PALETTE.bg },
  container: {
    alignItems:        'center',
    paddingVertical:   28,
    paddingHorizontal: 20,
    gap:               20,
  },

  titleBox: { alignItems: 'center', gap: 6 },
  title:    { color: PALETTE.upgradeRed, fontSize: 30, fontWeight: 'bold', letterSpacing: 6 },
  newBest:  { color: PALETTE.charge, fontSize: 12, letterSpacing: 3, fontWeight: 'bold' },

  scoreBox:   { alignItems: 'center', gap: 2 },
  scoreLabel: { color: PALETTE.textMuted, fontSize: 10, letterSpacing: 3 },
  scoreValue: { color: PALETTE.textPrimary, fontSize: 52, fontWeight: 'bold' },
  prevBest:   { color: PALETTE.textMuted, fontSize: 12 },

  statsGrid: { flexDirection: 'row', width: '100%', gap: 8 },
  runStat: {
    flex:            1,
    backgroundColor: PALETTE.bgCard,
    borderRadius:    10,
    padding:         10,
    alignItems:      'center',
    gap:             2,
    borderWidth:     1,
    borderColor:     PALETTE.border,
  },
  runStatIcon:  { fontSize: 14 },
  runStatValue: { color: PALETTE.textPrimary, fontSize: 18, fontWeight: 'bold' },
  runStatLabel: { color: PALETTE.textMuted, fontSize: 10 },

  // Progression couches
  layerBox: {
    width:           '100%',
    backgroundColor: PALETTE.bgCard,
    borderWidth:     1,
    borderColor:     PALETTE.border,
    borderRadius:    12,
    padding:         14,
    gap:             10,
  },
  layerHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  layerFraction: { fontSize: 13, fontWeight: 'bold' },
  layerBarBg: {
    height:          6,
    backgroundColor: PALETTE.bgDark,
    borderRadius:    3,
    overflow:        'hidden',
  },
  layerBarFill: { height: 6, borderRadius: 3 },
  layerMarkers: { flexDirection: 'row', justifyContent: 'space-between' },
  layerDot: {
    width:        14,
    height:       14,
    borderRadius: 7,
    borderWidth:  1,
  },
  layerMsg: { color: PALETTE.textMuted, fontSize: 12, fontStyle: 'italic' },

  // Unlock
  unlockBox: { width: '100%', gap: 8 },
  unlockLabel: {
    color: PALETTE.charge, fontSize: 10, letterSpacing: 2,
    fontWeight: 'bold', textAlign: 'center',
  },
  unlockCard: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             12,
    backgroundColor: '#1A1400',
    borderWidth:     2,
    borderColor:     PALETTE.charge,
    borderRadius:    12,
    padding:         14,
  },
  unlockIcon:  { fontSize: 28 },
  unlockTexts: { flex: 1, gap: 2 },
  unlockName:  { color: PALETTE.charge, fontSize: 18, fontWeight: 'bold' },
  unlockDesc:  { color: PALETTE.textMuted, fontSize: 11 },

  // Prochain unlock
  nextUnlockBox: {
    width:           '100%',
    backgroundColor: '#0A0A14',
    borderWidth:     1,
    borderColor:     PALETTE.borderLight,
    borderRadius:    12,
    padding:         14,
    gap:             8,
    alignItems:      'center',
  },
  nextUnlockTitle: { color: PALETTE.textMuted, fontSize: 10, letterSpacing: 2, fontWeight: 'bold' },
  nextUnlockCard: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             12,
    width:           '100%',
  },
  nextUnlockQuestion: {
    width:          48, height: 48,
    borderRadius:   24,
    borderWidth:    2,
    borderColor:    PALETTE.borderLight,
    textAlign:      'center',
    lineHeight:     48,
    fontSize:       22,
    fontWeight:     'bold',
    color:          PALETTE.textDim,
  },
  nextUnlockTexts:  { flex: 1, gap: 2 },
  nextUnlockName:   { color: PALETTE.textMuted, fontSize: 15, fontWeight: 'bold' },
  nextUnlockDesc:   { color: PALETTE.textDim, fontSize: 11 },
  nextUnlockHint:   { color: PALETTE.textDim, fontSize: 11, fontStyle: 'italic' },

  // Nouveaux succès
  newAchBox: {
    width:           '100%',
    gap:             8,
  },
  newAchLabel: {
    color:       '#88CCFF',
    fontSize:    10,
    letterSpacing: 2,
    fontWeight:  'bold',
    textAlign:   'center',
  },
  newAchCard: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             12,
    backgroundColor: '#001020',
    borderWidth:     1.5,
    borderColor:     '#88CCFF55',
    borderRadius:    10,
    padding:         12,
  },
  newAchIcon:  { fontSize: 22 },
  newAchTexts: { flex: 1, gap: 2 },
  newAchName:  { color: '#88CCFF', fontSize: 15, fontWeight: 'bold' },
  newAchDesc:  { color: PALETTE.textMuted, fontSize: 11 },

  sectionTitle: { color: PALETTE.textMuted, fontSize: 10, letterSpacing: 3, fontWeight: 'bold' },

  // Build ce run
  runUpgrades: { width: '100%', gap: 8 },
  upgradesList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  upgradeChip: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               5,
    borderWidth:       1,
    borderRadius:      6,
    paddingHorizontal: 8,
    paddingVertical:   4,
  },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipTxt: { fontSize: 11 },
  chipDesc: {
    marginTop:       4,
    backgroundColor: PALETTE.bgDark,
    borderWidth:     1,
    borderRadius:    8,
    padding:         10,
    gap:             4,
  },
  chipDescName: { fontSize: 13, fontWeight: 'bold' },
  chipDescTxt:  { color: PALETTE.textMuted, fontSize: 12 },

  // Boutons
  buttons: { width: '100%', gap: 10 },
  btnRetry: {
    backgroundColor: '#001A10',
    borderWidth:     2,
    borderColor:     PALETTE.triangle,
    borderRadius:    14,
    paddingVertical: 18,
    alignItems:      'center',
    gap:             4,
  },
  btnRetryTxt: { color: PALETTE.triangle, fontSize: 17, fontWeight: 'bold', letterSpacing: 3 },
  btnRetrySub: { color: PALETTE.textDim,  fontSize: 11 },

  btnMenu: {
    borderWidth:     1,
    borderColor:     PALETTE.border,
    borderRadius:    12,
    paddingVertical: 12,
    alignItems:      'center',
  },
  btnMenuTxt: { color: PALETTE.textMuted, fontSize: 14 },

  runCount: { color: PALETTE.textDim, fontSize: 11 },

  btnGear: {
    position:        'absolute',
    top:             12,
    right:           16,
    zIndex:          10,
    padding:         8,
    borderRadius:    20,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  btnGearTxt: { color: PALETTE.textMuted, fontSize: 16 },
});
