-- Testes de permissão e de preço. Roda num Postgres com mock-supabase.sql + schema.sql.
-- Qualquer falha interrompe com erro.
\set ON_ERROR_STOP 1
\set QUIET 1

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000d0d0', 'dono@exemplo.com'),
  ('00000000-0000-0000-0000-0000000f0f0f', 'ana@equipe.carneepao.app'),
  ('00000000-0000-0000-0000-00000000bad0', 'estranho@exemplo.com'),
  ('00000000-0000-0000-0000-0000000f0f02', 'novo@equipe.carneepao.app');

select public.tornar_dono('dono@exemplo.com', 'Dono');

create or replace function pg_temp.espera_erro(sql text, trecho text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'FALHOU: esperava erro "%" em: %', trecho, sql;
exception when others then
  if sqlerrm like 'FALHOU:%' then raise; end if;
  if position(trecho in sqlerrm) = 0 then
    raise exception 'FALHOU: erro errado em %: % (esperava %)', sql, sqlerrm, trecho;
  end if;
end $$;
grant execute on function pg_temp.espera_erro(text, text) to anon, authenticated;

create or replace function pg_temp.checa(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'FALHOU: %', msg; end if; end $$;
grant execute on function pg_temp.checa(boolean, text) to anon, authenticated;

-- ── CLIENTE ANÔNIMO ─────────────────────────────────────────────────────────
set role anon;
select set_config('request.jwt.claim.sub', '', false);

select pg_temp.checa((select count(*) from produtos) = 6, 'anon vê o cardápio');
select pg_temp.checa((select modo from loja) = 'auto', 'anon vê a loja');
select pg_temp.espera_erro('select * from pedidos', 'permission denied');
select pg_temp.espera_erro('select * from equipe', 'permission denied');
select pg_temp.espera_erro($$update produtos set preco = 1$$, 'permission denied');
select pg_temp.espera_erro($$insert into pedidos (cliente_nome,tipo,pagamento,itens,subtotal) values ('x','retirada','Pix','[]',0)$$, 'permission denied');
select pg_temp.espera_erro($$select atualizar_status(1, 'entregue')$$, 'permission denied');
select pg_temp.espera_erro($$select relatorio(current_date, current_date)$$, 'permission denied');
select pg_temp.espera_erro($$select tornar_dono('estranho@exemplo.com','x')$$, 'permission denied');

-- Pedido válido: 2x Clássico com bacon (28+2,50)*2 = 61 + batata 14 = 75
select pg_temp.checa(
  (criar_pedido('{"cliente":{"nome":"Ana","tipo":"delivery","pagamento":"Pix",
     "endereco":{"rua":"Rua A","num":"10","bairro":"Centro","cep":"01001-000"}},
     "itens":[{"id":"classico","qtd":2,"adds":[0,0],"rems":[1]},{"id":"batata","qtd":1}]}')->>'subtotal')::numeric = 75,
  'preço recalculado no servidor (adicional repetido conta uma vez)');

-- O cliente não consegue mandar preço: campos extras são ignorados
select pg_temp.checa(
  (criar_pedido('{"cliente":{"nome":"B","tipo":"retirada","pagamento":"Pix"},
     "itens":[{"id":"honesto","qtd":1,"preco":0.01,"unit":0.01}],"subtotal":0.01}')->>'subtotal')::numeric = 24,
  'preço enviado pelo cliente é ignorado');

select pg_temp.espera_erro($$select criar_pedido('{"cliente":{"nome":"A","tipo":"delivery","pagamento":"Pix"},"itens":[{"id":"classico","qtd":1}]}')$$, 'endereco_incompleto');
select pg_temp.espera_erro($$select criar_pedido('{"cliente":{"nome":"","tipo":"retirada","pagamento":"Pix"},"itens":[{"id":"classico","qtd":1}]}')$$, 'nome_obrigatorio');
select pg_temp.espera_erro($$select criar_pedido('{"cliente":{"nome":"A","pagamento":"Pix"},"itens":[{"id":"classico","qtd":1}]}')$$, 'tipo_invalido');
select pg_temp.espera_erro($$select criar_pedido('{"cliente":{"nome":"A","tipo":"retirada"},"itens":[{"id":"classico","qtd":1}]}')$$, 'pagamento_invalido');
select pg_temp.espera_erro($$select criar_pedido('{"cliente":{"nome":"A","tipo":"retirada","pagamento":"Pix"},"itens":[]}')$$, 'itens_invalidos');
select pg_temp.espera_erro($$select criar_pedido('{"cliente":{"nome":"A","tipo":"retirada","pagamento":"Pix"}}')$$, 'itens_invalidos');
select pg_temp.espera_erro($$select criar_pedido('{"cliente":{"nome":"A","tipo":"retirada","pagamento":"Pix"},"itens":[{"id":"nao-existe","qtd":1}]}')$$, 'produto_indisponivel');
select pg_temp.espera_erro($$select criar_pedido('{"cliente":{"nome":"A","tipo":"retirada","pagamento":"Pix"},"itens":[{"id":"classico","qtd":0}]}')$$, 'quantidade_invalida');
select pg_temp.espera_erro($$select criar_pedido('{"cliente":{"nome":"A","tipo":"retirada","pagamento":"Pix"},"itens":[{"id":"classico","qtd":1.5}]}')$$, 'quantidade_invalida');
select pg_temp.espera_erro($$select criar_pedido('{"cliente":{"nome":"A","tipo":"retirada","pagamento":"Pix"},"itens":[{"id":"classico","qtd":-3}]}')$$, 'quantidade_invalida');
select pg_temp.espera_erro($$select criar_pedido('{"cliente":{"nome":"A","tipo":"retirada","pagamento":"Pix"},"itens":[{"id":"classico","qtd":"2"}]}')$$, 'quantidade_invalida');
select pg_temp.espera_erro($$select criar_pedido('{"cliente":{"nome":"A","tipo":"retirada","pagamento":"Pix"},"itens":[{"id":"classico","qtd":1,"adds":[9]}]}')$$, 'adicional_invalido');
select pg_temp.espera_erro($$select criar_pedido('{"cliente":{"nome":"A","tipo":"retirada","pagamento":"Pix"},"itens":[{"id":"classico","qtd":1,"adds":[-1]}]}')$$, 'adicional_invalido');
select pg_temp.espera_erro($$select criar_pedido('{"cliente":{"nome":"A","tipo":"retirada","pagamento":"Pix"},"itens":[{"id":"classico","qtd":1,"rems":["x"]}]}')$$, 'remocao_invalida');

-- ── ESTRANHO (criou conta, mas não é da equipe) ─────────────────────────────
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000bad0', false);
select pg_temp.checa((select count(*) from pedidos) = 0, 'estranho não vê pedidos');
select pg_temp.checa((select count(*) from equipe) = 0, 'estranho não vê equipe');
select pg_temp.espera_erro($$select atualizar_status(1, 'cancelado')$$, 'sem_permissao');
select pg_temp.espera_erro($$select marcar_esgotado('classico', true)$$, 'sem_permissao');
select pg_temp.espera_erro($$select definir_modo_loja('fechado')$$, 'sem_permissao');
select pg_temp.espera_erro($$select relatorio(current_date, current_date)$$, 'sem_permissao');
select pg_temp.espera_erro($$select adicionar_membro(auth.uid(), 'eu', 'eu')$$, 'sem_permissao');
select pg_temp.espera_erro($$insert into equipe (user_id,nome,login,papel) values (auth.uid(),'eu','eu','dono')$$, 'row-level security');
select pg_temp.espera_erro($$insert into equipe (user_id,nome,login,papel) values (auth.uid(),'eu','eu','funcionario')$$, 'row-level security');
update produtos set preco = 1 where id = 'classico';
select pg_temp.checa((select preco from produtos where id='classico') = 28, 'estranho não muda preço');
select pg_temp.espera_erro($$select tornar_dono('estranho@exemplo.com','x')$$, 'permission denied');

-- ── DONO ────────────────────────────────────────────────────────────────────
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000d0d0', false);
select pg_temp.checa(meu_papel() = 'dono', 'dono reconhecido');
select adicionar_membro('00000000-0000-0000-0000-0000000f0f0f', 'Ana', 'ana');
select pg_temp.checa((select count(*) from equipe) = 2, 'dono vê equipe');
select pg_temp.espera_erro($$insert into equipe (user_id,nome,login,papel) values ('00000000-0000-0000-0000-0000000f0f02','X','x','dono')$$, 'row-level security');
delete from equipe where user_id = auth.uid();  -- não deve remover a si mesmo
select pg_temp.checa((select count(*) from equipe where papel='dono') = 1, 'dono continua dono');
update produtos set preco = 30 where id = 'classico';
select pg_temp.checa((select preco from produtos where id='classico') = 30, 'dono muda preço');
update produtos set preco = 28 where id = 'classico';
insert into produtos (id, cat, emoji, nome, preco) values ('coca', 'bebida', '🥤', 'Coca lata', 6);
select pg_temp.checa((select count(*) from pedidos) = 2, 'dono vê pedidos');
select pg_temp.checa((relatorio(current_date - 1, current_date)->>'faturamento')::numeric = 99, 'relatório soma 75 + 24');

-- ── FUNCIONÁRIA ─────────────────────────────────────────────────────────────
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000f0f0f', false);
select pg_temp.checa(meu_papel() = 'funcionario', 'funcionária reconhecida');
select pg_temp.checa((select count(*) from pedidos) = 2, 'funcionária vê pedidos');
select pg_temp.checa((select count(*) from equipe) = 1, 'funcionária só vê a si mesma');
select atualizar_status((select min(id) from pedidos), 'preparando');
select pg_temp.checa((select status from pedidos order by id limit 1) = 'preparando', 'status mudou');
select pg_temp.espera_erro($$select atualizar_status(1, 'qualquer')$$, 'status_invalido');
select marcar_esgotado('batata', true);
select pg_temp.espera_erro($$select relatorio(current_date, current_date)$$, 'sem_permissao');
select pg_temp.espera_erro($$select adicionar_membro('00000000-0000-0000-0000-0000000f0f02', 'X', 'x')$$, 'sem_permissao');
delete from equipe where user_id = '00000000-0000-0000-0000-00000000d0d0';
select pg_temp.checa((select count(*) from equipe) = 1, 'funcionária não remove ninguém');
update produtos set preco = 1 where id = 'classico';
select pg_temp.checa((select preco from produtos where id='classico') = 28, 'funcionária não muda preço');
select definir_modo_loja('fechado', 'Acabou o pão!');

-- ── CLIENTE DE NOVO: esgotado e loja fechada ────────────────────────────────
set role anon;
select set_config('request.jwt.claim.sub', '', false);
select pg_temp.espera_erro($$select criar_pedido('{"cliente":{"nome":"A","tipo":"retirada","pagamento":"Pix"},"itens":[{"id":"classico","qtd":1}]}')$$, 'loja_fechada');
reset role;
update loja set modo = 'auto';
set role anon;
select pg_temp.espera_erro($$select criar_pedido('{"cliente":{"nome":"A","tipo":"retirada","pagamento":"Pix"},"itens":[{"id":"batata","qtd":1}]}')$$, 'produto_esgotado');
select pg_temp.checa((select count(*) from produtos where id = 'coca') = 1, 'produto novo aparece pro cliente');
select pg_temp.espera_erro('select * from pedidos_limite', 'permission denied');

-- ── LIMITE DE PEDIDOS: 6 a cada 10 min do mesmo IP ──────────────────────────
select set_config('request.headers', '{"x-forwarded-for": "200.1.2.3, 10.0.0.1"}', false);
select criar_pedido('{"cliente":{"nome":"Spam","tipo":"retirada","pagamento":"Pix"},"itens":[{"id":"honesto","qtd":1}]}')
from generate_series(1, 6);
select pg_temp.espera_erro($$select criar_pedido('{"cliente":{"nome":"Spam","tipo":"retirada","pagamento":"Pix"},"itens":[{"id":"honesto","qtd":1}]}')$$, 'muitos_pedidos');
-- outro cliente (outro IP) continua conseguindo
select set_config('request.headers', '{"x-forwarded-for": "177.9.9.9"}', false);
select pg_temp.checa((criar_pedido('{"cliente":{"nome":"Real","tipo":"retirada","pagamento":"Pix"},"itens":[{"id":"honesto","qtd":1}]}')->>'subtotal')::numeric = 24, 'outro IP passa');
reset role;

\echo 'TODOS OS TESTES PASSARAM'
