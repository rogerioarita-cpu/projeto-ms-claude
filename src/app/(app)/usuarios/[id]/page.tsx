import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { UserForm } from "@/components/users/UserForm";
import { requireAdminSession } from "@/server/require-admin";
import { getTenantId, forTenant } from "@/server/tenant";

export default async function EditarUsuarioPage({ params }: { params: { id: string } }) {
  const session = await requireAdminSession();
  if (!session) redirect("/dashboard");

  const tenantId = await getTenantId();
  const db = forTenant(tenantId);
  const user = await db.user.findUnique({
    where: { id: params.id },
    include: { roles: true },
  });
  if (!user) notFound();

  return (
    <AppShell title={`Editar usuário — ${user.name ?? user.email}`} subtitle="Atualize os dados e os papéis de acesso.">
      <Card>
        <UserForm
          initial={{
            id: user.id,
            name: user.name ?? "",
            email: user.email,
            roles: user.roles.map((r) => r.role),
            status: user.status,
            linkedLeadId: user.linkedLeadId,
          }}
        />
      </Card>
    </AppShell>
  );
}
