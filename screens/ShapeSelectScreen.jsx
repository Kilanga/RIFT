/**
 * RIFT — ShapeSelectScreen
 * Choix de la forme (classe) avec statistiques par forme
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { G } from 'react-native-svg';
import useGameStore from '../store/gameStore';
import { PLAYER_SHAPES, PALETTE } from '../constants';
import { Assassin, Arcaniste, Colosse, Spectre, Ombre, Paladin } from '../components/ClassSilhouettes';
import { pickModifierChoices, getDailyModifier } from '../utils/modifierCatalog';

const SHAPES = [
  {
    id:    PLAYER_SHAPES.TRIANGLE,
    key:   'triangle',
    name:  'Assassin',
    color: PALETTE.triangle,
    icon:  Assassin,
    stats: { atk: 5, def: 1, vit: 3 },
  },
  {
    id:    PLAYER_SHAPES.CIRCLE,
    key:   'circle',
    name:  'Arcaniste',
    color: PALETTE.circle,
    icon:  Arcaniste,
    stats: { atk: 4, def: 3, vit: 4 },
  },
  {
    id:    PLAYER_SHAPES.HEXAGON,
    key:   'hexagon',
    name:  'Colosse',
    color: PALETTE.hexagon,
    icon:  Colosse,
    stats: { atk: 2, def: 4, vit: 2 },
  },
  {
    id:      PLAYER_SHAPES.SPECTRE,
    key:     'spectre',
    name:    'Spectre',
    color:   '#CC88FF',
    icon:    Spectre,
    stats:   { atk: 6, def: 0, vit: 5 },
    premium: true,
  },
  {
    id:         PLAYER_SHAPES.SHADOW,
    key:        'shadow',
    name:       'Ombre',
    color:      '#FF6600',
    icon:       Ombre,
    stats:      { atk: 5, def: 0, vit: 5 },
    purchasable: true,
  },
  {
    id:         PLAYER_SHAPES.PALADIN,
    key:        'paladin',
    name:       'Paladin',
    color:      '#FFCC00',
    icon:       Paladin,
    stats:      { atk: 2, def: 5, vit: 2 },
    purchasable: true,
  },
];

const { width: SCREEN_W } = Dimensions.get('window');
const IS_TABLET = SCREEN_W >= 768;
const IS_LARGE_TABLET = SCREEN_W >= 1024;

export default function ShapeSelectScreen() {
  const { t } = useTranslation();
  const [selected, setSelected]         = useState(PLAYER_SHAPES.TRIANGLE);
  const [selectedMod, setSelectedMod]   = useState('standard');
  const [modChoices]                    = useState(() => pickModifierChoices());
  const startRun           = useGameStore(s => s.startRun);
  const startDailyRun      = useGameStore(s => s.startDailyRun);
  const goToMenu           = useGameStore(s => s.goToMenu);
  const toggleHardcoreMode = useGameStore(s => s.toggleHardcoreMode);
  const meta               = useGameStore(s => s.meta);
  const isDailySelect      = useGameStore(s => s.isDailySelect);

  const dailyMod = isDailySelect ? getDailyModifier() : null;

  const shape      = SHAPES.find(s => s.id === selected);
  const shapeStats = meta.shapeStats?.[selected] || { runs: 0, bestScore: 0, wins: 0 };

  const handleSelectShape = (shapeId) => {
    const s = SHAPES.find(sh => sh.id === shapeId);
    if (s?.premium && !meta.isPremium) {
      Alert.alert(t('shape_select.premium_alert_title'), t('shape_select.premium_alert_msg'), [{ text: t('shape_select.premium_ok') }]);
      return;
    }
    if (s?.purchasable && !(meta.purchasedClasses || []).includes(shapeId)) {
        Alert.alert(t('shape_select.class_locked_title'), t('shape_select.class_locked_msg'), [{ text: t('shape_select.premium_ok') }]);
      return;
    }
    setSelected(shapeId);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={goToMenu} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.back}>{t('common.back')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{isDailySelect ? t('shape_select.daily_title') : t('shape_select.title')}</Text>
          <View style={{ width: 72 }} />
        </View>

        {/* Sélecteur de formes */}
        <View style={styles.shapePicker}>
          {SHAPES.map(s => {
            const sStats = meta.shapeStats?.[s.id] || { runs: 0, bestScore: 0, wins: 0 };
            const isLocked = (s.premium && !meta.isPremium) || (s.purchasable && !(meta.purchasedClasses || []).includes(s.id));
            return (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.shapeBtn,
                  selected === s.id && { borderColor: s.color, backgroundColor: s.color + '15' },
                  isLocked && { opacity: 0.5 },
                ]}
                onPress={() => handleSelectShape(s.id)}
                activeOpacity={0.8}
              >
                <Svg width={48} height={48} viewBox="0 0 56 56">
                  <G opacity={selected === s.id ? 1 : 0.45}>
                    <s.icon cx={28} cy={28} r={13} color={s.color} />
                  </G>
                </Svg>
                <Text style={[styles.shapeName, { color: selected === s.id ? s.color : PALETTE.textMuted }]}>
                  {t(`class.${s.key}.name`, { defaultValue: s.name })}
                </Text>
                {isLocked && s.premium && (
                  <Text style={[styles.shapeRunCount, { color: '#DD8833' }]}>
                    {t('shape_select.premium_locked')}
                  </Text>
                )}
                {isLocked && s.purchasable && (
                  <Text style={[styles.shapeRunCount, { color: '#FF6600' }]}>
                    {t('shape_select.purchasable_locked')}
                  </Text>
                )}
                {!isLocked && sStats.runs > 0 && (
                  <Text style={[styles.shapeRunCount, { color: selected === s.id ? s.color + 'AA' : PALETTE.textDim }]}>
                    {sStats.runs > 1 ? t('shape_select.runs_count_plural', { count: sStats.runs }) : t('shape_select.runs_count', { count: sStats.runs })}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Détail */}
        {shape && (
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <View style={[styles.detail, { borderColor: shape.color }]}>

              {/* Nom + playstyle */}
              <View style={styles.detailHeader}>
                <Svg width={60} height={60} viewBox="0 0 60 60">
                  <shape.icon cx={30} cy={30} r={16} color={shape.color} />
                </Svg>
                <View style={styles.detailTitles}>
                  <Text style={[styles.detailName, { color: shape.color }]}>{t(`class.${shape.key}.name`, { defaultValue: shape.name }).toUpperCase()}</Text>
                  <Text style={styles.detailPlaystyle}>{t(`class.${shape.key}.playstyle`)}</Text>
                </View>
              </View>

              {/* Passive */}
              <View style={[styles.passiveBox, { borderColor: shape.color + '55' }]}>
                <Text style={[styles.passiveTitle, { color: shape.color }]}>● {t(`class.${shape.key}.passive`)}</Text>
                <Text style={styles.passiveDesc}>{t(`class.${shape.key}.passive_desc`)}</Text>
              </View>

              {/* Stats de combat */}
              <View style={styles.statsRow}>
                <StatBar label="ATQ" value={shape.stats.atk} max={5} color={PALETTE.upgradeRed} />
                <StatBar label="DÉF" value={shape.stats.def} max={5} color={PALETTE.upgradeBlue} />
                <StatBar label="VIT" value={shape.stats.vit} max={5} color={PALETTE.upgradeGreen} />
              </View>

              {/* Stats de run (si déjà joué avec cette forme) */}
              {shapeStats.runs > 0 && (
                <View style={styles.runStatsBox}>
                  <Text style={styles.runStatsTitle}>{t('shape_select.your_stats', { name: t(`class.${shape.key}.name`, { defaultValue: shape.name }).toUpperCase() })}</Text>
                  <View style={styles.runStatsRow}>
                    <RunStat label={t('shape_select.runs')}       value={shapeStats.runs} />
                    <RunStat label={t('shape_select.wins')}       value={shapeStats.wins} color={PALETTE.charge} />
                    <RunStat label={t('shape_select.winrate')}    value={`${Math.round((shapeStats.wins / shapeStats.runs) * 100)}%`} color={shapeStats.wins > 0 ? PALETTE.triangle : PALETTE.textMuted} />
                    <RunStat label={t('shape_select.best_score')} value={shapeStats.bestScore} color={PALETTE.upgradeRed} />
                  </View>
                </View>
              )}
              {shapeStats.runs === 0 && (
                <Text style={styles.neverPlayed}>
                  {t('shape_select.never_played', { name: t(`class.${shape.key}.name`, { defaultValue: shape.name }) })}
                </Text>
              )}


            </View>
          </ScrollView>
        )}

        {/* Modificateur de run */}
        {isDailySelect ? (
          <View style={styles.modSection}>
            <Text style={styles.modTitle}>{t('shape_select.daily_modifier_forced')}</Text>
            <View style={[styles.modBtn, styles.modBtnActive, { flexDirection: 'row', gap: 8 }]}>
              <Text style={styles.modIcon}>{dailyMod?.icon}</Text>
              <Text style={[styles.modNameActive]}>
                {dailyMod ? t(`modifier.${dailyMod.id}.name`, { defaultValue: dailyMod.name }) : ''}  ×{dailyMod?.scoreMult}
              </Text>
            </View>
            <Text style={styles.modDesc}>{dailyMod ? t(`modifier.${dailyMod.id}.desc`, { defaultValue: dailyMod.description }) : ''}</Text>
          </View>
        ) : (
          <View style={styles.modSection}>
            <Text style={styles.modTitle}>{t('shape_select.modifier_label')}</Text>
            <View style={styles.modRow}>
              {modChoices.map(mod => {
                const isActive = selectedMod === mod.id;
                const multTxt  = mod.scoreMult !== 1.0 ? ` ×${mod.scoreMult}` : '';
                return (
                  <TouchableOpacity
                    key={mod.id}
                    style={[styles.modBtn, isActive && styles.modBtnActive]}
                    onPress={() => setSelectedMod(mod.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.modIcon}>{mod.icon}</Text>
                    <Text style={[styles.modName, isActive && styles.modNameActive]}>
                      {t(`modifier.${mod.id}.name`, { defaultValue: mod.name })}{multTxt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {selectedMod !== 'standard' && (() => {
              const activeMod = modChoices.find(m => m.id === selectedMod);
              return activeMod ? (
                <Text style={styles.modDesc}>
                  {t(`modifier.${activeMod.id}.desc`, { defaultValue: activeMod.description })}
                </Text>
              ) : null;
            })()}
          </View>
        )}

        {/* Toggle hardcore (premium uniquement) */}
        {meta.isPremium && !isDailySelect && (
          <TouchableOpacity
            style={[styles.hardcoreBtn, meta.hardcoreMode && styles.hardcoreBtnActive]}
            onPress={toggleHardcoreMode}
            activeOpacity={0.8}
          >
            <Text style={styles.hardcoreIcon}>💀</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.hardcoreName, meta.hardcoreMode && styles.hardcoreNameActive]}>
                {meta.hardcoreMode ? t('shape_select.hardcore_mode_active') : t('shape_select.hardcore_mode')}
              </Text>
              <Text style={styles.hardcoreDesc}>{t('shape_select.hardcore_desc')}</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Bouton lancer */}
        <TouchableOpacity
          style={[styles.btnStart, { borderColor: shape?.color, backgroundColor: (shape?.color || '#fff') + '15' }]}
          onPress={() => isDailySelect ? startDailyRun(selected) : startRun(selected, false, null, selectedMod)}
          activeOpacity={0.8}
        >
          <Text style={[styles.btnStartTxt, { color: shape?.color }]}>
            {isDailySelect ? t('shape_select.start_daily', { name: shape ? t(`class.${shape.key}.name`, { defaultValue: shape.name }).toUpperCase() : '' }) : t('shape_select.start_run', { name: shape ? t(`class.${shape.key}.name`, { defaultValue: shape.name }).toUpperCase() : '' })}
          </Text>
          {shapeStats.runs > 0 && shapeStats.wins === 0 && (
            <Text style={[styles.btnStartSub, { color: shape?.color + '88' }]}>
              {t('shape_select.never_won')}
            </Text>
          )}
          {shapeStats.wins > 0 && (
            <Text style={[styles.btnStartSub, { color: shape?.color + '88' }]}>
              {shapeStats.wins > 1
                ? t('shape_select.wins_best_plural', { wins: shapeStats.wins, best: shapeStats.bestScore })
                : t('shape_select.wins_best', { wins: shapeStats.wins, best: shapeStats.bestScore })}
            </Text>
          )}
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

// ─── Composants ───────────────────────────────────────────────────────────────

function StatBar({ label, value, max, color }) {
  return (
    <View style={styles.statBarContainer}>
      <Text style={styles.statBarLabel}>{label}</Text>
      <View style={styles.statBarBg}>
        <View style={[styles.statBarFill, { width: `${(value / max) * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.statBarVal, { color }]}>{value}</Text>
    </View>
  );
}

function RunStat({ label, value, color }) {
  return (
    <View style={styles.runStatItem}>
      <Text style={[styles.runStatVal, color ? { color } : {}]}>{value}</Text>
      <Text style={styles.runStatLbl}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: PALETTE.bg },
  container: {
    flex:     1,
    padding:  IS_LARGE_TABLET ? 28 : IS_TABLET ? 24 : 20,
    gap:      IS_TABLET ? 16 : 14,
    width:    '100%',
    maxWidth: 920,
    alignSelf:'center',
  },

  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingTop:     6,
    minHeight:      48,
  },
  backBtn: {
    paddingHorizontal: 14,
    paddingVertical:   10,
    borderWidth:       1,
    borderColor:       PALETTE.borderLight,
    borderRadius:      10,
    backgroundColor:   PALETTE.bgCard,
    minWidth:          72,
    alignItems:        'center',
  },
  back:  { color: PALETTE.textPrimary, fontSize: 14, fontWeight: 'bold' },
  title: { color: PALETTE.textPrimary, fontSize: IS_TABLET ? 15 : 13, fontWeight: 'bold', letterSpacing: 3 },

  shapePicker: { flexDirection: 'row', gap: 8 },
  shapeBtn: {
    flex:            1,
    alignItems:      'center',
    paddingVertical: IS_TABLET ? 12 : 10,
    borderWidth:     1,
    borderColor:     PALETTE.border,
    borderRadius:    10,
    backgroundColor: PALETTE.bgCard,
    gap:             4,
  },
  shapeName:     { fontSize: IS_TABLET ? 11 : 10, fontWeight: 'bold', letterSpacing: 1 },
  shapeRunCount: { fontSize: 9 },

  detail: {
    backgroundColor: PALETTE.bgCard,
    borderWidth:     1,
    borderRadius:    14,
    padding:         14,
    gap:             12,
  },
  detailHeader:    { flexDirection: 'row', alignItems: 'center', gap: 14 },
  detailTitles:    { flex: 1, gap: 4 },
  detailName:      { fontSize: IS_TABLET ? 25 : 22, fontWeight: 'bold', letterSpacing: 2 },
  detailPlaystyle: { color: PALETTE.textMuted, fontSize: IS_TABLET ? 12 : 11 },

  passiveBox: {
    borderWidth:     1,
    borderRadius:    8,
    padding:         10,
    gap:             4,
    backgroundColor: '#0A0A18',
  },
  passiveTitle: { fontSize: IS_TABLET ? 14 : 13, fontWeight: 'bold' },
  passiveDesc:  { color: PALETTE.textMuted, fontSize: IS_TABLET ? 13 : 12 },

  statsRow:         { gap: 6 },
  statBarContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statBarLabel:     { color: PALETTE.textMuted, fontSize: 11, width: 28 },
  statBarBg: {
    flex:            1,
    height:          6,
    backgroundColor: PALETTE.bgDark,
    borderRadius:    3,
    overflow:        'hidden',
  },
  statBarFill: { height: 6, borderRadius: 3 },
  statBarVal:  { fontSize: 12, fontWeight: 'bold', width: 16, textAlign: 'right' },

  // Stats de run
  runStatsBox: {
    backgroundColor: PALETTE.bgDark,
    borderRadius:    8,
    padding:         10,
    gap:             8,
    borderWidth:     1,
    borderColor:     PALETTE.border,
  },
  runStatsTitle: { color: PALETTE.textMuted, fontSize: 9, letterSpacing: 2, fontWeight: 'bold' },
  runStatsRow:   { flexDirection: 'row', justifyContent: 'space-between' },
  runStatItem:   { alignItems: 'center', gap: 2 },
  runStatVal:    { color: PALETTE.textPrimary, fontSize: IS_TABLET ? 18 : 16, fontWeight: 'bold' },
  runStatLbl:    { color: PALETTE.textMuted, fontSize: 9, textAlign: 'center' },
  neverPlayed:   { color: PALETTE.textDim, fontSize: 11, fontStyle: 'italic', textAlign: 'center' },


  // Modificateurs
  modSection: { gap: 6 },
  modTitle:   { color: PALETTE.textMuted, fontSize: 9, letterSpacing: 2, fontWeight: 'bold' },
  modRow:     { flexDirection: 'row', gap: 8 },
  modBtn: {
    flex:            1,
    alignItems:      'center',
    paddingVertical: 8,
    borderWidth:     1,
    borderColor:     PALETTE.border,
    borderRadius:    8,
    backgroundColor: PALETTE.bgCard,
    gap:             2,
  },
  modBtnActive:   { borderColor: '#FF88FF', backgroundColor: '#FF88FF15' },
  modIcon:        { fontSize: 16 },
  modName:        { color: PALETTE.textMuted, fontSize: 10, textAlign: 'center' },
  modNameActive:  { color: '#FF88FF', fontWeight: 'bold' },
  modDesc:        { color: PALETTE.textDim, fontSize: 11, fontStyle: 'italic', textAlign: 'center' },

  hardcoreBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             12,
    borderWidth:     1,
    borderColor:     PALETTE.upgradeRed + '66',
    borderRadius:    12,
    padding:         12,
    backgroundColor: PALETTE.bgCard,
  },
  hardcoreBtnActive: {
    borderColor:     PALETTE.upgradeRed,
    backgroundColor: PALETTE.upgradeRed + '18',
  },
  hardcoreIcon:     { fontSize: 22 },
  hardcoreName:     { color: PALETTE.textMuted, fontSize: 13, fontWeight: 'bold' },
  hardcoreNameActive: { color: PALETTE.upgradeRed },
  hardcoreDesc:     { color: PALETTE.textDim, fontSize: 11, marginTop: 2 },

  btnStart: {
    borderWidth:     2,
    borderRadius:    12,
    paddingVertical: 16,
    alignItems:      'center',
    gap:             4,
  },
  btnStartTxt: { fontSize: IS_TABLET ? 18 : 16, fontWeight: 'bold', letterSpacing: 3 },
  btnStartSub: { fontSize: IS_TABLET ? 12 : 11 },
});
