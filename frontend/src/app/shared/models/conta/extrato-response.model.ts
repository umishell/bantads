import { ExtratoDiaModel } from './extrato-dia.model';

export interface ExtratoResponseModel {
  conta: string;
  saldo?: number;
  dias: ExtratoDiaModel[];
}
