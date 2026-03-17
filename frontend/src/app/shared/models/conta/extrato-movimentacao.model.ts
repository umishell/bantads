export type NaturezaLancamento = 'ENTRADA' | 'SAIDA';

export interface ExtratoMovimentacaoModel {
  dataHora: string;
  operacao: string;
  origem?: string | null;
  destino?: string | null;
  valor: number;
  natureza: NaturezaLancamento;
}
