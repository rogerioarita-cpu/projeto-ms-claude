"use client";

import { DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";

type Lead = { id: string; companyName: string };
type DocType = "procuracao" | "nda" | "contrato" | "aditivo" | "outro";
type DocStatus = "enviado" | "pendente" | "validado" | "rejeitado";

type DocumentItem = {
  id: string;
  name: string;
  type: DocType;
  version: number;
  status: DocStatus;
  sizeKb: number;
  storagePath: string | null;
  note: string | null;
  createdAt: string;
  lead?: Lead | null;
  uploadedBy?: { name: string | null; email: string } | null;
};

const MANDATORY_TYPES: { value: DocType; label: string }[] = [
  { value: "procuracao", label: "Procuração" },
  { value: "nda", label: "NDA" },
  { value: "contrato", label: "Contrato" },
  { value: "aditivo", label: "Aditivo" },
  { value: "outro", label: "Outros" },
];

export default function DocumentosPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [type, setType] = useState<DocType>("procuracao");
  const [leadId, setLeadId] = useState("");
  const [note, setNote] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [docsRes, leadsRes] = await Promise.all([
        fetch("/api/documentos", { cache: "no-store" }),
        fetch("/api/leads", { cache: "no-store" }),
      ]);
      const docs = await docsRes.json();
      if (!docsRes.ok) throw new Error(docs.error || "Erro ao carregar documentos.");
      setDocuments(docs);
      if (leadsRes.ok) setLeads(await leadsRes.json());
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
    if (dropped) {
      setPendingFile(dropped);
      if (!name) setName(dropped.name);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!leadId) {
      setError("Selecione o lead ao qual o documento pertence.");
      return;
    }
    if (!name.trim() && !pendingFile) {
      setError("Informe um nome ou selecione um arquivo.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/documentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || pendingFile?.name,
          type,
          leadId,
          note: note.trim() || null,
          sizeKb: pendingFile ? Math.round(pendingFile.size / 1024) : 0,
          storagePath: pendingFile ? pendingFile.name : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível salvar o documento.");
      setName("");
      setNote("");
      setPendingFile(null);
      if (inputRef.current) inputRef.current.value = "";
      setExpandedLead(leadId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar documento.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(doc: DocumentItem, status: DocStatus) {
    setError("");
    try {
      const res = await fetch(`/api/documentos/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao atualizar status.");
    }
  }

  async function remove(doc: DocumentItem) {
    if (!window.confirm(`Excluir o documento "${doc.name}" (v${doc.version})?`)) return;
    try {
      const res = await fetch(`/api/documentos/${doc.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao excluir documento.");
    }
  }

  const kpis = useMemo(() => {
    const validados = documents.filter((d) => d.status === "validado").length;
    const aguardando = documents.filter((d) => d.status === "enviado").length;
    const pendentes = documents.filter((d) => d.status === "pendente").length;
    return { validados, aguardando, pendentes };
  }, [documents]);

  // Agrupa por lead — para cada lead, pega a versão mais recente de cada tipo obrigatório.
  const groupedByLead = useMemo(() => {
    const q = search.toLowerCase().trim();
    const leadIds = Array.from(new Set(documents.map((d) => d.lead?.id).filter(Boolean))) as string[];
    return leadIds
      .map((id) => {
        const leadDocs = documents.filter((d) => d.lead?.id === id);
        const leadName = leadDocs[0]?.lead?.companyName ?? "—";
        const latestByType: Partial<Record<DocType, DocumentItem>> = {};
        for (const d of leadDocs) {
          const current = latestByType[d.type];
          if (!current || d.version > current.version) latestByType[d.type] = d;
        }
        const procuracaoOk = latestByType.procuracao?.status === "validado";
        const ndaOk = latestByType.nda?.status === "validado";
        return { leadId: id, leadName, leadDocs, latestByType, blocked: !(procuracaoOk && ndaOk) };
      })
      .filter((g) => !q || g.leadName.toLowerCase().includes(q));
  }, [documents, search]);

  return (
    <AppShell title="Gestão documental" subtitle="Documentos versionados e rastreáveis por lead.">
      <div className="space-y-6">
        <Card>
          <CardTitle>Enviar documento</CardTitle>
          <p className="mb-4 mt-1 text-sm text-muted">Tipos: Procuração, NDA, Contrato, Aditivo ou Outros. A versão é numerada automaticamente por tipo, dentro de cada lead.</p>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-4">
            <label>
              <span className="mb-1 block text-sm font-medium">Lead *</span>
              <select value={leadId} onChange={(e) => setLeadId(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm">
                <option value="">Selecione</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.companyName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium">Tipo *</span>
              <select value={type} onChange={(e) => setType(e.target.value as DocType)} className="w-full rounded-md border px-3 py-2 text-sm">
                {MANDATORY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="md:col-span-2">
              <span className="mb-1 block text-sm font-medium">Nome do documento</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Preenchido automaticamente pelo arquivo, se enviado" />
            </label>

            <div
              onDragEnter={(e) => handleDrag(e, true)}
              onDragOver={(e) => handleDrag(e, true)}
              onDragLeave={(e) => handleDrag(e, false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`md:col-span-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                dragActive ? "border-navy bg-navy/5" : "border-border bg-gray-50 hover:bg-gray-100"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setPendingFile(f);
                  if (f && !name) setName(f.name);
                }}
              />
              {pendingFile ? (
                <p className="text-sm font-medium text-navy">{pendingFile.name} — {(pendingFile.size / 1024).toFixed(0)} KB</p>
              ) : (
                <p className="text-sm">Arraste o arquivo aqui ou clique para selecionar</p>
              )}
            </div>
            <label>
              <span className="mb-1 block text-sm font-medium">Observação</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Opcional" />
            </label>

            <div className="flex items-end md:col-span-4">
              <button disabled={saving} className="rounded-md bg-navy px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
                {saving ? "Enviando..." : "Enviar documento"}
              </button>
            </div>
          </form>
        </Card>

        {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardTitle>Validados</CardTitle>
            <p className="mt-2 text-2xl font-bold text-green-700">{kpis.validados}</p>
          </Card>
          <Card>
            <CardTitle>Aguardando revisão</CardTitle>
            <p className="mt-2 text-2xl font-bold text-blue-700">{kpis.aguardando}</p>
          </Card>
          <Card>
            <CardTitle>Pendentes</CardTitle>
            <p className="mt-2 text-2xl font-bold text-yellow-700">{kpis.pendentes}</p>
          </Card>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Documentos por lead</h2>
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-md border px-3 py-2 text-sm" placeholder="Buscar lead..." />
        </div>

        {loading ? (
          <p className="text-sm text-muted">Carregando...</p>
        ) : groupedByLead.length === 0 ? (
          <p className="text-sm text-muted">Nenhum documento cadastrado ainda.</p>
        ) : (
          <div className="space-y-3">
            {groupedByLead.map((g) => (
              <div key={g.leadId} className="rounded-xl border border-border bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setExpandedLead(expandedLead === g.leadId ? null : g.leadId)}
                  className="flex w-full items-center justify-between p-4 text-left"
                >
                  <div>
                    <p className="font-medium">{g.leadName}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {MANDATORY_TYPES.map((t) => {
                        const doc = g.latestByType[t.value];
                        return (
                          <span key={t.value} className="flex items-center gap-1 text-xs text-muted">
                            {t.label}: {doc ? <Badge value={doc.status} /> : <Badge value="pendente" />}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {g.blocked && (
                      <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                        Análise fiscal bloqueada — falta Procuração + NDA validados
                      </span>
                    )}
                    <span className="text-xs text-muted">{expandedLead === g.leadId ? "▲" : "▼"}</span>
                  </div>
                </button>
                {expandedLead === g.leadId && (
                  <div className="border-t border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs uppercase text-muted">
                          <th className="px-4 py-2">Nome</th>
                          <th className="px-4 py-2">Tipo</th>
                          <th className="px-4 py-2">Versão</th>
                          <th className="px-4 py-2">Status</th>
                          <th className="px-4 py-2">Enviado por</th>
                          <th className="px-4 py-2">Data</th>
                          <th className="px-4 py-2 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.leadDocs
                          .slice()
                          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                          .map((d) => (
                            <tr key={d.id} className="border-b border-border last:border-0">
                              <td className="px-4 py-2 font-medium">{d.name}</td>
                              <td className="px-4 py-2">
                                <Badge value={d.type} />
                              </td>
                              <td className="px-4 py-2">v{d.version}</td>
                              <td className="px-4 py-2">
                                <select
                                  value={d.status}
                                  onChange={(e) => updateStatus(d, e.target.value as DocStatus)}
                                  className="rounded-md border px-2 py-1 text-xs"
                                >
                                  <option value="enviado">Enviado</option>
                                  <option value="pendente">Pendente</option>
                                  <option value="validado">Validado</option>
                                  <option value="rejeitado">Rejeitado</option>
                                </select>
                              </td>
                              <td className="px-4 py-2">{d.uploadedBy?.name || d.uploadedBy?.email || "—"}</td>
                              <td className="px-4 py-2">{new Date(d.createdAt).toLocaleDateString("pt-BR")}</td>
                              <td className="px-4 py-2 text-right">
                                <button type="button" onClick={() => remove(d)} className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700">
                                  Excluir
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
