# Documentação Oficial - Mega CRM

## 1. Visão Geral
O **Mega CRM** é um sistema completo de gestão de relacionamento com o cliente, vendas e automações, projetado para oferecer uma interface moderna, rápida e integrada com Inteligência Artificial. Ele centraliza o fluxo de atendimento, pipelines de negociação, métricas financeiras e chat multicanal (focado em WhatsApp).

## 2. Arquitetura do Sistema
O projeto utiliza uma arquitetura separada de Frontend e Backend, hospedados via Docker e gerenciados em produção pelo **Coolify**.

*   **Frontend**: Desenvolvido em **React.js + Vite**. Focado em alta performance e design premium com estilos CSS modernos (Dark Mode, Glassmorphism). O frontend consome a API REST e conecta-se via WebSockets para atualizações em tempo real (ex: recebimento de mensagens e atualização de cards no Kanban).
*   **Backend**: Construido com **Node.js e Express 5**, utilizando ES Modules. O servidor gerencia rotas de API RESTful, conexões WebSocket para o painel em tempo real, manipulação de arquivos com Multer e comunicação com o banco de dados.
*   **Banco de Dados**: Utiliza **PostgreSQL** no ambiente de produção (VPS) e SQLite para desenvolvimento local.
*   **Infraestrutura (Deploy)**: Orquestrado pelo Docker via Coolify, rodando na VPS com proxy reverso (Nginx) roteando para o domínio `crm.megaacessoriosautomotivos.com.br`.

---

## 3. Principais Funcionalidades (Módulos)

### 3.1. Dashboard & Métricas
Painel central que exibe o resumo operacional.
*   **Métricas Dinâmicas**: Total de disparos, Taxa de Sucesso, Agentes I.A. Ativos, e Automações rodando.
*   **Gráficos**: Visão geral de novos leads, conversões e faturamento em tempo real.

### 3.2. CRM / Kanban (Pipeline de Vendas)
*   **Gestão Visual**: Organiza clientes e leads em colunas que representam as etapas do funil de vendas (ex: Contato Inicial, Em Negociação, Fechado/Ganho).
*   **Drag & Drop**: Funcionalidade de arrastar e soltar cards entre as colunas.
*   **Atualização Real-Time**: Qualquer alteração feita por um usuário reflete imediatamente na tela de outros usuários conectados.

### 3.3. WhatsApp Chat & Webhooks
Integração completa para atendimento ao cliente.
*   **Evolution API**: Utilizado para gerenciar a instância do WhatsApp Business. O CRM recebe mensagens através de um webhook (`/api/webhook/evolution`) e envia respostas.
*   **Multimídia**: Suporte para envio e recebimento de textos, imagens, vídeos, áudios e documentos.
*   **Chat em Tempo Real**: Interface de chat nativa no frontend, permitindo assumir atendimentos de leads.

### 3.4. Agentes de Inteligência Artificial (Nativos)
O sistema conta com um módulo de I.A. integrado, conectando-se a provedores LLM (como Groq/OpenAI, utilizando modelos de ponta como o `llama-3.3-70b-versatile`).
*   **Múltiplos Perfils**: Agentes como Maya (SDR), Oliver (VSL), Lara e Morgana (Closer), cada um com papéis, permissões ("can_do" / "cannot_do") e tempos de resposta customizáveis.
*   **Intervenção Humana**: A I.A. pode atender, qualificar o lead e, quando necessário, passar o atendimento para um atendente humano.
*   **Configurações de Atraso (Typing Delay)**: Simula o comportamento humano (digitando) antes de enviar a mensagem.

### 3.5. Cadastros
*   **Clientes**: Tabela gerencial de base de contatos, com histórico de compras e status atual do relacionamento.
*   **Produtos**: Catálogo de itens ou serviços vendidos pela loja, permitindo precificação e controle básico.

### 3.6. Operação e Financeiro
*   **Ordens de Serviço**: Geração, impressão (via PDF/e-mail) e gestão do status de serviços prestados a clientes.
*   **Módulo Financeiro**: Registro de entradas e saídas e emissão de orçamentos ou faturas.

### 3.7. Automações & Integrações
*   **Configurações Globais**: Tela de gestão da configuração do LLM (Chave de API, Temperatura, Modelo), Evolution API e definição de horário de expediente comercial (`business_hours_start` / `end`).
*   **Mensagem de Ausência**: Resposta automática ("Away Message") configurável para horários fora do expediente.
*   **Webhooks de Entrada**: Geração de endpoints exclusivos para capturar dados de leads advindos de tráfego pago (Facebook/Instagram Lead Ads) ou landing pages.

---

## 4. Endpoints de Destaque da API (Backend)

*   `GET/POST/PUT /api/agents`: Gerencia o CRUD dos Agentes I.A., configurando roles e cores de avatar.
*   `GET/PUT /api/automation/config`: Resgata ou atualiza parâmetros chaves de LLM e WhatsApp (mascarando chaves de segurança).
*   `POST /api/webhook/evolution`: Recebimento de *payloads* via webhook para mensagens novas. O backend processa o conteúdo da mensagem, salva no banco e engatilha o Agente I.A. (caso o usuário esteja no fluxo automatizado).
*   `GET /api/automation/stats`: Retorna as métricas e estatísticas globais para o topo do Dashboard (conversões, taxa de sucesso, total de execuções).

## 5. Manutenção e Comandos Frequentes

*   **Deploy**: O deploy é feito na VPS de produção rodando o script atualizado sem sobrescrever configurações sensíveis de porta e rede do Coolify.
*   **Portas Nativas da VPS**:
    *   Backend Express: `3001`
    *   Frontend (Vite/Nginx): `8081`
    *   PostgreSQL: `5432` interna (`5433` mapeada).
*   Para reiniciar a aplicação, é recomendável utilizar o painel do próprio Coolify ou, via SSH, `docker compose restart` utilizando o arquivo respectivo do deploy na pasta da stack.
