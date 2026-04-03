/**
 * RIFT — Client Supabase
 * Connexion à la base de données online pour le leaderboard
 *
 * Les credentials sont lus depuis les variables d'environnement (fichier .env).
 * Ne jamais hardcoder ces valeurs dans le code source.
 */

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL  = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON?.trim();

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error('[Supabase] Variables d\'environnement manquantes. Vérifier le fichier .env');
}

export const supabase =
  SUPABASE_URL && SUPABASE_ANON
    ? createClient(SUPABASE_URL, SUPABASE_ANON, {
        auth: {
          storage:           AsyncStorage,
          autoRefreshToken:  true,
          persistSession:    true,
          detectSessionInUrl: false,
        },
      })
    : null;
