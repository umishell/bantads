import { AdminDashboardGerenteItem, AdminDashboardModel, AdminGerenteModel, AdminRelatorioClienteModel } from '../models/admin/admin.model';
import { ClienteModel } from '../models/cliente/cliente.model';
import { ExtratoDiaModel } from '../models/conta/extrato-dia.model';
import { ExtratoMovimentacaoModel, NaturezaLancamento } from '../models/conta/extrato-movimentacao.model';
import { ExtratoResponseModel } from '../models/conta/extrato-response.model';
import { TransferenciaResponseModel } from '../models/conta/transferencia-response.model';
import {
  AdminRelatorioClienteDto,
  ClienteCarteiraDto,
  ClienteDetalheDto,
  ClientePendenteDto,
  ContaResponseDto,
  DashboardGerenteItemDto,
  GerenteResponseDto,
  LancamentoExtratoDto,
  OperacaoResponseDto,
} from '../models/api/bantads-api.models';
import { ClienteCarteiraModel, GerenteResumoModel, SolicitacaoClienteModel } from '../models/gerente/gerente.model';

export function mapClienteDetalheAndContaToClienteModel(
  det: ClienteDetalheDto,
  conta: ContaResponseDto | null,
  extras?: { gerenteNome?: string; gerenteEmail?: string },
): ClienteModel {
  const situacao = mapStatusCliente(det.status);
  return {
    cpf: det.cpf,
    nome: det.nome,
    telefone: det.telefone,
    email: det.email,
    endereco: det.endereco,
    cidade: det.cidade,
    estado: det.estado,
    salario: Number(det.salario),
    conta: conta?.numero,
    saldo: conta != null ? Number(conta.saldo) : undefined,
    limite: conta != null ? Number(conta.limite) : undefined,
    gerente_nome: extras?.gerenteNome ?? det.gerenteNome ?? '—',
    gerente_email: extras?.gerenteEmail ?? det.gerenteEmail ?? undefined,
    cep: det.cep,
    situacao,
  };
}

/** R13/R11 — detalhe API + linha da carteira (conta, saldo, gerente). */
export function mapClienteConsultaGerente(
  det: ClienteDetalheDto,
  carteira: ClienteCarteiraDto,
): ClienteCarteiraModel {
  const base = mapClienteCarteiraDto(carteira);
  return {
    ...base,
    motivoRejeicao: det.motivoRejeicao ?? null,
    decisaoGerenteEm: det.decisaoGerenteEm ?? null,
  };
}

function mapStatusCliente(status: string): ClienteModel['situacao'] {
  if (status === 'PENDENTE_APROVACAO' || status === 'PROCESSANDO_APROVACAO') return 'PENDENTE';
  if (status === 'APROVADO') return 'APROVADO';
  if (status === 'REJEITADO') return 'REJEITADO';
  return 'PENDENTE';
}

export function mapOperacaoDepositoSaque(
  numeroConta: string,
  body: OperacaoResponseDto,
): { conta: string; data: string; saldo: number; valor: number } {
  const saldo = body.saldoOrigem ?? body.saldoDestino ?? 0;
  return {
    conta: numeroConta,
    data: body.dataHora,
    saldo: Number(saldo),
    valor: Number(body.valor),
  };
}

export function mapOperacaoTransferencia(
  numeroOrigem: string,
  destino: string,
  body: OperacaoResponseDto,
): TransferenciaResponseModel {
  const saldo = body.saldoOrigem ?? body.saldoDestino ?? 0;
  return {
    conta: numeroOrigem,
    destino,
    data: body.dataHora,
    saldo: Number(saldo),
    valor: Number(body.valor),
  };
}

