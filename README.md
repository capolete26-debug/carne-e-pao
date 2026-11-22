# Carne & Pão

Site do restaurante Carne & Pão — smash burger artesanal em São Paulo.

Site estático (HTML, CSS e JavaScript puros, sem build). É só abrir o `index.html`
no navegador ou publicar a pasta no GitHub Pages.

## Como funciona o pedido

1. O cliente monta os lanches no cardápio (adicionais, remover ingredientes, quantidade).
2. Os itens vão para o carrinho (fica salvo no navegador).
3. No carrinho ele escolhe delivery ou retirada, preenche o endereço (o CEP completa
   rua e bairro sozinho) e a forma de pagamento.
4. O botão "Enviar pedido" abre o WhatsApp da loja com a mensagem pronta.

## Onde mudar as coisas

| O quê | Arquivo |
| --- | --- |
| Lanches, preços, adicionais, ingredientes removíveis | `js/menu.js` (`CARDAPIO`) |
| WhatsApp, endereço, dias e horário de funcionamento | `js/menu.js` (`LOJA`) |
| Textos das seções, endereço e horário exibidos na página | `index.html` |
| Cores e visual | `css/style.css` (variáveis no topo) |

Se mudar o endereço, o telefone ou o horário, atualize também os textos do
`index.html` (seção Contato, carrinho e o bloco `application/ld+json` no topo).

## Estrutura

```
index.html      página
css/style.css   estilos
js/menu.js      cardápio e dados da loja
js/app.js       carrinho, formulário, WhatsApp, status aberto/fechado
logo.png        logo
```
