// backend/src/server.js
// Entry point — ordem de startup:
// env → banco → migrations → Redis → syncAllFromDatabase → Socket.io → listen

const http = require('http');
const { Server } = require('socket.io');

// 1. ENV — Validação Zod (crasha se faltar variável)
const env = require('./config/env');

// 2. App Express
const app = require('./app');

// Services
const db = require('./config/database');
const { getRedis } = require('./config/redis');
const redisService = require('./services/redis.service');
const socketService = require('./services/socket.service');

const bcrypt = require('bcryptjs');

// ========================
// Security check
// ========================

/**
 * Verifica se o admin seed ainda tem a senha fraca (admin123) em produção.
 * Loga warning vermelho no console se for o caso.
 */
async function checkWeakAdminPassword() {
  try {
    const admin = await db('users').where({ email: 'admin@megacrm.com' }).first();
    if (!admin) return;

    const isWeakPassword = await bcrypt.compare('admin123', admin.password_hash);
    if (isWeakPassword) {
      console.warn('');
      console.warn('🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴');
      console.warn('🔴  ALERTA DE SEGURANÇA: admin@megacrm.com está com a     🔴');
      console.warn('🔴  senha padrão do seed (admin123). TROQUE IMEDIATAMENTE! 🔴');
      console.warn('🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴');
      console.warn('');
    }
  } catch {
    // Ignora — tabela pode não existir ainda
  }
}

// ========================
// Bootstrap
// ========================

async function startServer() {
  try {
    console.log('🚀 Mega CRM — Iniciando servidor...');
    console.log(`📌 Ambiente: ${env.NODE_ENV}`);

    // 2. BANCO — Testa conexão com PostgreSQL
    console.log('🔌 Conectando ao PostgreSQL...');
    await db.raw('SELECT 1');
    console.log('✅ PostgreSQL conectado');

    // 3. MIGRATIONS — Condicionais baseado em AUTO_MIGRATE
    const shouldMigrate =
      env.AUTO_MIGRATE === 'true' ||
      (!env.AUTO_MIGRATE && env.NODE_ENV !== 'production');

    if (shouldMigrate) {
      console.log('📦 Rodando migrations...');
      const [batchNo, log] = await db.migrate.latest({
        directory: require('path').resolve(__dirname, 'db/migrations'),
      });
      if (log.length > 0) {
        console.log(`✅ Batch ${batchNo} executado: ${log.join(', ')}`);
        if (env.NODE_ENV === 'production') {
          console.log('⚠️  ATENÇÃO: Migrations rodaram automaticamente em PRODUÇÃO');
        }
      } else {
        console.log('✅ Nenhuma migration pendente');
      }
    } else {
      console.log('⏭️  AUTO_MIGRATE=false — migrations não executadas (rode manualmente)');
      // Verifica se existem migrations pendentes e avisa
      const [, pending] = await db.migrate.list({
        directory: require('path').resolve(__dirname, 'db/migrations'),
      });
      if (pending.length > 0) {
        console.warn(`⚠️  ${pending.length} migration(s) pendente(s): ${pending.join(', ')}`);
        console.warn('   Rode: npm run migrate');
      }
    }

    // 4. REDIS — Conecta
    console.log('🔌 Conectando ao Redis...');
    const redis = getRedis();
    await redis.connect();
    await redis.ping();
    console.log('✅ Redis conectado');

    // 5. SYNC — Sincroniza agentes e settings do banco → Redis
    console.log('🔄 Sincronizando banco → Redis...');
    await redisService.syncAllFromDatabase(db);

    // ⚠️ CHECK: Aviso de senha fraca do admin em produção
    if (env.NODE_ENV === 'production') {
      await checkWeakAdminPassword();
    }

    // 6. HTTP Server + Socket.io
    const server = http.createServer(app);

    const io = new Server(server, {
      cors: {
        origin: env.NODE_ENV === 'production'
          ? process.env.FRONTEND_URL || 'https://crm.megaacessoriosautomotivos.com.br'
          : '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Inicializa Socket.io com auth JWT
    socketService.init(io);

    // 7. LISTEN
    server.listen(env.PORT, () => {
      console.log('');
      console.log('══════════════════════════════════════════');
      console.log(`  🟢 Mega CRM rodando na porta ${env.PORT}`);
      console.log(`  📡 API:       http://localhost:${env.PORT}/api`);
      console.log(`  ❤️  Health:    http://localhost:${env.PORT}/api/health`);
      console.log(`  🔌 WebSocket: ws://localhost:${env.PORT}`);
      console.log('══════════════════════════════════════════');
      console.log('');
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n🛑 ${signal} recebido — encerrando...`);
      server.close();
      await redis.quit();
      await db.destroy();
      console.log('👋 Servidor encerrado');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (err) {
    console.error('💥 Falha no startup:', err);
    process.exit(1);
  }
}

startServer();
