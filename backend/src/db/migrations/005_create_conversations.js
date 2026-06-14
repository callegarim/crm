// Migration: create conversations table

/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('conversations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('contact_id').notNullable().references('id').inTable('contacts').onDelete('CASCADE');
    table.string('channel', 50).notNullable().defaultTo('whatsapp');
    table.enum('status', ['open', 'bot', 'human', 'closed']).notNullable().defaultTo('bot');
    table.uuid('assigned_agent_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamps(true, true);

    // Índice para busca rápida de conversas abertas
    table.index(['status', 'updated_at']);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('conversations');
};
