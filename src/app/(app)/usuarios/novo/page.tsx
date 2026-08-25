import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { UserForm } from "@/components/users/UserForm";
import { requireAdminSession } from "@/server/require-admin";

export default async function NovoUsuarioPage() {
  const session = await requireAdminSession();
  if (!session) redirect("/dashboard");

  return (
    <AppShell title="Novo usuário" subtitle="Crie uma nova conta e defina seus papéis de acesso.">
      <Card>
        <UserForm />
      </Card>
    </AppShell>
  );
}
