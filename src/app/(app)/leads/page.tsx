"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";

type CompanyType = "industria" | "comercio" | "revenda" | "servicos";
type LeadStatus =
  | "novo"
  | "qualificacao"
  | "reuniao_agendada"
  | "documentacao"
  | "analise_fiscal"
  | "proposta"
  | "contrato"
  | "aprovado"
  | "cancelado";

type Lead = {
  id: string;
  companyName: string;
  cnpj: string | null;
  companyType: CompanyType | null;
  contactName: string | null;
  contactEmail: string | null;
  phone: string | null;
  status: LeadStatus;
  estimatedValue: string | number;
  procurationSigned: boolean;
  ndaSigned: boolean;
  notes: string | null;
  createdAt: string;
};

const STATUS_COLUMNS: { key: LeadStatus; label: string }[] = [
  { key: "novo", label: "Novo" },
  { key: "qualificacao", label: "Qualificação" },
  { key: "reuniao_agendada", label: "Reunião agendada" },
  { key: "documentacao", label: "Documentação" },
  { key: "analise_fiscal", label: "Análise fiscal" },
  { key: "proposta", label: "Proposta" },
  { key: "contrato", label: "Contrato" },
  { key: "aprovado", label: "Aprovado" },
  { key: "cancelado", label: "Cancelado" },
];

const COMPANY_TYPES: { value: CompanyType; label: string }[] = [
  { value: "industria", label: "Indústria" },
  { value: "comercio", label: "Comércio" },
  { value: "revenda", label: "Revenda" },
  { value: "servicos", label: "Serviços" },
];

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type FormData = {
  companyName: string;
  cnpj: string;
  companyType: CompanyType | "";
  contactName: string;
  contactEmail: string;
  phone: string;
  status: LeadStatus;
  estimatedValue: string;
  procurationSigned: boolean;
  ndaSigned: boolean;
  notes: string;
};

const emptyForm: FormData = {
  companyName: "",
  cnpj: "",
  companyType: "",
  contactName: "",
  contactEmail: "",
  phone: "",
  status: "novo",
  estimatedValue: "",
  procurationSigned: false,
  ndaSigned: false,
  notes: "",
};

