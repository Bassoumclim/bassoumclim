# BassoumClim — Grosse version

Plateforme web pour l'installation et l'entretien de climatiseurs.

Contenu : client, technicien, administration, demandes, devis, interventions, avis, notifications et sécurité Supabase/RLS.

## Mise en ligne
1. Décompresser le ZIP.
2. Importer les fichiers dans le dépôt GitHub/Vercel.
3. Si nécessaire, exécuter `supabase_grosse_version.sql` dans Supabase SQL Editor.
4. L'URL et la clé publishable du projet BassoumClim sont déjà configurées dans `app.js`.


## Connexion Supabase
Cette version est déjà configurée avec l'URL Supabase et la clé publishable du projet BassoumClim.
Pour activer le workflow complet, exécute `supabase_grosse_version.sql` une fois dans Supabase > SQL Editor.
Ensuite redéploie le contenu du dossier sur GitHub/Vercel.
La clé `sb_publishable_...` est une clé publique destinée au client web ; ne mets jamais une clé `service_role` dans `app.js`.
