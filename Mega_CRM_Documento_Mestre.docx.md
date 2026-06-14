**MEGA CRM**

Documento Mestre de Arquitetura \+ Prompt de Desenvolvimento

Versão 2.0  |  Single-Tenant  |  Mega Acessórios Automotivos

Lucas Borges Studio  |  Junho 2026

*Este documento define toda a arquitetura técnica do Mega CRM e contém o prompt mestre para desenvolvimento com Claude Opus 4.6 no Antigravity. Leia antes de iniciar qualquer etapa de desenvolvimento.*

**1\. Divisão de Responsabilidades**

**Backend Express — Dono dos dados**

* Autenticação e controle de acesso (JWT \+ roles)

* Banco de dados: contatos, Kanban, conversas, mensagens, financeiro

* Receber webhook da Evolution API e salvar mensagem no PostgreSQL

* Repassar mensagem ao n8n via HTTP e aguardar callback

* WebSocket: broadcast em tempo real pro frontend

* API REST: todas as telas do CRM consomem daqui

* Sincronizar prompts e configurações entre PostgreSQL e Redis

**n8n — Dono da inteligência**

* Receber payload do backend quando chega mensagem nova

* Buscar prompt do agente no Redis

* Buscar histórico da conversa via GET /api/conversations/:id/messages

* Chamar o LLM (Groq ou OpenAI)

* Enviar resposta via Evolution API

* Avisar backend com ação realizada (respondeu ou transferiu)

*Regra de ouro: o backend nunca chama o LLM. O n8n nunca escreve no banco. Cada um tem seu domínio.*

**2\. Stack Técnica**

| Camada | Tecnologia | Motivo |
| :---- | :---- | :---- |
| **Servidor** | Node.js \+ Express 4 | Estável, CommonJS, sem surpresas de beta |
| **Banco** | PostgreSQL \+ Knex.js | Relacional, migrations versionadas, sem ORM pesado |
| **Cache/Prompts** | Redis | Leitura rápida de prompts pelo n8n |
| **Tempo real** | Socket.io | WebSocket com fallback automático |
| **Auth** | JWT \+ bcrypt | Padrão sólido sem overhead |
| **Validação** | Zod | Schemas tipados, erros claros |
| **Upload** | Multer | Mídia do WhatsApp |
| **PDF** | pdfkit | Ordens de serviço (Fase 2\) |
| **IA / Automação** | n8n self-hosted | Já rodando na VPS, você já conhece |
| **WhatsApp** | Evolution API | Gateway já em uso nos outros clientes |

**3\. Fluxo Completo de Mensagem**

Evolution API  →  POST /api/webhook/evolution  
  │  
  ├─ 1\. Valida assinatura HMAC (rejeita se inválida)  
  ├─ 2\. Responde HTTP 200 OK imediato (\< 500ms)  ← CRÍTICO  
  ├─ 3\. Salva mensagem no PostgreSQL  
  └─ 4\. POST para N8N\_WEBHOOK\_URL com payload  
            │  
            ▼  (n8n processa)  
  ├─ Busca prompt no Redis  →  agent:{id}:prompt  
  ├─ GET /api/conversations/:id/messages  (histórico)  
  ├─ Chama LLM  →  gera resposta  
  ├─ Envia via Evolution API  →  cliente recebe  
  └─ POST /api/conversations/:id/bot-reply  →  backend salva  
            │  
            ▼  
  Socket.io broadcast  →  frontend atualiza chat em tempo real

*Por que responder 200 OK antes de chamar o n8n? Se o backend demorar mais de 15s para responder, a Evolution API reenvia o mesmo evento — gerando resposta duplicada para o cliente.*

**4\. Schema do Banco de Dados**

| Tabela | Campos principais |
| :---- | :---- |
| users | id, name, email, password\_hash, role (admin|agent), created\_at |
| contacts | id, name, phone, email, source, status, assigned\_to (FK), created\_at |
| pipeline\_stages | id, name, order\_index, color |
| pipeline\_cards | id, contact\_id, stage\_id, assigned\_to, notes, timestamps |
| conversations | id, contact\_id, channel, status (open|bot|human|closed), assigned\_agent\_id |
| messages | id, conversation\_id, direction, content\_type, content, media\_url, sent\_by |
| ai\_agents | id, name, role, system\_prompt, llm\_model, temperature, typing\_delay\_ms, is\_active |
| settings | id, key, value, updated\_at  ← config global \+ horário comercial |
| service\_orders | id, contact\_id, title, status, total\_value  (Fase 2\) |
| financial\_entries | id, type, category, amount, date  (Fase 2\) |

