# TextoPro — Plateforme SaaS SMS Marketing

Plateforme SaaS de SMS Marketing en marque blanche pour l'Afrique de l'Ouest.
Construit sur l'API LeTexto, revendu sous la marque TextoPro.

## Fonctionnalités

### Pour les clients
- **SMS Promotionnel** — envoi unitaire ou en masse vers des listes de contacts
- **SMS Transactionnel** — envoi via API REST (confirmations, notifications, alertes)
- **Vérification OTP** — génération et vérification de codes OTP via API
- **Intégration Chariow** — envoi automatique de SMS lors des événements boutique (vente, licence, affilié)
- **Gestion des senders** — création et suivi de la validation des expéditeurs SMS
- **Recharge de solde** — paiement via Orange Money, MTN, Wave, Moov, Free Money (PayDunya)
- **Historique** — suivi de tous les SMS envoyés avec statut de livraison (DLR)
- **Gestion des contacts** — import CSV, listes de contacts

### Pour les administrateurs
- **Tableau de bord** — statistiques globales (SMS, revenus, clients)
- **Gestion des clients** — activation/désactivation, crédit manuel de SMS
- **Validation des senders** — workflow en 3 étapes (PENDING → SUBMITTED → APPROVED)
- **Gestion des transactions** — historique des recharges
- **Configuration** — prix SMS, paliers de tarification dégressive, seuils d'alerte

---

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Framework | Next.js 14 (App Router) |
| Langage | TypeScript |
| Style | Tailwind CSS |
| Base de données | Supabase (PostgreSQL) |
| ORM | Prisma |
| Authentification | NextAuth.js (JWT) |
| Paiements | PayDunya |
| SMS | API LeTexto HTTP |
| Hébergement | VPS Hostinger (Ubuntu 22.04, PM2) |
| Déploiement | GitHub webhook → auto-deploy |

---

## Architecture

```
app/
├── (auth)/           # Login, Register
├── (dashboard)/      # Interface client
│   ├── dashboard/    # Tableau de bord
│   ├── sms/          # SMS Promotionnel (envoi manuel)
│   ├── transactionnel/ # SMS Transactionnel + clés API + intégration Chariow
│   ├── otp/          # API OTP + clés API
│   ├── campagnes/    # Historique des campagnes
│   ├── historique/   # Historique des messages
│   ├── contacts/     # Contacts et listes
│   ├── senders/      # Gestion des senders
│   ├── recharge/     # Recharge de solde
│   └── profil/       # Profil utilisateur
└── (admin)/          # Interface admin
    └── admin/
        ├── page.tsx        # Stats globales
        ├── clients/        # Gestion clients
        ├── senders/        # Validation senders
        ├── transactions/   # Transactions
        ├── apikeys/        # Clés API (vue admin)
        └── config/         # Configuration plateforme

api/
├── auth/             # NextAuth + register
├── sms/send/         # Envoi SMS promotionnel (session)
├── sms/public/       # Envoi SMS transactionnel (X-API-Key)
├── campaigns/        # CRUD campagnes
├── historique/       # Historique messages
├── contacts/         # CRUD contacts + import CSV
├── senders/          # CRUD senders client
├── otp/              # Envoi OTP, vérification, clés API, stats
├── chariow/config/   # CRUD configs Chariow (session)
├── recharge/         # Initiation + confirmation PayDunya
├── transactionnel/   # Stats SMS transactionnel
├── config/prix/      # Prix SMS public (AppConfig)
├── admin/            # Routes admin (stats, users, senders, config, transactions)
└── webhooks/
    ├── paydunya/     # IPN PayDunya (confirmation paiement)
    ├── dlr/          # Accusés de livraison LeTexto → DLR webhook client
    └── chariow/[token]/ # Réception pulses Chariow → SMS automatique
```

---

## Modèles de données (Prisma)

| Modèle | Description |
|--------|-------------|
| `User` | Client ou admin. Solde en nombre de SMS. |
| `Sender` | Expéditeur SMS. Workflow : PENDING → SUBMITTED → APPROVED |
| `Message` | SMS individuel envoyé. Lié à une campagne ou une clé API. |
| `Campaign` | Campagne d'envoi en masse. |
| `Transaction` | Recharge PayDunya ou crédit manuel admin. |
| `ApiKey` | Clé API client (`tp_live_...`). Sender OTP/Transactionnel par défaut, DLR webhook URL. |
| `OtpCode` | Code OTP généré. Expire après 5 min, max 3 tentatives. |
| `ChariowConfig` | Intégration Chariow. Token unique → URL webhook. |
| `AppConfig` | Config globale : prix SMS, paliers, montant minimum recharge. |

---

## Trois modules SMS distincts

### 1. SMS Promotionnel (`/sms`)
- Envoi manuel via interface web
- Authentification : session NextAuth
- Senders de type PROMOTIONAL

### 2. SMS Transactionnel (`/transactionnel`)
- Envoi via API REST : `POST /api/sms/public`
- Authentification : `X-API-Key: tp_live_...`
- Senders de type TRANSACTIONAL ou PROMOTIONAL
- DLR webhook configurable par clé API
- Intégration Chariow (pulses → SMS automatique)

