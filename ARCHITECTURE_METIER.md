# Architecture métier de MailMind

## Base de données retenue

MailMind utilise **Supabase**, avec **PostgreSQL** comme base principale.

Ce choix couvre les besoins du produit :

- Authentification et sessions via Supabase Auth.
- Données relationnelles et contraintes via PostgreSQL.
- Row Level Security pour isoler chaque utilisateur.
- Realtime pour rafraîchir l'inbox et les comptes synchronisés.
- Migrations SQL versionnées dans `supabase/migrations/`.
- Supabase Queues (`pgmq`) pour rendre les synchronisations Gmail durables.

Il n'est pas nécessaire d'ajouter MongoDB, Firebase ou une seconde base pour le périmètre actuel. Le contenu des e-mails, les analyses IA, les comptes connectés et les préférences sont relationnels et doivent rester transactionnels.

## Modèle de données actuel

### `auth.users`

Table gérée par Supabase Auth. Elle contient l'identité technique de l'utilisateur, son e-mail et les informations de session.

### `profiles`

Profil applicatif lié à `auth.users` : nom, avatar, dates de création et de mise à jour.

### `email_accounts`

Un compte Gmail connecté par utilisateur.

- Identité : `provider`, `provider_account_id`, `email`, `display_name`.
- État : `status`, `last_synced_at`, `error`.
- Synchronisation : `history_id`, scopes et dates de token.
- Secrets : `access_token` et `refresh_token`, réservés au serveur et chiffrés avec AES-256-GCM.

Le navigateur ne doit lire que les colonnes publiques de cette table.

### `emails`

Un message synchronisé et son résultat d'analyse.

- Identité Gmail : `provider_message_id`, `thread_id`.
- Contenu : expéditeur, sujet, snippet et corps.
- Métadonnées : date de réception et compte source.
- Analyse : résumé, catégorie, intention, sentiment, entités, score et justification.
- État utilisateur : `archived_at`, `reported_at`.

### `user_settings`

Préférences JSONB versionnées par utilisateur : sensibilité, listes blanche/noire, notifications et options IA.

### Tables de contrôle

- `oauth_states` stocke uniquement le hash des nonces OAuth, avec expiration et consommation atomique.
- `sync_runs` instrumente chaque synchronisation et son résultat.
- `email_actions` journalise les actions Gmail avec une clé d'idempotence.
- `usage_events` porte les quotas IA et les métriques d'usage.
- `telegram_connections` / `whatsapp_connections` lient un chat messagerie à un utilisateur (token de liaison hashé, préférences d’alertes/digest).
- `telegram_delivery_events` / `whatsapp_delivery_events` assurent l’idempotence des envois et commandes.

WhatsApp passe par un serveur **OpenWA distant** (REST + webhook HMAC) : MailMind n’embarque pas de session Chrome WhatsApp.

## Flux métier principal

1. L'utilisateur crée un compte avec Supabase Auth.
2. Il connecte Gmail via OAuth 2.0.
3. MailMind crée un nonce OAuth à usage unique, lié à un cookie `HttpOnly`, puis chiffre les tokens reçus.
4. Une tâche est ajoutée à la queue durable `gmail_sync_jobs`, avec retries et backoff.
5. Le worker renouvelle le token si nécessaire puis utilise Gmail History API ; un scan borné sert de repli si le curseur a expiré.
6. MailMind déduplique par compte et identifiant Gmail.
7. Les listes blanche/noire sont appliquées avant l'appel IA.
8. Les autres messages sont minimisés et expurgés de secrets avant l'appel au modèle, sous contrôle de quotas.
9. Le résultat structuré est validé par Zod et enregistré dans PostgreSQL.
10. Les alertes urgentes / phishing sont poussées vers Telegram et/ou WhatsApp (OpenWA) selon les préférences et hors quiet hours.
11. L'interface reçoit les changements via Supabase Realtime.
12. Les actions d'archivage, de signalement et de réponse sont vérifiées côté serveur avant l'appel Gmail.

## Environnements et configuration

### Local

- `.env` local non commité.
- Supabase local ou projet de développement dédié.
- `APP_ORIGIN=http://localhost:5000`.
- `TOKEN_ENCRYPTION_KEY` propre au développement.
- Gmail OAuth avec callback local autorisé.
- `pnpm run dev`.

### Staging

- Projet Supabase staging séparé.
- Client OAuth Google staging séparé.
- Clé de chiffrement staging différente de la production.
- Migration appliquée avec `pnpm exec supabase db push` après revue.
- Tests d'intégration avec un compte Gmail de test uniquement.

### Production

- Projet Supabase production séparé.
- Secrets stockés uniquement dans la plateforme de déploiement.
- `TOKEN_ENCRYPTION_KEY` sauvegardée dans un gestionnaire de secrets.
- Cron de synchronisation protégé par `CRON_SECRET`.
- Callback OAuth et domaine public vérifiés.
- Sauvegardes, rétention et sous-traitants documentés.

## Premiers tests automatisés

Les premiers tests couvrent les règles qui ne nécessitent ni Gmail réel ni Supabase réel :

- Correspondance whitelist/blacklist.
- Analyses déterministes pour les expéditeurs autorisés ou bloqués.
- Normalisation des adresses.
- Chiffrement, déchiffrement et détection de secrets legacy.
- Minimisation des données envoyées au fournisseur IA et réglages d'analyse.
- Pagination et expiration du curseur Gmail History API.
- Extraction d'une adresse depuis un header Gmail.

Commandes :

```bash
pnpm test
pnpm test:watch
pnpm lint
pnpm typecheck
pnpm test:e2e
```

## Prochaines briques métier

Déjà en place côté fondations : `sync_runs`, `email_actions`, `usage_events`, queue `gmail_sync_jobs` (pgmq) et sync incrémentale History API.

Avant une mise en production complète, ajouter encore :

- Une vraie stratégie de rétention et suppression par compte.
- Des tests d'intégration contre Supabase staging.
- Des tests contractuels avec les réponses Gmail simulées.
- Un monitoring opérationnel des `sync_runs` en échec et des quotas IA.

## Règles de sécurité non négociables

- Aucun token Gmail dans le client ou dans les logs.
- Toutes les actions sensibles passent par une fonction serveur.
- Toute requête utilisateur est filtrée par `user_id` et RLS.
- Les secrets et URLs OAuth sont propres à chaque environnement.
- Les tests automatisés n'utilisent jamais de vrais tokens ou de vraies boîtes mail.
