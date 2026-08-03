# Guide débutant : déployer OpenWA sur VPS pour MailMind

> **Ce guide est destiné à déployer [OpenWA](https://www.open-wa.org/) sur un VPS Ubuntu, au service de MailMind (canal WhatsApp).**  
> MailMind en production est sur **https://www.mailmind.me**. OpenWA tourne sur votre serveur ; MailMind (Vercel + Supabase) parle à OpenWA en HTTP(S).

---

## AVERTISSEMENT SÉCURITÉ — À LIRE EN PREMIER

Un mot de passe temporaire du VPS a pu être **exposé** (chat, historique, copie d’écran, etc.).

1. **Ne jamais coller un vrai mot de passe dans ce fichier**, dans un commit Git, ni dans un ticket public.
2. **Changez immédiatement** le mot de passe du compte `mailmindadmin` dès la première connexion (section 3).
3. Si le mot de passe a circulé : traitez-le comme **compromis** — changez-le, puis préférez une **clé SSH** et désactivez l’auth par mot de passe.
4. Dans ce guide, on utilise uniquement des placeholders :
   - `VOTRE_MOT_DE_PASSE`
   - `VOTRE_NOUVEAU_MOT_DE_PASSE`
   - `…` pour les secrets générés

**Ce guide ne se connecte pas à votre VPS à votre place.** Vous exécutez les commandes depuis votre PC.

---

## Votre serveur (rappel)

| Élément | Valeur |
| --- | --- |
| OS | Ubuntu Server 24.04 |
| IP publique | `20.199.101.182` |
| Utilisateur | `mailmindadmin` |
| Ports ouverts | 22 (SSH), 80 (HTTP), 443 (HTTPS) |
| Ressources | 2 vCPU, 8 Go RAM, 64 Go SSD |

**Schéma cible :**

```text
Téléphone WhatsApp  ←→  OpenWA (VPS)  ←→  MailMind (Vercel)
                              │
                              └── webhooks HTTPS vers
                                  https://www.mailmind.me/api/public/hooks/whatsapp
```

- **OpenWA → MailMind** : OpenWA appelle le webhook public MailMind.
- **MailMind → OpenWA** : Vercel/Supabase appellent `OPENWA_BASE_URL` (idéalement en **HTTPS**).

---

## Table des matières

1. [Prérequis sur votre PC](#1-prérequis-sur-votre-pc)
2. [Première connexion SSH](#2-première-connexion-ssh)
3. [Sécurisation de base](#3-sécurisation-de-base)
4. [Installer Docker](#4-installer-docker)
5. [Déployer OpenWA](#5-déployer-openwa)
6. [HTTPS (Caddy) et domaine](#6-https-avec-caddy--domaine)
7. [Clé API OPERATOR, session WhatsApp, SESSION_ID](#7-créer-la-clé-api-operator-et-la-session-whatsapp)
8. [Générer OPENWA_WEBHOOK_SECRET](#8-générer-openwa_webhook_secret)
9. [Enregistrer le webhook vers MailMind](#9-enregistrer-le-webhook-vers-mailmind)
10. [Configurer Vercel et Supabase](#10-configurer-vercel-et-supabase)
11. [Migration SQL WhatsApp](#11-migration-sql-whatsapp-mailmind)
12. [Tester depuis Paramètres → WhatsApp](#12-tester-la-liaison-depuis-paramètres--whatsapp)
13. [Dépannage](#13-dépannage-courant)
14. [Checklist finale](#14-checklist-finale)

---

## 1. Prérequis sur votre PC

Vous avez besoin d’un **terminal** et du client **OpenSSH** (`ssh`).

### Windows

1. Ouvrez **PowerShell** ou **Windows Terminal**.
2. Vérifiez OpenSSH :

```powershell
ssh -V
```

**Ce que ça fait :** affiche la version du client SSH. Si la commande est introuvable, installez « OpenSSH Client » via *Paramètres → Applications → Fonctionnalités optionnelles*.

Alternative : [Windows Subsystem for Linux (WSL)](https://learn.microsoft.com/fr-fr/windows/wsl/) puis utilisez les commandes Linux du guide.

### macOS

1. Ouvrez **Terminal** (Spotlight → « Terminal »).
2. Vérifiez :

```bash
ssh -V
```

OpenSSH est en général déjà présent.

### Linux

```bash
ssh -V
```

Si besoin : `sudo apt install openssh-client` (Debian/Ubuntu) ou l’équivalent de votre distribution.

### Notion utile : « local » vs « distant »

- **Votre PC** = machine locale (où vous tapez `ssh …`).
- **Le VPS** = machine distante (où tournera OpenWA).  
  Après connexion SSH, les commandes s’exécutent **sur le VPS**.

---

## 2. Première connexion SSH

### 2.1 Se connecter

Sur votre PC :

```bash
ssh mailmindadmin@20.199.101.182
```

**Ce que ça fait :** ouvre une session sécurisée vers le VPS avec l’utilisateur `mailmindadmin`.

### 2.2 Accepter l’empreinte (fingerprint)

Au premier contact, SSH affiche quelque chose comme :

```text
The authenticity of host '20.199.101.182 (…)' can't be established.
ED25519 key fingerprint is SHA256:….
Are you sure you want to continue connecting (yes/no/[fingerprint])?
```

Tapez `yes` puis Entrée.

**Ce que ça fait :** enregistre la clé publique du serveur pour détecter plus tard une usurpation (attaque « man-in-the-middle »).

### 2.3 Mot de passe

Quand on vous demande le mot de passe, saisissez celui fourni par votre hébergeur (`VOTRE_MOT_DE_PASSE`).  
Rien ne s’affiche à l’écran pendant la saisie : c’est normal.

Si la connexion réussit, vous voyez un invite du type :

```text
mailmindadmin@…:~$
```

Vous êtes **sur le VPS**.

> **Astuce :** pour quitter plus tard : `exit` ou `Ctrl+D`.

---

## 3. Sécurisation de base

Faites ces étapes **dans la session SSH** sur le VPS, sauf indication contraire (génération de clé = sur le PC).

### 3.1 Changer le mot de passe immédiatement

```bash
passwd
```

**Ce que ça fait :** change le mot de passe de l’utilisateur connecté (`mailmindadmin`).

1. Saisissez l’ancien mot de passe (`VOTRE_MOT_DE_PASSE`).
2. Saisissez **deux fois** un nouveau mot de passe fort (`VOTRE_NOUVEAU_MOT_DE_PASSE`).
3. Notez-le dans un gestionnaire de mots de passe (Bitwarden, 1Password, etc.) — **pas** dans un fichier Git.

Si le mot de passe a été exposé dans un chat : **changez-le maintenant**, même si vous comptez passer aux clés SSH.

### 3.2 Mettre à jour le système

```bash
sudo apt update
sudo apt upgrade -y
```

**Ce que ça fait :**

- `apt update` : rafraîchit la liste des paquets disponibles.
- `apt upgrade -y` : installe les mises à jour de sécurité et correctifs.

`sudo` = « exécuter en administrateur ». On vous demandera parfois votre mot de passe Linux.

### 3.3 Pare-feu UFW (ports 22, 80, 443)

```bash
sudo apt install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
sudo ufw enable
sudo ufw status verbose
```

**Ce que ça fait :**

- Refuse les connexions entrantes non listées.
- Autorise SSH (pour ne pas vous verrouiller dehors), HTTP et HTTPS.
- `ufw enable` active le pare-feu (confirmez avec `y` si demandé).

> **Important :** n’ouvrez **pas** le port `2785` (OpenWA) sur Internet. On exposera OpenWA **uniquement** via Caddy/Nginx sur 80/443, en proxy vers `127.0.0.1:2785`.

### 3.4 Fail2ban (protection brute-force SSH)

```bash
sudo apt install -y fail2ban
sudo systemctl enable --now fail2ban
sudo systemctl status fail2ban --no-pager
```

**Ce que ça fait :** installe et démarre Fail2ban, qui bloque temporairement les IP qui échouent trop souvent à l’authentification SSH (config par défaut suffisante pour débuter).

### 3.5 Créer une clé SSH depuis votre PC (recommandé)

**Sur votre PC** (nouvelle fenêtre de terminal, pas sur le VPS) :

```bash
ssh-keygen -t ed25519 -C "mailmind-vps" -f ~/.ssh/mailmind_vps
```

**Ce que ça fait :** crée une paire de clés :

- privée : `~/.ssh/mailmind_vps` (**ne jamais partager**)
- publique : `~/.ssh/mailmind_vps.pub` (à installer sur le serveur)

Appuyez sur Entrée pour la passphrase (ou définissez-en une pour plus de sécurité).

Copiez la clé publique vers le VPS :

```bash
ssh-copy-id -i ~/.ssh/mailmind_vps.pub mailmindadmin@20.199.101.182
```

**Ce que ça fait :** ajoute votre clé publique dans `~/.ssh/authorized_keys` sur le VPS.

Testez la connexion par clé :

```bash
ssh -i ~/.ssh/mailmind_vps mailmindadmin@20.199.101.182
```

Si ça marche **sans** mot de passe (ou seulement avec la passphrase de la clé), vous pouvez ensuite restreindre SSH.

#### (Optionnel mais recommandé) Désactiver l’auth par mot de passe

**Uniquement** après avoir vérifié que la connexion par clé fonctionne dans **une autre** fenêtre SSH.

Sur le VPS :

```bash
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak
sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?KbdInteractiveAuthentication.*/KbdInteractiveAuthentication no/' /etc/ssh/sshd_config
sudo sshd -t && sudo systemctl reload ssh
```

**Ce que ça fait :** refuse les connexions SSH par mot de passe ; seules les clés autorisées restent valides. `sshd -t` vérifie la config avant le rechargement.

Gardez une session SSH ouverte pendant le test. Si vous êtes bloqué, utilisez la console web de votre hébergeur cloud pour corriger.

Raccourci pratique sur le PC (`~/.ssh/config`) :

```text
Host mailmind-vps
  HostName 20.199.101.182
  User mailmindadmin
  IdentityFile ~/.ssh/mailmind_vps
```

Ensuite : `ssh mailmind-vps`.

---

## 4. Installer Docker

OpenWA recommande Docker. La doc officielle ([open-wa.org](https://www.open-wa.org/), [GitHub rmyndharis/OpenWA](https://github.com/rmyndharis/OpenWA)) propose :

- **Dev rapide** : `docker compose -f docker-compose.dev.yml up -d`
- **Production** : `docker compose up -d` (fichier `docker-compose.yml`)

Pour MailMind sur un VPS, on utilise le **compose de production** (plus simple et pérenne qu’installer Node à la main).

### 4.1 Installer Docker Engine + Compose (Ubuntu 24.04)

Sur le VPS :

```bash
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${VERSION_CODENAME}") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

**Ce que ça fait :** ajoute le dépôt officiel Docker et installe le moteur + le plugin Compose (`docker compose`).

### 4.2 Droits utilisateur (sans `sudo` à chaque commande)

```bash
sudo usermod -aG docker mailmindadmin
```

**Ce que ça fait :** ajoute votre utilisateur au groupe `docker`.

Déconnectez-vous puis reconnectez-vous en SSH pour que le groupe soit pris en compte :

```bash
exit
ssh mailmindadmin@20.199.101.182
# ou : ssh mailmind-vps
```

Vérifiez :

```bash
docker version
docker compose version
```

---

## 5. Déployer OpenWA

Référence officielle : [Quick Start / Production](https://github.com/rmyndharis/OpenWA) — port API + dashboard **`2785`**.

> **À adapter selon votre version OpenWA** : les noms de fichiers, variables d’environnement et chemins exacts évoluent. En cas de doute, suivez le `README.md` du commit/tag que vous avez cloné, et la doc dans `docs/`.

### 5.1 Cloner le dépôt

```bash
sudo mkdir -p /opt/openwa
sudo chown mailmindadmin:mailmindadmin /opt/openwa
cd /opt/openwa
git clone https://github.com/rmyndharis/OpenWA.git .
```

**Ce que ça fait :** crée un dossier dédié et y clone le code OpenWA.

### 5.2 Préparer le fichier `.env`

```bash
cp .env.example .env
nano .env
```

**Ce que ça fait :** copie le modèle officiel, puis ouvre l’éditeur `nano` (Ctrl+O pour sauver, Ctrl+X pour quitter).

Réglages **recommandés pour un débutant / une seule instance MailMind** (vérifiez les noms dans *votre* `.env.example`) :

```bash
NODE_ENV=production
API_PORT=2785

# Redémarrer automatiquement la session WhatsApp après reboot du conteneur
AUTO_START_SESSIONS=true

# Limite mémoire du conteneur API (whatsapp-web.js ≈ 300–500 Mo / session)
OPENWA_MEM_LIMIT=2g

# Si vous servez d’abord en HTTP sans TLS (temporaire), voir aussi section 6
# CSP_UPGRADE_INSECURE_REQUESTS=false
```

Notes :

- Laissez SQLite par défaut au début (pas besoin du profile `postgres`).
- Ne mettez **pas** `ALLOW_DEV_API_KEY=true` en production.
- `API_MASTER_KEY` : optionnel ; si vide, OpenWA génère une clé admin au premier démarrage (voir §7).

### 5.3 Démarrer (production, SQLite)

```bash
cd /opt/openwa
docker compose up -d
```

**Ce que ça fait :** construit/démarre les services définis dans `docker-compose.yml` (API OpenWA + proxy Docker interne). En production, le port est en général mappé sur **`127.0.0.1:2785`** seulement (pas exposé sur Internet) — c’est voulu.

Profiles optionnels (plus tard, si besoin) :

```bash
# Exemples officiels — à n’utiliser que si vous savez pourquoi
# docker compose --profile postgres up -d
# docker compose --profile full up -d
```

### 5.4 Vérifier que ça tourne

```bash
docker compose ps
docker compose logs -f --tail=100 openwa-api
```

**Ce que ça fait :**

- `ps` : état des conteneurs (`running` / `healthy`).
- `logs -f` : suit les logs en direct (Ctrl+C pour arrêter le suivi, **sans** arrêter OpenWA).

Test santé en local sur le VPS :

```bash
curl -sS http://127.0.0.1:2785/api/health/ready
```

Vous devez obtenir une réponse HTTP **200**.

Dashboard / Swagger (depuis le VPS, ou plus tard via le reverse proxy) :

| URL | Rôle |
| --- | --- |
| `http://127.0.0.1:2785/` | Dashboard web |
| `http://127.0.0.1:2785/api` | API |
| `http://127.0.0.1:2785/api/docs` | Swagger |

---

## 6. HTTPS avec Caddy / domaine

MailMind doit pouvoir joindre OpenWA (`OPENWA_BASE_URL`), et OpenWA doit pouvoir joindre Internet pour appeler le webhook MailMind. **Une URL HTTPS publique pour OpenWA est fortement recommandée.**

### Option A — HTTP temporaire sur l’IP (limites)

Possible pour un smoke test **très** court :

- Exposer OpenWA derrière un reverse proxy en HTTP sur `http://20.199.101.182` (ou un tunnel SSH).
- **Limites :**
  - pas de certificat de confiance ;
  - les navigateurs / CSP OpenWA peuvent casser le dashboard (variable `CSP_UPGRADE_INSECURE_REQUESTS`) ;
  - Vercel/Supabase en production appellent mieux une URL **HTTPS** stable ;
  - l’IP seule ne convient pas bien à Let’s Encrypt (besoin d’un **nom de domaine**).

Pour un tunnel SSH depuis votre PC (dashboard seulement) :

```bash
ssh -L 2785:127.0.0.1:2785 mailmindadmin@20.199.101.182
```

Puis ouvrez `http://localhost:2785` sur votre PC.

**Ne comptez pas sur l’option A pour la prod MailMind.**

### Option B — Sous-domaine + HTTPS (recommandé)

Exemple : `wa.mailmind.me` (ou `openwa.mailmind.me`) → `20.199.101.182`.

MailMind prod est déjà sur **www.mailmind.me** ; un sous-domaine dédié à OpenWA évite de mélanger les services.

#### 6.1 DNS

Chez votre registrar / DNS :

| Type | Nom | Valeur |
| --- | --- | --- |
| A | `wa` (pour `wa.mailmind.me`) | `20.199.101.182` |

Attendez la propagation (quelques minutes à quelques heures) :

```bash
# Sur le PC ou le VPS
dig +short wa.mailmind.me
```

Doit renvoyer `20.199.101.182`.

#### 6.2 Installer Caddy (simple pour débutants)

Sur le VPS :

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

**Ce que ça fait :** installe Caddy, qui obtient automatiquement un certificat Let’s Encrypt.

#### 6.3 Configurer le reverse proxy

```bash
sudo nano /etc/caddy/Caddyfile
```

Contenu minimal (adaptez le domaine) :

```caddy
wa.mailmind.me {
	encode gzip
	reverse_proxy 127.0.0.1:2785
}
```

**Ce que ça fait :** tout le trafic HTTPS vers `wa.mailmind.me` est relayé vers OpenWA en local.

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo systemctl status caddy --no-pager
```

Test :

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://wa.mailmind.me/api/health/ready
```

Attendu : `200`.

Votre **`OPENWA_BASE_URL`** sera alors :

```text
https://wa.mailmind.me
```

(sans slash final — comme dans `.env.example` de MailMind).

> **Nginx + Certbot** : possible aussi. Caddy est choisi ici pour réduire le nombre d’étapes. Si vous préférez Nginx, suivez un tutoriel « reverse proxy → 127.0.0.1:2785 » + Certbot ; le principe est le même.

---

## 7. Créer la clé API OPERATOR et la session WhatsApp

Auth OpenWA : header **`X-API-Key`** (jamais en query).  
Rôles : `viewer` < `operator` < `admin`.  
MailMind a besoin d’une clé **OPERATOR** (envoi de messages + webhooks).

Doc : [API specification](https://github.com/rmyndharis/OpenWA/blob/main/docs/06-api-specification.md), [API collection](https://github.com/rmyndharis/OpenWA/blob/main/docs/07-api-collection.md).

### 7.1 Récupérer la clé admin initiale

Au premier démarrage, OpenWA crée une clé admin :

- affichée dans les logs de démarrage ;
- et/ou écrite dans le volume data : souvent `/app/data/.api-key` dans le conteneur.

```bash
cd /opt/openwa
docker compose logs openwa-api 2>&1 | grep -i -E 'api.?key|master|admin' | tail -n 50
docker compose exec openwa-api sh -c 'cat /app/data/.api-key 2>/dev/null || ls -la /app/data/'
```

**Ce que ça fait :** cherche la clé admin dans les logs ou le fichier seed.

Stockez-la comme `ADMIN_API_KEY=…` dans votre gestionnaire de secrets (pas dans Git).

> **À adapter selon votre version OpenWA** si le chemin `.api-key` diffère — consultez le README / les logs.

Définissez des variables dans votre session SSH (exemples) :

```bash
export OPENWA_BASE_URL="https://wa.mailmind.me"   # ou http://127.0.0.1:2785 pour tests locaux
export ADMIN_API_KEY="…"                          # clé admin seed
```

### 7.2 Créer une clé OPERATOR pour MailMind

```bash
curl -sS -X POST "$OPENWA_BASE_URL/api/auth/api-keys" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $ADMIN_API_KEY" \
  -d '{
    "name": "MailMind production",
    "role": "operator"
  }'
```

**Ce que ça fait :** crée une clé à privilège OPERATOR. La **valeur en clair** n’est en général renvoyée **qu’à la création** — copiez-la tout de suite.

```bash
export OPENWA_API_KEY="…"   # la clé operator fraîchement créée
```

C’est cette valeur qui ira dans Vercel / Supabase (`OPENWA_API_KEY`).

Vous pouvez aussi créer la clé via le **Dashboard** OpenWA (section clés API) si l’UI de votre version le propose.

### 7.3 Créer une session WhatsApp

```bash
curl -sS -X POST "$OPENWA_BASE_URL/api/sessions" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $OPENWA_API_KEY" \
  -d '{"name": "mailmind"}'
```

**Ce que ça fait :** crée une session. La réponse contient un **`id`** (UUID) → c’est votre futur `OPENWA_SESSION_ID`.

```bash
export OPENWA_SESSION_ID="…"   # id renvoyé
```

### 7.4 Démarrer la session et scanner le QR

```bash
curl -sS -X POST "$OPENWA_BASE_URL/api/sessions/$OPENWA_SESSION_ID/start" \
  -H "X-API-Key: $OPENWA_API_KEY"
```

Puis récupérez le QR :

```bash
curl -sS "$OPENWA_BASE_URL/api/sessions/$OPENWA_SESSION_ID/qr" \
  -H "X-API-Key: $OPENWA_API_KEY"
```

**Ce que ça fait :** démarre le moteur WhatsApp et renvoie le QR (souvent une data URL PNG). Plus simple pour un débutant : ouvrez le **Dashboard** (`https://wa.mailmind.me/`), sélectionnez la session, affichez le QR.

Sur le téléphone :

1. WhatsApp → **Paramètres** → **Appareils connectés** → **Connecter un appareil**.
2. Scannez le QR **avant expiration**.
3. Attendez le statut connecté / authentifié dans le dashboard ou via l’API.

Vérification :

```bash
curl -sS "$OPENWA_BASE_URL/api/sessions/$OPENWA_SESSION_ID" \
  -H "X-API-Key: $OPENWA_API_KEY"
```

Conseils OpenWA (compte) :

- Préférez un **numéro dédié**, pas votre numéro perso principal.
- Ne spammez pas ; MailMind sert surtout alertes / commandes / digest.

Notez aussi le numéro E.164 **sans `+`** pour l’affichage MailMind, ex. `33612345678` → `OPENWA_WA_NUMBER`.

---

## 8. Générer OPENWA_WEBHOOK_SECRET

Ce secret sert à signer les webhooks (HMAC). MailMind vérifie l’en-tête `X-OpenWA-Signature` (`src/lib/openwa.server.ts`, hook `src/routes/api/public/hooks/whatsapp.ts`).

Sur le VPS ou votre PC :

```bash
openssl rand -hex 32
```

**Ce que ça fait :** génère 32 octets aléatoires en hexadécimal (64 caractères).

```bash
export OPENWA_WEBHOOK_SECRET="…"   # collez la sortie openssl
```

Utilisez **exactement la même valeur** :

1. lors de l’enregistrement du webhook OpenWA (`secret`) ;
2. dans la variable d’environnement Vercel `OPENWA_WEBHOOK_SECRET`.

---

## 9. Enregistrer le webhook vers MailMind

Endpoint MailMind (prod) :

```text
https://www.mailmind.me/api/public/hooks/whatsapp
```

Événement nécessaire : **`message.received`** (liaison `LIEN …`, commandes `/help`, etc.).

```bash
curl -sS -X POST "$OPENWA_BASE_URL/api/sessions/$OPENWA_SESSION_ID/webhooks" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $OPENWA_API_KEY" \
  -d "{
    \"url\": \"https://www.mailmind.me/api/public/hooks/whatsapp\",
    \"events\": [\"message.received\"],
    \"secret\": \"$OPENWA_WEBHOOK_SECRET\"
  }"
```

**Ce que ça fait :** demande à OpenWA d’appeler MailMind à chaque message reçu, avec signature HMAC.

Référence aussi dans le dépôt MailMind : `MISE_EN_PLACE.md` (section « Configurer WhatsApp (OpenWA) ») et `.env.example` (bloc `OPENWA_*`).

Test manuel (si votre version OpenWA expose un envoi « test » depuis le dashboard) : un événement `test` est accepté par le hook MailMind.

---

## 10. Configurer Vercel et Supabase

Variables documentées dans `.env.example` :

| Variable | Où | Rôle |
| --- | --- | --- |
| `OPENWA_BASE_URL` | **Vercel** + **Supabase** | URL publique OpenWA, sans `/` final (ex. `https://wa.mailmind.me`) |
| `OPENWA_API_KEY` | **Vercel** + **Supabase** | Clé `X-API-Key` rôle OPERATOR |
| `OPENWA_SESSION_ID` | **Vercel** + **Supabase** | ID de session authentifiée |
| `OPENWA_WEBHOOK_SECRET` | **Vercel** seulement* | Secret HMAC webhook entrant |
| `OPENWA_WA_NUMBER` | **Vercel** (recommandé) | Chiffres seuls pour liens `wa.me` (ex. `33612345678`) |

\*Le webhook HTTP public est géré par la route Vercel `/api/public/hooks/whatsapp`. Les **3 variables d’envoi** (`OPENWA_BASE_URL`, `OPENWA_API_KEY`, `OPENWA_SESSION_ID`) sont aussi nécessaires dans les **secrets Supabase Functions** pour les alertes côté edge (ex. canal inbound Resend — voir `supabase/functions/_shared/whatsapp.ts` et `MISE_EN_PLACE.md`).

### 10.1 Vercel (les 5 `OPENWA_*`)

1. Ouvrez le projet MailMind sur [vercel.com](https://vercel.com) → **Settings** → **Environment Variables**.
2. Ajoutez pour **Production** (et Preview si besoin) :

```text
OPENWA_BASE_URL=https://wa.mailmind.me
OPENWA_API_KEY=…
OPENWA_SESSION_ID=…
OPENWA_WEBHOOK_SECRET=…
OPENWA_WA_NUMBER=33612345678
```

3. **Redéployez** l’application pour que les variables soient prises en compte.

### 10.2 Supabase (3 vars d’envoi)

Dans le projet Supabase → **Edge Functions** → **Secrets** (ou CLI `supabase secrets set`) :

```text
OPENWA_BASE_URL=https://wa.mailmind.me
OPENWA_API_KEY=…
OPENWA_SESSION_ID=…
```

Mêmes valeurs que côté Vercel (sauf le webhook secret, inutile ici si l’edge n’expose pas le hook WhatsApp).

---

## 11. Migration SQL WhatsApp MailMind

Fichier du dépôt :

```text
supabase/migrations/20260803120000_add_whatsapp_integration.sql
```

Cette migration crée notamment la table `whatsapp_connections` (parité Telegram).

### En local / CLI

```bash
# Depuis le dépôt MailMind, avec Supabase CLI configuré
supabase db push
# ou, selon votre flux habituel :
# supabase migration up
```

**Ce que ça fait :** applique les migrations en attente sur la base liée.

### Via le dashboard Supabase

1. **SQL Editor** → coller le contenu de la migration → Run.  
   **Ou** utiliser votre pipeline de migrations déjà en place.

Vérifiez que la table existe :

```sql
select to_regclass('public.whatsapp_connections');
```

Sans cette migration, l’UI « Lier WhatsApp » échouera côté base.

---

## 12. Tester la liaison depuis Paramètres → WhatsApp

1. Connectez-vous à **https://www.mailmind.me**.
2. Allez dans **Paramètres** → section **WhatsApp** (carte « Lier WhatsApp »).
3. Cliquez sur **Lier WhatsApp** : un code / deep link `wa.me` est généré (~15 minutes).
4. Ouvrez WhatsApp et envoyez le message prérempli (`LIEN …`) **au numéro** configuré côté OpenWA (`OPENWA_WA_NUMBER`).
5. OpenWA reçoit le message → webhook `message.received` → MailMind valide la signature → statut **lié**.

Commandes utiles après liaison (comme Telegram) : `/help`, `/status`, `/digest`, `/alerts`, `/unlink`.

Fichiers MailMind utiles (lecture seule, pas de secrets) :

- `.env.example` — noms des variables
- `src/routes/api/public/hooks/whatsapp.ts` — webhook entrant
- `src/lib/openwa.server.ts` — client HTTP + vérif HMAC
- `src/lib/whatsapp.functions.ts` — actions UI Paramètres
- `supabase/functions/_shared/whatsapp.ts` — envoi depuis l’edge

---

## 13. Dépannage courant

### SSH refuse la connexion

- Vérifiez l’IP, l’utilisateur `mailmindadmin`, et que le port **22** est ouvert (UFW + panneau cloud).
- Si vous avez désactivé les mots de passe : utilisez `-i ~/.ssh/mailmind_vps`.
- Console web de l’hébergeur = plan B si vous êtes lock-out.

### QR expire / session ne se connecte pas

- Relancez `…/start` puis redemandez `…/qr`, ou utilisez le dashboard.
- Sur VPS lent, la doc OpenWA mentionne `WWEBJS_AUTH_TIMEOUT_MS` (à adapter selon version).
- Mémoire : `OPENWA_MEM_LIMIT` trop bas peut tuer Chromium (`whatsapp-web.js`).
- Vérifiez `docker compose logs -f openwa-api`.

### Webhook 401 (`unauthorized`)

- `OPENWA_WEBHOOK_SECRET` Vercel ≠ `secret` enregistré dans OpenWA.
- Corps modifié / proxy qui altère le body (la signature HMAC porte sur le **corps brut**).
- Redéploiement Vercel manquant après ajout de la variable.

### Webhook 503 (`not_configured`)

- `OPENWA_WEBHOOK_SECRET` absent sur Vercel.

### CORS

- Les appels **serveur → serveur** (OpenWA → MailMind, MailMind → OpenWA) ne passent en général **pas** par le CORS navigateur.
- Si le **dashboard** OpenWA se comporte mal derrière HTTPS/HTTP, regardez `CSP_UPGRADE_INSECURE_REQUESTS` et le reverse proxy.

### Conteneur down / unhealthy

```bash
cd /opt/openwa
docker compose ps
docker compose logs --tail=200 openwa-api
docker compose restart openwa-api
```

Espace disque : `df -h`. RAM : `free -h`.

### Ports

| Port | Doit être public ? | Rôle |
| --- | --- | --- |
| 22 | Oui (restreindre par IP si possible) | SSH |
| 80 / 443 | Oui | Caddy / Let’s Encrypt / HTTPS |
| 2785 | **Non** (localhost seulement) | OpenWA derrière le proxy |

### MailMind n’envoie pas de messages

- Vérifiez les 3 vars sur **Vercel et Supabase**.
- Session toujours authentifiée (`AUTO_START_SESSIONS=true`).
- Test manuel :

```bash
curl -sS -X POST "$OPENWA_BASE_URL/api/sessions/$OPENWA_SESSION_ID/messages/send-text" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $OPENWA_API_KEY" \
  -d '{"chatId":"33600000000@c.us","text":"ping MailMind"}'
```

(Remplacez par un chatId réel que vous contrôlez.)

### OpenWA ne joint pas MailMind

- Depuis le VPS : `curl -sS -o /dev/null -w "%{http_code}\n" https://www.mailmind.me/api/public/hooks/whatsapp`  
  (un GET peut renvoyer une méthode non autorisée — l’important est que le DNS/TLS fonctionne).
- Pare-feu sortant du VPS rarement bloqué ; DNS et URL webhook exacte sont les causes fréquentes.

---

## 14. Checklist finale

- [ ] Mot de passe VPS **changé** (et régénéré si exposé)
- [ ] (Recommandé) Clé SSH en place ; auth mot de passe SSH désactivée
- [ ] `apt update/upgrade` fait
- [ ] UFW : 22, 80, 443 seulement (pas 2785 public)
- [ ] Fail2ban actif
- [ ] Docker + Compose installés
- [ ] OpenWA démarré (`docker compose up -d`), health `200`
- [ ] Domaine `wa.…` (ou équivalent) en HTTPS via Caddy
- [ ] Clé **OPERATOR** créée → `OPENWA_API_KEY`
- [ ] Session créée, QR scanné → `OPENWA_SESSION_ID`
- [ ] `OPENWA_WEBHOOK_SECRET` généré et identique OpenWA ↔ Vercel
- [ ] Webhook `message.received` → `https://www.mailmind.me/api/public/hooks/whatsapp`
- [ ] Vercel : 5 variables `OPENWA_*` + redéploiement
- [ ] Supabase secrets : `OPENWA_BASE_URL`, `OPENWA_API_KEY`, `OPENWA_SESSION_ID`
- [ ] Migration `20260803120000_add_whatsapp_integration.sql` appliquée
- [ ] Test UI : Paramètres → WhatsApp → Lier → message `LIEN …` reçu
- [ ] Aucun secret réel committe dans Git / collé dans ce guide

---

## Ressources

- OpenWA site : https://www.open-wa.org/
- OpenWA GitHub : https://github.com/rmyndharis/OpenWA
- MailMind `.env.example` (bloc OpenWA)
- MailMind `MISE_EN_PLACE.md` § « Configurer WhatsApp (OpenWA) »
- Hook : `src/routes/api/public/hooks/whatsapp.ts`
- Client : `src/lib/openwa.server.ts`

---

*Guide pédagogique — commandes OpenWA à recouper avec la version exacte clonée si un endpoint ou un chemin de fichier diffère.*
