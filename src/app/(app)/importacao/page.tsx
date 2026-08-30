"use client";

import { DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import { SpedCascade } from "@/components/sped/SpedCascade";
import type { Client, Project, SpedFileItem, SpedFileType } from "@/components/sped/types";

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
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [clientId, setClientId] = useState("");
  const [tipo, setTipo] = useState<SpedFileType>("efd_icms_ipi");
  const [projectId, setProjectId] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [selected, setSelected] = useState<SpedFileItem | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [filesRes, projectsRes, clientsRes] = await Promise.all([
        fetch("/api/sped", { cache: "no-store" }),
        fetch("/api/projetos", { cache: "no-store" }),
        fetch("/api/clientes", { cache: "no-store" }),
      ]);
      const filesData = await filesRes.json();
      if (!filesRes.ok) throw new Error(filesData.error || "Erro ao carregar arquivos importados.");
      setFiles(filesData);

      if (projectsRes.ok) {
        setProjects(await projectsRes.json());
      } else {
        const projectsData = await projectsRes.json().catch(() => null);
        throw new Error(projectsData?.error || "Erro ao carregar projetos.");
      }

      if (clientsRes.ok) {
        setClients(await clientsRes.json());
      } else {
        const clientsData = await clientsRes.json().catch(() => null);
        throw new Error(clientsData?.error || "Erro ao carregar clientes.");
      }
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

  const projectsForClient = useMemo(
    () => (clientId ? projects.filter((p) => !p.clientId || p.clientId === clientId) : projects),
    [projects, clientId]
  );

  async function submitUpload() {
    if (!clientId) {
      setUploadError("Selecione o cliente antes de importar o arquivo.");
      return;
    }
    if (!pendingFile) {
      setUploadError("Selecione ou arraste um arquivo SPED (.txt) para importar.");
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      const form = new FormData();
      form.append("file", pendingFile);
      form.append("clientId", clientId);
      form.append("type", tipo);
      if (projectId) form.append("projectId", projectId);
      const res = await fetch("/api/sped", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        // Mesmo quando bloqueado por duplicidade, o backend grava um registro "já importado"
        // para fins de auditoria — recarrega a lista para refletir essa tentativa.
        await load();
        throw new Error(data.error || "Não foi possível importar o arquivo.");
      }
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
    const duplicado = files.filter((f) => f.status === "duplicado").length;
    return { total: files.length, sucesso, aviso, erro, duplicado };
  }, [files]);

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
              <span className="mb-1 block text-sm font-medium">Cliente *</span>
              <select
                value={clientId}
                required
                onChange={(e) => {
                  const newClientId = e.target.value;
                  setClientId(newClientId);
                  // Se o projeto selecionado não pertence mais ao cliente escolhido, limpa a seleção.
                  const currentProject = projects.find((p) => p.id === projectId);
                  if (currentProject?.clientId && currentProject.clientId !== newClientId) {
                    setProjectId("");
                  }
                }}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="">Selecione o cliente</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {clients.length === 0 && (
                <span className="mt-1 block text-xs text-muted">Nenhum cliente cadastrado — cadastre em "Clientes" antes de importar.</span>
              )}
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium">Projeto</span>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm">
                <option value="">Sem projeto vinculado</option>
                {projectsForClient.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.client ? ` — ${p.client.name}` : ""}
                  </option>
                ))}
              </select>
            </label>
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
              disabled={uploading || !pendingFile || !clientId}
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
        <div className="grid gap-4 sm:grid-cols-5">
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
          <Card>
            <CardTitle>Já importados (bloqueados)</CardTitle>
            <p className="mt-2 text-2xl font-bold text-gray-600">{kpis.duplicado}</p>
          </Card>
        </div>

        {loading ? (
          <div className="rounded-xl border border-border bg-white p-6 text-sm text-muted shadow-sm">Carregando...</div>
        ) : (
          <SpedCascade files={files} onOpenDetail={openDetail} onRemove={remove} />
        )}
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
          <div><dt className="text-xs uppercase text-muted">Cliente</dt><dd>{item.client?.name || item.project?.client?.name || "—"}</dd></div>
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
