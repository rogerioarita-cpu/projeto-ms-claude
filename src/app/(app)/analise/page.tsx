"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardTitle } from "@/components/ui/Card";
import { AnaliseCascade } from "@/components/analise/AnaliseCascade";

type Lead = { id: string; companyName: string; isClient?: boolean };
type UserOption = { id: string; name: string | null; email: string };
type TaxType = "pis_cofins" | "icms" | "ipi" | "irpj_csll" | "outros";
type AnaliseStatus = "em_andamento" | "concluida" | "aprovada" | "rejeitada";

type ChecklistItem = { id: string; description: string; done: boolean; order: number };
type Approval = { id: string; area: string; status: string };

type Analise = {
  id: string;
  taxType: TaxType;
  thesis: string;
  periodStart: string;
  periodEnd: string;
  estimatedCredit: string | number;
  status: AnaliseStatus;
  diagnosis: string | null;
  createdAt: string;
  lead?: Lead | null;
  analyst?: UserOption | null;
  checklist: ChecklistItem[];
  approvals: Approval[];
};

const TAX_TYPES: { value: TaxType; label: string }[] = [
  { value: "pis_cofins", label: "PIS/COFINS" },
  { value: "icms", label: "ICMS" },
  { value: "ipi", label: "IPI" },
  { value: "irpj_csll", label: "IRPJ/CSLL" },
  { value: "outros", label: "Outros" },
];

const STATUS_OPTIONS: { value: AnaliseStatus; label: string }[] = [
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluida", label: "Concluída" },
  { value: "aprovada", label: "Aprovada" },
  { value: "rejeitada", label: "Rejeitada" },
];

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type FormData = {
  leadId: string;
  taxType: TaxType;
  analystId: string;
  thesis: string;
  periodStart: string;
  periodEnd: string;
  estimatedCredit: string;
  diagnosis: string;
  status: AnaliseStatus;
  checklist: string[];
};

const emptyForm: FormData = {
  leadId: "",
  taxType: "pis_cofins",
  analystId: "",
  thesis: "",
  periodStart: "",
  periodEnd: "",
  estimatedCredit: "",
  diagnosis: "",
  status: "em_andamento",
  checklist: [""],
};

