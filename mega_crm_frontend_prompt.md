# Mega CRM — Documento Frontend + Prompt de Desenvolvimento
**Versão:** 1.0 | React + Vite + TypeScript + TailwindCSS + shadcn/ui

---

## 1. Design System — BMW M Style (Adaptado para CRM)

O frontend segue o design system documentado em `DESIGN-bmw-m.md`.
Regras absolutas que nunca quebram:

### Cores (CSS Variables obrigatórias)
```css
:root {
  --canvas:           #000000;
  --surface-card:     #1a1a1a;
  --surface-elevated: #262626;
  --surface-soft:     #0d0d0d;
  --carbon-gray:      #2b2b2b;
  --hairline:         #3c3c3c;
  --hairline-strong:  #262626;
  --ink:              #ffffff;
  --body:             #bbbbbb;
  --body-strong:      #e6e6e6;
  --muted:            #7e7e7e;
  --m-blue-light:     #0066b1;
  --m-blue-dark:      #1c69d4;
  --m-red:            #e22718;
  --warning:          #f4b400;
  --success:          #0fa336;
}
```

### Tipografia
- **Font:** BMWTypeNextLatin (importar via Google Fonts fallback: Inter)
- **Display:** 700 weight, UPPERCASE, letter-spacing 0
- **Labels/Botões:** 700, UPPERCASE, letter-spacing 1.5px
- **Body:** 300 (Light), sentence-case, nunca bold
- **Caption:** 400, letter-spacing 0.5px

### Border Radius
- **Padrão:** 0px (tudo sharp/quadrado)
- **Exceção:** 9999px apenas em botões circulares de ícone

### Componente M-Stripe
```css
.m-stripe {
  height: 4px;
  background: linear-gradient(to right, #0066b1 0%, #1c69d4 50%, #e22718 100%);
}
```
Usar apenas como divisor decorativo. NUNCA como fill de botão ou surface.

---

## 2. Stack Técnica

```
React 18 + Vite + TypeScript
TailwindCSS (config customizado com tokens do design system)
shadcn/ui (componentes base, todos reestilizados pro tema dark BMW M)
Zustand (estado global)
React Query / TanStack Query (cache e sync com a API)
Socket.io-client (tempo real: Kanban, chat)
Axios (HTTP client)
React Router v6 (roteamento)
Lucide React (ícones)
```

---

## 3. Estrutura de Pastas

```
frontend/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── Dockerfile
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css              ← CSS variables + base styles
    │
    ├── lib/
    │   ├── api.ts             ← Axios instance (baseURL + JWT interceptor)
    │   ├── socket.ts          ← Socket.io client singleton
    │   └── utils.ts           ← cn(), formatDate(), formatPhone()
    │
    ├── stores/
    │   ├── authStore.ts       ← user, token, login(), logout()
    │   └── socketStore.ts     ← conexão WS global
    │
    ├── hooks/
    │   ├── useAuth.ts
    │   ├── useSocket.ts
    │   └── useConversation.ts
    │
    ├── components/
    │   ├── ui/                ← shadcn/ui customizados (tema BMW M)
    │   │   ├── Button.tsx
    │   │   ├── Input.tsx
    │   │   ├── Badge.tsx
    │   │   ├── Card.tsx
    │   │   └── MStripe.tsx    ← componente da tricolor M
    │   │
    │   └── layout/
    │       ├── Sidebar.tsx    ← navegação lateral
    │       ├── TopBar.tsx     ← header com user info
    │       └── AppLayout.tsx  ← wrapper das páginas
    │
    └── pages/
        ├── Login.tsx          ← tela de login
        ├── Dashboard.tsx      ← métricas + stats
        ├── Kanban.tsx         ← pipeline drag & drop
        ├── Conversations.tsx  ← lista de conversas
        ├── Chat.tsx           ← interface de chat
        ├── Contacts.tsx       ← CRUD contatos
        ├── Agents.tsx         ← gerenciar agentes IA (admin)
        └── Settings.tsx       ← configurações globais (admin)
```

