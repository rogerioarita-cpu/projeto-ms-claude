"use client";

import { useEffect, useMemo, useState, Fragment } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { formatCnpj } from "@/components/sped/types";

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
  status: LeadStatus;
  estimatedValue: string | number;
  createdAt: string;
};

type DocumentItem = {
  id: string;
  leadId: string;
  type: "procuracao" | "nda" | "contrato" | "aditivo" | "outro";
  status: "enviado" | "pendente" | "validado" | "rejeitado";
  version: number;
};

// Mesmos 4 tipos de documento acompanhados na tela de Leads/Clientes e na antiga tela de Workflow (PRD 6.8).
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

// Mesma sequência de status do funil de referência, em tons pasteis — exceto o
// último ("Cancelado"), mantido em vermelho sólido para destacar o encerramento negativo.
const STATUS_STEPS: { key: LeadStatus; label: string; color: string; textColor: string }[] = [
  { key: "novo", label: "Novo", color: "#C9D9EC", textColor: "#1F3A5F" },
  { key: "qualificacao", label: "Qualificação", color: "#BFE3F7", textColor: "#1B4965" },
  { key: "reuniao_agendada", label: "Reunião Agendada", color: "#BEEFDD", textColor: "#0F6848" },
  { key: "documentacao", label: "Documentação", color: "#FCE4B8", textColor: "#8A5A12" },
  { key: "analise_fiscal", label: "Análise Fiscal", color: "#F9CFC9", textColor: "#9B2C20" },
  { key: "proposta", label: "Proposta", color: "#C9D9EC", textColor: "#1F3A5F" },
  { key: "contrato", label: "Contrato", color: "#BFE3F7", textColor: "#1B4965" },
  { key: "aprovado", label: "Aprovado", color: "#BEEFDD", textColor: "#0F6848" },
  { key: "cancelado", label: "Cancelado", color: "#E4483A", textColor: "#FFFFFF" },
];

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function daysInPipeline(createdAt: string) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={`h-4 w-4 flex-shrink-0 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
      <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function LeadsPipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<LeadStatus | null>(null);
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetch("/api/leads", { cache: "no-store" }), fetch("/api/documentos", { cache: "no-store" })])
      .then(async ([leadsRes, docsRes]) => {
        const data = await leadsRes.json();
        if (!leadsRes.ok) throw new Error(data.error || "Erro ao carregar leads.");
        setLeads(data);
        if (docsRes.ok) setDocuments(await docsRes.json());
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar leads."))
      .finally(() => setLoading(false));
  }, []);

  const countsByStatus = useMemo(() => {
    const map = new Map<LeadStatus, number>();
    for (const step of STATUS_STEPS) map.set(step.key, 0);
    for (const lead of leads) map.set(lead.status, (map.get(lead.status) ?? 0) + 1);
    return map;
  }, [leads]);

  const selectedStep = STATUS_STEPS.find((s) => s.key === selected) ?? null;

  const selectedLeads = useMemo(() => {
    if (!selected) return [];
    return leads.filter((l) => l.status === selected).sort((a, b) => a.companyName.localeCompare(b.companyName, "pt-BR"));
  }, [leads, selected]);

  return (
    <AppShell
      title="Workflow e acompanhamento"
      subtitle="Quantidade de leads em cada etapa do funil. Clique em uma etapa para ver os leads, e em cada lead para ver os detalhes."
    >
      <div className="space-y-6">
        {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        {loading ? (
          <p className="text-sm text-muted">Carregando...</p>
        ) : (
          <>
            <div className="flex w-full overflow-x-auto pb-2">
              {STATUS_STEPS.map((step, idx) => {
                const isSelected = selected === step.key;
                const count = countsByStatus.get(step.key) ?? 0;
                return (
                  <button
                    key={step.key}
                    type="button"
                    onClick={() => {
                      setSelected(isSelected ? null : step.key);
                      setExpandedLeadId(null);
                    }}
                    style={{
                      backgroundColor: step.color,
                      color: step.textColor,
                      clipPath:
                        idx === 0
                          ? "polygon(0% 0%, 88% 0%, 100% 50%, 88% 100%, 0% 100%)"
                          : "polygon(0% 0%, 88% 0%, 100% 50%, 88% 100%, 0% 100%, 12% 50%)",
                      marginLeft: idx === 0 ? 0 : "-16px",
                    }}
                    className={`relative flex min-w-[150px] flex-1 flex-col items-center justify-center gap-1 px-6 py-5 text-center transition-transform duration-150 ${
                      isSelected ? "z-10 scale-[1.04] drop-shadow-lg" : "hover:brightness-95"
                    }`}
                  >
                    <span className="text-sm font-semibold leading-tight">{step.label}</span>
                    <span className="text-xs font-medium opacity-80">
                      {count} lead{count === 1 ? "" : "s"}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedStep && (
              <div className="rounded-xl border border-border bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-border p-5">
                  <div>
                    <h2 className="text-base font-semibold">
                      {selectedStep.label} <span className="font-normal text-muted">— {selectedLeads.length} lead(s)</span>
                    </h2>
                    <p className="text-sm text-muted">CNPJ, nome, dias no pipeline e estimativa de valor de cada lead/cliente nesta etapa. Clique em um lead para ver mais detalhes.</p>
                  </div>
                  <button type="button" onClick={() => setSelected(null)} className="rounded-md border px-3 py-2 text-sm">
                    Fechar
                  </button>
                </div>

                {selectedLeads.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted">Nenhum lead/cliente nesta etapa.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs uppercase text-muted">
                          <th className="px-5 py-3">Nome</th>
                          <th className="px-5 py-3">CNPJ</th>
                          <th className="px-5 py-3">Dias no pipeline</th>
                          <th className="px-5 py-3">Estimativa de valor</th>
                          <th className="px-5 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {selectedLeads.map((lead) => {
                          const isOpen = expandedLeadId === lead.id;
                          return (
                            <Fragment key={lead.id}>
                              <tr
                                onClick={() => setExpandedLeadId(isOpen ? null : lead.id)}
                                className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-gray-50"
                                aria-expanded={isOpen}
                              >
                                <td className="px-5 py-3 font-medium">{lead.companyName}</td>
                                <td className="px-5 py-3 text-muted">{formatCnpj(lead.cnpj)}</td>
                                <td className="px-5 py-3">{daysInPipeline(lead.createdAt)} dia(s)</td>
                                <td className="px-5 py-3">{brl.format(Number(lead.estimatedValue ?? 0))}</td>
                                <td className="px-5 py-3 text-right">
                                  <ChevronIcon open={isOpen} />
                                </td>
                              </tr>
                              {isOpen && (
                                <tr className="border-b border-border bg-gray-50/60 last:border-0">
                                  <td colSpan={5} className="px-5 py-4">
                                    <p className="mb-1.5 text-xs font-medium text-muted">Documentos</p>
                                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                                      {latestDocsByType(documents, lead.id).map((d) => (
                                        <span key={d.type} className="flex items-center gap-1 text-xs">
                                          <span className="text-muted">{d.label}:</span>
                                          <Badge value={d.status} />
                                        </span>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

