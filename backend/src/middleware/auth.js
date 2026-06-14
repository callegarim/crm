// backend/src/middleware/auth.js
// Middleware de autenticação JWT + controle de roles

const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Middleware que verifica o token JWT no header Authorization.
 * Injeta req.user = { id, email, role }
 */
function auth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: true,
      message: 'Token de autenticação não fornecido',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: true,
        message: 'Token expirado',
      });
    }
    return res.status(401).json({
      error: true,
      message: 'Token inválido',
    });
  }
}

/**
 * Factory que retorna middleware de verificação de role.
 * Uso: requireRole('admin')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: true,
        message: 'Não autenticado',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: true,
        message: 'Permissão insuficiente',
      });
    }

    next();
  };
}

module.exports = { auth, requireRole };
