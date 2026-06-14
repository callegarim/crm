// backend/src/middleware/errorHandler.js
// Handler global de erros — retorna JSON padronizado

const env = require('../config/env');

function errorHandler(err, req, res, _next) {
  // Log do erro
  if (env.NODE_ENV === 'development') {
    console.error('💥 Erro:', err);
  } else {
    console.error('💥 Erro:', err.message);
  }

  // Erros de validação Zod
  if (err.name === 'ZodError') {
    return res.status(422).json({
      error: true,
      message: 'Dados inválidos',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // Erros JWT
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: true,
      message: 'Token inválido ou expirado',
    });
  }

  // Erro de constraint do PostgreSQL (ex: unique violation)
  if (err.code === '23505') {
    return res.status(409).json({
      error: true,
      message: 'Registro duplicado',
      detail: err.detail,
    });
  }

  // Erro de FK violation
  if (err.code === '23503') {
    return res.status(400).json({
      error: true,
      message: 'Referência inválida',
      detail: err.detail,
    });
  }

  // Status customizado passado pelo controller
  const statusCode = err.statusCode || 500;
  const message = err.statusCode ? err.message : 'Erro interno do servidor';

  return res.status(statusCode).json({
    error: true,
    message,
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = errorHandler;
