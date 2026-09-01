import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";

/**
 * Se o usuário logado tiver o perfil `lead_cliente`, retorna o `leadId` do
 * Lead/Cliente vinculado a ele (para filtrar dados) — caso contrário, retorna
 * `undefined` (sem restrição, vê tudo, conforme o restante do RBAC).
 */
export async function getLeadScopeFilter(): Promise<string | undefined> {
  const session = await getServerSession(authOptions);
  const roles = (session?.user as { roles?: string[] } | undefined)?.roles ?? [];
  const linkedLeadId = (session?.user as { linkedLeadId?: string | null } | undefined)?.linkedLeadId;
  if (roles.includes("lead_cliente")) {
    return linkedLeadId ?? "__nenhum__"; // sem lead vinculado => não vê nada
  }
  return undefined;
}

/**
 * true se o usuário logado tiver o perfil `lead_cliente` — usado para bloquear
 * ações de escrita, já que esse perfil é somente de consulta.
 */
export async function isReadOnlySession(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  const roles = (session?.user as { roles?: string[] } | undefined)?.roles ?? [];
  return roles.includes("lead_cliente");
}
