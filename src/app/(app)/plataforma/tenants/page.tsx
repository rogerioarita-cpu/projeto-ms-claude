"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardTitle } from "@/components/ui/Card";

type TenantStatus = "ativo" | "suspenso" | "cancelado";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  createdAt: string;
  _count: { users: number; leads: number };
};

const STATUS_LABELS: Record<TenantStatus, string> = {
  ativo: "Ativo",
  suspenso: "Suspenso",
  cancelado: "Cancelado",
};

const STATUS_COLORS: Record<TenantStatus, string> = {
  ativo: "bg-green-100 text-green-800",
  suspenso: "bg-yellow-100 text-yellow-800",
  cancelado: "bg-red-100 text-red-800",
};

type AdminStatus = "ativo" | "inativo" | "bloqueado";

type SuperAdmin = { id: string; name: string | null; email: string; status: AdminStatus; tenantName: string };

const ADMIN_STATUS_LABELS: Record<AdminStatus, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  bloqueado: "Bloqueado",
};

const emptyAdminEditForm = { name: "", email: "", password: "", status: "ativo" as AdminStatus };
const emptyNewAdminForm = { name: "", email: "", password: "" };

const emptyForm = {
  tenantName: "",
  tenantSlug: "",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function PlataformaTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [admins, setAdmins] = useState<SuperAdmin[]>([]);
  const [editingAdmin, setEditingAdmin] = useState<SuperAdmin | null>(null);
  const [adminEditForm, setAdminEditForm] = useState(emptyAdminEditForm);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [newAdminForm, setNewAdminForm] = useState(emptyNewAdminForm);
  const [showNewAdminForm, setShowNewAdminForm] = useState(false);
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  async function loadAdmins() {
    const res = await fetch("/api/plataforma/super-admins", { cache: "no-store" });
    if (!res.ok) return;
    setAdmins(await res.json());
  }

  useEffect(() => {
    loadAdmins();
  }, []);

  async function demote(admin: SuperAdmin) {
    setError("");
    try {
      const res = await fetch(`/api/plataforma/super-admins/${admin.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível remover o acesso.");
      await loadAdmins();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível remover o acesso.");
    }
  }

  function startEditAdmin(admin: SuperAdmin) {
    setEditingAdmin(admin);
    setAdminEditForm({ name: admin.name ?? "", email: admin.email, password: "", status: admin.status });
  }

  function cancelEditAdmin() {
    setEditingAdmin(null);
    setAdminEditForm(emptyAdminEditForm);
  }

  async function saveAdmin(e: FormEvent) {
    e.preventDefault();
    if (!editingAdmin) return;
    setError("");
    setSavingAdmin(true);
    try {
      const res = await fetch(`/api/plataforma/super-admins/${editingAdmin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: adminEditForm.name,
          email: adminEditForm.email,
          status: adminEditForm.status,
          password: adminEditForm.password || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível salvar as alterações.");
      cancelEditAdmin();
      await loadAdmins();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar as alterações.");
    } finally {
      setSavingAdmin(false);
    }
  }

  async function createAdmin(e: FormEvent) {
    e.preventDefault();
    setError("");
    setCreatingAdmin(true);
    try {
      const res = await fetch("/api/plataforma/super-admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAdminForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível cadastrar o super-administrador.");
      setNewAdminForm(emptyNewAdminForm);
      setShowNewAdminForm(false);
      await loadAdmins();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível cadastrar o super-administrador.");
    } finally {
      setCreatingAdmin(false);
    }
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/plataforma/tenants", { cache: "no-store" });
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar organizações.");
      setTenants(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar organizações.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/plataforma/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível criar a organização.");
      setForm(emptyForm);
      setSlugTouched(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível criar a organização.");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(tenant: Tenant, status: TenantStatus) {
    setError("");
    try {
      const res = await fetch(`/api/plataforma/tenants/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível atualizar a organização.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível atualizar a organização.");
    }
  }

  if (forbidden) {
    return (
      <AppShell title="Cadastro de Organizações" subtitle="Provisionamento de novas organizações na plataforma.">
        <Card>
          <p className="text-sm text-muted">
            Você não tem permissão para acessar esta área — ela é restrita ao super-admin da plataforma.
          </p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title="Cadastro de Organizações" subtitle="Criação e gestão das organizações que usam a plataforma.">
      <div className="space-y-6">
        {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <Card>
          <CardTitle className="text-base">Nova organização</CardTitle>
          <p className="mb-4 text-sm text-muted">Cria a organização e o primeiro usuário administrador dela.</p>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="mb-1 block text-sm font-medium">Nome da organização *</span>
              <input
                required
                value={form.tenantName}
                onChange={(e) => {
                  const tenantName = e.target.value;
                  setForm((f) => ({ ...f, tenantName, tenantSlug: slugTouched ? f.tenantSlug : slugify(tenantName) }));
                }}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Ex.: Contábil Sul Consultoria"
              />
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium">Identificador (slug) *</span>
              <input
                required
                value={form.tenantSlug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm((f) => ({ ...f, tenantSlug: slugify(e.target.value) }));
                }}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="contabil-sul"
              />
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium">Nome do administrador *</span>
              <input
                required
                value={form.adminName}
                onChange={(e) => setForm((f) => ({ ...f, adminName: e.target.value }))}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Nome de quem vai administrar essa organização"
              />
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium">E-mail do administrador *</span>
              <input
                required
                type="email"
                value={form.adminEmail}
                onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="admin@organizacao.com.br"
              />
            </label>
            <label className="md:col-span-2">
              <span className="mb-1 block text-sm font-medium">Senha inicial (opcional)</span>
              <input
                type="password"
                value={form.adminPassword}
                onChange={(e) => setForm((f) => ({ ...f, adminPassword: e.target.value }))}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Se em branco, o administrador cadastra no primeiro acesso"
              />
            </label>
            <div className="md:col-span-2">
              <button disabled={saving} className="rounded-md bg-navy px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
                {saving ? "Criando..." : "Criar organização"}
              </button>
            </div>
          </form>
        </Card>

        <Card>
          <CardTitle className="text-base">{tenants.length} organização(ões)</CardTitle>
          {loading ? (
            <p className="mt-3 text-sm text-muted">Carregando...</p>
          ) : tenants.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nenhuma organização cadastrada ainda.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted">
                    <th className="py-2 pr-4">Organização</th>
                    <th className="py-2 pr-4">Slug</th>
                    <th className="py-2 pr-4">Usuários</th>
                    <th className="py-2 pr-4">Leads/Clientes</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t) => (
                    <tr key={t.id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-4 font-medium">{t.name}</td>
                      <td className="py-2 pr-4 text-muted">{t.slug}</td>
                      <td className="py-2 pr-4">{t._count.users}</td>
                      <td className="py-2 pr-4">{t._count.leads}</td>
                      <td className="py-2 pr-4">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[t.status]}`}>{STATUS_LABELS[t.status]}</span>
                      </td>
                      <td className="py-2 pr-4">
                        {t.status === "ativo" ? (
                          <button type="button" onClick={() => changeStatus(t, "suspenso")} className="rounded-md border px-3 py-1.5 text-xs">
                            Suspender
                          </button>
                        ) : (
                          <button type="button" onClick={() => changeStatus(t, "ativo")} className="rounded-md border px-3 py-1.5 text-xs">
                            Reativar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Super-administradores da plataforma</CardTitle>
            {!showNewAdminForm && (
              <button
                type="button"
                onClick={() => setShowNewAdminForm(true)}
                className="rounded-md bg-navy px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
              >
                + Novo super-administrador
              </button>
            )}
          </div>
          <p className="mb-4 text-sm text-muted">
            Têm acesso a esta tela em qualquer organização e não ficam vinculados a um tenant fixo — escolhem qual organização
            acessar no topo do menu.
          </p>

          {showNewAdminForm && (
            <form onSubmit={createAdmin} className="mb-4 grid gap-4 rounded-md border border-border p-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <CardTitle className="text-sm">Novo super-administrador</CardTitle>
                <p className="text-xs text-muted">
                  Se o e-mail já pertencer a um usuário existente, ele só é promovido a super-admin (nome e senha informados
                  abaixo são ignorados nesse caso).
                </p>
              </div>
              <label>
                <span className="mb-1 block text-sm font-medium">Nome *</span>
                <input
                  required
                  value={newAdminForm.name}
                  onChange={(e) => setNewAdminForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="Nome completo"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-medium">E-mail *</span>
                <input
                  required
                  type="email"
                  value={newAdminForm.email}
                  onChange={(e) => setNewAdminForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="usuario@organizacao.com.br"
                />
              </label>
              <label className="md:col-span-2">
                <span className="mb-1 block text-sm font-medium">Senha (opcional)</span>
                <input
                  type="password"
                  value={newAdminForm.password}
                  onChange={(e) => setNewAdminForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="Se em branco, cadastra no primeiro acesso"
                />
              </label>
              <div className="flex gap-2 md:col-span-2">
                <button disabled={creatingAdmin} className="rounded-md bg-navy px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
                  {creatingAdmin ? "Cadastrando..." : "Cadastrar super-administrador"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewAdminForm(false);
                    setNewAdminForm(emptyNewAdminForm);
                  }}
                  className="rounded-md border px-5 py-2 text-sm font-medium"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {editingAdmin && (
            <form onSubmit={saveAdmin} className="mb-4 grid gap-4 rounded-md border border-border p-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <CardTitle className="text-sm">Editando: {editingAdmin.name ?? editingAdmin.email}</CardTitle>
              </div>
              <label>
                <span className="mb-1 block text-sm font-medium">Nome *</span>
                <input
                  required
                  value={adminEditForm.name}
                  onChange={(e) => setAdminEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-medium">E-mail *</span>
                <input
                  required
                  type="email"
                  value={adminEditForm.email}
                  onChange={(e) => setAdminEditForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-medium">Nova senha (opcional)</span>
                <input
                  type="password"
                  value={adminEditForm.password}
                  onChange={(e) => setAdminEditForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="Deixe em branco para manter a atual"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-medium">Status</span>
                <select
                  value={adminEditForm.status}
                  onChange={(e) => setAdminEditForm((f) => ({ ...f, status: e.target.value as AdminStatus }))}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                  <option value="bloqueado">Bloqueado</option>
                </select>
              </label>
              <div className="flex gap-2 md:col-span-2">
                <button disabled={savingAdmin} className="rounded-md bg-navy px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
                  {savingAdmin ? "Salvando..." : "Salvar alterações"}
                </button>
                <button type="button" onClick={cancelEditAdmin} className="rounded-md border px-5 py-2 text-sm font-medium">
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {admins.length === 0 ? (
            <p className="text-sm text-muted">Nenhum super-administrador cadastrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted">
                    <th className="py-2 pr-4">Nome</th>
                    <th className="py-2 pr-4">E-mail</th>
                    <th className="py-2 pr-4">Organização</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((a) => (
                    <tr key={a.id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-4 font-medium">{a.name ?? "—"}</td>
                      <td className="py-2 pr-4 text-muted">{a.email}</td>
                      <td className="py-2 pr-4 text-muted">{a.tenantName}</td>
                      <td className="py-2 pr-4 text-muted">{ADMIN_STATUS_LABELS[a.status]}</td>
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => startEditAdmin(a)} className="text-xs font-medium text-navy hover:underline">
                            Editar
                          </button>
                          <button type="button" onClick={() => demote(a)} className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-700">
                            Remover acesso
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
