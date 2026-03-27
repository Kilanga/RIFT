/**
 * RIFT — VictoryScreen
 * Victoire : grade S/A/B/C/D, build final, célébration
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polygon, Circle, G } from 'react-native-svg';
import useGameStore from '../store/gameStore';
import { PALETTE } from '../constants';

const ORBIT_INTERVAL = 80;

// ─── Calcul du grade ──────────────────────────────────────────────────────────

function getGrade(score, hp, maxHp, upgradeCount) {
  const hpRatio = maxHp > 0 ? hp / maxHp : 0;
  if (score >= 500 && hpRatio >= 0.6 && upgradeCount >= 5)
    return { letter: 'S', color: '#FFD700', label: 'LÉGENDAIRE', desc: 'Maîtrise absolue du Rift.' };
  if (score >= 360 && hpRatio >= 0.3)
    return { letter: 'A', color: '#00FF88', label: 'MAÎTRISÉ',   desc: 'Le Rift n\'a aucun secret pour toi.' };
  if (score >= 220)
    return { letter: 'B', color: '#4488FF', label: 'SOLIDE',     desc: 'Une run propre et efficace.' };
  if (score >= 120)
    return { letter: 'C', color: '#AA44FF', label: 'SURVIVANT',  desc: 'Tu t\'en es sorti de justesse.' };
  return   { letter: 'D', color: '#666688', label: 'CHANCEUX',   desc: 'Le Rift a fermé malgré toi.' };
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function VictoryScreen() {
  const run            = useGameStore(s => s.run);
  const meta           = useGameStore(s => s.meta);
  const player         = useGameStore(s => s.player);
  const activeUpgrades = useGameStore(s => s.activeUpgrades);
  const goToMenu       = useGameStore(s => s.goToMenu);
  const goToShapeSelect = useGameStore(s => s.goToShapeSelect);

  const [angle, setAngle] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setAngle(a => (a + 1.0) % 360), ORBIT_INTERVAL);
    return () => clearInterval(id);
  }, []);

  const isNewBest = run.score >= meta.bestScore;
  const grade     = getGrade(run.score, player.hp, player.maxHp, activeUpgrades.length);
  const killsThisRun = run.killsThisRun || 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} bounces={false}>

        {/* ── Icône victoire animée ──────────────────────────────────────── */}
        <VictoryIcon angle={angle} gradeColor={grade.color} />

        {/* ── Grade ──────────────────────────────────────────────────────── */}
        <GradeDisplay grade={grade} />

        {/* ── Titre ──────────────────────────────────────────────────────── */}
        <View style={styles.titleBox}>
          <Text style={styles.titlePre}>LE RIFT EST</Text>
          <Text style={styles.title}>FERMÉ</Text>
          {isNewBest && <Text style={styles.newBest}>✦ NOUVEAU RECORD ✦</Text>}
        </View>

        {/* ── Score ──────────────────────────────────────────────────────── */}
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>SCORE FINAL</Text>
          <Text style={[styles.scoreValue, { color: grade.color }]}>
            {run.score.toLocaleString()}
          </Text>
        </View>

        {/* ── Stats ──────────────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <VictoryStat label="Salles"      value={run.roomsCleared} color={PALETTE.textPrimary} />
          <VictoryStat label="Kills"       value={killsThisRun}     color={PALETTE.upgradeRed} />
          <VictoryStat label="Upgrades"    value={activeUpgrades.length} color={PALETTE.charge} />
          <VictoryStat label="PV restants" value={player.hp}        color={PALETTE.hp} />
        </View>

        {/* ── Upgrades permanents débloqués (récompense victoire) ─────────── */}
        {meta.lastRunSummary?.newUnlocks?.length > 0 && (
          <View style={styles.unlocksBox}>
            <Text style={styles.unlocksTitle}>✦ RÉCOMPENSES DE VICTOIRE ✦</Text>
            <Text style={styles.unlocksHint}>+{meta.lastRunSummary.newUnlocks.length} upgrades permanents débloqués</Text>
            {meta.lastRunSummary.newUnlocks.map(u => (
              <View key={u.id} style={styles.unlockRow}>
                <Text style={styles.unlockIcon}>{u.icon}</Text>
                <View>
                  <Text style={styles.unlockName}>{u.name}</Text>
                  <Text style={styles.unlockDesc}>{u.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Build final ────────────────────────────────────────────────── */}
        <BuildSummary upgrades={activeUpgrades} />

        {/* ── Boutons ────────────────────────────────────────────────────── */}
        <View style={styles.buttons}>
          <TouchableOpacity style={styles.btnRetry} onPress={goToShapeSelect} activeOpacity={0.8}>
            <Text style={styles.btnRetryTxt}>▶  NOUVELLE RUN</Text>
            {grade.letter !== 'S' && (
              <Text style={styles.btnRetrySub}>Peux-tu atteindre le grade S ?</Text>
            )}
            {grade.letter === 'S' && (
              <Text style={styles.btnRetrySub}>Bats ton record de {run.score.toLocaleString()} pts</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnMenu} onPress={goToMenu} activeOpacity={0.8}>
            <Text style={styles.btnMenuTxt}>Menu principal</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Run #{meta.totalRuns} · {meta.totalKills} kills au total</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Composants ───────────────────────────────────────────────────────────────

function VictoryIcon({ angle, gradeColor }) {
  const R  = Math.PI / 180;
  const cx = 65, cy = 65;

  const particles = [
    { r: 52, speed: 1.0 },
    { r: 42, speed: -1.4 },
    { r: 60, speed: 0.65 },
    { r: 35, speed: 2.0 },
  ].map((p, i) => {
    const a = angle * p.speed * R + (i * Math.PI / 2);
    return { x: cx + p.r * Math.cos(a), y: cy + p.r * Math.sin(a) };
  });

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={130} height={130} viewBox="0 0 130 130">
        {/* Halos */}
        <Circle cx={cx} cy={cy} r={58} fill="none" stroke={gradeColor} strokeWidth={0.8} opacity={0.15} />
        <Circle cx={cx} cy={cy} r={46} fill="none" stroke={gradeColor} strokeWidth={0.8} opacity={0.2} />
        <Circle cx={cx} cy={cy} r={34} fill="none" stroke={PALETTE.triangle} strokeWidth={1} opacity={0.25} />

        {/* Triangle + cercle + hexagone */}
        <Polygon points={`${cx},${cx - 46} ${cx - 40},${cx + 23} ${cx + 40},${cx + 23}`}
          fill="none" stroke={PALETTE.triangle} strokeWidth={1.5} opacity={0.45} />
        <Circle cx={cx} cy={cy} r={17} fill="none" stroke={PALETTE.circle} strokeWidth={1.5} opacity={0.45} />
        <Polygon points={hexPts(cx, cy, 10)} fill={PALETTE.hexagon} opacity={0.5} />

        {/* Étoile centrale */}
        <Polygon points={starPts(cx, cy, 22, 10, 6)} fill={gradeColor} opacity={0.2} />
        <Polygon points={starPts(cx, cy, 16, 7, 6)} fill={gradeColor} opacity={0.5} />
        <Polygon points={starPts(cx, cy, 10, 4.5, 6)} fill={gradeColor} />

        {/* Particules orbitales */}
        {particles.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={2.5} fill={gradeColor} opacity={0.7} />
        ))}
      </Svg>
    </View>
  );
}

function GradeDisplay({ grade }) {
  return (
    <View style={[styles.gradeBox, { borderColor: grade.color }]}>
      <View style={[styles.gradeBg, { backgroundColor: grade.color + '18' }]}>
        <Text style={[styles.gradeLetter, { color: grade.color }]}>{grade.letter}</Text>
      </View>
      <View style={styles.gradeTexts}>
        <Text style={[styles.gradeLabel, { color: grade.color }]}>{grade.label}</Text>
        <Text style={styles.gradeDesc}>{grade.desc}</Text>
      </View>
    </View>
  );
}

function VictoryStat({ label, value, color }) {
  return (
    <View style={styles.vStat}>
      <Text style={[styles.vStatVal, { color }]}>{value}</Text>
      <Text style={styles.vStatLabel}>{label}</Text>
    </View>
  );
}

function BuildSummary({ upgrades }) {
  const [selected, setSelected] = useState(null);
  if (upgrades.length === 0) return null;

  return (
    <View style={styles.buildBox}>
      <Text style={styles.buildTitle}>BUILD FINAL</Text>

      {/* Synergies */}
      <View style={styles.synergiesRow}>
        {['red', 'blue', 'green', 'curse'].map(color => {
          const count  = upgrades.filter(u => u.color === color).length;
          if (color === 'curse' && count === 0) return null;
          const active = count >= 3;
          const hex    = upgradeHex(color);
          return (
            <View key={color} style={[styles.synergyBadge, {
              borderColor:     active ? hex : PALETTE.border,
              backgroundColor: active ? hex + '18' : PALETTE.bgDark,
            }]}>
              <View style={[styles.synDot, { backgroundColor: hex, opacity: active ? 1 : 0.3 }]} />
              <Text style={[styles.synCount, { color: active ? hex : PALETTE.textMuted }]}>
                {count}/3
              </Text>
              {active && <Text style={[styles.synActive, { color: hex }]}>{color === 'curse' ? '☠' : '✦'}</Text>}
            </View>
          );
        })}
      </View>
      {upgrades.filter(u => u.color === 'curse').length >= 3 && (
        <View style={styles.curseBanner}>
          <Text style={styles.curseBannerTxt}>☠ PACTE MAUDIT — ×2 À TOUS LES EFFETS</Text>
        </View>
      )}

      {/* Liste upgrades */}
      <View style={styles.upgradesList}>
        {upgrades.map((u, i) => {
          const hex        = upgradeHex(u.color);
          const isSelected = selected?.id === u.id && selected?._idx === i;
          return (
            <TouchableOpacity
              key={`${u.id}_${i}`}
              activeOpacity={0.7}
              onPress={() => setSelected(isSelected ? null : { ...u, _idx: i })}
              style={[styles.upgradeChip, {
                borderColor:     hex + (isSelected ? 'FF' : '88'),
                backgroundColor: isSelected ? hex + '22' : 'transparent',
              }]}
            >
              <Text style={[styles.chipTxt, { color: hex }]}>{u.name}</Text>
              {u.synergyActive && <Text style={[styles.chipSyn, { color: hex }]}>✦</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      {selected && (
        <View style={[styles.chipDesc, { borderColor: upgradeHex(selected.color) + '66' }]}>
          <Text style={[styles.chipDescName, { color: upgradeHex(selected.color) }]}>{selected.name}</Text>
          <Text style={styles.chipDescTxt}>{selected.desc || selected.description || '—'}</Text>
        </View>
      )}
    </View>
  );
}

function upgradeHex(color) {
  return { red: PALETTE.upgradeRed, blue: PALETTE.upgradeBlue, green: PALETTE.upgradeGreen, curse: '#AA44CC' }[color] || '#888';
}

// ─── Helpers géométriques ─────────────────────────────────────────────────────

const starPts = (cx, cy, ro, ri, n) =>
  Array.from({ length: n * 2 }, (_, i) => {
    const a = (Math.PI / n) * i - Math.PI / 2;
    const r = i % 2 === 0 ? ro : ri;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(' ');

function hexPts(cx, cy, r) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(' ');
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

  // Unlocks victoire
  unlocksBox: {
    width:           '100%',
    backgroundColor: '#0A1A10',
    borderWidth:     2,
    borderColor:     PALETTE.charge + '88',
    borderRadius:    14,
    padding:         16,
    gap:             10,
    alignItems:      'center',
  },
  unlocksTitle: { color: PALETTE.charge, fontSize: 13, fontWeight: 'bold', letterSpacing: 3 },
  unlocksHint:  { color: PALETTE.charge + '99', fontSize: 10 },
  unlockRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           12,
    width:         '100%',
    backgroundColor: '#0F200F',
    borderRadius:  8,
    padding:       10,
  },
  unlockIcon: { fontSize: 20 },
  unlockName: { color: PALETTE.charge, fontSize: 13, fontWeight: 'bold' },
  unlockDesc: { color: PALETTE.textMuted, fontSize: 11 },

  // Grade
  gradeBox: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             16,
    borderWidth:     2,
    borderRadius:    16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width:           '100%',
  },
  gradeBg: {
    width:        64,
    height:       64,
    borderRadius: 32,
    alignItems:   'center',
    justifyContent: 'center',
  },
  gradeLetter: { fontSize: 38, fontWeight: 'bold' },
  gradeTexts:  { flex: 1, gap: 3 },
  gradeLabel:  { fontSize: 20, fontWeight: 'bold', letterSpacing: 3 },
  gradeDesc:   { color: PALETTE.textMuted, fontSize: 12 },

  // Titre
  titleBox: { alignItems: 'center', gap: 4 },
  titlePre: { color: PALETTE.textMuted, fontSize: 13, letterSpacing: 6 },
  title:    { color: PALETTE.charge, fontSize: 46, fontWeight: 'bold', letterSpacing: 12 },
  newBest:  { color: PALETTE.triangle, fontSize: 12, letterSpacing: 3, fontWeight: 'bold' },

  // Score
  scoreBox:   { alignItems: 'center', gap: 2 },
  scoreLabel: { color: PALETTE.textMuted, fontSize: 10, letterSpacing: 3 },
  scoreValue: { fontSize: 54, fontWeight: 'bold' },

  // Stats
  statsRow: { flexDirection: 'row', width: '100%', gap: 8 },
  vStat: {
    flex:            1,
    backgroundColor: PALETTE.bgCard,
    borderWidth:     1,
    borderColor:     PALETTE.border,
    borderRadius:    10,
    padding:         10,
    alignItems:      'center',
    gap:             3,
  },
  vStatVal:   { fontSize: 20, fontWeight: 'bold' },
  vStatLabel: { color: PALETTE.textMuted, fontSize: 9, textAlign: 'center' },

  // Build
  buildBox: {
    width:           '100%',
    backgroundColor: PALETTE.bgCard,
    borderWidth:     1,
    borderColor:     PALETTE.border,
    borderRadius:    12,
    padding:         14,
    gap:             12,
  },
  buildTitle: { color: PALETTE.textMuted, fontSize: 10, letterSpacing: 3, fontWeight: 'bold' },

  synergiesRow: { flexDirection: 'row', gap: 8 },
  synergyBadge: {
    flex:              1,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    gap:               5,
    borderWidth:       1,
    borderRadius:      8,
    paddingVertical:   7,
    paddingHorizontal: 8,
  },
  synDot:    { width: 7, height: 7, borderRadius: 4 },
  synCount:  { fontSize: 12, fontWeight: 'bold' },
  synActive: { fontSize: 10 },

  upgradesList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  upgradeChip: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    borderWidth:       1,
    borderRadius:      6,
    paddingHorizontal: 8,
    paddingVertical:   4,
  },
  chipTxt: { fontSize: 11 },
  chipSyn: { fontSize: 9 },
  curseBanner: {
    backgroundColor: '#2A0044',
    borderWidth:     1,
    borderColor:     '#AA44CC',
    borderRadius:    8,
    paddingVertical: 7,
    alignItems:      'center',
  },
  curseBannerTxt: {
    color:         '#CC66FF',
    fontSize:      11,
    fontWeight:    'bold',
    letterSpacing: 2,
  },
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

  footer: { color: PALETTE.textDim, fontSize: 11 },
});
