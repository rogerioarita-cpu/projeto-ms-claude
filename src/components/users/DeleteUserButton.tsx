"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteUserButton({ userId, userName }: { userId: string; userName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(`Excluir o usuário "${userName}"? Essa ação não pode ser desfeita.`);
    if (!confirmed) return;

    setLoading(true);
    const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      window.alert(data?.error ?? "Não foi possível excluir o usuário.");
      return;
    }
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-xs font-medium text-red-600 hover:underline disabled:opacity-60"
    >
      {loading ? "Excluindo..." : "Excluir"}
    </button>
  );
}
