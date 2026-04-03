/**
 * RIFT — Leaderboard Service
 * Soumission et récupération des scores via Supabase
 */

import { supabase } from './supabase';

function isNetworkFailure(error) {
  const msg = String(error?.message || error || '').toLowerCase();
  return msg.includes('network request failed') || msg.includes('failed to fetch');
}

const SUPABASE_URL  = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON?.trim();

async function fetchScoresViaRest({ limit = 10, daily = false }) {
  if (!SUPABASE_URL || !SUPABASE_ANON) return [];

  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 10));
  const base = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/scores`;
  const select = 'player_name,score,shape,kills,layers,won,created_at';
  const dailyFilter = daily ? `&is_daily=eq.true&daily_date=eq.${todayDateStr()}` : '';
  const url = `${base}?select=${select}${dailyFilter}&order=score.desc&limit=${safeLimit}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        apikey:        SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`,
      },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json) ? json : [];
  } catch {
    return [];
  }
}

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
const VALID_SHAPES = ['triangle', 'circle', 'hexagon', 'spectre', 'shadow', 'paladin'];

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
  if (!supabase) {
    return await fetchScoresViaRest({ limit, daily: false });
  }
  try {
    const { data, error } = await supabase
      .from('scores')
      .select('player_name, score, shape, kills, layers, won, created_at')
      .order('score', { ascending: false })
      .limit(limit);

    if (error) {
      if (isNetworkFailure(error)) return await fetchScoresViaRest({ limit, daily: false });
      console.warn('[Supabase] fetchTopScores:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    if (isNetworkFailure(err)) return await fetchScoresViaRest({ limit, daily: false });
    console.warn('[Supabase] fetchTopScores:', String(err?.message || err));
    return [];
  }
}

/**
 * Top N scores du jour (Daily Run).
 */
export async function fetchDailyScores(limit = 10) {
  if (!supabase) {
    return await fetchScoresViaRest({ limit, daily: true });
  }
  try {
    const { data, error } = await supabase
      .from('scores')
      .select('player_name, score, shape, kills, layers, won, created_at')
      .eq('is_daily', true)
      .eq('daily_date', todayDateStr())
      .order('score', { ascending: false })
      .limit(limit);

    if (error) {
      if (isNetworkFailure(error)) return await fetchScoresViaRest({ limit, daily: true });
      console.warn('[Supabase] fetchDailyScores:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    if (isNetworkFailure(err)) return await fetchScoresViaRest({ limit, daily: true });
    console.warn('[Supabase] fetchDailyScores:', String(err?.message || err));
    return [];
  }
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
