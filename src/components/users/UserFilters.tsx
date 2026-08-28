"use client";

import { ROLE_LABELS, ROLE_VALUES } from "@/lib/role-options";

export function UserFilters({ roleFilter, statusFilter }: { roleFilter: string; statusFilter: string }) {
  return (
    <form method="get" className="flex flex-wrap gap-2">
      <select name="role" defaultValue={roleFilter} className="rounded-md border px-2 py-1.5 text-xs" onChange={(e) => e.currentTarget.form?.submit()}>
        <option value="">Todos os papéis</option>
        {ROLE_VALUES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>
      <select name="status" defaultValue={statusFilter} className="rounded-md border px-2 py-1.5 text-xs" onChange={(e) => e.currentTarget.form?.submit()}>
        <option value="">Todos os status</option>
        <option value="ativo">Ativo</option>
        <option value="inativo">Inativo</option>
        <option value="bloqueado">Bloqueado</option>
      </select>
    </form>
  );
}
