import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";

/**
 * Retorna a sessão atual se o usuário logado tiver o papel 'admin' — ou for
 * super-admin de plataforma (papel 'super_admin'), que também pode acessar o
 * cadastro de usuários de qualquer organização que estiver visualizando.
 * Retorna null caso contrário (sem sessão, ou sem nenhum dos dois papéis).
 */
export async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  const roles = (session?.user as { roles?: string[] } | undefined)?.roles ?? [];
  if (!session || (!roles.includes("admin") && !roles.includes("super_admin"))) return null;
  return session;
}
