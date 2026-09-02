import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authOptions } from "@/server/auth";
import { prisma } from "@/lib/prisma";

/**
 * PRD — Implantação de Multi-Tenancy — Fase 1 (enforcement na aplicação) e
 * Fase 2 (Row-Level Security no Postgres, como defesa em profundidade).
 *
 * Este módulo é o ponto de entrada usado pelas rotas de API e páginas: reexporta
 * a lógica de baixo nível de `tenant-db.ts` (que não depende do NextAuth, para
 * evitar import circular com `auth.ts`) e adiciona `getTenantId()`, que depende
 * da sessão.
 */
export { forTenant, withPlatformBypass, type TenantPrisma } from "@/server/tenant-db";

/** Nome do cookie que guarda qual organização um super-admin de plataforma
 * está acessando no momento — ver `resolveActiveTenantId` abaixo. */
export const ACTIVE_TENANT_COOKIE = "active_tenant_id";

export class TenantMissingError extends Error {
  constructor() {
    super("Sessão sem tenant associado.");
    this.name = "TenantMissingError";
  }
}

/**
 * Resolve qual organização um super-admin de plataforma está acessando agora.
 * Super-admins não ficam vinculados a um tenant fixo — o "tenant atual" é
 * escolhido por eles no seletor no topo do menu (ver `TenantSwitcher`), e
 * persistido num cookie. Regra de default (sem seleção prévia):
 *   - só existe 1 organização -> usa ela.
 *   - existem várias -> usa a mais antiga (`createdAt` crescente).
 */
export async function resolveActiveTenantId(): Promise<string> {
  const cookieTenantId = cookies().get(ACTIVE_TENANT_COOKIE)?.value;
  if (cookieTenantId) {
    const tenant = await prisma.tenant.findUnique({ where: { id: cookieTenantId } });
    if (tenant) return tenant.id;
  }
  const oldest = await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
  if (!oldest) throw new TenantMissingError();
  return oldest.id;
}

/** Resolve o tenantId "efetivo" da sessão atual: para um usuário comum, é
 * sempre o tenant ao qual ele pertence; para um super-admin de plataforma, é
 * a organização selecionada no momento (ver `resolveActiveTenantId`). Lança
 * se não houver sessão/tenant. */
export async function getTenantId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new TenantMissingError();

  const isPlatformSuperAdmin = (session.user as { isPlatformSuperAdmin?: boolean }).isPlatformSuperAdmin;
  if (isPlatformSuperAdmin) {
    return resolveActiveTenantId();
  }

  const tenantId = (session.user as { tenantId?: string | null }).tenantId;
  if (!tenantId) throw new TenantMissingError();
  return tenantId;
}

/** Uso em blocos catch: se o erro for de tenant ausente, retorna a resposta HTTP
 * apropriada (401); caso contrário, retorna null para a rota tratar normalmente. */
export function handleTenantError(error: unknown) {
  if (error instanceof TenantMissingError) {
    return NextResponse.json({ error: "Sessão inválida: nenhum tenant associado ao usuário." }, { status: 401 });
  }
  return null;
}
