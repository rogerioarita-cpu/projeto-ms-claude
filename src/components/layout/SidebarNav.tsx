"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

type NavChild = {
  href: string;
  label: string;
  /** Só aparece para usuários com o papel "admin" (RBAC do tenant). */
  requiresAdmin?: boolean;
  /** Só aparece para usuários com o papel "super_admin" (super-admin de plataforma). */
  requiresSuperAdmin?: boolean;
};

type NavItem = {
  /** Sem href, o item vira só um cabeçalho — usado para agrupar subitens,
   * cada um com sua própria regra de visibilidade. Todo item com subitens é
   * expansível ao clicar, e começa fechado por padrão (ver `expanded` abaixo). */
  href?: string;
  label: string;
  children?: NavChild[];
  requiresAdmin?: boolean;
  requiresSuperAdmin?: boolean;
};

const NAV: NavItem[] = [
  { href: "/inicio", label: "Início" },
  {
    label: "Leads/Clientes",
    children: [
      { href: "/leads", label: "Gestão de Leads/Clientes" },
      { href: "/documentos", label: "Gestão documental" },
      { href: "/leads/pipeline", label: "Workflow e acompanhamento" },
    ],
  },
  { href: "/importacao", label: "Importação SPED" },
  { href: "/analise", label: "Análise fiscal" },
  { href: "/aprovacoes", label: "Aprovações" },
  { href: "/auditoria", label: "Auditoria SPED" },
  { href: "/creditos", label: "Recuperação de créditos" },
  { href: "/dashboard", label: "Dashboard" },
  {
    label: "Configurações gerais",
    children: [
      { href: "/usuarios", label: "Cadastro de usuários", requiresAdmin: true },
      { href: "/plataforma/tenants", label: "Cadastro de Organizações", requiresSuperAdmin: true },
      { href: "/configuracoes", label: "Configuração de envio de e-mail", requiresAdmin: true },
    ],
  },
];

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={`h-3.5 w-3.5 flex-shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}>
      <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Chave usada no localStorage para lembrar quais grupos do menu estavam
// abertos, entre recarregamentos de página (a sessão de navegação em si já
// mantém o estado normalmente — isto é só para sobreviver a um F5).
const STORAGE_KEY = "sidebar-nav-expanded";

export function SidebarNav() {
  const { data: session } = useSession();
  const roles = ((session?.user as { roles?: string[] } | undefined)?.roles ?? []) as string[];
  const isAdmin = roles.includes("admin");
  const isPlatformSuperAdmin = roles.includes("super_admin");

  // Todo grupo com subitens começa fechado por padrão (chave ausente = fechado).
  // O valor inicial aqui precisa ser o mesmo tanto no servidor quanto no
  // primeiro render do cliente (sempre fechado) para não gerar mismatch de
  // hidratação — a leitura do localStorage só acontece depois, no useEffect.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setExpanded(JSON.parse(raw));
    } catch {
      // localStorage indisponível (ex.: navegação privada) ou conteúdo
      // corrompido — mantém o padrão (tudo fechado), sem quebrar o menu.
    }
  }, []);

  function toggle(label: string) {
    setExpanded((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Sem espaço/permissão no localStorage — a expansão ainda funciona
        // nesta sessão, só não persiste entre recarregamentos.
      }
      return next;
    });
  }

  function isVisible(entry: { requiresAdmin?: boolean; requiresSuperAdmin?: boolean }) {
    if (entry.requiresAdmin && !isAdmin && !isPlatformSuperAdmin) return false;
    if (entry.requiresSuperAdmin && !isPlatformSuperAdmin) return false;
    return true;
  }

  const visibleNav = NAV.map((item) => ({
    ...item,
    children: item.children?.filter(isVisible),
  })).filter((item) => {
    if (!isVisible(item)) return false;
    // Grupo sem subitem visível não tem o que mostrar — some inteiro.
    if (item.children && item.children.length === 0) return false;
    return true;
  });

  return (
    <nav className="mt-2 flex-1 space-y-0.5 overflow-y-auto px-2">
      {visibleNav.map((item) => {
        const hasChildren = Boolean(item.children && item.children.length > 0);
        const isOpen = Boolean(expanded[item.label]);

        return (
          <div key={item.href ?? item.label}>
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggle(item.label)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white/50 hover:bg-white/10 hover:text-white/70"
              >
                {item.label}
                <ChevronIcon open={isOpen} />
              </button>
            ) : (
              <Link href={item.href!} className="block rounded-md px-3 py-2 text-sm text-white/85 hover:bg-white/10">
                {item.label}
              </Link>
            )}

            {hasChildren && isOpen && (
              <div className="space-y-0.5">
                {item.children!.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className="flex items-center gap-1 rounded-md py-1.5 pl-6 pr-3 text-xs text-white/60 hover:bg-white/10 hover:text-white/85"
                  >
                    <span>›</span>
                    {child.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
