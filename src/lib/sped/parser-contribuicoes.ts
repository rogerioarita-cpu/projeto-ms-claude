import type { SpedParseIssue, SpedParseResultContribuicoes } from "./types";
import { emptyContribuinte, splitFields, toNumber, toPeriodo } from "./util";

/**
 * Parser nativo do arquivo EFD Contribuições (PIS/COFINS), formato texto
 * delimitado por `|`, conforme o Guia Prático da EFD Contribuições (Receita Federal).
 *
 * Registros lidos: 0000 (identificação), M100/M200 (crédito e consolidação do
 * PIS) e M500/M600 (crédito e consolidação da COFINS).
 */
export function parseEfdContribuicoes(content: string): SpedParseResultContribuicoes {
  const avisos: SpedParseIssue[] = [];
  const erros: SpedParseIssue[] = [];
  const contribuinte = emptyContribuinte();

  let totalRegistros = 0;
  let totalRegistrosCredito = 0;

  let pisCreditoApurado = 0;
  let pisContNaoCumulativa = 0;
  let pisContCumulativa = 0;
  let pisARecolher = 0;
  let encontrouM200 = false;

  let cofinsCreditoApurado = 0;
  let cofinsContNaoCumulativa = 0;
  let cofinsContCumulativa = 0;
  let cofinsARecolher = 0;
  let encontrouM600 = false;

  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw || !raw.trim()) continue;
    if (!raw.trim().startsWith("|")) continue;

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
        case "M100": {
          // Crédito de PIS apurado no período — VL_CRED_APUR na posição 9.
          totalRegistrosCredito++;
          pisCreditoApurado += toNumber(fields[9]);
          break;
        }
        case "M200": {
          // Consolidação da contribuição para o PIS/PASEP a recolher.
          encontrouM200 = true;
          pisContNaoCumulativa += toNumber(fields[1]);
          pisContCumulativa += toNumber(fields[9]);
          pisARecolher += toNumber(fields[13]);
          break;
        }
        case "M500": {
          // Crédito de COFINS apurado no período — VL_CRED_APUR na posição 9.
          totalRegistrosCredito++;
          cofinsCreditoApurado += toNumber(fields[9]);
          break;
        }
        case "M600": {
          // Consolidação da COFINS a recolher.
          encontrouM600 = true;
          cofinsContNaoCumulativa += toNumber(fields[1]);
          cofinsContCumulativa += toNumber(fields[9]);
          cofinsARecolher += toNumber(fields[13]);
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
    erros.push({ linha: 0, registro: "-", mensagem: "Nenhum registro SPED reconhecido no arquivo. Verifique se o arquivo está no formato EFD Contribuições (.txt, delimitado por \"|\")." });
  }
  if (!contribuinte.cnpj && !contribuinte.cpf) {
    avisos.push({ linha: 0, registro: "0000", mensagem: "Registro 0000 (identificação do contribuinte) não encontrado ou incompleto." });
  }
  if (!encontrouM200) {
    avisos.push({ linha: 0, registro: "M200", mensagem: "Registro M200 (consolidação do PIS/PASEP) não encontrado no arquivo." });
  }
  if (!encontrouM600) {
    avisos.push({ linha: 0, registro: "M600", mensagem: "Registro M600 (consolidação da COFINS) não encontrado no arquivo." });
  }

  const status = erros.length > 0 ? "erro" : avisos.length > 0 ? "aviso" : "sucesso";

  return {
    tipo: "efd_contribuicoes",
    status,
    totalRegistros,
    contribuinte,
    avisos,
    erros,
    pis: {
      creditoApuradoPeriodo: round2(pisCreditoApurado),
      valorTotalContribuicaoNaoCumulativa: round2(pisContNaoCumulativa),
      valorTotalContribuicaoCumulativa: round2(pisContCumulativa),
      contribuicaoARecolher: round2(pisARecolher),
    },
    cofins: {
      creditoApuradoPeriodo: round2(cofinsCreditoApurado),
      valorTotalContribuicaoNaoCumulativa: round2(cofinsContNaoCumulativa),
      valorTotalContribuicaoCumulativa: round2(cofinsContCumulativa),
      contribuicaoARecolher: round2(cofinsARecolher),
    },
    totalRegistrosCredito,
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