**5\. Redis — Padrão de Chaves**

| Chave Redis | Conteúdo |
| :---- | :---- |
| agent:{id}:prompt | System prompt do agente (string) |
| agent:{id}:config | { llm\_model, temperature, typing\_delay\_ms } (JSON) |
| settings:business\_hours | { "start": "08:00", "end": "18:00" } (JSON) |
| settings:away\_message | Texto da mensagem de ausência (string) |
| settings:evolution\_url | URL base da Evolution API (string) |

Regra de sincronização: toda vez que o backend atualiza um agente ou configuração, ele salva no PostgreSQL E escreve no Redis. O n8n sempre lê do Redis (nunca bate no banco diretamente).

**6\. Endpoints da API**

**Autenticação**

| Método \+ Rota | Descrição |
| :---- | :---- |
| POST /api/auth/login | Login com email \+ senha, retorna JWT |
| POST /api/auth/refresh | Renova o token JWT |

**Contatos e Pipeline**

| Método \+ Rota | Descrição |
| :---- | :---- |
| GET /api/contacts | Lista contatos com filtros e paginação |
| POST /api/contacts | Cria contato |
| PUT /api/contacts/:id | Atualiza contato |
| GET /api/pipeline/stages | Lista colunas do Kanban |
| GET /api/pipeline/cards | Lista cards com stage atual |
| PUT /api/pipeline/cards/:id | Move card de coluna (drag & drop) |

**Conversas e Chat**

| Método \+ Rota | Descrição |
| :---- | :---- |
| GET /api/conversations | Lista conversas abertas |
| GET /api/conversations/:id/messages | Histórico de mensagens (usado pelo n8n) |
| PUT /api/conversations/:id/assign | Agente humano assume o atendimento |
| PUT /api/conversations/:id/close | Fecha conversa |
| POST /api/conversations/:id/bot-reply | n8n avisa que respondeu (salva \+ Socket.io) |

**Webhook, Agentes e Config**

| Método \+ Rota | Descrição |
| :---- | :---- |
| POST /api/webhook/evolution | Recebe mensagens da Evolution API |
| GET /api/agents | Lista agentes de IA |
| POST /api/agents | Cria agente (salva banco \+ Redis) |
| PUT /api/agents/:id | Atualiza agente (salva banco \+ Redis) |
| GET /api/settings | Retorna configurações globais |
| PUT /api/settings | Atualiza config (salva banco \+ Redis) |
| GET /api/stats | Métricas para o dashboard |

**7\. Estrutura de Pastas**

mega-crm/  
├── .env  
├── docker-compose.yml  
│  
├── backend/  
│   ├── src/  
│   │   ├── app.js  
│   │   ├── config/  
│   │   │   ├── database.js      ← Knex \+ PostgreSQL  
│   │   │   ├── redis.js         ← conexão Redis  
│   │   │   └── env.js           ← validação Zod das variáveis  
│   │   ├── middleware/  
│   │   │   ├── auth.js          ← JWT middleware  
│   │   │   ├── errorHandler.js  ← handler global de erros  
│   │   │   └── webhookValidator.js  ← HMAC Evolution  
│   │   ├── routes/  
│   │   │   ├── auth.routes.js  
│   │   │   ├── contacts.routes.js  
│   │   │   ├── pipeline.routes.js  
│   │   │   ├── conversations.routes.js  
│   │   │   ├── agents.routes.js  
│   │   │   ├── settings.routes.js  
│   │   │   ├── stats.routes.js  
│   │   │   └── webhook.routes.js  
│   │   ├── services/  
│   │   │   ├── n8n.service.js       ← chama n8n via HTTP  
│   │   │   ├── redis.service.js     ← leitura/escrita Redis  
│   │   │   └── socket.service.js    ← broadcast WebSocket  
│   │   └── db/  
│   │       ├── knexfile.js  
│   │       └── migrations/  
│   └── Dockerfile  
│  
└── frontend/   ← Fase 2

