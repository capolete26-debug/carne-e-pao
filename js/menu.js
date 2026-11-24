/* Cardápio e dados da Carne & Pão.
 * Os pedidos são feitos na Saipos (retirada), no iFood e no 99Food. Este arquivo só MOSTRA o cardápio.
 * Mudou preço ou lanche na Saipos? Atualize aqui também.
 * - preco: em reais (use ponto para centavos: 14.90)
 * - aPartirDe: true quando tem adicionais pagos
 * - foto: arquivo em img/cardapio/ (opcional)
 * - fala: o que o mascote diz quando o cliente passa o mouse ou toca no item (opcional)
 */
window.CATEGORIAS = [
  { id: 'beliscar', nome: 'Pra Beliscar', emoji: '🍟' },
  { id: 'chapa', nome: 'Na Chapa', emoji: '🔥' },
  { id: 'sobremesas', nome: 'Sobremesas', emoji: '🍫' },
  { id: 'beber', nome: 'Pra Beber', emoji: '🥤' },
  { id: 'alcoolicos', nome: 'Alcoólicos', emoji: '🍺' },
];

window.CARDAPIO = [
  // ── PRA BELISCAR ──
  { id: 'fritas-da-casa', cat: 'beliscar', nome: 'Fritas da Casa', preco: 24, foto: 'fritas-da-casa.jpg',
    desc: 'Batatas artesanais fininhas e crocantes, acompanhadas da nossa maionese verde.',
    fala: 'Fininha e crocante… a maionese verde é segredo de família! 🤫' },
  { id: 'fritas-cheddar-bacon', cat: 'beliscar', nome: 'Fritas Cheddar e Bacon', preco: 28, foto: 'fritas-cheddar-bacon.jpg',
    desc: 'Batatas artesanais fininhas, cheddar cremoso, farofa de bacon e maionese de alho.',
    fala: 'Cheddar E bacon? Isso não é petisco, é abraço. 🧀🥓' },
  { id: 'johnny-balls', cat: 'beliscar', nome: 'Johnny Balls', preco: 32, foto: 'johnny-balls.jpg',
    desc: '6 bolinhos crocantes de carne desfiada, acompanhados do nosso barbecue de goiabada.',
    fala: 'Seis bolinhas, ninguém divide. Eu avisei. 😏' },

  // ── NA CHAPA ──
  { id: 'crostinha', cat: 'chapa', nome: 'Crostinha', preco: 32, aPartirDe: true, ponto: true, foto: 'crostinha.jpg', tag: 'O clássico',
    desc: 'Smash de 180g prensado na chapa, cebola picada, cheddar derretido e o molho da casa com ketchup, mostarda e mel.',
    fala: 'O clássico da casa! Somos praticamente parentes. 🥹' },
  { id: 'verde-de-fome', cat: 'chapa', nome: 'Verde de Fome', preco: 36, aPartirDe: true, ponto: true, foto: 'verde-de-fome.jpg',
    desc: 'Smash 180g, cheddar derretido, cebola roxa, tomate, alface americana e maionese de verde no pão brioche.',
    fala: 'O mais fresquinho da chapa. Tem salada, então conta como saudável, né? 🥬' },
  { id: 'bendito-bacon', cat: 'chapa', nome: 'Bendito Bacon', preco: 38, aPartirDe: true, ponto: true, foto: 'bendito-bacon.jpg',
    desc: 'Smash 180g, cheddar derretido, fatia de bacon, maionese de alho e cebola caramelizada no pão brioche.',
    fala: 'Bacon com cebola caramelizada… amém! 🙏🥓' },
  { id: 'cremoso-cheese', cat: 'chapa', nome: 'Cremoso Cheese', preco: 38, aPartirDe: true, ponto: true, foto: 'cremoso-cheese.jpg',
    desc: 'Pão brioche, smash 180g, cheddar cremoso, farofa de bacon e maionese verde.',
    fala: 'Cremoso em cada mordida. Prepara o guardanapo! 🧻' },
  { id: 'goiabruto', cat: 'chapa', nome: 'Goiabruto', preco: 42, aPartirDe: true, ponto: true, foto: 'goiabruto.jpg', tag: 'Dois smash',
    desc: 'Dois smash 180g, cheddar derretido, cebola crispy e barbecue de goiabada no pão brioche. Um agridoce pesado e crocante.',
    fala: 'DOIS smash de 180g. Só pra quem tem coragem! 💪' },
  { id: 'cogumeludo', cat: 'chapa', nome: 'Cogumeludo', preco: 36, foto: 'cogumeludo.jpg', tag: 'Vegetariano',
    desc: 'Cogumelo champignon salteado na chapa com mix de páprica, cheddar derretido, maionese de verde e cebola caramelizada no pão brioche.',
    fala: 'Vegetariano que não fica devendo nada. Respeita o Cogumeludo! 🍄' },

  // ── SOBREMESAS ──
  { id: 'bendita-colherada', cat: 'sobremesas', nome: 'Bendita Colherada', preco: 29, foto: 'bendita-colherada.jpg',
    desc: 'Ganache de Nutella, pedaços de morango, cheesecake, terra de brownie e morangos frescos fatiados.',
    fala: 'Guardou espaço pra sobremesa, né? Essa vale a pena! 🍓' },
  { id: 'brownie', cat: 'sobremesas', nome: 'Brownie com Sorvete', preco: 24, foto: 'brownie.jpg',
    desc: 'Brownie com Nutella, sorvete cremoso, ganache de Nutella e morangos frescos. Quente, cremoso e impossível parar na primeira colherada.',
    fala: 'Quente com gelado… é química, é amor. 🍫🍦' },
  { id: 'cookie-nutella', cat: 'sobremesas', nome: 'Cookie de Nutella', preco: 12, foto: 'cookie-nutella.jpg',
    desc: 'Cookie artesanal, macio por dentro, dourado por fora e recheado com Nutella de verdade.',
    fala: 'Um cookie só? Duvido. 🍪' },

  // ── PRA BEBER ──
  { id: 'cha-brabo', cat: 'beber', nome: 'Chá Brabo', preco: 12, foto: 'cha-brabo.jpg', tag: 'Da casa',
    desc: 'Nosso chá gelado da casa. Sabores: frutas vermelhas, pêssego, maçã verde ou mate.',
    fala: 'Chá Brabo é feito aqui. Prova o de frutas vermelhas! 🍒' },
  { id: 'coca', cat: 'beber', nome: 'Coca-Cola', preco: 9 },
  { id: 'coca-zero', cat: 'beber', nome: 'Coca-Cola Zero', preco: 9 },
  { id: 'guarana', cat: 'beber', nome: 'Guaraná Antarctica', preco: 9 },
  { id: 'guarana-zero', cat: 'beber', nome: 'Guaraná Antarctica Zero', preco: 9 },
  { id: 'sprite', cat: 'beber', nome: 'Sprite', preco: 9 },
  { id: 'agua', cat: 'beber', nome: 'Água sem gás', preco: 4 },
  { id: 'agua-gas', cat: 'beber', nome: 'Água com gás', preco: 4 },

  // ── ALCOÓLICOS ──
  { id: 'corona', cat: 'alcoolicos', nome: 'Corona Long Neck', preco: 12 },
  { id: 'heineken', cat: 'alcoolicos', nome: 'Heineken Long Neck 330ml', preco: 12 },
];

