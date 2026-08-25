import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardTitle } from "@/components/ui/Card";
import { DeleteUserButton } from "@/components/users/DeleteUserButton";
import { ROLE_LABELS, type RoleValue } from "@/lib/role-options";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/server/require-admin";
import { dateFmt } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const session = await requireAdminSession();
  if (!session) redirect("/dashboard");

  const currentUserId = (session.user as { id?: string }).id;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { roles: true },
  });

  return (
    <AppShell title="Cadastro de usuários" subtitle="Gerencie contas e papéis de acesso à plataforma.">
      <Card>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{users.length} usuários</CardTitle>
          <Link
            href="/usuarios/novo"
            className="rounded-md bg-navy px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            + Novo usuário
          </Link>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted">
                <th className="py-2 pr-4">Nome</th>
                <th className="py-2 pr-4">E-mail</th>
                <th className="py-2 pr-4">Papéis</th>
                <th className="py-2 pr-4">Criado em</th>
                <th className="py-2 pr-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="py-2 pr-4 font-medium">
                    {u.name}
                    {u.id === currentUserId ? <span className="ml-1 text-xs text-muted">(você)</span> : null}
                  </td>
                  <td className="py-2 pr-4 text-muted">{u.email}</td>
                  <td className="py-2 pr-4">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <span key={r.id} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                          {ROLE_LABELS[r.role as RoleValue] ?? r.role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2 pr-4 text-muted">{dateFmt.format(u.createdAt)}</td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-3">
                      <Link href={`/usuarios/${u.id}`} className="text-xs font-medium text-navy hover:underline">
                        Editar
                      </Link>
                      {u.id !== currentUserId ? (
                        <DeleteUserButton userId={u.id} userName={u.name ?? u.email} />
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
