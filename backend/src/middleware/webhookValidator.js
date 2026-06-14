// backend/src/middleware/webhookValidator.js
// Validação HMAC da Evolution API — rejeita payloads com assinatura inválida

const crypto = require('crypto');
const env = require('../config/env');

/**
 * Middleware que valida a assinatura HMAC-SHA256 do webhook da Evolution API.
 * A Evolution envia a assinatura no header (geralmente x-webhook-signature ou similar).
 */
function webhookValidator(req, res, next) {
  // A Evolution API envia o raw body para validação HMAC
  // O header pode variar — cobrir os mais comuns
  const signature =
    req.headers['x-webhook-signature'] ||
    req.headers['x-hub-signature-256'] ||
    req.headers['x-signature'];

  if (!signature) {
    console.warn('⚠️ Webhook recebido sem assinatura HMAC');
    // Em produção, rejeitar; em dev, permitir para testes
    if (env.NODE_ENV === 'production') {
      return res.status(401).json({
        error: true,
        message: 'Assinatura HMAC ausente',
      });
    }
    return next();
  }

  try {
    const rawBody = req.rawBody || JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', env.EVOLUTION_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    // Normaliza para comparação (remove prefixo 'sha256=' se existir)
    const receivedSig = signature.replace('sha256=', '');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSig, 'hex')
    );

    if (!isValid) {
      console.warn('⚠️ Webhook com assinatura HMAC inválida');
      return res.status(401).json({
        error: true,
        message: 'Assinatura HMAC inválida',
      });
    }

    next();
  } catch (err) {
    console.error('❌ Erro na validação HMAC:', err.message);
    return res.status(401).json({
      error: true,
      message: 'Erro na validação da assinatura',
    });
  }
}

module.exports = webhookValidator;
