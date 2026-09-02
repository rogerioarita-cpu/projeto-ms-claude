"use client";

import { useSession } from "next-auth/react";

export function SidebarTenantName() {
  const { data: session } = useSession();
  const tenantName = (session?.user as { tenantName?: string | null } | undefined)?.tenantName;
  if (!tenantName) return null;

  return <p className="mt-1 truncate text-xs font-medium text-white/70">{tenantName}</p>;
}
