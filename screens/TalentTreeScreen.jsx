/**
 * RIFT — TalentTreeScreen
 * Arbre de talents permanents — dépense des points gagnés run après run.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import useGameStore from '../store/gameStore';
import { PALETTE } from '../constants';
import { TALENT_CATALOG } from '../utils/talentCatalog';

const CATEGORY_COLOR = {
  offense: PALETTE.upgradeRed,
  defense: PALETTE.upgradeBlue,
  utility: PALETTE.upgradeGreen,
};

const TALENT_COLOR = '#9966FF';

export default function TalentTreeScreen() {
  const { t } = useTranslation();
  const meta        = useGameStore(s => s.meta);
  const goToMenu    = useGameStore(s => s.goToMenu);
  const unlockTalent = useGameStore(s => s.unlockTalent);

  const { talentPoints = 0, unlockedTalents = [] } = meta;

  const categories = ['offense', 'defense', 'utility'];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={goToMenu}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.back}>{t('common.back')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('talent_tree.title')}</Text>
          <View style={styles.pointsBadge}>
            <Text style={styles.pointsIcon}>✨</Text>
            <Text style={styles.pointsTxt}>{talentPoints}</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>
          {talentPoints === 0
            ? t('talent_tree.subtitle_no_points')
            : talentPoints > 1
              ? t('talent_tree.subtitle_points_plural', { count: talentPoints })
              : t('talent_tree.subtitle_points', { count: talentPoints })}
        </Text>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {categories.map(cat => {
            const catTalents = TALENT_CATALOG.filter(tal => tal.category === cat);
            const color = CATEGORY_COLOR[cat];
            return (
              <View key={cat} style={styles.section}>
                <Text style={[styles.sectionTitle, { color }]}>{t(`talent_tree.category_${cat}`)}</Text>
                {catTalents.map(talent => {
                  const isUnlocked   = unlockedTalents.includes(talent.id);
                  const reqMet       = !talent.requires || unlockedTalents.includes(talent.requires);
                  const canAfford    = talentPoints >= talent.cost;
                  const canUnlock    = !isUnlocked && reqMet && canAfford;
                  const locked       = !isUnlocked && !reqMet;

                  return (
                    <View
                      key={talent.id}
                      style={[
                        styles.talentCard,
                        isUnlocked && styles.talentCardUnlocked,
                        locked     && styles.talentCardLocked,
                      ]}
                    >
                      <Text style={styles.talentIcon}>{talent.icon}</Text>
                      <View style={styles.talentInfo}>
                        <View style={styles.talentRow}>
                          <Text style={[styles.talentName, isUnlocked && { color: TALENT_COLOR }]}>
                            {talent.name}
                          </Text>
                          {isUnlocked ? (
                            <Text style={styles.unlockedBadge}>{t('talent_tree.unlocked_badge')}</Text>
                          ) : (
                            <View style={[styles.costBadge, !canAfford && styles.costBadgeInsuffisant]}>
                              <Text style={styles.costTxt}>✨ {talent.cost}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.talentDesc, locked && styles.talentDescLocked]}>
                          {locked ? t('talent_tree.requires', { name: TALENT_CATALOG.find(tal => tal.id === talent.requires)?.name }) : talent.desc}
                        </Text>
                      </View>
                      {canUnlock && (
                        <TouchableOpacity
                          style={styles.unlockBtn}
                          onPress={() => unlockTalent(talent.id)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.unlockBtnTxt}>{t('talent_tree.unlock_btn')}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })}
          <View style={{ height: 24 }} />
        </ScrollView>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: PALETTE.bg },
  container: { flex: 1, padding: 20, gap: 12 },

  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingTop:     6,
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

  pointsBadge: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            4,
    backgroundColor: '#0D0A1A',
    borderWidth:    1,
    borderColor:    TALENT_COLOR,
    borderRadius:   10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth:       60,
    justifyContent: 'center',
  },
  pointsIcon: { fontSize: 14 },
  pointsTxt:  { color: '#BB88FF', fontSize: 16, fontWeight: 'bold' },

  subtitle: { color: PALETTE.textMuted, fontSize: 12, textAlign: 'center' },

  section:      { marginBottom: 16, gap: 8 },
  sectionTitle: { fontSize: 10, fontWeight: 'bold', letterSpacing: 3, marginBottom: 2 },

  talentCard: {
    backgroundColor: PALETTE.bgCard,
    borderWidth:     1,
    borderColor:     PALETTE.border,
    borderRadius:    12,
    padding:         12,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             12,
  },
  talentCardUnlocked: {
    borderColor:     TALENT_COLOR + '66',
    backgroundColor: '#0D0A1A',
  },
  talentCardLocked: { opacity: 0.45 },

  talentIcon: { fontSize: 28, width: 36, textAlign: 'center' },
  talentInfo: { flex: 1, gap: 4 },
  talentRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  talentName: { color: PALETTE.textPrimary, fontSize: 14, fontWeight: 'bold' },
  talentDesc: { color: PALETTE.textMuted, fontSize: 12 },
  talentDescLocked: { fontStyle: 'italic', color: PALETTE.textDim },

  unlockedBadge: { color: TALENT_COLOR, fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },

  costBadge: {
    backgroundColor: TALENT_COLOR + '33',
    borderWidth:     1,
    borderColor:     TALENT_COLOR,
    borderRadius:    6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  costBadgeInsuffisant: {
    backgroundColor: '#33333355',
    borderColor:     PALETTE.textDim,
  },
  costTxt: { color: '#BB88FF', fontSize: 11, fontWeight: 'bold' },

  unlockBtn: {
    backgroundColor: TALENT_COLOR,
    borderRadius:    8,
    paddingHorizontal: 10,
    paddingVertical:   8,
  },
  unlockBtnTxt: { color: '#fff', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
});
