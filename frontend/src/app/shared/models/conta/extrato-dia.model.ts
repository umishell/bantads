import { ExtratoMovimentacaoModel } from './extrato-movimentacao.model';

export interface ExtratoDiaModel {
  data: string;
  saldoConsolidado: number;
  movimentacoes: ExtratoMovimentacaoModel[];
}
