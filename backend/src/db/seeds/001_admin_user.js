// Seed: cria usuário admin inicial
const bcrypt = require('bcryptjs');

/**
 * @param {import('knex').Knex} knex
 */
exports.seed = async function (knex) {
  // Verifica se já existe admin
  const existing = await knex('users').where({ email: 'admin@megacrm.com' }).first();
  if (existing) {
    console.log('ℹ️  Admin já existe, pulando seed');
    return;
  }

  const passwordHash = await bcrypt.hash('admin123', 12);

  await knex('users').insert({
    name: 'Administrador',
    email: 'admin@megacrm.com',
    password_hash: passwordHash,
    role: 'admin',
  });

  console.log('✅ Usuário admin criado: admin@megacrm.com / admin123');
};
