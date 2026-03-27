/**
 * RIFT — Multiplayer Service
 * Gestion des rooms multijoueur via Supabase Realtime
 *
 * SQL : utiliser la migration de durcissement
 * `supabase/migrations/20260326_hardening.sql`
 */

import { supabase } from './supabase';

function ensureSupabase() {
  if (!supabase) throw new Error('Service en ligne indisponible. Vérifie la configuration Supabase.');
}

function normalizeCode(code) {
  return (code || '').toUpperCase().slice(0, 4);
}

function isUniqueViolation(error) {
  return error?.code === '23505' || /duplicate key|unique/i.test(error?.message || '');
}

// ─── Génération de code room ───────────────────────────────────────────────────

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function randomSeed() {
  return Math.floor(Math.random() * 999999) + 1;
}

// ─── Créer une room ────────────────────────────────────────────────────────────

export async function createRoom(playerName, mode = '1v1') {
  ensureSupabase();
  const safeName = (playerName || '').trim().slice(0, 16);
  if (safeName.length < 2) throw new Error('Pseudo trop court');
  const safeMode = ['1v1', 'coop'].includes(mode) ? mode : '1v1';

  // Retry sur collision de code (contrainte UNIQUE)
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const seed = randomSeed();

    const { data, error } = await supabase
      .from('game_rooms')
      .insert({ code, mode: safeMode, host_name: safeName, seed })
      .select()
      .single();

    if (!error) return data;
    if (!isUniqueViolation(error)) throw error;
  }

  throw new Error('Impossible de générer un code room unique. Réessaie.');
}

// ─── Rejoindre une room ────────────────────────────────────────────────────────

export async function joinRoom(code, playerName) {
  ensureSupabase();
  const safeName = (playerName || '').trim().slice(0, 16);
  if (safeName.length < 2) throw new Error('Pseudo trop court');
  const safeCode = normalizeCode(code);
  if (safeCode.length !== 4) throw new Error('Code invalide');

  const { data: room, error: fetchErr } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('code', safeCode)
    .single();

  if (fetchErr || !room) throw new Error('Room introuvable');
  if (room.status !== 'waiting') throw new Error('Cette partie a déjà commencé');
  if (room.guest_name) throw new Error('Room déjà complète');
  if (room.host_name === safeName) throw new Error('Tu es déjà dans cette room');

  const { data, error } = await supabase
    .from('game_rooms')
    .update({ guest_name: safeName })
    .eq('code', safeCode)
    .eq('status', 'waiting')
    .is('guest_name', null)
    .select()
    .single();

  if (error || !data) throw new Error('Room indisponible (déjà rejointe ou démarrée)');
  return data;
}

// ─── Démarrer la partie ────────────────────────────────────────────────────────

export async function startGame(code) {
  ensureSupabase();
  const safeCode = normalizeCode(code);
  const { error } = await supabase
    .from('game_rooms')
    .update({ status: 'playing' })
    .eq('code', safeCode);

  if (error) throw error;
}

// ─── Mettre à jour l'état d'un joueur ─────────────────────────────────────────

export async function updatePlayerState(code, role, state) {
  ensureSupabase();
  const safeCode = normalizeCode(code);
  if (safeCode.length !== 4) return;
  // role = 'host' | 'guest'
  if (!['host', 'guest'].includes(role)) return;
  const update = {};
  if (state.score !== undefined) update[`${role}_score`] = Math.max(0, Math.min(9999, Math.floor(Number(state.score) || 0)));
  if (state.layer !== undefined) update[`${role}_layer`] = Math.max(0, Math.min(30,   Math.floor(Number(state.layer) || 0)));
  if (state.alive !== undefined) update[`${role}_alive`] = Boolean(state.alive);

  const { error } = await supabase
    .from('game_rooms')
    .update(update)
    .eq('code', safeCode);

  if (error) console.warn('updatePlayerState error:', error);
}

// ─── Terminer la partie ────────────────────────────────────────────────────────

export async function finishGame(code) {
  ensureSupabase();
  const safeCode = normalizeCode(code);
  const { error } = await supabase
    .from('game_rooms')
    .update({ status: 'finished' })
    .eq('code', safeCode);

  if (error) console.warn('finishGame error:', error);
}

// ─── Quitter / supprimer la room ───────────────────────────────────────────────

export async function leaveRoom(code) {
  ensureSupabase();
  const safeCode = normalizeCode(code);
  if (safeCode.length !== 4) return;
  await supabase.from('game_rooms').delete().eq('code', safeCode);
}

// ─── S'abonner aux mises à jour en temps réel ─────────────────────────────────

export function subscribeToRoom(code, onUpdate) {
  if (!supabase) return () => {};
  const safeCode = normalizeCode(code);
  if (safeCode.length !== 4) return () => {};

  const channel = supabase
    .channel(`room_${safeCode}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'game_rooms', filter: `code=eq.${safeCode}` },
      (payload) => onUpdate(payload.new)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// ─── Récupérer l'état actuel de la room ───────────────────────────────────────

export async function getRoom(code) {
  ensureSupabase();
  const safeCode = normalizeCode(code);
  if (safeCode.length !== 4) throw new Error('Code invalide');

  const { data, error } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('code', safeCode)
    .single();

  if (error) throw error;
  return data;
}
