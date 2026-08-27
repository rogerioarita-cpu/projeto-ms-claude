import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";

/**
 * Se o usuário logado tiver o perfil `cliente_consulta`, retorna o `leadId`
 * da empresa vinculada a ele (para filtrar dados) — caso contrário, retorna
 * `undefined` (sem restrição, vê tudo, conforme o restante do RBAC).
 */
export async function getLeadScopeFilter(): Promise<string | undefined> {
  const session = await getServerSession(authOptions);
  const roles = (session?.user as { roles?: string[] } | undefined)?.roles ?? [];
  const linkedLeadId = (session?.user as { linkedLeadId?: string | null } | undefined)?.linkedLeadId;
  if (roles.includes("cliente_consulta")) {
    return linkedLeadId ?? "__nenhum__"; // sem empresa vinculada => não vê nada
  }
  return undefined;
}
