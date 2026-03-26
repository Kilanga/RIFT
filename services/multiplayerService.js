/**
 * RIFT — Multiplayer Service
 * Gestion des rooms multijoueur via Supabase Realtime
 *
 * SQL à exécuter dans Supabase (Dashboard → SQL Editor) :
 *
 * CREATE TABLE IF NOT EXISTS game_rooms (
 *   id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
 *   code        TEXT    UNIQUE NOT NULL,
 *   mode        TEXT    NOT NULL DEFAULT '1v1',   -- '1v1' | 'coop'
 *   host_name   TEXT    NOT NULL,
 *   guest_name  TEXT,
 *   seed        INTEGER NOT NULL,
 *   status      TEXT    NOT NULL DEFAULT 'waiting',  -- 'waiting'|'playing'|'finished'
 *   host_score  INTEGER DEFAULT 0,
 *   guest_score INTEGER DEFAULT 0,
 *   host_layer  INTEGER DEFAULT 0,
 *   guest_layer INTEGER DEFAULT 0,
 *   host_alive  BOOLEAN DEFAULT true,
 *   guest_alive BOOLEAN DEFAULT true,
 *   created_at  TIMESTAMPTZ DEFAULT NOW()
 * );
 * ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "public_access" ON game_rooms FOR ALL USING (true) WITH CHECK (true);
 */

import { supabase } from './supabase';

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
  const code = generateCode();
  const seed = randomSeed();

  const { data, error } = await supabase
    .from('game_rooms')
    .insert({ code, mode, host_name: playerName, seed })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Rejoindre une room ────────────────────────────────────────────────────────

export async function joinRoom(code, playerName) {
  const { data: room, error: fetchErr } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .single();

  if (fetchErr || !room) throw new Error('Room introuvable');
  if (room.status !== 'waiting') throw new Error('Cette partie a déjà commencé');
  if (room.guest_name) throw new Error('Room déjà complète');
  if (room.host_name === playerName) throw new Error('Tu es déjà dans cette room');

  const { data, error } = await supabase
    .from('game_rooms')
    .update({ guest_name: playerName })
    .eq('code', code.toUpperCase())
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Démarrer la partie ────────────────────────────────────────────────────────

export async function startGame(code) {
  const { error } = await supabase
    .from('game_rooms')
    .update({ status: 'playing' })
    .eq('code', code);

  if (error) throw error;
}

// ─── Mettre à jour l'état d'un joueur ─────────────────────────────────────────

export async function updatePlayerState(code, role, state) {
  // role = 'host' | 'guest'
  const update = {};
  if (state.score   !== undefined) update[`${role}_score`]  = state.score;
  if (state.layer   !== undefined) update[`${role}_layer`]  = state.layer;
  if (state.alive   !== undefined) update[`${role}_alive`]  = state.alive;

  const { error } = await supabase
    .from('game_rooms')
    .update(update)
    .eq('code', code);

  if (error) console.warn('updatePlayerState error:', error);
}

// ─── Terminer la partie ────────────────────────────────────────────────────────

export async function finishGame(code) {
  const { error } = await supabase
    .from('game_rooms')
    .update({ status: 'finished' })
    .eq('code', code);

  if (error) console.warn('finishGame error:', error);
}

// ─── Quitter / supprimer la room ───────────────────────────────────────────────

export async function leaveRoom(code) {
  await supabase.from('game_rooms').delete().eq('code', code);
}

// ─── S'abonner aux mises à jour en temps réel ─────────────────────────────────

export function subscribeToRoom(code, onUpdate) {
  const channel = supabase
    .channel(`room_${code}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'game_rooms', filter: `code=eq.${code}` },
      (payload) => onUpdate(payload.new)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// ─── Récupérer l'état actuel de la room ───────────────────────────────────────

export async function getRoom(code) {
  const { data, error } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .single();

  if (error) throw error;
  return data;
}
