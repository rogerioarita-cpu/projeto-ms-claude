export const ROLE_VALUES = [
  "admin",
  "gestor",
  "analista_fiscal",
  "juridico",
  "comercial",
  "cliente",
  "auditor",
] as const;

export type RoleValue = (typeof ROLE_VALUES)[number];

export const ROLE_LABELS: Record<RoleValue, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  analista_fiscal: "Analista fiscal",
  juridico: "Jurídico",
  comercial: "Comercial",
  cliente: "Cliente",
  auditor: "Auditor",
};
