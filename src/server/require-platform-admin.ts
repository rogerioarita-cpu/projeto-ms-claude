import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";

/**
 * Retorna a sessão atual se o usuário logado for super-admin de plataforma —
 * verificado tanto pelo flag global `isPlatformSuperAdmin` quanto pelo papel
 * "super_admin" no RBAC (ver migração 20260903120000_super_admin_role): os dois
 * são mantidos em sincronia pelo fluxo de cadastro/promoção/remoção de
 * super-admins, mas aceitar qualquer um dos dois aqui evita falso-negativo
 * caso um deles fique dessincronizado. Este acesso é independente do RBAC por
 * tenant — um admin comum de um tenant não tem, por si só, acesso à
 * criação/gestão de outras organizações.
 * Retorna null caso contrário (sem sessão, ou sem nenhum dos dois).
 */
export async function requirePlatformSuperAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const isPlatformSuperAdmin = (session.user as { isPlatformSuperAdmin?: boolean }).isPlatformSuperAdmin;
  const roles = ((session.user as { roles?: string[] }).roles ?? []) as string[];
  if (!isPlatformSuperAdmin && !roles.includes("super_admin")) return null;
  return session;
}
