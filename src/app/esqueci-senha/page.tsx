"use client";

import { useState } from "react";
import Link from "next/link";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => null);

    setLoading(false);
    if (!res.ok) {
      setError(data?.error ?? "Não foi possível enviar a solicitação. Tente novamente.");
      return;
    }
    setSent(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f9fb] px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-gold">Projeto MS</p>
        <h1 className="mt-1 text-xl font-bold text-navy">Esqueci minha senha</h1>
        <p className="mt-1 text-sm text-muted">
          Informe seu e-mail — vamos avisar os administradores da sua organização para que redefinam sua senha.
        </p>

        {sent ? (
          <p className="mt-6 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            Solicitação enviada aos administradores da sua organização. Você receberá um e-mail assim que sua senha for
            redefinida.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-navy"
                placeholder="voce@empresa.com.br"
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Enviando..." : "Enviar solicitação"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-muted">
          <Link href="/login" className="font-medium underline">
            Voltar para o login
          </Link>
        </p>
      </div>
    </main>
  );
}