export function mapExtratoLancamentos(
  numeroConta: string,
  lancs: LancamentoExtratoDto[],
  dataInicio?: string,
  dataFim?: string,
): ExtratoResponseModel {
  const sorted = [...lancs].sort((a, b) => a.dataHora.localeCompare(b.dataHora));
  const diasMap = new Map<string, ExtratoDiaModel>();

  for (const l of sorted) {
    const day = l.dataHora.slice(0, 10);
    if (!diasMap.has(day)) {
      diasMap.set(day, { data: day, saldoConsolidado: 0, movimentacoes: [] });
    }
    const dia = diasMap.get(day)!;
    const natureza: NaturezaLancamento = l.natureza === 'ENTRADA' ? 'ENTRADA' : 'SAIDA';
    const mov: ExtratoMovimentacaoModel = {
      dataHora: l.dataHora,
      operacao: l.tipo,
      origem: natureza === 'SAIDA' ? numeroConta : l.contraparteContaNumero ?? undefined,
      destino: natureza === 'ENTRADA' ? numeroConta : l.contraparteContaNumero ?? undefined,
      valor: Number(l.valor),
      natureza,
    };
    dia.movimentacoes.push(mov);
    if (l.saldoApos != null) {
      dia.saldoConsolidado = Number(l.saldoApos);
    }
  }

  if (dataInicio && dataFim && dataInicio <= dataFim) {
    let saldoCarry = 0;
    for (const d of sorted) {
      if (d.saldoApos != null && d.dataHora.slice(0, 10) < dataInicio) {
        saldoCarry = Number(d.saldoApos);
      }
    }
    let cursor = dataInicio;
    while (cursor <= dataFim) {
      if (diasMap.has(cursor)) {
        saldoCarry = diasMap.get(cursor)!.saldoConsolidado;
      } else {
        diasMap.set(cursor, { data: cursor, saldoConsolidado: saldoCarry, movimentacoes: [] });
      }
      cursor = addDaysIso(cursor, 1);
    }
  }

  const dias = Array.from(diasMap.values()).sort((a, b) => a.data.localeCompare(b.data));
  const ultimoSaldo = dias.length ? dias[dias.length - 1].saldoConsolidado : undefined;

  return {
    conta: numeroConta,
    saldo: ultimoSaldo,
    dias,
  };
}

function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function mapClienteCarteiraDto(row: ClienteCarteiraDto): ClienteCarteiraModel {
  const situacao = row.situacao as ClienteCarteiraModel['situacao'];
  return {
    cpf: row.cpf,
    nome: row.nome,
    email: row.email,
    telefone: row.telefone,
    cidade: row.cidade,
    estado: row.estado,
    endereco: row.endereco,
    salario: Number(row.salario),
    conta: row.conta,
    agencia: row.agencia,
    saldo: Number(row.saldo),
    limite: Number(row.limite),
    situacao: situacao ?? 'APROVADO',
    gerenteCpf: row.gerenteCpf,
    gerenteNome: row.gerenteNome,
    gerenteEmail: row.gerenteEmail ?? undefined,
    cep: row.cep ?? undefined,
  };
}

export function mapPendenteDto(
  p: ClientePendenteDto,
  gerenteCpf: string,
  gerenteNome: string,
): SolicitacaoClienteModel {
  return {
    id: p.id,
    cpf: p.cpf,
    nome: p.nome,
    email: p.email,
    telefone: p.telefone,
    salario: Number(p.salario),
    endereco: '-',
    cidade: p.cidade,
    estado: p.estado,
    gerenteCpf,
    gerenteNome,
    dataSolicitacao: p.criadoEm,
  };
}

export function mapGerenteResumo(
  gerenteCpf: string,
  nome: string,
  email: string,
  telefone: string,
  carteira: ClienteCarteiraDto[],
  totalPendencias: number,
): GerenteResumoModel {
  const mine = carteira.filter((c) => c.gerenteCpf === gerenteCpf);
  let totalSaldoPositivo = 0;
  let totalSaldoNegativo = 0;
  for (const c of mine) {
    const s = Number(c.saldo);
    if (s >= 0) {
      totalSaldoPositivo += s;
    } else {
      totalSaldoNegativo += s;
    }
  }
  return {
    cpf: gerenteCpf,
    nome,
    email,
    telefone: telefone || '-',
    totalClientes: mine.length,
    totalSaldoPositivo,
    totalSaldoNegativo,
    totalPendencias,
  };
}

