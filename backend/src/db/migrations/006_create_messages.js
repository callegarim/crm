// Migration: create messages table

/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('messages', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('conversation_id').notNullable().references('id').inTable('conversations').onDelete('CASCADE');
    table.enum('direction', ['inbound', 'outbound']).notNullable();
    table.enum('content_type', ['text', 'image', 'audio', 'video', 'doc']).notNullable().defaultTo('text');
    table.text('content').nullable();
    table.text('media_url').nullable();
    table.string('sent_by', 255).nullable(); // agent user id, 'bot', ou 'system'
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Índice para busca de mensagens por conversa (ordenação cronológica)
    table.index(['conversation_id', 'created_at']);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('messages');
};
