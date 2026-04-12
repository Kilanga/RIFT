/**
 * RIFT — AchievementsScreen
 * Liste complète des succès avec bordures de rareté.
 */

import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import useGameStore from '../store/gameStore';
import { ACHIEVEMENTS_CATALOG, getWeeklyQuestProgress } from '../store/achievements';
import { PALETTE } from '../constants';

// ─── Couleurs de rareté ───────────────────────────────────────────────────────

const RARITY_COLOR = {
  common:    '#555577',
  rare:      '#2266CC',
  epic:      '#9933CC',
  legendary: '#CC8800',
};

// ─── Composant principal ──────────────────────────────────────────────────────

export default function AchievementsScreen() {
  const { t }       = useTranslation();
  const meta        = useGameStore(s => s.meta);
  const goToMenu    = useGameStore(s => s.setPhase);
  const unlockedIds = meta.achievements || [];
  const weeklyQuests = getWeeklyQuestProgress(meta);
  const completedWeekly = weeklyQuests.filter(q => q.completed).length;

  const unlocked = ACHIEVEMENTS_CATALOG.filter(a => unlockedIds.includes(a.id));
  const locked   = ACHIEVEMENTS_CATALOG.filter(a => !unlockedIds.includes(a.id));

  return (
    <SafeAreaView style={styles.safe}>

      {/* En-tête */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goToMenu('menu')} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backTxt}>{t('lore.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('achievements_screen.title')}</Text>
        <Text style={styles.counter}>{unlocked.length} / {ACHIEVEMENTS_CATALOG.length}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>

        <Text style={styles.sectionLabel}>{t('achievements_screen.weekly_section', { defaultValue: 'QUÊTES HEBDO' })}</Text>
        <Text style={styles.weeklySubTitle}>
          {t('achievements_screen.weekly_progress', { defaultValue: '{{done}} / {{total}} terminées cette semaine', done: completedWeekly, total: weeklyQuests.length })}
        </Text>
        {weeklyQuests.map(quest => (
          <WeeklyQuestCard key={quest.id} quest={quest} t={t} />
        ))}

        {/* Débloqués */}
        {unlocked.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>{t('achievements_screen.unlocked_section')}</Text>
            {unlocked.map(a => (
              <AchievementCard key={a.id} achievement={a} unlocked t={t} />
            ))}
          </>
        )}

        {/* Verrouillés */}
        {locked.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>{t('achievements_screen.locked_section')}</Text>
            {locked.map(a => (
              <AchievementCard key={a.id} achievement={a} unlocked={false} t={t} />
            ))}
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function WeeklyQuestCard({ quest, t }) {
  const ratio = Math.max(0, Math.min(1, quest.ratio || 0));
  return (
    <View style={[styles.weeklyCard, quest.completed && styles.weeklyCardDone]}>
      <View style={styles.weeklyTop}>
        <Text style={styles.weeklyIcon}>{quest.icon}</Text>
        <View style={styles.weeklyBody}>
          <Text style={styles.weeklyName}>{t(`achievement.${quest.id}_name`, { defaultValue: quest.name })}</Text>
          <Text style={styles.weeklyDesc}>{t(`achievement.${quest.id}_desc`, { defaultValue: quest.desc })}</Text>
        </View>
        <Text style={[styles.weeklyCounter, quest.completed && styles.weeklyCounterDone]}>{quest.progress}/{quest.target}</Text>
      </View>
      <View style={styles.weeklyBarBg}>
        <View style={[styles.weeklyBarFill, { width: `${ratio * 100}%` }, quest.completed && styles.weeklyBarFillDone]} />
      </View>
    </View>
  );
}

// ─── Carte achievement ────────────────────────────────────────────────────────

function AchievementCard({ achievement, unlocked, t }) {
  const rarityColor = RARITY_COLOR[achievement.rarity] || RARITY_COLOR.common;
  const rarityLabel = t(`achievements_screen.rarity_${achievement.rarity}`, { defaultValue: achievement.rarity });
  const name        = t(`achievement.${achievement.id}_name`, { defaultValue: achievement.name });
  const desc        = t(`achievement.${achievement.id}_desc`, { defaultValue: achievement.desc });

  return (
    <View style={[
      styles.card,
      { borderColor: unlocked ? rarityColor : '#222233' },
      unlocked && { borderLeftColor: rarityColor, borderLeftWidth: 3 },
    ]}>
      <Text style={[styles.cardIcon, !unlocked && styles.cardIconLocked]}>
        {unlocked ? achievement.icon : '🔒'}
      </Text>
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={[styles.cardName, !unlocked && styles.cardNameLocked]}>
            {name}
          </Text>
          <Text style={[styles.cardRarity, { color: unlocked ? rarityColor : '#333355' }]}>
            {rarityLabel}
          </Text>
        </View>
        <Text style={[styles.cardDesc, !unlocked && styles.cardDescLocked]}>
          {desc}
        </Text>
      </View>
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
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  backTxt: {
    color:    PALETTE.textMuted,
    fontSize: 14,
  },
  title: {
    color:       PALETTE.textPrimary,
    fontSize:    22,
    fontWeight:  'bold',
    letterSpacing: 4,
  },
  counter: {
    color:    PALETTE.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop:        16,
  },
  sectionLabel: {
    color:         PALETTE.textMuted,
    fontSize:      10,
    letterSpacing: 3,
    marginBottom:  10,
  },
  weeklySubTitle: {
    color: PALETTE.textMuted,
    fontSize: 12,
    marginTop: -4,
    marginBottom: 10,
  },
  weeklyCard: {
    backgroundColor: '#0A0F16',
    borderWidth: 1,
    borderColor: '#22314A',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    gap: 8,
  },
  weeklyCardDone: {
    borderColor: '#3A915D',
    backgroundColor: '#0C1A12',
  },
  weeklyTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  weeklyIcon: {
    fontSize: 18,
    width: 22,
    textAlign: 'center',
  },
  weeklyBody: {
    flex: 1,
    gap: 2,
  },
  weeklyName: {
    color: PALETTE.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  weeklyDesc: {
    color: PALETTE.textMuted,
    fontSize: 11,
  },
  weeklyCounter: {
    color: '#89A8D8',
    fontSize: 12,
    fontWeight: '700',
  },
  weeklyCounterDone: {
    color: '#6DDB9B',
  },
  weeklyBarBg: {
    height: 6,
    borderRadius: 4,
    backgroundColor: '#182437',
    overflow: 'hidden',
  },
  weeklyBarFill: {
    height: 6,
    backgroundColor: '#4D8CFF',
  },
  weeklyBarFillDone: {
    backgroundColor: '#41C777',
  },
  card: {
    flexDirection:  'row',
    alignItems:     'center',
    backgroundColor: '#08080F',
    borderWidth:    1,
    borderRadius:   10,
    padding:        12,
    marginBottom:   8,
    gap:            12,
  },
  cardIcon: {
    fontSize: 24,
    width:    32,
    textAlign: 'center',
  },
  cardIconLocked: {
    opacity: 0.3,
  },
  cardBody: {
    flex: 1,
    gap:  3,
  },
  cardTop: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  cardName: {
    color:      PALETTE.textPrimary,
    fontSize:   14,
    fontWeight: 'bold',
  },
  cardNameLocked: {
    color: '#444466',
  },
  cardRarity: {
    fontSize:      10,
    fontWeight:    'bold',
    letterSpacing: 1,
  },
  cardDesc: {
    color:    PALETTE.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  cardDescLocked: {
    color: '#333355',
  },
});
