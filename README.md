# KërClim — Version de production

Plateforme web pour l’installation, l’entretien et la réparation de climatiseurs.

Contenu : espace client, espace technicien, administration, demandes, devis, interventions, avis, notifications et sécurité Supabase/RLS.

## Fichiers
- `index.html` : structure et écran d’accueil
- `style.css` : styles complémentaires
- `app.js` : logique de l’application et connexion Supabase
- `logo.png` / `favicon.svg` : identité visuelle KërClim
- `supabase_coherent.sql` : correctif SQL à utiliser uniquement après vérification de la structure actuelle
- `supabase_grosse_version.sql` : ancien script de grosse version ; **ne pas l’exécuter aveuglément** sur une base déjà configurée

## Mise en ligne
1. Décompresser le ZIP.
2. Publier `index.html`, `app.js`, `style.css`, `logo.png` et `favicon.svg` sur l’hébergement.
3. Ne pas remplacer ni réinitialiser la base Supabase avec un ancien SQL sans vérifier la structure actuelle.
4. L’URL et la clé publishable du projet Supabase sont déjà configurées dans `app.js`.
