-- ============================================================================
-- Carne & Pão — banco de dados do site e do painel
-- Cole este arquivo inteiro no Supabase: SQL Editor → New query → Run.
-- Pode rodar de novo sem perder dados (só recria funções e regras).
-- ============================================================================

-- ── TABELAS ─────────────────────────────────────────────────────────────────

-- Quem trabalha na loja. Só quem está aqui entra no painel.
create table if not exists public.equipe (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  nome      text not null check (char_length(nome) between 1 and 60),
  login     text not null check (char_length(login) between 1 and 120),
  papel     text not null check (papel in ('dono', 'funcionario')),
  criado_em timestamptz not null default now()
);
-- Quem sai da equipe fica desativado (não apagado), para poder ser reativado depois
alter table public.equipe add column if not exists ativo boolean not null default true;

-- Cardápio
create table if not exists public.produtos (
  id            text primary key check (id ~ '^[a-z0-9-]{1,40}$'),
  cat           text not null default 'burger' check (cat in ('burger', 'acomp', 'bebida', 'sobremesa')),
  emoji         text not null default '🍔' check (char_length(emoji) <= 8),
  nome          text not null check (char_length(nome) between 1 and 60),
  descricao     text not null default '' check (char_length(descricao) <= 300),
  preco         numeric(10,2) not null check (preco >= 0 and preco < 10000),
  tag           text check (char_length(tag) <= 30),
  -- [{"nome": "Bacon", "preco": 2.5}, ...]
  adicionais    jsonb not null default '[]' check (jsonb_typeof(adicionais) = 'array'),
  -- ["Alface", "Tomate", ...]
  removiveis    jsonb not null default '[]' check (jsonb_typeof(removiveis) = 'array'),
  ativo         boolean not null default true,   -- aparece no site
  esgotado      boolean not null default false,  -- aparece, mas não dá pra pedir
  ordem         int not null default 0,
  atualizado_em timestamptz not null default now()
);

-- Configuração da loja (uma linha só)
create table if not exists public.loja (
  id     int primary key default 1 check (id = 1),
  -- auto = segue o horário; aberto/fechado = forçado pelo painel
  modo   text not null default 'auto' check (modo in ('auto', 'aberto', 'fechado')),
  aviso  text check (char_length(aviso) <= 200),
  atualizado_em timestamptz not null default now()
);
insert into public.loja (id) values (1) on conflict do nothing;

-- Pedidos feitos pelo site
create table if not exists public.pedidos (
  id            bigint generated always as identity primary key,
  criado_em     timestamptz not null default now(),
  status        text not null default 'recebido'
                check (status in ('recebido', 'preparando', 'saiu', 'entregue', 'cancelado')),
  cliente_nome  text not null,
  tipo          text not null check (tipo in ('delivery', 'retirada')),
  endereco      jsonb,
  pagamento     text not null,
  troco         numeric(10,2),
  obs           text,
  -- foto do pedido no momento da compra (nomes e preços da época)
  itens         jsonb not null,
  subtotal      numeric(10,2) not null,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references auth.users(id) on delete set null
);
create index if not exists pedidos_criado_em_idx on public.pedidos (criado_em desc);
create index if not exists pedidos_status_idx on public.pedidos (status);

-- Controle contra pedidos falsos em massa (ninguém acessa direto, só a função criar_pedido)
create table if not exists public.pedidos_limite (
  ip text not null,
  em timestamptz not null default now()
);
create index if not exists pedidos_limite_idx on public.pedidos_limite (ip, em);
alter table public.pedidos_limite enable row level security;

-- ── FUNÇÕES DE APOIO ────────────────────────────────────────────────────────

-- Papel de quem está logado: 'dono', 'funcionario' ou null
create or replace function public.meu_papel()
returns text language sql stable security definer set search_path = public as $$
  select papel from public.equipe where user_id = auth.uid() and ativo
$$;

create or replace function public.e_dono()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.meu_papel() = 'dono', false)
$$;

create or replace function public.e_equipe()
returns boolean language sql stable security definer set search_path = public as $$
  select public.meu_papel() is not null
$$;

-- ── REGRAS DE ACESSO (RLS) ──────────────────────────────────────────────────

alter table public.equipe   enable row level security;
alter table public.produtos enable row level security;
alter table public.loja     enable row level security;
alter table public.pedidos  enable row level security;

-- equipe: cada um vê a si mesmo; o dono vê e gerencia todos
drop policy if exists equipe_ver on public.equipe;
create policy equipe_ver on public.equipe for select to authenticated
  using (user_id = auth.uid() or public.e_dono());
