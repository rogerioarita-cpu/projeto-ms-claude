"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";

export type WorkflowItem = {
  id: string;
  companyName: string;
  cnpj: string | null;
  status: string;
  daysInPipeline: number;
  complete: boolean[];
  currentPhase: number;
  nextPhase: string | null;
  prescriptionRisk: boolean;
  slaBreach: boolean;
  latestByType: { type: string; label: string; status: string | null }[];
};

const PHASES = [
  "Lead Cadastrado",
  "Documentação",
  "Arquivos Importados",
  "Análise Fiscal",
  "Proposta Gerada",
  "Contrato Assinado",
  "Aprovação Final",
];

const SLA_DAYS = 30;

function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 flex-shrink-0 text-muted">
      <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M14 14L18 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={`h-4 w-4 flex-shrink-0 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WorkflowAccordion({ items }: { items: WorkflowItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  if (items.length === 0) {
    return <p className="text-sm text-muted">Nenhum lead para acompanhar.</p>;
  }

  const sortedItems = [...items].sort((a, b) => a.companyName.localeCompare(b.companyName, "pt-BR"));

  const trimmed = query.trim().toLowerCase();
  const digits = onlyDigits(query);
  const filtered = trimmed
    ? sortedItems.filter((item) => {
        const matchesName = item.companyName.toLowerCase().includes(trimmed);
        const matchesCnpj = digits.length > 0 && onlyDigits(item.cnpj ?? "").includes(digits);
        return matchesName || matchesCnpj;
      })
    : sortedItems;

  return (
    <div>
      <div className="relative mb-4 max-w-sm">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
          <SearchIcon />
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por CNPJ ou nome do lead..."
          className="w-full rounded-md border border-border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-navy"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted">Nenhum lead encontrado para &ldquo;{query}&rdquo;.</p>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-white">
          {filtered.map((item) => {
        const isOpen = openId === item.id;
        const isTerminal = item.status === "aprovado" || item.status === "cancelado";

        return (
          <div key={item.id}>
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : item.id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
              aria-expanded={isOpen}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="truncate text-sm font-medium text-navy">{item.companyName}</span>
                <Badge value={item.status} />
              </div>
              <div className="flex flex-shrink-0 items-center gap-3">
                <span className="text-xs text-muted">{item.daysInPipeline} dia(s)</span>
                {item.prescriptionRisk && <span className="text-xs font-medium text-red-700">⚠ Prescrição</span>}
                {item.slaBreach && !item.prescriptionRisk && <span className="text-xs font-medium text-yellow-700">⚠ SLA</span>}
                <ChevronIcon open={isOpen} />
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-border bg-gray-50/60 px-4 py-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${isTerminal ? "bg-green-500" : "bg-blue-500"}`} />
                  <span className="text-muted">Status atual:</span>
                  <span className="font-medium text-navy">{PHASES[item.currentPhase]}</span>
                </div>

                {item.nextPhase && (
                  <p className="mt-3 text-xs text-muted">
                    Próxima etapa: <span className="font-medium text-navy">{item.nextPhase}</span>
                  </p>
                )}

                <div className="mt-3 border-t border-border pt-3">
                  <p className="mb-1.5 text-xs font-medium text-muted">Documentos</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {item.latestByType.map((d) => (
                      <span key={d.type} className="flex items-center gap-1 text-xs">
                        <span className="text-muted">{d.label}:</span>
                        <Badge value={d.status ?? "pendente"} />
                      </span>
                    ))}
                  </div>
                </div>

                {item.prescriptionRisk && (
                  <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                    ⚠ Risco de prescrição — mais de 5 anos no pipeline sem conclusão
                  </p>
                )}
                {item.slaBreach && !item.prescriptionRisk && (
                  <p className="mt-3 rounded-md bg-yellow-50 px-3 py-2 text-xs font-medium text-yellow-700">
                    ⚠ SLA estourado — mais de {SLA_DAYS} dias sem atualização
                  </p>
                )}
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
