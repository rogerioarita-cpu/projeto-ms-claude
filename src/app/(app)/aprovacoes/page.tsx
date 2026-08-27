"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";

type Area = "juridico" | "financeiro" | "comercial" | "concorrencia";
type Status = "pendente" | "aprovado" | "rejeitado";

type Approval = {
  id: string;
  area: Area;
  status: Status;
  decidedBy: string | null;
  decidedAt: string | null;
  note: string | null;
  lead?: { id: string; companyName: string } | null;
  analise?: { id: string; thesis: string; taxType: string } | null;
};

const AREAS: { value: Area; label: string }[] = [
  { value: "juridico", label: "Jurídico" },
  { value: "financeiro", label: "Financeiro" },
  { value: "comercial", label: "Comercial" },
  { value: "concorrencia", label: "Concorrência" },
];

export default function AprovacoesPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<{ approval: Approval; decision: "aprovado" | "rejeitado" } | null>(null);
  const [decidedBy, setDecidedBy] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/aprovacoes", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar aprovações.");
      setApprovals(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar aprovações.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function openModal(approval: Approval, decision: "aprovado" | "rejeitado") {
    setModal({ approval, decision });
    setDecidedBy("");
    setNote("");
    setError("");
  }

  async function confirmDecision() {
    if (!modal) return;
    if (!decidedBy.trim()) {
      setError("Informe o responsável pela decisão.");
      return;
    }
    if (modal.decision === "rejeitado" && !note.trim()) {
      setError("A observação é obrigatória em caso de rejeição.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/aprovacoes/${modal.approval.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: modal.decision, decidedBy: decidedBy.trim(), note: note.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível registrar a decisão.");
      setModal(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao registrar decisão.");
    } finally {
      setSaving(false);
    }
  }

  const kpis = useMemo(() => {
    const pendentes = approvals.filter((a) => a.status === "pendente").length;
    const aprovados = approvals.filter((a) => a.status === "aprovado").length;
    const rejeitados = approvals.filter((a) => a.status === "rejeitado").length;
    return { pendentes, aprovados, rejeitados };
  }, [approvals]);

  // Agrupa por análise fiscal (cada análise concluída gera 1 processo de aprovação com 4 áreas).
  const groupedByAnalise = useMemo(() => {
    const ids = Array.from(new Set(approvals.map((a) => a.analise?.id).filter(Boolean))) as string[];
    return ids.map((id) => {
      const items = approvals.filter((a) => a.analise?.id === id);
      const rejected = items.some((a) => a.status === "rejeitado");
      const allApproved = items.length === 4 && items.every((a) => a.status === "aprovado");
      const overall = rejected ? "Rejeitado" : allApproved ? "Aprovação completa" : "Aguardando";
      return { analiseId: id, lead: items[0]?.lead, analise: items[0]?.analise, items, overall };
    });
  }, [approvals]);

  return (
    <AppShell title="Aprovações multidisciplinares" subtitle="Jurídico, Financeiro, Comercial e Concorrência precisam aprovar por unanimidade.">
      <div className="space-y-6">
        {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardTitle>Pendentes</CardTitle>
            <p className="mt-2 text-2xl font-bold text-yellow-700">{kpis.pendentes}</p>
          </Card>
          <Card>
            <CardTitle>Aprovados</CardTitle>
            <p className="mt-2 text-2xl font-bold text-green-700">{kpis.aprovados}</p>
          </Card>
          <Card>
            <CardTitle>Rejeitados</CardTitle>
            <p className="mt-2 text-2xl font-bold text-red-700">{kpis.rejeitados}</p>
          </Card>
        </div>

        {loading ? (
          <p className="text-sm text-muted">Carregando...</p>
        ) : groupedByAnalise.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma aprovação em aberto. Aprovações são criadas automaticamente quando uma análise fiscal é concluída.</p>
        ) : (
          <div className="space-y-4">
            {groupedByAnalise.map((g) => (
              <Card key={g.analiseId}>
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-navy">{g.lead?.companyName || "—"}</p>
                    <p className="text-xs text-muted">{g.analise?.thesis}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      g.overall === "Aprovação completa" ? "bg-green-100 text-green-800" : g.overall === "Rejeitado" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {g.overall}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {AREAS.map((areaDef) => {
                    const item = g.items.find((i) => i.area === areaDef.value);
                    if (!item) return null;
                    return (
                      <div key={item.id} className="rounded-md border border-border p-3">
                        <p className="text-sm font-medium">{areaDef.label}</p>
                        <div className="mt-1">
                          <Badge value={item.status} />
                        </div>
                        {item.decidedBy && <p className="mt-1 text-xs text-muted">Por: {item.decidedBy}</p>}
                        {item.note && <p className="mt-1 text-xs text-muted">{item.note}</p>}
                        {item.status === "pendente" && (
                          <div className="mt-2 flex gap-2">
                            <button type="button" onClick={() => openModal(item, "aprovado")} className="rounded-md border border-green-200 px-2 py-1 text-xs text-green-700">
                              Aprovar
                            </button>
                            <button type="button" onClick={() => openModal(item, "rejeitado")} className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700">
                              Rejeitar
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setModal(null)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-navy">
              {modal.decision === "aprovado" ? "Aprovar" : "Rejeitar"} — {AREAS.find((a) => a.value === modal.approval.area)?.label}
            </h2>
            <div className="mt-4 space-y-3">
              <label>
                <span className="mb-1 block text-sm font-medium">Responsável pela decisão *</span>
                <input value={decidedBy} onChange={(e) => setDecidedBy(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Seu nome" />
              </label>
              <label>
                <span className="mb-1 block text-sm font-medium">
                  Observação {modal.decision === "rejeitado" ? "*" : ""}
                </span>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" rows={3} placeholder={modal.decision === "rejeitado" ? "Motivo da rejeição (obrigatório)" : "Opcional"} />
              </label>
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setModal(null)} className="rounded-md border px-3 py-2 text-sm">
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={confirmDecision}
                className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${modal.decision === "aprovado" ? "bg-green-700" : "bg-red-700"}`}
              >
                {saving ? "Salvando..." : modal.decision === "aprovado" ? "Confirmar aprovação" : "Confirmar rejeição"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
