(() => {
  'use strict';

  const LOJA = window.LOJA || {};
  const CATS = window.CATEGORIAS || [];
  const MENU = window.CARDAPIO || [];
  const ADICIONAIS = window.ADICIONAIS || [];
  const MOVIMENTO_REDUZIDO = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── UTILITÁRIOS ───────────────────────────────────
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const brl = v => 'R$ ' + v.toFixed(2).replace('.', ',');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sorteia = lista => lista[Math.floor(Math.random() * lista.length)];
  const sessao = {
    ler(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
    gravar(k, v) { try { sessionStorage.setItem(k, v); } catch { /* sem storage */ } },
  };

  // Links de pedido vêm de js/menu.js (um lugar só pra trocar)
  $$('[data-link]').forEach(a => { const url = LOJA.links && LOJA.links[a.dataset.link]; if (url) a.href = url; });

  // ── CARDÁPIO (vitrine) ────────────────────────────
  function cardHTML(item) {
    return `
      <article class="card reveal" data-item="${esc(item.id)}" tabindex="-1">
        <div class="card-foto">
          <img src="img/cardapio/${esc(item.foto)}" alt="${esc(item.nome)}" loading="lazy" width="480" height="640">
          ${item.tag ? `<span class="card-tag">${esc(item.tag)}</span>` : ''}
        </div>
        <div class="card-corpo">
          <h4 class="card-nome">${esc(item.nome)}</h4>
          <p class="card-desc">${esc(item.desc)}</p>
          ${item.ponto ? '<p class="card-ponto"><span>Ponto:</span> bem passado · ao ponto · mal passado</p>' : ''}
          <div class="card-rodape">
            <p class="card-preco">${item.aPartirDe ? '<small>a partir de</small>' : ''}${brl(item.preco)}</p>
            <button type="button" class="btn-quero" data-quero="${esc(item.id)}">Quero esse!</button>
          </div>
        </div>
      </article>`;
  }

  function linhaHTML(item) {
    return `<li class="linha" data-item="${esc(item.id)}"><span class="linha-nome">${esc(item.nome)}</span><span class="linha-pontos" aria-hidden="true"></span><span class="linha-preco">${brl(item.preco)}</span></li>`;
  }

  function renderCardapio() {
    const alvo = $('[data-cardapio]');
    if (!alvo) return;
    $('[data-cat-nav]').innerHTML = CATS.map(c => `<a href="#cat-${esc(c.id)}">${c.emoji} ${esc(c.nome)}</a>`).join('');
    alvo.innerHTML = CATS.map(c => {
      const itens = MENU.filter(i => i.cat === c.id);
      if (!itens.length) return '';
      const comFoto = itens.filter(i => i.foto), semFoto = itens.filter(i => !i.foto);
      const turbine = c.id === 'chapa' && ADICIONAIS.length ? `
        <aside class="turbine reveal" data-item="turbine">
          <h4 class="turbine-titulo">Turbine seu smash <small>(até 3 adicionais)</small></h4>
          <ul class="turbine-lista">${ADICIONAIS.map(a => `<li><span>${esc(a.nome)}</span><strong>+${brl(a.preco)}</strong></li>`).join('')}</ul>
        </aside>` : '';
      return `
        <div class="cardapio-grupo" id="cat-${esc(c.id)}" data-falar-cat="${esc(c.id)}">
          <h3 class="grupo-titulo"><span aria-hidden="true">${c.emoji}</span> ${esc(c.nome)}</h3>
          ${comFoto.length ? `<div class="cardapio-grid">${comFoto.map(cardHTML).join('')}</div>` : ''}
          ${semFoto.length ? `<ul class="lista-simples reveal">${semFoto.map(linhaHTML).join('')}</ul>` : ''}
          ${turbine}
        </div>`;
    }).join('');
  }

  // ── LOJA ABERTA / FECHADA (dois turnos) ───────────
  const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

  function agoraNaLoja() {
    try {
      const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: LOJA.fuso, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
        .formatToParts(new Date()).map(x => [x.type, x.value]));
      return { dia: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday), hora: (Number(p.hour) % 24) + Number(p.minute) / 60 };
    } catch {
      const d = new Date();
      return { dia: d.getDay(), hora: d.getHours() + d.getMinutes() / 60 };
    }
  }

  function statusLoja() {
    const turnos = LOJA.turnos || [];
    const dias = LOJA.diasAbertos || [];
    const { dia, hora } = agoraNaLoja();
    if (dias.includes(dia)) {
      const atual = turnos.find(([a, f]) => hora >= a && hora < f);
      if (atual) return { aberto: true, texto: `Aberto agora · até ${atual[1]}h`, quando: '' };
      const prox = turnos.find(([a]) => hora < a);
      if (prox) return { aberto: false, texto: `Fechado · abre hoje às ${prox[0]}h`, quando: `hoje às ${prox[0]}h` };
    }
    for (let i = 1; i <= 7; i++) {
      const d = (dia + i) % 7;
      if (dias.includes(d) && turnos.length) {
        const quando = `${i === 1 ? 'amanhã' : DIAS[d]} às ${turnos[0][0]}h`;
        return { aberto: false, texto: `Fechado · abre ${quando}`, quando };
      }
    }
    return { aberto: false, texto: 'Fechado', quando: 'em breve' };
  }

  let status = statusLoja();
  function atualizarStatus() {
    status = statusLoja();
    const el = $('[data-status]');
    el.hidden = false;
    el.classList.toggle('aberto', status.aberto);
    $('[data-status-texto]', el).textContent = status.texto;
  }

  // ── MASCOTE ───────────────────────────────────────
  const FALAS = {
    hero: () => status.aberto
      ? sorteia(['E aí! Bateu a fome? 🍔', 'Chapa quente, pão na mão. Bora? 🔥', 'Psiu! O Crostinha tá chamando seu nome…'])
      : `Tô descansando agora 😴 Volto ${status.quando}!`,
    sobre: () => sorteia(['Smash de 180g, esmagado na hora. Sem frescura!', 'Aqui o ponto da carne é você quem manda. 🫡']),
    cardapio: () => sorteia(['Fica à vontade… passa o dedo nos lanches que eu te conto o segredo de cada um 😉', 'Difícil escolher, né? Eu sou suspeito… gosto de todos.']),
    'cat-sobremesas': () => 'Guardou espaço pra sobremesa? Eu sempre guardo. 🍫',
    'cat-beber': () => 'Já provou o Chá Brabo? É feito aqui! 🍒',
    'cat-alcoolicos': () => 'Uma gelada pra acompanhar? 🍺 (só pra maiores de 18, hein!)',
    pedir: () => status.aberto ? 'É aqui! Escolhe onde pedir que eu já vou pra chapa 🔥' : `A gente abre ${status.quando}. Já deixa o app separado! 😉`,
    contato: () => 'Vem me visitar na Vila Alpina! Tem salão também. 🪑',
    ocioso: () => sorteia(['Psiu… ainda tá aí? Tô ficando com fome também 😋', 'Não me deixa aqui sozinho na chapa… 🥺', 'Se ficar olhando muito, o cheddar derrete! 🧀']),
    cocegas: () => sorteia(['Ei, faz cócegas! 😂', 'Cuidado que meu cheddar escorre!', 'Tô de boné novo, reparou? 🧢', 'Eu malho: são 180g de puro smash. 💪', 'Toca de novo e eu viro X-Tudo! 😆']),
  };
  const ACAO_PLATAFORMA = {
    retirada: 'Em ~15 min tá pronto no balcão! 🏃',
    ifood: 'iFood? Partiu, eu vou até você! 🛵',
    99: '99Food? Bora, já tô de tênis! 👟',
  };

  // Mascote do topo
  const heroBtn = $('[data-mascote-hero]');
  const heroTexto = $('[data-balao-hero-texto]');
  const heroBalao = $('[data-balao-hero]');
  function falarHero(texto) {
    heroTexto.textContent = texto;
    heroBalao.classList.remove('pop'); void heroBalao.offsetWidth; heroBalao.classList.add('pop');
  }
  function pular(el) {
    el.classList.remove('pula'); void el.offsetWidth; el.classList.add('pula');
  }
  heroBtn.addEventListener('click', () => { pular(heroBtn); falarHero(FALAS.cocegas()); amigoConversou(); });
  // Inclina na direção do mouse (computador)
  if (!MOVIMENTO_REDUZIDO && window.matchMedia('(hover: hover)').matches) {
    const heroSec = $('#hero');
    heroSec.addEventListener('mousemove', e => {
      const r = heroBtn.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
      const dy = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
      heroBtn.style.setProperty('--inclina', `${(dx * 14).toFixed(2)}deg`);
      heroBtn.style.setProperty('--olha', `${(dy * 10).toFixed(1)}px`);
    });
    heroSec.addEventListener('mouseleave', () => { heroBtn.style.setProperty('--inclina', '0deg'); heroBtn.style.setProperty('--olha', '0px'); });
  }

  // Balão da seção "Onde pedir"
  const pedirTexto = $('[data-balao-pedir-texto]');
  function falarPedir(texto) {
    pedirTexto.textContent = texto;
    const b = pedirTexto.parentElement;
    b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  }
  $$('[data-plataforma]').forEach(a => {
    const fala = () => falarPedir(ACAO_PLATAFORMA[a.dataset.plataforma]);
    a.addEventListener('mouseenter', fala);
    a.addEventListener('focus', fala);
  });

  // Mascote amigo (flutuante)
  const amigo = $('[data-amigo]');
  const amigoTexto = $('[data-amigo-texto]');
  const amigoBalao = $('[data-amigo-balao]');
  const amigoAcoes = $('[data-amigo-acoes]');
  const amigoBtn = $('[data-amigo-btn]');
  let amigoDispensado = sessao.ler('cp-amigo-off') === '1';
  let fecharBalaoT, ultimaFala = '', ultimoContexto = '', cliques = 0, ociosoT;

  function amigoFalar(texto, { acoes = false, duracao = 6000 } = {}) {
    if (amigoDispensado || amigo.hidden || texto === ultimaFala) return;
    ultimaFala = texto;
    amigoTexto.textContent = texto;
    amigoAcoes.hidden = !acoes;
    amigoBalao.classList.add('visivel');
    amigoBalao.classList.remove('pop'); void amigoBalao.offsetWidth; amigoBalao.classList.add('pop');
    clearTimeout(fecharBalaoT);
    fecharBalaoT = setTimeout(() => { amigoBalao.classList.remove('visivel'); ultimaFala = ''; }, duracao);
  }
  function amigoConversou() {
    clearTimeout(ociosoT);
    ociosoT = setTimeout(() => amigoFalar(FALAS.ocioso()), 30000);
  }

  amigoBtn.addEventListener('click', () => {
    pular(amigoBtn);
    cliques++;
    if (cliques % 3 === 1) amigoFalar(status.aberto ? 'Bora pedir? Escolhe aí 👇' : `A gente abre ${status.quando}, mas já pode olhar 👇`, { acoes: true, duracao: 10000 });
    else { ultimaFala = ''; amigoFalar(FALAS.cocegas()); }
    amigoConversou();
  });
  $('[data-amigo-fechar]').addEventListener('click', () => {
    amigoDispensado = true;
    sessao.gravar('cp-amigo-off', '1');
    amigo.classList.add('saindo');
    setTimeout(() => { amigo.hidden = true; }, 300);
  });

  // Aparece quando nenhum mascote grande (topo ou "Peça agora") está na tela
  if ('IntersectionObserver' in window) {
    const grandesVisiveis = new Set();
    const obsGrandes = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) grandesVisiveis.add(e.target); else grandesVisiveis.delete(e.target); });
      if (amigoDispensado) return;
      const mostrar = grandesVisiveis.size === 0;
      if (mostrar && amigo.hidden) { amigo.hidden = false; amigoConversou(); }
      amigo.classList.toggle('escondido', !mostrar);
      if (!mostrar) { amigoBalao.classList.remove('visivel'); ultimaFala = ''; }
    }, { threshold: 0.25 });
    [$('.hero-mascote'), $('.pedir-mascote')].forEach(el => el && obsGrandes.observe(el));
  }

  // Fala de acordo com a parte da página
  function observarContexto() {
    if (!('IntersectionObserver' in window)) return;
    const obs = new IntersectionObserver(entries => {
      entries.filter(e => e.isIntersecting).forEach(e => {
        const ctx = e.target.dataset.falar || ('cat-' + e.target.dataset.falarCat);
        if (ctx === ultimoContexto || !FALAS[ctx]) return;
        ultimoContexto = ctx;
        if (ctx === 'hero') falarHero(FALAS.hero());
        else amigoFalar(FALAS[ctx]());
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    $$('[data-falar], [data-falar-cat]').forEach(el => obs.observe(el));
  }

  // Comenta o lanche que o cliente olha
  function ligarCardapio() {
    const alvo = $('[data-cardapio]');
    let olhandoT;
    const comentar = el => {
      const item = MENU.find(i => i.id === el.dataset.item);
      if (item && item.fala) { clearTimeout(olhandoT); olhandoT = setTimeout(() => amigoFalar(item.fala), 250); }
    };
    alvo.addEventListener('mouseover', e => { const c = e.target.closest('.card[data-item]'); if (c) comentar(c); });
    alvo.addEventListener('focusin', e => { const c = e.target.closest('.card[data-item]'); if (c) comentar(c); });
    alvo.addEventListener('mouseout', () => clearTimeout(olhandoT));
    alvo.addEventListener('click', e => {
      const b = e.target.closest('[data-quero]');
      if (!b) return;
      const item = MENU.find(i => i.id === b.dataset.quero);
      if (!item) return;
      falarPedir(`Bora de ${item.nome}? Escolhe onde pedir 👇`);
      $('[data-pedir-escolha]').innerHTML = `Você escolheu <strong>${esc(item.nome)}</strong>. Agora é só escolher onde pedir:`;
      const sec = $('#pedir');
      sec.scrollIntoView({ behavior: MOVIMENTO_REDUZIDO ? 'auto' : 'smooth' });
      sec.focus({ preventScroll: true });
      $$('.plataforma').forEach(p => { p.classList.remove('chama'); void p.offsetWidth; p.classList.add('chama'); });
      ultimoContexto = 'pedir';
      amigoConversou();
    });
  }

  // ── MENU MOBILE ───────────────────────────────────
  const burger = $('.nav-burger');
  const links = $('#nav-links');
  function fecharMenu() {
    links.classList.remove('aberto');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Abrir menu');
  }
  burger.addEventListener('click', () => {
    const abrir = !links.classList.contains('aberto');
    links.classList.toggle('aberto', abrir);
    burger.setAttribute('aria-expanded', String(abrir));
    burger.setAttribute('aria-label', abrir ? 'Fechar menu' : 'Abrir menu');
  });
  links.addEventListener('click', e => { if (e.target.closest('a')) fecharMenu(); });
  document.addEventListener('click', e => { if (links.classList.contains('aberto') && !e.target.closest('.nav')) fecharMenu(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharMenu(); });

  // ── REVEAL ────────────────────────────────────────
  function observarReveal() {
    const els = $$('.reveal:not(.visible)');
    if (!('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('visible')); return; }
    const obs = new IntersectionObserver(entries => {
      entries.filter(e => e.isIntersecting).forEach((e, i) => {
        setTimeout(() => e.target.classList.add('visible'), i * 80);
        obs.unobserve(e.target);
      });
    }, { threshold: 0.1 });
    els.forEach(el => obs.observe(el));
  }

  // ── INÍCIO ────────────────────────────────────────
  $$('[data-ano]').forEach(el => { el.textContent = new Date().getFullYear(); });
  renderCardapio();
  ligarCardapio();
  atualizarStatus();
  falarHero(FALAS.hero());
  if (!status.aberto) falarPedir(FALAS.pedir());
  setInterval(atualizarStatus, 60 * 1000);
  observarReveal();
  observarContexto();
})();
