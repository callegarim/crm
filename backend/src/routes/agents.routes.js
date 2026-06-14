// backend/src/routes/agents.routes.js
// CRUD de agentes de IA com sync Redis

const express = require('express');
const { z } = require('zod');
const db = require('../config/database');
const validate = require('../middleware/validate');
const redisService = require('../services/redis.service');

const router = express.Router();

// ========================
// Schemas Zod
// ========================

const createAgentSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255),
  role: z.string().max(255).nullable().optional(),
  system_prompt: z.string().min(1, 'System prompt é obrigatório'),
  llm_model: z.string().max(100).default('llama-3.3-70b-versatile'),
  temperature: z.number().min(0).max(2).default(0.7),
  typing_delay_ms: z.number().int().min(0).max(60000).default(5000),
  is_active: z.boolean().default(true),
});

const updateAgentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  role: z.string().max(255).nullable().optional(),
  system_prompt: z.string().min(1).optional(),
  llm_model: z.string().max(100).optional(),
  temperature: z.number().min(0).max(2).optional(),
  typing_delay_ms: z.number().int().min(0).max(60000).optional(),
  is_active: z.boolean().optional(),
});

// ========================
// Routes
// ========================

/**
 * GET /api/agents
 * Lista todos os agentes de IA
 */
router.get('/', async (req, res, next) => {
  try {
    const agents = await db('ai_agents')
      .orderBy('created_at', 'desc');

    return res.json(agents);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/agents/:id
 * Detalhes de um agente
 */
router.get('/:id', async (req, res, next) => {
  try {
    const agent = await db('ai_agents')
      .where({ id: req.params.id })
      .first();

    if (!agent) {
      return res.status(404).json({ error: true, message: 'Agente não encontrado' });
    }

    return res.json(agent);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/agents
 * Cria agente de IA — salva no banco E no Redis
 */
router.post('/', validate(createAgentSchema), async (req, res, next) => {
  try {
    const [agent] = await db('ai_agents')
      .insert(req.body)
      .returning('*');

    // Sync Redis
    await redisService.setAgentPrompt(agent.id, agent.system_prompt);
    await redisService.setAgentConfig(agent.id, {
      llm_model: agent.llm_model,
      temperature: agent.temperature,
      typing_delay_ms: agent.typing_delay_ms,
    });

    console.log(`✅ Agente "${agent.name}" criado e sincronizado no Redis`);

    return res.status(201).json(agent);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/agents/:id
 * Atualiza agente de IA — salva no banco E no Redis
 */
router.put('/:id', validate(updateAgentSchema), async (req, res, next) => {
  try {
    const [agent] = await db('ai_agents')
      .where({ id: req.params.id })
      .update({ ...req.body, updated_at: db.fn.now() })
      .returning('*');

    if (!agent) {
      return res.status(404).json({ error: true, message: 'Agente não encontrado' });
    }

    // Sync Redis
    await redisService.setAgentPrompt(agent.id, agent.system_prompt);
    await redisService.setAgentConfig(agent.id, {
      llm_model: agent.llm_model,
      temperature: agent.temperature,
      typing_delay_ms: agent.typing_delay_ms,
    });

    console.log(`✅ Agente "${agent.name}" atualizado e sincronizado no Redis`);

    return res.json(agent);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/agents/:id
 * Remove agente do banco e do Redis
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const agent = await db('ai_agents')
      .where({ id: req.params.id })
      .first();

    if (!agent) {
      return res.status(404).json({ error: true, message: 'Agente não encontrado' });
    }

    await db('ai_agents').where({ id: req.params.id }).del();
    await redisService.deleteAgent(req.params.id);

    return res.json({ success: true, message: `Agente "${agent.name}" removido` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
