export const ROLE_VALUES = [
  "admin",
  "gestor",
  "analista_fiscal",
  "juridico",
  "comercial",
  "aprovador",
  "lead_cliente",
] as const;

export type RoleValue = (typeof ROLE_VALUES)[number];

// Tipado como Record<string, string> (não Record<RoleValue, string>) de propósito:
// inclui também "super_admin", que NÃO é selecionável no formulário comum de
// usuários (não está em ROLE_VALUES) — só é atribuído pelo fluxo dedicado de
// super-admin de plataforma —, mas ainda precisa de um rótulo para exibição
// (ex.: listagem de usuários, nome do papel no menu).
export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  analista_fiscal: "Analista fiscal",
  juridico: "Jurídico",
  comercial: "Comercial",
  aprovador: "Aprovador",
  lead_cliente: "Lead/Cliente",
  super_admin: "Super Administrador",
};

// Breve descrição de cada perfil, usada no modal de cadastro de usuário (PRD 6.10).
export const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: "Acesso total ao sistema, incluindo cadastro de usuários.",
  gestor: "Visão gerencial de leads, análises e aprovações.",
  analista_fiscal: "Conduz análises fiscais e importação de arquivos SPED.",
  juridico: "Responsável pela aprovação da área Jurídico.",
  comercial: "Responsável pela aprovação da área Comercial.",
  aprovador: "Responsável pelas aprovações de Financeiro e Concorrência.",
  lead_cliente: "Acesso somente de consulta, restrito aos dados do Lead/Cliente vinculado.",
  super_admin: "Acesso à plataforma inteira — cria e gerencia organizações. Atribuído apenas pelo fluxo de super-administradores.",
};
