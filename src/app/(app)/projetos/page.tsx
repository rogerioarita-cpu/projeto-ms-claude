"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";

const statuses = [
  ["planejamento", "Planejamento"],
  ["importacao", "Importação"],
  ["auditoria", "Auditoria"],
  ["analise", "Análise"],
  ["aprovacao", "Aprovação"],
  ["protocolo", "Protocolo"],
  ["concluido", "Concluído"],
] as const;

type Client = { id: string; name: string };
type Project = {
  id: string;
  name: string;
  status: string;
  clientId: string | null;
  client: Client | null;
  periodStart: string | null;
  periodEnd: string | null;
  prescriptionDate: string | null;
  _count: { documents: number; inconsistencies: number; taxCredits: number };
};

type FormData = {
  name: string;
  clientId: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  prescriptionDate: string;
};

const emptyForm: FormData = {
  name: "",
  clientId: "",
  status: "planejamento",
  periodStart: "",
  periodEnd: "",
  prescriptionDate: "",
};

function labelStatus(value: string) {
  return statuses.find(([key]) => key === value)?.[1] ?? value;
}

function dateValue(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

export default function ProjetosPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [projectsResponse, clientsResponse] = await Promise.all([
        fetch("/api/projetos", { cache: "no-store" }),
        fetch("/api/clientes", { cache: "no-store" }),
      ]);
      const projectsData = await projectsResponse.json();
      const clientsData = await clientsResponse.json();
      if (!projectsResponse.ok) throw new Error(projectsData.error || "Erro ao carregar projetos.");
      if (!clientsResponse.ok) throw new Error(clientsData.error || "Erro ao carregar clientes.");
      setProjects(projectsData);
      setClients(clientsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function editProject(project: Project) {
    setEditingId(project.id);
    setForm({
      name: project.name,
      clientId: project.clientId ?? "",
      status: project.status,
      periodStart: project.periodStart ? project.periodStart.slice(0, 10) : "",
      periodEnd: project.periodEnd ? project.periodEnd.slice(0, 10) : "",
      prescriptionDate: project.prescriptionDate ? project.prescriptionDate.slice(0, 10) : "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveProject(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(editingId ? `/api/projetos/${editingId}` : "/api/projetos", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível salvar o projeto.");
      resetForm();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o projeto.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProject(project: Project) {
    if (!window.confirm(`Deseja realmente excluir o projeto "${project.name}"?`)) return;
    setError("");
    try {
      const response = await fetch(`/api/projetos/${project.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível excluir o projeto.");
      if (editingId === project.id) resetForm();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível excluir o projeto.");
    }
  }

  const filteredProjects = useMemo(() => projects.filter((project) => {
    const term = search.toLowerCase().trim();
    const matchesSearch = !term || [project.name, project.client?.name ?? "", labelStatus(project.status)].join(" ").toLowerCase().includes(term);
    const matchesStatus = !statusFilter || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [projects, search, statusFilter]);

  return (
    <AppShell title="Projetos" subtitle="Cadastro e gestão dos projetos tributários.">
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-navy">{editingId ? "Editar projeto" : "Novo projeto"}</h2>
              <p className="text-sm text-muted">Vincule o projeto a um cliente e acompanhe sua etapa.</p>
            </div>
            {editingId ? <button type="button" onClick={resetForm} className="rounded-md border border-border px-4 py-2 text-sm">Cancelar</button> : null}
          </div>

          <form onSubmit={saveProject} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="xl:col-span-2">
              <span className="mb-1 block text-sm font-medium">Nome do projeto *</span>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-md border border-border px-3 py-2" placeholder="Ex.: Auditoria fiscal 2024" />
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium">Cliente</span>
              <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className="w-full rounded-md border border-border px-3 py-2">
                <option value="">Sem cliente</option>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium">Status *</span>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full rounded-md border border-border px-3 py-2">
                {statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium">Período inicial</span>
              <input type="date" value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} className="w-full rounded-md border border-border px-3 py-2" />
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium">Período final</span>
              <input type="date" value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} className="w-full rounded-md border border-border px-3 py-2" />
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium">Data de prescrição</span>
              <input type="date" value={form.prescriptionDate} onChange={(e) => setForm({ ...form, prescriptionDate: e.target.value })} className="w-full rounded-md border border-border px-3 py-2" />
            </label>
            <div className="flex items-end xl:col-span-2">
              <button disabled={saving} className="w-full rounded-md bg-navy px-4 py-2 font-medium text-white disabled:opacity-50">
                {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Cadastrar projeto"}
              </button>
            </div>
          </form>
        </div>

        {error ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <div className="rounded-xl border border-border bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-navy">Projetos cadastrados</h2>
              <p className="text-sm text-muted">{filteredProjects.length} projeto(s) exibido(s).</p>
            </div>
            <div className="flex gap-2">
              <input value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-md border border-border px-3 py-2 text-sm" placeholder="Buscar projeto ou cliente..." />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-border px-3 py-2 text-sm">
                <option value="">Todos os status</option>
                {statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
          </div>

          {loading ? <div className="p-6 text-sm text-muted">Carregando projetos...</div> : filteredProjects.length === 0 ? <div className="p-8 text-center text-sm text-muted">Nenhum projeto encontrado.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-slate-50">
                  <tr>
                    <th className="px-5 py-3">Projeto</th><th className="px-5 py-3">Cliente</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Período</th><th className="px-5 py-3">Prescrição</th><th className="px-5 py-3">Vínculos</th><th className="px-5 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map((project) => (
                    <tr key={project.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-4 font-medium text-navy">{project.name}</td>
                      <td className="px-5 py-4 text-muted">{project.client?.name ?? "—"}</td>
                      <td className="px-5 py-4"><Badge value={project.status} /></td>
                      <td className="px-5 py-4 text-muted">{dateValue(project.periodStart)} – {dateValue(project.periodEnd)}</td>
                      <td className="px-5 py-4 text-muted">{dateValue(project.prescriptionDate)}</td>
                      <td className="px-5 py-4 text-xs text-muted">Docs {project._count.documents} · Inc. {project._count.inconsistencies} · Créditos {project._count.taxCredits}</td>
                      <td className="px-5 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => editProject(project)} className="rounded-md border border-border px-3 py-1.5">Editar</button><button type="button" onClick={() => deleteProject(project)} className="rounded-md border border-red-200 px-3 py-1.5 text-red-700">Excluir</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
