/**
 * RIFT — LoreScreen (Codex)
 * Bestiaire + personnages : chaque entrée se déverrouille quand le joueur
 * rencontre le type d'ennemi pour la première fois.
 * L'Origine se déverrouille après 3 victoires acte 3.
 */

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Svg, { Circle, Polygon, Rect, Line } from 'react-native-svg';
import useGameStore from '../store/gameStore';
import { ENEMY_LORE } from '../utils/loreData';
import { PALETTE } from '../constants';

// ─── Catégories pour le filtre (clés i18n) ───────────────────────────────────

const FILTER_KEYS = ['filter_all', 'filter_enemies', 'filter_bosses', 'filter_characters'];
const FILTER_CATS = ['Tous',       'Ennemis',         'Boss',          'Personnages'];

// ─── Icône générée selon le type ─────────────────────────────────────────────

function EnemyIcon({ id, color, size = 48, unlocked = true }) {
  const opacity = unlocked ? 1 : 0.12;
  const c = size / 2;
  const r = size * 0.3;

  // Bosses — étoile à 6 branches
  if (id.startsWith('boss_') || id === 'origine') {
    const pts = Array.from({ length: 12 }, (_, i) => {
      const a = (Math.PI / 6) * i - Math.PI / 2;
      const radius = i % 2 === 0 ? r : r * 0.45;
      return `${c + radius * Math.cos(a)},${c + radius * Math.sin(a)}`;
    }).join(' ');
    return (
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={c * 0.9} fill={color} opacity={0.12 * opacity} />
        <Polygon points={pts} fill={color} opacity={opacity} />
      </Svg>
    );
  }

  // shooter — carré
  if (id === 'shooter') {
    const half = r * 0.75;
    return (
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={c * 0.85} fill={color} opacity={0.1 * opacity} />
        <Rect x={c - half} y={c - half} width={half * 2} height={half * 2}
          fill={color} opacity={opacity} rx={2} />
      </Svg>
    );
  }

  // healer / explosive — cercle avec croix / X
  if (id === 'healer') {
    const arm = r * 0.55;
    return (
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={r} fill={color} opacity={0.18 * opacity} />
        <Line x1={c} y1={c - arm} x2={c} y2={c + arm}
          stroke={color} strokeWidth={2.5} opacity={opacity} />
        <Line x1={c - arm} y1={c} x2={c + arm} y2={c}
          stroke={color} strokeWidth={2.5} opacity={opacity} />
      </Svg>
    );
  }

  // blocker — hexagone
  if (id === 'blocker') {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      return `${c + r * Math.cos(a)},${c + r * Math.sin(a)}`;
    }).join(' ');
    return (
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={c * 0.85} fill={color} opacity={0.1 * opacity} />
        <Polygon points={pts} fill={color} opacity={opacity} />
      </Svg>
    );
  }

  // summoner — triangle pointant vers le haut
  if (id === 'summoner') {
    const pts = [
      `${c},${c - r}`,
      `${c + r * 0.87},${c + r * 0.5}`,
      `${c - r * 0.87},${c + r * 0.5}`,
    ].join(' ');
    return (
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={c * 0.85} fill={color} opacity={0.1 * opacity} />
        <Polygon points={pts} fill={color} opacity={opacity} />
      </Svg>
    );
  }

  // chaser / explosive / default — cercle simple
  return (
    <Svg width={size} height={size}>
      <Circle cx={c} cy={c} r={c * 0.85} fill={color} opacity={0.1 * opacity} />
      <Circle cx={c} cy={c} r={r} fill={color} opacity={opacity} />
    </Svg>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function LoreScreen() {
  const { t }      = useTranslation();
  const meta       = useGameStore(s => s.meta);
  const setPhase   = useGameStore(s => s.setPhase);
  const seenIds    = meta.seenEnemies || [];
  const act3Vict   = meta.act3Victories || 0;

  const [filterIdx, setFilterIdx] = useState(0);
  const [selected,  setSelected]  = useState(null);

  const filter = FILTER_CATS[filterIdx];

  const isUnlocked = (entry) => {
    if (entry.id === 'origine') return act3Vict >= 3;
    return seenIds.includes(entry.id);
  };

  const filterEntry = (entry) => {
    if (filter === 'Tous')       return true;
    if (filter === 'Ennemis')    return entry.category.startsWith('Ennemi');
    if (filter === 'Boss')       return entry.category.startsWith('Boss');
    if (filter === 'Personnages') return entry.category.startsWith('Voix');
    return true;
  };

  const entries    = ENEMY_LORE.filter(filterEntry);
  const unlockedN  = ENEMY_LORE.filter(isUnlocked).length;
  const total      = ENEMY_LORE.length;

  const current = selected ? ENEMY_LORE.find(e => e.id === selected) : null;
  const currentUnlocked = current ? isUnlocked(current) : false;

  // ── Vue détail ──────────────────────────────────────────────────────────────
  if (current) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelected(null)} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={styles.backTxt}>{t('lore.back')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.detailContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.detailIconRow}>
            <EnemyIcon id={current.id} color={current.color} size={72} unlocked={currentUnlocked} />
          </View>

          <Text style={[styles.detailCategory, { color: current.color + 'AA' }]}>
            {currentUnlocked ? current.category : '???'}
          </Text>
          <Text style={[styles.detailName, { color: currentUnlocked ? current.color : '#333355' }]}>
            {currentUnlocked ? current.name : '???'}
          </Text>

          {currentUnlocked ? (
            <>
              <Text style={styles.detailLore}>{current.lore}</Text>

              {current.stats && (
                <View style={[styles.statsBox, { borderColor: current.color + '44' }]}>
                  <Text style={[styles.statsTitle, { color: current.color }]}>{t('lore.stats_title')}</Text>
                  <View style={styles.statsGrid}>
                    <StatRow label={t('lore.stat_hp')}      statKey="hp"      value={current.stats.hp}      color={current.color} />
                    <StatRow label={t('lore.stat_attack')}  statKey="attack"  value={current.stats.attack}  color={current.color} />
                    <StatRow label={t('lore.stat_defense')} statKey="defense" value={current.stats.defense} color={current.color} />
                    <StatRow label={t('lore.stat_speed')}   statKey="speed"   value={current.stats.speed}   color={current.color} />
                  </View>
                </View>
              )}
            </>
          ) : (
            <Text style={styles.lockedMsg}>{t('lore.locked_msg')}</Text>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Vue liste ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setPhase('menu')} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backTxt}>{t('lore.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('lore.title')}</Text>
        <Text style={styles.counter}>{t('lore.counter', { unlocked: unlockedN, total })}</Text>
      </View>

      {/* Filtres */}
      <View style={styles.filterRow}>
        {FILTER_KEYS.map((key, idx) => (
          <TouchableOpacity
            key={key}
            style={[styles.filterBtn, filterIdx === idx && styles.filterBtnActive]}
            onPress={() => setFilterIdx(idx)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterTxt, filterIdx === idx && styles.filterTxtActive]}>{t(`lore.${key}`)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={entries}
        keyExtractor={e => e.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const unlocked = isUnlocked(item);
          return (
            <TouchableOpacity
              style={[
                styles.card,
                { borderColor: unlocked ? item.color + '55' : '#1A1A2E' },
              ]}
              onPress={() => setSelected(item.id)}
              activeOpacity={0.75}
            >
              <EnemyIcon id={item.id} color={item.color} size={44} unlocked={unlocked} />
              <Text style={[styles.cardName, { color: unlocked ? item.color : '#333355' }]} numberOfLines={1}>
                {unlocked ? item.name : '???'}
              </Text>
              <Text style={[styles.cardCat, { color: unlocked ? '#666688' : '#1A1A2E' }]} numberOfLines={1}>
                {unlocked ? item.category.split(' · ')[0] : '???'}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

// ─── Stat row ─────────────────────────────────────────────────────────────────

function StatRow({ label, value, color, statKey }) {
  const maxVal = statKey === 'hp' ? 140 : statKey === 'attack' ? 12 : statKey === 'defense' ? 4 : 2;
  const pct    = Math.min(1, value / maxVal);
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statBarBg}>
        <View style={[styles.statBarFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.statVal, { color }]}>{value}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex:            1,
    backgroundColor: PALETTE.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop:        12,
    paddingBottom:     8,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A2E',
  },
  backBtn:  { alignSelf: 'flex-start', marginBottom: 4 },
  backTxt:  { color: PALETTE.textMuted, fontSize: 14 },
  title:    { color: PALETTE.textPrimary, fontSize: 22, fontWeight: 'bold', letterSpacing: 4 },
  counter:  { color: PALETTE.textMuted, fontSize: 12, marginTop: 2 },

  filterRow: {
    flexDirection:     'row',
    paddingHorizontal: 16,
    paddingVertical:   10,
    gap:               8,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical:   5,
    borderRadius:      20,
    borderWidth:       1,
    borderColor:       '#222244',
  },
  filterBtnActive: {
    backgroundColor: '#1A1A3E',
    borderColor:     '#4444AA',
  },
  filterTxt:       { color: PALETTE.textMuted, fontSize: 12 },
  filterTxtActive: { color: PALETTE.textPrimary, fontWeight: 'bold' },

  listContent: { paddingHorizontal: 12, paddingBottom: 24 },
  row:         { gap: 10, marginBottom: 10 },

  card: {
    flex:            1,
    alignItems:      'center',
    backgroundColor: '#08080F',
    borderWidth:     1,
    borderRadius:    12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    gap:             6,
  },
  cardName: { fontSize: 13, fontWeight: 'bold', textAlign: 'center' },
  cardCat:  { fontSize: 10, textAlign: 'center' },

  // ── Détail ──────────────────────────────────────────────────────────────────
  detailContainer: {
    alignItems:        'center',
    paddingHorizontal: 24,
    paddingTop:        24,
    gap:               12,
  },
  detailIconRow:  { marginBottom: 4 },
  detailCategory: { fontSize: 11, letterSpacing: 2, textAlign: 'center' },
  detailName:     { fontSize: 26, fontWeight: 'bold', letterSpacing: 2, textAlign: 'center' },
  detailLore:     {
    color:      PALETTE.textMuted,
    fontSize:   13,
    lineHeight: 22,
    textAlign:  'center',
    marginTop:  4,
  },
  lockedMsg: {
    color:      '#333355',
    fontSize:   13,
    lineHeight: 22,
    textAlign:  'center',
    marginTop:  16,
    fontStyle:  'italic',
  },
  statsBox: {
    width:       '100%',
    borderWidth: 1,
    borderRadius: 12,
    padding:     16,
    marginTop:   8,
    gap:         10,
  },
  statsTitle: { fontSize: 10, fontWeight: 'bold', letterSpacing: 3, marginBottom: 4 },
  statsGrid:  { gap: 8 },
  statRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            10,
  },
  statLabel:  { color: PALETTE.textMuted, fontSize: 10, letterSpacing: 1, width: 60 },
  statBarBg:  { flex: 1, height: 4, backgroundColor: '#1A1A2E', borderRadius: 2 },
  statBarFill: { height: 4, borderRadius: 2 },
  statVal:    { fontSize: 12, fontWeight: 'bold', width: 24, textAlign: 'right' },
});
