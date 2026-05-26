import { normalizeCpf } from '../validators/bantads-form.validators';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeTelefone(telefone: string): string {
  return telefone.replace(/\D/g, '');
}

export function normalizeCep(cep: string): string {
  return cep.replace(/\D/g, '');
}

export function normalizeUf(uf: string): string {
  return uf.trim().toUpperCase().slice(0, 2);
}

export function normalizeNome(nome: string): string {
  return nome.trim().replace(/\s+/g, ' ');
}

export function normalizeSalario(raw: string | number): number {
  const normalized = String(raw).trim().replace(',', '.');
  return Number(normalized);
}

export function digitsOnlyCpf(raw: string): string {
  return normalizeCpf(raw);
}
