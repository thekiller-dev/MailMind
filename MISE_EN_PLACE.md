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
GOOGLE_RISC_AUDIENCES=
AI_API_KEY=
AI_BASE_URL=https://api.imole.app/v1
AI_AUTH_HEADER=Authorization
AI_AUTH_PREFIX=Bearer
TOKEN_ENCRYPTION_KEY=
CRON_SECRET=
RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
TELEGRAM_WEBHOOK_SECRET=
INBOUND_EMAIL_DOMAIN=mailmind.me
APP_ORIGIN=https://www.mailmind.me
APP_ORIGINS=http://localhost:5000,https://mailmind.me,https://www.mailmind.me
AI_ANALYSIS_MODEL=gpt-4o-mini
GMAIL_SYNC_MAX_MESSAGES=100
GMAIL_SYNC_QUERY=in:inbox newer_than:14d
```

### Regles de securite

- Ne jamais publier `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_OAUTH_CLIENT_SECRET`, `AI_API_KEY`, `TOKEN_ENCRYPTION_KEY`, `CRON_SECRET`, `RESEND_API_KEY` ou `RESEND_WEBHOOK_SECRET`.
- Utiliser une valeur longue et aleatoire pour `TOKEN_ENCRYPTION_KEY`.
- Garder `.env` hors du depot Git. `.env.example` peut etre versionne.
- Le fichier `.env` historique du projet etait deja suivi par Git : verifier son historique et retirer toute cle sensible si necessaire.

### Callback Gmail OAuth

Dans Google Cloud Console → APIs et services → Identifiants → Client OAuth Web,
ajouter exactement cette URI de redirection autorisée en production :

```text
https://www.mailmind.me/api/gmail/callback
```

Pour le développement local, ajouter également :

```text
http://localhost:5000/api/gmail/callback
```

`APP_ORIGIN` doit rester égal à `https://www.mailmind.me` en production.

### Gmail API (chemin principal)

MailMind utilise d’abord l’API Gmail OAuth (`gmail.modify` + `gmail.send`) :

1. Paramètres → **Ajouter un compte Gmail**.
2. Autoriser MailMind dans Google.
3. Sync initiale au callback, puis sync manuelle ou cron quotidien (`0 3 * * *` sur Hobby).
4. Les alertes Telegram urgentes/phishing sont envoyées après l’analyse OAuth (variable `TELEGRAM_BOT_TOKEN` obligatoire aussi côté **Vercel**, pas seulement Supabase).

Scopes OAuth mail (client Google Cloud dédié aux boîtes) :

```text
openid email profile
https://www.googleapis.com/auth/gmail.modify
https://www.googleapis.com/auth/gmail.send
```

Le transfert Resend reste une **méthode alternative** dans Paramètres (section repliée).

Checklist Vercel production :

- `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_RISC_AUDIENCES` (client IDs Sign-In Google / Supabase, en plus du client Gmail)
- `TOKEN_ENCRYPTION_KEY`
- `APP_ORIGIN=https://www.mailmind.me`
- `APP_ORIGINS` incluant localhost + mailmind.me + www
- `CRON_SECRET`
- `TELEGRAM_BOT_TOKEN` (pour alertes post-sync OAuth)
- `AI_*` pour l’analyse

### Cross-Account Protection (RISC)

MailMind expose un receiver HTTPS :

```text
https://www.mailmind.me/api/public/hooks/risc
```

Sur un événement Google (compte compromis, tokens révoqués, sessions révoquées), MailMind :

- déconnecte les comptes Gmail matchés (`provider_account_id` = Google `sub`)
- efface les tokens OAuth stockés
- invalide les sessions Supabase des utilisateurs concernés

Checklist Google Cloud (même projet que les clients OAuth) :

