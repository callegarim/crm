// Migration: create contacts table

/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('contacts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 255).notNullable();
    table.string('phone', 50).notNullable().unique();
    table.string('email', 255).nullable();
    table.string('source', 100).nullable().defaultTo('whatsapp');
    table.string('status', 50).notNullable().defaultTo('active');
    table.uuid('assigned_to').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamps(true, true);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('contacts');
};
