# RIFT

## Supabase hardening

Une migration SQL de durcissement est incluse ici:

- [supabase/migrations/20260326_hardening.sql](supabase/migrations/20260326_hardening.sql)

### Ce que fait la migration

- ajoute des contraintes de validation (`CHECK`) sur `game_rooms` et `scores`
- ajoute des indexes utiles pour le leaderboard global/daily
- migre l'unicite des scores vers la partition logique: `(player_name, shape, is_daily)`
- active RLS et remplace la policy `public_access` par des policies bornees

### Comment l'appliquer

1. Ouvre le dashboard Supabase de ton projet.
2. Va dans SQL Editor.
3. Colle le contenu de `supabase/migrations/20260326_hardening.sql`.
4. Execute le script une seule fois sur l'environnement cible.

### Ce qu'il reste pour une securite complete

La migration ci-dessus reste compatible avec le client actuel (sans auth). Pour fermer completement les risques de triche/sabotage:

1. Activer Supabase Auth (meme anonyme) et identifier chaque joueur via `auth.uid()`.
2. Refaire les policies RLS de `game_rooms` et `scores` pour qu'elles soient conditionnees par `auth.uid()` (plus de `using (true)`).
3. Option recommandee: passer les ecritures sensibles par des fonctions RPC `security definer` (join/start/update/finish), et retirer les `update/delete` directs depuis le client.
4. Ajouter un job de nettoyage (`cron`) pour supprimer les rooms `waiting` trop anciennes.