# Carne & Pão

Site da Carne & Pão — smash burger na Vila Alpina, Santo André.

Site estático (HTML, CSS e JavaScript puros, sem build). Dá pra publicar a pasta no GitHub Pages.

## Como funciona

O site é a **vitrine** da hamburgueria: cardápio com fotos, endereço, horário e o mascote
conversando com o cliente. Os pedidos são feitos nas plataformas que já caem na Saipos
(e saem impressos na loja):

| Botão | Vai para |
| --- | --- |
| Retirar na loja | Loja online da Saipos |
| Delivery pelo iFood | Página da loja no iFood |
| Delivery pelo 99Food | Página da loja no 99Food |

## O mascote

- **No topo:** respira, se mexe quando o mouse passa, inclina na direção do cursor e pula quando é tocado, com frases engraçadas.
- **Mascote amigo:** aparece no canto quando o cliente desce a página.
  - Comenta cada parte da página e cada lanche que a pessoa olha.
  - Ao ser tocado, mostra os botões de pedido.
  - Se a pessoa fica parada, puxa conversa. Dá pra dispensar no ✕.
- **"Quero esse!":** o mascote leva o cliente pra seção de pedido já falando do lanche escolhido.
- **Loja fechada:** ele avisa quando volta (ex.: "abre amanhã às 11h").
- **Pra mudar as falas:** em `js/menu.js` (campo `fala` de cada lanche) e em `js/app.js` (`FALAS`).

## Onde mudar as coisas

| O quê | Onde |
| --- | --- |
| Lanches, preços, descrições, fotos, falas do mascote | `js/menu.js` (`CARDAPIO`, `ADICIONAIS`) |
| Links da Saipos / iFood / 99Food, dias e horários, WhatsApp | `js/menu.js` (`LOJA`) |
| Fotos dos lanches | `img/cardapio/` |
| Textos das seções, endereço e horário exibidos | `index.html` |
| Cores e visual | `css/style.css` (variáveis no topo) |

> Mudou preço ou lanche na Saipos? Atualize também o `js/menu.js`. O site não puxa da Saipos sozinho.

## Estrutura

```
index.html              site
css/style.css           estilos
js/menu.js              cardápio, adicionais, horários e links de pedido
js/app.js               cardápio, status aberto/fechado e o mascote
logo.png, img/          logo, mascote, manchas de tinta e fotos do cardápio
painel/, supabase/      painel próprio com banco de dados (guardado, não está em uso)
```

### Painel próprio (guardado)

As pastas `painel/` e `supabase/` têm um sistema completo de pedidos com painel de dono e
funcionários. Ele **não está em uso**, porque os pedidos são feitos pela Saipos. Se um dia
quiserem um sistema próprio, o passo a passo está em
[`supabase/COMO-CONFIGURAR.md`](supabase/COMO-CONFIGURAR.md). Para religar, o site dos
clientes precisaria voltar a ter o carrinho (está no histórico do git, commit `4834ac1`).
