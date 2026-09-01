"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import { LeadDocuments } from "@/components/leads/LeadDocuments";

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
  isClient: boolean;
  addressZip: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressNeighborhood: string | null;
  addressCity: string | null;
  addressState: string | null;
  notes: string | null;
  createdAt: string;
  clientFlagLogs?: {
    id: string;
    value: boolean;
    changedAt: string;
    changedBy: { name: string | null; email: string } | null;
  }[];
};

const STATUS_OPTIONS: { key: LeadStatus; label: string }[] = [
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

type DocumentItem = {
  id: string;
  leadId: string;
  type: "procuracao" | "nda" | "contrato" | "aditivo" | "outro";
  status: "enviado" | "pendente" | "validado" | "rejeitado";
  version: number;
};

// Mesmos 4 tipos de documento acompanhados na tela de Workflow e acompanhamento (PRD 6.8).
const TRACKED_DOC_TYPES: { value: DocumentItem["type"]; label: string }[] = [
  { value: "procuracao", label: "Procuração" },
  { value: "nda", label: "NDA" },
  { value: "contrato", label: "Contrato" },
  { value: "aditivo", label: "Aditivo" },
];

function latestDocsByType(documents: DocumentItem[], leadId: string) {
  const leadDocs = documents.filter((d) => d.leadId === leadId);
  return TRACKED_DOC_TYPES.map((t) => {
    const versions = leadDocs.filter((d) => d.type === t.value);
    const latest = versions.reduce<DocumentItem | null>((acc, d) => (!acc || d.version > acc.version ? d : acc), null);
    return { type: t.value, label: t.label, status: latest?.status ?? "pendente" };
  });
}

const COMPANY_TYPES: { value: CompanyType; label: string }[] = [  { value: "industria", label: "Indústria" },
  { value: "comercio", label: "Comércio" },
  { value: "revenda", label: "Revenda" },
  { value: "servicos", label: "Serviços" },
];

const UF_OPTIONS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
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
  isClient: boolean;
  addressZip: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement: string;
  addressNeighborhood: string;
  addressCity: string;
  addressState: string;
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
  isClient: false,
  addressZip: "",
  addressStreet: "",
  addressNumber: "",
  addressComplement: "",
  addressNeighborhood: "",
  addressCity: "",
  addressState: "",
  notes: "",
};

