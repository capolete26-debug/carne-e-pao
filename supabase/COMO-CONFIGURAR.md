# Como ligar o banco de dados e o painel

Leva uns 15 minutos. Você só faz isso **uma vez**.

No fim você vai ter:

- **Site dos clientes**: `seusite/` (o cardápio vem do banco e os pedidos ficam salvos)
- **Painel da equipe**: `seusite/painel/` (login de dono e de funcionários)

---

## 1. Criar a conta e o projeto no Supabase

1. Entre em **supabase.com** e clique em **Start your project**. Dá pra entrar com a conta do GitHub.
2. Clique em **New project** e preencha:
   - **Name**: `carne-e-pao`
   - **Database Password**: crie uma senha forte e **guarde** (você quase não vai usar, mas não perca).
   - **Region**: **South America (São Paulo)**
3. Clique em **Create new project** e espere uns 2 minutos até ficar pronto.

O plano gratuito é suficiente pra começar.

## 2. Criar as tabelas

1. No menu da esquerda, abra **SQL Editor**.
2. Clique em **New query**.
3. Abra o arquivo `supabase/schema.sql` deste projeto, copie **tudo** e cole lá.
4. Clique em **Run**. Deve aparecer "Success".

Isso cria o cardápio (já com os lanches atuais), os pedidos, a equipe e as regras de quem pode ver o quê.

## 3. Ajustar o login

1. Menu da esquerda: **Authentication**, depois **Sign In / Providers** (em algumas versões fica em **Providers → Email**).
2. **Desligue** a opção **Confirm email**.
   Os funcionários entram com usuário e senha, sem e-mail de verdade, então essa confirmação travaria o acesso deles.
3. Deixe **Allow new users to sign up** **ligado**. É isso que permite você criar os logins da equipe pelo painel.
   Fique tranquilo: quem criar uma conta por conta própria não vê nada. Só entra no painel quem você cadastrar.
4. Clique em **Save**.

## 4. Criar o seu login de dono

> **Faça este passo antes do 5 e do 6.** Enquanto a chave do passo 5 não estiver publicada,
> ninguém de fora consegue criar conta, então ninguém consegue "pegar" o seu e-mail antes de você.

1. **Authentication** → **Users** → **Add user** → **Create new user**.
2. Coloque **seu e-mail** e uma **senha** (mínimo 8 caracteres).
3. Marque **Auto Confirm User** e clique em **Create user**.
4. Volte ao **SQL Editor**, abra uma **New query**, cole a linha abaixo trocando pelo seu e-mail e nome, e clique em **Run**:

   ```sql
   select public.tornar_dono('seu-email@exemplo.com', 'Seu Nome');
   ```

   Deve aparecer "Pronto! Seu Nome agora é dono(a)."

## 5. Pegar as chaves de ligação

1. Abra **Project Settings** (engrenagem) → **API** (ou **Data API** / **API Keys**).
2. Copie:
   - **Project URL**, parecido com `https://abcdefgh.supabase.co`
   - a chave **anon public** ou **publishable**, um texto comprido

> A chave **anon / publishable** é pública: ela fica no site mesmo, não tem problema.
> **Nunca** compartilhe nem coloque no site a chave **service_role** ou **secret**.

3. Mande essas duas coisas pro Claude, ou cole você mesmo no arquivo `js/config.js`:

   ```js
   window.SUPABASE_CONFIG = {
     url: 'https://abcdefgh.supabase.co',
     anonKey: 'cole-a-chave-aqui',
   };
   ```

## 6. Publicar o site (GitHub Pages)

1. No GitHub, abra o repositório **carne-e-pao** → **Settings** → **Pages**.
2. Em **Source**, escolha **Deploy from a branch**, branch **main**, pasta **/ (root)** e clique em **Save**.
3. Em 1 ou 2 minutos aparece o endereço, algo como `https://seu-usuario.github.io/carne-e-pao/`.
   - Clientes: esse endereço.
   - Painel: o mesmo endereço com `/painel/` no final.

## 7. Testar

1. Abra o **painel**, entre com seu e-mail e senha.
2. Em **👥 Equipe**, crie um funcionário de teste (usuário e senha).
3. Em outra aba (ou no celular), abra o **site dos clientes** e faça um pedido.
4. O pedido aparece no painel na hora. Clique em **🔔 Ativar som** pra ouvir quando chegar pedido novo.

---

## Dúvidas comuns

**Alguém saiu da equipe.**
Em **👥 Equipe**, clique em **Remover**. O acesso ao painel acaba na hora.
Pra fazer uma faxina completa, apague também o login em **Authentication → Users** no Supabase.

**Painel num tablet ou computador da loja.**
O painel fica logado nesse aparelho. No fim do turno, use **⚙️ Conta → Sair** se outras pessoas usam o mesmo aparelho.

**Recebi pedidos estranhos ou repetidos.**
O banco aceita até 6 pedidos a cada 10 minutos da mesma internet e até 40 pedidos novos a cada 10 minutos no total.
Passando disso, o pedido ainda chega pelo WhatsApp, mas não é salvo no painel. Cancele os falsos no painel.

**O funcionário esqueceu a senha.**
Em **👥 Equipe**, remova a pessoa e crie de novo com outro usuário. Ou você reseta pelo Supabase: **Authentication → Users**, clique na pessoa e defina uma nova senha.

**Quero trocar preço ou tirar um lanche.**
Painel → **🍔 Cardápio** → **Editar**. O site atualiza sozinho em até 2 minutos.

**Acabou um ingrediente no meio da noite.**
Qualquer pessoa da equipe marca **Esgotado** no cardápio. Pra parar de receber pedidos, use **🏪 Loja → Fechada agora**.

**O banco caiu / sem internet.**
O site continua mostrando o cardápio do arquivo `js/menu.js` e os pedidos vão só pelo WhatsApp, como antes.

**O projeto gratuito "dorme"?**
O Supabase pausa projetos gratuitos que ficam **uma semana sem nenhum acesso**. Com pedidos todo dia isso não acontece. Se pausar, é só entrar no supabase.com e clicar em **Restore**.
