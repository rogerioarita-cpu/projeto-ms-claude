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
const CEP_RE = /^\d{8}$/;

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

  const addressZipDigits = body.addressZip ? onlyDigits(String(body.addressZip)) : "";
  const addressStreet = body.addressStreet ? String(body.addressStreet).trim() : null;
  const addressNumber = body.addressNumber ? String(body.addressNumber).trim() : null;
  const addressComplement = body.addressComplement ? String(body.addressComplement).trim() : null;
  const addressNeighborhood = body.addressNeighborhood ? String(body.addressNeighborhood).trim() : null;
  const addressCity = body.addressCity ? String(body.addressCity).trim() : null;
  const addressState = body.addressState ? String(body.addressState).trim().toUpperCase() : null;

  if (!companyName) throw new Error("A razão social é obrigatória.");
  if (body.cnpj && !CNPJ_RE.test(cnpjDigits)) throw new Error("O CNPJ deve ter 14 dígitos.");
  if (companyType && !COMPANY_TYPE_VALUES.includes(companyType as (typeof COMPANY_TYPE_VALUES)[number])) {
    throw new Error("Tipo de empresa inválido.");
  }
  if (contactEmail && !EMAIL_RE.test(contactEmail)) throw new Error("O e-mail informado não é válido.");
  if (!LEAD_STATUS_VALUES.includes(status as (typeof LEAD_STATUS_VALUES)[number])) throw new Error("Status de lead inválido.");
  if (!Number.isFinite(estimatedValue) || estimatedValue < 0) throw new Error("O crédito estimado deve ser um número maior ou igual a zero.");
  if (body.addressZip && !CEP_RE.test(addressZipDigits)) throw new Error("O CEP deve ter 8 dígitos.");
  if (addressState && addressState.length !== 2) throw new Error("A UF deve ter 2 letras.");

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
    addressZip: body.addressZip ? addressZipDigits : null,
    addressStreet,
    addressNumber,
    addressComplement,
    addressNeighborhood,
    addressCity,
    addressState,
    notes,
  };
}
