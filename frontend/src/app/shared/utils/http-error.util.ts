import { HttpErrorResponse } from '@angular/common/http';

/** Extrai mensagem amigável de erro HTTP da API BANTADS. */
export function mensagemErroHttp(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }
  const body = error.error as { message?: string; erro?: string; error?: string } | null;
  const api = body?.message ?? body?.erro ?? body?.error ?? error.message;
  return typeof api === 'string' && api.trim() ? api : fallback;
}
