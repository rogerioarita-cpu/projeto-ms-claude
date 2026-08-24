# Projeto MS (Claude) — Fase 2

Plataforma de auditoria fiscal SPED, recuperação de créditos tributários e
workflow jurídico/comercial. Gerada a partir do PRD do Projeto MS, na stack
da **Fase 2**: Next.js + Prisma + PostgreSQL + NextAuth.js.

Este projeto é uma reimplementação independente — não é uma cópia do projeto
Lovable original, mas segue o mesmo modelo de dados e os mesmos módulos
funcionais descritos no PRD.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Prisma ORM + PostgreSQL
- NextAuth.js (login por e-mail/senha e Google)

## Módulos

| Rota          | Descrição                                           |
| ------------- | ---------------------------------------------------- |
| `/dashboard`  | Dashboard executivo (KPIs de créditos e prescrição)  |
| `/leads`      | Pipeline comercial em 9 fases                        |
| `/auditoria`  | Inconsistências SPED por severidade                  |
| `/creditos`   | Créditos tributários e status de recuperação         |
| `/workflow`   | Ciclo de vida dos projetos e alertas de prescrição   |
| `/documentos` | Gestão documental com versionamento                  |
| `/login`      | Login por e-mail/senha e Google                      |

## Pré-requisitos

- Node.js 18.18 ou superior
- Um banco PostgreSQL (local via Docker, ou um serviço como Neon/Supabase/RDS)

## Passo a passo para rodar localmente

1. **Instale as dependências**

   ```bash
   npm install
   ```

2. **Configure as variáveis de ambiente**

   Copie `.env.example` para `.env` e preencha:

   ```bash
   cp .env.example .env
   ```

   - `DATABASE_URL`: string de conexão do PostgreSQL.
   - `NEXTAUTH_SECRET`: gere um valor com `openssl rand -base64 32`.
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: opcional, apenas se for usar login com Google.

   Se não tiver um Postgres à mão, o jeito mais rápido é subir um local com Docker:

   ```bash
   docker run --name projeto-ms-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=projeto_ms -p 5432:5432 -d postgres:16
   ```

   E usar: `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/projeto_ms"`

3. **Crie as tabelas no banco (migrations)**

   ```bash
   npx prisma migrate dev --name init
   ```

4. **(Opcional) Popule o banco com dados de demonstração**

   ```bash
   npm run db:seed
   ```

   Isso cria os mesmos dados de exemplo do PRD (3 clientes, 3 projetos, leads,
   inconsistências e créditos) e um usuário de login:

   ```
   E-mail: admin@projeto-ms.local
   Senha:  trocar-esta-senha
   ```

   **Troque essa senha antes de usar em produção.**

5. **Rode o projeto**

   ```bash
   npm run dev
   ```

   Acesse http://localhost:3000

## Scripts úteis

| Comando                  | O que faz                                  |
| ------------------------- | ------------------------------------------- |
| `npm run dev`             | Sobe o servidor de desenvolvimento          |
| `npm run build`           | Build de produção                           |
| `npm run start`           | Roda o build de produção                    |
| `npm run prisma:studio`   | Abre o Prisma Studio (interface do banco)   |
| `npm run prisma:migrate`  | Cria/aplica uma nova migration              |
| `npm run db:seed`         | Popula o banco com dados de demonstração    |

## Papéis de acesso

`admin`, `gestor`, `analista_fiscal`, `juridico`, `comercial`, `cliente`, `auditor`
— armazenados na tabela `user_roles`. Ao logar pela primeira vez via Google,
o papel padrão `cliente` é atribuído automaticamente (ver `src/server/auth.ts`).
Ao usar login por e-mail/senha, atribua o papel manualmente pelo Prisma Studio
ou por um script — ainda não há tela de administração de usuários neste
scaffold inicial.

## O que este scaffold já cobre

- Autenticação (credenciais + Google) com sessão JWT.
- Middleware protegendo todas as rotas do painel.
- As 6 telas principais consumindo dados reais do banco via Prisma.
- Schema completo do banco (Prisma) espelhando o modelo de dados do PRD.

## O que ainda falta implementar

- Formulários de criação/edição (leads, projetos, documentos, créditos) — hoje as telas são apenas de leitura.
- Upload real de arquivos (o campo `storagePath` existe no schema, mas não há integração com um serviço de storage).
- Tela de administração de usuários e papéis.
- Testes automatizados.
- Controle de acesso por papel nas telas (hoje o middleware só exige estar logado; a diferenciação por `role` precisa ser adicionada nas páginas/rotas conforme a necessidade de cada perfil).
