// backend/src/routes/index.js
// Agregador de rotas — monta tudo em /api

const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const { internalAuth, authOrInternal } = require('../middleware/internalAuth');

// Rotas
const authRoutes = require('./auth.routes');
const contactsRoutes = require('./contacts.routes');
const pipelineRoutes = require('./pipeline.routes');
const conversationsRoutes = require('./conversations.routes');
const agentsRoutes = require('./agents.routes');
const settingsRoutes = require('./settings.routes');
const statsRoutes = require('./stats.routes');
const webhookRoutes = require('./webhook.routes');

const router = express.Router();

// Health check (sem auth — usado pelo Docker healthcheck)
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================
// Rotas públicas
// ============================================================
router.use('/auth', authRoutes);

// Webhook Evolution — usa HMAC ao invés de JWT
router.use('/webhook', webhookRoutes);

// ============================================================
// Rotas protegidas por JWT (frontend)
// ============================================================
router.use('/contacts', auth, contactsRoutes);
router.use('/pipeline', auth, pipelineRoutes);
router.use('/stats', auth, statsRoutes);

// Conversations: aceita JWT (frontend) OU x-internal-secret (n8n)
// O n8n chama POST /api/conversations/:id/bot-reply e GET /api/conversations/:id/messages
// O frontend chama as demais rotas com JWT
router.use('/conversations', authOrInternal, conversationsRoutes);

// Rotas restritas a admin
router.use('/agents', auth, requireRole('admin'), agentsRoutes);
router.use('/settings', auth, requireRole('admin'), settingsRoutes);

module.exports = router;
