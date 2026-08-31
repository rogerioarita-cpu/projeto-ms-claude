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

// Registros que só existem em um dos dois leiautes — usados para detectar o tipo
// real do arquivo e evitar que o usuário selecione o tipo errado no upload.
// Importante: C100/C170/C190 (documentos fiscais) NÃO entram aqui, pois também
// aparecem no EFD Contribuições (Bloco C é usado lá para apurar crédito de
// PIS/COFINS sobre notas de compra) — usar esses registros como "exclusivos do
// ICMS/IPI" gerava falso positivo em arquivos de Contribuições com muitas notas.
// Only Bloco E (apuração de ICMS/IPI) é realmente exclusivo do leiaute ICMS/IPI.
const ICMS_IPI_ONLY_RECORDS = new Set(["E110", "E111", "E116", "E200", "E210", "E220", "E230", "E240", "E250", "E260"]);
const CONTRIBUICOES_ONLY_RECORDS = new Set(["M100", "M105", "M200", "M210", "M500", "M505", "M600", "M610", "F500", "F510", "F525"]);

/**
 * Detecta o tipo de leiaute SPED do conteúdo (EFD ICMS/IPI vs EFD Contribuições)
 * contando registros exclusivos de cada layout. Retorna null se não houver
 * registros suficientes para decidir (ex.: arquivo vazio ou fora do padrão).
 */
export function sniffSpedFileType(content: string): { detected: "efd_icms_ipi" | "efd_contribuicoes" | null; icmsHits: number; contribHits: number } {
  let icmsHits = 0;
  let contribHits = 0;
  const lines = content.split(/\r?\n/);
  for (const raw of lines) {
    if (!raw || !raw.trim() || !raw.trim().startsWith("|")) continue;
    const reg = splitFields(raw)[0];
    if (!reg) continue;
    if (ICMS_IPI_ONLY_RECORDS.has(reg)) icmsHits++;
    else if (CONTRIBUICOES_ONLY_RECORDS.has(reg)) contribHits++;
  }
  if (icmsHits === 0 && contribHits === 0) return { detected: null, icmsHits, contribHits };
  return { detected: icmsHits >= contribHits ? "efd_icms_ipi" : "efd_contribuicoes", icmsHits, contribHits };
}