export function mapAdminRelatorioDto(rows: AdminRelatorioClienteDto[]): AdminRelatorioClienteModel[] {
  return rows.map((r) => ({
    cpfCliente: r.cpfCliente,
    nomeCliente: r.nomeCliente,
    emailCliente: r.emailCliente,
    salario: Number(r.salario),
    numeroConta: r.numeroConta,
    saldo: Number(r.saldo),
    limite: Number(r.limite),
    cpfGerente: r.cpfGerente,
    nomeGerente: r.nomeGerente,
  }));
}

export function mapDashboardFromStats(
  rows: DashboardGerenteItemDto[],
  gerentes?: GerenteResponseDto[],
): AdminDashboardModel {
  const telPorCpf = new Map((gerentes ?? []).map((g) => [g.cpf, g.telefone]));
  const gerentesItems: AdminDashboardGerenteItem[] = rows.map((r) => ({
    cpf: r.cpf,
    nome: r.nome,
    email: r.email,
    telefone: telPorCpf.get(r.cpf) ?? '—',
    totalClientes: Number(r.totalClientes),
    totalSaldoPositivo: Number(r.somaSaldosPositivos),
    totalSaldoNegativo: Number(r.somaSaldosNegativos),
  }));

  const totalClientes = gerentesItems.reduce((acc, g) => acc + g.totalClientes, 0);
  const totalSaldoPositivo = gerentesItems.reduce((acc, g) => acc + g.totalSaldoPositivo, 0);
  const totalSaldoNegativo = gerentesItems.reduce((acc, g) => acc + g.totalSaldoNegativo, 0);

  return {
    totalGerentes: gerentesItems.length,
    totalClientes,
    totalSaldoPositivo,
    totalSaldoNegativo,
    gerentes: gerentesItems,
  };
}

export function mergeGerentesComDashboard(
  gerentes: GerenteResponseDto[],
  stats: DashboardGerenteItemDto[],
): AdminGerenteModel[] {
  const byCpf = new Map(stats.map((s) => [s.cpf, s]));
  return gerentes
    .filter((g) => g.ativo && g.tipo === 'GERENTE')
    .map((g) => {
      const s = byCpf.get(g.cpf);
      return {
        cpf: g.cpf,
        nome: g.nome,
        email: g.email,
        telefone: g.telefone,
        totalClientes: s ? Number(s.totalClientes) : 0,
        totalSaldoPositivo: s ? Number(s.somaSaldosPositivos) : 0,
        totalSaldoNegativo: s ? Number(s.somaSaldosNegativos) : 0,
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

/** Número de conta com 4 dígitos (contrato ms-conta / transferência). */
export function numeroContaQuatroDigitos(raw: string | null | undefined): string {
  const d = (raw ?? '').replace(/\D/g, '');
  if (!d.length) {
    return '';
  }
  return d.length <= 4 ? d.padStart(4, '0') : d.slice(-4);
}

export interface FavorecidoContaMapeado {
  cpf: string;
  nome: string;
  conta: string;
  agencia: string;
}

/** Contrapartes de transferências no extrato (últimos lançamentos), para atalhos na UI. */
export function favorecidosFromExtrato(
  minhaContaNumero: string,
  extrato: ExtratoResponseModel,
): FavorecidoContaMapeado[] {
  const minha = numeroContaQuatroDigitos(minhaContaNumero);
  const seen = new Set<string>();
  const out: FavorecidoContaMapeado[] = [];

  for (const dia of extrato.dias) {
    for (const m of dia.movimentacoes) {
      if (!String(m.operacao).toUpperCase().includes('TRANSFER')) {
        continue;
      }
      const rawOther = m.natureza === 'SAIDA' ? m.destino : m.origem;
      const outra = numeroContaQuatroDigitos(rawOther ?? undefined);
      if (!outra || outra === minha || seen.has(outra)) {
        continue;
      }
      seen.add(outra);
      out.push({
        cpf: '',
        nome: `Conta ${outra}`,
        conta: outra,
        agencia: '0001',
      });
    }
  }

  return out;
}