1. Activer l’API **RISC** et accepter les [RISC Terms](https://console.cloud.google.com/tos?id=risc).
2. Créer un service account avec le rôle **RISC Configuration Admin** (`roles/riscconfigs.admin`) et une clé JSON **locale uniquement**.
3. S’assurer que `mailmind.me` est un domaine autorisé de l’écran de consentement OAuth.
4. Déployer l’app, appliquer la migration `risc_security_events`, puis enregistrer le stream :

```bash
set GOOGLE_RISC_SERVICE_ACCOUNT_JSON=C:\path\to\risc-sa.json
node scripts/register-risc-stream.mjs
node scripts/register-risc-stream.mjs --verify
```

5. Dans le dossier de vérification Google, indiquer que Cross-Account Protection est implémenté sur l’URL ci-dessus.

Ne jamais uploader la clé du service account RISC sur Vercel : elle sert uniquement à l’enregistrement du stream.

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
- Les métadonnées nécessaires aux adresses privées de transfert.
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

## 4. Configurer la réception Resend

Dans Resend :

- Activer `Receiving` pour `mailmind.me`.
- Créer un webhook pour l'événement `email.received`.
- Utiliser l'URL `https://udfkcqhuhqpunvlhgpdc.supabase.co/functions/v1/resend-inbound`.
- Copier son secret de signature dans `RESEND_WEBHOOK_SECRET`.

Déployer et configurer l'Edge Function :

```bash
npx supabase secrets set RESEND_API_KEY=... RESEND_WEBHOOK_SECRET=...
npx supabase secrets set AI_API_KEY=... AI_BASE_URL=https://api.imole.app/v1
npx supabase secrets set AI_AUTH_HEADER=Authorization AI_AUTH_PREFIX=Bearer
npx supabase secrets set AI_ANALYSIS_MODEL=gpt-4o-mini
npx supabase functions deploy resend-inbound
```

Les variables `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont fournies automatiquement aux Edge Functions déployées.

Configurer également Resend comme SMTP personnalisé dans Supabase Auth afin de fiabiliser les confirmations d'inscription.

## 5. Personnaliser les e-mails Supabase Auth

Les modèles MailMind sont disponibles dans `supabase/templates/` :

- `confirmation.html` : confirmation d'inscription ;
- `recovery.html` : réinitialisation du mot de passe ;
- `invite.html` : invitation ;
- `email-change.html` : changement d'adresse.

Dans Supabase Dashboard :

1. Ouvrir `Authentication` → `Email Templates`.
2. Choisir le modèle à modifier.
3. Copier le contenu du fichier HTML correspondant dans l'éditeur.
4. Conserver les variables Supabase, notamment `{{ .ConfirmationURL }}`, `{{ .Email }}` et `{{ .NewEmail }}` selon le modèle.
5. Enregistrer, puis envoyer un e-mail de test.

Les modèles utilisent le branding clair MailMind et des boutons compatibles avec les clients e-mail. Les liens de confirmation ne doivent pas être remplacés par des URLs codées en dur.

## 6. Configurer Telegram

Dans Telegram, ouvrir `@BotFather` :

1. Exécuter `/newbot`.
2. Choisir le nom et le username du bot, qui doit finir par `bot`.
3. Conserver le token retourné uniquement dans les secrets Supabase/Vercel.
4. Définir un secret aléatoire pour `TELEGRAM_WEBHOOK_SECRET`.

Configurer les secrets Supabase :

```bash
npx supabase secrets set TELEGRAM_BOT_TOKEN=... TELEGRAM_BOT_USERNAME=...
npx supabase secrets set TELEGRAM_WEBHOOK_SECRET=...
```

Déployer la fonction :

```bash
npx supabase functions deploy telegram-webhook --no-verify-jwt
```

Puis enregistrer le webhook Telegram, depuis une machine qui possède le token :

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://udfkcqhuhqpunvlhgpdc.supabase.co/functions/v1/telegram-webhook","secret_token":"<TELEGRAM_WEBHOOK_SECRET>","allowed_updates":["message"]}'
```

Dans MailMind : Paramètres → Notifications → Telegram → Lier Telegram.
Le lien est à usage unique et expire après 15 minutes.

Commandes disponibles après liaison :
`/help`, `/status`, `/digest`, `/alerts` et `/unlink`.

Les alertes urgentes et phishing sont envoyées après analyse. Pour rester
compatible avec Vercel Hobby, le digest Telegram est déclenché une fois par
jour à 08:00 UTC via `/api/public/hooks/telegram-digest`. Cette précision
réduite peut ne pas correspondre exactement à l'heure locale choisie par tous
les utilisateurs ; le planning local précis nécessite un plan Vercel
compatible avec les cron jobs fréquents. Cette route exige `CRON_SECRET`.

## 7. Synchronisation Gmail historique (optionnelle)

Le endpoint suivant est protege par `CRON_SECRET` :

```text
POST /api/public/hooks/sync-emails
```

Le fichier `vercel.json` demande une execution quotidienne a 03:00 UTC, compatible avec le plan Vercel Hobby. Une frequence plus elevee necessite Vercel Pro ou un ordonnanceur externe. Verifier que :

- `CRON_SECRET` est defini dans l'environnement de production.
- Le fournisseur de deployement active bien les cron jobs.
- Le endpoint recoit `Authorization: Bearer <CRON_SECRET>` ou `x-cron-secret`.

## 8. Verifier les fonctionnalites

Apres demarrage de l'application :

1. Creer un compte ou se connecter.
2. Créer une adresse de transfert depuis `Parametres`.
3. L'ajouter dans Gmail et vérifier que le code de confirmation apparaît.
4. Activer le transfert Gmail et envoyer un message de test.
5. Verifier l'analyse IA et la justification du score de risque.
6. Tester les listes blanche et noire.
7. Tester la recherche globale et les filtres de l'inbox.
8. Vérifier que les actions Gmail indisponibles ne sont pas proposées pour un message transféré.
9. Générer une suggestion de réponse IA sans envoi direct.
10. Modifier une preference et verifier sa persistance apres rechargement.
11. Telecharger les exports CSV et JSON.
12. Lier Telegram puis tester `/status`, `/digest`, `/alerts` et `/unlink`.
13. Envoyer un e-mail urgent ou phishing et vérifier l’alerte Telegram.

## 9. Commandes de validation

```bash
pnpm install --frozen-lockfile
pnpm run lint
pnpm exec tsc --noEmit
pnpm run build
pnpm audit
```

Le build peut encore signaler un bundle client superieur a 500 Ko. Ce warning n'empeche pas le build, mais devra etre traite plus tard avec un decoupage de code supplementaire.

## 10. Deploiement

- Le build Nitro cible Vercel, conformément à `vercel.json`.
- Definir toutes les variables secretes dans la plateforme de deploiement, pas dans le depot.
- Appliquer la migration avant la mise en production.
- Tester le webhook Resend et le cron en production avec l'URL publique finale.
- Vérifier les secrets Telegram et les deux crons (`sync-emails`, `telegram-digest`).
