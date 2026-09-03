"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ROLE_VALUES, ROLE_LABELS, ROLE_DESCRIPTIONS, type RoleValue } from "@/lib/role-options";

type Lead = { id: string; companyName: string };
type StatusValue = "ativo" | "inativo" | "bloqueado";
// Papel exibido só para quem já é super-admin — não faz parte de ROLE_VALUES
// (lista "normal"), pois não é selecionável por um admin comum.
type SelectableRole = RoleValue | "super_admin";

type Initial = {
  id?: string;
  name: string;
  email: string;
  roles: string[];
  status?: StatusValue;
  linkedLeadId?: string | null;
};

export function UserForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const { data: session } = useSession();
  const viewerIsSuperAdmin = (((session?.user as { roles?: string[] } | undefined)?.roles ?? []) as string[]).includes("super_admin");
  const isEdit = Boolean(initial?.id);

  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [password, setPassword] = useState("");
  const [roles, setRoles] = useState<SelectableRole[]>((initial?.roles ?? []) as SelectableRole[]);
  const [status, setStatus] = useState<StatusValue>(initial?.status ?? "ativo");
  const [linkedLeadId, setLinkedLeadId] = useState(initial?.linkedLeadId ?? "");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/leads", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Lead[]) => setLeads([...data].sort((a, b) => a.companyName.localeCompare(b.companyName, "pt-BR"))))
      .catch(() => setLeads([]));
  }, []);

  function toggleRole(role: SelectableRole) {
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

  // "Super Administrador" só é exibido na lista de papéis se quem está preenchendo
  // o formulário já for, ele mesmo, super-admin de plataforma.
  const visibleRoles: SelectableRole[] = viewerIsSuperAdmin ? [...ROLE_VALUES, "super_admin"] : [...ROLE_VALUES];

  const needsLinkedLead = roles.includes("lead_cliente");

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
      setError("Selecione o Lead/Cliente vinculado para o perfil Lead/Cliente.");
      return;
    }

    setLoading(true);
    const url = isEdit ? `/api/users/${initial!.id}` : "/api/users";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password: password || undefined,
        roles,
        status,
        linkedLeadId: needsLinkedLead ? linkedLeadId : null,
        ...(isEdit ? {} : { sendWelcomeEmail }),
      }),
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
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
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
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {visibleRoles.map((role) => (
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
          <label className="block text-sm font-medium text-gray-700">Lead/Cliente vinculado *</label>
          <select value={linkedLeadId} onChange={(e) => setLinkedLeadId(e.target.value)} className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm">
            <option value="">Selecione</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.companyName}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">Obrigatório para o perfil Lead/Cliente — restringe o acesso apenas à consulta dos dados desse Lead/Cliente.</p>
        </div>
      )}

      {!isEdit && (
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={sendWelcomeEmail} onChange={(e) => setSendWelcomeEmail(e.target.checked)} />
          Enviar e-mail de boas-vindas ao usuário (com usuário, perfil e senha)
        </label>
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
