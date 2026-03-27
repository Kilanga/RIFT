/**
 * RIFT — Client Supabase
 * Connexion à la base de données online pour le leaderboard
 *
 * Les credentials sont lus depuis les variables d'environnement (fichier .env).
 * Ne jamais hardcoder ces valeurs dans le code source.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error('[Supabase] Variables d\'environnement manquantes. Vérifier le fichier .env');
}

export const supabase =
  SUPABASE_URL && SUPABASE_ANON
    ? createClient(SUPABASE_URL, SUPABASE_ANON)
    : null;
