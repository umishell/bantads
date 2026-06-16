import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
export const BANTADS_EMAIL_PATTERN = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
export const BANTADS_TELEFONE_PATTERN = /^[\d\s()+.-]{10,20}$/;
export const BANTADS_CEP_PATTERN = /^(\d{5}-?\d{3}|\d{8})$/;
export const BANTADS_UF_PATTERN = /^[A-Za-z]{2}$/;

export function normalizeCpf(raw: string): string {
  return raw.replace(/\D/g, '');
}

export function isValidCpf(raw: string): boolean {
  const cpf = normalizeCpf(raw);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const calcDigit = (base: string, weightStart: number): number => {
    let sum = 0;
    for (let i = 0; i < base.length; i += 1) {
      sum += Number(base[i]) * (weightStart - i);
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const d1 = calcDigit(cpf.slice(0, 9), 10);
  const d2 = calcDigit(cpf.slice(0, 9) + String(d1), 11);
  return cpf.slice(9) === `${d1}${d2}`;
}

export function cpfValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === undefined || value === '') return null;
    return isValidCpf(String(value)) ? null : { cpf: true };
  };
}

export function telefoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) return null;
    if (!BANTADS_TELEFONE_PATTERN.test(value)) return { telefone: true };
    const digits = value.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15 ? null : { telefone: true };
  };
}

export function cepValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) return null;
    if (!BANTADS_CEP_PATTERN.test(value)) return { cep: true };
    const digits = value.replace(/\D/g, '');
    return digits.length === 8 ? null : { cep: true };
  };
}

export function ufValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) return null;
    return BANTADS_UF_PATTERN.test(value) ? null : { uf: true };
  };
}

export function salarioValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw === null || raw === undefined || raw === '') return null;
    const normalized = String(raw).trim().replace(',', '.');
    const value = Number(normalized);
    if (!Number.isFinite(value) || value < 0.01) return { salario: true };
    return null;
  };
}

export const bantadsEmailValidators = [
  Validators.required,
  Validators.maxLength(200),
  Validators.pattern(BANTADS_EMAIL_PATTERN),
];

export const bantadsSenhaValidators = [Validators.required, Validators.minLength(4)];