function formatCnpj(digits: string) {
  const d = digits.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function isEmailValid(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/leads", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar leads.");
      setLeads(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar leads.");
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
    setFieldErrors({});
  }
  function edit(lead: Lead) {
    setEditingId(lead.id);
    setForm({
      companyName: lead.companyName,
      cnpj: lead.cnpj ?? "",
      companyType: lead.companyType ?? "",
      contactName: lead.contactName ?? "",
      contactEmail: lead.contactEmail ?? "",
      phone: lead.phone ?? "",
      status: lead.status,
      estimatedValue: String(lead.estimatedValue ?? ""),
      procurationSigned: lead.procurationSigned,
      ndaSigned: lead.ndaSigned,
      notes: lead.notes ?? "",
    });
    setFieldErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (!form.companyName.trim()) errs.companyName = "Campo obrigatório.";
    const cnpjDigits = form.cnpj.replace(/\D/g, "");
    if (form.cnpj && cnpjDigits.length !== 14) errs.cnpj = "O CNPJ deve ter 14 dígitos.";
    if (form.contactEmail && !isEmailValid(form.contactEmail)) errs.contactEmail = "E-mail inválido.";
    if (form.estimatedValue && (Number.isNaN(Number(form.estimatedValue)) || Number(form.estimatedValue) < 0)) {
      errs.estimatedValue = "Informe um valor numérico válido.";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(editingId ? `/api/leads/${editingId}` : "/api/leads", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, cnpj: form.cnpj.replace(/\D/g, "") || null, companyType: form.companyType || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível salvar o lead.");
      reset();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar lead.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(lead: Lead) {
    if (!window.confirm(`Excluir o lead "${lead.companyName}"?`)) return;
    setError("");
    try {
      const res = await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao excluir lead.");
    }
  }

  async function moveStatus(lead: Lead, status: LeadStatus) {
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: lead.companyName,
          cnpj: lead.cnpj,
          companyType: lead.companyType,
          contactName: lead.contactName,
          contactEmail: lead.contactEmail,
          phone: lead.phone,
          status,
          estimatedValue: lead.estimatedValue,
          procurationSigned: lead.procurationSigned,
          ndaSigned: lead.ndaSigned,
          notes: lead.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao mover lead.");
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return leads;
    return leads.filter((l) => [l.companyName, l.cnpj ?? "", l.contactName ?? "", l.contactEmail ?? ""].join(" ").toLowerCase().includes(q));
  }, [leads, search]);

  const kpis = useMemo(() => {
    const ativos = leads.filter((l) => l.status !== "aprovado" && l.status !== "cancelado").length;
    const comProcuracao = leads.filter((l) => l.procurationSigned).length;
    const semNda = leads.filter((l) => !l.ndaSigned).length;
    return { ativos, comProcuracao, semNda };
  }, [leads]);

  return (
    <AppShell title="Gestão de leads" subtitle="Cadastro, qualificação e acompanhamento do pipeline até a aprovação final.">
      <div className="space-y-6">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{editingId ? "Editar lead" : "Novo lead"}</CardTitle>
              <p className="text-sm text-muted">Razão social, CNPJ, tipo de empresa, responsável, e-mail e telefone.</p>
            </div>
            {editingId && (
              <button type="button" onClick={reset} className="rounded-md border px-3 py-2 text-sm">
                Cancelar
              </button>
            )}
          </div>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-4">
            <label className="md:col-span-2">
              <span className="mb-1 block text-sm font-medium">Razão social *</span>
              <input
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                className={`w-full rounded-md border px-3 py-2 ${fieldErrors.companyName ? "border-red-400" : ""}`}
                placeholder="Ex.: Metalúrgica Sul Ltda"
              />
              {fieldErrors.companyName && <span className="mt-1 block text-xs text-red-600">{fieldErrors.companyName}</span>}
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium">CNPJ</span>
              <input
                value={form.cnpj}
                onChange={(e) => setForm({ ...form, cnpj: formatCnpj(e.target.value) })}
                className={`w-full rounded-md border px-3 py-2 ${fieldErrors.cnpj ? "border-red-400" : ""}`}
                placeholder="00.000.000/0000-00"
                maxLength={18}
              />
              {fieldErrors.cnpj && <span className="mt-1 block text-xs text-red-600">{fieldErrors.cnpj}</span>}
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium">Tipo de empresa</span>
              <select value={form.companyType} onChange={(e) => setForm({ ...form, companyType: e.target.value as CompanyType | "" })} className="w-full rounded-md border px-3 py-2">
                <option value="">Selecione</option>
                {COMPANY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium">Responsável</span>
              <input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className="w-full rounded-md border px-3 py-2" placeholder="Nome do contato" />
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium">E-mail</span>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                className={`w-full rounded-md border px-3 py-2 ${fieldErrors.contactEmail ? "border-red-400" : ""}`}
                placeholder="contato@empresa.com.br"
              />
              {fieldErrors.contactEmail && <span className="mt-1 block text-xs text-red-600">{fieldErrors.contactEmail}</span>}
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium">Telefone</span>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-md border px-3 py-2" placeholder="(00) 00000-0000" />
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium">Status</span>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as LeadStatus })} className="w-full rounded-md border px-3 py-2">
                {STATUS_COLUMNS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium">Crédito estimado (R$)</span>
              <input
                value={form.estimatedValue}
                onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })}
                className={`w-full rounded-md border px-3 py-2 ${fieldErrors.estimatedValue ? "border-red-400" : ""}`}
                placeholder="0,00"
                inputMode="decimal"
              />
              {fieldErrors.estimatedValue && <span className="mt-1 block text-xs text-red-600">{fieldErrors.estimatedValue}</span>}
            </label>
            <label className="flex items-center gap-2 md:col-span-2">
              <input type="checkbox" checked={form.procurationSigned} onChange={(e) => setForm({ ...form, procurationSigned: e.target.checked })} />
              <span className="text-sm font-medium">Procuração assinada</span>
            </label>
            <label className="flex items-center gap-2 md:col-span-2">
              <input type="checkbox" checked={form.ndaSigned} onChange={(e) => setForm({ ...form, ndaSigned: e.target.checked })} />
              <span className="text-sm font-medium">NDA assinado</span>
            </label>
            <label className="md:col-span-4">
              <span className="mb-1 block text-sm font-medium">Observações</span>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full rounded-md border px-3 py-2" rows={2} />
            </label>
            <div className="flex items-end md:col-span-4">
              <button disabled={saving} className="rounded-md bg-navy px-5 py-2 font-medium text-white disabled:opacity-50">
                {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Cadastrar lead"}
              </button>
            </div>
          </form>
        </Card>

        {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardTitle>Leads ativos</CardTitle>
            <p className="mt-2 text-2xl font-bold text-navy">{kpis.ativos}</p>
          </Card>
          <Card>
            <CardTitle>Com procuração</CardTitle>
            <p className="mt-2 text-2xl font-bold text-green-700">{kpis.comProcuracao}</p>
          </Card>
          <Card>
            <CardTitle>Sem NDA</CardTitle>
            <p className="mt-2 text-2xl font-bold text-yellow-700">{kpis.semNda}</p>
          </Card>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Pipeline de leads</h2>
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-md border px-3 py-2 text-sm" placeholder="Buscar por empresa, CNPJ ou contato..." />
          </div>
          {loading ? (
            <p className="text-sm text-muted">Carregando...</p>
          ) : (
            <div className="grid gap-4 overflow-x-auto md:grid-cols-3 xl:grid-cols-5">
              {STATUS_COLUMNS.map((col) => {
                const items = filtered.filter((l) => l.status === col.key);
                return (
                  <Card key={col.key} className="min-w-56">
                    <CardTitle className="flex items-center justify-between text-sm">
                      {col.label}
                      <span className="text-xs font-normal text-muted">{items.length}</span>
                    </CardTitle>
                    <div className="mt-3 space-y-2">
                      {items.map((l) => (
                        <div key={l.id} className="rounded-md border border-border p-3">
                          <p className="text-sm font-medium">{l.companyName}</p>
                          <p className="text-xs text-muted">{l.contactName || "—"}</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {l.companyType && <Badge value={l.companyType} />}
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${l.procurationSigned ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                              {l.procurationSigned ? "Procuração ok" : "Sem procuração"}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${l.ndaSigned ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                              {l.ndaSigned ? "NDA ok" : "Sem NDA"}
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-medium tabular-nums text-navy">{brl.format(Number(l.estimatedValue))}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <select
                              value={l.status}
                              onChange={(e) => moveStatus(l, e.target.value as LeadStatus)}
                              className="rounded-md border px-2 py-1 text-xs"
                            >
                              {STATUS_COLUMNS.map((s) => (
                                <option key={s.key} value={s.key}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                            <button type="button" onClick={() => edit(l)} className="rounded-md border px-2 py-1 text-xs">
                              Editar
                            </button>
                            <button type="button" onClick={() => remove(l)} className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700">
                              Excluir
                            </button>
                          </div>
                        </div>
                      ))}
                      {items.length === 0 ? <p className="text-xs text-muted">Sem leads nesta fase.</p> : null}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-xs text-muted">
          Alerta de prescrição: o prazo para recuperação de créditos tributários é de <strong>5 anos</strong>. Acompanhe o risco de
          prescrição por projeto na tela de <strong>Workflow tributário</strong>.
        </p>
      </div>
    </AppShell>
  );
}
