import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardTitle } from "@/components/ui/Card";
import { DeleteUserButton } from "@/components/users/DeleteUserButton";
import { UserStatusSelect } from "@/components/users/UserStatusSelect";
import { UserFilters } from "@/components/users/UserFilters";
import { ROLE_LABELS, type RoleValue } from "@/lib/role-options";
import { requireAdminSession } from "@/server/require-admin";
import { dateFmt } from "@/lib/format";
import { getTenantId, forTenant } from "@/server/tenant";

export const dynamic = "force-dynamic";

export default async function UsuariosPage({ searchParams }: { searchParams?: { role?: string; status?: string } }) {
  const session = await requireAdminSession();
  if (!session) redirect("/dashboard");

  const currentUserId = (session.user as { id?: string }).id;
  const roleFilter = searchParams?.role || "";
  const statusFilter = searchParams?.status || "";

  const tenantId = await getTenantId();
  const db = forTenant(tenantId);
  const allUsers = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { roles: true, linkedLead: true },
  });

  const users = allUsers.filter((u) => {
    const matchesRole = !roleFilter || u.roles.some((r) => r.role === roleFilter);
    const matchesStatus = !statusFilter || u.status === statusFilter;
    return matchesRole && matchesStatus;
  });

  const kpis = {
    total: allUsers.length,
    ativos: allUsers.filter((u) => u.status === "ativo").length,
    bloqueados: allUsers.filter((u) => u.status === "bloqueado").length,
  };

  return (
    <AppShell title="Cadastro de usuários" subtitle="Gerencie contas, papéis de acesso (RBAC) e status.">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardTitle>Total</CardTitle>
            <p className="mt-2 text-2xl font-bold text-navy">{kpis.total}</p>
          </Card>
          <Card>
            <CardTitle>Ativos</CardTitle>
            <p className="mt-2 text-2xl font-bold text-green-700">{kpis.ativos}</p>
          </Card>
          <Card>
            <CardTitle>Bloqueados</CardTitle>
            <p className="mt-2 text-2xl font-bold text-red-700">{kpis.bloqueados}</p>
          </Card>
        </div>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">{users.length} de {allUsers.length} usuários</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <UserFilters roleFilter={roleFilter} statusFilter={statusFilter} />
              <Link href="/usuarios/novo" className="rounded-md bg-navy px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">
                + Novo usuário
              </Link>
            </div>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted">
                  <th className="py-2 pr-4">Nome</th>
                  <th className="py-2 pr-4">E-mail</th>
                  <th className="py-2 pr-4">Papéis</th>
                  <th className="py-2 pr-4">Lead/Cliente vinculado</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Último acesso</th>
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
                    <td className="py-2 pr-4 text-muted">{u.linkedLead?.companyName || "—"}</td>
                    <td className="py-2 pr-4">
                      <UserStatusSelect
                        userId={u.id}
                        name={u.name}
                        email={u.email}
                        roles={u.roles.map((r) => r.role as RoleValue)}
                        linkedLeadId={u.linkedLeadId}
                        status={u.status}
                        disabled={u.id === currentUserId}
                      />
                    </td>
                    <td className="py-2 pr-4 text-muted">{u.lastAccessAt ? dateFmt.format(u.lastAccessAt) : "Nunca"}</td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-3">
                        <Link href={`/usuarios/${u.id}`} className="text-xs font-medium text-navy hover:underline">
                          Editar
                        </Link>
                        {u.id !== currentUserId ? <DeleteUserButton userId={u.id} userName={u.name ?? u.email} /> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <p className="text-xs text-muted">
          RBAC: cada usuário pode ter mais de um papel. O perfil <strong>Lead/Cliente</strong> só permite consultar os
          dados do Lead/Cliente vinculado; os demais perfis (Administrador, Gestor, Analista Fiscal, Jurídico,
          Comercial, Aprovador) têm acesso conforme sua função no fluxo de análise e aprovação.
        </p>
      </div>
    </AppShell>
  );
}
