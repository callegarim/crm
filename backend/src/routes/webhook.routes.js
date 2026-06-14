// backend/src/routes/webhook.routes.js
// Recebe webhook da Evolution API → salva mensagem → repassa ao n8n

const express = require('express');
const db = require('../config/database');
const webhookValidator = require('../middleware/webhookValidator');
const n8nService = require('../services/n8n.service');
const socketService = require('../services/socket.service');

const router = express.Router();

/**
 * POST /api/webhook/evolution
 *
 * Fluxo:
 * 1. Valida assinatura HMAC
 * 2. Responde HTTP 200 OK imediato (< 500ms) ← CRÍTICO
 * 3. Processamento assíncrono (após res.send):
 *    - Extrai dados do payload
 *    - Busca/cria contato
 *    - Busca/cria conversa
 *    - Salva mensagem no banco
 *    - Broadcast Socket.io
 *    - Repassa ao n8n via HTTP (fire and forget)
 */
router.post('/evolution', webhookValidator, async (req, res) => {
  // Responde 200 OK imediato — não pode demorar mais que 500ms
  res.status(200).json({ received: true });

  // Processamento assíncrono após o 200 OK
  try {
    const payload = req.body;

    // A Evolution API envia vários tipos de eventos
    // Filtra apenas mensagens recebidas
    if (!payload.data || !payload.data.message) {
      return;
    }

    const eventData = payload.data;
    const remoteJid = eventData.key?.remoteJid;
    if (!remoteJid || remoteJid.includes('@g.us')) {
      // Ignora mensagens de grupo
      return;
    }

    // Ignora mensagens enviadas por nós mesmos (fromMe)
    if (eventData.key?.fromMe) {
      return;
    }

    // Extrai phone do jid (formato: 5511999999999@s.whatsapp.net)
    const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '');
    const contactName = eventData.pushName || phone;

    // Extrai conteúdo da mensagem
    const messageData = eventData.message;
    let content = '';
    let contentType = 'text';
    let mediaUrl = null;

    if (messageData.conversation) {
      content = messageData.conversation;
    } else if (messageData.extendedTextMessage) {
      content = messageData.extendedTextMessage.text;
    } else if (messageData.imageMessage) {
      contentType = 'image';
      content = messageData.imageMessage.caption || '';
      mediaUrl = messageData.imageMessage.url || null;
    } else if (messageData.audioMessage) {
      contentType = 'audio';
      mediaUrl = messageData.audioMessage.url || null;
    } else if (messageData.videoMessage) {
      contentType = 'video';
      content = messageData.videoMessage.caption || '';
      mediaUrl = messageData.videoMessage.url || null;
    } else if (messageData.documentMessage) {
      contentType = 'doc';
      content = messageData.documentMessage.fileName || '';
      mediaUrl = messageData.documentMessage.url || null;
    } else {
      // Tipo de mensagem não suportado, ignora
      return;
    }

    // 1. Busca ou cria contato
    let contact = await db('contacts').where({ phone }).first();
    if (!contact) {
      [contact] = await db('contacts')
        .insert({
          name: contactName,
          phone,
          source: 'whatsapp',
          status: 'active',
        })
        .returning('*');

      // Cria card no pipeline (estágio 1 — Entrada SDR)
      const firstStage = await db('pipeline_stages')
        .orderBy('order_index', 'asc')
        .first();

      if (firstStage) {
        await db('pipeline_cards')
          .insert({
            contact_id: contact.id,
            stage_id: firstStage.id,
          })
          .onConflict('contact_id')
          .ignore(); // Ignora se já existe card
      }
    } else {
      // Atualiza nome se mudou
      if (contactName !== phone && contact.name !== contactName) {
        await db('contacts')
          .where({ id: contact.id })
          .update({ name: contactName, updated_at: db.fn.now() });
        contact.name = contactName;
      }
    }

    // 2. Busca ou cria conversa ativa
    let conversation = await db('conversations')
      .where({ contact_id: contact.id })
      .whereIn('status', ['open', 'bot', 'human'])
      .orderBy('updated_at', 'desc')
      .first();

    if (!conversation) {
      [conversation] = await db('conversations')
        .insert({
          contact_id: contact.id,
          channel: 'whatsapp',
          status: 'bot',
        })
        .returning('*');
    } else {
      // Atualiza timestamp
      await db('conversations')
        .where({ id: conversation.id })
        .update({ updated_at: db.fn.now() });
    }

    // 3. Salva mensagem no banco
    const [message] = await db('messages')
      .insert({
        conversation_id: conversation.id,
        direction: 'inbound',
        content_type: contentType,
        content,
        media_url: mediaUrl,
        sent_by: contact.id,
      })
      .returning('*');

    // 4. Broadcast Socket.io para o frontend
    socketService.broadcastNewMessage(conversation.id, {
      ...message,
      contact_name: contact.name,
      contact_phone: contact.phone,
    });

    // 5. Repassa ao n8n (fire and forget)
    // Só repassa se a conversa está em modo bot (não humano)
    if (conversation.status === 'bot' || conversation.status === 'open') {
      // Busca agente ativo
      const agent = await db('ai_agents')
        .where({ is_active: true })
        .first();

      n8nService.forwardMessage({
        conversationId: conversation.id,
        contact,
        message,
        agentId: agent ? agent.id : null,
      });
    }

    console.log(`📩 Mensagem recebida de ${phone} — conversa ${conversation.id}`);
  } catch (err) {
    console.error('❌ Erro no processamento do webhook:', err.message);
  }
});

module.exports = router;