/* Adicionais dos smash (até 3 por lanche) */
window.ADICIONAIS = [
  { nome: 'Smash 180g + cheese', preco: 14.90 },
  { nome: 'Meia porção de batata', preco: 12.00 },
  { nome: 'Bacon fatiado', preco: 4.50 },
  { nome: 'Farofa de bacon', preco: 4.50 },
  { nome: 'Ovo', preco: 4.50 },
  { nome: 'Cebola caramelizada', preco: 4.50 },
  { nome: 'Cebola crispy', preco: 4.50 },
  { nome: 'Alface, tomate e cebola roxa', preco: 4.50 },
];

/* Dados da loja */
window.LOJA = {
  endereco: 'Rua Ester, 203',
  bairro: 'Vila Alpina',
  cidade: 'Santo André — SP',
  whatsapp: '5511940609596',
  whatsappExibicao: '(11) 94060-9596',
  instagram: 'carneepaoo',
  // Dias abertos: 0=domingo, 1=segunda, ..., 6=sábado
  diasAbertos: [0, 3, 4, 5, 6],
  // Turnos do dia [abre, fecha] em horas
  turnos: [[11, 15], [18, 23]],
  fuso: 'America/Sao_Paulo',
  // Onde pedir
  links: {
    retirada: 'https://carneepao.saipos.com/home',
    ifood: 'https://www.ifood.com.br/delivery/santo-andre-sp/carne-e-pao---smash-burger-vila-alpina/27f9098f-7891-442e-9c80-060679ef1cc4',
    noventaenove: 'https://oia.99app.com/dlp9/2ThwnV',
  },
};
