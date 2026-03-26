/**
 * RIFT — Client Supabase
 * Connexion à la base de données online pour le leaderboard
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = 'https://lvjtaduugtrdbuwpyvmw.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2anRhZHV1Z3RyZGJ1d3B5dm13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NzczMTQsImV4cCI6MjA5MDA1MzMxNH0.VVe1HI2pZrHywcnc_TazareSPzsbRyS9RmfjV6UnDYo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
