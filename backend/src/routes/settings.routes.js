// backend/src/routes/settings.routes.js
// Configurações globais com sync Redis

const express = require('express');
const { z } = require('zod');
const db = require('../config/database');
const validate = require('../middleware/validate');
const redisService = require('../services/redis.service');

const router = express.Router();

// ========================
// Schemas Zod
// ========================

const updateSettingsSchema = z.object({
  business_hours: z
    .object({
      start: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
      end: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
    })
    .optional(),
  away_message: z.string().optional(),
  evolution_url: z.string().url().optional(),
});

// ========================
// Routes
// ========================

/**
 * GET /api/settings
 * Retorna todas as configurações como objeto { key: value }
 */
router.get('/', async (req, res, next) => {
  try {
    const rows = await db('settings').select('key', 'value');

    const settings = {};
    for (const row of rows) {
      // Tenta parsear JSON, senão retorna string
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    }

    return res.json(settings);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/settings
 * Atualiza configurações — salva no banco E no Redis
 *
 * Body: { business_hours: { start, end }, away_message: "...", evolution_url: "..." }
 */
router.put('/', validate(updateSettingsSchema), async (req, res, next) => {
  try {
    const updates = req.body;
    const saved = {};

    for (const [key, value] of Object.entries(updates)) {
      const storeValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

      // Upsert no banco (insert ou update)
      await db('settings')
        .insert({
          key,
          value: storeValue,
          updated_at: db.fn.now(),
        })
        .onConflict('key')
        .merge({
          value: storeValue,
          updated_at: db.fn.now(),
        });

      // Sync Redis
      await redisService.setSetting(key, value);

      saved[key] = value;
    }

    console.log(`✅ Settings atualizados:`, Object.keys(saved).join(', '));

    return res.json(saved);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
