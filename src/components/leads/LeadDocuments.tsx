"use client";

import { DragEvent, FormEvent, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";

type DocType = "procuracao" | "nda" | "contrato" | "aditivo" | "outro";
type DocStatus = "enviado" | "pendente" | "validado" | "rejeitado";

type DocumentItem = {
  id: string;
  name: string;
  type: DocType;
  version: number;
  status: DocStatus;
  sizeKb: number;
  note: string | null;
  createdAt: string;
  uploadedBy?: { name: string | null; email: string } | null;
};

const MANDATORY_TYPES: { value: DocType; label: string }[] = [
  { value: "procuracao", label: "Procuração" },
  { value: "nda", label: "NDA" },
  { value: "contrato", label: "Contrato" },
  { value: "aditivo", label: "Aditivo" },
  { value: "outro", label: "Outros" },
];

export function LeadDocuments({ leadId }: { leadId: string }) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [type, setType] = useState<DocType>("procuracao");
  const [note, setNote] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/documentos?leadId=${leadId}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar documentos.");
      setDocuments(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar documentos.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

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

  const latestByType: Partial<Record<DocType, DocumentItem>> = {};
  for (const d of documents) {
    const current = latestByType[d.type];
    if (!current || d.version > current.version) latestByType[d.type] = d;
  }
  const procuracaoOk = latestByType.procuracao?.status === "validado";
  const ndaOk = latestByType.nda?.status === "validado";

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-navy">Gestão documental</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {MANDATORY_TYPES.map((t) => (
            <span key={t.value} className="flex items-center gap-1 text-xs text-muted">
              {t.label}: {latestByType[t.value] ? <Badge value={latestByType[t.value]!.status} /> : <Badge value="pendente" />}
            </span>
          ))}
        </div>
        {!(procuracaoOk && ndaOk) && (
          <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            Análise fiscal bloqueada — falta Procuração + NDA validados
          </p>
        )}
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">{error}</div>}

      <form onSubmit={submit} className="grid gap-3 rounded-md border border-border bg-gray-50 p-3 md:grid-cols-3">
        <label>
          <span className="mb-1 block text-xs font-medium">Tipo *</span>
          <select value={type} onChange={(e) => setType(e.target.value as DocType)} className="w-full rounded-md border px-2 py-1.5 text-sm">
            {MANDATORY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="md:col-span-2">
          <span className="mb-1 block text-xs font-medium">Nome do documento</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border px-2 py-1.5 text-sm" placeholder="Preenchido automaticamente pelo arquivo" />
        </label>

        <div
          onDragEnter={(e) => handleDrag(e, true)}
          onDragOver={(e) => handleDrag(e, true)}
          onDragLeave={(e) => handleDrag(e, false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`md:col-span-2 flex cursor-pointer items-center justify-center rounded-md border-2 border-dashed p-3 text-center text-xs transition-colors ${
            dragActive ? "border-navy bg-navy/5" : "border-border bg-white hover:bg-gray-100"
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
          {pendingFile ? `${pendingFile.name} — ${(pendingFile.size / 1024).toFixed(0)} KB` : "Arraste o arquivo aqui ou clique para selecionar"}
        </div>
        <label>
          <span className="mb-1 block text-xs font-medium">Observação</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-md border px-2 py-1.5 text-sm" placeholder="Opcional" />
        </label>

        <div className="md:col-span-3">
          <button disabled={saving} className="rounded-md bg-navy px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50">
            {saving ? "Enviando..." : "Enviar documento"}
          </button>
        </div>
      </form>

      {loading ? (
        <p className="text-xs text-muted">Carregando documentos...</p>
      ) : documents.length === 0 ? (
        <p className="text-xs text-muted">Nenhum documento cadastrado para este lead ainda.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-gray-50 text-left uppercase text-muted">
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Versão</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Enviado por</th>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {documents
                .slice()
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((d) => (
                  <tr key={d.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-medium">{d.name}</td>
                    <td className="px-3 py-2">
                      <Badge value={d.type} />
                    </td>
                    <td className="px-3 py-2">v{d.version}</td>
                    <td className="px-3 py-2">
                      <select value={d.status} onChange={(e) => updateStatus(d, e.target.value as DocStatus)} className="rounded-md border px-1.5 py-1 text-xs">
                        <option value="enviado">Enviado</option>
                        <option value="pendente">Pendente</option>
                        <option value="validado">Validado</option>
                        <option value="rejeitado">Rejeitado</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">{d.uploadedBy?.name || d.uploadedBy?.email || "—"}</td>
                    <td className="px-3 py-2">{new Date(d.createdAt).toLocaleDateString("pt-BR")}</td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" onClick={() => remove(d)} className="rounded-md border border-red-200 px-2 py-1 text-red-700">
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
  );
}
