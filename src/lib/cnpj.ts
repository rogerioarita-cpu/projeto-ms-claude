// Validação de CNPJ com verificação dos dígitos verificadores (módulo 11),
// não apenas a contagem de 14 dígitos.

export function onlyDigitsCnpj(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

function calcCheckDigit(digits: string, weights: number[]): number {
  const sum = digits
    .split("")
    .reduce((acc, digit, index) => acc + Number(digit) * weights[index], 0);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

/**
 * Valida um CNPJ (recebe apenas dígitos, sem máscara).
 * Rejeita tamanho incorreto, sequências repetidas (ex.: "00000000000000")
 * e dígitos verificadores inválidos.
 */
export function isValidCnpj(digits: string): boolean {
  if (!/^\d{14}$/.test(digits)) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const firstWeights = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const secondWeights = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const firstCheck = calcCheckDigit(digits.slice(0, 12), firstWeights);
  if (firstCheck !== Number(digits[12])) return false;

  const secondCheck = calcCheckDigit(digits.slice(0, 13), secondWeights);
  if (secondCheck !== Number(digits[13])) return false;

  return true;
}
