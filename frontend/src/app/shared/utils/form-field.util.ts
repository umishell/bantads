import { AbstractControl } from '@angular/forms';

const DEFAULT_MESSAGES: Record<string, string> = {
  required: 'Campo obrigatório.',
  email: 'Informe um e-mail válido.',
  pattern: 'Formato inválido.',
  minlength: 'Valor muito curto.',
  maxlength: 'Valor muito longo.',
  min: 'Informe um valor válido.',
  cpf: 'Informe um CPF válido com 11 dígitos.',
  telefone: 'Informe um telefone válido (mínimo 10 dígitos).',
  cep: 'Informe um CEP válido com 8 dígitos.',
  uf: 'Informe a sigla UF com 2 letras.',
  salario: 'Informe um salário maior que zero.',
};

export function isFieldInvalid(control: AbstractControl | null | undefined): boolean {
  return !!control && control.invalid && (control.dirty || control.touched);
}

export function getFieldErrorMessage(
  control: AbstractControl | null | undefined,
  customMessages?: Record<string, string>,
): string {
  if (!control?.errors) return '';

  const messages = { ...DEFAULT_MESSAGES, ...customMessages };
  const errorKey = Object.keys(control.errors)[0];
  return messages[errorKey] ?? 'Valor inválido.';
}