---

## 4. Configuração Tailwind (tokens do design system)

```typescript
// tailwind.config.ts
export default {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas:    '#000000',
        card:      '#1a1a1a',
        elevated:  '#262626',
        soft:      '#0d0d0d',
        carbon:    '#2b2b2b',
        hairline:  '#3c3c3c',
        ink:       '#ffffff',
        body:      '#bbbbbb',
        'body-strong': '#e6e6e6',
        muted:     '#7e7e7e',
        'm-blue':  '#1c69d4',
        'm-blue-light': '#0066b1',
        'm-red':   '#e22718',
        warning:   '#f4b400',
        success:   '#0fa336',
      },
      fontFamily: {
        bmw: ['BMWTypeNextLatin', 'Inter', 'sans-serif'],
      },
      letterSpacing: {
        machined: '1.5px',
        caption: '0.5px',
      },
      borderRadius: {
        DEFAULT: '0px',
        full: '9999px',
      }
    }
  }
}
```

---

## 5. Páginas e Funcionalidades

### Login
- Canvas preto puro, logo Mega CRM centralizado com M-stripe abaixo
- Formulário: email + senha, botão primário UPPERCASE
- JWT salvo no Zustand + localStorage
- Redirect automático se já logado

### Dashboard
- Grid de 4 stat cards: Total de Conversas, Conversas Abertas, Contatos, Taxa de Resposta IA
- Gráfico de mensagens por dia (últimos 7 dias) — Recharts, tema dark
- Lista de conversas recentes com status badge
- Dados via GET /api/stats + React Query (refetch a cada 30s)

### Kanban
- Colunas horizontais com scroll, uma por pipeline stage
- Cards arrastáveis entre colunas (react-beautiful-dnd ou @dnd-kit/core)
- Card mostra: nome do contato, telefone, responsável, data
- Drag & drop chama PUT /api/pipeline/cards/:id
- Socket.io: evento `card-moved` atualiza todos os usuários conectados em tempo real
- Botão "+" em cada coluna para criar novo card

### Conversas
- Lista de conversas com filtros: Todas / Bot / Humano / Fechadas
- Badge de status colorido (bot = m-blue, humano = success, fechada = muted)
- Clique abre o chat

### Chat
- Layout 2 colunas: lista de conversas (esquerda) + mensagens (direita)
- Bolhas de mensagem: inbound à esquerda (surface-card), outbound à direita (m-blue-dark)
- Botão "Assumir Atendimento" — chama PUT /api/conversations/:id/assign
- Input de texto + botão enviar (integração Evolution API via backend)
- Socket.io: evento `new-message` atualiza o chat em tempo real sem reload

### Contatos
- Tabela com paginação: nome, telefone, email, status, responsável, data
- Filtros por status e busca por nome/telefone
- Modal de criação/edição
- Clique no contato mostra histórico de conversas

### Agentes IA (admin only)
- Cards dos agentes com nome, modelo LLM, status ativo/inativo
- Modal de edição: nome, system prompt (textarea grande), modelo, temperatura, delay
- Salvar chama PUT /api/agents/:id (atualiza banco + Redis automaticamente)

### Configurações (admin only)
- Formulário com abas: Geral / Evolution API / LLM / Horário Comercial
- Horário: time pickers para abertura e fechamento
- Away message: textarea
- Salvar chama PUT /api/settings

---

## 6. Comunicação com o Backend

### api.ts (Axios com interceptor JWT)
```typescript
import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
```

### socket.ts (Socket.io singleton)
```typescript
import { io } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';

let socket: ReturnType<typeof io> | null = null;

export const getSocket = () => {
  if (!socket) {
    const token = useAuthStore.getState().token;
    socket = io(import.meta.env.VITE_WS_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
    });
  }
  return socket;
};
```

---

## 7. Variáveis de Ambiente (Frontend)

```env
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=http://localhost:3001
```

Em produção:
```env
VITE_API_URL=https://crm.megaacessoriosautomotivos.com.br/api
VITE_WS_URL=wss://crm.megaacessoriosautomotivos.com.br
```

