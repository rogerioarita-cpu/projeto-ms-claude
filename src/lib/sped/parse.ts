import { parseEfdContribuicoes } from "./parser-contribuicoes";
import { parseEfdIcmsIpi } from "./parser-icms-ipi";
import { sniffSpedFileType } from "./util";
import type { SpedFileTypeValue, SpedParseResult } from "./types";

export { sniffSpedFileType };

export function parseSpedFile(type: SpedFileTypeValue, content: string): SpedParseResult {
  if (type === "efd_icms_ipi") return parseEfdIcmsIpi(content);
  return parseEfdContribuicoes(content);
}

/**
 * Achata o resultado do parser nos campos "de topo" usados para KPIs e listagem
 * (companyName, cnpj, período, contadores) — o restante fica em `extracted`.
 */
export function toSpedFileRecord(result: SpedParseResult) {
  const { contribuinte, avisos, erros, status, totalRegistros, ...rest } = result;
  return {
    status,
    companyName: contribuinte.nome,
    cnpj: contribuinte.cnpj || contribuinte.cpf,
    ie: contribuinte.ie,
    uf: contribuinte.uf,
    periodStart: contribuinte.periodoInicio,
    periodEnd: contribuinte.periodoFim,
    totalRecords: totalRegistros,
    warningsCount: avisos.length,
    errorsCount: erros.length,
    extracted: { contribuinte, avisos, erros, ...rest },
  };
}

export { parseEfdContribuicoes, parseEfdIcmsIpi };
export * from "./types";
