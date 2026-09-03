"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

type NavItem = {
  href: string;
  label: string;
  children?: { href: string; label: string }[];
  /** Só aparece para usuários com o papel "admin" (RBAC do tenant). */
  requiresAdmin?: boolean;
  /** Só aparece para usuários com o papel "super_admin" (super-admin de plataforma). */
  requiresSuperAdmin?: boolean;
};

const NAV: NavItem[] = [
  { href: "/inicio", label: "Início" },
  {
    href: "/leads",
    label: "Gestão de Leads/Clientes",
    children: [
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
  { href: "/usuarios", label: "Cadastro de usuários", requiresAdmin: true },
  { href: "/plataforma/tenants", label: "Cadastro de Organizações", requiresSuperAdmin: true },
];

export function SidebarNav() {
  const { data: session } = useSession();
  const roles = ((session?.user as { roles?: string[] } | undefined)?.roles ?? []) as string[];
  const isAdmin = roles.includes("admin");
  const isPlatformSuperAdmin = roles.includes("super_admin");

  const visibleNav = NAV.filter((item) => {
    if (item.requiresAdmin && !isAdmin && !isPlatformSuperAdmin) return false;
    if (item.requiresSuperAdmin && !isPlatformSuperAdmin) return false;
    return true;
  });

  return (
    <nav className="mt-2 flex-1 space-y-0.5 overflow-y-auto px-2">
      {visibleNav.map((item) => (
        <div key={item.href}>
          <Link href={item.href} className="block rounded-md px-3 py-2 text-sm text-white/85 hover:bg-white/10">
            {item.label}
          </Link>
          {item.children?.map((child) => (
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
      ))}
    </nav>
  );
}
