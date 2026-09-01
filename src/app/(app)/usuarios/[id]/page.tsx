import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { UserForm } from "@/components/users/UserForm";
import { requireAdminSession } from "@/server/require-admin";
import { prisma } from "@/lib/prisma";
import type { RoleValue } from "@/lib/role-options";

export default async function EditarUsuarioPage({ params }: { params: { id: string } }) {
  const session = await requireAdminSession();
  if (!session) redirect("/dashboard");

  const user = await prisma.user.findUnique({
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
            roles: user.roles.map((r) => r.role as RoleValue),
            status: user.status,
          }}
        />
      </Card>
    </AppShell>
  );
}
