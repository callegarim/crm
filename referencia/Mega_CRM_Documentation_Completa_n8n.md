# **Mega CRM — Documentação Oficial de Engenharia e Integração Híbrida (Redis \+ n8n)**

**Versão:** 1.0  
**Escopo:** Mega Acessórios Automotivos (Single-Tenant)  
**Status:** Arquitetura Homologada para Desenvolvimento do Zero  
**Autor:** Lucas Borges Studio

## **1\. Alinhamento Estratégico e Correção de Rumo**

A concepção original do Mega CRM apresentava gargalos arquiteturais severos que inviabilizariam a operação sob alta escala de concorrência. Chamadas síncronas de Inteligência Artificial dentro de handlers de webhook, falta de isolamento de estado nas conexões WebSocket e inconsistência de dialetos entre os ambientes de desenvolvimento e produção foram completamente eliminados. A nova arquitetura híbrida adota um modelo assíncrono orientado a eventos, utilizando o Redis como buffer de alta velocidade e o n8n como motor de orquestração visual de I.A. e regras de negócio.  
Abaixo está o mapeamento detalhado dos riscos técnicos identificados na arquitetura anterior e as respectivas correções estruturais aplicadas nesta revisão:

| Arquitetura Anterior (Incorreta) | Risco de Operação / Impacto Negativo | Nova Abordagem (Blindada)   |
| :---- | :---- | :---- |
| Ambiente local rodando SQLite e produção em PostgreSQL. | **Bugs silenciosos de sintaxe SQL, falhas em migrações críticas e quebra de tipos em produção.** | PostgreSQL padronizado de forma absoluta em todos os ambientes via Docker. |
| Uso do Express 5 (Beta) e ES Modules nativos no Node.js. | **Instabilidade do framework em produção e incompatibilidade com pacotes legados do ecossistema npm.** | Downgrade para Express 4 (Estável) estruturado em CommonJS padrão mercado. |
| Chamada inline de LLM (Llama 3.3) dentro do handler do webhook da Evolution API. | **Timeouts frequentes de HTTP, travamento do Event Loop e disparos duplicados de mensagens idênticas para o lead.** | Ingestão em fila de alta velocidade com BullMQ \+ Redis, liberando o webhook em menos de 100ms. |
| Conexão WebSocket aberta sem validação ou isolamento. | **Vazamento de dados operacionais, brechas de segurança e falta de sincronia real no Kanban.** | Autenticação por token JWT diretamente no handshake e controle de escopo por salas (Rooms). |
| Integração direta de código customizado para regras e perfis de I.A. | **Complexidade de manutenção de prompts e indisponibilidade do sistema em cenários de falhas de provedores de LLM.** | Descentralização total da lógica de agentes para workflows visuais isolados dentro do n8n. |

## **2\. Arquitetura de Software e Stack Tecnológica**

O ecossistema é dividido de forma estrita em três camadas operacionais independentes: Interface (Frontend), Motor de Persistência e Eventos (Backend) e Orquestração Avançada (Automação/I.A.).

### **2.1 Camada de Frontend**

* **Core Framework:** React.js impulsionado por Vite para garantir compilações extremamente rápidas e carregamento otimizado de assets.  
* **Engine de Estilização:** TailwindCSS implementado de forma exclusiva, eliminando CSS manual redundante e viabilizando o design premium baseado em Glassmorphism e Dark Mode responsivo.  
* **Gerenciamento de Estado Global:** Zustand, provendo uma centralização leve de estados visuais sem o boilerplate intrínseco do Redux.  
* **Comunicação e Sincronismo:** React Query (TanStack Query) para cache inteligente de requisições HTTP RESTful, operando em paralelo com Socket.io-client para manipulação imediata de eventos de chat e movimentações no Kanban.

### **2.2 Camada de Backend e Infraestrutura**

* **Runtime Server:** Node.js acoplado ao Express 4 estável, utilizando CommonJS para interoperabilidade total de módulos.  
* **Segurança e Validação:** jsonwebtoken para controle rígido de sessões de usuários baseado em papéis (roles), bcrypt para cifragem de credenciais e Zod para validação severa de payloads na camada de transporte.  
* **Processamento Assíncrono:** Fila estruturada via BullMQ alimentada por uma instância dedicada do Redis, isolando tarefas pesadas do fluxo principal de requisições HTTP.  
* **Banco de Dados Core:** PostgreSQL gerenciado de forma ágil através do construtor de queries Knex.js, provendo migrações e sementes versionadas.  
* **Orquestração de Container:** Docker e Docker Compose servidos em produção via Coolify em uma VPS sob proxy reverso Nginx.

