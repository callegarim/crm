// backend/src/db/knexfile.js
// Configuração do Knex.js para migrations e seeds

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const baseConfig = {
  client: 'pg',
  connection: process.env.DATABASE_URL,
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    directory: path.resolve(__dirname, 'migrations'),
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: path.resolve(__dirname, 'seeds'),
  },
};

module.exports = {
  development: {
    ...baseConfig,
  },
  production: {
    ...baseConfig,
    pool: {
      min: 2,
      max: 20,
    },
  },
  test: {
    ...baseConfig,
  },
};
