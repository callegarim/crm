// backend/src/routes/pipeline.routes.js
// Kanban: stages + cards com drag & drop e broadcast

const express = require('express');
const { z } = require('zod');
const db = require('../config/database');
const validate = require('../middleware/validate');
const socketService = require('../services/socket.service');

const router = express.Router();

// ========================
// Schemas Zod
// ========================

const createCardSchema = z.object({
  contact_id: z.string().uuid('contact_id inválido'),
  stage_id: z.coerce.number().int().positive(),
  assigned_to: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const moveCardSchema = z.object({
  stage_id: z.coerce.number().int().positive(),
  notes: z.string().nullable().optional(),
});

// ========================
// Routes
// ========================

/**
 * GET /api/pipeline/stages
 * Lista todas as colunas do Kanban ordenadas
 */
router.get('/stages', async (req, res, next) => {
  try {
    const stages = await db('pipeline_stages')
      .orderBy('order_index', 'asc');

    return res.json(stages);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/pipeline/cards
 * Lista todos os cards com dados do contato e stage
 * Query params: stage_id (opcional)
 */
router.get('/cards', async (req, res, next) => {
  try {
    let query = db('pipeline_cards')
      .join('contacts', 'pipeline_cards.contact_id', 'contacts.id')
      .join('pipeline_stages', 'pipeline_cards.stage_id', 'pipeline_stages.id')
      .leftJoin('users', 'pipeline_cards.assigned_to', 'users.id')
      .select(
        'pipeline_cards.*',
        'contacts.name as contact_name',
        'contacts.phone as contact_phone',
        'contacts.email as contact_email',
        'pipeline_stages.name as stage_name',
        'pipeline_stages.color as stage_color',
        'pipeline_stages.order_index',
        'users.name as assigned_to_name'
      );

    if (req.query.stage_id) {
      query = query.where('pipeline_cards.stage_id', req.query.stage_id);
    }

    const cards = await query.orderBy('pipeline_cards.updated_at', 'desc');

    return res.json(cards);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/pipeline/cards
 * Cria um card (associa contato a um estágio)
 */
router.post('/cards', validate(createCardSchema), async (req, res, next) => {
  try {
    const [card] = await db('pipeline_cards')
      .insert(req.body)
      .returning('*');

    // Busca dados completos para broadcast
    const fullCard = await db('pipeline_cards')
      .join('contacts', 'pipeline_cards.contact_id', 'contacts.id')
      .join('pipeline_stages', 'pipeline_cards.stage_id', 'pipeline_stages.id')
      .select(
        'pipeline_cards.*',
        'contacts.name as contact_name',
        'contacts.phone as contact_phone',
        'pipeline_stages.name as stage_name',
        'pipeline_stages.color as stage_color'
      )
      .where('pipeline_cards.id', card.id)
      .first();

    socketService.broadcastPipelineUpdate(fullCard);

    return res.status(201).json(fullCard);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/pipeline/cards/:id
 * Move card de coluna (drag & drop)
 */
router.put('/cards/:id', validate(moveCardSchema), async (req, res, next) => {
  try {
    const updateData = {
      stage_id: req.body.stage_id,
      updated_at: db.fn.now(),
    };

    if (req.body.notes !== undefined) {
      updateData.notes = req.body.notes;
    }

    const [card] = await db('pipeline_cards')
      .where({ id: req.params.id })
      .update(updateData)
      .returning('*');

    if (!card) {
      return res.status(404).json({ error: true, message: 'Card não encontrado' });
    }

    // Busca dados completos para broadcast
    const fullCard = await db('pipeline_cards')
      .join('contacts', 'pipeline_cards.contact_id', 'contacts.id')
      .join('pipeline_stages', 'pipeline_cards.stage_id', 'pipeline_stages.id')
      .select(
        'pipeline_cards.*',
        'contacts.name as contact_name',
        'contacts.phone as contact_phone',
        'pipeline_stages.name as stage_name',
        'pipeline_stages.color as stage_color'
      )
      .where('pipeline_cards.id', card.id)
      .first();

    // Broadcast para todos os clientes (Kanban tempo real)
    socketService.broadcastPipelineUpdate(fullCard);

    return res.json(fullCard);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
