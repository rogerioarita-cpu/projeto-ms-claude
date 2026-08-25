import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";

/**
 * Retorna a sessão atual se o usuário logado tiver o papel 'admin'.
 * Retorna null caso contrário (sem sessão, ou sem o papel).
 */
export async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  const roles = (session?.user as { roles?: string[] } | undefined)?.roles ?? [];
  if (!session || !roles.includes("admin")) return null;
  return session;
}
