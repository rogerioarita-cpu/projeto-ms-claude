"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardTitle } from "@/components/ui/Card";
import { isValidCnpj, onlyDigitsCnpj } from "@/lib/cnpj";

type Client = { id: string; name: string; cnpj: string | null; segment: string | null; createdAt: string; _count?: { projects: number } };
type SortField = "name" | "cnpj";

const emptyForm = { name: "", cnpj: "", segment: "" };

function maskCnpj(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 14);
  return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4").replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}

function formatCnpj(value: string | null) {
  if (!value) return "—";
  const d = value.replace(/\D/g, "");
  return d.length === 14 ? maskCnpj(d) : value;
}

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [cnpjFieldError, setCnpjFieldError] = useState("");
  const cnpjInputRef = useRef<HTMLInputElement>(null);

  async function loadClients() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/clientes", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao carregar clientes.");
      setClients(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Erro ao carregar clientes."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void loadClients(); }, []);

  function resetForm() { setForm(emptyForm); setEditingId(null); setCnpjFieldError(""); }

  function editClient(client: Client) {
    setEditingId(client.id);
    setForm({ name: client.name, cnpj: client.cnpj ? formatCnpj(client.cnpj) : "", segment: client.segment ?? "" });
    setCnpjFieldError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Valida o CNPJ assim que o campo perde o foco. Se estiver incompleto ou
  // com dígitos verificadores inválidos, mostra o erro e devolve o foco para
  // o campo, impedindo o usuário de seguir para o próximo enquanto o CNPJ
  // não estiver correto.
  function handleCnpjBlur() {
    const digits = onlyDigitsCnpj(form.cnpj);
    if (!digits) { setCnpjFieldError("CNPJ é obrigatório."); setTimeout(() => cnpjInputRef.current?.focus(), 0); return; }
    if (!isValidCnpj(digits)) {
      setCnpjFieldError("CNPJ inválido. Verifique os números informados.");
      setTimeout(() => cnpjInputRef.current?.focus(), 0);
      return;
    }
    setCnpjFieldError("");
  }

  async function saveClient(event: FormEvent) {
    event.preventDefault(); setError("");

    const cnpjDigits = onlyDigitsCnpj(form.cnpj);
    if (!cnpjDigits) { setCnpjFieldError("CNPJ é obrigatório."); cnpjInputRef.current?.focus(); return; }
    if (!isValidCnpj(cnpjDigits)) { setCnpjFieldError("CNPJ inválido. Verifique os números informados."); cnpjInputRef.current?.focus(); return; }

    setSaving(true);
    try {
      const response = await fetch(editingId ? `/api/clientes/${editingId}` : "/api/clientes", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível salvar o cliente.");
      resetForm(); await loadClients();
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar o cliente."); }
    finally { setSaving(false); }
  }

  async function deleteClient(client: Client) {
    if (!window.confirm(`Deseja realmente excluir \"${client.name}\"?`)) return;
    setError("");
    try {
      const response = await fetch(`/api/clientes/${client.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível excluir o cliente.");
      if (editingId === client.id) resetForm();
      await loadClients();
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível excluir o cliente."); }
  }

  const filteredClients = useMemo(() => {
    const term = search.toLowerCase().trim();
    const base = !term ? clients : clients.filter(c => [c.name, c.cnpj ?? "", c.segment ?? ""].join(" ").toLowerCase().includes(term));
    // Ordem alfabética crescente por nome ou por CNPJ, conforme selecionado (padrão: nome).
    return [...base].sort((a, b) => {
      if (sortField === "cnpj") return formatCnpj(a.cnpj).localeCompare(formatCnpj(b.cnpj), "pt-BR", { sensitivity: "base" });
      return a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
    });
  }, [clients, search, sortField]);

  return (
    <AppShell title="Clientes" subtitle="Cadastro e gestão dos clientes do Projeto MS.">
      <div className="space-y-5">
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">{editingId ? "Editar cliente" : "Novo cliente"}</CardTitle>
              <p className="mt-1 text-sm text-muted">Preencha os dados básicos do cliente.</p>
            </div>
            {editingId ? <button type="button" onClick={resetForm} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-slate-50">Cancelar</button> : null}
          </div>

          <form onSubmit={saveClient} className="mt-4 grid gap-4 md:grid-cols-4">
            <label>
              <span className="mb-1 block text-sm font-medium">CNPJ *</span>
              <input
                ref={cnpjInputRef}
                required
                value={form.cnpj}
                onChange={e => { setForm({ ...form, cnpj: maskCnpj(e.target.value) }); if (cnpjFieldError) setCnpjFieldError(""); }}
                onBlur={handleCnpjBlur}
                className={`w-full rounded-md border px-3 py-2 text-sm outline-none ${cnpjFieldError ? "border-red-400 focus:border-red-500" : "border-border focus:border-navy"}`}
                placeholder="00.000.000/0000-00"
                aria-invalid={Boolean(cnpjFieldError)}
              />
              {cnpjFieldError ? <span className="mt-1 block text-xs text-red-600">{cnpjFieldError}</span> : null}
            </label>
            <label className="md:col-span-2"><span className="mb-1 block text-sm font-medium">Nome / Razão social *</span><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-navy" placeholder="Razão social" /></label>
            <label><span className="mb-1 block text-sm font-medium">Segmento</span><input value={form.segment} onChange={e => setForm({ ...form, segment: e.target.value })} className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-navy" placeholder="Ex.: Indústria" /></label>
            <div className="md:col-span-4 flex justify-end"><button disabled={saving} className="rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">{saving ? "Salvando..." : editingId ? "Salvar alterações" : "Cadastrar cliente"}</button></div>
          </form>
        </Card>

        {error ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><CardTitle className="text-base">Clientes cadastrados</CardTitle><p className="mt-1 text-sm text-muted">{filteredClients.length} de {clients.length} cliente(s)</p></div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="flex items-center gap-2 text-sm">
                <span className="text-muted">Ordenar por</span>
                <select value={sortField} onChange={e => setSortField(e.target.value as SortField)} className="rounded-md border border-border px-2 py-2 text-sm outline-none">
                  <option value="name">Nome (A–Z)</option>
                  <option value="cnpj">CNPJ (crescente)</option>
                </select>
              </label>
              <input value={search} onChange={e => setSearch(e.target.value)} className="rounded-md border border-border px-3 py-2 text-sm outline-none" placeholder="Buscar cliente..." />
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            {loading ? <p className="py-6 text-sm text-muted">Carregando clientes...</p> : filteredClients.length === 0 ? <p className="py-8 text-center text-sm text-muted">Nenhum cliente encontrado.</p> : (
              <table className="w-full text-sm"><thead><tr className="border-b border-border text-left text-xs uppercase text-muted"><th className="py-2 pr-4">Cliente</th><th className="py-2 pr-4">CNPJ</th><th className="py-2 pr-4">Segmento</th><th className="py-2 pr-4">Projetos</th><th className="py-2 text-right">Ações</th></tr></thead><tbody>
                {filteredClients.map(client => <tr key={client.id} className="border-b border-border last:border-0"><td className="py-3 pr-4 font-medium">{client.name}</td><td className="py-3 pr-4">{formatCnpj(client.cnpj)}</td><td className="py-3 pr-4 text-muted">{client.segment || "—"}</td><td className="py-3 pr-4">{client._count?.projects ?? 0}</td><td className="py-3 text-right"><div className="flex justify-end gap-2"><button type="button" onClick={() => editClient(client)} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-slate-50">Editar</button><button type="button" onClick={() => deleteClient(client)} className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">Excluir</button></div></td></tr>)}
              </tbody></table>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
