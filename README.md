# Carne & Pão

Site do restaurante Carne & Pão — smash burger artesanal em São Paulo.

São dois sites no mesmo repositório, ambos estáticos (HTML, CSS e JavaScript puros, sem build).
Dá pra publicar a pasta inteira no GitHub Pages.

| Site | Endereço | Para quem |
| --- | --- | --- |
| Clientes | `/` | Cardápio, carrinho e pedido pelo WhatsApp |
| Painel | `/painel/` | Dono e funcionários, com login |

O painel usa o **Supabase** (banco de dados gratuito) para guardar cardápio, pedidos e equipe.
**Para ligar, siga [`supabase/COMO-CONFIGURAR.md`](supabase/COMO-CONFIGURAR.md).**
Enquanto ele não estiver ligado, o site dos clientes funciona sozinho com o cardápio de `js/menu.js`.

## Como funciona o pedido

1. O cliente monta os lanches no cardápio (adicionais, remover ingredientes, quantidade).
2. Os itens vão para o carrinho (fica salvo no navegador).
3. No carrinho ele escolhe delivery ou retirada, preenche o endereço (o CEP completa
   rua e bairro sozinho) e a forma de pagamento.
4. O pedido é salvo no banco com um número, e o WhatsApp da loja abre com a mensagem pronta.
5. O pedido aparece no painel na hora, com aviso sonoro.

## Painel

| Aba | Dono | Funcionário |
| --- | :---: | :---: |
| 📋 Pedidos: novos, na chapa, saiu, entregue, cancelar, imprimir comanda | ✅ | ✅ |
| 🍔 Cardápio: marcar esgotado | ✅ | ✅ |
| 🍔 Cardápio: criar, editar preço, adicionais, esconder, apagar | ✅ | |
| 🏪 Loja: abrir/fechar na hora, aviso no site | ✅ | ✅ |
| 📊 Relatórios: faturamento, ticket médio, mais vendidos, vendas por dia | ✅ | |
| 👥 Equipe: criar e remover logins de funcionários | ✅ | |
| ⚙️ Conta: trocar a própria senha | ✅ | ✅ |

O preço de cada pedido é recalculado no banco. Ninguém consegue mudar o valor mexendo no navegador.

## Onde mudar as coisas

| O quê | Onde |
| --- | --- |
| Lanches, preços, adicionais, esgotado | Painel → Cardápio (com o banco ligado) ou `js/menu.js` (sem banco) |
| WhatsApp, endereço, dias e horário de funcionamento | `js/menu.js` (`LOJA`) |
| Ligação com o banco | `js/config.js` |
| Textos das seções, endereço e horário exibidos na página | `index.html` |
| Cores e visual | `css/style.css` (variáveis no topo) |

Se mudar o endereço, o telefone ou o horário, atualize também os textos do
`index.html` (seção Contato, carrinho e o bloco `application/ld+json` no topo).

## Estrutura

```
index.html              site dos clientes
css/style.css           estilos do site
js/config.js            endereço e chave pública do Supabase
js/menu.js              cardápio reserva e dados da loja (horário, WhatsApp)
js/app.js               carrinho, formulário, WhatsApp, status aberto/fechado
painel/                 painel da equipe (index.html, painel.css, painel.js)
supabase/schema.sql     banco de dados: tabelas, permissões e funções
supabase/teste/         testes de permissão do banco (Postgres local)
supabase/COMO-CONFIGURAR.md   passo a passo para ligar tudo
logo.png, img/          logo, mascote e manchas de tinta
```

### Rodar os testes do banco

Com um Postgres local:

```
createdb teste
psql -d teste -f supabase/teste/mock-supabase.sql
psql -d teste -f supabase/schema.sql
psql -d teste -f supabase/teste/testes.sql   # termina com "TODOS OS TESTES PASSARAM"
```
