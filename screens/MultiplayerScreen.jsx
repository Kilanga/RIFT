/**
 * RIFT — MultiplayerScreen
 * Lobby 1v1 et Co-op via Supabase Realtime
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import useGameStore from '../store/gameStore';
import { PALETTE, PLAYER_SHAPES } from '../constants';
import {
  createRoom, joinRoom, startGame, leaveRoom,
  subscribeToRoom,
} from '../services/multiplayerService';

const MODES = [
  { id: '1v1',  icon: '⚔',  color: PALETTE.upgradeRed,   disabled: false },
  { id: 'coop', icon: '🤝', color: PALETTE.upgradeGreen, disabled: true  },
];

export default function MultiplayerScreen() {
  const { t } = useTranslation();
  const goToMenu   = useGameStore(s => s.goToMenu);
  const startRun   = useGameStore(s => s.startRun);
  const meta       = useGameStore(s => s.meta);
  const playerName = meta.playerName || t('multiplayer.default_player');

  const [screen,   setScreen]   = useState('lobby');  // 'lobby' | 'create' | 'join' | 'room'
  const [mode,     setMode]     = useState('1v1');
  const [codeInput, setCodeInput] = useState('');
  const [room,     setRoom]     = useState(null);
  const [role,     setRole]     = useState(null);  // 'host' | 'guest'
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const unsubRef = useRef(null);

  // Cleanup à la fermeture
  useEffect(() => {
    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, []);

  const clearError = () => setError('');

  // ── Créer une room ──────────────────────────────────────────────────────────

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const newRoom = await createRoom(playerName, mode);
      setRoom(newRoom);
      setRole('host');
      setScreen('room');
      // S'abonner aux mises à jour
      unsubRef.current = subscribeToRoom(newRoom.code, (updated) => {
        setRoom(updated);
      });
    } catch (e) {
      setError(e.message || t('multiplayer.error_create'));
    } finally {
      setLoading(false);
    }
  };

  // ── Rejoindre une room ──────────────────────────────────────────────────────

  const handleJoin = async () => {
    if (codeInput.length < 4) { setError(t('multiplayer.error_code_length')); return; }
    setLoading(true);
    setError('');
    try {
      const joined = await joinRoom(codeInput, playerName);
      setRoom(joined);
      setRole('guest');
      setScreen('room');
      unsubRef.current = subscribeToRoom(joined.code, (updated) => {
        setRoom(updated);
        // Si la partie démarre → lancer le run avec le seed partagé
        if (updated.status === 'playing') {
          handleGameStart(joined.code, updated.seed, 'guest');
        }
      });
    } catch (e) {
      setError(e.message || t('multiplayer.error_join'));
    } finally {
      setLoading(false);
    }
  };

  // ── Démarrer la partie (hôte uniquement) ───────────────────────────────────

  const handleStart = async () => {
    if (!room?.guest_name) { setError(t('multiplayer.error_waiting')); return; }
    setLoading(true);
    try {
      await startGame(room.code);
      handleGameStart(room.code, room.seed, 'host');
    } catch (e) {
      setError(e.message || t('multiplayer.error_start'));
    } finally {
      setLoading(false);
    }
  };

  const handleGameStart = (code, seed, startRole) => {
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
    // Lance le run en passant le code room (pour sync scores en cours de partie)
    // Le seed garantit la même carte pour les deux joueurs
    startRun(PLAYER_SHAPES.TRIANGLE, false, { multiCode: code, multiRole: startRole, seed });
  };

  // ── Quitter la room ─────────────────────────────────────────────────────────

  const handleLeave = async () => {
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
    if (room && role === 'host') await leaveRoom(room.code);
    setRoom(null);
    setRole(null);
    setScreen('lobby');
    setError('');
  };

  // ── Rendu ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={screen === 'lobby' ? goToMenu : (screen === 'room' ? handleLeave : () => setScreen('lobby'))}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.back}>{t('common.back')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('multiplayer.title')}</Text>
          <View style={{ width: 72 }} />
        </View>

        {/* ── LOBBY ── */}
        {screen === 'lobby' && (
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

            {/* Sélection de mode */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('multiplayer.mode_section')}</Text>
              <View style={styles.modeRow}>
                {MODES.map(m => (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.modeCard,
                      { borderColor: mode === m.id ? m.color : PALETTE.border },
                      mode === m.id && { backgroundColor: m.color + '10' },
                      m.disabled && { opacity: 0.45 },
                    ]}
                    onPress={() => !m.disabled && setMode(m.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.modeIcon}>{m.icon}</Text>
                    <Text style={[styles.modeLabel, { color: mode === m.id ? m.color : PALETTE.textMuted }]}>
                      {t(`multiplayer.mode_${m.id}_label`)}
                    </Text>
                    <Text style={styles.modeDesc}>{t(`multiplayer.mode_${m.id}_desc`)}</Text>
                    {m.disabled && <Text style={styles.modeSoon}>{t('multiplayer.mode_soon')}</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Pseudo */}
            <View style={styles.playerInfo}>
              <Text style={styles.playerLabel}>{t('multiplayer.player_label')}</Text>
              <Text style={[styles.playerName, { color: PALETTE.triangle }]}>{playerName}</Text>
              {!meta.playerName && (
                <Text style={styles.playerWarning}> {t('multiplayer.player_warning')}</Text>
              )}
            </View>

            {/* Actions */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: PALETTE.triangle }]}
                onPress={() => { clearError(); setScreen('create'); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.actionBtnTxt, { color: PALETTE.triangle }]}>{t('multiplayer.create')}</Text>
                <Text style={styles.actionBtnSub}>{t('multiplayer.create_sub')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: PALETTE.upgradeBlue }]}
                onPress={() => { clearError(); setScreen('join'); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.actionBtnTxt, { color: PALETTE.upgradeBlue }]}>{t('multiplayer.join')}</Text>
                <Text style={styles.actionBtnSub}>{t('multiplayer.join_sub')}</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        )}

        {/* ── CRÉER ── */}
        {screen === 'create' && (
          <View style={styles.centeredSection}>
            <Text style={styles.sectionTitle}>{t('multiplayer.create_room_title', { mode: mode.toUpperCase() })}</Text>
            <Text style={styles.createInfo}>{t('multiplayer.create_room_info')}</Text>
            <TouchableOpacity
              style={[styles.bigBtn, { borderColor: PALETTE.triangle }]}
              onPress={handleCreate}
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={PALETTE.triangle} />
                : <Text style={[styles.bigBtnTxt, { color: PALETTE.triangle }]}>{t('multiplayer.create_room_btn')}</Text>
              }
            </TouchableOpacity>
            {error ? <Text style={styles.errorTxt}>{error}</Text> : null}
          </View>
        )}

        {/* ── REJOINDRE ── */}
        {screen === 'join' && (
          <View style={styles.centeredSection}>
            <Text style={styles.sectionTitle}>{t('multiplayer.join_room_title')}</Text>
            <Text style={styles.createInfo}>{t('multiplayer.join_room_info')}</Text>
            <TextInput
              style={styles.codeInput}
              value={codeInput}
              onChangeText={t => { setCodeInput(t.toUpperCase().slice(0, 4)); setError(''); }}
              placeholder="CODE"
              placeholderTextColor={PALETTE.textDim}
              autoCapitalize="characters"
              maxLength={4}
            />
            <TouchableOpacity
              style={[styles.bigBtn, { borderColor: PALETTE.upgradeBlue }]}
              onPress={handleJoin}
              activeOpacity={0.8}
              disabled={loading || codeInput.length < 4}
            >
              {loading
                ? <ActivityIndicator color={PALETTE.upgradeBlue} />
                : <Text style={[styles.bigBtnTxt, { color: PALETTE.upgradeBlue }]}>{t('multiplayer.join_room_btn')}</Text>
              }
            </TouchableOpacity>
            {error ? <Text style={styles.errorTxt}>{error}</Text> : null}
          </View>
        )}

        {/* ── ROOM / SALLE D'ATTENTE ── */}
        {screen === 'room' && room && (
          <View style={styles.roomSection}>

            {/* Code */}
            <View style={styles.roomCodeBox}>
              <Text style={styles.roomCodeLabel}>{t('multiplayer.room_code_label')}</Text>
              <Text style={styles.roomCode}>{room.code}</Text>
              <Text style={styles.roomCodeHint}>{t('multiplayer.room_code_hint')}</Text>
            </View>

            {/* Joueurs */}
            <View style={styles.playersRow}>
              <PlayerSlot
                name={room.host_name}
                label={t('multiplayer.host_label')}
                color={PALETTE.triangle}
                isYou={role === 'host'}
                ready={true}
                youLabel={t('multiplayer.you')}
                waitingLabel={t('multiplayer.slot_waiting')}
              />
              <Text style={styles.vsText}>{t('multiplayer.vs')}</Text>
              <PlayerSlot
                name={room.guest_name}
                label={t('multiplayer.guest_label')}
                color={PALETTE.circle}
                isYou={role === 'guest'}
                ready={!!room.guest_name}
                youLabel={t('multiplayer.you')}
                waitingLabel={t('multiplayer.slot_waiting')}
              />
            </View>

            {/* Infos */}
            <View style={styles.roomInfo}>
              <Text style={styles.roomInfoItem}>{t('multiplayer.room_mode', { mode: room.mode.toUpperCase() })}</Text>
              <Text style={styles.roomInfoItem}>{t('multiplayer.room_seed', { seed: room.seed })}</Text>
            </View>

            {/* Status */}
            {!room.guest_name && (
              <View style={styles.waitingBox}>
                <ActivityIndicator color={PALETTE.textMuted} size="small" />
                <Text style={styles.waitingTxt}>{t('multiplayer.waiting_opponent')}</Text>
              </View>
            )}

            {/* Bouton start (hôte seulement) */}
            {role === 'host' && room.guest_name && (
              <TouchableOpacity
                style={styles.startBtn}
                onPress={handleStart}
                activeOpacity={0.8}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color={PALETTE.triangle} />
                  : <Text style={styles.startBtnTxt}>{t('multiplayer.start_game')}</Text>
                }
              </TouchableOpacity>
            )}

            {role === 'guest' && room.guest_name && (
              <View style={styles.waitingBox}>
                <ActivityIndicator color={PALETTE.triangle} size="small" />
                <Text style={styles.waitingTxt}>{t('multiplayer.waiting_host')}</Text>
              </View>
            )}

            {error ? <Text style={styles.errorTxt}>{error}</Text> : null}
          </View>
        )}

      </View>
    </SafeAreaView>
  );
}

