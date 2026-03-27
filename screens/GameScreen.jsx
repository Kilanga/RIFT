/**
 * RIFT — GameScreen
 * Écran principal de jeu : combat, repos, shop, choix d'upgrade, intro boss
 * Orchestre les composants selon la phase en cours
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Pressable, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import useGameStore from '../store/gameStore';
import { GAME_PHASES, PALETTE, ROOM_TYPES, CLASS_INFO } from '../constants';

import GameGrid             from '../components/GameGrid';
import CombatLog            from '../components/CombatLog';
import UpgradeModal         from '../components/UpgradeModal';
import RestRoomOverlay      from '../components/RestRoomOverlay';
import ShopOverlay          from '../components/ShopOverlay';
import EventRoomOverlay     from '../components/EventRoomOverlay';
import PauseModal           from '../components/PauseModal';
import BossIntroOverlay     from '../components/BossIntroOverlay';

export default function GameScreen() {
  const { t } = useTranslation();
  const phase          = useGameStore(s => s.phase);
  const player         = useGameStore(s => s.player);
  const run            = useGameStore(s => s.run);
  const currentRoom    = useGameStore(s => s.currentRoom);
  const enemies        = useGameStore(s => s.enemies);
  const isPlayerTurn   = useGameStore(s => s.isPlayerTurn);
  const activeUpgrades = useGameStore(s => s.activeUpgrades);
  const bossIntroType  = useGameStore(s => s.bossIntroType);
  const blinkUsed      = useGameStore(s => s.blinkUsed);
  const useBlink       = useGameStore(s => s.useBlink);

  const lastCritAt = useGameStore(s => s.lastCritAt);
  const shakeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!lastCritAt) return;
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 9,  duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -9, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,  duration: 35, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 35, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 30, useNativeDriver: true }),
    ]).start();
  }, [lastCritAt]);

  const [paused, setPaused] = useState(false);
  const [showUpgrades, setShowUpgrades] = useState(false);

  const aliveEnemies = enemies.filter(e => e.hp > 0);
  const isCombat     = phase === GAME_PHASES.COMBAT;
  const isBossIntro  = phase === GAME_PHASES.BOSS_INTRO;

  // Boss intro : plein écran
  if (isBossIntro) {
    return (
      <SafeAreaView style={styles.safe}>
        <BossIntroOverlay bossType={bossIntroType} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Animated.View style={[styles.container, { transform: [{ translateX: shakeAnim }] }]}>

        {/* ── Header de salle ─────────────────────────────────────────── */}
        <View style={styles.header}>
          <RoomBadge type={currentRoom?.type} />

          {/* Stats joueur */}
          <View style={styles.playerStats}>
            <View style={styles.statRow}>
              <Text style={styles.statIcon}>❤</Text>
              <View style={styles.barBg}>
                <View style={[styles.barFill, {
                  width: `${(player.hp / player.maxHp) * 100}%`,
                  backgroundColor: player.hp / player.maxHp < 0.3 ? PALETTE.upgradeRed : PALETTE.hp,
                }]} />
              </View>
              <Text style={styles.statTxt}>{player.hp}/{player.maxHp}</Text>
            </View>

            {activeUpgrades.some(u => u.id === 'momentum') && (
              <View style={styles.statRow}>
                <Text style={styles.statIcon}>⚡</Text>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, {
                    width: `${(player.charges / player.maxCharges) * 100}%`,
                    backgroundColor: PALETTE.charge,
                  }]} />
                </View>
                <Text style={styles.statTxt}>{player.charges}/{player.maxCharges}</Text>
              </View>
            )}
          </View>

          {/* Fragments */}
          <View style={styles.fragBox}>
            <Text style={styles.fragIcon}>◈</Text>
            <Text style={styles.fragCount}>{player.fragments}</Text>
          </View>

          {/* Bouton pause */}
          {isCombat && (
            <TouchableOpacity style={styles.pauseBtn} onPress={() => setPaused(true)} activeOpacity={0.7}>
              <Text style={styles.pauseIcon}>⏸</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Stats secondaires + statuts ─────────────────────────────── */}
        <View style={styles.secondRow}>
          <ShapeLabel shape={player.shape} />
          <Text style={styles.secStat}>⚔ {player.attack}</Text>
          <Text style={styles.secStat}>🛡 {player.defense}</Text>

          {/* Statuts actifs du joueur */}
          {player.statuses?.length > 0 && (
            <StatusIcons statuses={player.statuses} />
          )}

          <View style={[
            styles.turnBadge,
            { backgroundColor: isPlayerTurn ? '#002211' : '#220000', borderColor: isPlayerTurn ? '#00CC66' : '#CC3333' },
          ]}>
            <Text style={[styles.turnTxt, { color: isPlayerTurn ? '#00FF88' : '#FF5555' }]}>
              {isPlayerTurn ? t('game.your_turn') : t('game.enemy_turn')}
            </Text>
          </View>
          {aliveEnemies.length > 0 && (
            <Text style={styles.enemyCount}>☠ {aliveEnemies.length}</Text>
          )}

          {/* Bouton Upgrades */}
          {activeUpgrades.length > 0 && (
            <TouchableOpacity style={styles.upgradesBtn} onPress={() => setShowUpgrades(true)} activeOpacity={0.7}>
              <Text style={styles.upgradesBtnTxt}>{t('game.upgrades_btn', { count: activeUpgrades.length })}</Text>
            </TouchableOpacity>
          )}

          {/* Bouton Clignotement */}
          {activeUpgrades.some(u => u.id === 'blink') && (
            <TouchableOpacity
              style={[styles.blinkBtn, blinkUsed && styles.blinkBtnUsed]}
              onPress={useBlink}
              disabled={blinkUsed}
              activeOpacity={0.7}
            >
              <Text style={[styles.blinkBtnTxt, blinkUsed && styles.blinkBtnTxtUsed]}>{t('game.blink')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Corps principal selon la phase ──────────────────────────── */}
        <View style={styles.body}>
          {isCombat && (
            <View style={styles.gridWrapper}>
              <GameGrid />
            </View>
          )}
          {phase === GAME_PHASES.REST_ROOM  && <RestRoomOverlay />}
          {phase === GAME_PHASES.SHOP_ROOM  && <ShopOverlay />}
          {phase === GAME_PHASES.EVENT_ROOM && <EventRoomOverlay />}
        </View>

        {/* ── Log de combat ───────────────────────────────────────────── */}
        {isCombat && <CombatLog maxLines={3} />}

        {/* ── Upgrades actifs (bandeau compact) ──────────────────────── */}
        {activeUpgrades.length > 0 && isCombat && (
          <View style={styles.upgradesBar}>
            {activeUpgrades.map((u, i) => (
              <View
                key={`${u.id}_${i}`}
                style={[styles.upgradeDot, {
                  backgroundColor: upgradeHex(u.color),
                  opacity:         u.synergyActive ? 1 : 0.5,
                  transform:       u.synergyActive ? [{ scale: 1.3 }] : [],
                }]}
              />
            ))}
          </View>
        )}

        {/* ── Modal d'upgrade ─────────────────────────────────────────── */}
        <UpgradeModal />

        {/* ── Menu pause ──────────────────────────────────────────────── */}
        <PauseModal visible={paused} onResume={() => setPaused(false)} />

        {/* ── Modal upgrades actifs ────────────────────────────────────── */}
        <Modal visible={showUpgrades} transparent animationType="slide" onRequestClose={() => setShowUpgrades(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowUpgrades(false)}>
            <Pressable style={styles.upgradesSheet} onPress={() => {}}>
              <Text style={styles.upgradesSheetTitle}>{t('game.upgrades_active')}</Text>
              {activeUpgrades.filter(u => u.color === 'curse').length >= 3 && (
                <View style={styles.curseSynergyBanner}>
                  <Text style={styles.curseSynergyTxt}>{t('game.curse_synergy')}</Text>
                </View>
              )}
              <ScrollView showsVerticalScrollIndicator={false}>
                {activeUpgrades.map((u, i) => (
                  <View key={`${u.id}_${i}`} style={[styles.upgradeCard, { borderColor: upgradeHex(u.color) }]}>
                    <View style={[styles.upgradeCardBar, { backgroundColor: upgradeHex(u.color) }]} />
                    <View style={styles.upgradeCardBody}>
                      <Text style={[styles.upgradeCardName, { color: upgradeHex(u.color) }]}>{t(`upgrade.${u.id}.name`, { defaultValue: u.name }).toUpperCase()}</Text>
                      <Text style={styles.upgradeCardDesc}>{t(`upgrade.${u.id}.desc`, { defaultValue: u.description })}</Text>
                      {u.synergyActive && u.color !== 'curse' && <Text style={styles.synergeBadge}>{t('game.synergy_active')}</Text>}
                      {u.synergyActive && u.color === 'curse' && <Text style={[styles.synergeBadge, { color: '#AA44CC' }]}>{t('game.synergy_cursed')}</Text>}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

      </Animated.View>
    </SafeAreaView>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function RoomBadge({ type }) {
  const { t } = useTranslation();
  const labels = {
    [ROOM_TYPES.COMBAT]:     { txt: t('game.room_combat'),     color: PALETTE.roomCombat },
    [ROOM_TYPES.REST]:       { txt: t('game.room_rest'),       color: PALETTE.roomRest   },
    [ROOM_TYPES.SHOP]:       { txt: t('game.room_shop'),       color: PALETTE.roomShop   },
    [ROOM_TYPES.BOSS_MINI]:  { txt: t('game.room_boss_mini'),  color: PALETTE.roomBoss   },
    [ROOM_TYPES.BOSS]:       { txt: t('game.room_boss'),       color: PALETTE.roomBoss   },
    [ROOM_TYPES.BOSS_FINAL]: { txt: t('game.room_boss_final'), color: '#FF2266'          },
  };
  const { txt, color } = labels[type] || { txt: '?', color: PALETTE.textMuted };

  return (
    <View style={[styles.roomBadge, { borderColor: color }]}>
      <Text style={[styles.roomBadgeTxt, { color }]}>{txt}</Text>
    </View>
  );
}

function ShapeLabel({ shape }) {
  const info  = CLASS_INFO[shape];
  const color = info?.color ?? PALETTE.textMuted;
  return <Text style={{ color, fontSize: 12, fontWeight: 'bold' }}>{info?.short ?? '?'}</Text>;
}

const STATUS_ICONS = {
  shield:      { icon: '🔵', label: 'Bouclier' },
  attackBoost: { icon: '🔴', label: 'ATQ↑' },
  vulnerable:  { icon: '🟡', label: 'Vulnerable' },
};

function StatusIcons({ statuses }) {
  return (
    <View style={styles.statusRow}>
      {statuses.map((s, i) => {
        const info = STATUS_ICONS[s.id] || { icon: '◈', label: s.id };
        return (
          <View key={`${s.id}_${i}`} style={styles.statusBadge}>
            <Text style={styles.statusIcon}>{info.icon}</Text>
          </View>
        );
      })}
    </View>
  );
}

function upgradeHex(color) {
  return { red: PALETTE.upgradeRed, blue: PALETTE.upgradeBlue, green: PALETTE.upgradeGreen, curse: '#AA44CC' }[color] || '#888';
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: PALETTE.bg },
  container: { flex: 1, gap: 0 },

  // Header
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 12,
    paddingVertical:   8,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.border,
    gap:               10,
  },
  roomBadge: {
    borderWidth:       1,
    borderRadius:      6,
    paddingHorizontal: 8,
    paddingVertical:   3,
  },
  roomBadgeTxt: { fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },

  playerStats: { flex: 1, gap: 4 },
  statRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statIcon:    { width: 14, fontSize: 11, textAlign: 'center' },
  barBg: {
    flex:            1,
    height:          6,
    backgroundColor: '#0D1008',
    borderRadius:    3,
    overflow:        'hidden',
  },
  barFill:  { height: 6, borderRadius: 3 },
  statTxt:  { color: PALETTE.textMuted, fontSize: 10, width: 40, textAlign: 'right' },

  fragBox:   { flexDirection: 'row', alignItems: 'center', gap: 3 },
  fragIcon:  { color: PALETTE.fragment, fontSize: 13 },
  fragCount: { color: PALETTE.textPrimary, fontSize: 14, fontWeight: 'bold' },

  pauseBtn: {
    width:           32,
    height:          32,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1,
    borderColor:     PALETTE.borderLight,
    borderRadius:    8,
    backgroundColor: PALETTE.bgDark,
  },
  pauseIcon: { fontSize: 14, color: PALETTE.textMuted },

  // Bande secondaire
  secondRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 12,
    paddingVertical:   5,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.border,
    gap:               8,
  },
  secStat: { color: PALETTE.textMuted, fontSize: 12 },
  turnBadge: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    borderWidth:       1,
    borderRadius:      6,
    paddingVertical:   3,
    paddingHorizontal: 8,
  },
  turnTxt:    { fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
  enemyCount: { color: PALETTE.upgradeRed, fontSize: 11 },

  // Statuts
  statusRow:   { flexDirection: 'row', gap: 3 },
  statusBadge: {
    width:  20,
    height: 20,
    alignItems:     'center',
    justifyContent: 'center',
    borderRadius:   4,
    backgroundColor: PALETTE.bgDark,
    borderWidth:    1,
    borderColor:    PALETTE.border,
  },
  statusIcon: { fontSize: 10 },

  // Corps
  body:        { flex: 1 },
  gridWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 8 },

  // Boutons actions (secondRow)
  upgradesBtn: {
    borderWidth:       1,
    borderColor:       PALETTE.borderLight,
    borderRadius:      6,
    paddingHorizontal: 6,
    paddingVertical:   3,
    backgroundColor:   PALETTE.bgDark,
  },
  upgradesBtnTxt: { color: PALETTE.textMuted, fontSize: 9, fontWeight: 'bold', letterSpacing: 1 },

  blinkBtn: {
    borderWidth:       1,
    borderColor:       '#4488FF',
    borderRadius:      6,
    paddingHorizontal: 6,
    paddingVertical:   3,
    backgroundColor:   '#0A0A25',
  },
  blinkBtnUsed:    { borderColor: PALETTE.border, backgroundColor: PALETTE.bgDark },
  blinkBtnTxt:     { color: '#4488FF', fontSize: 9, fontWeight: 'bold', letterSpacing: 1 },
  blinkBtnTxtUsed: { color: PALETTE.textDim },

  // Modal upgrades
  modalOverlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent:  'flex-end',
  },
  upgradesSheet: {
    backgroundColor: PALETTE.bgCard,
    borderTopWidth:  1,
    borderTopColor:  PALETTE.border,
    borderTopLeftRadius:  14,
    borderTopRightRadius: 14,
    padding:         16,
    maxHeight:       '60%',
    gap:             12,
  },
  upgradesSheetTitle: {
    color:         PALETTE.textPrimary,
    fontSize:      13,
    fontWeight:    'bold',
    letterSpacing: 3,
    textAlign:     'center',
  },
  curseSynergyBanner: {
    backgroundColor: '#2A0044',
    borderWidth:     1,
    borderColor:     '#AA44CC',
    borderRadius:    8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginTop:       8,
    alignItems:      'center',
  },
  curseSynergyTxt: {
    color:         '#CC66FF',
    fontSize:      11,
    fontWeight:    'bold',
    letterSpacing: 2,
  },
  upgradeCard: {
    flexDirection:   'row',
    borderWidth:     1,
    borderRadius:    8,
    marginBottom:    8,
    backgroundColor: PALETTE.bgDark,
    overflow:        'hidden',
  },
  upgradeCardBar:  { width: 4, backgroundColor: '#fff' },
  upgradeCardBody: { flex: 1, padding: 10, gap: 3 },
  upgradeCardName: { fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
  upgradeCardDesc: { color: PALETTE.textMuted, fontSize: 11 },
  synergeBadge:    { color: '#FFD700', fontSize: 10, fontWeight: 'bold', marginTop: 2 },

  // Upgrades
  upgradesBar: {
    flexDirection:     'row',
    flexWrap:          'wrap',
    gap:               4,
    paddingHorizontal: 12,
    paddingVertical:   6,
    borderTopWidth:    1,
    borderTopColor:    PALETTE.border,
  },
  upgradeDot: {
    width:        10,
    height:       10,
    borderRadius: 5,
  },
});