export default function AnaliseFiscalPage() {
  const [analises, setAnalises] = useState<Analise[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [onlyClientLeads, setOnlyClientLeads] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [analisesRes, leadsRes, usersRes] = await Promise.all([
        fetch("/api/analises", { cache: "no-store" }),
        fetch("/api/leads", { cache: "no-store" }),
        fetch("/api/users", { cache: "no-store" }),
      ]);
      const data = await analisesRes.json();
      if (!analisesRes.ok) throw new Error(data.error || "Erro ao carregar análises.");
      setAnalises(data);
      if (leadsRes.ok) setLeads(await leadsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function reset() {
    setForm(emptyForm);
    setEditingId(null);
  }
  function edit(a: Analise) {
    setEditingId(a.id);
    setForm({
      leadId: a.lead?.id ?? "",
      taxType: a.taxType,
      analystId: a.analyst?.id ?? "",
      thesis: a.thesis,
      periodStart: a.periodStart,
      periodEnd: a.periodEnd,
      estimatedCredit: String(a.estimatedCredit ?? ""),
      diagnosis: a.diagnosis ?? "",
      status: a.status,
      checklist: a.checklist.length ? a.checklist.map((c) => c.description) : [""],
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.leadId) {
      setError("Selecione o lead.");
      return;
    }
    if (!form.thesis.trim()) {
      setError("Informe a tese tributária.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        analystId: form.analystId || null,
        checklist: form.checklist.filter((c) => c.trim()),
      };
      const res = await fetch(editingId ? `/api/analises/${editingId}` : "/api/analises", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível salvar a análise.");
      reset();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar análise.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(a: Analise) {
    if (!window.confirm(`Excluir a análise de "${a.lead?.companyName}"?`)) return;
    try {
      const res = await fetch(`/api/analises/${a.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao excluir análise.");
    }
  }

  async function toggleChecklistItem(item: ChecklistItem) {
    try {
      const res = await fetch(`/api/checklist/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !item.done }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao atualizar checklist.");
    }
  }

  const kpis = useMemo(() => {
    const ativas = analises.filter((a) => a.status !== "rejeitada");
    const emAndamento = analises.filter((a) => a.status === "em_andamento").length;
    const creditoTotal = ativas.reduce((sum, a) => sum + Number(a.estimatedCredit ?? 0), 0);
    return { ativas: ativas.length, emAndamento, creditoTotal };
  }, [analises]);

  const leadOptions = useMemo(
    () =>
      [...leads]
        .filter((l) => !onlyClientLeads || l.isClient)
        .sort((a, b) => a.companyName.localeCompare(b.companyName, "pt-BR")),
    [leads, onlyClientLeads]
  );

  return (
    <AppShell title="Análise fiscal" subtitle="Teses tributárias, diagnóstico e checklist de validação por lead.">
      <div className="space-y-6">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <CardTitle className="text-base">{editingId ? "Editar análise" : "Nova análise fiscal"}</CardTitle>
            {editingId && (
              <button type="button" onClick={reset} className="rounded-md border px-3 py-2 text-sm">
                Cancelar
              </button>
            )}
          </div>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-4">
            <label>
              <span className="mb-1 flex items-center justify-between text-sm font-medium">
                <span>Lead/clientes *</span>
                <span className="flex items-center gap-1 text-sm font-bold" title="Mostrar apenas leads marcados como cliente.">
                  <input
                    type="checkbox"
                    checked={onlyClientLeads}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setOnlyClientLeads(checked);
                      // Se o lead selecionado não for cliente, limpa a seleção ao ativar o filtro.
                      if (checked) {
                        const currentLead = leads.find((l) => l.id === form.leadId);
                        if (currentLead && !currentLead.isClient) {
                          setForm({ ...form, leadId: "" });
                        }
                      }
                    }}
                  />
                  Cliente
                </span>
              </span>
              <select value={form.leadId} onChange={(e) => setForm({ ...form, leadId: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm">
                <option value="">Selecione o lead/cliente</option>
                {leadOptions.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.companyName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium">Tipo de imposto *</span>
              <select value={form.taxType} onChange={(e) => setForm({ ...form, taxType: e.target.value as TaxType })} className="w-full rounded-md border px-3 py-2 text-sm">
                {TAX_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium">Analista</span>
              <select value={form.analystId} onChange={(e) => setForm({ ...form, analystId: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm">
                <option value="">Não atribuído</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium">Status</span>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AnaliseStatus })} className="w-full rounded-md border px-3 py-2 text-sm">
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="md:col-span-2">
              <span className="mb-1 block text-sm font-medium">Tese tributária *</span>
              <input value={form.thesis} onChange={(e) => setForm({ ...form, thesis: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Ex.: Exclusão do ICMS da base do PIS/COFINS" />
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium">Período início *</span>
              <input value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="2021-01" />
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium">Período fim *</span>
              <input value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="2025-12" />
            </label>
            <label className="md:col-span-2">
              <span className="mb-1 block text-sm font-medium">Crédito estimado (R$)</span>
              <input value={form.estimatedCredit} onChange={(e) => setForm({ ...form, estimatedCredit: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="0,00" inputMode="decimal" />
            </label>
            <label className="md:col-span-2">
              <span className="mb-1 block text-sm font-medium">Diagnóstico preliminar</span>
              <textarea value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" rows={2} />
            </label>

            <div className="md:col-span-4">
              <span className="mb-1 block text-sm font-medium">Checklist</span>
              <div className="space-y-2">
                {form.checklist.map((item, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      value={item}
                      onChange={(e) => {
                        const next = [...form.checklist];
                        next[idx] = e.target.value;
                        setForm({ ...form, checklist: next });
                      }}
                      className="w-full rounded-md border px-3 py-2 text-sm"
                      placeholder={`Item ${idx + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, checklist: form.checklist.filter((_, i) => i !== idx) })}
                      className="rounded-md border px-3 py-2 text-sm"
                    >
                      Remover
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => setForm({ ...form, checklist: [...form.checklist, ""] })} className="rounded-md border px-3 py-1.5 text-sm">
                  + Adicionar item
                </button>
              </div>
            </div>

            <div className="flex items-end md:col-span-4">
              <button disabled={saving} className="rounded-md bg-navy px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
                {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Cadastrar análise"}
              </button>
            </div>
          </form>
        </Card>

        {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardTitle>Análises ativas</CardTitle>
            <p className="mt-2 text-2xl font-bold text-navy">{kpis.ativas}</p>
          </Card>
          <Card>
            <CardTitle>Em andamento</CardTitle>
            <p className="mt-2 text-2xl font-bold text-yellow-700">{kpis.emAndamento}</p>
          </Card>
          <Card>
            <CardTitle>Crédito estimado total</CardTitle>
            <p className="mt-2 text-2xl font-bold text-green-700">{brl.format(kpis.creditoTotal)}</p>
          </Card>
        </div>

        {loading ? (
          <p className="text-sm text-muted">Carregando...</p>
        ) : (
          <AnaliseCascade analises={analises} onEdit={edit} onRemove={remove} onToggleChecklist={toggleChecklistItem} />
        )}
      </div>
    </AppShell>
  );
}