### **2.3 Camada de Orquestração Inteligente (n8n)**

* **Engine de Fluxo:** n8n Self-Hosted rodando via container integrado à sub-rede interna do Docker Compose, comunicando-se de forma direta com o backend sem necessidade de exposição de portas para a rede externa.

## **3\. Modelo de Dados Relacional (Schema PostgreSQL)**

O banco de dados foi modelado para suportar consistência absoluta e integridade referencial nas operações de chat e movimentações operacionais do funil:

| Tabela | Atributos e Chaves Relacionais   |
| :---- | :---- |
| **users** | id (UUID), name (VARCHAR), email (VARCHAR, UNIQUE), password\_hash (TEXT), role (ENUM: 'admin', 'agent', 'viewer'), created\_at (TIMESTAMP) |
| **contacts** | id (UUID), name (VARCHAR), phone (VARCHAR, UNIQUE), email (VARCHAR), source (VARCHAR), status (VARCHAR), assigned\_to (FK users, NULLABLE), created\_at (TIMESTAMP), updated\_at (TIMESTAMP) |
| **pipeline\_stages** | id (INT, PK), name (VARCHAR), order\_index (INT), color (VARCHAR) |
| **pipeline\_cards** | id (UUID), contact\_id (FK contacts, UNIQUE), stage\_id (FK pipeline\_stages), assigned\_to (FK users, NULLABLE), notes (TEXT), updated\_at (TIMESTAMP) |
| **conversations** | id (UUID), contact\_id (FK contacts), channel (VARCHAR: 'whatsapp'), status (ENUM: 'open', 'bot', 'human', 'closed'), assigned\_agent\_id (FK users, NULLABLE), updated\_at (TIMESTAMP) |
| **messages** | id (UUID), conversation\_id (FK conversations), direction (ENUM: 'inbound', 'outbound'), content\_type (ENUM: 'text', 'image', 'audio', 'video', 'doc'), content (TEXT), media\_url (TEXT, NULLABLE), sent\_by (VARCHAR: 'agent\_id', 'bot', 'system'), created\_at (TIMESTAMP) |
| **ai\_agents** | id (UUID), name (VARCHAR), role (VARCHAR), system\_prompt (TEXT), llm\_model (VARCHAR), temperature (FLOAT), typing\_delay\_ms (INT), is\_active (BOOLEAN) |
| **automation\_config** | id (INT, PK, Single Row), evolution\_api\_url (TEXT), evolution\_api\_key\_encrypted (TEXT), business\_hours\_start (TIME), business\_hours\_end (TIME), away\_message (TEXT) |

## **4\. Fluxo Crítico Assíncrono de Mensagens e I.A.**

Para neutralizar os erros de timeout provocados pelo tempo de processamento das respostas dos modelos generativos de grande porte, o sistema divide a recepção e a execução de forma estrita em etapas atômicas:

\[Evolution API\]  
      │  
      ▼  (Payload disparado via Webhook com assinatura HMAC)  
\[Backend Express: POST /api/webhook/evolution\]  
      │  
      ├── 1\. Middleware executa validação criptográfica do segredo HMAC.  
      ├── 2\. Backend persiste a mensagem bruta imediatamente no PostgreSQL.  
      ├── 3\. Backend retorna resposta HTTP 200 OK para a Evolution em \< 100ms.  
      └── 4\. O ID da mensagem é jogado para a fila 'message-processor' do BullMQ.  
                                │  
                                ▼  (Consumo assíncrono via Worker dedicado)  
                     \[Worker BullMQ / Redis\]  
                                │  
                                ▼  (Repasse limpo via protocolo HTTP interno)  
                 \[Webhook de Entrada do n8n\]

**Por que este fluxo é infalível:** Como a Evolution API recebe a confirmação de recebimento instantaneamente, ela extingue qualquer rotina de reenvio por timeout. O worker e o n8n possuem total liberdade temporal para processar e estruturar a inteligência de resposta sem comprometer as requisições ativas no ecossistema.

## **5\. Engenharia do Workflow de Orquestração no n8n**

O n8n opera centralizando os fluxos lógicos e isolando o código de integrações pesadas das LLMs. O roteiro analítico executado pelo workflow segue os seguintes nós sequenciais:

