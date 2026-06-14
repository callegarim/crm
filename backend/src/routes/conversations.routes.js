// backend/src/routes/conversations.routes.js
// Conversas: listar, histórico, assign, close, bot-reply, send-message

const express = require('express');
const { z } = require('zod');
const db = require('../config/database');
const env = require('../config/env');
const validate = require('../middleware/validate');
const socketService = require('../services/socket.service');
const redisService = require('../services/redis.service');

const router = express.Router();

// ========================
// Schemas Zod
// ========================

const botReplySchema = z.object({
  conversation_id: z.string().uuid().optional(), // redundante com :id, mas aceita
  message: z.object({
    content: z.string().min(1),
    content_type: z.enum(['text', 'image', 'audio', 'video', 'doc']).default('text'),
    sent_by: z.string().default('bot'),
  }),
  action: z.enum(['replied', 'transfer_human']),
});

const assignSchema = z.object({
  agent_id: z.string().uuid('agent_id inválido'),
});

// ========================
// Routes
// ========================

/**
 * GET /api/conversations
 * Lista conversas com filtros (status, assigned)
 * Inclui dados do contato e última mensagem
 */
router.get('/', async (req, res, next) => {
  try {
    const { status, assigned_agent_id } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);
    const offset = (page - 1) * limit;

    let query = db('conversations')
      .join('contacts', 'conversations.contact_id', 'contacts.id')
      .leftJoin('users', 'conversations.assigned_agent_id', 'users.id')
      .select(
        'conversations.*',
        'contacts.name as contact_name',
        'contacts.phone as contact_phone',
        'contacts.email as contact_email',
        'users.name as assigned_agent_name'
      );

    if (status) {
      query = query.where('conversations.status', status);
    } else {
      // Por default, não mostrar conversas fechadas
      query = query.whereNot('conversations.status', 'closed');
    }

    if (assigned_agent_id) {
      query = query.where('conversations.assigned_agent_id', assigned_agent_id);
    }

    // Count total
    const countQuery = query.clone().clearSelect().clearOrder().count('conversations.id as total').first();
    const { total } = await countQuery;

    const conversations = await query
      .orderBy('conversations.updated_at', 'desc')
      .limit(limit)
      .offset(offset);

    // Busca última mensagem de cada conversa
    const conversationIds = conversations.map((c) => c.id);
    const lastMessages = await db('messages')
      .whereIn('conversation_id', conversationIds)
      .distinctOn('conversation_id')
      .orderBy('conversation_id')
      .orderBy('created_at', 'desc');

    const lastMessageMap = {};
    for (const msg of lastMessages) {
      lastMessageMap[msg.conversation_id] = msg;
    }

    const enriched = conversations.map((conv) => ({
      ...conv,
      last_message: lastMessageMap[conv.id] || null,
    }));

    return res.json({
      data: enriched,
      pagination: {
        page,
        limit,
        total: parseInt(total),
        totalPages: Math.ceil(parseInt(total) / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/conversations/:id/messages
 * Histórico de mensagens (usado pelo n8n e frontend)
 * Query params: limit (default 50)
 */
router.get('/:id/messages', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const before = req.query.before; // cursor-based: antes de timestamp

    let query = db('messages')
      .where({ conversation_id: req.params.id });

    if (before) {
      query = query.where('created_at', '<', before);
    }

    const messages = await query
      .orderBy('created_at', 'desc')
      .limit(limit);

    // Retorna em ordem cronológica (mais antigo primeiro)
    return res.json(messages.reverse());
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/conversations/:id/assign
 * Agente humano assume o atendimento
 */
router.put('/:id/assign', validate(assignSchema), async (req, res, next) => {
  try {
    const [conversation] = await db('conversations')
      .where({ id: req.params.id })
      .update({
        status: 'human',
        assigned_agent_id: req.body.agent_id,
        updated_at: db.fn.now(),
      })
      .returning('*');

    if (!conversation) {
      return res.status(404).json({ error: true, message: 'Conversa não encontrada' });
    }

    // Broadcast
    socketService.broadcastConversationUpdate(conversation.id, {
      status: 'human',
      assigned_agent_id: req.body.agent_id,
    });

    return res.json(conversation);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/conversations/:id/close
 * Fecha conversa
 */
router.put('/:id/close', async (req, res, next) => {
  try {
    const [conversation] = await db('conversations')
      .where({ id: req.params.id })
      .update({
        status: 'closed',
        updated_at: db.fn.now(),
      })
      .returning('*');

    if (!conversation) {
      return res.status(404).json({ error: true, message: 'Conversa não encontrada' });
    }

    socketService.broadcastConversationUpdate(conversation.id, { status: 'closed' });

    return res.json(conversation);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/conversations/:id/bot-reply
 * n8n avisa que respondeu — salva mensagem + broadcast Socket.io
 *
 * Contrato n8n → backend:
 * { conversation_id, message: { content, content_type, sent_by }, action: "replied"|"transfer_human" }
 */
router.post('/:id/bot-reply', validate(botReplySchema), async (req, res, next) => {
  try {
    const conversationId = req.params.id;
    const { message, action } = req.body;

    // Verifica se conversa existe
    const conversation = await db('conversations').where({ id: conversationId }).first();
    if (!conversation) {
      return res.status(404).json({ error: true, message: 'Conversa não encontrada' });
    }

    // Salva mensagem do bot no banco
    const [savedMessage] = await db('messages')
      .insert({
        conversation_id: conversationId,
        direction: 'outbound',
        content_type: message.content_type || 'text',
        content: message.content,
        sent_by: message.sent_by || 'bot',
      })
      .returning('*');

    // Se ação é transferir para humano, atualiza status
    if (action === 'transfer_human') {
      await db('conversations')
        .where({ id: conversationId })
        .update({
          status: 'human',
          updated_at: db.fn.now(),
        });

      socketService.broadcastConversationUpdate(conversationId, {
        status: 'human',
      });
    } else {
      // Atualiza timestamp da conversa
      await db('conversations')
        .where({ id: conversationId })
        .update({ updated_at: db.fn.now() });
    }

    // Broadcast da nova mensagem
    socketService.broadcastNewMessage(conversationId, savedMessage);

    return res.json({ success: true, message: savedMessage });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/conversations/:id/send-message
 * Agente humano envia mensagem — salva no banco, envia via Evolution API, broadcast Socket.io
 *
 * Body: { content: string, content_type?: string }
 * Auth: JWT (req.user vem do middleware auth)
 */
const sendMessageSchema = z.object({
  content: z.string().min(1, 'Conteúdo é obrigatório'),
  content_type: z.enum(['text', 'image', 'audio', 'video', 'doc']).default('text'),
});

router.post('/:id/send-message', validate(sendMessageSchema), async (req, res, next) => {
  try {
    const conversationId = req.params.id;
    const { content, content_type } = req.body;

    // Verifica se conversa existe
    const conversation = await db('conversations').where({ id: conversationId }).first();
    if (!conversation) {
      return res.status(404).json({ error: true, message: 'Conversa não encontrada' });
    }

    // Salva mensagem no banco
    const [savedMessage] = await db('messages')
      .insert({
        conversation_id: conversationId,
        direction: 'outbound',
        content_type: content_type || 'text',
        content,
        sent_by: req.user.id, // ID do agente logado
      })
      .returning('*');

    // Atualiza timestamp da conversa
    await db('conversations')
      .where({ id: conversationId })
      .update({ updated_at: db.fn.now() });

    // Envia via Evolution API (fire and forget — não bloqueia o response)
    try {
      // Busca URL da Evolution API: primeiro Redis, fallback env
      const evolutionUrl = await redisService.getSetting('evolution_url') || env.EVOLUTION_API_URL;
      const apiKey = env.EVOLUTION_API_KEY;
      const instance = env.EVOLUTION_INSTANCE;

      // Busca o telefone do contato vinculado à conversa
      const contact = await db('contacts').where({ id: conversation.contact_id }).first();
      if (!contact) {
        console.error(`⚠️ Contato ${conversation.contact_id} não encontrado para envio Evolution`);
      } else {
        const response = await fetch(`${evolutionUrl}/message/sendText/${instance}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': apiKey,
          },
          body: JSON.stringify({
            number: contact.phone,
            text: content,
          }),
          signal: AbortSignal.timeout(10000), // Timeout 10s
        });

        if (!response.ok) {
          const errorBody = await response.text().catch(() => 'sem body');
          console.error(`⚠️ Evolution API respondeu ${response.status}: ${errorBody}`);
        } else {
          console.log(`📤 Mensagem enviada via Evolution para ${contact.phone}`);
        }
      }
    } catch (evolutionErr) {
      // Fire and forget: loga e segue, mensagem já foi salva no banco
      console.error('❌ Erro ao enviar via Evolution API:', evolutionErr.message);
    }

    // Broadcast via Socket.io
    socketService.broadcastNewMessage(conversationId, savedMessage);

    return res.json({ success: true, message: savedMessage });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

