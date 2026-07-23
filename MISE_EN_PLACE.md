# Mise en place de MailMind AI

Ce document liste les actions necessaires apres les corrections du projet.

## 1. Configurer les variables d'environnement

Copier `.env.example` vers `.env`, puis renseigner les valeurs correspondant au meme projet Supabase.

Variables necessaires :

```env
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_PROJECT_ID=
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
AI_API_KEY=
AI_BASE_URL=https://api.imole.app/v1
AI_AUTH_HEADER=Authorization
AI_AUTH_PREFIX=Bearer
TOKEN_ENCRYPTION_KEY=
CRON_SECRET=
APP_ORIGIN=https://www.mailmind.me
APP_ORIGINS=http://localhost:5000,https://mailmind.me,https://www.mailmind.me
AI_ANALYSIS_MODEL=gpt-4o-mini
GMAIL_SYNC_MAX_MESSAGES=100
GMAIL_SYNC_QUERY=in:inbox newer_than:14d
```

### Regles de securite

- Ne jamais publier `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_OAUTH_CLIENT_SECRET`, `AI_API_KEY`, `TOKEN_ENCRYPTION_KEY` ou `CRON_SECRET`.
- Utiliser une valeur longue et aleatoire pour `TOKEN_ENCRYPTION_KEY`.
- Garder `.env` hors du depot Git. `.env.example` peut etre versionne.
- Le fichier `.env` historique du projet etait deja suivi par Git : verifier son historique et retirer toute cle sensible si necessaire.

## 2. Harmoniser Supabase

Les valeurs suivantes doivent appartenir au meme projet Supabase :

- `SUPABASE_URL`
- `VITE_SUPABASE_URL`
- `SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_PROJECT_ID`
- `supabase/config.toml`

Ne pas reutiliser les identifiants de plusieurs environnements.

## 3. Appliquer la migration SQL

La migration ajoute :

- `risk_reason`, `archived_at` et `reported_at` dans `public.emails`.
- La table `public.user_settings`.
- Les index necessaires.
- Les politiques RLS des preferences utilisateur.

Depuis le projet configure avec le bon environnement Supabase :

```bash
npx supabase login
npx supabase link --project-ref udfkcqhuhqpunvlhgpdc
npx supabase db push
```

Le login nécessite un access token Supabase. Il peut aussi être fourni temporairement via la variable `SUPABASE_ACCESS_TOKEN`.

Verifier ensuite que la migration suivante est bien appliquee :

```text
supabase/migrations/20260722220000_harden_mailmind.sql
```

## 4. Configurer Google OAuth

Dans Google Cloud Console :

- Ajouter l'URL de callback `APP_ORIGIN/api/gmail/callback` dans les URI de redirection autorisees.
- Autoriser les scopes Gmail `gmail.modify` et `gmail.send`.
- Verifier que le consentement OAuth correspond a l'environnement deploye.

Les comptes Gmail deja connectes doivent etre reconnectes afin d'obtenir les nouveaux scopes.

## 5. Configurer la synchronisation automatique

Le endpoint suivant est protege par `CRON_SECRET` :

```text
POST /api/public/hooks/sync-emails
```

Le fichier `vercel.json` demande une execution quotidienne a 03:00 UTC, compatible avec le plan Vercel Hobby. Une frequence plus elevee necessite Vercel Pro ou un ordonnanceur externe. Verifier que :

- `CRON_SECRET` est defini dans l'environnement de production.
- Le fournisseur de deployement active bien les cron jobs.
- Le endpoint recoit `Authorization: Bearer <CRON_SECRET>` ou `x-cron-secret`.

## 6. Verifier les fonctionnalites

Apres demarrage de l'application :

1. Creer un compte ou se connecter.
2. Connecter Gmail depuis `Parametres`.
3. Verifier la synchronisation initiale.
4. Verifier l'analyse IA et la justification du score de risque.
5. Tester les listes blanche et noire.
6. Tester la recherche globale et les filtres de l'inbox.
7. Tester archiver et signaler un e-mail.
8. Generer puis envoyer une reponse IA.
9. Modifier une preference et verifier sa persistance apres rechargement.
10. Telecharger les exports CSV et JSON.

## 7. Commandes de validation

```bash
pnpm install --frozen-lockfile
pnpm run lint
pnpm exec tsc --noEmit
pnpm run build
pnpm audit
```

Le build peut encore signaler un bundle client superieur a 500 Ko. Ce warning n'empeche pas le build, mais devra etre traite plus tard avec un decoupage de code supplementaire.

## 8. Deploiement

- Verifier que le runtime cible correspond au fournisseur choisi : le build Nitro actuel cible Cloudflare, tandis qu'un `vercel.json` est present.
- Definir toutes les variables secretes dans la plateforme de deploiement, pas dans le depot.
- Appliquer la migration avant la mise en production.
- Tester OAuth et le cron en production avec l'URL publique finale.