1. **Webhook Node (Ingestão):** Captura o ID da mensagem despachado de forma assíncrona pelo Worker do BullMQ.  
2. **HTTP Request Node (Recuperação de Contexto):** Faz uma chamada interna na API do backend para resgatar as últimas 10 mensagens da conversa, os metadados do contato e a etapa atual do funil do CRM.  
3. **Switch Node (Validação Operacional):** Avalia duas regras de negócio cruciais:  
   • Se o status da conversa estiver configurado como **'human'**, o fluxo encerra imediatamente para garantir a prioridade total do atendente humano.  
   • Verifica se o timestamp atual se encontra fora do intervalo parametrizado nas variáveis de horário de expediente comercial. Caso negativo, desvia para o nó de mensagem automática de ausência (Away Message).  
4. **Router Node (Identificação do Agente):** Com base no estágio atual do Kanban do contato, o n8n define qual o prompt de sistema do agente correspondente deve ser utilizado. Contatos em estágio inicial ativam a persona **Maya (SDR)**, leads avançados ativam a persona **Oliver (VSL)** e negociações diretas acionam as regras da persona **Lara/Morgana (Closer)**.  
5. **Advanced AI Node (Processamento Generativo):** Conecta-se à API do Groq ou OpenAI carregando o modelo **llama-3.3-70b-versatile**. O nó utiliza uma memória estruturada baseada em buffer para manter a fluidez histórica da conversa.  
6. **Conditional Node (Análise de Transição de Status):** Avalia a saída sintática da I.A. Caso a string contenha a tag estrutural **\[TRANSFERIR\_HUMANO\]**, o n8n executa de forma automática um comando **PATCH /api/conversations/:id** no backend, alterando o status para 'human' e disparando o alerta visual para os agentes reais no frontend.  
7. **HTTP Request Node (Despacho de Resposta):** Se for uma interação normal, o n8n envia a resposta tratada diretamente para o endpoint de envio de texto da Evolution API, e em seguida registra o evento de saída via **POST /api/messages** no backend para que o Socket.io propague o balão de chat na tela do painel em tempo real.

## **6\. Protocolos de Segurança e Autenticação**

### **6.1 Handshake Seguro do WebSocket**

A API de Socket.io não aceita conexões anônimas. A validação criptográfica do token JWT ocorre diretamente na interceptação inicial (handshake):

io.use((socket, next) \=\> {  
  const token \= socket.handshake.auth.token;  
  try {  
    const user \= jwt.verify(token, process.env.JWT\_SECRET);  
    socket.user \= user;  
    next();  
  } catch (err) {  
    next(new Error('Falha na Autenticação: Token Inválido'));  
  }  
});

### **6.2 Isolamento de Dados por Salas (Rooms)**

Para mitigar sobrecarga de rede e impedir vazamento de dados entre atendentes no frontend premium, as atualizações de mensagens são segregadas por identificadores de conversas:

