/**
 * RIFT — ShapeSelectScreen
 * Choix de la forme (classe) avec statistiques par forme
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { G } from 'react-native-svg';
import useGameStore from '../store/gameStore';
import { PLAYER_SHAPES, PALETTE } from '../constants';
import { Assassin, Arcaniste, Colosse, Spectre } from '../components/ClassSilhouettes';
import { pickModifierChoices, getDailyModifier } from '../utils/modifierCatalog';

const SHAPES = [
  {
    id:    PLAYER_SHAPES.TRIANGLE,
    name:  'Assassin',
    color: PALETTE.triangle,
    icon:  Assassin,
    stats: { atk: 5, def: 1, vit: 3 },
    passive:     'Tranchant',
    passiveDesc: 'Ignore 50 % de la DEF ennemie à chaque attaque.',
    playstyle:   'Agressif · Dégâts élevés · Fragile',
  },
  {
    id:    PLAYER_SHAPES.CIRCLE,
    name:  'Arcaniste',
    color: PALETTE.circle,
    icon:  Arcaniste,
    stats: { atk: 3, def: 2, vit: 4 },
    passive:     'Onde arcanique',
    passiveDesc: 'Chaque attaque frappe toutes les cases adjacentes en même temps (jusqu\'à 8 ennemis).',
    playstyle:   'AoE · Contrôle · Polyvalent',
  },
  {
    id:    PLAYER_SHAPES.HEXAGON,
    name:  'Colosse',
    color: PALETTE.hexagon,
    icon:  Colosse,
    stats: { atk: 2, def: 5, vit: 2 },
    passive:     'Riposte',
    passiveDesc: 'Reçoit 50 % des dégâts. Renvoie 50 % de son ATQ à chaque ennemi qui l\'attaque.',
    playstyle:   'Défensif · Survie · Contre-attaque',
  },
  {
    id:    PLAYER_SHAPES.SPECTRE,
    name:  'Spectre',
    color: '#CC88FF',
    icon:  Spectre,
    stats: { atk: 6, def: 0, vit: 5 },
    passive:     'Éthéré',
    passiveDesc: 'Ignore entièrement la défense ennemie. Immune aux pièges (lave, téléporteurs). PV réduits (15 max).',
    playstyle:   'Dégâts purs · Fragile · Premium',
    premium:     true,
    premiumHint: '🔓 Débloque Premium pour accéder à cette classe',
  },
];

export default function ShapeSelectScreen() {
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
      Alert.alert('Classe Premium', 'Débloque Premium pour accéder à Spectre.', [{ text: 'OK' }]);
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
            <Text style={styles.back}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{isDailySelect ? '☀ DAILY RUN' : 'CHOISIR UNE CLASSE'}</Text>
          <View style={{ width: 72 }} />
        </View>

        {/* Sélecteur de formes */}
        <View style={styles.shapePicker}>
          {SHAPES.map(s => {
            const sStats = meta.shapeStats?.[s.id] || { runs: 0, bestScore: 0, wins: 0 };
            const isLocked = s.premium && !meta.isPremium;
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
                  {s.name}
                </Text>
                {isLocked && (
                  <Text style={[styles.shapeRunCount, { color: '#DD8833' }]}>
                    🔒 Premium
                  </Text>
                )}
                {!isLocked && sStats.runs > 0 && (
                  <Text style={[styles.shapeRunCount, { color: selected === s.id ? s.color + 'AA' : PALETTE.textDim }]}>
                    {sStats.runs} run{sStats.runs > 1 ? 's' : ''}
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
                  <Text style={[styles.detailName, { color: shape.color }]}>{shape.name.toUpperCase()}</Text>
                  <Text style={styles.detailPlaystyle}>{shape.playstyle}</Text>
                </View>
              </View>

              {/* Passive */}
              <View style={[styles.passiveBox, { borderColor: shape.color + '55' }]}>
                <Text style={[styles.passiveTitle, { color: shape.color }]}>● {shape.passive}</Text>
                <Text style={styles.passiveDesc}>{shape.passiveDesc}</Text>
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
                  <Text style={styles.runStatsTitle}>TES STATS AVEC {shape.name.toUpperCase()}</Text>
                  <View style={styles.runStatsRow}>
                    <RunStat label="Runs"        value={shapeStats.runs} />
                    <RunStat label="Victoires"   value={shapeStats.wins} color={PALETTE.charge} />
                    <RunStat label="Winrate"     value={`${Math.round((shapeStats.wins / shapeStats.runs) * 100)}%`} color={shapeStats.wins > 0 ? PALETTE.triangle : PALETTE.textMuted} />
                    <RunStat label="Best Score"  value={shapeStats.bestScore} color={PALETTE.upgradeRed} />
                  </View>
                </View>
              )}
              {shapeStats.runs === 0 && (
                <Text style={styles.neverPlayed}>
                  Tu n'as jamais joué avec {shape.name}. Essaie !
                </Text>
              )}


            </View>
          </ScrollView>
        )}

        {/* Modificateur de run */}
        {isDailySelect ? (
          <View style={styles.modSection}>
            <Text style={styles.modTitle}>MODIFICATEUR DU JOUR (FORCÉ)</Text>
            <View style={[styles.modBtn, styles.modBtnActive, { flexDirection: 'row', gap: 8 }]}>
              <Text style={styles.modIcon}>{dailyMod?.icon}</Text>
              <Text style={[styles.modNameActive]}>
                {dailyMod?.name}  ×{dailyMod?.scoreMult}
              </Text>
            </View>
            <Text style={styles.modDesc}>{dailyMod?.description}</Text>
          </View>
        ) : (
          <View style={styles.modSection}>
            <Text style={styles.modTitle}>MODIFICATEUR</Text>
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
                      {mod.name}{multTxt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {selectedMod !== 'standard' && (
              <Text style={styles.modDesc}>
                {modChoices.find(m => m.id === selectedMod)?.description}
              </Text>
            )}
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
                MODE HARDCORE{meta.hardcoreMode ? ' (ACTIF)' : ''}
              </Text>
              <Text style={styles.hardcoreDesc}>La mort efface toute la méta-progression</Text>
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
            {isDailySelect ? '☀' : '▶'}  {isDailySelect ? 'DAILY AVEC' : 'COMMENCER AVEC'} {shape?.name.toUpperCase()}
          </Text>
          {shapeStats.runs > 0 && shapeStats.wins === 0 && (
            <Text style={[styles.btnStartSub, { color: shape?.color + '88' }]}>
              Encore jamais gagné avec cette forme — c'est le moment !
            </Text>
          )}
          {shapeStats.wins > 0 && (
            <Text style={[styles.btnStartSub, { color: shape?.color + '88' }]}>
              {shapeStats.wins} victoire{shapeStats.wins > 1 ? 's' : ''} · Meilleur : {shapeStats.bestScore} pts
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
  container: { flex: 1, padding: 20, gap: 14 },

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
  title: { color: PALETTE.textPrimary, fontSize: 13, fontWeight: 'bold', letterSpacing: 3 },

  shapePicker: { flexDirection: 'row', gap: 8 },
  shapeBtn: {
    flex:            1,
    alignItems:      'center',
    paddingVertical: 10,
    borderWidth:     1,
    borderColor:     PALETTE.border,
    borderRadius:    10,
    backgroundColor: PALETTE.bgCard,
    gap:             4,
  },
  shapeName:     { fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
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
  detailName:      { fontSize: 22, fontWeight: 'bold', letterSpacing: 2 },
  detailPlaystyle: { color: PALETTE.textMuted, fontSize: 11 },

  passiveBox: {
    borderWidth:     1,
    borderRadius:    8,
    padding:         10,
    gap:             4,
    backgroundColor: '#0A0A18',
  },
  passiveTitle: { fontSize: 13, fontWeight: 'bold' },
  passiveDesc:  { color: PALETTE.textMuted, fontSize: 12 },

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
  runStatVal:    { color: PALETTE.textPrimary, fontSize: 16, fontWeight: 'bold' },
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
  btnStartTxt: { fontSize: 16, fontWeight: 'bold', letterSpacing: 3 },
  btnStartSub: { fontSize: 11 },
});
