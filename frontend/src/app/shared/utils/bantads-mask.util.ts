/** Máscaras de exibição para campos brasileiros (somente UI; enviar dígitos na API). */

export function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, '');
}

/** CPF: 000.000.000-00 (máx. 11 dígitos). */
export function formatCpfInput(raw: string): string {
  const digits = digitsOnly(raw).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Telefone BR: (41)99235-8764 (celular) ou (41)9234-8943 (fixo).
 * Máx. 11 dígitos (DDD + número).
 */
export function formatTelefoneInput(raw: string): string {
  const digits = digitsOnly(raw).slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)})${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)})${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)})${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/** CEP: 00000-000 (máx. 8 dígitos). */
export function formatCepInput(raw: string): string {
  const digits = digitsOnly(raw).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
}
