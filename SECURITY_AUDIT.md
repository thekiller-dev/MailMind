# Audit de sécurité MailMind

## Périmètre vérifié

- Supabase MailMind : tables publiques, RLS, privilèges, migrations et Edge Functions.
- Vercel `mail-mind` : liaison GitHub, domaines, déploiements, variables d’environnement et erreurs runtime.
- Application : middleware d’authentification, fonctions serveur, entrées utilisateur, webhooks et secrets.
- Dépendances npm de production et de développement.

## Corrections appliquées

- RLS activé sur toutes les tables publiques utilisées par l’application.
- Politiques RLS réécrites avec `(select auth.uid())` pour éviter une réévaluation par ligne.
- Exécution publique de `public.rls_auto_enable()` révoquée.
- Colonnes OAuth sensibles de `email_accounts` interdites au rôle `authenticated`.
- Table Telegram protégée : le navigateur ne peut modifier que les préférences ; les tokens de liaison et le `chat_id` sont réservés au serveur.
- Webhooks Resend et Telegram protégés par secret, avec limitation de taille des payloads.
- Liaison Telegram par token aléatoire haché, à usage unique et expiration de 15 minutes.
- Commandes Telegram limitées au `chat_id` lié, avec déduplication des updates et limitation de fréquence.
- Les routes cron utilisent une comparaison à temps constant avec `CRON_SECRET`.

## Résultats

- TypeScript : réussi.
- Tests : 16 tests réussis.
- Build Vercel local : réussi.
- Dépendances de production : aucune vulnérabilité connue.
- Vercel production : aucun runtime error trouvé sur les dernières 24 heures.
- Supabase Security Advisors : l’exposition de `rls_auto_enable` a disparu.

## Points à traiter avant la production Telegram

1. Activer la protection Supabase contre les mots de passe compromis :
   https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
2. Créer le bot avec BotFather et définir `TELEGRAM_BOT_TOKEN`,
   `TELEGRAM_BOT_USERNAME` et `TELEGRAM_WEBHOOK_SECRET` dans Supabase et Vercel.
3. Enregistrer l’URL `https://udfkcqhuhqpunvlhgpdc.supabase.co/functions/v1/telegram-webhook`
   avec `setWebhook`.
4. Régénérer les secrets qui ont déjà été exposés dans un fichier `.env` ou dans
   un historique de conversation : clés Supabase, Google OAuth, IA, Resend et
   tout autre secret concerné.
5. Le lint complet peut signaler une vulnérabilité de développement `brace-expansion`
   héritée d’ESLint ; l’audit de production est propre. Il faut mettre à jour
   la chaîne ESLint dès qu’une version compatible est disponible.

## Risques résiduels

- Le contenu des e-mails est envoyé au fournisseur IA configuré ; vérifier son
  contrat de traitement des données et sa conservation.
- Telegram est un canal tiers : seules les métadonnées, résumés et raisons de
  risque nécessaires doivent y être envoyés.
- La protection contre les mots de passe compromis reste à activer dans Supabase.
