"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type Tenant = { id: string; name: string; createdAt: string };

export function SidebarTenantSwitcher() {
  const { data: session } = useSession();
  const isPlatformSuperAdmin = (session?.user as { isPlatformSuperAdmin?: boolean } | undefined)?.isPlatformSuperAdmin;
  const tenantName = (session?.user as { tenantName?: string | null } | undefined)?.tenantName;

  const [tenants, setTenants] = useState<Tenant[] | null>(null);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (!isPlatformSuperAdmin) return;
    Promise.all([
      fetch("/api/plataforma/tenants", { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/plataforma/active-tenant", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
    ]).then(([tenantList, active]) => {
      setTenants(
        [...tenantList].sort((a: Tenant, b: Tenant) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      );
      setActiveTenantId(active?.tenantId ?? null);
    });
  }, [isPlatformSuperAdmin]);

  async function switchTenant(tenantId: string) {
    if (tenantId === activeTenantId) return;
    setSwitching(true);
    try {
      const res = await fetch("/api/plataforma/active-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } finally {
      setSwitching(false);
    }
  }

  if (!session?.user) return null;

  // Usuário comum: mostra só o nome fixo da própria organização.
  if (!isPlatformSuperAdmin) {
    if (!tenantName) return null;
    return <p className="mt-1 truncate text-xs font-medium text-white/70">{tenantName}</p>;
  }

  // Super-admin: só 1 organização cadastrada -> mostra fixo, sem seletor.
  if (!tenants || tenants.length <= 1) {
    const onlyName = tenants?.[0]?.name;
    return onlyName ? <p className="mt-1 truncate text-xs font-medium text-white/70">{onlyName}</p> : null;
  }

  // Super-admin com várias organizações -> seletor, com a mais antiga como default.
  return (
    <select
      value={activeTenantId ?? tenants[0].id}
      disabled={switching}
      onChange={(e) => switchTenant(e.target.value)}
      className="mt-1 w-full rounded-md border border-white/20 bg-navy px-1.5 py-1 text-xs font-medium text-white/90 disabled:opacity-60"
    >
      {tenants.map((t) => (
        <option key={t.id} value={t.id} className="bg-white text-navy">
          {t.name}
        </option>
      ))}
    </select>
  );
}
