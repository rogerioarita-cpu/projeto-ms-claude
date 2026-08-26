"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);
    if (res?.error) {
      setError("E-mail ou senha invÃ¡lidos.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f9fb] px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-gold">Projeto MS</p>
        <h1 className="mt-1 text-xl font-bold text-navy">Entrar na plataforma</h1>
        <p className="mt-1 text-sm text-muted">Auditoria fiscal SPED e recuperaÃ§Ã£o de crÃ©ditos.</p>

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
          <div>
            <label className="block text-sm font-medium text-gray-700">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-navy"
              placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="mt-3 w-full rounded-md border border-border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Entrar com Google
        </button>

        <p className="mt-6 text-center text-xs text-muted">
          Demo: admin@projeto-ms.local / Admin@123456
        </p>
      </div>
    </main>
  );
}
