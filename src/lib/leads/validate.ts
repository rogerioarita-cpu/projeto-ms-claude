export const LEAD_STATUS_VALUES = [
  "novo",
  "qualificacao",
  "reuniao_agendada",
  "documentacao",
  "analise_fiscal",
  "proposta",
  "contrato",
  "aprovado",
  "cancelado",
] as const;

export const COMPANY_TYPE_VALUES = ["industria", "comercio", "revenda", "servicos"] as const;

const CNPJ_RE = /^\d{14}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function parseLeadPayload(body: any) {
  const companyName = String(body.companyName ?? "").trim();
  const cnpjDigits = body.cnpj ? onlyDigits(String(body.cnpj)) : "";
  const companyType = body.companyType ? String(body.companyType) : null;
  const contactName = body.contactName ? String(body.contactName).trim() : null;
  const contactEmail = body.contactEmail ? String(body.contactEmail).trim() : null;
  const phone = body.phone ? String(body.phone).trim() : null;
  const status = String(body.status ?? "novo");
  const estimatedValue = body.estimatedValue !== undefined && body.estimatedValue !== "" ? Number(body.estimatedValue) : 0;
  const procurationSigned = Boolean(body.procurationSigned);
  const ndaSigned = Boolean(body.ndaSigned);
  const notes = body.notes ? String(body.notes).trim() : null;

  if (!companyName) throw new Error("A razão social é obrigatória.");
  if (body.cnpj && !CNPJ_RE.test(cnpjDigits)) throw new Error("O CNPJ deve ter 14 dígitos.");
  if (companyType && !COMPANY_TYPE_VALUES.includes(companyType as (typeof COMPANY_TYPE_VALUES)[number])) {
    throw new Error("Tipo de empresa inválido.");
  }
  if (contactEmail && !EMAIL_RE.test(contactEmail)) throw new Error("O e-mail informado não é válido.");
  if (!LEAD_STATUS_VALUES.includes(status as (typeof LEAD_STATUS_VALUES)[number])) throw new Error("Status de lead inválido.");
  if (!Number.isFinite(estimatedValue) || estimatedValue < 0) throw new Error("O crédito estimado deve ser um número maior ou igual a zero.");

  return {
    companyName,
    cnpj: body.cnpj ? cnpjDigits : null,
    companyType: companyType as (typeof COMPANY_TYPE_VALUES)[number] | null,
    contactName,
    contactEmail,
    phone,
    status: status as (typeof LEAD_STATUS_VALUES)[number],
    estimatedValue,
    procurationSigned,
    ndaSigned,
    notes,
  };
}
