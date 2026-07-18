# Finança a Dois 💞

Aplicação web para casais registrarem gastos, receitas e investimentos, acompanharem
gráficos comparativos e planejarem o orçamento mensal — acessível de qualquer
dispositivo (celular ou computador) por uma URL própria.

## Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS + React Router + Recharts
- **Backend/Banco**: [Supabase](https://supabase.com) (Postgres + Auth + Row Level Security), acessado diretamente do frontend via `@supabase/supabase-js` (sem servidor próprio)
- **Deploy sugerido**: [Vercel](https://vercel.com) (frontend) + Supabase (banco/auth), ambos com camada gratuita

## Como funciona o compartilhamento entre o casal

Cada usuário se cadastra com seu próprio e-mail/senha. Depois, uma pessoa cria um
**"espaço" (household)** e recebe um **código de convite**; a outra pessoa usa esse
código para entrar no mesmo espaço. A partir daí, os dois enxergam e editam os
mesmos gastos, investimentos, categorias e orçamentos — cada lançamento fica
identificado com quem o registrou, permitindo comparações entre vocês dois.

## Configuração do Supabase

1. Crie um projeto gratuito em https://app.supabase.com.
2. No **SQL Editor** do projeto, cole e rode o conteúdo de [`supabase/schema.sql`](./supabase/schema.sql).
   Isso cria as tabelas, as políticas de Row Level Security e as funções auxiliares
   (criação automática de perfil no cadastro, categorias padrão ao criar um espaço).
3. Em **Authentication → Providers**, deixe "Email" habilitado. Recomendado:
   desabilitar a confirmação obrigatória de e-mail em **Authentication → Settings**
   caso queiram testar rapidamente (ou configure o envio de e-mail se preferirem
   manter a confirmação).
4. Em **Project Settings → API**, copie a **Project URL** e a **anon public key**.

## Rodando localmente

```bash
npm install
cp .env.example .env.local
# edite .env.local com a URL e a anon key do seu projeto Supabase
npm run dev
```

Acesse `http://localhost:5173`. Crie uma conta, crie o espaço compartilhado, copie
o código de convite em **Config** e peça para o seu par criar a conta dele(a) e
entrar usando esse código.

## Deploy (Vercel)

1. Suba este repositório no GitHub (já deve estar lá, já que você está lendo isso 🙂).
2. Em https://vercel.com, importe o repositório.
3. Configure as variáveis de ambiente do projeto na Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy. A Vercel detecta automaticamente que é um projeto Vite (`npm run build`, saída em `dist/`).
5. Acessem a URL gerada pela Vercel a partir dos celulares/computadores de vocês
   dois — pode ser adicionada à tela inicial do celular como um atalho (PWA-like).

## Funcionalidades

- **Painel (Dashboard)**: gastos x receitas por mês, gastos por categoria, e
  comparativo de gastos entre os dois parceiros, com filtro de período (3/6/12 meses).
- **Gastos**: lançamento manual de gastos e receitas, com filtros por data, categoria,
  pessoa e tipo.
- **Investimentos**: contas/ativos por categoria (Renda Fixa, Ações, FIIs, Tesouro
  Direto, Cripto, etc.), registro de aportes/resgates/atualizações de saldo, gráfico
  de evolução patrimonial e alocação por categoria.
- **Orçamento**: definição de teto de gasto mensal por categoria, com barra de
  progresso comparando planejado x realizado.
- **Config**: nome do espaço compartilhado, código de convite, nome de exibição.

## Integração com o Nubank (importação automática)

O Nubank **não oferece uma API pública oficial** para terceiros, então a importação
automática não está incluída nesta primeira versão. Ao decidir avançar nessa frente,
avalie estas opções (do mais recomendado ao menos):

1. **Open Finance Brasil via agregador (recomendado)** — serviços como
   [Pluggy](https://pluggy.ai), Belvo ou Quicko têm parceria oficial com bancos
   (incluindo Nubank) via Open Finance, sob regulação do Banco Central. É a forma
   legal e estável de puxar extrato e investimentos automaticamente, com um custo
   mensal geralmente baixo para poucas contas. A integração ficaria: o app pede
   autorização Open Finance → o agregador expõe uma API própria → um endpoint no
   seu backend sincroniza os dados nas tabelas `transactions` / `investment_movements`
   marcando `source = 'nubank_api'`.
2. **Bibliotecas não oficiais (ex: `pynubank`)** — usam engenharia reversa do app do
   Nubank. Funcionam para uso pessoal, mas não são suportadas pelo banco, podem parar
   de funcionar a qualquer atualização do app e ficam numa área cinzenta dos termos
   de uso. Não recomendado para algo que vocês querem manter funcionando no longo prazo.
3. **Importação de extrato (CSV/OFX)** — sem automação alguma: exportem o extrato do
   app do Nubank periodicamente e importem manualmente. É a opção mais simples e
   100% dentro dos termos de uso; podemos construir uma tela de "Importar CSV" que
   faz o parse do extrato do Nubank e cria os lançamentos de uma vez, sem precisar
   de nenhuma integração de API.

## Estrutura do projeto

```
src/
  components/   # Layout e componentes compartilhados
  context/      # AuthContext (sessão, perfil, household)
  lib/          # cliente Supabase, formatação, hooks
  pages/        # LoginPage, HouseholdSetupPage, DashboardPage, ExpensesPage,
                # InvestmentsPage, BudgetPage, SettingsPage
  types/        # tipos TypeScript espelhando as tabelas do Supabase
supabase/
  schema.sql    # schema completo + RLS + seed de categorias
```
