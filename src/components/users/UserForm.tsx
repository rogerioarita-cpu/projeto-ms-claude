"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ROLE_VALUES, ROLE_LABELS, ROLE_DESCRIPTIONS, type RoleValue } from "@/lib/role-options";

type Lead = { id: string; companyName: string };
type StatusValue = "ativo" | "inativo" | "bloqueado";

type Initial = {
  id?: string;
  name: string;
  email: string;
  roles: RoleValue[];
  status?: StatusValue;
  linkedLeadId?: string | null;
};

export function UserForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);

  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [password, setPassword] = useState("");
  const [roles, setRoles] = useState<RoleValue[]>(initial?.roles ?? []);
  const [status, setStatus] = useState<StatusValue>(initial?.status ?? "ativo");
  const [linkedLeadId, setLinkedLeadId] = useState(initial?.linkedLeadId ?? "");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/leads", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then(setLeads)
      .catch(() => setLeads([]));
  }, []);

  function toggleRole(role: RoleValue) {
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

  const needsLinkedLead = roles.includes("cliente_consulta");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (roles.length === 0) {
      setError("Selecione ao menos um papel.");
      return;
    }
    if (!isEdit && password.length < 8) {
      setError("A senha precisa ter ao menos 8 caracteres.");
      return;
    }
    if (needsLinkedLead && !linkedLeadId) {
      setError("Selecione a empresa vinculada para o perfil Cliente-Consulta.");
      return;
    }

    setLoading(true);
    const url = isEdit ? `/api/users/${initial!.id}` : "/api/users";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password: password || undefined, roles, status, linkedLeadId: needsLinkedLead ? linkedLeadId : null }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error?.formErrors?.[0] ?? data?.error ?? "Não foi possível salvar o usuário.");
      return;
    }

    router.push("/usuarios");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Nome</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-navy"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">E-mail</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-navy"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          {isEdit ? "Nova senha (deixe em branco para manter a atual)" : "Senha (opcional — se em branco, o usuário cadastra no primeiro acesso)"}
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={isEdit ? "••••••••" : "mínimo 8 caracteres"}
          className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-navy"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value as StatusValue)} className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm">
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
          <option value="bloqueado">Bloqueado</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Papéis</label>
        <div className="mt-2 space-y-2">
          {ROLE_VALUES.map((role) => (
            <label key={role} className="flex items-start gap-2 rounded-md border border-border px-3 py-2 text-sm">
              <input type="checkbox" className="mt-0.5" checked={roles.includes(role)} onChange={() => toggleRole(role)} />
              <span>
                <span className="block font-medium">{ROLE_LABELS[role]}</span>
                <span className="block text-xs text-muted">{ROLE_DESCRIPTIONS[role]}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {needsLinkedLead && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Empresa vinculada *</label>
          <select value={linkedLeadId} onChange={(e) => setLinkedLeadId(e.target.value)} className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm">
            <option value="">Selecione</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.companyName}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">Obrigatório para o perfil Cliente-Consulta — restringe o acesso apenas aos dados dessa empresa.</p>
        </div>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar usuário"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/usuarios")}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
