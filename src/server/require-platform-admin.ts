import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";

/**
 * Retorna a sessão atual se o usuário logado tiver o flag global
 * `isPlatformSuperAdmin` (PRD — Fase 3, Provisionamento). Este flag é
 * independente do RBAC por tenant (`AppRole`) — um admin comum de um tenant
 * não tem, por si só, acesso à criação/gestão de outros tenants.
 * Retorna null caso contrário (sem sessão, ou sem o flag).
 */
export async function requirePlatformSuperAdminSession() {
  const session = await getServerSession(authOptions);
  const isPlatformSuperAdmin = (session?.user as { isPlatformSuperAdmin?: boolean } | undefined)?.isPlatformSuperAdmin;
  if (!session || !isPlatformSuperAdmin) return null;
  return session;
}
