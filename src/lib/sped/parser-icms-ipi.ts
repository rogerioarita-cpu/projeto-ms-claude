import type { SpedParseIssue, SpedParseResultIcmsIpi } from "./types";
import { emptyContribuinte, splitFields, toNumber, toPeriodo } from "./util";

/**
 * Parser nativo do arquivo EFD ICMS/IPI (SPED Fiscal), formato texto delimitado
 * por `|`, conforme o Guia Prático da EFD ICMS/IPI (Receita Federal).
 *
 * Registros lidos: 0000 (identificação), 0150 (cadastro de participantes),
 * C100/C170 (documentos fiscais e itens) e E110/E111/E116 (apuração do ICMS).
 *
 * Implementado como uma passagem única (linha a linha) para lidar com arquivos
 * de grande volume sem carregar estruturas intermediárias desnecessárias.
 */
export function parseEfdIcmsIpi(content: string): SpedParseResultIcmsIpi {
  const avisos: SpedParseIssue[] = [];
  const erros: SpedParseIssue[] = [];
  const contribuinte = emptyContribuinte();

  let totalRegistros = 0;
  let totalParticipantes = 0;
  let totalItensC170 = 0;

  let totalNotasEntrada = 0;
  let totalNotasSaida = 0;
  let valorTotalEntradas = 0;
  let valorTotalSaidas = 0;

  let valorTotalDebitos = 0;
  let valorTotalAjustesDebitos = 0;
  let valorTotalCreditos = 0;
  let valorTotalAjustesCreditos = 0;
  let saldoCredorAnterior = 0;
  let saldoApurado = 0;
  let valorTotalDeducoes = 0;
  let icmsARecolher = 0;
  let saldoCredorTransportar = 0;
  let encontrouE110 = false;

  const ajustes: Array<{ codigo: string; descricao: string; valor: number }> = [];
  const obrigacoesIcms: SpedParseResultIcmsIpi["obrigacoesIcms"] = [];

  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw || !raw.trim()) continue;
    if (!raw.trim().startsWith("|")) continue; // linha fora do padrão SPED, ignora

    const fields = splitFields(raw);
    const reg = fields[0];
    if (!reg) continue;
    totalRegistros++;

    try {
      switch (reg) {
        case "0000": {
          contribuinte.codVer = fields[1] || null;
          contribuinte.codFin = fields[2] || null;
          contribuinte.periodoInicio = toPeriodo(fields[3]);
          contribuinte.periodoFim = toPeriodo(fields[4]);
          contribuinte.nome = fields[5] || null;
          contribuinte.cnpj = fields[6] || null;
          contribuinte.cpf = fields[7] || null;
          contribuinte.uf = fields[8] || null;
          contribuinte.ie = fields[9] || null;
          contribuinte.indAtiv = fields[14] || null;
          break;
        }
        case "0150": {
          totalParticipantes++;
          break;
        }
        case "C100": {
          const indOper = fields[1]; // 0 = entrada, 1 = saída
          const valorDoc = toNumber(fields[11]);
          if (indOper === "0") {
            totalNotasEntrada++;
            valorTotalEntradas += valorDoc;
          } else if (indOper === "1") {
            totalNotasSaida++;
            valorTotalSaidas += valorDoc;
          } else {
            avisos.push({ linha: i + 1, registro: reg, mensagem: `IND_OPER inesperado ("${indOper}") — documento não somado às entradas/saídas.` });
          }
          break;
        }
        case "C170": {
          totalItensC170++;
          break;
        }
        case "E110": {
          encontrouE110 = true;
          valorTotalDebitos += toNumber(fields[1]);
          valorTotalAjustesDebitos += toNumber(fields[3]);
          valorTotalCreditos += toNumber(fields[5]);
          valorTotalAjustesCreditos += toNumber(fields[7]);
          saldoCredorAnterior += toNumber(fields[9]);
          saldoApurado += toNumber(fields[10]);
          valorTotalDeducoes += toNumber(fields[11]);
          icmsARecolher += toNumber(fields[12]);
          saldoCredorTransportar += toNumber(fields[13]);
          break;
        }
        case "E111": {
          ajustes.push({
            codigo: fields[1] || "",
            descricao: fields[2] || "",
            valor: toNumber(fields[3]),
          });
          break;
        }
        case "E116": {
          obrigacoesIcms.push({
            codigo: fields[1] || null,
            valor: toNumber(fields[2]),
            vencimento: fields[3] || null,
            codigoReceita: fields[4] || null,
          });
          break;
        }
        default:
          break;
      }
    } catch {
      erros.push({ linha: i + 1, registro: reg, mensagem: "Não foi possível interpretar os campos deste registro." });
    }
  }

  if (totalRegistros === 0) {
    erros.push({ linha: 0, registro: "-", mensagem: "Nenhum registro SPED reconhecido no arquivo. Verifique se o arquivo está no formato EFD ICMS/IPI (.txt, delimitado por \"|\")." });
  }
  if (!contribuinte.cnpj && !contribuinte.cpf) {
    avisos.push({ linha: 0, registro: "0000", mensagem: "Registro 0000 (identificação do contribuinte) não encontrado ou incompleto." });
  }
  if (!encontrouE110) {
    avisos.push({ linha: 0, registro: "E110", mensagem: "Registro E110 (apuração do ICMS) não encontrado no arquivo." });
  }

  const status = erros.length > 0 ? "erro" : avisos.length > 0 ? "aviso" : "sucesso";

  return {
    tipo: "efd_icms_ipi",
    status,
    totalRegistros,
    contribuinte,
    avisos,
    erros,
    documentos: {
      totalNotasEntrada,
      totalNotasSaida,
      valorTotalEntradas: round2(valorTotalEntradas),
      valorTotalSaidas: round2(valorTotalSaidas),
    },
    apuracaoIcms: {
      valorTotalDebitos: round2(valorTotalDebitos),
      valorTotalAjustesDebitos: round2(valorTotalAjustesDebitos),
      valorTotalCreditos: round2(valorTotalCreditos),
      valorTotalAjustesCreditos: round2(valorTotalAjustesCreditos),
      saldoCredorAnterior: round2(saldoCredorAnterior),
      saldoApurado: round2(saldoApurado),
      valorTotalDeducoes: round2(valorTotalDeducoes),
      icmsARecolher: round2(icmsARecolher),
      saldoCredorTransportar: round2(saldoCredorTransportar),
      ajustes,
    },
    obrigacoesIcms,
    totalItensC170,
    totalParticipantes,
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
