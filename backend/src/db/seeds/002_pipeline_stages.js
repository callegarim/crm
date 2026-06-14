// Seed: cria os 8 estágios do pipeline Kanban (funil de vendas)

/**
 * @param {import('knex').Knex} knex
 */
exports.seed = async function (knex) {
  // Verifica se já existem stages
  const count = await knex('pipeline_stages').count('id as total').first();
  if (count && parseInt(count.total) > 0) {
    console.log('ℹ️  Pipeline stages já existem, pulando seed');
    return;
  }

  const stages = [
    { name: 'Entrada (SDR I.A.)',    order_index: 1, color: '#3B82F6' },  // Azul
    { name: 'Orçamento / Proposta',  order_index: 2, color: '#10B981' },  // Verde
    { name: 'Vendedor / Closer',     order_index: 3, color: '#F59E0B' },  // Amarelo
    { name: 'Agendamento Auto',      order_index: 4, color: '#8B5CF6' },  // Roxo
    { name: 'Follow-up Cadência',    order_index: 5, color: '#6366F1' },  // Indigo
    { name: 'Pós-Venda + Upsell',   order_index: 6, color: '#14B8A6' },  // Teal
    { name: 'Perdido / Frio',        order_index: 7, color: '#EF4444' },  // Vermelho
    { name: 'Descartado',            order_index: 8, color: '#6B7280' },  // Cinza
  ];

  await knex('pipeline_stages').insert(stages);
  console.log('✅ 8 pipeline stages criados');
};
