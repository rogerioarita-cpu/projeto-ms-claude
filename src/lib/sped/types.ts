// Tipos compartilhados pelos parsers nativos de arquivos SPED (EFD ICMS/IPI e EFD Contribuições).
// Leiautes conforme Guia Prático da Escrituração Fiscal Digital (Receita Federal / Sped Fiscal).

export type SpedFileTypeValue = "efd_icms_ipi" | "efd_contribuicoes";
export type SpedFileStatusValue = "sucesso" | "aviso" | "erro";

export interface SpedContribuinte {
  nome: string | null;
  cnpj: string | null;
  cpf: string | null;
  ie: string | null;
  uf: string | null;
  periodoInicio: string | null; // YYYY-MM
  periodoFim: string | null; // YYYY-MM
  codVer: string | null;
  codFin: string | null;
  indAtiv: string | null;
}

export interface SpedTotaisDocumentos {
  totalNotasEntrada: number;
  totalNotasSaida: number;
  valorTotalEntradas: number;
  valorTotalSaidas: number;
}

export interface SpedApuracaoIcms {
  valorTotalDebitos: number;
  valorTotalAjustesDebitos: number;
  valorTotalCreditos: number;
  valorTotalAjustesCreditos: number;
  saldoCredorAnterior: number;
  saldoApurado: number;
  valorTotalDeducoes: number;
  icmsARecolher: number;
  saldoCredorTransportar: number;
  ajustes: Array<{ codigo: string; descricao: string; valor: number }>;
}

export interface SpedObrigacaoIcms {
  codigo: string | null;
  valor: number;
  vencimento: string | null;
  codigoReceita: string | null;
}

export interface SpedApuracaoContribuicao {
  // PIS (M200) e COFINS (M600)
  creditoApuradoPeriodo: number;
  valorTotalContribuicaoNaoCumulativa: number;
  valorTotalContribuicaoCumulativa: number;
  contribuicaoARecolher: number;
}

export interface SpedParseIssue {
  linha: number;
  registro: string;
  mensagem: string;
}

export interface SpedParseResultBase {
  status: SpedFileStatusValue;
  totalRegistros: number;
  contribuinte: SpedContribuinte;
  avisos: SpedParseIssue[];
  erros: SpedParseIssue[];
}

export interface SpedParseResultIcmsIpi extends SpedParseResultBase {
  tipo: "efd_icms_ipi";
  documentos: SpedTotaisDocumentos;
  apuracaoIcms: SpedApuracaoIcms;
  obrigacoesIcms: SpedObrigacaoIcms[];
  totalItensC170: number;
  totalParticipantes: number;
}

export interface SpedParseResultContribuicoes extends SpedParseResultBase {
  tipo: "efd_contribuicoes";
  pis: SpedApuracaoContribuicao;
  cofins: SpedApuracaoContribuicao;
  totalRegistrosCredito: number;
}

export type SpedParseResult = SpedParseResultIcmsIpi | SpedParseResultContribuicoes;
