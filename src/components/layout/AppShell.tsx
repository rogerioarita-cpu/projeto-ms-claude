import Link from "next/link";
import { SignOutButton } from "./SignOutButton";
import { SidebarUser } from "./SidebarUser";

const NAV = [
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
  { href: "/usuarios", label: "Cadastro de usuários" },
];

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-navy text-white md:flex md:flex-col">
        <div className="px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold">Projeto MS</p>
          <p className="mt-0.5 text-sm text-white/70">Auditoria fiscal SPED</p>
        </div>
        <nav className="mt-2 flex-1 space-y-0.5 overflow-y-auto px-2">
          {NAV.map((item) => (
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
        <div className="border-t border-white/10">
          <SidebarUser />
          <div className="px-4 pb-4">
            <SignOutButton />
          </div>
        </div>
      </aside>

      <div className="flex-1">
        <header className="border-b border-border bg-white px-6 py-5">
          <h1 className="text-lg font-bold text-navy">{title}</h1>
          {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