drop policy if exists equipe_dono_incluir on public.equipe;
create policy equipe_dono_incluir on public.equipe for insert to authenticated
  with check (public.e_dono() and papel = 'funcionario');
-- remover/reativar só pelas funções remover_membro e reativar_membro
drop policy if exists equipe_dono_remover on public.equipe;

-- produtos: todo mundo vê os ativos; equipe vê todos; só o dono edita
drop policy if exists produtos_ver on public.produtos;
create policy produtos_ver on public.produtos for select to anon, authenticated
  using (ativo or public.e_equipe());
drop policy if exists produtos_dono_incluir on public.produtos;
create policy produtos_dono_incluir on public.produtos for insert to authenticated
  with check (public.e_dono());
drop policy if exists produtos_dono_editar on public.produtos;
create policy produtos_dono_editar on public.produtos for update to authenticated
  using (public.e_dono()) with check (public.e_dono());
drop policy if exists produtos_dono_apagar on public.produtos;
create policy produtos_dono_apagar on public.produtos for delete to authenticated
  using (public.e_dono());

-- loja: todo mundo lê; mudanças só pela função definir_modo_loja
drop policy if exists loja_ver on public.loja;
create policy loja_ver on public.loja for select to anon, authenticated using (true);

-- pedidos: só a equipe vê; criação e mudança de status só pelas funções
drop policy if exists pedidos_ver on public.pedidos;
create policy pedidos_ver on public.pedidos for select to authenticated
  using (public.e_equipe());

-- Permissões de tabela (o RLS acima filtra as linhas)
revoke all on public.equipe, public.produtos, public.loja, public.pedidos, public.pedidos_limite from anon, authenticated;
grant select on public.produtos, public.loja to anon;
grant select on public.equipe, public.produtos, public.loja, public.pedidos to authenticated;
grant insert on public.equipe to authenticated;
grant insert, update, delete on public.produtos to authenticated;

-- ── AÇÕES DO SITE E DO PAINEL ───────────────────────────────────────────────

