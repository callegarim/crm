// Migration: create ai_agents table

/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('ai_agents', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 255).notNullable();
    table.string('role', 255).nullable();
    table.text('system_prompt').notNullable();
    table.string('llm_model', 100).notNullable().defaultTo('llama-3.3-70b-versatile');
    table.float('temperature').notNullable().defaultTo(0.7);
    table.integer('typing_delay_ms').notNullable().defaultTo(5000);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('ai_agents');
};
