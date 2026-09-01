"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RoleValue } from "@/lib/role-options";

type StatusValue = "ativo" | "inativo" | "bloqueado";

export function UserStatusSelect({
  userId,
  name,
  email,
  roles,
  status,
  disabled,
}: {
  userId: string;
  name: string | null;
  email: string;
  roles: RoleValue[];
  status: StatusValue;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleChange(next: StatusValue) {
    setLoading(true);
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name ?? "", email, roles, status: next }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      window.alert(data?.error ?? "Não foi possível atualizar o status.");
      return;
    }
    router.refresh();
  }

  return (
    <select
      value={status}
      disabled={disabled || loading}
      onChange={(e) => handleChange(e.target.value as StatusValue)}
      className="rounded-md border px-2 py-1 text-xs disabled:opacity-50"
    >
      <option value="ativo">Ativo</option>
      <option value="inativo">Inativo</option>
      <option value="bloqueado">Bloqueado</option>
    </select>
  );
}
