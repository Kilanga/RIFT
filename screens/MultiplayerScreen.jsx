/**
 * RIFT — MultiplayerScreen
 * Lobby 1v1 et Co-op via Supabase Realtime
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useGameStore from '../store/gameStore';
import { PALETTE, PLAYER_SHAPES } from '../constants';
import {
  createRoom, joinRoom, startGame, leaveRoom,
  subscribeToRoom,
} from '../services/multiplayerService';

const MODES = [
  {
    id: '1v1',
    label: '1 VS 1',
    icon: '⚔',
    desc: 'Compétitif — même carte, même seed.\nCelui qui termine avec le plus de points gagne.',
    color: PALETTE.upgradeRed,
  },
  {
    id: 'coop',
    label: 'CO-OP',
    icon: '🤝',
    desc: 'Coopératif — progressez ensemble sur la même carte.\n(Bientôt disponible)',
    color: PALETTE.upgradeGreen,
    disabled: true,
  },
];

export default function MultiplayerScreen() {
  const goToMenu   = useGameStore(s => s.goToMenu);
  const startRun   = useGameStore(s => s.startRun);
  const meta       = useGameStore(s => s.meta);
  const playerName = meta.playerName || 'Joueur';

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
      setError(e.message || 'Impossible de créer la room');
    } finally {
      setLoading(false);
    }
  };

  // ── Rejoindre une room ──────────────────────────────────────────────────────

  const handleJoin = async () => {
    if (codeInput.length < 4) { setError('Code à 4 caractères'); return; }
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
      setError(e.message || 'Impossible de rejoindre la room');
    } finally {
      setLoading(false);
    }
  };

  // ── Démarrer la partie (hôte uniquement) ───────────────────────────────────

  const handleStart = async () => {
    if (!room?.guest_name) { setError('En attente d\'un adversaire…'); return; }
    setLoading(true);
    try {
      await startGame(room.code);
      handleGameStart(room.code, room.seed, 'host');
    } catch (e) {
      setError(e.message || 'Erreur au démarrage');
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
            <Text style={styles.back}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.title}>MULTIJOUEUR</Text>
          <View style={{ width: 72 }} />
        </View>

        {/* ── LOBBY ── */}
        {screen === 'lobby' && (
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

            {/* Sélection de mode */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>MODE DE JEU</Text>
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
                      {m.label}
                    </Text>
                    <Text style={styles.modeDesc}>{m.desc}</Text>
                    {m.disabled && <Text style={styles.modeSoon}>BIENTÔT</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Pseudo */}
            <View style={styles.playerInfo}>
              <Text style={styles.playerLabel}>Joueur :</Text>
              <Text style={[styles.playerName, { color: PALETTE.triangle }]}>{playerName}</Text>
              {!meta.playerName && (
                <Text style={styles.playerWarning}> (configure ton pseudo dans le menu)</Text>
              )}
            </View>

            {/* Actions */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: PALETTE.triangle }]}
                onPress={() => { clearError(); setScreen('create'); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.actionBtnTxt, { color: PALETTE.triangle }]}>+ CRÉER</Text>
                <Text style={styles.actionBtnSub}>Génère un code à partager</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: PALETTE.upgradeBlue }]}
                onPress={() => { clearError(); setScreen('join'); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.actionBtnTxt, { color: PALETTE.upgradeBlue }]}>→ REJOINDRE</Text>
                <Text style={styles.actionBtnSub}>Entre le code de ton ami</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        )}

        {/* ── CRÉER ── */}
        {screen === 'create' && (
          <View style={styles.centeredSection}>
            <Text style={styles.sectionTitle}>CRÉER UNE ROOM — {mode.toUpperCase()}</Text>
            <Text style={styles.createInfo}>
              Une room sera créée et un code de 4 lettres sera généré.
              Partage-le avec un ami pour jouer ensemble.
            </Text>
            <TouchableOpacity
              style={[styles.bigBtn, { borderColor: PALETTE.triangle }]}
              onPress={handleCreate}
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={PALETTE.triangle} />
                : <Text style={[styles.bigBtnTxt, { color: PALETTE.triangle }]}>CRÉER LA ROOM</Text>
              }
            </TouchableOpacity>
            {error ? <Text style={styles.errorTxt}>{error}</Text> : null}
          </View>
        )}

        {/* ── REJOINDRE ── */}
        {screen === 'join' && (
          <View style={styles.centeredSection}>
            <Text style={styles.sectionTitle}>REJOINDRE UNE ROOM</Text>
            <Text style={styles.createInfo}>Saisis le code à 4 lettres de ton ami.</Text>
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
                : <Text style={[styles.bigBtnTxt, { color: PALETTE.upgradeBlue }]}>REJOINDRE</Text>
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
              <Text style={styles.roomCodeLabel}>CODE DE LA ROOM</Text>
              <Text style={styles.roomCode}>{room.code}</Text>
              <Text style={styles.roomCodeHint}>Partage ce code avec ton adversaire</Text>
            </View>

            {/* Joueurs */}
            <View style={styles.playersRow}>
              <PlayerSlot
                name={room.host_name}
                label="HÔTE"
                color={PALETTE.triangle}
                isYou={role === 'host'}
                ready={true}
              />
              <Text style={styles.vsText}>VS</Text>
              <PlayerSlot
                name={room.guest_name}
                label="INVITÉ"
                color={PALETTE.circle}
                isYou={role === 'guest'}
                ready={!!room.guest_name}
              />
            </View>

            {/* Infos */}
            <View style={styles.roomInfo}>
              <Text style={styles.roomInfoItem}>Mode : {room.mode.toUpperCase()}</Text>
              <Text style={styles.roomInfoItem}>Seed : #{room.seed}</Text>
            </View>

            {/* Status */}
            {!room.guest_name && (
              <View style={styles.waitingBox}>
                <ActivityIndicator color={PALETTE.textMuted} size="small" />
                <Text style={styles.waitingTxt}>En attente d'un adversaire…</Text>
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
                  : <Text style={styles.startBtnTxt}>▶  LANCER LA PARTIE</Text>
                }
              </TouchableOpacity>
            )}

            {role === 'guest' && room.guest_name && (
              <View style={styles.waitingBox}>
                <ActivityIndicator color={PALETTE.triangle} size="small" />
                <Text style={styles.waitingTxt}>En attente que l'hôte lance la partie…</Text>
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

function PlayerSlot({ name, label, color, isYou, ready }) {
  return (
    <View style={[styles.playerSlot, ready && { borderColor: color + '55' }]}>
      <Text style={[styles.playerSlotLabel, { color: PALETTE.textDim }]}>{label}</Text>
      {ready ? (
        <>
          <Text style={[styles.playerSlotName, { color }]}>{name}</Text>
          {isYou && <Text style={styles.playerSlotYou}>(toi)</Text>}
        </>
      ) : (
        <Text style={styles.playerSlotEmpty}>En attente…</Text>
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