-- Cliente envia o pedido. O preço é recalculado aqui, com os valores do banco,
-- então ninguém consegue mudar o total mexendo no navegador.
-- Entrada: {"cliente": {...}, "itens": [{"id": "classico", "qtd": 2, "adds": [0], "rems": [1]}]}
create or replace function public.criar_pedido(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_cliente  jsonb := coalesce(p->'cliente', '{}'::jsonb);
  v_itens    jsonb := p->'itens';
  v_item     jsonb;
  v_prod     public.produtos;
  v_qtd      int;
  v_idx      jsonb;
  v_i        int;
  v_unit     numeric(10,2);
  v_adds     jsonb;
  v_rems     jsonb;
  v_saida    jsonb := '[]'::jsonb;
  v_subtotal numeric(10,2) := 0;
  v_tipo     text := v_cliente->>'tipo';
  v_nome     text := left(btrim(coalesce(v_cliente->>'nome', '')), 60);
  v_pagto    text := v_cliente->>'pagamento';
  v_endereco jsonb;
  v_troco    numeric(10,2);
  v_id       bigint;
  v_modo     text;
  v_ip       text;
  v_headers  json;
begin
  -- Limite: no máximo 6 pedidos a cada 10 min do mesmo endereço de internet,
  -- e 40 pedidos novos (não atendidos) a cada 10 min no total.
  -- Se passar, o site manda o pedido só pelo WhatsApp, sem salvar no painel.
  begin
    v_headers := nullif(current_setting('request.headers', true), '')::json;
  exception when others then v_headers := null;
  end;
  v_ip := coalesce(v_headers->>'cf-connecting-ip',
                   nullif(btrim(split_part(coalesce(v_headers->>'x-forwarded-for', ''), ',', 1)), ''),
                   'desconhecido');
  if (select count(*) from public.pedidos_limite where ip = v_ip and em > now() - interval '10 minutes') >= 6
     or (select count(*) from public.pedidos where status = 'recebido' and criado_em > now() - interval '10 minutes') >= 40 then
    raise exception 'muitos_pedidos';
  end if;
  insert into public.pedidos_limite (ip) values (v_ip);
  delete from public.pedidos_limite where em < now() - interval '1 day';

  select modo into v_modo from public.loja where id = 1;
  if v_modo = 'fechado' then
    raise exception 'loja_fechada' using hint = 'A loja está fechada agora.';
  end if;

  if coalesce(jsonb_typeof(v_itens), '') <> 'array' then raise exception 'itens_invalidos'; end if;
  if jsonb_array_length(v_itens) not between 1 and 30 then raise exception 'itens_invalidos'; end if;
  if v_nome = '' then raise exception 'nome_obrigatorio'; end if;
  if coalesce(v_tipo, '') not in ('delivery', 'retirada') then raise exception 'tipo_invalido'; end if;
  if coalesce(v_pagto, '') not in ('Pix', 'Cartão (crédito/débito)', 'Dinheiro') then raise exception 'pagamento_invalido'; end if;

  if v_tipo = 'delivery' then
    v_endereco := jsonb_build_object(
      'rua',    left(btrim(coalesce(v_cliente#>>'{endereco,rua}', '')), 120),
      'num',    left(btrim(coalesce(v_cliente#>>'{endereco,num}', '')), 20),
      'comp',   left(btrim(coalesce(v_cliente#>>'{endereco,comp}', '')), 60),
      'bairro', left(btrim(coalesce(v_cliente#>>'{endereco,bairro}', '')), 60),
      'cep',    left(regexp_replace(coalesce(v_cliente#>>'{endereco,cep}', ''), '[^0-9-]', '', 'g'), 9)
    );
    if v_endereco->>'rua' = '' or v_endereco->>'num' = '' or v_endereco->>'bairro' = '' then
      raise exception 'endereco_incompleto';
    end if;
  end if;

  if v_pagto = 'Dinheiro' and coalesce(v_cliente->>'troco', '') ~ '^\d{1,5}(\.\d{1,2})?$' then
    v_troco := (v_cliente->>'troco')::numeric;
  end if;

  for v_item in select * from jsonb_array_elements(v_itens) loop
    select * into v_prod from public.produtos where id = v_item->>'id' and ativo;
    if not found then raise exception 'produto_indisponivel' using detail = coalesce(v_item->>'id', ''); end if;
    if v_prod.esgotado then raise exception 'produto_esgotado' using detail = v_prod.nome; end if;

    if coalesce(jsonb_typeof(v_item->'qtd'), '') <> 'number' then raise exception 'quantidade_invalida'; end if;
    v_qtd := (v_item->>'qtd')::numeric::int;
    if v_qtd not between 1 and 99 or (v_item->>'qtd')::numeric <> v_qtd then raise exception 'quantidade_invalida'; end if;

    v_unit := v_prod.preco;
    v_adds := '[]'::jsonb;
    v_rems := '[]'::jsonb;

    for v_idx in select distinct value from jsonb_array_elements(coalesce(v_item->'adds', '[]')) loop
      if jsonb_typeof(v_idx) <> 'number' then raise exception 'adicional_invalido'; end if;
      v_i := (v_idx #>> '{}')::int;
      if v_i < 0 or v_i >= jsonb_array_length(v_prod.adicionais) then raise exception 'adicional_invalido'; end if;
      v_unit := v_unit + (v_prod.adicionais->v_i->>'preco')::numeric;
      v_adds := v_adds || to_jsonb(v_prod.adicionais->v_i->>'nome');
    end loop;

    for v_idx in select distinct value from jsonb_array_elements(coalesce(v_item->'rems', '[]')) loop
      if jsonb_typeof(v_idx) <> 'number' then raise exception 'remocao_invalida'; end if;
      v_i := (v_idx #>> '{}')::int;
      if v_i < 0 or v_i >= jsonb_array_length(v_prod.removiveis) then raise exception 'remocao_invalida'; end if;
      v_rems := v_rems || (v_prod.removiveis->v_i);
    end loop;

    v_subtotal := v_subtotal + v_unit * v_qtd;
    v_saida := v_saida || jsonb_build_object(
      'id', v_prod.id, 'nome', v_prod.nome, 'emoji', v_prod.emoji, 'qtd', v_qtd,
      'adds', v_adds, 'rems', v_rems, 'unit', v_unit, 'total', v_unit * v_qtd
    );
  end loop;

  insert into public.pedidos (cliente_nome, tipo, endereco, pagamento, troco, obs, itens, subtotal)
  values (v_nome, v_tipo, v_endereco, v_pagto, v_troco,
          nullif(left(btrim(coalesce(v_cliente->>'obs', '')), 300), ''),
          v_saida, v_subtotal)
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'subtotal', v_subtotal, 'itens', v_saida);
end $$;

-- Equipe muda o status do pedido
create or replace function public.atualizar_status(p_id bigint, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.e_equipe() then raise exception 'sem_permissao'; end if;
  if coalesce(p_status, '') not in ('recebido', 'preparando', 'saiu', 'entregue', 'cancelado') then
    raise exception 'status_invalido';
  end if;
  update public.pedidos set status = p_status, atualizado_em = now(), atualizado_por = auth.uid()
  where id = p_id;
  if not found then raise exception 'pedido_nao_encontrado'; end if;
end $$;

-- Equipe marca/desmarca lanche esgotado
create or replace function public.marcar_esgotado(p_id text, p_esgotado boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.e_equipe() then raise exception 'sem_permissao'; end if;
  update public.produtos set esgotado = coalesce(p_esgotado, false), atualizado_em = now() where id = p_id;
  if not found then raise exception 'produto_nao_encontrado'; end if;
end $$;

-- Equipe abre/fecha a loja (ou volta para o horário automático)
create or replace function public.definir_modo_loja(p_modo text, p_aviso text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.e_equipe() then raise exception 'sem_permissao'; end if;
  if coalesce(p_modo, '') not in ('auto', 'aberto', 'fechado') then raise exception 'modo_invalido'; end if;
  update public.loja set modo = p_modo, aviso = nullif(left(btrim(coalesce(p_aviso, '')), 200), ''),
    atualizado_em = now() where id = 1;
end $$;

-- Relatório de vendas (só dono). Datas no fuso de São Paulo.
create or replace function public.relatorio(p_inicio date, p_fim date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_ini timestamptz := (p_inicio::timestamp at time zone 'America/Sao_Paulo');
  v_fim timestamptz := ((p_fim + 1)::timestamp at time zone 'America/Sao_Paulo');
  v jsonb;
begin
  if not public.e_dono() then raise exception 'sem_permissao'; end if;
  if p_fim < p_inicio or p_fim - p_inicio > 366 then raise exception 'periodo_invalido'; end if;

  with ped as (
    select * from public.pedidos where criado_em >= v_ini and criado_em < v_fim
  ), validos as (
    select * from ped where status <> 'cancelado'
  ), itens as (
    select i->>'nome' as nome, (i->>'qtd')::int as qtd, (i->>'total')::numeric as total
    from validos, jsonb_array_elements(itens) i
  )
  select jsonb_build_object(
    'faturamento', coalesce((select sum(subtotal) from validos), 0),
    'pedidos',     (select count(*) from validos),
    'cancelados',  (select count(*) from ped where status = 'cancelado'),
    'ticket_medio', coalesce((select round(avg(subtotal), 2) from validos), 0),
    'delivery',    (select count(*) from validos where tipo = 'delivery'),
    'retirada',    (select count(*) from validos where tipo = 'retirada'),
    'por_pagamento', coalesce((select jsonb_object_agg(pagamento, n) from
                      (select pagamento, count(*) n from validos group by 1) x), '{}'),
    'top_produtos', coalesce((select jsonb_agg(x order by x.qtd desc, x.total desc) from
                      (select nome, sum(qtd) qtd, sum(total) total from itens group by nome
                       order by sum(qtd) desc, sum(total) desc limit 10) x), '[]'),
    'por_dia',     coalesce((select jsonb_agg(x order by x.dia) from
                      (select (criado_em at time zone 'America/Sao_Paulo')::date dia,
                              count(*) pedidos, sum(subtotal) total
                       from validos group by 1) x), '[]')
  ) into v;
  return v;
end $$;

-- Dono adiciona alguém da equipe (a conta de login é criada antes, pelo painel)
create or replace function public.adicionar_membro(p_user_id uuid, p_nome text, p_login text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.e_dono() then raise exception 'sem_permissao'; end if;
  insert into public.equipe (user_id, nome, login, papel)
  values (p_user_id, left(btrim(p_nome), 60), left(btrim(p_login), 120), 'funcionario');
end $$;

-- Dono tira o acesso de um funcionário (a conta fica desativada, pode ser reativada)
create or replace function public.remover_membro(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.e_dono() then raise exception 'sem_permissao'; end if;
  update public.equipe set ativo = false where user_id = p_user_id and papel = 'funcionario';
  if not found then raise exception 'membro_nao_encontrado'; end if;
end $$;

-- Dono devolve o acesso a quem já foi da equipe
create or replace function public.reativar_membro(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.e_dono() then raise exception 'sem_permissao'; end if;
  update public.equipe set ativo = true where user_id = p_user_id and papel = 'funcionario';
  if not found then raise exception 'membro_nao_encontrado'; end if;
end $$;

-- Usado só uma vez, no SQL Editor, para cadastrar o dono:
--   select public.tornar_dono('seu-email@exemplo.com', 'Seu nome');
create or replace function public.tornar_dono(p_email text, p_nome text)
returns text language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select id into v_id from auth.users where lower(email) = lower(btrim(p_email));
  if v_id is null then raise exception 'Conta % não encontrada. Crie em Authentication → Users primeiro.', p_email; end if;
  insert into public.equipe (user_id, nome, login, papel) values (v_id, p_nome, lower(btrim(p_email)), 'dono')
  on conflict (user_id) do update set papel = 'dono', nome = excluded.nome;
  return 'Pronto! ' || p_nome || ' agora é dono(a).';
end $$;

-- Quem pode chamar cada função
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.criar_pedido(jsonb) to anon, authenticated;
grant execute on function public.meu_papel(), public.e_dono(), public.e_equipe() to anon, authenticated;
grant execute on function public.atualizar_status(bigint, text) to authenticated;
grant execute on function public.marcar_esgotado(text, boolean) to authenticated;
grant execute on function public.definir_modo_loja(text, text) to authenticated;
grant execute on function public.relatorio(date, date) to authenticated;
grant execute on function public.adicionar_membro(uuid, text, text) to authenticated;
grant execute on function public.remover_membro(uuid) to authenticated;
grant execute on function public.reativar_membro(uuid) to authenticated;
-- tornar_dono fica sem permissão de propósito: só roda pelo SQL Editor.

-- Pedidos novos aparecem no painel na hora (tempo real)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and tablename = 'pedidos') then
    alter publication supabase_realtime add table public.pedidos;
  end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and tablename = 'loja') then
    alter publication supabase_realtime add table public.loja;
  end if;
end $$;

-- ── CARDÁPIO INICIAL (só entra se a tabela estiver vazia) ───────────────────
insert into public.produtos (id, cat, emoji, nome, descricao, preco, tag, adicionais, removiveis, ordem)
select * from (values
  ('classico', 'burger', '🔥', 'O Clássico',
   'Smash duplo, queijo americano derretido, alface crocante, tomate, picles e molho da casa.', 28.00, 'Mais pedido',
   '[{"nome":"Bacon crocante","preco":2.5},{"nome":"Queijo extra","preco":2},{"nome":"Carne extra","preco":5}]'::jsonb,
   '["Alface","Tomate","Picles"]'::jsonb, 1),
  ('cheesemaster', 'burger', '🧀', 'O Cheesemaster',
   'Smash duplo, quatro fatias de queijo americano, cebola caramelizada e maionese defumada.', 34.00, 'Queijeiro',
   '[{"nome":"Bacon crocante","preco":2.5},{"nome":"Queijo extra","preco":2},{"nome":"Carne extra","preco":5}]'::jsonb,
   '["Cebola caramelizada","Maionese defumada"]'::jsonb, 2),
  ('atrevido', 'burger', '🌶️', 'O Atrevido',
   'Smash duplo, jalapeños frescos, queijo pepper jack, cebola roxa e molho sriracha.', 32.00, 'Apimentado',
   '[{"nome":"Bacon crocante","preco":2.5},{"nome":"Queijo extra","preco":2},{"nome":"Carne extra","preco":5},{"nome":"Alface e tomate","preco":2.5}]'::jsonb,
   '["Jalapeños","Cebola roxa","Sriracha"]'::jsonb, 3),
  ('porco-rico', 'burger', '🥓', 'O Porco Rico',
   'Smash simples, bacon crocante em dobro, queijo cheddar, alface e molho barbecue.', 36.00, 'Especial',
   '[{"nome":"Bacon crocante","preco":2.5},{"nome":"Queijo extra","preco":2},{"nome":"Carne extra","preco":5},{"nome":"Alface e tomate","preco":2.5}]'::jsonb,
   '["Alface","Barbecue"]'::jsonb, 4),
  ('honesto', 'burger', '🥬', 'O Honesto',
   'Smash simples, queijo americano, tomate, alface, picles e mostarda. Direto ao ponto.', 24.00, 'Direto ao ponto',
   '[{"nome":"Bacon crocante","preco":2.5},{"nome":"Queijo extra","preco":2},{"nome":"Carne extra","preco":5},{"nome":"Alface e tomate","preco":2.5}]'::jsonb,
   '["Alface","Tomate","Picles","Mostarda"]'::jsonb, 5),
  ('batata', 'acomp', '🍟', 'Batata & Molho',
   'Batata frita palito crocante com molho da casa. A companheira perfeita.', 14.00, 'Acompanhamento',
   '[{"nome":"Porção dupla","preco":8},{"nome":"Molho extra","preco":2}]'::jsonb,
   '["Molho da casa"]'::jsonb, 6)
) as v(id, cat, emoji, nome, descricao, preco, tag, adicionais, removiveis, ordem)
where not exists (select 1 from public.produtos);