// ─── Slot joueur ───────────────────────────────────────────────────────────────

function PlayerSlot({ name, label, color, isYou, ready, youLabel, waitingLabel }) {
  return (
    <View style={[styles.playerSlot, ready && { borderColor: color + '55' }]}>
      <Text style={[styles.playerSlotLabel, { color: PALETTE.textDim }]}>{label}</Text>
      {ready ? (
        <>
          <Text style={[styles.playerSlotName, { color }]}>{name}</Text>
          {isYou && <Text style={styles.playerSlotYou}>{youLabel || '(toi)'}</Text>}
        </>
      ) : (
        <Text style={styles.playerSlotEmpty}>{waitingLabel || 'En attente…'}</Text>
      )}
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

  section:      { gap: 12, marginBottom: 16 },
  sectionTitle: { color: PALETTE.textMuted, fontSize: 10, letterSpacing: 3, fontWeight: 'bold' },

  modeRow: { flexDirection: 'row', gap: 10 },
  modeCard: {
    flex:            1,
    borderWidth:     1,
    borderRadius:    12,
    padding:         14,
    gap:             6,
    backgroundColor: PALETTE.bgCard,
    alignItems:      'center',
  },
  modeIcon:  { fontSize: 24 },
  modeLabel: { fontSize: 16, fontWeight: 'bold', letterSpacing: 2 },
  modeDesc:  { color: PALETTE.textDim, fontSize: 10, textAlign: 'center', lineHeight: 15 },
  modeSoon:  { color: PALETTE.textDim, fontSize: 9, letterSpacing: 2, marginTop: 2 },

  playerInfo:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  playerLabel:   { color: PALETTE.textMuted, fontSize: 12 },
  playerName:    { fontSize: 13, fontWeight: 'bold' },
  playerWarning: { color: PALETTE.upgradeRed + 'AA', fontSize: 10, fontStyle: 'italic' },

  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex:            1,
    borderWidth:     2,
    borderRadius:    12,
    padding:         16,
    alignItems:      'center',
    gap:             6,
    backgroundColor: PALETTE.bgCard,
  },
  actionBtnTxt: { fontSize: 15, fontWeight: 'bold', letterSpacing: 3 },
  actionBtnSub: { color: PALETTE.textDim, fontSize: 10, textAlign: 'center' },

  centeredSection: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
  createInfo:  { color: PALETTE.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18, paddingHorizontal: 20 },

  codeInput: {
    borderWidth:     2,
    borderColor:     PALETTE.upgradeBlue,
    borderRadius:    12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    color:           PALETTE.textPrimary,
    fontSize:        32,
    fontWeight:      'bold',
    letterSpacing:   14,
    textAlign:       'center',
    backgroundColor: PALETTE.bgCard,
    minWidth:        200,
  },

  bigBtn: {
    borderWidth:       2,
    borderRadius:      12,
    paddingVertical:   16,
    paddingHorizontal: 40,
    alignItems:        'center',
    backgroundColor:   PALETTE.bgCard,
  },
  bigBtnTxt: { fontSize: 16, fontWeight: 'bold', letterSpacing: 3 },

  errorTxt: { color: PALETTE.upgradeRed, fontSize: 12, textAlign: 'center', marginTop: 8 },

  roomSection: { flex: 1, gap: 20, alignItems: 'center' },

  roomCodeBox: {
    alignItems:      'center',
    gap:             6,
    backgroundColor: PALETTE.bgCard,
    borderWidth:     1,
    borderColor:     PALETTE.charge + '44',
    borderRadius:    14,
    paddingVertical: 20,
    paddingHorizontal: 40,
    width:           '100%',
  },
  roomCodeLabel: { color: PALETTE.textMuted, fontSize: 10, letterSpacing: 3 },
  roomCode:      { color: PALETTE.charge, fontSize: 44, fontWeight: 'bold', letterSpacing: 14 },
  roomCodeHint:  { color: PALETTE.textDim, fontSize: 11 },

  playersRow: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%' },
  playerSlot: {
    flex:            1,
    borderWidth:     1,
    borderColor:     PALETTE.border,
    borderRadius:    12,
    padding:         14,
    alignItems:      'center',
    gap:             4,
    backgroundColor: PALETTE.bgCard,
    minHeight:       90,
    justifyContent:  'center',
  },
  playerSlotLabel: { fontSize: 9, letterSpacing: 2, fontWeight: 'bold' },
  playerSlotName:  { fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  playerSlotYou:   { color: PALETTE.textDim, fontSize: 9 },
  playerSlotEmpty: { color: PALETTE.textDim, fontSize: 12, fontStyle: 'italic' },

  vsText: { color: PALETTE.textDim, fontSize: 18, fontWeight: 'bold' },

  roomInfo:     { flexDirection: 'row', gap: 20 },
  roomInfoItem: { color: PALETTE.textMuted, fontSize: 11 },

  waitingBox: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  waitingTxt: { color: PALETTE.textMuted, fontSize: 12, fontStyle: 'italic' },

  startBtn: {
    width:           '100%',
    borderWidth:     2,
    borderColor:     PALETTE.triangle,
    borderRadius:    12,
    paddingVertical: 16,
    alignItems:      'center',
    backgroundColor: PALETTE.triangle + '15',
  },
  startBtnTxt: { color: PALETTE.triangle, fontSize: 16, fontWeight: 'bold', letterSpacing: 3 },
});
