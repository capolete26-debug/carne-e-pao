/* Cardápio da Carne & Pão.
 * Para mudar preços, adicionar ou tirar lanches, edite só este arquivo.
 * - id: identificador único (sem espaços)
 * - cat: 'burger' ou 'acomp' (define em qual grupo o item aparece)
 * - preco / adicionais[].preco: em reais (use ponto para centavos: 2.50)
 */
window.CARDAPIO = [
  {
    id: 'classico', cat: 'burger', emoji: '🔥', nome: 'O Clássico', preco: 28,
    desc: 'Smash duplo, queijo americano derretido, alface crocante, tomate, picles e molho da casa.',
    tag: 'Mais pedido',
    adicionais: [
      { nome: 'Bacon crocante', preco: 2.50 },
      { nome: 'Queijo extra', preco: 2.00 },
      { nome: 'Carne extra', preco: 5.00 },
    ],
    removiveis: ['Alface', 'Tomate', 'Picles'],
  },
  {
    id: 'cheesemaster', cat: 'burger', emoji: '🧀', nome: 'O Cheesemaster', preco: 34,
    desc: 'Smash duplo, quatro fatias de queijo americano, cebola caramelizada e maionese defumada.',
    tag: 'Queijeiro',
    adicionais: [
      { nome: 'Bacon crocante', preco: 2.50 },
      { nome: 'Queijo extra', preco: 2.00 },
      { nome: 'Carne extra', preco: 5.00 },
    ],
    removiveis: ['Cebola caramelizada', 'Maionese defumada'],
  },
  {
    id: 'atrevido', cat: 'burger', emoji: '🌶️', nome: 'O Atrevido', preco: 32,
    desc: 'Smash duplo, jalapeños frescos, queijo pepper jack, cebola roxa e molho sriracha.',
    tag: 'Apimentado',
    adicionais: [
      { nome: 'Bacon crocante', preco: 2.50 },
      { nome: 'Queijo extra', preco: 2.00 },
      { nome: 'Carne extra', preco: 5.00 },
      { nome: 'Alface e tomate', preco: 2.50 },
    ],
    removiveis: ['Jalapeños', 'Cebola roxa', 'Sriracha'],
  },
  {
    id: 'porco-rico', cat: 'burger', emoji: '🥓', nome: 'O Porco Rico', preco: 36,
    desc: 'Smash simples, bacon crocante em dobro, queijo cheddar, alface e molho barbecue.',
    tag: 'Especial',
    adicionais: [
      { nome: 'Bacon crocante', preco: 2.50 },
      { nome: 'Queijo extra', preco: 2.00 },
      { nome: 'Carne extra', preco: 5.00 },
      { nome: 'Alface e tomate', preco: 2.50 },
    ],
    removiveis: ['Alface', 'Barbecue'],
  },
  {
    id: 'honesto', cat: 'burger', emoji: '🥬', nome: 'O Honesto', preco: 24,
    desc: 'Smash simples, queijo americano, tomate, alface, picles e mostarda. Direto ao ponto.',
    tag: 'Direto ao ponto',
    adicionais: [
      { nome: 'Bacon crocante', preco: 2.50 },
      { nome: 'Queijo extra', preco: 2.00 },
      { nome: 'Carne extra', preco: 5.00 },
      { nome: 'Alface e tomate', preco: 2.50 },
    ],
    removiveis: ['Alface', 'Tomate', 'Picles', 'Mostarda'],
  },
  {
    id: 'batata', cat: 'acomp', emoji: '🍟', nome: 'Batata & Molho', preco: 14,
    desc: 'Batata frita palito crocante com molho da casa. A companheira perfeita.',
    tag: 'Acompanhamento',
    adicionais: [
      { nome: 'Porção dupla', preco: 8.00 },
      { nome: 'Molho extra', preco: 2.00 },
    ],
    removiveis: ['Molho da casa'],
  },
];

/* Dados da loja usados no site e na mensagem do WhatsApp. */
window.LOJA = {
  whatsapp: '5511940609596',
  whatsappExibicao: '(11) 94060-9596',
  endereco: 'Rua das Hamburguerias, 42',
  cidade: 'São Paulo — SP',
  // Dias abertos: 0=domingo, 1=segunda, ..., 6=sábado
  diasAbertos: [0, 2, 3, 4, 5, 6],
  abre: 18, // hora (0–23)
  fecha: 23,
  fuso: 'America/Sao_Paulo',
};
