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
// Valeurs maximales théoriquement atteignables dans le jeu
const MAX_SCORE  = 9999;
const MAX_KILLS  = 500;
const MAX_LAYERS = 30;
const VALID_SHAPES = ['triangle', 'circle', 'hexagon', 'spectre'];

export async function submitScore({ playerName, score, shape, kills, layers, won, isDaily = false }) {
  if (!supabase) return;
  if (!playerName?.trim()) return;

  // Clamping défensif — rejette les valeurs impossibles en jeu normal
  const safeName   = playerName.trim().slice(0, 22);
  const safeScore  = Math.max(0, Math.min(MAX_SCORE,  Math.floor(Number(score)  || 0)));
  const safeKills  = Math.max(0, Math.min(MAX_KILLS,  Math.floor(Number(kills)  || 0)));
  const safeLayers = Math.max(0, Math.min(MAX_LAYERS, Math.floor(Number(layers) || 0)));
  const safeShape  = VALID_SHAPES.includes(shape) ? shape : 'triangle';
  const safeWon    = Boolean(won);

  // Un seul score (le meilleur) par joueur × personnage
  const { data: existing, error: fetchErr } = await supabase
    .from('scores')
    .select('id, score')
    .eq('player_name', safeName)
    .eq('shape', safeShape)
    .eq('is_daily', Boolean(isDaily))
    .maybeSingle();

  if (fetchErr) { console.warn('[Supabase] submitScore fetch:', fetchErr.message); return; }

  const payload = {
    score:      safeScore,
    kills:      safeKills,
    layers:     safeLayers,
    won:        safeWon,
    is_daily:   isDaily,
    daily_date: isDaily ? todayDateStr() : null,
  };

  if (existing) {
    // Mise à jour uniquement si le nouveau score est meilleur
    if (safeScore <= existing.score) return;
    const { error } = await supabase.from('scores').update(payload).eq('id', existing.id);
    if (error) console.warn('[Supabase] submitScore update:', error.message);
  } else {
    // Première entrée pour ce joueur × personnage
    const { error } = await supabase.from('scores').insert({ player_name: safeName, shape: safeShape, ...payload });
    if (error) console.warn('[Supabase] submitScore insert:', error.message);
  }
}

/**
 * Top N scores de tous les temps.
 * Retourne [] si erreur ou offline.
 */
export async function fetchTopScores(limit = 10) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('scores')
    .select('player_name, score, shape, kills, layers, won, created_at')
    .order('score', { ascending: false })
    .limit(limit);

  if (error) { if (error.message !== 'Network request failed') console.warn('[Supabase] fetchTopScores:', error.message); return []; }
  return data || [];
}

/**
 * Top N scores du jour (Daily Run).
 */
export async function fetchDailyScores(limit = 10) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('scores')
    .select('player_name, score, shape, kills, layers, won, created_at')
    .eq('is_daily', true)
    .eq('daily_date', todayDateStr())
    .order('score', { ascending: false })
    .limit(limit);

  if (error) { if (error.message !== 'Network request failed') console.warn('[Supabase] fetchDailyScores:', error.message); return []; }
  return data || [];
}

/**
 * Récupère le rang du joueur dans le leaderboard global.
 * Retourne null si pas trouvé ou erreur.
 */
export async function fetchPlayerRank(playerName, score) {
  if (!supabase) return null;
  const { count, error } = await supabase
    .from('scores')
    .select('id', { count: 'exact', head: true })
    .gt('score', score);

  if (error) return null;
  return (count || 0) + 1;
}
