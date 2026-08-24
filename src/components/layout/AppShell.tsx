import Link from "next/link";
import { SignOutButton } from "./SignOutButton";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/clientes", label: "Clientes" },
  { href: "/projetos", label: "Projetos" },
  { href: "/leads", label: "Pipeline de leads" },
  { href: "/auditoria", label: "Auditoria SPED" },
  { href: "/creditos", label: "Recuperação de créditos" },
  { href: "/workflow", label: "Workflow tributário" },
  { href: "/documentos", label: "Gestão documental" },
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
      <aside className="hidden w-60 shrink-0 border-r border-border bg-navy text-white md:block">
        <div className="px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold">Projeto MS</p>
          <p className="mt-0.5 text-sm text-white/70">Auditoria fiscal SPED</p>
        </div>
        <nav className="mt-2 space-y-0.5 px-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm text-white/85 hover:bg-white/10"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 w-60 border-t border-white/10 px-4 py-4">
          <SignOutButton />
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