---

## 8. Dockerfile do Frontend

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# nginx.conf
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api {
    proxy_pass http://backend:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
  }
}
```

---

## 9. Ordem de Desenvolvimento — Frontend

1. Setup: Vite + TypeScript + Tailwind + shadcn/ui configurados com tokens BMW M
2. Componentes base: Button, Input, Card, Badge, MStripe
3. Layout: Sidebar + TopBar + AppLayout
4. Autenticação: Login page + authStore + interceptor Axios
5. Dashboard: stat cards + gráfico + lista recente
6. Kanban: colunas + cards + drag & drop + Socket.io
7. Chat: lista de conversas + interface de mensagens + Socket.io
8. Contatos: tabela + filtros + modal CRUD
9. Agentes: cards + modal de edição de prompt
10. Configurações: formulário com abas

---

## 10. PROMPT MESTRE — Cole no Claude Opus 4.6

```
# CONTEXTO
Você é um Engenheiro Frontend Sênior. Vamos construir o frontend do Mega CRM,
um sistema de gestão de leads e atendimento via WhatsApp com IA.

# STACK OBRIGATÓRIA — NÃO ALTERAR
- React 18 + Vite + TypeScript
- TailwindCSS configurado com os tokens do DESIGN-bmw-m.md
- shadcn/ui (componentes reestilizados pro tema dark)
- Zustand (estado global: auth, socket)
- React Query / TanStack Query (dados da API)
- Socket.io-client (tempo real)
- Axios (HTTP, com interceptor JWT)
- React Router v6
- Lucide React (ícones)

# DESIGN SYSTEM — REGRAS ABSOLUTAS (do arquivo DESIGN-bmw-m.md)
- Canvas: #000000 (preto puro em tudo)
- Sem border-radius exceto botões circulares de ícone (9999px)
- Tipografia: BMWTypeNextLatin (fallback: Inter)
- Display/Botões: 700 weight, UPPERCASE, letter-spacing 1.5px
- Body: 300 (Light), sentence-case, NUNCA bold
- M-stripe (tricolor): apenas como divisor decorativo (4px height, gradiente azul→azul→vermelho)
- NUNCA usar a tricolor como fill de botão ou surface

# BACKEND (já pronto e rodando)
- API REST: http://localhost:3001/api
- WebSocket: http://localhost:3001 (Socket.io com auth JWT)
- Autenticação: JWT via header Authorization: Bearer {token}
- Rotas internas (do n8n): header x-internal-secret

# EVENTOS SOCKET.IO QUE O FRONTEND ESCUTA
- new-message: { conversationId, message } → atualiza chat em tempo real
- card-moved: { cardId, stageId } → atualiza Kanban em tempo real
- conversation-updated: { conversationId, status } → atualiza lista de conversas

# ESTRUTURA DE PASTAS (seguir exatamente)
frontend/src/
  lib/api.ts, socket.ts, utils.ts
  stores/authStore.ts, socketStore.ts
  hooks/useAuth.ts, useSocket.ts, useConversation.ts
  components/ui/ (shadcn customizados)
  components/layout/ (Sidebar, TopBar, AppLayout)
  pages/ (Login, Dashboard, Kanban, Conversations, Chat, Contacts, Agents, Settings)

# PRIMEIRA TAREFA
Setup completo do projeto:
1. package.json com todas as dependências
2. vite.config.ts
3. tailwind.config.ts com TODOS os tokens de cor e tipografia do DESIGN-bmw-m.md
4. src/index.css com CSS variables e font-face BMWTypeNextLatin
5. src/main.tsx e src/App.tsx com React Router configurado
6. src/lib/api.ts (Axios + interceptor JWT + redirect 401)
7. src/stores/authStore.ts (Zustand: user, token, login, logout)

Não pule nenhum arquivo. Cada arquivo deve ser completo e funcional.
```

---

*Mega CRM Frontend — Lucas Borges Studio — Junho 2026*
