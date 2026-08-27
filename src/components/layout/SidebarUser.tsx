"use client";

import { useSession } from "next-auth/react";
import { ROLE_LABELS, type RoleValue } from "@/lib/role-options";

export function SidebarUser() {
  const { data: session } = useSession();
  if (!session?.user) return null;

  const roles = ((session.user as { roles?: string[] }).roles ?? []) as RoleValue[];
  const primaryRoleLabel = roles.length ? ROLE_LABELS[roles[0]] ?? roles[0] : null;

  return (
    <div className="px-4 py-3">
      <p className="truncate text-sm font-medium text-white">{session.user.name ?? session.user.email}</p>
      {primaryRoleLabel && <p className="text-xs text-white/60">{primaryRoleLabel}</p>}
    </div>
  );
}
