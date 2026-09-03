# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Plataforma de auditoria fiscal SPED, recuperação de créditos tributários e workflow
jurídico/comercial ("Projeto MS", Fase 2). Reimplementação independente do produto
Lovable original, seguindo o mesmo modelo de dados e módulos do PRD. Domínio e UI em
português; código/comentários também em português.

Stack: Next.js 14 (App Router) + TypeScript, Tailwind, Prisma 5 + PostgreSQL,
NextAuth v4 (sessão JWT, credenciais + Google opcional).

## Comandos

```bash
npm run dev              # servidor de desenvolvimento (localhost:3000)
npm run build            # prisma generate && next build
npm run lint             # next lint
npm run prisma:migrate   # prisma migrate dev  (ou: npx prisma migrate dev --name <nome>)
npm run prisma:studio    # Prisma Studio
npm run db:seed          # tsx prisma/seed.ts — cria admin@projeto-ms.local / Admin@123456
```

- Não há framework de testes configurado.
- `npm run build` roda `prisma generate` antes do `next build` — necessário após mudar `schema.prisma`.
- Requer `.env` com `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (ver `.env.example`).
- `.nvmrc` pede Node 24; README menciona 18.18+.
- Ambiente Windows/PowerShell. `Corrigeutf8.ps1` existe para corrigir encoding; alguns arquivos têm BOM.

## Arquitetura

### Multi-tenancy — três camadas (ver PRD nos comentários de `src/server/tenant-db.ts`)

1. **Prisma Client tenant-aware** — `forTenant(tenantId)` em [src/server/tenant-db.ts](src/server/tenant-db.ts)
   usa `prisma.$extends` para injetar automaticamente o filtro/carimbo `tenantId` em
   toda leitura e escrita dos modelos de `TENANT_SCOPED_MODELS` (User, Lead, Project,
   Document, Inconsistency, TaxCredit, SpedFile, AnaliseFiscal, Aprovacao,
   LeadClientFlagLog).
2. **Row-Level Security no Postgres** — cada operação roda dentro de um
   `prisma.$transaction` que primeiro faz `set_config('app.current_tenant_id', …)` na
   mesma conexão; as políticas de RLS (migração `..._multi_tenant_fase2_rls`) recusam
   linhas de outro tenant. **Requer que a role do `DATABASE_URL` não seja superuser
   nem tenha `BYPASSRLS`** — senão o RLS não protege nada.
3. **Bypass de plataforma** — `withPlatformBypass()` usa o sentinel fixo
   `__platform_bypass__` para as poucas operações genuinamente globais (login antes de
   saber o tenant, checagem de e-mail único entre tenants, primeiro acesso). Nunca
   passar entrada de usuário para dentro dele.

`tenant-db.ts` **não importa** `next-auth`/`authOptions` de propósito — `auth.ts`
precisa de `withPlatformBypass` durante o próprio login, o que criaria import circular.
[src/server/tenant.ts](src/server/tenant.ts) é o ponto de entrada das rotas: reexporta
tudo de `tenant-db.ts` e adiciona `getTenantId()` (depende da sessão).

- **Usuário comum**: preso ao seu `user.tenantId`.
- **Super-admin de plataforma** (`isPlatformSuperAdmin` + papel `super_admin`, mantidos
  em sincronia): não tem tenant fixo; escolhe a "organização ativa" no seletor do menu,
  persistida no cookie `active_tenant_id` (`resolveActiveTenantId` — default: única org,
  ou a mais antiga).

### Padrão das rotas de API

```ts
const tenantId = await getTenantId();
const db = forTenant(tenantId);
// ... db.lead.findMany(...) etc.
// catch: const r = handleTenantError(error); if (r) return r;  → 401 se sessão sem tenant
```

**Escritas aninhadas** (`db.lead.create({ data: { clientFlagLogs: { create: {...} } } })`)
NÃO são interceptadas pela extensão — inclua `tenantId` manualmente na sub-operação
(ela roda na mesma transação, então o RLS já está correto). Ver `src/app/api/leads/route.ts`.

### RBAC

- `AppRole` enum + tabela `UserRole` (N papéis por usuário). Helpers em
  [src/lib/roles.ts](src/lib/roles.ts) (`STAFF_ROLES`, `isStaff`).
- Papel `lead_cliente` = somente consulta, restrito ao `user.linkedLeadId`. Aplicado via
  [src/server/session-scope.ts](src/server/session-scope.ts): `getLeadScopeFilter()`
  (filtro de query) e `isReadOnlySession()` (bloqueia POST/PUT/DELETE com 403).
- Guards de rota: `requireAdminSession()` ([src/server/require-admin.ts](src/server/require-admin.ts)),
  `requirePlatformSuperAdminSession()` ([src/server/require-platform-admin.ts](src/server/require-platform-admin.ts)).
- Menu lateral filtra itens por `requiresAdmin`/`requiresSuperAdmin` em
  [src/components/layout/SidebarNav.tsx](src/components/layout/SidebarNav.tsx).

### Auth

[src/server/auth.ts](src/server/auth.ts): `authorize()` usa `withPlatformBypass` para
achar o usuário, valida status (`bloqueado`/`inativo`), status do tenant
(`tenant_suspenso`) e `passwordHash`; lança `Error` com códigos curtos lidos pela tela
de login. Claims extras (`roles`, `tenantId`, `tenantName`, `linkedLeadId`,
`isPlatformSuperAdmin`) fluem pelos callbacks `jwt`/`session`.
[src/middleware.ts](src/middleware.ts): `next-auth/middleware` com `matcher` explícito
por rota (páginas + APIs), exceto `/api/auth/*`.

### SPED

[src/lib/sped/](src/lib/sped/): dois parsers — `efd_icms_ipi` e `efd_contribuicoes`.
`parseSpedFile(type, content)` despacha; `sniffSpedFileType(content)` detecta o tipo
real para recusar arquivo incompatível; `toSpedFileRecord(result)` achata para os
campos de topo do modelo `SpedFile`. Upload em `src/app/api/sped/route.ts` é síncrono
(teto de 150 MB), valida CNPJ do arquivo contra o do Lead, e faz detecção de duplicata
por CNPJ + tipo + período (grava registros com status `duplicado`/`erro` para auditoria).

### E-mail

[src/server/mail.ts](src/server/mail.ts): envio "best-effort" (nunca bloqueia a
operação). Cascata de config SMTP: `Tenant.smtp*` → tabela `system_settings`
(singleton, `SYSTEM_SETTINGS_ID`) → variáveis `SMTP_*` do `.env`.

### Estrutura de rotas

- `src/app/(app)/` — páginas autenticadas; `(app)/layout.tsx` faz o `redirect("/login")`
  se não houver sessão.
- `src/app/(app)/plataforma/` — telas exclusivas de super-admin.
- `src/app/login`, `esqueci-senha`, `cadastro-senha` — fora do grupo `(app)`.
- Alias de import: `@/*` → `src/*`.

### Banco

`prisma/schema.prisma` (~574 linhas, tabelas mapeadas para snake_case via `@@map`).
Migrações datadas (`20260…`); as de multi-tenancy vão em fases 0→3
(`multi_tenant_fase0` … `fase3_provisioning`). `prisma/seed.ts` roda fora do fluxo de
request, então faz `set_config('app.current_tenant_id', …)` manualmente antes de escrever.

Há uma skill de terceiros em `.agents/skills/prisma-postgres-setup/` (Prisma Postgres /
Prisma 7) — **não corresponde** a este projeto, que usa Prisma 5 com `url` na
`datasource`. Ignorar salvo instrução explícita.
