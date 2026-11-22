(() => {
  'use strict';

  const CFG = window.SUPABASE_CONFIG || {};
  const LOJA = window.LOJA || {};
  const DOMINIO_EQUIPE = 'equipe.carneepao.app'; // usuário "ana" vira ana@equipe.carneepao.app
  const FUSO = 'America/Sao_Paulo';

  // ── UTILITÁRIOS ───────────────────────────────────
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtBRL = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const brl = v => 'R$ ' + fmtBRL.format(Number(v || 0));
  const numero = txt => {
    const t = String(txt || '').trim().replace(/[^\d,.]/g, '');
    const n = parseFloat(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
  };
  const hora = iso => new Date(iso).toLocaleTimeString('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' });
  const minutosDesde = iso => Math.floor((Date.now() - new Date(iso).getTime()) / 60000);

  // Data de hoje em São Paulo (AAAA-MM-DD)
  function dataSP(d = new Date()) {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(d).map(x => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day}`;
  }
  const somaDias = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const dataBR = iso => iso.split('-').reverse().join('/');

  const ERROS = {
    'Invalid login credentials': 'Usuário ou senha incorretos.',
    'Email not confirmed': 'Esta conta ainda não foi confirmada. Veja o passo a passo (desligar "Confirm email").',
    'User already registered': 'Já existe uma conta com esse usuário.',
    sem_permissao: 'Você não tem permissão para isso.',
    'duplicate key value violates unique constraint "produtos_pkey"': 'Já existe um item com esse código.',
  };
  const traduz = e => {
    const m = (e && (e.message || e.error_description)) || String(e);
    if (ERROS[m]) return ERROS[m];
    if (/Password should be at least/i.test(m)) return 'A senha precisa ter pelo menos 8 caracteres.';
    if (/rate limit/i.test(m)) return 'Muitas tentativas. Espere um pouco e tente de novo.';
    if (/Failed to fetch|NetworkError|network/i.test(m)) return 'Sem conexão com a internet.';
    return 'Algo deu errado: ' + m;
  };

  const toastEl = $('[data-toast]');
  let toastT;
  function toast(msg, erro = false) {
    toastEl.textContent = msg;
    toastEl.classList.toggle('erro-toast', erro);
    toastEl.classList.add('visivel');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('visivel'), erro ? 5000 : 2600);
  }

  function mostrarTela(nome) {
    $$('[data-tela]').forEach(t => { t.hidden = t.dataset.tela !== nome; });
  }

  // ── CONEXÃO ───────────────────────────────────────
  if (!CFG.url || !CFG.anonKey || !window.supabase) {
    mostrarTela('sem-config');
    return;
  }
  const sb = window.supabase.createClient(CFG.url, CFG.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'carne-e-pao-painel' },
  });

  let eu = null;           // { user_id, nome, login, papel }
  let canal = null;        // tempo real
  let iniciado = false;
  const ehDono = () => eu && eu.papel === 'dono';

  // ── LOGIN ─────────────────────────────────────────
  const formLogin = $('[data-form-login]');
  formLogin.addEventListener('submit', async e => {
    e.preventDefault();
    const erro = $('[data-erro-login]');
    erro.textContent = '';
    let login = formLogin.login.value.trim().toLowerCase();
    const senha = formLogin.senha.value;
    if (!login || !senha) { erro.textContent = 'Preencha usuário e senha.'; return; }
    if (!login.includes('@')) login = `${login}@${DOMINIO_EQUIPE}`;
    const btn = formLogin.querySelector('button');
    btn.disabled = true;
    const { error } = await sb.auth.signInWithPassword({ email: login, password: senha });
    btn.disabled = false;
    if (error) { erro.textContent = traduz(error); return; }
    formLogin.senha.value = '';
  });

  $$('[data-sair]').forEach(b => b.addEventListener('click', async () => {
    await sb.auth.signOut();
    location.reload();
  }));

  sb.auth.onAuthStateChange((evento, sessao) => {
    // roda fora do callback para não travar o cliente do Supabase
    setTimeout(() => aoMudarSessao(evento, sessao), 0);
  });

  async function aoMudarSessao(evento, sessao) {
    if (!sessao) {
      iniciado = false;
      if (canal) { sb.removeChannel(canal); canal = null; }
      mostrarTela('login');
      return;
    }
    if (iniciado) return;
    const { data, error } = await sb.from('equipe').select('user_id,nome,login,papel').eq('user_id', sessao.user.id).maybeSingle();
    if (error) { toast(traduz(error), true); mostrarTela('login'); return; }
    if (!data) { mostrarTela('sem-acesso'); return; }
    eu = data;
    iniciado = true;
    iniciarApp();
  }

  // ── APP ───────────────────────────────────────────
  function iniciarApp() {
    $('[data-meu-nome]').textContent = eu.nome;
    $('[data-meu-papel]').textContent = ehDono() ? 'Dono' : 'Funcionário';
    $('[data-meu-login]').textContent = eu.login.replace('@' + DOMINIO_EQUIPE, '');
    $$('[data-so-dono]').forEach(el => { el.hidden = !ehDono(); });
    $$('[data-so-funcionario]').forEach(el => { el.hidden = ehDono(); });
    $('[data-horario]').textContent = horarioTexto();
    mostrarTela('app');
    irPara(location.hash.slice(1) || 'pedidos');
    carregarPedidos();
    carregarLoja();
    ligarTempoReal();
    setInterval(() => { carregarPedidos(); carregarLoja(); }, 60 * 1000); // segurança caso o tempo real caia
    setInterval(atualizarTempos, 30 * 1000);
  }

  function horarioTexto() {
    if (!LOJA.diasAbertos) return 'horário do site';
    const nomes = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    return `${LOJA.diasAbertos.map(d => nomes[d]).join(', ')} · ${LOJA.abre}h às ${LOJA.fecha}h`;
  }

  // ── ABAS ──────────────────────────────────────────
  const carregadores = { cardapio: carregarProdutos, relatorios: () => carregarRelatorio(periodoAtual), equipe: carregarEquipe };
  function irPara(aba) {
    const btn = $(`[data-aba="${CSS.escape(aba)}"]`);
    if (!btn || btn.hidden) aba = 'pedidos';
    $$('[data-aba]').forEach(b => {
      if (b.dataset.aba === aba) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    $$('[data-secao]').forEach(s => { s.hidden = s.dataset.secao !== aba; });
    history.replaceState(null, '', '#' + aba);
    if (carregadores[aba]) carregadores[aba]();
    if (aba === 'pedidos') { novosNaoVistos = 0; atualizarContador(); }
  }
  $$('[data-aba]').forEach(b => b.addEventListener('click', () => irPara(b.dataset.aba)));
  $$('[data-ir]').forEach(b => b.addEventListener('click', () => irPara(b.dataset.ir)));

  // ── PEDIDOS ───────────────────────────────────────
  const STATUS = {
    recebido: { prox: 'preparando', acao: '🔥 Começar' },
    preparando: { prox: 'saiu', acao: p => (p.tipo === 'delivery' ? '🛵 Saiu p/ entrega' : '✅ Pronto p/ retirada') },
    saiu: { prox: 'entregue', acao: '✔️ Entregue' },
  };
  let pedidos = [];
  let idsConhecidos = null;
  let novosNaoVistos = 0;
  let somLigado = false;

  async function carregarPedidos() {
    const inicioHoje = `${dataSP()}T00:00:00-03:00`;
    const { data, error } = await sb.from('pedidos').select('*')
      .or(`criado_em.gte.${inicioHoje},status.in.(recebido,preparando,saiu)`)
      .order('id', { ascending: false }).limit(300);
    if (error) { $('[data-conexao]').classList.add('off'); return; }
    const novos = idsConhecidos ? data.filter(p => !idsConhecidos.has(p.id)) : [];
    idsConhecidos = new Set(data.map(p => p.id));
    pedidos = data;
    renderPedidos(new Set(novos.map(p => p.id)));
    if (novos.length) avisarNovos(novos.length);
  }

  function itemHTML(i) {
    const adds = (i.adds || []).map(esc).join(', ');
    const rems = (i.rems || []).map(esc).join(', ');
    return `<li><span class="qtd">${Number(i.qtd)}×</span> ${esc(i.nome)}
      ${adds || rems ? `<span class="det">${adds ? `+ ${adds}` : ''}${adds && rems ? ' · ' : ''}${rems ? `<span class="sem">sem ${rems}</span>` : ''}</span>` : ''}</li>`;
  }

  function pedidoHTML(p, novo) {
    const final = p.status === 'entregue' || p.status === 'cancelado';
    const min = minutosDesde(p.criado_em);
    const end = p.endereco || {};
    const st = STATUS[p.status];
    const acao = st ? (typeof st.acao === 'function' ? st.acao(p) : st.acao) : '';
    return `
      <article class="pedido${novo ? ' novo' : ''}${final ? ' final' : ''}${p.status === 'cancelado' ? ' cancelado' : ''}" data-pedido="${p.id}">
        <div class="pedido-topo">
          <span class="pedido-num">#${p.id}</span>
          <span class="pedido-hora">${hora(p.criado_em)}</span>
          ${final ? `<span class="pedido-tempo">${p.status === 'cancelado' ? 'Cancelado' : 'Entregue'}</span>`
                  : `<span class="pedido-tempo${min >= 40 ? ' atrasado' : ''}" data-tempo="${esc(p.criado_em)}">${min} min</span>`}
        </div>
        <div class="pedido-cliente">${esc(p.cliente_nome)}
          <span class="tag${p.tipo === 'retirada' ? ' tag--retirada' : ''}">${p.tipo === 'delivery' ? '🛵 Delivery' : '🏃 Retirada'}</span></div>
        <ul class="pedido-itens">${(p.itens || []).map(itemHTML).join('')}</ul>
        ${p.tipo === 'delivery' ? `<p class="pedido-info">📍 <strong>${esc(end.rua)}, ${esc(end.num)}</strong>${end.comp ? ` — ${esc(end.comp)}` : ''}<br>${esc(end.bairro)}${end.cep ? ` · CEP ${esc(end.cep)}` : ''}</p>` : ''}
        <p class="pedido-info">💳 ${esc(p.pagamento)}${p.troco ? ` · troco p/ ${brl(p.troco)}` : ''}</p>
        ${p.obs ? `<p class="pedido-obs">📝 ${esc(p.obs)}</p>` : ''}
        <div class="pedido-total"><span>Total</span><strong>${brl(p.subtotal)}</strong></div>
        <div class="pedido-acoes">
          ${st ? `<button type="button" class="btn btn--verde btn--avancar" data-status-para="${st.prox}">${acao}</button>` : ''}
          <button type="button" class="btn btn--pequeno" data-imprimir title="Imprimir comanda">🖨️</button>
          ${!final ? `<button type="button" class="btn btn--pequeno btn--perigo" data-status-para="cancelado">Cancelar</button>` : ''}
          ${final ? `<button type="button" class="btn btn--pequeno" data-status-para="recebido">Reabrir</button>` : ''}
        </div>
      </article>`;
  }

  function renderPedidos(novos = new Set()) {
    ['recebido', 'preparando', 'saiu'].forEach(st => {
      const col = $(`[data-coluna="${st}"]`);
      const lista = pedidos.filter(p => p.status === st).sort((a, b) => a.id - b.id);
      $('.lista', col).innerHTML = lista.length ? lista.map(p => pedidoHTML(p, novos.has(p.id))).join('') : '<p class="vazio">Nada por aqui</p>';
      $('[data-n]', col).textContent = lista.length || '';
    });
    const hoje = dataSP();
    const fins = pedidos.filter(p => (p.status === 'entregue' || p.status === 'cancelado') && dataSP(new Date(p.criado_em)) === hoje);
    $('[data-lista-finalizados]').innerHTML = fins.map(p => pedidoHTML(p, false)).join('') || '<p class="vazio">Nenhum ainda</p>';
    $('[data-n-finalizados]').textContent = fins.length ? `(${fins.length})` : '';
  }

  function atualizarTempos() {
    $$('[data-tempo]').forEach(el => {
      const m = minutosDesde(el.dataset.tempo);
      el.textContent = `${m} min`;
      el.classList.toggle('atrasado', m >= 40);
    });
  }

  $('[data-secao="pedidos"]').addEventListener('click', async e => {
    const card = e.target.closest('[data-pedido]');
    if (!card) return;
    const id = Number(card.dataset.pedido);
    const p = pedidos.find(x => x.id === id);
    if (e.target.closest('[data-imprimir]')) { imprimir(p); return; }
    const b = e.target.closest('[data-status-para]');
    if (!b) return;
    const novo = b.dataset.statusPara;
    if (novo === 'cancelado' && !confirm(`Cancelar o pedido #${id}?`)) return;
    b.disabled = true;
    const { error } = await sb.rpc('atualizar_status', { p_id: id, p_status: novo });
    if (error) { b.disabled = false; toast(traduz(error), true); return; }
    if (p) p.status = novo;
    renderPedidos();
  });

  function imprimir(p) {
    if (!p) return;
    const end = p.endereco || {};
    $('[data-impressao]').innerHTML = `
      <h1>CARNE &amp; PÃO — #${p.id}</h1>
      <p>${hora(p.criado_em)} · ${p.tipo === 'delivery' ? 'DELIVERY' : 'RETIRADA'}</p>
      <p><b>${esc(p.cliente_nome)}</b></p><hr>
      ${(p.itens || []).map(i => `<p><b>${Number(i.qtd)}x ${esc(i.nome)}</b></p>
        ${(i.adds || []).length ? `<p>  + ${i.adds.map(esc).join(', ')}</p>` : ''}
        ${(i.rems || []).length ? `<p>  SEM ${i.rems.map(esc).join(', ')}</p>` : ''}`).join('')}
      <hr>
      ${p.obs ? `<p>OBS: ${esc(p.obs)}</p><hr>` : ''}
      ${p.tipo === 'delivery' ? `<p>${esc(end.rua)}, ${esc(end.num)} ${esc(end.comp || '')}</p><p>${esc(end.bairro)} ${esc(end.cep || '')}</p><hr>` : ''}
      <p>${esc(p.pagamento)}${p.troco ? ` · troco p/ ${brl(p.troco)}` : ''}</p>
      <p><b>TOTAL ${brl(p.subtotal)}</b></p>`;
    window.print();
  }

  // ── TEMPO REAL + SOM ──────────────────────────────
  function ligarTempoReal() {
    canal = sb.channel('pedidos-painel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => carregarPedidos())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'loja' }, () => carregarLoja())
      .subscribe(status => {
        const el = $('[data-conexao]');
        const ok = status === 'SUBSCRIBED';
        el.classList.toggle('off', !ok);
        el.textContent = ok ? '● ao vivo' : '● reconectando…';
      });
  }

  let audio;
  const btnSom = $('[data-som]');
  btnSom.addEventListener('click', () => {
    somLigado = !somLigado;
    btnSom.textContent = somLigado ? '🔔 Som ligado' : '🔇 Ativar som';
    if (somLigado) {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      audio.resume();
      tocar();
      if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    }
  });
  function tocar() {
    if (!somLigado || !audio) return;
    [0, .18, .36].forEach((t, i) => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = 'square'; o.frequency.value = [880, 1175, 1568][i];
      g.gain.setValueAtTime(.0001, audio.currentTime + t);
      g.gain.exponentialRampToValueAtTime(.25, audio.currentTime + t + .02);
      g.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + t + .16);
      o.connect(g).connect(audio.destination);
      o.start(audio.currentTime + t); o.stop(audio.currentTime + t + .17);
    });
  }
  function avisarNovos(n) {
    tocar();
    if ($('[data-secao="pedidos"]').hidden || document.hidden) { novosNaoVistos += n; atualizarContador(); }
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Novo pedido! 🍔', { body: n === 1 ? 'Chegou 1 pedido novo.' : `Chegaram ${n} pedidos novos.`, icon: '../logo.png' });
    }
  }
  function atualizarContador() {
    const c = $('[data-contador-novos]');
    c.textContent = novosNaoVistos;
    c.hidden = !novosNaoVistos;
    document.title = (novosNaoVistos ? `(${novosNaoVistos}) ` : '') + 'Painel — Carne & Pão';
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !$('[data-secao="pedidos"]').hidden) { novosNaoVistos = 0; atualizarContador(); }
  });

  // ── LOJA ──────────────────────────────────────────
  const formLoja = $('[data-form-loja]');
  async function carregarLoja() {
    const { data } = await sb.from('loja').select('modo,aviso').eq('id', 1).maybeSingle();
    if (!data) return;
    if (!formLoja.contains(document.activeElement)) {
      formLoja.modo.value = data.modo;
      formLoja.aviso.value = data.aviso || '';
    }
    const pill = $('[data-loja-pill]');
    const aberta = data.modo === 'aberto' || (data.modo === 'auto' && abertaPeloHorario());
    pill.classList.toggle('aberta', aberta);
    pill.classList.toggle('fechada', !aberta);
    $('[data-loja-pill-texto]').textContent = (aberta ? 'Aberta' : 'Fechada') + (data.modo === 'auto' ? ' (auto)' : '');
  }
  function abertaPeloHorario() {
    if (!LOJA.diasAbertos) return true;
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: FUSO, weekday: 'short', hour: 'numeric', hourCycle: 'h23' })
      .formatToParts(new Date()).map(x => [x.type, x.value]));
    const dia = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
    const h = Number(p.hour) % 24;
    const vira = LOJA.fecha <= LOJA.abre;
    if (vira && h < LOJA.fecha) return LOJA.diasAbertos.includes((dia + 6) % 7);
    return LOJA.diasAbertos.includes(dia) && h >= LOJA.abre && (vira || h < LOJA.fecha);
  }
  formLoja.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = formLoja.querySelector('button[type=submit]');
    btn.disabled = true;
    const { error } = await sb.rpc('definir_modo_loja', { p_modo: formLoja.modo.value, p_aviso: formLoja.aviso.value });
    btn.disabled = false;
    if (error) { toast(traduz(error), true); return; }
    toast('Salvo! O site atualiza em até 2 minutos.');
    carregarLoja();
  });

  // ── CARDÁPIO ──────────────────────────────────────
  let produtos = [];
  const NOMES_CAT = { burger: 'Burgers', acomp: 'Acompanhamentos', bebida: 'Bebidas', sobremesa: 'Sobremesas' };

  async function carregarProdutos() {
    const { data, error } = await sb.from('produtos').select('*').order('ordem').order('nome');
    if (error) { toast(traduz(error), true); return; }
    produtos = data;
    $('[data-lista-produtos]').innerHTML = produtos.map(p => `
      <div class="produto${p.ativo ? '' : ' inativo'}" data-produto="${esc(p.id)}">
        <span class="produto-emoji" aria-hidden="true">${esc(p.emoji)}</span>
        <div class="produto-info">
          <div class="produto-nome">${esc(p.nome)}</div>
          <div class="produto-sub">${esc(NOMES_CAT[p.cat] || p.cat)}${p.ativo ? '' : ' · <strong>fora do site</strong>'}</div>
        </div>
        <span class="produto-preco">${brl(p.preco)}</span>
        <label class="interruptor"><input type="checkbox" data-esgotado ${p.esgotado ? 'checked' : ''}> Esgotado</label>
        ${ehDono() ? '<button type="button" class="btn btn--pequeno" data-editar>Editar</button>' : ''}
      </div>`).join('') || '<p class="vazio">Nenhum item ainda.</p>';
  }

  $('[data-lista-produtos]').addEventListener('change', async e => {
    const cb = e.target.closest('[data-esgotado]');
    if (!cb) return;
    const id = cb.closest('[data-produto]').dataset.produto;
    cb.disabled = true;
    const { error } = await sb.rpc('marcar_esgotado', { p_id: id, p_esgotado: cb.checked });
    cb.disabled = false;
    if (error) { cb.checked = !cb.checked; toast(traduz(error), true); return; }
    toast(cb.checked ? 'Marcado como esgotado.' : 'Voltou pro cardápio!');
  });
  $('[data-lista-produtos]').addEventListener('click', e => {
    const b = e.target.closest('[data-editar]');
    if (b) abrirEditor(produtos.find(p => p.id === b.closest('[data-produto]').dataset.produto));
  });
  $('[data-novo-produto]').addEventListener('click', () => abrirEditor(null));

  // Editor de item (só dono)
  const dlg = $('[data-dialogo-produto]');
  const fp = $('[data-form-produto]');
  let editando = null;

  function linhaAdicional(a = { nome: '', preco: '' }) {
    const d = document.createElement('div');
    d.className = 'sublinha';
    d.innerHTML = `<input data-nome type="text" maxlength="60" placeholder="Ex.: Bacon" aria-label="Nome do adicional" value="${esc(a.nome)}">
      <input data-preco type="text" inputmode="decimal" placeholder="2,50" aria-label="Preço do adicional" value="${a.preco === '' ? '' : esc(Number(a.preco).toFixed(2).replace('.', ','))}">
      <button type="button" class="btn btn--perigo" data-tirar aria-label="Remover">✕</button>`;
    $('[data-lista-adicionais]').appendChild(d);
    return d;
  }
  function linhaRemovivel(nome = '') {
    const d = document.createElement('div');
    d.className = 'sublinha';
    d.innerHTML = `<input data-nome type="text" maxlength="60" placeholder="Ex.: Cebola" aria-label="Ingrediente" value="${esc(nome)}">
      <button type="button" class="btn btn--perigo" data-tirar aria-label="Remover">✕</button>`;
    $('[data-lista-removiveis]').appendChild(d);
    return d;
  }
  $('[data-add-adicional]').addEventListener('click', () => $('input', linhaAdicional()).focus());
  $('[data-add-removivel]').addEventListener('click', () => $('input', linhaRemovivel()).focus());
  fp.addEventListener('click', e => { const t = e.target.closest('[data-tirar]'); if (t) t.closest('.sublinha').remove(); });
  $$('[data-fechar-dialogo]').forEach(b => b.addEventListener('click', () => dlg.close()));

  function abrirEditor(p) {
    editando = p;
    fp.reset();
    $('[data-erro-produto]').textContent = '';
    $('[data-lista-adicionais]').innerHTML = '';
    $('[data-lista-removiveis]').innerHTML = '';
    $('[data-titulo-produto]').textContent = p ? 'Editar item' : 'Novo item';
    $('[data-apagar-produto]').hidden = !p;
    fp.nome.value = p ? p.nome : '';
    fp.emoji.value = p ? p.emoji : '🍔';
    fp.preco.value = p ? Number(p.preco).toFixed(2).replace('.', ',') : '';
    fp.cat.value = p ? p.cat : 'burger';
    fp.ordem.value = p ? p.ordem : (Math.max(0, ...produtos.map(x => x.ordem)) + 1);
    fp.descricao.value = p ? p.descricao : '';
    fp.tag.value = p ? (p.tag || '') : '';
    fp.ativo.checked = p ? p.ativo : true;
    (p ? p.adicionais : []).forEach(a => linhaAdicional(a));
    (p ? p.removiveis : []).forEach(r => linhaRemovivel(r));
    dlg.showModal();
    fp.nome.focus();
  }

  const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'item';

  fp.addEventListener('submit', async e => {
    e.preventDefault();
    const erro = $('[data-erro-produto]');
    erro.textContent = '';
    const preco = numero(fp.preco.value);
    const adicionais = $$('[data-lista-adicionais] .sublinha')
      .filter(l => $('[data-nome]', l).value.trim() || $('[data-preco]', l).value.trim()) // ignora linhas vazias
      .map(l => ({ nome: $('[data-nome]', l).value.trim(), preco: numero($('[data-preco]', l).value) }));
    const removiveis = $$('[data-lista-removiveis] [data-nome]').map(i => i.value.trim()).filter(Boolean);

    if (!fp.nome.value.trim()) { erro.textContent = 'Dê um nome ao item.'; fp.nome.focus(); return; }
    if (!(preco >= 0)) { erro.textContent = 'Preço inválido. Use por exemplo 28,00.'; fp.preco.focus(); return; }
    if (adicionais.some(a => !a.nome || !(a.preco >= 0))) { erro.textContent = 'Confira os adicionais: cada um precisa de nome e preço.'; return; }

    const dados = {
      nome: fp.nome.value.trim(), emoji: fp.emoji.value.trim() || '🍔', preco, cat: fp.cat.value,
      ordem: parseInt(fp.ordem.value, 10) || 0, descricao: fp.descricao.value.trim(),
      tag: fp.tag.value.trim() || null, ativo: fp.ativo.checked, adicionais, removiveis,
      atualizado_em: new Date().toISOString(),
    };
    const btn = fp.querySelector('[type=submit]');
    btn.disabled = true;
    let res;
    if (editando) {
      res = await sb.from('produtos').update(dados).eq('id', editando.id).select();
    } else {
      let id = slug(dados.nome);
      if (produtos.some(p => p.id === id)) id = `${id.slice(0, 35)}-${Date.now().toString(36).slice(-4)}`;
      res = await sb.from('produtos').insert({ id, ...dados }).select();
    }
    btn.disabled = false;
    if (res.error) { erro.textContent = traduz(res.error); return; }
    if (!res.data || !res.data.length) { erro.textContent = traduz({ message: 'sem_permissao' }); return; }
    dlg.close();
    toast('Cardápio salvo! O site atualiza em até 2 minutos.');
    carregarProdutos();
  });

  $('[data-apagar-produto]').addEventListener('click', async () => {
    if (!editando) return;
    if (!confirm(`Apagar "${editando.nome}" do cardápio?\n\nDica: para só esconder do site, desmarque "Mostrar no site".`)) return;
    const { error } = await sb.from('produtos').delete().eq('id', editando.id);
    if (error) { $('[data-erro-produto]').textContent = traduz(error); return; }
    dlg.close();
    toast('Item apagado.');
    carregarProdutos();
  });

  // ── RELATÓRIOS ────────────────────────────────────
  let periodoAtual = 'hoje';
  function intervalo(periodo) {
    const hoje = dataSP();
    const [a, m] = hoje.split('-');
    switch (periodo) {
      case 'ontem': return [somaDias(hoje, -1), somaDias(hoje, -1)];
      case '7': return [somaDias(hoje, -6), hoje];
      case '30': return [somaDias(hoje, -29), hoje];
      case 'mes': return [`${a}-${m}-01`, hoje];
      case 'mes-passado': {
        const ini = somaDias(`${a}-${m}-01`, -1).slice(0, 8) + '01';
        return [ini, somaDias(`${a}-${m}-01`, -1)];
      }
      case 'custom': {
        const de = $('[data-de]').value, ate = $('[data-ate]').value;
        return de && ate ? [de, ate] : null;
      }
      default: return [hoje, hoje];
    }
  }
  $('[data-periodos]').addEventListener('click', e => {
    const b = e.target.closest('[data-periodo]');
    if (!b) return;
    periodoAtual = b.dataset.periodo;
    $$('[data-periodos] > button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    carregarRelatorio(periodoAtual);
  });

  async function carregarRelatorio(periodo) {
    if (!ehDono()) return;
    const iv = intervalo(periodo);
    const alvo = $('[data-relatorio]');
    if (!iv) { alvo.innerHTML = '<p class="dica">Escolha as duas datas.</p>'; return; }
    alvo.innerHTML = '<p class="dica">Carregando…</p>';
    const { data: r, error } = await sb.rpc('relatorio', { p_inicio: iv[0], p_fim: iv[1] });
    if (error) { alvo.innerHTML = `<p class="erro">${esc(traduz(error))}</p>`; return; }

    // completa os dias sem venda para o gráfico
    const porDia = new Map((r.por_dia || []).map(d => [d.dia, d]));
    const dias = [];
    for (let d = iv[0]; d <= iv[1]; d = somaDias(d, 1)) dias.push({ dia: d, total: Number(porDia.get(d)?.total || 0), pedidos: porDia.get(d)?.pedidos || 0 });
    const maxDia = Math.max(1, ...dias.map(d => d.total));
    const top = r.top_produtos || [];
    const maxTop = Math.max(1, ...top.map(t => Number(t.qtd)));
    const pag = Object.entries(r.por_pagamento || {});
    const rotulo = iv[0] === iv[1] ? dataBR(iv[0]) : `${dataBR(iv[0])} a ${dataBR(iv[1])}`;

    alvo.innerHTML = `
      <p class="dica" style="margin-bottom:.8rem">${esc(rotulo)} · pedidos cancelados não entram nas contas</p>
      <div class="kpis">
        <div class="kpi"><div class="kpi-rotulo">Faturamento</div><div class="kpi-valor">${brl(r.faturamento)}</div><div class="kpi-sub">sem taxa de entrega</div></div>
        <div class="kpi"><div class="kpi-rotulo">Pedidos</div><div class="kpi-valor">${r.pedidos}</div><div class="kpi-sub">🛵 ${r.delivery} · 🏃 ${r.retirada}</div></div>
        <div class="kpi"><div class="kpi-rotulo">Ticket médio</div><div class="kpi-valor">${brl(r.ticket_medio)}</div><div class="kpi-sub">por pedido</div></div>
        <div class="kpi"><div class="kpi-rotulo">Cancelados</div><div class="kpi-valor">${r.cancelados}</div><div class="kpi-sub">no período</div></div>
      </div>
      <div class="graficos">
        <div class="cartao">
          <h3>Vendas por dia</h3>
          ${dias.length > 1 ? `
            <div class="barras">${dias.map(d => `<div class="barra-dia" style="height:${Math.max(d.total ? 3 : 0, d.total / maxDia * 100)}%" data-rotulo="${dataBR(d.dia).slice(0, 5)}: ${brl(d.total)} (${d.pedidos})"></div>`).join('')}</div>
            <div class="barras-eixo"><span>${dataBR(dias[0].dia).slice(0, 5)}</span><span>${dataBR(dias[dias.length - 1].dia).slice(0, 5)}</span></div>`
            : `<p class="dica">Escolha um período com mais de um dia para ver o gráfico.</p>`}
          ${pag.length ? `<table class="mini-tabela"><tbody>${pag.map(([k, v]) => `<tr><td>💳 ${esc(k)}</td><td>${v} pedido${v > 1 ? 's' : ''}</td></tr>`).join('')}</tbody></table>` : ''}
        </div>
        <div class="cartao">
          <h3>Mais vendidos</h3>
          ${top.length ? `<ol class="ranking">${top.map((t, i) => `
            <li><span class="pos">${i + 1}º</span><span>${esc(t.nome)}</span><span class="num">${t.qtd} un · ${brl(t.total)}</span>
              <span class="trilho"><span style="width:${Number(t.qtd) / maxTop * 100}%"></span></span></li>`).join('')}</ol>`
            : '<p class="dica">Sem vendas no período.</p>'}
        </div>
      </div>`;
  }

  // ── EQUIPE ────────────────────────────────────────
  async function carregarEquipe() {
    if (!ehDono()) return;
    const { data, error } = await sb.from('equipe').select('*').order('papel').order('nome');
    if (error) { toast(traduz(error), true); return; }
    $('[data-lista-equipe]').innerHTML = data.map(m => `
      <li data-membro="${esc(m.user_id)}">
        <span class="quem"><strong>${esc(m.nome)}</strong><small>${esc(m.login.replace('@' + DOMINIO_EQUIPE, ''))}</small></span>
        <span class="tag${m.papel === 'dono' ? '' : ' tag--retirada'}">${m.papel === 'dono' ? 'Dono' : 'Funcionário'}</span>
        ${m.papel !== 'dono' ? '<button type="button" class="btn btn--pequeno btn--perigo" data-remover-membro>Remover</button>' : ''}
      </li>`).join('');
  }

  $('[data-lista-equipe]').addEventListener('click', async e => {
    const b = e.target.closest('[data-remover-membro]');
    if (!b) return;
    const li = b.closest('[data-membro]');
    const nome = $('strong', li).textContent;
    if (!confirm(`Tirar o acesso de ${nome} ao painel?`)) return;
    const { error } = await sb.from('equipe').delete().eq('user_id', li.dataset.membro);
    if (error) { toast(traduz(error), true); return; }
    toast(`${nome} não tem mais acesso.`);
    carregarEquipe();
  });

  const formMembro = $('[data-form-membro]');
  formMembro.addEventListener('submit', async e => {
    e.preventDefault();
    const erro = $('[data-erro-membro]');
    erro.textContent = '';
    const nome = formMembro.nome.value.trim();
    const usuario = formMembro.usuario.value.trim().toLowerCase();
    const senha = formMembro.senha.value;
    if (!nome) { erro.textContent = 'Preencha o nome.'; return; }
    if (!/^[a-z0-9._-]{3,30}$/.test(usuario)) { erro.textContent = 'Usuário: 3 a 30 letras minúsculas, números, ponto ou traço. Sem espaço nem acento.'; return; }
    if (senha.length < 8) { erro.textContent = 'A senha precisa ter pelo menos 8 caracteres.'; return; }

    const btn = formMembro.querySelector('[type=submit]');
    btn.disabled = true;
    try {
      // Cliente separado: criar a conta não pode deslogar o dono
      const temp = window.supabase.createClient(CFG.url, CFG.anonKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'carne-e-pao-criar-membro' },
      });
      const email = `${usuario}@${DOMINIO_EQUIPE}`;
      const { data, error } = await temp.auth.signUp({ email, password: senha });
      if (error) throw error;
      if (!data.user || (data.user.identities && data.user.identities.length === 0)) throw new Error('User already registered');
      if (!data.session) throw new Error('Email not confirmed');
      await temp.auth.signOut().catch(() => {});
      const r = await sb.rpc('adicionar_membro', { p_user_id: data.user.id, p_nome: nome, p_login: email });
      if (r.error) throw r.error;
      formMembro.reset();
      toast(`Pronto! ${nome} entra com o usuário "${usuario}".`);
      carregarEquipe();
    } catch (err) {
      erro.textContent = traduz(err);
    } finally {
      btn.disabled = false;
    }
  });

  // ── CONTA ─────────────────────────────────────────
  const formSenha = $('[data-form-senha]');
  formSenha.addEventListener('submit', async e => {
    e.preventDefault();
    const erro = $('[data-erro-senha]');
    erro.textContent = '';
    if (formSenha.senha.value.length < 8) { erro.textContent = 'A senha precisa ter pelo menos 8 caracteres.'; return; }
    if (formSenha.senha.value !== formSenha.senha2.value) { erro.textContent = 'As duas senhas não são iguais.'; return; }
    const { error } = await sb.auth.updateUser({ password: formSenha.senha.value });
    if (error) { erro.textContent = traduz(error); return; }
    formSenha.reset();
    toast('Senha trocada!');
  });

  // ── INÍCIO ────────────────────────────────────────
  sb.auth.getSession().then(({ data }) => { if (!data.session) mostrarTela('login'); });
})();
