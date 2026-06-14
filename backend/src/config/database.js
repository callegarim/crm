// backend/src/config/database.js
// Conexão Knex + PostgreSQL

const knex = require('knex');
const knexConfig = require('../db/knexfile');
const env = require('./env');

const config = knexConfig[env.NODE_ENV] || knexConfig.development;

const db = knex(config);

module.exports = db;
