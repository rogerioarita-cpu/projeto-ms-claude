import type { SpedContribuinte } from "./types";

/**
 * Quebra uma linha de registro SPED (delimitada por `|`) em campos.
 * O formato é `|REG|CAMPO1|CAMPO2|...|`, então o primeiro e o último
 * elemento do split ficam vazios e são descartados.
 */
export function splitFields(line: string): string[] {
  const trimmed = line.replace(/\r$/, "");
  const parts = trimmed.split("|");
  if (parts.length > 1 && parts[0] === "") parts.shift();
  if (parts.length > 0 && parts[parts.length - 1] === "") parts.pop();
  return parts;
}

/** Converte um valor numérico no formato SPED (vírgula decimal) para number. Retorna 0 se vazio/ inválido. */
export function toNumber(value: string | undefined | null): number {
  if (!value) return 0;
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

/** Converte data no formato SPED DDMMAAAA para YYYY-MM-DD (ou null). */
export function toIsoDate(value: string | undefined | null): string | null {
  if (!value || value.length !== 8) return null;
  const dd = value.slice(0, 2);
  const mm = value.slice(2, 4);
  const yyyy = value.slice(4, 8);
  return `${yyyy}-${mm}-${dd}`;
}

/** Extrai o período de apuração (registro 0000) no formato YYYY-MM a partir de DT_INI/DT_FIN (DDMMAAAA). */
export function toPeriodo(value: string | undefined | null): string | null {
  if (!value || value.length !== 8) return null;
  const mm = value.slice(2, 4);
  const yyyy = value.slice(4, 8);
  return `${yyyy}-${mm}`;
}

export function emptyContribuinte(): SpedContribuinte {
  return {
    nome: null,
    cnpj: null,
    cpf: null,
    ie: null,
    uf: null,
    periodoInicio: null,
    periodoFim: null,
    codVer: null,
    codFin: null,
    indAtiv: null,
  };
}
