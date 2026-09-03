import { SignOutButton } from "./SignOutButton";
import { SidebarUser } from "./SidebarUser";
import { SidebarTenantSwitcher } from "./SidebarTenantSwitcher";
import { SidebarNav } from "./SidebarNav";

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
          <SidebarTenantSwitcher />
        </div>
        <SidebarNav />
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