**8\. Ordem de Desenvolvimento — Backend**

1. Docker Compose: PostgreSQL \+ Redis rodando e saudáveis

2. Estrutura base: Express 4, pastas, conexões com banco e Redis

3. Variáveis de ambiente validadas com Zod no startup

4. Migrations: todas as 7 tabelas criadas

5. Auth: POST /login, geração de JWT, middleware de autenticação

6. CRUD: contacts \+ pipeline (stages \+ cards)

7. Webhook Evolution: receber \+ validar HMAC \+ chamar n8n.service

8. Rota bot-reply: receber do n8n \+ salvar \+ Socket.io broadcast

9. CRUD: agents \+ settings com sync Redis

10. Rota stats para o dashboard

11. Testes ponta a ponta: WhatsApp → n8n → resposta → Socket.io

**9\. Prompt Mestre — Cole no Claude Opus 4.6**

*Copie o bloco abaixo inteiro e cole como primeira mensagem no Antigravity. Ele instrui o modelo com toda a arquitetura antes de pedir qualquer código.*

**\# CONTEXTO DO PROJETO**  
Você é um Engenheiro de Software Sênior. Vamos construir do zero o \*\*Mega CRM\*\*,  
um sistema single-tenant de gestão de leads e atendimento via WhatsApp com IA.  
 

**\# STACK OBRIGATÓRIA — NÃO ALTERAR**  
Backend:  Node.js \+ Express 4 (CommonJS, sem ES Modules, sem Express 5\)  
Banco:    PostgreSQL \+ Knex.js (migrations versionadas)  
Cache:    Redis (prompts dos agentes \+ config global)  
WS:       Socket.io (tempo real pro frontend)  
Auth:     JWT \+ bcrypt  
Validação: Zod  
Upload:   Multer  
IA/Auto:  n8n self-hosted (roda separado, comunicação via HTTP)  
 

**\# ARQUITETURA (NÃO MUDAR)**  
\- O backend NÃO chama o LLM diretamente.  
\- O backend recebe o webhook da Evolution API, salva no banco e repassa pro n8n.  
\- O n8n busca o prompt no Redis, chama o LLM e responde o cliente.  
\- O n8n avisa o backend via POST /api/conversations/:id/bot-reply.  
\- O backend faz broadcast via Socket.io pro frontend atualizar o chat.  
 

**\# REDIS — PADRÃO DE CHAVES**  
agent:{id}:prompt        → system prompt (string)  
agent:{id}:config        → modelo, temperatura, delay (JSON)  
settings:business\_hours  → { start, end } (JSON)  
settings:away\_message    → texto (string)  
settings:evolution\_url   → URL da Evolution API (string)  
 

**\# CONTRATO BACKEND → n8n**  
POST {N8N\_WEBHOOK\_URL} com body: { conversation\_id, contact: { id, name, phone },  
message: { id, content, content\_type, created\_at }, agent\_id, instance }  
 

**\# CONTRATO n8n → BACKEND**  
POST /api/conversations/:id/bot-reply com body:  
{ conversation\_id, message: { content, content\_type, sent\_by }, action: "replied"|"transfer\_human" }

**10\. Variáveis de Ambiente**

\# Servidor  
NODE\_ENV=production  
PORT=3001  
   
\# PostgreSQL  
DATABASE\_URL=postgresql://user:senha@postgres:5432/megacrm  
DB\_USER=megacrm\_user  
DB\_PASSWORD=senha\_forte\_aqui  
   
\# Redis  
REDIS\_URL=redis://redis:6379  
   
\# Autenticação  
JWT\_SECRET=string\_aleatoria\_longa\_minimo\_64\_chars  
   
\# Evolution API  
EVOLUTION\_API\_URL=https://sua-evolution.com  
EVOLUTION\_API\_KEY=sua\_chave\_aqui  
EVOLUTION\_WEBHOOK\_SECRET=secret\_para\_validacao\_hmac  
   
\# n8n (roda separado na VPS)  
N8N\_WEBHOOK\_URL=http://n8n:5678/webhook/mega-crm-message

*Mega CRM — Documento Mestre v2.0  |  Lucas Borges Studio  |  Junho 2026*