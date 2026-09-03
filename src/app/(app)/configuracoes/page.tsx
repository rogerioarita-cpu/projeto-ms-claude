"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardTitle } from "@/components/ui/Card";
import { PasswordInput } from "@/components/ui/PasswordInput";

type SmtpForm = {
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
};

const emptyForm: SmtpForm = { smtpHost: "", smtpPort: "587", smtpUser: "", smtpPass: "", smtpFrom: "" };

export default function ConfiguracoesGeraisPage() {
  const { data: session } = useSession();
  const roles = ((session?.user as { roles?: string[] } | undefined)?.roles ?? []) as string[];
  const isPlatformSuperAdmin = roles.includes("super_admin");
  const tenantName = (session?.user as { tenantName?: string | null } | undefined)?.tenantName;

  // Só relevante para super-admins: qual configuração eles estão editando agora.
  const [scope, setScope] = useState<"tenant" | "system">("tenant");

  const [form, setForm] = useState<SmtpForm>(emptyForm);
  const [passAlreadySet, setPassAlreadySet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const endpoint = scope === "system" ? "/api/plataforma/settings/smtp" : "/api/settings/smtp";

  async function load() {
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      const res = await fetch(endpoint, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível carregar as configurações.");
      setForm({
        smtpHost: data.smtpHost ?? "",
        smtpPort: String(data.smtpPort ?? 587),
        smtpUser: data.smtpUser ?? "",
        smtpPass: "",
        smtpFrom: data.smtpFrom ?? "",
      });
      setPassAlreadySet(Boolean(data.smtpPassSet));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar as configurações.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSaving(true);
    try {
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtpHost: form.smtpHost,
          smtpPort: form.smtpPort,
          smtpUser: form.smtpUser,
          smtpPass: form.smtpPass || undefined,
          smtpFrom: form.smtpFrom,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível salvar as configurações.");
      setSuccess(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar as configurações.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Configuração de envio de e-mail" subtitle="Configuração de SMTP do sistema.">
      <div className="space-y-6">
        {isPlatformSuperAdmin && (
          <Card>
            <CardTitle className="text-base">O que você está configurando?</CardTitle>
            <div className="mt-3 flex flex-wrap gap-3">
              <label className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                <input type="radio" checked={scope === "tenant"} onChange={() => setScope("tenant")} />
                Esta organização{tenantName ? ` (${tenantName})` : ""}
              </label>
              <label className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                <input type="radio" checked={scope === "system"} onChange={() => setScope("system")} />
                Geral do sistema (usado por organizações sem SMTP próprio)
              </label>
            </div>
          </Card>
        )}

        <Card>
          <CardTitle className="text-base">
            {scope === "system" ? "SMTP geral do sistema" : `SMTP de ${tenantName || "sua organização"}`}
          </CardTitle>
          <p className="mb-4 text-sm text-muted">
            {scope === "system"
              ? "Usado para enviar e-mails de organizações que não têm um SMTP próprio configurado."
              : "Se preenchido, é usado no lugar da configuração geral do sistema para os e-mails desta organização."}
          </p>

          {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {success && <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">Configurações salvas.</div>}

          {loading ? (
            <p className="text-sm text-muted">Carregando...</p>
          ) : (
            <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-1 block text-sm font-medium">Servidor (host)</span>
                <input
                  value={form.smtpHost}
                  onChange={(e) => setForm((f) => ({ ...f, smtpHost: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="smtp.exemplo.com"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-medium">Porta</span>
                <input
                  value={form.smtpPort}
                  onChange={(e) => setForm((f) => ({ ...f, smtpPort: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="587"
                  inputMode="numeric"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-medium">Usuário</span>
                <input
                  value={form.smtpUser}
                  onChange={(e) => setForm((f) => ({ ...f, smtpUser: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="usuario@exemplo.com"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-medium">
                  Senha {passAlreadySet && <span className="text-xs text-muted">(já cadastrada)</span>}
                </span>
                <PasswordInput
                  value={form.smtpPass}
                  onChange={(e) => setForm((f) => ({ ...f, smtpPass: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder={passAlreadySet ? "Deixe em branco para manter a atual" : "Senha do servidor SMTP"}
                />
              </label>
              <label className="md:col-span-2">
                <span className="mb-1 block text-sm font-medium">E-mail remetente</span>
                <input
                  value={form.smtpFrom}
                  onChange={(e) => setForm((f) => ({ ...f, smtpFrom: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="naoresponda@exemplo.com"
                />
              </label>
              <div className="md:col-span-2">
                <button disabled={saving} className="rounded-md bg-navy px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
                  {saving ? "Salvando..." : "Salvar configurações"}
                </button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
