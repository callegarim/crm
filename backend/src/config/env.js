// backend/src/config/env.js
// Validação de variáveis de ambiente com Zod — crasha no startup se faltar algo (fail fast)

const { z } = require('zod');
const dotenv = require('dotenv');
const path = require('path');

// Carrega .env da raiz do projeto (mega-crm/)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),

  // PostgreSQL
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),

  // Redis
  REDIS_URL: z.string().min(1, 'REDIS_URL é obrigatória'),

  // Autenticação
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter no mínimo 32 caracteres'),

  // Evolution API
  EVOLUTION_API_URL: z.string().min(1, 'EVOLUTION_API_URL é obrigatória'),
  EVOLUTION_API_KEY: z.string().min(1, 'EVOLUTION_API_KEY é obrigatória'),
  EVOLUTION_WEBHOOK_SECRET: z.string().min(1, 'EVOLUTION_WEBHOOK_SECRET é obrigatória'),
  EVOLUTION_INSTANCE: z.string().default('mega-whatsapp'),

  // n8n
  N8N_WEBHOOK_URL: z.string().min(1, 'N8N_WEBHOOK_URL é obrigatória'),

  // Segurança interna (n8n → backend)
  INTERNAL_SECRET: z.string().min(16, 'INTERNAL_SECRET deve ter no mínimo 16 caracteres'),

  // Migrations automáticas no startup (default: true em dev, false em prod)
  AUTO_MIGRATE: z.enum(['true', 'false']).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:');
  console.error(parsed.error.format());
  process.exit(1);
}

module.exports = parsed.data;
