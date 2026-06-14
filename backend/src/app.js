// backend/src/app.js
// Express app — NÃO faz listen aqui (isso fica no server.js)

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ========================
// Middlewares globais
// ========================

// Segurança
app.use(helmet());

// CORS — aceita qualquer origem em dev, restringir em prod
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL || 'https://crm.megaacessoriosautomotivos.com.br'
    : '*',
  credentials: true,
}));

// Compressão gzip
app.use(compression());

// Log de requests
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parser — guardar raw body para validação HMAC
app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf.toString();
  },
}));
app.use(express.urlencoded({ extended: true }));

// ========================
// Rotas
// ========================

app.use('/api', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: true,
    message: `Rota ${req.method} ${req.url} não encontrada`,
  });
});

// Error handler global (deve ser o último middleware)
app.use(errorHandler);

module.exports = app;
