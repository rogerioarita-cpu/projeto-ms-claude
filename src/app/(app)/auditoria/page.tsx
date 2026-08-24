"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";

type Project = { id: string; name: string; client?: { name: string } | null };
type Inconsistency = {
  id: string; code: string; description: string;
  severity: "baixa" | "media" | "alta" | "critica";
  resolved: boolean; projectId: string | null;
  project?: Project | null;
};

type FormData = { code: string; description: string; severity: Inconsistency["severity"]; projectId: string; resolved: boolean };
const emptyForm: FormData = { code: "", description: "", severity: "media", projectId: "", resolved: false };

export default function AuditoriaPage() {
  const [items, setItems] = useState<Inconsistency[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"todos" | "abertas" | "resolvidas">("todos");
  const [severity, setSeverity] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [a, p] = await Promise.all([fetch("/api/auditoria", { cache: "no-store" }), fetch("/api/projetos", { cache: "no-store" })]);
      const ad = await a.json(); const pd = await p.json();
      if (!a.ok) throw new Error(ad.error || "Erro ao carregar auditoria.");
      setItems(ad); setProjects(p.ok ? pd : []);
    } catch (e) { setError(e instanceof Error ? e.message : "Erro ao carregar auditoria."); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function reset() { setForm(emptyForm); setEditingId(null); }
  function edit(item: Inconsistency) {
    setEditingId(item.id);
    setForm({ code: item.code, description: item.description, severity: item.severity, projectId: item.projectId ?? "", resolved: item.resolved });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function submit(e: FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const r = await fetch(editingId ? `/api/auditoria/${editingId}` : "/api/auditoria", { method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "Erro ao salvar.");
      reset(); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Erro ao salvar."); }
    finally { setSaving(false); }
  }
  async function remove(item: Inconsistency) {
    if (!confirm(`Excluir a inconsistência ${item.code}?`)) return;
    setError("");
    try { const r = await fetch(`/api/auditoria/${item.id}`, { method: "DELETE" }); const d = await r.json(); if (!r.ok) throw new Error(d.error); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Erro ao excluir."); }
  }

  const filtered = useMemo(() => items.filter(i => {
    const q = search.toLowerCase().trim();
    const matchesQ = !q || [i.code, i.description, i.project?.name ?? "", i.project?.client?.name ?? ""].join(" ").toLowerCase().includes(q);
    const matchesStatus = status === "todos" || (status === "abertas" ? !i.resolved : i.resolved);
    const matchesSeverity = severity === "todos" || i.severity === severity;
    return matchesQ && matchesStatus && matchesSeverity;
  }), [items, search, status, severity]);

  const openCount = items.filter(i => !i.resolved).length;

  return <AppShell title="Auditoria SPED" subtitle="Inconsistências detectadas nas validações automatizadas.">
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div><h2 className="text-base font-semibold">{editingId ? "Editar inconsistência" : "Nova inconsistência"}</h2><p className="text-sm text-muted">Cadastre e acompanhe as ocorrências da auditoria.</p></div>
          {editingId && <button onClick={reset} className="rounded-md border px-3 py-2 text-sm">Cancelar</button>}
        </div>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-4">
          <label><span className="mb-1 block text-sm font-medium">Código *</span><input required value={form.code} onChange={e => setForm({...form, code:e.target.value})} className="w-full rounded-md border px-3 py-2" placeholder="Ex.: SPED-001" /></label>
          <label className="md:col-span-2"><span className="mb-1 block text-sm font-medium">Descrição *</span><input required value={form.description} onChange={e => setForm({...form, description:e.target.value})} className="w-full rounded-md border px-3 py-2" placeholder="Descreva a inconsistência" /></label>
          <label><span className="mb-1 block text-sm font-medium">Severidade</span><select value={form.severity} onChange={e => setForm({...form, severity:e.target.value as FormData["severity"]})} className="w-full rounded-md border px-3 py-2"><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option><option value="critica">Crítica</option></select></label>
          <label className="md:col-span-2"><span className="mb-1 block text-sm font-medium">Projeto</span><select value={form.projectId} onChange={e => setForm({...form, projectId:e.target.value})} className="w-full rounded-md border px-3 py-2"><option value="">Sem projeto</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}{p.client ? ` — ${p.client.name}` : ""}</option>)}</select></label>
          <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={form.resolved} onChange={e => setForm({...form, resolved:e.target.checked})} /> Resolvida</label>
          <button disabled={saving} className="self-end rounded-md bg-navy px-4 py-2 font-medium text-white disabled:opacity-50">{saving ? "Salvando..." : editingId ? "Salvar alterações" : "Cadastrar inconsistência"}</button>
        </form>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="rounded-xl border border-border bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border p-5 md:flex-row md:items-center md:justify-between"><div><h2 className="text-base font-semibold">{openCount} inconsistências em aberto</h2><p className="text-sm text-muted">{items.length} registro(s) no total.</p></div><div className="flex flex-wrap gap-2"><input value={search} onChange={e=>setSearch(e.target.value)} className="rounded-md border px-3 py-2 text-sm" placeholder="Buscar..." /><select value={status} onChange={e=>setStatus(e.target.value as typeof status)} className="rounded-md border px-3 py-2 text-sm"><option value="todos">Todos</option><option value="abertas">Em aberto</option><option value="resolvidas">Resolvidas</option></select><select value={severity} onChange={e=>setSeverity(e.target.value)} className="rounded-md border px-3 py-2 text-sm"><option value="todos">Todas severidades</option><option value="critica">Crítica</option><option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option></select></div></div>
        {loading ? <div className="p-6 text-sm text-muted">Carregando...</div> : filtered.length === 0 ? <div className="p-8 text-center text-sm text-muted">Nenhuma inconsistência encontrada.</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-left text-xs uppercase text-muted"><th className="px-5 py-3">Código</th><th className="px-5 py-3">Descrição</th><th className="px-5 py-3">Projeto / Cliente</th><th className="px-5 py-3">Severidade</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Ações</th></tr></thead><tbody>{filtered.map(i=><tr key={i.id} className="border-b border-border last:border-0"><td className="px-5 py-3 font-mono text-xs">{i.code}</td><td className="px-5 py-3">{i.description}</td><td className="px-5 py-3 text-muted">{i.project?.name || "—"}<br/><span className="text-xs">{i.project?.client?.name || ""}</span></td><td className="px-5 py-3"><Badge value={i.severity} /></td><td className="px-5 py-3">{i.resolved ? <span className="text-xs font-medium text-green-700">Resolvida</span> : <span className="text-xs font-medium text-red-600">Em aberto</span>}</td><td className="px-5 py-3"><div className="flex justify-end gap-2"><button onClick={()=>edit(i)} className="rounded-md border px-3 py-1.5">Editar</button><button onClick={()=>remove(i)} className="rounded-md border border-red-200 px-3 py-1.5 text-red-700">Excluir</button></div></td></tr>)}</tbody></table></div>}
      </div>
    </div>
  </AppShell>;
}
