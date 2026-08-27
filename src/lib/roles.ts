import type { AppRole } from "@prisma/client";

/** Papéis considerados "staff" — equivalente à função is_staff() do schema Supabase original. */
export const STAFF_ROLES: AppRole[] = [
  "admin",
  "gestor",
  "analista_fiscal",
  "juridico",
  "comercial",
  "aprovador",
];

export function isStaff(roles: AppRole[]): boolean {
  return roles.some((r) => STAFF_ROLES.includes(r));
}

export function hasRole(roles: AppRole[], role: AppRole): boolean {
  return roles.includes(role);
}

/** true se o usuário só enxerga dados da própria empresa (PRD: filtro automático para cliente_consulta). */
export function isClienteConsulta(roles: AppRole[]): boolean {
  return roles.includes("cliente_consulta");
}
