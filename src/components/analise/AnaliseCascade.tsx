"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";

type TaxType = "pis_cofins" | "icms" | "ipi" | "irpj_csll" | "outros";
type AnaliseStatus = "em_andamento" | "concluida" | "aprovada" | "rejeitada";
type ChecklistItem = { id: string; description: string; done: boolean; order: number };
type Approval = { id: string; area: string; status: string };
type Lead = { id: string; companyName: string; isClient?: boolean };
type UserOption = { id: string; name: string | null; email: string };

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

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={`h-4 w-4 flex-shrink-0 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
      <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 flex-shrink-0 text-muted">
      <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M14 14L18 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function AnaliseCascade({
  analises,
  onEdit,
  onRemove,
  onToggleChecklist,
}: {
  analises: Analise[];
  onEdit: (a: Analise) => void;
  onRemove: (a: Analise) => void;
  onToggleChecklist: (item: ChecklistItem) => void;
}) {
  const [search, setSearch] = useState("");
  const [expandedLead, setExpandedLead] = useState<string | null>(null);

  function leadNameOf(a: Analise) {
    return a.lead?.companyName || "Sem lead vinculado";
  }
  function leadKeyOf(a: Analise) {
    return a.lead?.id || "sem-lead";
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return analises;
    return analises.filter((a) =>
      [leadNameOf(a), a.thesis, a.analyst?.name ?? "", a.analyst?.email ?? ""].join(" ").toLowerCase().includes(q)
    );
  }, [analises, search]);

  // Cascata: Lead/Cliente -> análises fiscais daquele lead.
  const byLead = useMemo(() => {
    const groups = new Map<string, { leadName: string; isClient: boolean; items: Analise[] }>();
    for (const a of filtered) {
      const key = leadKeyOf(a);
      if (!groups.has(key)) groups.set(key, { leadName: leadNameOf(a), isClient: a.lead?.isClient ?? false, items: [] });
      groups.get(key)!.items.push(a);
    }
    return Array.from(groups.entries())
      .sort((x, y) => x[1].leadName.localeCompare(y[1].leadName, "pt-BR"))
      .map(([key, group]) => ({ key, ...group }));
  }, [filtered]);

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold">Análises fiscais</h2>
          <p className="text-sm text-muted">
            {filtered.length} de {analises.length} análise(s)
          </p>
        </div>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
            <SearchIcon />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-md border px-3 py-2 pl-9 text-sm"
            placeholder="Buscar por lead, tese, analista..."
          />
        </div>
      </div>

      {analises.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted">Nenhuma análise fiscal cadastrada ainda.</div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted">Nenhuma análise encontrada para a busca.</div>
      ) : (
        <div className="divide-y divide-border">
          {byLead.map((group) => {
            const isOpen = expandedLead === group.key;
            return (
              <div key={group.key}>
                <button
                  type="button"
                  onClick={() => setExpandedLead(isOpen ? null : group.key)}
                  className={`flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors ${
                    isOpen ? "bg-navy/5" : "hover:bg-gray-50"
                  }`}
                  aria-expanded={isOpen}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-navy">{group.leadName}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${group.isClient ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-700"}`}>
                      {group.isClient ? "Cliente" : "Lead"}
                    </span>
                  </span>
                  <div className="flex flex-shrink-0 items-center gap-3">
                    <span className="text-xs text-muted">{group.items.length} análise(s)</span>
                    <ChevronIcon open={isOpen} />
                  </div>
                </button>

                {isOpen && (
                  <div className="divide-y divide-border bg-gray-50/40">
                    {group.items.map((a) => {
                      const done = a.checklist.filter((c) => c.done).length;
                      const progress = a.checklist.length ? Math.round((done / a.checklist.length) * 100) : 0;
                      return (
                        <div key={a.id} className="px-5 py-4 pl-8">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium">{a.thesis}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                                <Badge value={a.taxType} />
                                <Badge value={a.status} />
                                <span className="text-xs text-muted">
                                  {a.periodStart} a {a.periodEnd}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-shrink-0 gap-2">
                              <button type="button" onClick={() => onEdit(a)} className="rounded-md border px-3 py-1.5 text-xs">
                                Editar
                              </button>
                              <button type="button" onClick={() => onRemove(a)} className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-700">
                                Excluir
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-x-10 gap-y-2 text-sm">
                            <span>
                              <span className="mr-1 text-xs uppercase text-muted">Analista:</span>
                              {a.analyst?.name || a.analyst?.email || "Não atribuído"}
                            </span>
                            <span>
                              <span className="mr-1 text-xs uppercase text-muted">Crédito estimado:</span>
                              <strong>{brl.format(Number(a.estimatedCredit ?? 0))}</strong>
                            </span>
                          </div>

                          {a.diagnosis && <p className="mt-2 text-sm text-muted">{a.diagnosis}</p>}

                          {a.checklist.length > 0 && (
                            <div className="mt-3 max-w-md">
                              <div className="mb-1 flex items-center justify-between text-xs text-muted">
                                <span>Checklist</span>
                                <span>
                                  {done}/{a.checklist.length}
                                </span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-gray-200">
                                <div className="h-1.5 rounded-full bg-navy" style={{ width: `${progress}%` }} />
                              </div>
                              <ul className="mt-2 space-y-1">
                                {a.checklist.map((c) => (
                                  <li key={c.id} className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={c.done} onChange={() => onToggleChecklist(c)} />
                                    <span className={c.done ? "text-muted line-through" : ""}>{c.description}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {a.approvals.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {a.approvals.map((ap) => (
                                <Badge key={ap.id} value={ap.status} />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
