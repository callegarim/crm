# 🏁 Mega CRM

CRM completo para a **Mega Acessórios Automotivos** com atendimento via WhatsApp, pipeline Kanban, IA e chat em tempo real.

**Stack:** Node.js 20 · Express · PostgreSQL 15 · Redis 7 · Socket.io · Evolution API · React 18 · Vite · TypeScript · TailwindCSS · Zustand · TanStack Query

---

## 📋 Pré-requisitos

- [Docker](https://www.docker.com/) + Docker Compose v2
- Git

---

## 🚀 Subindo o ambiente local

### 1. Clone e configure o .env

```bash
cp .env.example .env
```

Edite o `.env` e preencha pelo menos:
- `JWT_SECRET` — string aleatória com no mínimo 64 caracteres
- `INTERNAL_SECRET` — string aleatória com no mínimo 16 caracteres

> **Dica:** Os demais valores têm defaults funcionais para desenvolvimento. Para conectar ao WhatsApp real, preencha `EVOLUTION_API_URL`, `EVOLUTION_API_KEY` e `EVOLUTION_WEBHOOK_SECRET`.

### 2. Suba todos os serviços

```bash
docker compose -f docker-compose.dev.yml up -d
```

Isso vai subir:

| Serviço | Porta | Descrição |
|---------|-------|-----------|
| **postgres** | 5432 | Banco de dados PostgreSQL 15 |
| **redis** | 6379 | Cache e pub/sub (Redis 7) |
| **backend** | 3001 | API Node.js com hot reload (nodemon) |
| **frontend** | 5173 | Vite dev server com HMR |

### 3. Rode as migrations e seeds (primeira vez)

```bash
# Migrations — cria as tabelas
docker exec megacrm-backend-dev npm run migrate

# Seeds — cria o admin padrão e pipeline stages
docker exec megacrm-backend-dev npm run seed
```

> O backend também roda as migrations automaticamente no startup se `AUTO_MIGRATE=true` (default no dev).

### 4. Acesse

| URL | O que é |
|-----|---------|
| **http://localhost:5173** | Frontend (React) |
| **http://localhost:3001/api/health** | Health check do backend |

### 5. Faça login

Use as credenciais do seed:

```
Email: admin@megacrm.com
Senha: admin123
```

---

## 🔍 Verificando se tudo subiu

```bash
# Ver logs de todos os serviços
docker compose -f docker-compose.dev.yml logs -f

# Ver logs apenas do backend
docker compose -f docker-compose.dev.yml logs -f backend

# Ver status dos containers
docker compose -f docker-compose.dev.yml ps
```

---

## 🛑 Derrubando tudo

```bash
# Para e remove containers (mantém dados do Postgres e Redis)
docker compose -f docker-compose.dev.yml down

# Para, remove containers E APAGA os volumes (banco + cache)
docker compose -f docker-compose.dev.yml down -v
```

---

## 🔧 Desenvolvimento

### Hot Reload

- **Backend:** Edite qualquer arquivo em `backend/src/` — o Nodemon reinicia automaticamente.
- **Frontend:** Edite qualquer arquivo em `frontend/src/` — o Vite HMR atualiza o browser instantaneamente.

### Rodando fora do Docker

Se preferir rodar sem Docker (requer Postgres e Redis locais):

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (em outro terminal)
cd frontend
npm install
npm run dev
```

### Migrations

```bash
# Criar nova migration
docker exec megacrm-backend-dev npx knex migrate:make nome_da_migration --knexfile src/db/knexfile.js

# Rodar migrations
docker exec megacrm-backend-dev npm run migrate

# Rollback da última migration
docker exec megacrm-backend-dev npm run migrate:rollback
```

---

## 📂 Estrutura do Projeto

```
mega-crm/
├── .env                      ← Variáveis de ambiente (não commitado)
├── .env.example              ← Template de variáveis
├── docker-compose.yml        ← Compose de produção
├── docker-compose.dev.yml    ← Compose de desenvolvimento local
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── server.js         ← Bootstrap (Express + Socket.io)
│       ├── config/           ← env.js, database.js, redis.js
│       ├── db/               ← knexfile, migrations, seeds
│       ├── middleware/        ← auth, validate, webhookValidator
│       ├── routes/           ← REST API (auth, conversations, contacts, pipeline, agents, settings, webhook, stats)
│       └── services/         ← socket.service, redis.service, n8n.service
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    └── src/
        ├── main.tsx          ← React entry point
        ├── App.tsx           ← Router + guards
        ├── index.css         ← Design system BMW M
        ├── lib/              ← api.ts, socket.ts, utils.ts
        ├── stores/           ← Zustand (auth, socket)
        ├── hooks/            ← useAuth, useSocket, useConversation
        ├── components/       ← UI (Button, Card, Badge...) + Layout (Sidebar, TopBar)
        └── pages/            ← Login, Dashboard, Kanban, Chat, Conversations, Contacts, Agents, Settings
```

---

## 📡 API Endpoints

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/api/auth/login` | ❌ | Login (retorna JWT) |
| GET | `/api/conversations` | ✅ | Lista conversas |
| GET | `/api/conversations/:id/messages` | ✅ | Histórico de mensagens |
| PUT | `/api/conversations/:id/assign` | ✅ | Assumir atendimento |
| PUT | `/api/conversations/:id/close` | ✅ | Fechar conversa |
| POST | `/api/conversations/:id/send-message` | ✅ | Enviar mensagem (Evolution API) |
| POST | `/api/conversations/:id/bot-reply` | 🔒 | Bot responde (internal secret) |
| GET | `/api/contacts` | ✅ | Lista contatos |
| POST | `/api/contacts` | ✅ | Criar contato |
| PUT | `/api/contacts/:id` | ✅ | Atualizar contato |
| GET | `/api/pipeline/stages` | ✅ | Lista estágios do pipeline |
| GET | `/api/pipeline/cards` | ✅ | Lista cards do pipeline |
| POST | `/api/pipeline/cards` | ✅ | Criar card |
| PUT | `/api/pipeline/cards/:id` | ✅ | Mover/editar card |
| GET | `/api/agents` | ✅ | Lista agentes IA |
| POST | `/api/agents` | ✅ | Criar agente |
| PUT | `/api/agents/:id` | ✅ | Atualizar agente |
| GET | `/api/settings` | ✅ | Buscar configurações |
| PUT | `/api/settings` | ✅ | Salvar configurações |
| GET | `/api/stats` | ✅ | Dashboard stats |
| POST | `/api/webhook/evolution` | 🔐 | Webhook Evolution API (HMAC) |
