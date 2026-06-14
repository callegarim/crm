// backend/src/middleware/internalAuth.js
// Middleware de autenticação interna para chamadas entre serviços (n8n → backend)
// Valida header x-internal-secret contra INTERNAL_SECRET do .env

const env = require('../config/env');

/**
 * Middleware que valida o header x-internal-secret.
 * Usado para proteger rotas internas (bot-reply) que o n8n chama.
 * Não usa JWT — apenas um secret compartilhado simples.
 */
function internalAuth(req, res, next) {
  const secret = req.headers['x-internal-secret'];

  if (!secret) {
    return res.status(401).json({
      error: true,
      message: 'Header x-internal-secret ausente',
    });
  }

  if (secret !== env.INTERNAL_SECRET) {
    return res.status(403).json({
      error: true,
      message: 'Secret interno inválido',
    });
  }

  // Marca como chamada interna (útil pra logs)
  req.isInternal = true;
  next();
}

/**
 * Middleware que aceita TANTO JWT (frontend) QUANTO x-internal-secret (n8n).
 * Usado em rotas que precisam ser acessíveis por ambos.
 */
function authOrInternal(req, res, next) {
  const jwt = require('jsonwebtoken');

  // Tenta internal secret primeiro (n8n)
  const secret = req.headers['x-internal-secret'];
  if (secret && secret === env.INTERNAL_SECRET) {
    req.isInternal = true;
    return next();
  }

  // Tenta JWT (frontend)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      req.user = decoded;
      return next();
    } catch {
      // Fall through
    }
  }

  return res.status(401).json({
    error: true,
    message: 'Autenticação necessária (JWT ou x-internal-secret)',
  });
}

module.exports = { internalAuth, authOrInternal };
