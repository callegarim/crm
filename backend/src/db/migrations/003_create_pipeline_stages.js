// Migration: create pipeline_stages table

/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('pipeline_stages', (table) => {
    table.increments('id').primary();
    table.string('name', 255).notNullable();
    table.integer('order_index').notNullable().defaultTo(0);
    table.string('color', 20).notNullable().defaultTo('#3B82F6');
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('pipeline_stages');
};
