export type Project = { id: string; name: string; clientId?: string | null; client?: { name: string } | null };
export type Client = { id: string; name: string };

export type SpedIssue = { linha: number; registro: string; mensagem: string };

export type SpedFileType = "efd_icms_ipi" | "efd_contribuicoes";
export type SpedFileStatus = "sucesso" | "aviso" | "erro" | "duplicado";

export type SpedFileItem = {
  id: string;
  type: SpedFileType;
  status: SpedFileStatus;
  fileName: string;
  fileSizeKb: number;
  companyName: string | null;
  cnpj: string | null;
  ie: string | null;
  uf: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  totalRecords: number;
  warningsCount: number;
  errorsCount: number;
  createdAt: string;
  client?: Client | null;
  project?: Project | null;
  uploadedBy?: { name: string | null; email: string } | null;
  duplicateOfId?: string | null;
  extracted?: {
    avisos: SpedIssue[];
    erros: SpedIssue[];
    documentos?: { totalNotasEntrada: number; totalNotasSaida: number; valorTotalEntradas: number; valorTotalSaidas: number };
    apuracaoIcms?: {
      valorTotalDebitos: number;
      valorTotalCreditos: number;
      saldoApurado: number;
      icmsARecolher: number;
      saldoCredorTransportar: number;
      ajustes: Array<{ codigo: string; descricao: string; valor: number }>;
    };
    obrigacoesIcms?: Array<{ codigo: string | null; valor: number; vencimento: string | null }>;
    totalItensC170?: number;
    totalParticipantes?: number;
    pis?: { creditoApuradoPeriodo: number; contribuicaoARecolher: number };
    cofins?: { creditoApuradoPeriodo: number; contribuicaoARecolher: number };
  };
};

export const TYPE_ORDER: { value: SpedFileType; label: string }[] = [
  { value: "efd_icms_ipi", label: "EFD ICMS/IPI" },
  { value: "efd_contribuicoes", label: "EFD Contribuições (PIS/COFINS)" },
];

export function onlyDigits(v: string | null | undefined) {
  return (v ?? "").replace(/\D/g, "");
}

export function formatCnpj(cnpj: string | null | undefined) {
  const digits = onlyDigits(cnpj);
  if (digits.length !== 14) return cnpj?.trim() || "—";
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}
