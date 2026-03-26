/**
 * RIFT — Leaderboard Service
 * Soumission et récupération des scores via Supabase
 */

import { supabase } from './supabase';

/** Date du jour au format YYYY-MM-DD */
export function todayDateStr() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Soumet un score après une run.
 * Fire-and-forget — ne bloque pas le jeu si offline.
 */
export async function submitScore({ playerName, score, shape, kills, layers, won, isDaily = false }) {
  if (!playerName?.trim()) return;

  const { error } = await supabase.from('scores').insert({
    player_name: playerName.trim().slice(0, 16),
    score,
    shape,
    kills,
    layers,
    won,
    is_daily:   isDaily,
    daily_date: isDaily ? todayDateStr() : null,
  });

  if (error) console.warn('[Supabase] submitScore:', error.message);
}

/**
 * Top N scores de tous les temps.
 * Retourne [] si erreur ou offline.
 */
export async function fetchTopScores(limit = 10) {
  const { data, error } = await supabase
    .from('scores')
    .select('player_name, score, shape, kills, layers, won, created_at')
    .order('score', { ascending: false })
    .limit(limit);

  if (error) { console.warn('[Supabase] fetchTopScores:', error.message); return []; }
  return data || [];
}

/**
 * Top N scores du jour (Daily Run).
 */
export async function fetchDailyScores(limit = 10) {
  const { data, error } = await supabase
    .from('scores')
    .select('player_name, score, shape, kills, layers, won, created_at')
    .eq('is_daily', true)
    .eq('daily_date', todayDateStr())
    .order('score', { ascending: false })
    .limit(limit);

  if (error) { console.warn('[Supabase] fetchDailyScores:', error.message); return []; }
  return data || [];
}

/**
 * Récupère le rang du joueur dans le leaderboard global.
 * Retourne null si pas trouvé ou erreur.
 */
export async function fetchPlayerRank(playerName, score) {
  const { count, error } = await supabase
    .from('scores')
    .select('id', { count: 'exact', head: true })
    .gt('score', score);

  if (error) return null;
  return (count || 0) + 1;
}