socket.on('joinConversation', (conversationId) \=\> {  
  socket.join(\`conversation:${conversationId}\`);  
});

// Envio direcionado e cirúrgico de novas mensagens:  
io.to(\`conversation:${conversationId}\`).emit('new-message', messagePayload);

## **7\. Configurações Globais e Estrutura de Diretórios**

### **7.1 Estrutura de Pastas Padronizada**

mega-crm/  
├── docker-compose.yml  
├── .env  
├── backend/  
│   ├── src/  
│   │   ├── config/          \# Conexões DB, Redis e chaves de ambiente  
│   │   ├── middleware/      \# Validador de HMAC e Autenticação JWT  
│   │   ├── routes/          \# CRUDs e receptores de Webhooks  
│   │   ├── workers/         \# messageProcessor.worker.js (BullMQ)  
│   │   ├── services/        \# Abstração de chamadas internas da API  
│   │   ├── db/              \# Migrations do Knex.js  
│   │   └── app.js           \# Inicialização do Express e Socket.io  
│   └── Dockerfile  
└── frontend/  
    ├── src/  
    │   ├── components/      \# UI atômica e estilizações Glassmorphism  
    │   ├── pages/           \# Kanban, Chat em Tempo Real, Configurações  
    │   ├── stores/          \# Estado reativo via Zustand  
    │   ├── hooks/           \# Orquestração de conexões de Sockets e Query  
    │   └── main.jsx  
    └── Dockerfile

### **7.2 Variáveis de Ambiente Essenciais (.env)**

\# Configurações do Core Backend  
NODE\_ENV=production  
PORT=3001  
DATABASE\_URL=postgresql://postgres\_user:strong\_password@postgres:5432/megacrm  
REDIS\_URL=redis://redis:6379  
JWT\_SECRET=9b1deb4d3b72c6858e5f242d547f3112a232f059

\# Parametrização da Evolution API  
EVOLUTION\_API\_URL=https://api.evolution.megaacessoriosautomotivos.com.br  
EVOLUTION\_API\_KEY=ev\_secret\_key\_prod\_7712  
EVOLUTION\_WEBHOOK\_SECRET=hmac\_signature\_validation\_token\_9901

\# Parametrização Core da Automação n8n  
N8N\_HOST=automation.megaacessoriosautomotivos.com.br  
N8N\_PORT=5678  
N8N\_PROTOCOL=https  
WEBHOOK\_URL=https://automation.megaacessoriosautomotivos.com.br/

## **8\. Orquestração de Ambiente (Docker Compose)**

O manifesto de Docker Compose consolida todos os microsserviços necessários para inicialização da infraestrutura de alta velocidade através do Coolify:

version: '3.8'

services:  
  postgres:  
    image: postgres:15-alpine  
    environment:  
      POSTGRES\_DB: megacrm  
      POSTGRES\_USER: ${DB\_USER}  
      POSTGRES\_PASSWORD: ${DB\_PASSWORD}  
    volumes:  
      \- postgres\_data:/var/lib/postgresql/data  
    ports:  
      \- "5432:5432"

  redis:  
    image: redis:7-alpine  
    volumes:  
      \- redis\_data:/data  
    command: redis-server \--appendonly yes

  backend:  
    build: ./backend  
    ports:  
      \- "3001:3001"  
    environment:  
      \- NODE\_ENV=production  
      \- DATABASE\_URL=postgresql://${DB\_USER}:${DB\_PASSWORD}@postgres:5432/megacrm  
      \- REDIS\_URL=redis://redis:6379  
    depends\_on:  
      \- postgres  
      \- redis  
    restart: unless-stopped

  worker:  
    build: ./backend  
    command: node src/workers/messageProcessor.worker.js  
    environment:  
      \- NODE\_ENV=production  
      \- DATABASE\_URL=postgresql://${DB\_USER}:${DB\_PASSWORD}@postgres:5432/megacrm  
      \- REDIS\_URL=redis://redis:6379  
    depends\_on:  
      \- postgres  
      \- redis  
    restart: unless-stopped

  n8n:  
    image: docker.n8n.io/n8nio/n8n:latest  
    ports:  
      \- "5678:5678"  
    environment:  
      \- N8N\_HOST=${N8N\_HOST}  
      \- N8N\_PORT=5678  
      \- N8N\_PROTOCOL=https  
      \- NODE\_ENV=production  
      \- WEBHOOK\_URL=${WEBHOOK\_URL}  
    volumes:  
      \- n8n\_data:/home/node/.n8n  
    depends\_on:  
      \- postgres  
      \- redis  
    restart: unless-stopped

  frontend:  
    build: ./frontend  
    ports:  
      \- "8081:80"  
    depends\_on:  
      \- backend

volumes:  
  postgres\_data:  
  redis\_data:  
  n8n\_data:

## **9\. Roteiro Cronológico de Execução do Projeto**

A construção do ecossistema parte de uma estratégia incremental dividida em marcos técnicos severos para validação de estabilidade do MVP:

| Etapa | Foco de Desenvolvimento | Entregável Homologado   |
| :---- | :---- | :---- |
| **01** | Setup Base e Infraestrutura Inicial | Ambientes isolados via Docker Compose com PostgreSQL, Redis e n8n operacionais se comunicando de forma interna. |
| **02** | Engenharia do Core Backend | Estrutura de migrations executadas via Knex.js e rotas de autenticação protegidas por assinatura de tokens JWT. |
| **03** | Desenvolvimento da Interface | Telas de login e painel visual de Kanban integrados aos dados reais do banco através de React Query. |
| **04** | Acoplamento Assíncrono do Webhook | Handler de webhook recebendo cargas da Evolution API, checando HMAC e distribuindo via BullMQ sem latência. |
| **05** | Modelagem de Fluxos n8n | Workflow montado com lógica de horário comercial, chamadas analíticas à LLM llama-3.3 e roteador automático de tags. |
| **06** | Sincronismo WebSocket S3 | Interface de chat ativa no frontend atualizando em tempo real via Socket.io no momento exato das postagens das respostas da I.A. |

---

Documento de Engenharia de Sistemas — Lucas Borges Studio — 2026\. Todos os direitos reservados.