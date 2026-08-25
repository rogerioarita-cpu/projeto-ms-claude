"use client";

import { DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";

type Project = { id: string; name: string; client?: { name: string } | null };

type SpedIssue = { linha: number; registro: string; mensagem: string };

type SpedFileType = "efd_icms_ipi" | "efd_contribuicoes";
type SpedFileStatus = "sucesso" | "aviso" | "erro";

type SpedFileItem = {
  id: string;
  type: SpedFileType;
  status: SpedFileStatus;
  fileName: string;
  fileSizeKb: number;
  companyName: string | null;
  cnpj: string | null;
  ie: string | null;
  uf: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  totalRecords: number;
  warningsCount: number;
  errorsCount: number;
  createdAt: string;
  project?: Project | null;
  uploadedBy?: { name: string | null; email: string } | null;
  extracted?: {
    avisos: SpedIssue[];
    erros: SpedIssue[];
    documentos?: { totalNotasEntrada: number; totalNotasSaida: number; valorTotalEntradas: number; valorTotalSaidas: number };
    apuracaoIcms?: {
      valorTotalDebitos: number;
      valorTotalCreditos: number;
      saldoApurado: number;
      icmsARecolher: number;
      saldoCredorTransportar: number;
      ajustes: Array<{ codigo: string; descricao: string; valor: number }>;
    };
    obrigacoesIcms?: Array<{ codigo: string | null; valor: number; vencimento: string | null }>;
    totalItensC170?: number;
    totalParticipantes?: number;
    pis?: { creditoApuradoPeriodo: number; contribuicaoARecolher: number };
    cofins?: { creditoApuradoPeriodo: number; contribuicaoARecolher: number };
  };
};

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const TYPE_OPTIONS: { value: SpedFileType; label: string; accept: string; hint: string }[] = [
  {
    value: "efd_icms_ipi",
    label: "EFD ICMS/IPI",
    accept: ".txt",
    hint: "Registros lidos: 0000, 0150, C100, C170, E110, E111, E116",
  },
  {
    value: "efd_contribuicoes",
    label: "EFD Contribuições (PIS/COFINS)",
    accept: ".txt",
    hint: "Registros lidos: 0000, M100, M200, M500, M600",
  },
];

export default function ImportacaoSpedPage() {
  const [files, setFiles] = useState<SpedFileItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [tipo, setTipo] = useState<SpedFileType>("efd_icms_ipi");
  const [projectId, setProjectId] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | SpedFileType>("");
  const [statusFilter, setStatusFilter] = useState<"" | SpedFileStatus>("");
  const [selected, setSelected] = useState<SpedFileItem | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [filesRes, projectsRes] = await Promise.all([
        fetch("/api/sped", { cache: "no-store" }),
        fetch("/api/projetos", { cache: "no-store" }),
      ]);
      const filesData = await filesRes.json();
      if (!filesRes.ok) throw new Error(filesData.error || "Erro ao carregar arquivos importados.");
      setFiles(filesData);
      if (projectsRes.ok) setProjects(await projectsRes.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function handleDrag(e: DragEvent, active: boolean) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(active);
  }
  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setPendingFile(dropped);
  }

  async function submitUpload() {
    if (!pendingFile) {
      setUploadError("Selecione ou arraste um arquivo SPED (.txt) para importar.");
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      const form = new FormData();
      form.append("file", pendingFile);
      form.append("type", tipo);
      if (projectId) form.append("projectId", projectId);
      const res = await fetch("/api/sped", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível importar o arquivo.");
      setPendingFile(null);
      if (inputRef.current) inputRef.current.value = "";
      await load();
      setSelected(data);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Erro ao importar arquivo.");
    } finally {
      setUploading(false);
    }
  }

  async function remove(item: SpedFileItem) {
    if (!window.confirm(`Excluir o arquivo importado "${item.fileName}"?`)) return;
    setError("");
    try {
      const res = await fetch(`/api/sped/${item.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (selected?.id === item.id) setSelected(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao excluir arquivo.");
    }
  }

  async function openDetail(item: SpedFileItem) {
    try {
      const res = await fetch(`/api/sped/${item.id}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setSelected(data);
    } catch {
      setSelected(item);
    }
  }

  const kpis = useMemo(() => {
    const sucesso = files.filter((f) => f.status === "sucesso").length;
    const aviso = files.filter((f) => f.status === "aviso").length;
    const erro = files.filter((f) => f.status === "erro").length;
    return { total: files.length, sucesso, aviso, erro };
  }, [files]);

  const filtered = useMemo(
    () =>
      files.filter((f) => {
        const q = search.toLowerCase().trim();
        const hay = [f.fileName, f.companyName ?? "", f.cnpj ?? "", f.project?.name ?? "", f.project?.client?.name ?? ""].join(" ").toLowerCase();
        return (!q || hay.includes(q)) && (!typeFilter || f.type === typeFilter) && (!statusFilter || f.status === statusFilter);
      }),
    [files, search, typeFilter, statusFilter]
  );

  return (
    <AppShell title="Importação de arquivos SPED" subtitle="Upload, parsing automático e controle de arquivos EFD ICMS/IPI e EFD Contribuições.">
      <div className="space-y-6">
        {/* Upload */}
        <Card>
          <CardTitle>Importar novo arquivo</CardTitle>
          <p className="mb-4 mt-1 text-sm text-muted">
            Envie o arquivo SPED (.txt) baixado do e-CAC (ReceitaNetBX). O parsing é feito automaticamente ao importar.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <label>
              <span className="mb-1 block text-sm font-medium">Tipo de arquivo *</span>
              <select value={tipo} onChange={(e) => setTipo(e.target.value as SpedFileType)} className="w-full rounded-md border px-3 py-2 text-sm">
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-muted">{TYPE_OPTIONS.find((t) => t.value === tipo)?.hint}</span>
            </label>
            <label className="md:col-span-2">
              <span className="mb-1 block text-sm font-medium">Projeto</span>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm">
                <option value="">Sem projeto vinculado</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.client ? ` — ${p.client.name}` : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div
            onDragEnter={(e) => handleDrag(e, true)}
            onDragOver={(e) => handleDrag(e, true)}
            onDragLeave={(e) => handleDrag(e, false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
              dragActive ? "border-navy bg-navy/5" : "border-border bg-gray-50 hover:bg-gray-100"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".txt"
              className="hidden"
              onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
            />
            {pendingFile ? (
              <>
                <p className="text-sm font-medium text-navy">{pendingFile.name}</p>
                <p className="mt-1 text-xs text-muted">{(pendingFile.size / 1024).toFixed(0)} KB — clique ou arraste para trocar</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium">Arraste o arquivo .txt aqui ou clique para selecionar</p>
                <p className="mt-1 text-xs text-muted">Arquivos de grande volume são suportados</p>
              </>
            )}
          </div>

          {uploadError && <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{uploadError}</div>}

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              disabled={uploading || !pendingFile}
              onClick={submitUpload}
              className="rounded-md bg-navy px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {uploading ? "Processando arquivo..." : "Importar e processar"}
            </button>
            {pendingFile && (
              <button
                type="button"
                onClick={() => {
                  setPendingFile(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
                className="rounded-md border px-3 py-2 text-sm"
              >
                Cancelar
              </button>
            )}
          </div>
        </Card>

        {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardTitle>Total importados</CardTitle>
            <p className="mt-2 text-2xl font-bold text-navy">{kpis.total}</p>
          </Card>
          <Card>
            <CardTitle>Processados com sucesso</CardTitle>
            <p className="mt-2 text-2xl font-bold text-green-700">{kpis.sucesso}</p>
          </Card>
          <Card>
            <CardTitle>Com avisos</CardTitle>
            <p className="mt-2 text-2xl font-bold text-yellow-700">{kpis.aviso}</p>
          </Card>
          <Card>
            <CardTitle>Com erros</CardTitle>
            <p className="mt-2 text-2xl font-bold text-red-700">{kpis.erro}</p>
          </Card>
        </div>

        {/* Lista */}
        <div className="rounded-xl border border-border bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold">Arquivos importados</h2>
              <p className="text-sm text-muted">{filtered.length} de {files.length} arquivo(s)</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-md border px-3 py-2 text-sm" placeholder="Buscar por empresa, CNPJ, arquivo..." />
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as SpedFileType | "")} className="rounded-md border px-3 py-2 text-sm">
                <option value="">Todos os tipos</option>
                <option value="efd_icms_ipi">EFD ICMS/IPI</option>
                <option value="efd_contribuicoes">EFD Contribuições</option>
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as SpedFileStatus | "")} className="rounded-md border px-3 py-2 text-sm">
                <option value="">Todos os status</option>
                <option value="sucesso">Sucesso</option>
                <option value="aviso">Com avisos</option>
                <option value="erro">Com erros</option>
              </select>
            </div>
          </div>
          {loading ? (
            <div className="p-6 text-sm text-muted">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted">Nenhum arquivo SPED importado ainda.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted">
                    <th className="px-5 py-3">Arquivo</th>
                    <th className="px-5 py-3">Tipo</th>
                    <th className="px-5 py-3">Empresa / CNPJ</th>
                    <th className="px-5 py-3">Período</th>
                    <th className="px-5 py-3">Projeto</th>
                    <th className="px-5 py-3">Registros</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Data</th>
                    <th className="px-5 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f) => (
                    <tr key={f.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3 font-medium">{f.fileName}<br /><span className="text-xs text-muted">{f.fileSizeKb} KB</span></td>
                      <td className="px-5 py-3"><Badge value={f.type} /></td>
                      <td className="px-5 py-3">{f.companyName || "—"}<br /><span className="text-xs text-muted">{f.cnpj || ""}</span></td>
                      <td className="px-5 py-3">{f.periodStart === f.periodEnd ? f.periodStart || "—" : `${f.periodStart ?? "—"} a ${f.periodEnd ?? "—"}`}</td>
                      <td className="px-5 py-3">{f.project?.name || "—"}<br /><span className="text-xs text-muted">{f.project?.client?.name || ""}</span></td>
                      <td className="px-5 py-3">
                        {f.totalRecords}
                        {(f.warningsCount > 0 || f.errorsCount > 0) && (
                          <div className="text-xs text-muted">{f.warningsCount > 0 ? `${f.warningsCount} aviso(s)` : ""}{f.warningsCount > 0 && f.errorsCount > 0 ? " · " : ""}{f.errorsCount > 0 ? `${f.errorsCount} erro(s)` : ""}</div>
                        )}
                      </td>
                      <td className="px-5 py-3"><Badge value={f.status} /></td>
                      <td className="px-5 py-3">{new Date(f.createdAt).toLocaleDateString("pt-BR")}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => openDetail(f)} className="rounded-md border px-3 py-1.5">Ver detalhe</button>
                          <button type="button" onClick={() => remove(f)} className="rounded-md border border-red-200 px-3 py-1.5 text-red-700">Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selected && <DetailModal item={selected} onClose={() => setSelected(null)} />}
    </AppShell>
  );
}

function DetailModal({ item, onClose }: { item: SpedFileItem; onClose: () => void }) {
  const ex = item.extracted;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-navy">{item.fileName}</h2>
            <div className="mt-1 flex items-center gap-2">
              <Badge value={item.type} />
              <Badge value={item.status} />
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border px-3 py-1.5 text-sm">Fechar</button>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-xs uppercase text-muted">Empresa</dt><dd>{item.companyName || "—"}</dd></div>
          <div><dt className="text-xs uppercase text-muted">CNPJ</dt><dd>{item.cnpj || "—"}</dd></div>
          <div><dt className="text-xs uppercase text-muted">IE / UF</dt><dd>{item.ie || "—"} {item.uf ? `/ ${item.uf}` : ""}</dd></div>
          <div><dt className="text-xs uppercase text-muted">Período</dt><dd>{item.periodStart ?? "—"} a {item.periodEnd ?? "—"}</dd></div>
          <div><dt className="text-xs uppercase text-muted">Total de registros</dt><dd>{item.totalRecords}</dd></div>
          <div><dt className="text-xs uppercase text-muted">Projeto</dt><dd>{item.project?.name || "—"}</dd></div>
        </dl>

        {item.type === "efd_icms_ipi" && ex?.documentos && (
          <section className="mt-5">
            <h3 className="text-sm font-semibold text-navy">Documentos fiscais (C100)</h3>
            <div className="mt-2 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <Stat label="NFs de entrada" value={String(ex.documentos.totalNotasEntrada)} />
              <Stat label="NFs de saída" value={String(ex.documentos.totalNotasSaida)} />
              <Stat label="Valor entradas" value={brl.format(ex.documentos.valorTotalEntradas)} />
              <Stat label="Valor saídas" value={brl.format(ex.documentos.valorTotalSaidas)} />
            </div>
          </section>
        )}

        {item.type === "efd_icms_ipi" && ex?.apuracaoIcms && (
          <section className="mt-5">
            <h3 className="text-sm font-semibold text-navy">Apuração ICMS (E110)</h3>
            <div className="mt-2 grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
              <Stat label="Total de débitos" value={brl.format(ex.apuracaoIcms.valorTotalDebitos)} />
              <Stat label="Total de créditos" value={brl.format(ex.apuracaoIcms.valorTotalCreditos)} />
              <Stat label="Saldo apurado" value={brl.format(ex.apuracaoIcms.saldoApurado)} />
              <Stat label="ICMS a recolher" value={brl.format(ex.apuracaoIcms.icmsARecolher)} />
              <Stat label="Saldo credor a transportar" value={brl.format(ex.apuracaoIcms.saldoCredorTransportar)} />
              <Stat label="Ajustes (E111)" value={String(ex.apuracaoIcms.ajustes.length)} />
            </div>
          </section>
        )}

        {item.type === "efd_contribuicoes" && (ex?.pis || ex?.cofins) && (
          <section className="mt-5">
            <h3 className="text-sm font-semibold text-navy">Apuração PIS/COFINS</h3>
            <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
              <Stat label="Crédito PIS apurado (M100)" value={brl.format(ex.pis?.creditoApuradoPeriodo ?? 0)} />
              <Stat label="PIS a recolher (M200)" value={brl.format(ex.pis?.contribuicaoARecolher ?? 0)} />
              <Stat label="Crédito COFINS apurado (M500)" value={brl.format(ex.cofins?.creditoApuradoPeriodo ?? 0)} />
              <Stat label="COFINS a recolher (M600)" value={brl.format(ex.cofins?.contribuicaoARecolher ?? 0)} />
            </div>
          </section>
        )}

        {ex && (ex.avisos.length > 0 || ex.erros.length > 0) && (
          <section className="mt-5 space-y-3">
            {ex.erros.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-red-700">Erros ({ex.erros.length})</h3>
                <ul className="mt-1 space-y-1 text-xs text-red-700">
                  {ex.erros.slice(0, 20).map((i, idx) => (
                    <li key={idx}>Linha {i.linha || "-"} [{i.registro}]: {i.mensagem}</li>
                  ))}
                </ul>
              </div>
            )}
            {ex.avisos.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-yellow-700">Avisos ({ex.avisos.length})</h3>
                <ul className="mt-1 space-y-1 text-xs text-yellow-700">
                  {ex.avisos.slice(0, 20).map((i, idx) => (
                    <li key={idx}>Linha {i.linha || "-"} [{i.registro}]: {i.mensagem}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-gray-50 p-3">
      <p className="text-xs uppercase text-muted">{label}</p>
      <p className="mt-1 font-semibold text-navy">{value}</p>
    </div>
  );
}
