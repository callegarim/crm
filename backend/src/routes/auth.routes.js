// backend/src/routes/auth.routes.js
// Autenticação: login, refresh, me

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const db = require('../config/database');
const env = require('../config/env');
const validate = require('../middleware/validate');
const { auth } = require('../middleware/auth');

const router = express.Router();

// ========================
// Schemas Zod
// ========================

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

// ========================
// Helpers
// ========================

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

// ========================
// Routes
// ========================

/**
 * POST /api/auth/login
 * Login com email + senha, retorna JWT
 */
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Busca usuário por email
    const user = await db('users').where({ email }).first();
    if (!user) {
      return res.status(401).json({
        error: true,
        message: 'Credenciais inválidas',
      });
    }

    // Verifica senha
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({
        error: true,
        message: 'Credenciais inválidas',
      });
    }

    // Gera token
    const token = generateToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/refresh
 * Renova o token JWT (requer token válido)
 */
router.post('/refresh', auth, async (req, res, next) => {
  try {
    const user = await db('users').where({ id: req.user.id }).first();
    if (!user) {
      return res.status(404).json({
        error: true,
        message: 'Usuário não encontrado',
      });
    }

    const token = generateToken(user);

    return res.json({ token });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/me
 * Retorna dados do usuário logado
 */
router.get('/me', auth, async (req, res, next) => {
  try {
    const user = await db('users')
      .where({ id: req.user.id })
      .select('id', 'name', 'email', 'role', 'created_at')
      .first();

    if (!user) {
      return res.status(404).json({
        error: true,
        message: 'Usuário não encontrado',
      });
    }

    return res.json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
