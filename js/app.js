(() => {
  'use strict';

  const MENU = window.CARDAPIO || [];
  const LOJA = window.LOJA || {};
  const POR_ID = Object.fromEntries(MENU.map(i => [i.id, i]));
  const CHAVE_CARRINHO = 'carne-e-pao:carrinho';
  const CHAVE_CLIENTE = 'carne-e-pao:cliente';

  // ── UTILITÁRIOS ───────────────────────────────────
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const brl = v => 'R$ ' + v.toFixed(2).replace('.', ',');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const armazem = {
    ler(k, padrao) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : padrao; } catch { return padrao; } },
    gravar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem storage: segue sem salvar */ } },
  };

  // ── PREÇOS ────────────────────────────────────────
  function precoUnitario(item, adds) {
    return adds.reduce((t, i) => t + (item.adicionais[i]?.preco || 0), item.preco);
  }

  // ── CARRINHO (estado) ─────────────────────────────
  // Cada linha: { id, qtd, adds:[índices], rems:[índices] }
  let carrinho = carregarCarrinho();

  function carregarCarrinho() {
    const bruto = armazem.ler(CHAVE_CARRINHO, []);
    if (!Array.isArray(bruto)) return [];
    return bruto.filter(l => {
      const item = l && POR_ID[l.id];
      if (!item || !Number.isInteger(l.qtd) || l.qtd < 1) return false;
      l.adds = (Array.isArray(l.adds) ? l.adds : []).filter(i => Number.isInteger(i) && item.adicionais[i]);
      l.rems = (Array.isArray(l.rems) ? l.rems : []).filter(i => Number.isInteger(i) && item.removiveis[i] !== undefined);
      l.qtd = Math.min(l.qtd, 99);
      return true;
    });
  }

  const chaveLinha = l => `${l.id}|${[...l.adds].sort().join(',')}|${[...l.rems].sort().join(',')}`;
  const totalItens = () => carrinho.reduce((t, l) => t + l.qtd, 0);
  const subtotal = () => carrinho.reduce((t, l) => t + precoUnitario(POR_ID[l.id], l.adds) * l.qtd, 0);

  function adicionar(linha) {
    const existente = carrinho.find(l => chaveLinha(l) === chaveLinha(linha));
    if (existente) existente.qtd = Math.min(existente.qtd + linha.qtd, 99);
    else carrinho.push(linha);
    salvarEAtualizar();
  }

  function salvarEAtualizar() {
    armazem.gravar(CHAVE_CARRINHO, carrinho);
    renderCarrinho();
  }

  // ── CARDÁPIO ──────────────────────────────────────
  function renderCardapio() {
    $$('[data-grid]').forEach(grid => {
      const itens = MENU.filter(i => i.cat === grid.dataset.grid);
      grid.innerHTML = itens.map(cardHTML).join('');
      const grupo = grid.closest('.cardapio-grupo');
      if (grupo) grupo.hidden = itens.length === 0;
    });
    $$('.card').forEach(ligarCard);
  }

  function cardHTML(item) {
    const id = esc(item.id);
    const adds = item.adicionais.map((a, i) => `
      <label class="opcao">
        <input type="checkbox" name="add" value="${i}">
        <span class="opcao-nome">${esc(a.nome)}</span>
        <span class="opcao-preco">+${brl(a.preco)}</span>
      </label>`).join('');
    const rems = item.removiveis.map((r, i) => `
      <label class="opcao">
        <input type="checkbox" name="rem" value="${i}">
        <span class="opcao-nome">${esc(r)}</span>
        <span class="opcao-tirar" aria-hidden="true">tirar</span>
      </label>`).join('');
    return `
      <article class="card reveal" data-id="${id}" aria-labelledby="nome-${id}">
        <div class="card-topo">
          <span class="card-emoji" aria-hidden="true">${item.emoji}</span>
          ${item.tag ? `<span class="card-tag">${esc(item.tag)}</span>` : ''}
        </div>
        <h4 class="card-nome" id="nome-${id}">${esc(item.nome)}</h4>
        <p class="card-desc">${esc(item.desc)}</p>
        <p class="card-preco" data-preco aria-live="polite">${brl(item.preco)}</p>
        ${adds ? `<fieldset class="card-opcoes"><legend class="card-opcoes-titulo">✦ Adicionais</legend>${adds}</fieldset>` : ''}
        ${rems ? `<fieldset class="card-opcoes card-opcoes--rem"><legend class="card-opcoes-titulo">✕ Remover ingrediente</legend>${rems}</fieldset>` : ''}
        <div class="card-acoes">
          <div class="qtd" role="group" aria-label="Quantidade">
            <button type="button" data-menos aria-label="Diminuir quantidade" disabled>−</button>
            <output data-qtd>1</output>
            <button type="button" data-mais aria-label="Aumentar quantidade">+</button>
          </div>
          <button type="button" class="btn-add" data-add>Adicionar</button>
        </div>
      </article>`;
  }

  function ligarCard(card) {
    const item = POR_ID[card.dataset.id];
    const out = $('[data-qtd]', card);
    const menos = $('[data-menos]', card);
    const preco = $('[data-preco]', card);
    const btnAdd = $('[data-add]', card);
    let qtd = 1;

    const marcados = nome => $$(`input[name="${nome}"]:checked`, card).map(c => Number(c.value));
    const atualizar = () => {
      out.textContent = qtd;
      menos.disabled = qtd <= 1;
      preco.textContent = brl(precoUnitario(item, marcados('add')) * qtd);
    };

    card.addEventListener('change', atualizar);
    menos.addEventListener('click', () => { qtd = Math.max(1, qtd - 1); atualizar(); });
    $('[data-mais]', card).addEventListener('click', () => { qtd = Math.min(99, qtd + 1); atualizar(); });
    btnAdd.addEventListener('click', () => {
      adicionar({ id: item.id, qtd, adds: marcados('add'), rems: marcados('rem') });
      mostrarToast(`${qtd}× ${item.nome} adicionado ao pedido`);
      $$('input[type=checkbox]', card).forEach(c => { c.checked = false; });
      qtd = 1;
      atualizar();
      btnAdd.textContent = 'Adicionado ✓';
      btnAdd.classList.add('ok');
      clearTimeout(btnAdd._t);
      btnAdd._t = setTimeout(() => { btnAdd.textContent = 'Adicionar'; btnAdd.classList.remove('ok'); }, 1400);
      const navCart = $('.nav-cart');
      navCart.classList.remove('pulse'); void navCart.offsetWidth; navCart.classList.add('pulse');
    });
  }

  // ── CARRINHO (tela) ───────────────────────────────
  const drawer = $('#carrinho');
  const backdrop = $('.drawer-backdrop');
  const form = $('[data-pedido-form]');

  function renderCarrinho() {
    const qtd = totalItens();
    const total = brl(subtotal());

    $$('[data-cart-count]').forEach(el => {
      el.textContent = qtd;
      el.classList.toggle('vazio', qtd === 0);
    });
    $$('[data-cart-total]').forEach(el => { el.textContent = total; });
    $('.nav-cart').setAttribute('aria-label', `Abrir pedido (${qtd} ${qtd === 1 ? 'item' : 'itens'})`);
    $('[data-cart-float]').hidden = qtd === 0 || !drawer.hidden;
    $('[data-cart-subtotal]').textContent = total;

    const vazio = carrinho.length === 0;
    $('[data-cart-vazio]').hidden = !vazio;
    form.hidden = vazio;
    $('[data-drawer-foot]').hidden = vazio;

    $('[data-cart-lista]').innerHTML = carrinho.map((l, idx) => {
      const item = POR_ID[l.id];
      const adds = l.adds.map(i => item.adicionais[i].nome);
      const rems = l.rems.map(i => item.removiveis[i]);
      return `
        <li class="cart-item">
          <span class="cart-item-emoji" aria-hidden="true">${item.emoji}</span>
          <span class="cart-item-nome">${esc(item.nome)}</span>
          <span class="cart-item-preco">${brl(precoUnitario(item, l.adds) * l.qtd)}</span>
          ${adds.length || rems.length ? `<p class="cart-item-det">
            ${adds.length ? `<span class="add">+ ${esc(adds.join(', '))}</span><br>` : ''}
            ${rems.length ? `<span class="rem">sem ${esc(rems.join(', '))}</span>` : ''}
          </p>` : ''}
          <div class="cart-item-acoes">
            <div class="qtd" role="group" aria-label="Quantidade de ${esc(item.nome)}">
              <button type="button" data-linha-menos="${idx}" aria-label="Diminuir">−</button>
              <output>${l.qtd}</output>
              <button type="button" data-linha-mais="${idx}" aria-label="Aumentar">+</button>
            </div>
            <button type="button" class="cart-remover" data-linha-remover="${idx}">Remover</button>
          </div>
        </li>`;
    }).join('');
  }

  $('[data-cart-lista]').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    let idx;
    if ((idx = b.dataset.linhaMais) !== undefined) carrinho[idx].qtd = Math.min(99, carrinho[idx].qtd + 1);
    else if ((idx = b.dataset.linhaMenos) !== undefined) {
      if (carrinho[idx].qtd > 1) carrinho[idx].qtd -= 1;
      else carrinho.splice(idx, 1);
    } else if ((idx = b.dataset.linhaRemover) !== undefined) carrinho.splice(idx, 1);
    else return;
    salvarEAtualizar();
    // mantém o foco dentro da gaveta depois de re-renderizar
    const alvo = $(`[data-linha-${b.dataset.linhaMais !== undefined ? 'mais' : 'menos'}="${idx}"]`, drawer);
    (alvo || $('.drawer-fechar')).focus();
  });

  $('[data-esvaziar]').addEventListener('click', () => {
    if (!confirm('Tirar todos os itens do pedido?')) return;
    carrinho = [];
    salvarEAtualizar();
    $('.drawer-fechar').focus();
  });

  // ── ABRIR / FECHAR GAVETA ─────────────────────────
  let focoAnterior = null;

  function abrirCarrinho() {
    focoAnterior = document.activeElement;
    drawer.hidden = false;
    backdrop.hidden = false;
    document.body.classList.add('sem-scroll');
    fecharMenu();
    renderCarrinho();
    $('.drawer-fechar').focus();
  }

  function fecharCarrinho() {
    if (drawer.hidden) return;
    drawer.hidden = true;
    backdrop.hidden = true;
    document.body.classList.remove('sem-scroll');
    renderCarrinho();
    if (focoAnterior && document.contains(focoAnterior) && focoAnterior.offsetParent !== null) focoAnterior.focus();
  }

  $$('[data-abrir-carrinho]').forEach(b => b.addEventListener('click', abrirCarrinho));
  $$('[data-fechar-carrinho]').forEach(b => b.addEventListener('click', () => {
    fecharCarrinho();
    if (b.hasAttribute('data-ir-cardapio')) {
      const sec = $('#cardapio');
      sec.scrollIntoView();
      sec.focus({ preventScroll: true });
    }
  }));

  document.addEventListener('keydown', e => {
    if (drawer.hidden) {
      if (e.key === 'Escape') fecharMenu();
      return;
    }
    if (e.key === 'Escape') { fecharCarrinho(); return; }
    if (e.key !== 'Tab') return;
    const focaveis = $$('button, [href], input, select, textarea', drawer).filter(el => !el.disabled && el.offsetParent !== null);
    if (!focaveis.length) return;
    const primeiro = focaveis[0], ultimo = focaveis[focaveis.length - 1];
    if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
  });

  // ── FORMULÁRIO DO PEDIDO ──────────────────────────
  const campo = n => form.elements[n];
  const tipoEntrega = () => form.querySelector('input[name=tipo]:checked').value;

  function atualizarTipo() {
    const delivery = tipoEntrega() === 'delivery';
    $('[data-campos-delivery]').hidden = !delivery;
    $('[data-info-retirada]').hidden = delivery;
    $('[data-nota-taxa]').hidden = !delivery;
  }
  $$('input[name=tipo]', form).forEach(r => r.addEventListener('change', atualizarTipo));

  campo('pagto').addEventListener('change', () => {
    $('[data-campo-troco]').hidden = campo('pagto').value !== 'Dinheiro';
  });

  // CEP: máscara + busca automática do endereço (ViaCEP)
  const cepInfo = $('#f-cep-info');
  let ultimoCepBuscado = '';
  campo('cep').addEventListener('input', e => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 8);
    if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5);
    e.target.value = v;
    const digitos = v.replace('-', '');
    if (digitos.length === 8 && digitos !== ultimoCepBuscado) buscarCep(digitos);
    if (digitos.length < 8) { cepInfo.textContent = ''; ultimoCepBuscado = ''; }
  });

  async function buscarCep(cep) {
    ultimoCepBuscado = cep;
    cepInfo.textContent = 'Buscando endereço…';
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: ctrl.signal });
      clearTimeout(t);
      const d = await r.json();
      if (cep !== ultimoCepBuscado) return; // usuário já digitou outro CEP
      if (d.erro) { cepInfo.textContent = 'CEP não encontrado. Preencha o endereço abaixo.'; return; }
      if (d.logradouro) { campo('rua').value = d.logradouro; limparErro('rua'); }
      if (d.bairro) { campo('bairro').value = d.bairro; limparErro('bairro'); }
      cepInfo.textContent = [d.localidade, d.uf].filter(Boolean).join(' — ');
      if (d.logradouro) campo('num').focus();
    } catch {
      if (cep === ultimoCepBuscado) cepInfo.textContent = 'Não deu pra buscar o CEP agora. Preencha o endereço abaixo.';
    }
  }

  // Lembra nome e endereço para a próxima vez
  const CAMPOS_LEMBRAR = ['nome', 'cep', 'rua', 'num', 'comp', 'bairro'];
  const salvo = armazem.ler(CHAVE_CLIENTE, {});
  if (salvo && typeof salvo === 'object') {
    CAMPOS_LEMBRAR.forEach(n => { if (typeof salvo[n] === 'string') campo(n).value = salvo[n]; });
  }

  function marcarErro(nome, msg) {
    const el = campo(nome);
    el.setAttribute('aria-invalid', 'true');
    el.setAttribute('aria-describedby', `f-${nome}-erro`);
    $(`#f-${nome}-erro`).textContent = msg;
  }
  function limparErro(nome) {
    const el = campo(nome);
    el.removeAttribute('aria-invalid');
    const err = $(`#f-${nome}-erro`);
    if (err) err.textContent = '';
  }
  ['nome', 'rua', 'num', 'bairro'].forEach(n => campo(n).addEventListener('input', () => limparErro(n)));

  function validar() {
    const obrig = ['nome'];
    if (tipoEntrega() === 'delivery') obrig.push('rua', 'num', 'bairro');
    ['nome', 'rua', 'num', 'bairro'].forEach(limparErro);
    const faltando = obrig.filter(n => !campo(n).value.trim());
    const msgs = { nome: 'Diz pra gente seu nome.', rua: 'Informe a rua.', num: 'Informe o número.', bairro: 'Informe o bairro.' };
    faltando.forEach(n => marcarErro(n, msgs[n]));
    if (faltando.length) campo(faltando[0]).focus();
    return faltando.length === 0;
  }

  function montarMensagem() {
    const v = n => campo(n).value.trim();
    const linhas = ['🍔 *Pedido — Carne & Pão*', '', `*Cliente:* ${v('nome')}`, '', '*Itens:*'];
    carrinho.forEach(l => {
      const item = POR_ID[l.id];
      linhas.push(`${l.qtd}x ${item.nome} — ${brl(precoUnitario(item, l.adds) * l.qtd)}`);
      if (l.adds.length) linhas.push(`   + ${l.adds.map(i => item.adicionais[i].nome).join(', ')}`);
      if (l.rems.length) linhas.push(`   – sem ${l.rems.map(i => item.removiveis[i]).join(', ')}`);
    });
    linhas.push('', `*Subtotal:* ${brl(subtotal())}`);

    if (tipoEntrega() === 'delivery') {
      linhas.push('(taxa de entrega a combinar)', '', '🛵 *Entrega*');
      linhas.push(`${v('rua')}, ${v('num')}${v('comp') ? ' — ' + v('comp') : ''}`);
      linhas.push([v('bairro'), v('cep') && 'CEP ' + v('cep')].filter(Boolean).join(' · '));
    } else {
      linhas.push('', `🏃 *Retirada no local* — ${LOJA.endereco || ''}`);
    }

    let pagto = `💳 *Pagamento:* ${v('pagto')}`;
    if (v('pagto') === 'Dinheiro' && v('troco')) pagto += ` (troco para R$ ${v('troco')})`;
    linhas.push('', pagto);
    if (v('obs')) linhas.push(`📝 *Obs:* ${v('obs')}`);
    return linhas.join('\n');
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!carrinho.length || !validar()) return;
    const dados = {};
    CAMPOS_LEMBRAR.forEach(n => { dados[n] = campo(n).value.trim(); });
    armazem.gravar(CHAVE_CLIENTE, dados);
    const url = `https://wa.me/${LOJA.whatsapp}?text=${encodeURIComponent(montarMensagem())}`;
    window.open(url, '_blank', 'noopener');
    mostrarToast('Abrimos o WhatsApp com seu pedido. É só tocar em enviar!');
  });

  // ── LOJA ABERTA / FECHADA ─────────────────────────
  const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

  function agoraNaLoja() {
    try {
      const partes = new Intl.DateTimeFormat('en-US', { timeZone: LOJA.fuso, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
      const p = Object.fromEntries(partes.map(x => [x.type, x.value]));
      return { dia: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday), hora: Number(p.hour) % 24 };
    } catch {
      const d = new Date();
      return { dia: d.getDay(), hora: d.getHours() };
    }
  }

  function statusLoja() {
    const { dia, hora } = agoraNaLoja();
    const abreHoje = LOJA.diasAbertos.includes(dia);
    if (abreHoje && hora >= LOJA.abre && hora < LOJA.fecha) {
      return { aberto: true, texto: `Aberto agora · até ${LOJA.fecha}h` };
    }
    if (abreHoje && hora < LOJA.abre) return { aberto: false, texto: `Fechado · abre hoje às ${LOJA.abre}h` };
    for (let i = 1; i <= 7; i++) {
      const d = (dia + i) % 7;
      if (LOJA.diasAbertos.includes(d)) {
        const quando = i === 1 ? 'amanhã' : DIAS[d];
        return { aberto: false, texto: `Fechado · abre ${quando} às ${LOJA.abre}h` };
      }
    }
    return { aberto: false, texto: 'Fechado' };
  }

  function atualizarStatus() {
    if (!LOJA.diasAbertos) return;
    const s = statusLoja();
    const el = $('[data-status]');
    el.hidden = false;
    el.classList.toggle('aberto', s.aberto);
    $('[data-status-texto]', el).textContent = s.texto;
    const aviso = $('[data-aviso-fechado]');
    aviso.hidden = s.aberto;
    aviso.textContent = s.aberto ? '' : `Estamos fechados agora (${s.texto.replace('Fechado · ', '')}). Pode mandar o pedido que a gente responde assim que abrir.`;
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
  document.addEventListener('click', e => {
    if (links.classList.contains('aberto') && !e.target.closest('.nav')) fecharMenu();
  });

  // ── TOAST ─────────────────────────────────────────
  const toast = $('[data-toast]');
  let toastTimer;
  function mostrarToast(msg) {
    toast.textContent = msg;
    toast.classList.add('visivel');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visivel'), 2600);
  }

  // ── REVEAL ────────────────────────────────────────
  function observarReveal() {
    const els = $$('.reveal');
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
  renderCarrinho();
  atualizarTipo();
  atualizarStatus();
  setInterval(atualizarStatus, 60 * 1000);
  observarReveal();
})();
