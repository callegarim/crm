// Migration: create settings table

/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('settings', (table) => {
    table.increments('id').primary();
    table.string('key', 255).notNullable().unique();
    table.text('value').nullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('settings');
};
