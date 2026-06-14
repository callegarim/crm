// backend/src/services/redis.service.js
// Leitura/escrita de prompts de agentes e configurações no Redis
// Padrão de chaves: agent:{id}:prompt, agent:{id}:config, settings:*

const { getRedis } = require('../config/redis');

const redisService = {
  // ========================
  // AGENTS
  // ========================

  /**
   * Salva o system prompt do agente no Redis
   * Chave: agent:{id}:prompt → string
   */
  async setAgentPrompt(agentId, prompt) {
    const redis = getRedis();
    await redis.set(`agent:${agentId}:prompt`, prompt);
  },

  /**
   * Busca o system prompt do agente no Redis
   */
  async getAgentPrompt(agentId) {
    const redis = getRedis();
    return redis.get(`agent:${agentId}:prompt`);
  },

  /**
   * Salva a config do agente no Redis
   * Chave: agent:{id}:config → JSON { llm_model, temperature, typing_delay_ms }
   */
  async setAgentConfig(agentId, config) {
    const redis = getRedis();
    await redis.set(`agent:${agentId}:config`, JSON.stringify(config));
  },

  /**
   * Busca a config do agente no Redis
   */
  async getAgentConfig(agentId) {
    const redis = getRedis();
    const data = await redis.get(`agent:${agentId}:config`);
    return data ? JSON.parse(data) : null;
  },

  /**
   * Remove todas as chaves de um agente do Redis
   */
  async deleteAgent(agentId) {
    const redis = getRedis();
    await redis.del(`agent:${agentId}:prompt`, `agent:${agentId}:config`);
  },

  // ========================
  // SETTINGS
  // ========================

  /**
   * Salva uma configuração no Redis
   * Chave: settings:{key} → string ou JSON
   */
  async setSetting(key, value) {
    const redis = getRedis();
    const storeValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    await redis.set(`settings:${key}`, storeValue);
  },

  /**
   * Busca uma configuração do Redis
   */
  async getSetting(key) {
    const redis = getRedis();
    const data = await redis.get(`settings:${key}`);
    if (!data) return null;

    // Tenta parsear como JSON, senão retorna string
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  },

  // ========================
  // SYNC (startup)
  // ========================

  /**
   * Sincroniza todos os agentes e settings do banco para o Redis.
   * Chamado no startup do servidor.
   */
  async syncAllFromDatabase(db) {
    const redis = getRedis();

    // Sync agents
    const agents = await db('ai_agents').select('*');
    for (const agent of agents) {
      await redis.set(`agent:${agent.id}:prompt`, agent.system_prompt);
      await redis.set(
        `agent:${agent.id}:config`,
        JSON.stringify({
          llm_model: agent.llm_model,
          temperature: agent.temperature,
          typing_delay_ms: agent.typing_delay_ms,
        })
      );
    }
    console.log(`✅ ${agents.length} agentes sincronizados no Redis`);

    // Sync settings
    const settings = await db('settings').select('*');
    for (const setting of settings) {
      await redis.set(`settings:${setting.key}`, setting.value);
    }
    console.log(`✅ ${settings.length} configurações sincronizadas no Redis`);
  },
};

module.exports = redisService;
