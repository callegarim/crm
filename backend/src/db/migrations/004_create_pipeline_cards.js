// Migration: create pipeline_cards table

/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('pipeline_cards', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('contact_id').notNullable().unique().references('id').inTable('contacts').onDelete('CASCADE');
    table.integer('stage_id').notNullable().references('id').inTable('pipeline_stages').onDelete('RESTRICT');
    table.uuid('assigned_to').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.text('notes').nullable();
    table.timestamps(true, true);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('pipeline_cards');
};