function formatCep(digits: string) {
  const d = digits.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

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
  const [onlyClients, setOnlyClients] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formTab, setFormTab] = useState<"geral" | "endereco">("geral");
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [leadsRes, docsRes] = await Promise.all([
        fetch("/api/leads", { cache: "no-store" }),
        fetch("/api/documentos", { cache: "no-store" }),
      ]);
      const data = await leadsRes.json();
      if (!leadsRes.ok) throw new Error(data.error || "Erro ao carregar leads.");
      setLeads(data);
      if (docsRes.ok) setDocuments(await docsRes.json());
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
    setFormTab("geral");
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
      isClient: lead.isClient,
      addressZip: lead.addressZip ? formatCep(lead.addressZip) : "",
      addressStreet: lead.addressStreet ?? "",
      addressNumber: lead.addressNumber ?? "",
      addressComplement: lead.addressComplement ?? "",
      addressNeighborhood: lead.addressNeighborhood ?? "",
      addressCity: lead.addressCity ?? "",
      addressState: lead.addressState ?? "",
      notes: lead.notes ?? "",
    });
    setFieldErrors({});
    setFormTab("geral");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (!form.companyName.trim()) errs.companyName = "Campo obrigatório.";
    const cnpjDigits = form.cnpj.replace(/\D/g, "");
    if (!form.cnpj || cnpjDigits.length !== 14) errs.cnpj = "O CNPJ é obrigatório e deve ter 14 dígitos.";
    if (form.contactEmail && !isEmailValid(form.contactEmail)) errs.contactEmail = "E-mail inválido.";
    if (form.estimatedValue && (Number.isNaN(Number(form.estimatedValue)) || Number(form.estimatedValue) < 0)) {
      errs.estimatedValue = "Informe um valor numérico válido.";
    }
    const cepDigits = form.addressZip.replace(/\D/g, "");
    if (form.addressZip && cepDigits.length !== 8) errs.addressZip = "O CEP deve ter 8 dígitos.";
    setFieldErrors(errs);
    if (errs.addressZip && !errs.companyName && !errs.cnpj && !errs.contactEmail && !errs.estimatedValue) {
      setFormTab("endereco");
    } else if (Object.keys(errs).some((k) => k !== "addressZip")) {
      setFormTab("geral");
    }
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
        body: JSON.stringify({ ...form, cnpj: form.cnpj.replace(/\D/g, "") || null, companyType: form.companyType || null, addressZip: form.addressZip.replace(/\D/g, "") || null }),
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
      if (expandedId === lead.id) setExpandedId(null);
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
          isClient: lead.isClient,
          addressZip: lead.addressZip,
          addressStreet: lead.addressStreet,
          addressNumber: lead.addressNumber,
          addressComplement: lead.addressComplement,
          addressNeighborhood: lead.addressNeighborhood,
          addressCity: lead.addressCity,
          addressState: lead.addressState,
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
    let list = !q
      ? leads
      : leads.filter((l) => [l.companyName, l.cnpj ?? "", l.contactName ?? "", l.contactEmail ?? ""].join(" ").toLowerCase().includes(q));
    if (onlyClients) list = list.filter((l) => l.isClient === true);
    return list.slice().sort((a, b) => a.companyName.localeCompare(b.companyName, "pt-BR"));
  }, [leads, search, onlyClients]);

  const kpis = useMemo(() => {
    const ativos = leads.filter((l) => l.status !== "aprovado" && l.status !== "cancelado").length;
    const comProcuracao = leads.filter((l) => l.procurationSigned).length;
    const semNda = leads.filter((l) => !l.ndaSigned).length;
    const clientes = leads.filter((l) => l.isClient).length;
    return { ativos, comProcuracao, semNda, clientes };
  }, [leads]);

  const editingLead = editingId ? leads.find((l) => l.id === editingId) ?? null : null;
  const clientFlagHistory = editingLead?.clientFlagLogs ?? [];
  // "Cliente" não é editável manualmente: reflete o valor atual do lead (ou fica
  // marcado se o status selecionado no formulário já for "Contrato").
  const willBeClient = (editingLead?.isClient ?? false) || form.status === "contrato" || form.status === "aprovado";

  return (
    <AppShell title="Gestão de Leads/Clientes" subtitle="Cadastro, qualificação e acompanhamento do pipeline até a aprovação final.">
      <div className="space-y-6">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{editingId ? "Editar lead/cliente" : "Novo lead/cliente"}</CardTitle>
              <p className="text-sm text-muted">Razão social, CNPJ, tipo de empresa, responsável, e-mail e telefone.</p>
            </div>
            {editingId && (
              <button type="button" onClick={reset} className="rounded-md border px-3 py-2 text-sm">
                Cancelar
              </button>
            )}
          </div>

          <div className="mb-4 flex gap-1 border-b border-border">
            <button
              type="button"
              onClick={() => setFormTab("geral")}
              className={`border-b-2 px-3 py-2 text-sm font-medium ${formTab === "geral" ? "border-navy text-navy" : "border-transparent text-muted hover:text-gray-700"}`}
            >
              Dados gerais
            </button>
            <button
              type="button"
              onClick={() => setFormTab("endereco")}
              className={`border-b-2 px-3 py-2 text-sm font-medium ${formTab === "endereco" ? "border-navy text-navy" : "border-transparent text-muted hover:text-gray-700"}`}
            >
              Endereço
            </button>
          </div>

          <form onSubmit={submit}>
            {formTab === "geral" && (
              <div className="grid gap-4 md:grid-cols-4">
                <label className="md:col-span-2">
                  <span className="mb-1 flex items-center justify-between text-sm font-medium">
                    <span>Razão social *</span>
                    <span className="flex items-center gap-1 text-sm font-bold" title="Definido automaticamente quando o status vira &quot;Contrato&quot; ou &quot;Aprovado&quot;.">
                      <input type="checkbox" checked={willBeClient} disabled readOnly />
                      Cliente
                    </span>
                  </span>
                  <input
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    className={`w-full rounded-md border px-3 py-2 ${fieldErrors.companyName ? "border-red-400" : ""}`}
                    placeholder="Ex.: Metalúrgica Sul Ltda"
                  />
                  {fieldErrors.companyName && <span className="mt-1 block text-xs text-red-600">{fieldErrors.companyName}</span>}
                </label>
                <label>
                  <span className="mb-1 block text-sm font-medium">CNPJ *</span>
                  <input
                    required
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
                    {STATUS_OPTIONS.map((s) => (
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

                <div className="flex flex-wrap items-center gap-6 md:col-span-3">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={form.procurationSigned} onChange={(e) => setForm({ ...form, procurationSigned: e.target.checked })} />
                    <span className="text-sm font-medium">Procuração assinada</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={form.ndaSigned} onChange={(e) => setForm({ ...form, ndaSigned: e.target.checked })} />
                    <span className="text-sm font-medium">NDA assinado</span>
                  </label>
                </div>
                <p className="text-xs text-muted md:col-span-4 -mt-2">
                  O campo <strong>Cliente</strong> não é editável diretamente: é marcado automaticamente quando o status muda para <strong>Contrato</strong> ou <strong>Aprovado</strong>, e cada alteração fica registrada (quem alterou e quando).
                  {clientFlagHistory.length > 0 && (
                    <span className="ml-1">
                      Última alteração: {clientFlagHistory[0].value ? "marcado" : "desmarcado"} por{" "}
                      {clientFlagHistory[0].changedBy?.name || clientFlagHistory[0].changedBy?.email || "usuário removido"} em{" "}
                      {new Date(clientFlagHistory[0].changedAt).toLocaleString("pt-BR")}.
                    </span>
                  )}
                </p>

                <label className="md:col-span-4">
                  <span className="mb-1 block text-sm font-medium">Observações</span>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full rounded-md border px-3 py-2" rows={2} />
                </label>
              </div>
            )}

            {formTab === "endereco" && (
              <div className="grid gap-4 md:grid-cols-4">
                <label>
                  <span className="mb-1 block text-sm font-medium">CEP</span>
                  <input
                    value={form.addressZip}
                    onChange={(e) => setForm({ ...form, addressZip: formatCep(e.target.value) })}
                    className={`w-full rounded-md border px-3 py-2 ${fieldErrors.addressZip ? "border-red-400" : ""}`}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                  {fieldErrors.addressZip && <span className="mt-1 block text-xs text-red-600">{fieldErrors.addressZip}</span>}
                </label>
                <label className="md:col-span-2">
                  <span className="mb-1 block text-sm font-medium">Logradouro</span>
                  <input value={form.addressStreet} onChange={(e) => setForm({ ...form, addressStreet: e.target.value })} className="w-full rounded-md border px-3 py-2" placeholder="Rua, avenida..." />
                </label>
                <label>
                  <span className="mb-1 block text-sm font-medium">Número</span>
                  <input value={form.addressNumber} onChange={(e) => setForm({ ...form, addressNumber: e.target.value })} className="w-full rounded-md border px-3 py-2" placeholder="Nº" />
                </label>
                <label>
                  <span className="mb-1 block text-sm font-medium">Complemento</span>
                  <input value={form.addressComplement} onChange={(e) => setForm({ ...form, addressComplement: e.target.value })} className="w-full rounded-md border px-3 py-2" placeholder="Sala, bloco..." />
                </label>
                <label>
                  <span className="mb-1 block text-sm font-medium">Bairro</span>
                  <input value={form.addressNeighborhood} onChange={(e) => setForm({ ...form, addressNeighborhood: e.target.value })} className="w-full rounded-md border px-3 py-2" />
                </label>
                <label>
                  <span className="mb-1 block text-sm font-medium">Cidade</span>
                  <input value={form.addressCity} onChange={(e) => setForm({ ...form, addressCity: e.target.value })} className="w-full rounded-md border px-3 py-2" />
                </label>
                <label>
                  <span className="mb-1 block text-sm font-medium">UF</span>
                  <select value={form.addressState} onChange={(e) => setForm({ ...form, addressState: e.target.value })} className="w-full rounded-md border px-3 py-2">
                    <option value="">Selecione</option>
                    {UF_OPTIONS.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <div className="mt-4 flex items-end">
              <button disabled={saving} className="rounded-md bg-navy px-5 py-2 font-medium text-white disabled:opacity-50">
                {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Cadastrar lead"}
              </button>
            </div>
          </form>
        </Card>

        {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardTitle>Leads/Clientes ativos</CardTitle>
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
          <Card>
            <CardTitle>Clientes</CardTitle>
            <p className="mt-2 text-2xl font-bold text-navy">{kpis.clientes}</p>
          </Card>
        </div>

        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Leads/Clientes ({filtered.length})</h2>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={onlyClients} onChange={(e) => setOnlyClients(e.target.checked)} />
                Somente clientes
              </label>
              <input value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-md border px-3 py-2 text-sm" placeholder="Buscar por empresa, CNPJ ou contato..." />
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-muted">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted">Nenhum lead encontrado.</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((lead) => {
                const isOpen = expandedId === lead.id;
                return (
                  <div key={lead.id} className="rounded-xl border border-border bg-white shadow-sm">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isOpen ? null : lead.id)}
                      className="flex w-full items-center justify-between p-4 text-left"
                    >
                      <div>
                        <p className="font-medium">{lead.companyName}</p>
                        <p className="text-xs text-muted">
                          {lead.contactName || "—"} {lead.cnpj ? `· ${lead.cnpj}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="hidden text-sm font-medium tabular-nums text-navy sm:inline">{brl.format(Number(lead.estimatedValue))}</span>
                        <Badge value={lead.status} />
                        <span className="text-xs text-muted">{isOpen ? "▲" : "▼"}</span>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="space-y-5 border-t border-border p-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2 text-sm">
                            <p>
                              <span className="text-muted">Tipo de empresa: </span>
                              {lead.companyType ? <Badge value={lead.companyType} /> : "—"}
                            </p>
                            <p>
                              <span className="text-muted">E-mail: </span>
                              {lead.contactEmail || "—"}
                            </p>
                            <p>
                              <span className="text-muted">Telefone: </span>
                              {lead.phone || "—"}
                            </p>
                            <p>
                              <span className="text-muted">Cadastrado em: </span>
                              {new Date(lead.createdAt).toLocaleDateString("pt-BR")}
                            </p>
                            <p className="flex flex-wrap gap-2">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${lead.procurationSigned ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                                {lead.procurationSigned ? "Procuração assinada" : "Sem procuração"}
                              </span>
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${lead.ndaSigned ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                                {lead.ndaSigned ? "NDA assinado" : "Sem NDA"}
                              </span>
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${lead.isClient ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"}`}>
                                {lead.isClient ? "Cliente" : "Não é cliente"}
                              </span>
                            </p>
                            {(lead.addressStreet || lead.addressCity) && (
                              <p>
                                <span className="text-muted">Endereço: </span>
                                {[
                                  [lead.addressStreet, lead.addressNumber].filter(Boolean).join(", "),
                                  lead.addressComplement,
                                  lead.addressNeighborhood,
                                  [lead.addressCity, lead.addressState].filter(Boolean).join("/"),
                                  lead.addressZip ? formatCep(lead.addressZip) : null,
                                ]
                                  .filter(Boolean)
                                  .join(" — ")}
                              </p>
                            )}
                            {lead.notes && (
                              <p>
                                <span className="text-muted">Observações: </span>
                                {lead.notes}
                              </p>
                            )}
                            {lead.clientFlagLogs && lead.clientFlagLogs.length > 0 && (
                              <div>
                                <span className="text-muted">Histórico do campo Cliente: </span>
                                <ul className="mt-1 space-y-0.5 text-xs text-muted">
                                  {lead.clientFlagLogs.map((log) => (
                                    <li key={log.id}>
                                      {log.value ? "Marcado" : "Desmarcado"} por {log.changedBy?.name || log.changedBy?.email || "usuário removido"} em{" "}
                                      {new Date(log.changedAt).toLocaleString("pt-BR")}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <div className="border-t border-border pt-3">
                              <p className="mb-1.5 text-xs font-medium text-muted">Documentos</p>
                              <div className="flex flex-wrap gap-x-3 gap-y-1">
                                {latestDocsByType(documents, lead.id).map((d) => (
                                  <span key={d.type} className="flex items-center gap-1 text-xs">
                                    <span className="text-muted">{d.label}:</span>
                                    <Badge value={d.status} />
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row md:flex-col md:items-end">
                            <select
                              value={lead.status}
                              onChange={(e) => moveStatus(lead, e.target.value as LeadStatus)}
                              className="w-full rounded-md border px-2 py-1.5 text-sm md:w-auto"
                            >
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s.key} value={s.key}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => edit(lead)} className="rounded-md border px-3 py-1.5 text-sm">
                                Editar
                              </button>
                              <button type="button" onClick={() => remove(lead)} className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-700">
                                Excluir
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-border pt-4">
                          <LeadDocuments leadId={lead.id} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-xs text-muted">
          Alerta de prescrição: o prazo para recuperação de créditos tributários é de <strong>5 anos</strong>. Acompanhe o risco de
          prescrição por lead na tela de <strong>Workflow e acompanhamento</strong>.
        </p>
      </div>
    </AppShell>
  );
}
