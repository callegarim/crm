// backend/src/routes/stats.routes.js
// Métricas para o dashboard

const express = require('express');
const db = require('../config/database');

const router = express.Router();

/**
 * GET /api/stats
 * Retorna métricas agregadas para o dashboard
 */
router.get('/', async (req, res, next) => {
  try {
    // Total de contatos
    const totalContacts = await db('contacts').count('id as total').first();

    // Contatos criados hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const contactsToday = await db('contacts')
      .where('created_at', '>=', today.toISOString())
      .count('id as total')
      .first();

    // Conversas por status
    const conversationsByStatus = await db('conversations')
      .select('status')
      .count('id as count')
      .groupBy('status');

    const convMap = {};
    for (const row of conversationsByStatus) {
      convMap[row.status] = parseInt(row.count);
    }

    // Conversas fechadas hoje
    const closedToday = await db('conversations')
      .where('status', 'closed')
      .where('updated_at', '>=', today.toISOString())
      .count('id as total')
      .first();

    // Pipeline summary (contagem por stage)
    const pipelineSummary = await db('pipeline_cards')
      .join('pipeline_stages', 'pipeline_cards.stage_id', 'pipeline_stages.id')
      .select('pipeline_stages.name as stage', 'pipeline_stages.color', 'pipeline_stages.order_index')
      .count('pipeline_cards.id as count')
      .groupBy('pipeline_stages.name', 'pipeline_stages.color', 'pipeline_stages.order_index')
      .orderBy('pipeline_stages.order_index', 'asc');

    // Agentes ativos
    const agentsActive = await db('ai_agents')
      .where({ is_active: true })
      .count('id as total')
      .first();

    // Mensagens hoje
    const messagesToday = await db('messages')
      .where('created_at', '>=', today.toISOString())
      .count('id as total')
      .first();

    return res.json({
      total_contacts: parseInt(totalContacts.total),
      contacts_today: parseInt(contactsToday.total),
      open_conversations: convMap.open || 0,
      bot_conversations: convMap.bot || 0,
      human_conversations: convMap.human || 0,
      closed_conversations: convMap.closed || 0,
      closed_today: parseInt(closedToday.total),
      messages_today: parseInt(messagesToday.total),
      pipeline_summary: pipelineSummary.map((s) => ({
        stage: s.stage,
        color: s.color,
        count: parseInt(s.count),
      })),
      agents_active: parseInt(agentsActive.total),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
