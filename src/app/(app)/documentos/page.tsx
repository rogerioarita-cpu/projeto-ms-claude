"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";

type Project = { id: string; name: string; client?: { name: string } | null };
type DocumentItem = {
  id: string; name: string; docType: string | null; version: number; storagePath: string | null;
  createdAt: string; project?: Project | null; uploadedBy?: { name: string | null; email: string } | null;
};

type FormData = { name: string; docType: string; version: string; storagePath: string; projectId: string };
const initialForm: FormData = { name: "", docType: "", version: "1", storagePath: "", projectId: "" };

export default function DocumentosPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [form, setForm] = useState<FormData>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const [docsRes, projectsRes] = await Promise.all([fetch("/api/documentos", { cache: "no-store" }), fetch("/api/projetos", { cache: "no-store" })]);
      const docs = await docsRes.json(); const projs = await projectsRes.json();
      if (!docsRes.ok) throw new Error(docs.error || "Erro ao carregar documentos.");
      setDocuments(docs);
      if (projectsRes.ok) setProjects(projs);
    } catch (e) { setError(e instanceof Error ? e.message : "Erro ao carregar dados."); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  function reset() { setForm(initialForm); setEditingId(null); }
  function edit(d: DocumentItem) {
    setEditingId(d.id); setForm({ name: d.name, docType: d.docType ?? "", version: String(d.version), storagePath: d.storagePath ?? "", projectId: d.project?.id ?? "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function submit(e: FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const res = await fetch(editingId ? `/api/documentos/${editingId}` : "/api/documentos", { method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "Não foi possível salvar.");
      reset(); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Erro ao salvar."); }
    finally { setSaving(false); }
  }
  async function remove(d: DocumentItem) {
    if (!window.confirm(`Excluir o documento "${d.name}"?`)) return;
    try { const res = await fetch(`/api/documentos/${d.id}`, { method: "DELETE" }); const data = await res.json(); if (!res.ok) throw new Error(data.error); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Erro ao excluir."); }
  }
  const filtered = useMemo(() => documents.filter(d => {
    const q = search.toLowerCase().trim(); const hay = [d.name, d.docType ?? "", d.project?.name ?? "", d.project?.client?.name ?? ""].join(" ").toLowerCase();
    return (!q || hay.includes(q)) && (!typeFilter || d.docType === typeFilter);
  }), [documents, search, typeFilter]);
  const types = Array.from(new Set(documents.map(d => d.docType).filter(Boolean) as string[])).sort();

  return <AppShell title="Gestão documental" subtitle="Documentos versionados e rastreáveis por projeto.">
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between"><div><h2 className="text-base font-semibold">{editingId ? "Editar documento" : "Novo documento"}</h2><p className="text-sm text-muted">Cadastre e mantenha o vínculo do documento com o projeto.</p></div>{editingId && <button type="button" onClick={reset} className="rounded-md border px-3 py-2 text-sm">Cancelar</button>}</div>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-4">
          <label className="md:col-span-2"><span className="mb-1 block text-sm font-medium">Nome *</span><input required value={form.name} onChange={e => setForm({...form,name:e.target.value})} className="w-full rounded-md border px-3 py-2" placeholder="Ex.: EFD ICMS IPI - 01/2026" /></label>
          <label><span className="mb-1 block text-sm font-medium">Tipo</span><input value={form.docType} onChange={e => setForm({...form,docType:e.target.value})} className="w-full rounded-md border px-3 py-2" placeholder="SPED, contrato, laudo..." /></label>
          <label><span className="mb-1 block text-sm font-medium">Versão *</span><input required min="1" type="number" value={form.version} onChange={e => setForm({...form,version:e.target.value})} className="w-full rounded-md border px-3 py-2" /></label>
          <label className="md:col-span-2"><span className="mb-1 block text-sm font-medium">Projeto</span><select value={form.projectId} onChange={e => setForm({...form,projectId:e.target.value})} className="w-full rounded-md border px-3 py-2"><option value="">Sem projeto</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}{p.client ? ` — ${p.client.name}` : ""}</option>)}</select></label>
          <label className="md:col-span-2"><span className="mb-1 block text-sm font-medium">Caminho / referência do arquivo</span><input value={form.storagePath} onChange={e => setForm({...form,storagePath:e.target.value})} className="w-full rounded-md border px-3 py-2" placeholder="Ex.: /documentos/cliente/arquivo.pdf" /></label>
          <div className="flex items-end md:col-span-4"><button disabled={saving} className="rounded-md bg-navy px-5 py-2 font-medium text-white disabled:opacity-50">{saving ? "Salvando..." : editingId ? "Salvar alterações" : "Cadastrar documento"}</button></div>
        </form>
      </div>
      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="rounded-xl border border-border bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b p-5 md:flex-row md:items-center md:justify-between"><div><h2 className="text-base font-semibold">Documentos cadastrados</h2><p className="text-sm text-muted">{documents.length} documento(s)</p></div><div className="flex gap-2"><input value={search} onChange={e => setSearch(e.target.value)} className="rounded-md border px-3 py-2 text-sm" placeholder="Buscar..." /><select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="rounded-md border px-3 py-2 text-sm"><option value="">Todos os tipos</option>{types.map(t => <option key={t}>{t}</option>)}</select></div></div>
        {loading ? <div className="p-6 text-sm text-muted">Carregando...</div> : filtered.length === 0 ? <div className="p-8 text-center text-sm text-muted">Nenhum documento encontrado.</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-left text-xs uppercase text-muted"><th className="px-5 py-3">Nome</th><th className="px-5 py-3">Tipo</th><th className="px-5 py-3">Versão</th><th className="px-5 py-3">Projeto / Cliente</th><th className="px-5 py-3">Enviado por</th><th className="px-5 py-3">Data</th><th className="px-5 py-3 text-right">Ações</th></tr></thead><tbody>{filtered.map(d => <tr key={d.id} className="border-b border-border last:border-0"><td className="px-5 py-3 font-medium">{d.name}</td><td className="px-5 py-3">{d.docType || "—"}</td><td className="px-5 py-3">v{d.version}</td><td className="px-5 py-3">{d.project?.name || "—"}<br/><span className="text-xs text-muted">{d.project?.client?.name || ""}</span></td><td className="px-5 py-3">{d.uploadedBy?.name || d.uploadedBy?.email || "—"}</td><td className="px-5 py-3">{new Date(d.createdAt).toLocaleDateString("pt-BR")}</td><td className="px-5 py-3"><div className="flex justify-end gap-2"><button type="button" onClick={() => edit(d)} className="rounded-md border px-3 py-1.5">Editar</button><button type="button" onClick={() => remove(d)} className="rounded-md border border-red-200 px-3 py-1.5 text-red-700">Excluir</button></div></td></tr>)}</tbody></table></div>}
      </div>
    </div>
  </AppShell>;
}
