// backend/src/services/n8n.service.js
// Repassa mensagem para o n8n via HTTP POST — fire and forget, sem retry síncrono

const env = require('../config/env');

const n8nService = {
  /**
   * Envia a mensagem recebida para o n8n processar.
   * Contrato: POST {N8N_WEBHOOK_URL}
   * Body: { conversation_id, contact, message, agent_id, instance }
   *
   * Fire and forget: apenas loga erro e segue. NÃO faz retry síncrono.
   */
  async forwardMessage({ conversationId, contact, message, agentId }) {
    const payload = {
      conversation_id: conversationId,
      contact: {
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
      },
      message: {
        id: message.id,
        content: message.content,
        content_type: message.content_type,
        created_at: message.created_at,
      },
      agent_id: agentId,
      instance: env.EVOLUTION_INSTANCE,
    };

    try {
      const response = await fetch(env.N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000), // Timeout 10s
      });

      if (!response.ok) {
        console.error(
          `⚠️ n8n respondeu com status ${response.status}:`,
          await response.text().catch(() => 'sem body')
        );
      } else {
        console.log(`✅ Mensagem repassada ao n8n — conversa ${conversationId}`);
      }
    } catch (err) {
      // Fire and forget: loga e segue, não bloqueia
      console.error(`❌ Erro ao repassar para n8n:`, err.message);
    }
  },
};

module.exports = n8nService;
