import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * PRD — Implantação de Multi-Tenancy — Fase 1 (enforcement na aplicação) e
 * Fase 2 (Row-Level Security no Postgres, como defesa em profundidade).
 *
 * Este módulo contém só a lógica de baixo nível do Prisma Client tenant-aware
 * — sem depender de `next-auth`/`authOptions` — justamente para poder ser
 * importado por `src/server/auth.ts` sem criar uma dependência circular
 * (auth.ts precisa de `withPlatformBypass` durante o próprio login, antes de
 * existir uma sessão). `src/server/tenant.ts` reexporta tudo daqui, junto com
 * `getTenantId()` (que aí sim depende da sessão).
 */

/**
 * Modelos que possuem a coluna `tenantId` (ver seção 6.2 do PRD). Somente
 * essas tabelas são interceptadas pela extensão abaixo — as demais (Account,
 * Session, VerificationToken, UserRole, ChecklistItem) continuam passando
 * direto, pois seu isolamento é herdado via relação com um modelo já escopado.
 * Esta lista precisa ficar em sincronia com a que recebe políticas de RLS na
 * migração da Fase 2.
 */
const TENANT_SCOPED_MODELS = new Set([
  "User",
  "Lead",
  "LeadClientFlagLog",
  "Project",
  "Document",
  "Inconsistency",
  "TaxCredit",
  "SpedFile",
  "AnaliseFiscal",
  "Aprovacao",
]);

const READ_OPS = new Set(["findFirst", "findFirstOrThrow", "findMany", "findUnique", "findUniqueOrThrow", "count", "aggregate", "groupBy"]);
const WRITE_OPS_WITH_WHERE = new Set(["update", "updateMany", "delete", "deleteMany"]);

/** Primeira letra minúscula — converte o nome do model ("AnaliseFiscal") na
 * propriedade correspondente no client Prisma ("analiseFiscal"). */
function modelProperty(model: string) {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

/**
 * Valor especial de `app.current_tenant_id` reconhecido pelas políticas de RLS
 * como "ignore o isolamento por tenant nesta transação". Usado APENAS pelas
 * poucas operações verdadeiramente globais do sistema (ver `withPlatformBypass`
 * abaixo) — nunca é composto a partir de entrada do usuário.
 */
const PLATFORM_BYPASS_SENTINEL = "__platform_bypass__";

/**
 * Retorna um Prisma Client "tenant-aware": toda operação de leitura ou escrita
 * feita através dele, para os modelos em TENANT_SCOPED_MODELS, tem o filtro
 * `tenantId` injetado automaticamente — tanto para restringir o que é lido
 * quanto para carimbar o que é criado. Além disso (Fase 2), cada operação
 * roda dentro de uma transação que primeiro define `app.current_tenant_id`
 * na sessão do Postgres, na MESMA conexão física usada pela query — é essa
 * variável que as políticas de RLS leem para decidir quais linhas existem
 * do ponto de vista da conexão, independentemente do filtro da aplicação.
 *
 * IMPORTANTE: escritas aninhadas (ex.: `prisma.lead.create({ data: { clientFlagLogs:
 * { create: {...} } } })`) têm o filtro de `tenantId` injetado manualmente no
 * código da rota (a extensão não intercepta essas sub-operações), mas rodam
 * dentro da mesma transação/conexão do `create` pai, então a variável de
 * sessão do RLS já está correta para elas também.
 */
export function forTenant(tenantId: string) {
  return prisma.$extends({
    name: "tenant-scope",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          const typedArgs = args as { where?: Record<string, unknown>; data?: unknown; create?: Record<string, unknown> };

          if (READ_OPS.has(operation) || WRITE_OPS_WITH_WHERE.has(operation)) {
            typedArgs.where = { ...(typedArgs.where ?? {}), tenantId };
          }

          if (operation === "create") {
            typedArgs.data = { ...(typedArgs.data as Record<string, unknown> ?? {}), tenantId };
          }

          if (operation === "createMany") {
            const data = typedArgs.data;
            if (Array.isArray(data)) {
              typedArgs.data = data.map((d: Record<string, unknown>) => ({ ...d, tenantId }));
            }
          }

          if (operation === "upsert") {
            typedArgs.where = { ...(typedArgs.where ?? {}), tenantId };
            typedArgs.create = { ...(typedArgs.create ?? {}), tenantId };
          }

          // Fase 2: roda a operação (já com o filtro de tenant da aplicação)
          // dentro de uma transação que primeiro carimba a sessão do Postgres
          // com o tenant atual, para as políticas de RLS.
          return prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const modelClient = (tx as any)[modelProperty(model)];
            return modelClient[operation](typedArgs);
          });
        },
      },
    },
  });
}

export type TenantPrisma = ReturnType<typeof forTenant>;

/**
 * Executa `fn` com a sessão do Postgres marcada com o sentinel de bypass
 * reconhecido pelas políticas de RLS — reservado às poucas operações
 * genuinamente globais do sistema (nunca escopadas a um único tenant):
 *   - login (authorize / eventos do NextAuth), antes de sabermos o tenant do usuário
 *   - checagem de e-mail único globalmente entre todos os tenants (PRD 6.3)
 *   - fluxo de primeiro acesso (definir senha) por e-mail, ainda sem sessão
 * NUNCA passe para dentro deste bypass qualquer valor vindo do usuário — o
 * sentinel usado é sempre a mesma string fixa, nunca dado de entrada.
 */
export async function withPlatformBypass<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${PLATFORM_BYPASS_SENTINEL}, true)`;
    return fn(tx);
  });
}