### 3. OTP (`/otp`)
- Envoi : `POST /api/otp/send`
- Vérification : `POST /api/otp/verify`
- Authentification : `X-API-Key: tp_live_...`
- Senders de type OTP
- Code 6 chiffres, expiration 5 min, max 3 tentatives

---

## API publique

### SMS Transactionnel
```http
POST https://sms.numerik360.com/api/sms/public
X-API-Key: tp_live_xxxxxxxxxxxx
Content-Type: application/json

{
  "to": "+2250700000001",
  "message": "Votre commande est confirmée.",
  "sender": "MonApp"   // optionnel si sender par défaut configuré
}
```

### OTP — Envoi
```http
POST https://sms.numerik360.com/api/otp/send
X-API-Key: tp_live_xxxxxxxxxxxx
Content-Type: application/json

{
  "phone": "+2250700000001",
  "sender": "MonApp"   // optionnel si sender par défaut configuré
}
```

### OTP — Vérification
```http
POST https://sms.numerik360.com/api/otp/verify
X-API-Key: tp_live_xxxxxxxxxxxx
Content-Type: application/json

{
  "phone": "+2250700000001",
  "code": "123456"
}
```

---

## Intégration Chariow

Chariow est une plateforme de vente de produits numériques.
TextoPro peut recevoir les "pulses" Chariow et envoyer un SMS automatique au client.

**URL webhook à configurer dans Chariow :**
```
https://sms.numerik360.com/api/webhooks/chariow/[TOKEN_UNIQUE]
```

Le token est généré automatiquement à la création d'une config dans l'onglet **Chariow** de la page SMS Transactionnel.

**Événements supportés :**
- `successful.sale` — Vente réussie
- `abandoned.sale` — Vente abandonnée
- `failed.sale` — Vente échouée
- `license.activated` — Licence activée
- `license.expired` — Licence expirée
- `license.issued` — Licence émise
- `license.revoked` — Licence révoquée
- `affiliate.joined` — Affilié a rejoint

Tous les événements sont actifs par défaut. Le message SMS est construit automatiquement à partir des données du payload Chariow.

---

## DLR Webhook (accusés de livraison)

LeTexto notifie TextoPro quand un SMS est livré. TextoPro peut retransmettre ce statut à l'application cliente.

**Configurer l'URL DLR sur une clé API :**
Via l'interface SMS Transactionnel → éditer la clé API → renseigner l'URL DLR.

**Payload envoyé à l'URL DLR :**
```json
{
  "message_id": "cuid...",
  "letexto_id": "123",
  "status": "DELIVERED",
  "phone": "+2250700000001",
  "sender": "MonApp",
  "timestamp": "2026-06-29T10:00:00.000Z"
}
```

---

## Senders — Workflow de validation

```
Client crée le sender (PENDING)
        ↓
Admin clique "Envoyer à LeTexto" → appel API LeTexto + XLSX envoyé manuellement (SUBMITTED)
        ↓
LeTexto valide avec les opérateurs télécom (Orange, MTN, Moov, Wave)
        ↓
Admin clique "Approuver" dans le backoffice (APPROVED)
```

Types de sender : `PROMOTIONAL` | `TRANSACTIONAL` | `OTP`
Un même nom peut être utilisé avec des types différents (ex: WazzapAI PROMO + WazzapAI OTP).
Longueur max : 11 caractères.

---

## Variables d'environnement

```env
# Base de données Supabase
DATABASE_URL=postgresql://...@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://...@db.[ref].supabase.co:5432/postgres

# NextAuth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://sms.numerik360.com

# LeTexto (côté serveur uniquement)
LETEXTO_API_KEY=...

# PayDunya
PAYDUNYA_MASTER_KEY=...
PAYDUNYA_PRIVATE_KEY=...
PAYDUNYA_TOKEN=...
```

---

## Déploiement

Le déploiement est automatique via webhook GitHub :

```
git push origin main
        ↓
GitHub webhook → VPS (port 9101)
        ↓
/var/www/textopro/deploy.sh
  → git pull
  → npm install
  → prisma generate
  → npm run build
  → pm2 restart textopro
```

**Migrations de schema Prisma** (à faire manuellement sur le VPS) :
```bash
cd /var/www/textopro && set -a && source .env.local && set +a && npx prisma db push
```

---

## Installation locale

```bash
git clone https://github.com/diby-edu/SMS.git
cd SMS
npm install
cp .env.example .env.local
# Remplir les variables dans .env.local
npx prisma generate
npx prisma db push
npm run dev
```

L'application tourne sur `http://localhost:3000`.

---

## Modèle économique

- Achat SMS : 15 FCFA/SMS chez LeTexto
- Revente : 30 FCFA/SMS (prix de base, configurable)
- Paliers de tarification dégressive selon le montant rechargé
- Solde client géré en nombre de SMS (pas en FCFA)
