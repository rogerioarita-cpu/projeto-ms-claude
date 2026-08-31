"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { formatCnpj, onlyDigits, TYPE_ORDER, type SpedFileItem } from "./types";

function isOk(status: SpedFileItem["status"]) {
  return status === "sucesso" || status === "aviso";
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

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 flex-shrink-0 text-muted">
      <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M14 14L18 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function SpedCascade({
  files,
  onOpenDetail,
  onRemove,
}: {
  files: SpedFileItem[];
  onOpenDetail: (item: SpedFileItem) => void;
  onRemove: (item: SpedFileItem) => void;
}) {
  const [search, setSearch] = useState("");
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  function leadNameOf(f: SpedFileItem) {
    return f.lead?.companyName || f.project?.lead?.companyName || "Sem lead vinculado";
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const digits = onlyDigits(search);
    return files.filter((f) => {
      return (
        !q ||
        [f.fileName, f.companyName ?? "", leadNameOf(f), f.project?.name ?? ""].join(" ").toLowerCase().includes(q) ||
        (digits.length > 0 && onlyDigits(f.cnpj).includes(digits))
      );
    });
  }, [files, search]);

  // Cascata: Lead -> Tipo de arquivo -> Importados / Não importados
  const byLead = useMemo(() => {
    const groups = new Map<string, SpedFileItem[]>();
    for (const f of filtered) {
      const name = leadNameOf(f);
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name)!.push(f);
    }
    return Array.from(groups.entries())
      .sort((a, b) => a[0].localeCompare(b[0], "pt-BR"))
      .map(([leadName, leadFiles]) => ({
        leadName,
        files: leadFiles,
        byType: TYPE_ORDER.map((t) => {
          const typeFiles = leadFiles.filter((f) => f.type === t.value);
          const importados = typeFiles.filter((f) => isOk(f.status));
          const naoImportados = typeFiles.filter((f) => !isOk(f.status));
          return { ...t, files: typeFiles, importados, naoImportados };
        }),
      }));
  }, [filtered]);

  function renderFilesTable(list: SpedFileItem[]) {
    return (
      <div className="overflow-x-auto border-t border-border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-muted">
              <th className="px-5 py-2">Arquivo</th>
              <th className="px-5 py-2">Lead</th>
              <th className="px-5 py-2">Empresa / CNPJ</th>
              <th className="px-5 py-2">Período</th>
              <th className="px-5 py-2">Registros</th>
              <th className="px-5 py-2">Status</th>
              <th className="px-5 py-2">Data</th>
              <th className="px-5 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {[...list]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((f) => (
                <tr key={f.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-2.5 font-medium">
                    {f.fileName}
                    <br />
                    <span className="text-xs text-muted">{f.fileSizeKb} KB</span>
                  </td>
                  <td className="px-5 py-2.5">{leadNameOf(f)}</td>
                  <td className="px-5 py-2.5">
                    {f.companyName || "—"}
                    <br />
                    <span className="text-xs text-muted">{formatCnpj(f.cnpj)}</span>
                  </td>
                  <td className="px-5 py-2.5">
                    {f.periodStart === f.periodEnd ? f.periodStart || "—" : `${f.periodStart ?? "—"} a ${f.periodEnd ?? "—"}`}
                  </td>
                  <td className="px-5 py-2.5">
                    {f.status === "duplicado" ? (
                      <span className="text-xs text-muted">— (bloqueado, não processado)</span>
                    ) : (
                      <>
                        {f.totalRecords}
                        {(f.warningsCount > 0 || f.errorsCount > 0) && (
                          <div className="text-xs text-muted">
                            {f.warningsCount > 0 ? `${f.warningsCount} aviso(s)` : ""}
                            {f.warningsCount > 0 && f.errorsCount > 0 ? " · " : ""}
                            {f.errorsCount > 0 ? `${f.errorsCount} erro(s)` : ""}
                          </div>
                        )}
                      </>
                    )}
                  </td>
                  <td className="px-5 py-2.5">
                    <Badge value={f.status} />
                  </td>
                  <td className="px-5 py-2.5">{new Date(f.createdAt).toLocaleDateString("pt-BR")}</td>
                  <td className="px-5 py-2.5">
                    <div className="flex justify-end gap-2">
                      {f.status !== "duplicado" && (
                        <button type="button" onClick={() => onOpenDetail(f)} className="rounded-md border px-3 py-1.5">
                          Ver detalhe
                        </button>
                      )}
                      <button type="button" onClick={() => onRemove(f)} className="rounded-md border border-red-200 px-3 py-1.5 text-red-700">
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold">Arquivos importados</h2>
          <p className="text-sm text-muted">
            {filtered.length} de {files.length} arquivo(s)
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
            placeholder="Buscar por empresa, CNPJ, arquivo..."
          />
        </div>
      </div>

      {files.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted">Nenhum arquivo SPED importado ainda.</div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted">Nenhum arquivo encontrado para a busca.</div>
      ) : (
        <div className="divide-y divide-border">
          {byLead.map((leadGroup) => {
            const leadIsOpen = expandedLead === leadGroup.leadName;
            return (
              <div key={leadGroup.leadName}>
                <button
                  type="button"
                  onClick={() => setExpandedLead(leadIsOpen ? null : leadGroup.leadName)}
                  className={`flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors ${
                    leadIsOpen ? "bg-navy/5" : "hover:bg-gray-50"
                  }`}
                  aria-expanded={leadIsOpen}
                >
                  <span className="text-sm font-semibold text-navy">{leadGroup.leadName}</span>
                  <div className="flex flex-shrink-0 items-center gap-3">
                    <span className="text-xs text-muted">{leadGroup.files.length} arquivo(s)</span>
                    <ChevronIcon open={leadIsOpen} />
                  </div>
                </button>

                {leadIsOpen && (
                  <div className="bg-gray-50/40">
                    <div className="flex flex-wrap gap-2 border-y border-border px-5 py-3 pl-8">
                      {leadGroup.byType.map((t) => {
                        const typeKey = `${leadGroup.leadName}::${t.value}`;
                        if (t.files.length === 0) {
                          return (
                            <div key={typeKey} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 opacity-40">
                              <Badge value={t.value} />
                              <span className="text-xs text-muted">0 arquivo(s)</span>
                            </div>
                          );
                        }
                        const typeIsOpen = expandedType === typeKey;
                        return (
                          <button
                            key={typeKey}
                            type="button"
                            onClick={() => setExpandedType(typeIsOpen ? null : typeKey)}
                            className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors ${
                              typeIsOpen ? "border-navy bg-navy/5" : "border-border hover:bg-gray-100"
                            }`}
                            aria-expanded={typeIsOpen}
                          >
                            <Badge value={t.value} />
                            <span className="text-xs text-muted">{t.files.length} arquivo(s)</span>
                            <ChevronIcon open={typeIsOpen} />
                          </button>
                        );
                      })}
                    </div>

                    {leadGroup.byType.map((t) => {
                      const typeKey = `${leadGroup.leadName}::${t.value}`;
                      if (expandedType !== typeKey) return null;
                      return (
                        <div key={typeKey} className="divide-y divide-border">
                          {(
                            [
                              { key: "ok", label: "Arquivos importados", list: t.importados, badgeClass: "bg-green-100 text-green-800" },
                              { key: "nao_ok", label: "Arquivos não importados", list: t.naoImportados, badgeClass: "bg-red-100 text-red-800" },
                            ] as const
                          ).map((group) => {
                            const groupKey = `${typeKey}::${group.key}`;
                            const groupIsOpen = expandedGroup === groupKey;
                            return (
                              <div key={groupKey}>
                                <button
                                  type="button"
                                  onClick={() => setExpandedGroup(groupIsOpen ? null : groupKey)}
                                  disabled={group.list.length === 0}
                                  className="flex w-full items-center justify-between gap-3 px-5 py-2.5 pl-12 text-left transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                                  aria-expanded={groupIsOpen}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${group.badgeClass}`}>{group.label}</span>
                                  </div>
                                  <div className="flex flex-shrink-0 items-center gap-3">
                                    <span className="text-xs text-muted">{group.list.length} arquivo(s)</span>
                                    {group.list.length > 0 && <ChevronIcon open={groupIsOpen} />}
                                  </div>
                                </button>

                                {groupIsOpen && group.list.length > 0 && renderFilesTable(group.list)}
                              </div>
                            );
                          })}
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
