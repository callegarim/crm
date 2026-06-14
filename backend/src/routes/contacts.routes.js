// backend/src/routes/contacts.routes.js
// CRUD de contatos com filtros e paginação

const express = require('express');
const { z } = require('zod');
const db = require('../config/database');
const validate = require('../middleware/validate');

const router = express.Router();

// ========================
// Schemas Zod
// ========================

const createContactSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255),
  phone: z.string().min(1, 'Telefone é obrigatório').max(50),
  email: z.string().email().nullable().optional(),
  source: z.string().max(100).optional().default('whatsapp'),
  status: z.string().max(50).optional().default('active'),
  assigned_to: z.string().uuid().nullable().optional(),
});

const updateContactSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().min(1).max(50).optional(),
  email: z.string().email().nullable().optional(),
  source: z.string().max(100).optional(),
  status: z.string().max(50).optional(),
  assigned_to: z.string().uuid().nullable().optional(),
});

// ========================
// Routes
// ========================

/**
 * GET /api/contacts
 * Lista contatos com filtros e paginação
 * Query params: page, limit, search, status, assigned_to
 */
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const { search, status, assigned_to } = req.query;

    let query = db('contacts')
      .leftJoin('users', 'contacts.assigned_to', 'users.id')
      .select(
        'contacts.*',
        'users.name as assigned_to_name'
      );

    // Filtros
    if (search) {
      query = query.where(function () {
        this.where('contacts.name', 'ilike', `%${search}%`)
          .orWhere('contacts.phone', 'ilike', `%${search}%`)
          .orWhere('contacts.email', 'ilike', `%${search}%`);
      });
    }

    if (status) {
      query = query.where('contacts.status', status);
    }

    if (assigned_to) {
      query = query.where('contacts.assigned_to', assigned_to);
    }

    // Count total
    const countQuery = query.clone().clearSelect().clearOrder().count('contacts.id as total').first();
    const { total } = await countQuery;

    // Paginação
    const contacts = await query
      .orderBy('contacts.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return res.json({
      data: contacts,
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
 * GET /api/contacts/:id
 * Detalhes de um contato
 */
router.get('/:id', async (req, res, next) => {
  try {
    const contact = await db('contacts')
      .leftJoin('users', 'contacts.assigned_to', 'users.id')
      .select('contacts.*', 'users.name as assigned_to_name')
      .where('contacts.id', req.params.id)
      .first();

    if (!contact) {
      return res.status(404).json({ error: true, message: 'Contato não encontrado' });
    }

    // Busca conversas do contato
    const conversations = await db('conversations')
      .where({ contact_id: req.params.id })
      .orderBy('updated_at', 'desc');

    return res.json({ ...contact, conversations });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/contacts
 * Cria novo contato
 */
router.post('/', validate(createContactSchema), async (req, res, next) => {
  try {
    const [contact] = await db('contacts')
      .insert(req.body)
      .returning('*');

    return res.status(201).json(contact);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/contacts/:id
 * Atualiza contato
 */
router.put('/:id', validate(updateContactSchema), async (req, res, next) => {
  try {
    const [contact] = await db('contacts')
      .where({ id: req.params.id })
      .update({ ...req.body, updated_at: db.fn.now() })
      .returning('*');

    if (!contact) {
      return res.status(404).json({ error: true, message: 'Contato não encontrado' });
    }

    return res.json(contact);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
