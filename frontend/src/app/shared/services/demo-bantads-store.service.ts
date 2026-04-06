import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

import { LoginRequest, LoginResponse, UsuarioLogado } from '../models/auth/auth.model';
import { ClienteModel } from '../models/cliente/cliente.model';
import { ExtratoDiaModel } from '../models/conta/extrato-dia.model';
import { ExtratoMovimentacaoModel, NaturezaLancamento } from '../models/conta/extrato-movimentacao.model';
import { ExtratoResponseModel } from '../models/conta/extrato-response.model';
import { TransferenciaResponseModel } from '../models/conta/transferencia-response.model';
import {
  AprovacaoClienteModel,
  ClienteCarteiraModel,
  GerenteResumoModel,
  RejeicaoClienteModel,
  SolicitacaoClienteModel,
} from '../models/gerente/gerente.model';
import {
  AdminDashboardGerenteItem,
  AdminDashboardModel,
  AdminGerenteFormModel,
  AdminGerenteModel,
  AdminGerenteMutationResponse,
  AdminGerenteRemocaoResponse,
  AdminRelatorioClienteModel,
} from '../models/admin/admin.model';

export type DemoPerfil = 'CLIENTE' | 'GERENTE' | 'ADMIN';

type DemoUser = {
  id: string;
  cpf: string;
  nome: string;
  email: string;
  senha: string;
  perfil: DemoPerfil;
  numeroConta?: string;
};

type DemoGerente = {
  cpf: string;
  nome: string;
  email: string;
  telefone: string;
  senha: string;
  perfil: 'GERENTE';
};

type DemoAdministrador = {
  cpf: string;
  nome: string;
  email: string;
  senha: string;
  perfil: 'ADMIN';
};

type DemoCliente = ClienteModel & {
  agencia: string;
  senha: string;
  gerente_email?: string;
  gerente_cpf: string;
  dataCriacao: string;
  numeroConta: string;
  cep?: string;
};

type DemoMovimentacao = {
  id: string;
  dataHora: string;
  operacao: 'DEPOSITO' | 'SAQUE' | 'TRANSFERENCIA';
  contaOrigem: string;
  clienteOrigem: string;
  cpfOrigem: string;
  contaDestino?: string | null;
  clienteDestino?: string | null;
  cpfDestino?: string | null;
  valor: number;
};

type DemoExtratoFiltro = {
  dataInicio: string;
  dataFim: string;
};

type DemoOperacaoResponse = {
  conta: string;
  data: string;
  saldo: number;
  valor: number;
};

type DemoFavorecido = {
  cpf: string;
  nome: string;
  conta: string;
  agencia: string;
};

type DemoSolicitacaoCliente = {
  cpf: string;
  nome: string;
  email: string;
  telefone: string;
  salario: number;
  endereco: string;
  cidade: string;
  estado: string;
  cep?: string;
  gerenteCpf: string;
  gerenteNome: string;
  dataSolicitacao: string;
};

type DemoSolicitacaoRejeitada = {
  cpf: string;
  nome: string;
  motivo: string;
  dataHora: string;
};


type DemoGerenteDisponivel = {
  cpf: string;
  nome: string;
  email: string;
};

type DemoAutocadastroSolicitacaoResponse = {
  cpf: string;
  nome: string;
  gerenteCpf: string;
  gerenteNome: string;
  gerenteEmail: string;
  dataSolicitacao: string;
};

@Injectable({
  providedIn: 'root',
})
export class DemoBantadsStoreService {
  private readonly simulatedDelayMs = 180;
  private readonly agenciaPadrao = '0001';

  private readonly gerentes: DemoGerente[] = [
    {
      cpf: '98574307084',
      nome: 'Geniéve',
      email: 'ger1@bantads.com.br',
      telefone: '(41) 98871-0001',
      senha: 'tads',
      perfil: 'GERENTE',
    },
    {
      cpf: '64065268052',
      nome: 'Godophredo',
      email: 'ger2@bantads.com.br',
      telefone: '(41) 98872-0002',
      senha: 'tads',
      perfil: 'GERENTE',
    },
    {
      cpf: '23862179060',
      nome: 'Gyândula',
      email: 'ger3@bantads.com.br',
      telefone: '(41) 98873-0003',
      senha: 'tads',
      perfil: 'GERENTE',
    },
  ];

  private readonly administradores: DemoAdministrador[] = [
    {
      cpf: '40501740066',
      nome: 'Adamântio',
      email: 'adm1@bantads.com.br',
      senha: 'tads',
      perfil: 'ADMIN',
    },
  ];

  private readonly clientes: DemoCliente[] = [
    {
      cpf: '12912861012',
      nome: 'Catharyna',
      email: 'cli1@bantads.com.br',
      telefone: '(41) 99991-0001',
      endereco: 'Rua das Araucárias, 100',
      cidade: 'Curitiba',
      estado: 'PR',
      salario: 10000,
      conta: '1291',
      numeroConta: '1291',
      saldo: 800,
      limite: 5000,
      gerente_nome: 'Geniéve',
      gerente_email: 'ger1@bantads.com.br',
      gerente_cpf: '98574307084',
      situacao: 'APROVADO',
      senha: 'tads',
      agencia: '0001',
      cep: '80000-100',
      dataCriacao: '2000-01-01',
    },
    {
      cpf: '09506382000',
      nome: 'Cleuddônio',
      email: 'cli2@bantads.com.br',
      telefone: '(41) 99992-0002',
      endereco: 'Rua das Hortênsias, 950',
      cidade: 'Pinhais',
      estado: 'PR',
      salario: 20000,
      conta: '0950',
      numeroConta: '0950',
      saldo: -10000,
      limite: 10000,
      gerente_nome: 'Godophredo',
      gerente_email: 'ger2@bantads.com.br',
      gerente_cpf: '64065268052',
      situacao: 'APROVADO',
      senha: 'tads',
      agencia: '0001',
      cep: '83300-950',
      dataCriacao: '1990-10-10',
    },
    {
      cpf: '85733854057',
      nome: 'Catianna',
      email: 'cli3@bantads.com.br',
      telefone: '(41) 99993-0003',
      endereco: 'Rua do Teatro, 857',
      cidade: 'São José dos Pinhais',
      estado: 'PR',
      salario: 3000,
      conta: '8573',
      numeroConta: '8573',
      saldo: -1000,
      limite: 1500,
      gerente_nome: 'Gyândula',
      gerente_email: 'ger3@bantads.com.br',
      gerente_cpf: '23862179060',
      situacao: 'APROVADO',
      senha: 'tads',
      agencia: '0001',
      cep: '83000-857',
      dataCriacao: '2012-12-12',
    },
    {
      cpf: '58872160006',
      nome: 'Cutardo',
      email: 'cli4@bantads.com.br',
      telefone: '(41) 99994-0004',
      endereco: 'Avenida Central, 5887',
      cidade: 'Colombo',
      estado: 'PR',
      salario: 500,
      conta: '5887',
      numeroConta: '5887',
      saldo: 150000,
      limite: 0,
      gerente_nome: 'Geniéve',
      gerente_email: 'ger1@bantads.com.br',
      gerente_cpf: '98574307084',
      situacao: 'APROVADO',
      senha: 'tads',
      agencia: '0001',
      cep: '83400-587',
      dataCriacao: '2022-02-22',
    },
    {
      cpf: '76179646090',
      nome: 'Coândrya',
      email: 'cli5@bantads.com.br',
      telefone: '(41) 99995-0005',
      endereco: 'Rua das Rosas, 7617',
      cidade: 'Campo Largo',
      estado: 'PR',
      salario: 1500,
      conta: '7617',
      numeroConta: '7617',
      saldo: 1500,
      limite: 0,
      gerente_nome: 'Godophredo',
      gerente_email: 'ger2@bantads.com.br',
      gerente_cpf: '64065268052',
      situacao: 'APROVADO',
      senha: 'tads',
      agencia: '0001',
      cep: '83600-761',
      dataCriacao: '2025-01-01',
    },
  ];

  private readonly solicitacoesPendentes: DemoSolicitacaoCliente[] = [
    {
      cpf: '31415926000',
      nome: 'Auristela',
      email: 'auristela@exemplo.com',
      telefone: '(41) 99771-1111',
      salario: 2800,
      endereco: 'Rua dos Ipês, 314',
      cidade: 'Curitiba',
      estado: 'PR',
      cep: '80500-314',
      gerenteCpf: '98574307084',
      gerenteNome: 'Geniéve',
      dataSolicitacao: '2026-04-05T09:15:00',
    },
    {
      cpf: '27182818000',
      nome: 'Bernadette',
      email: 'bernadette@exemplo.com',
      telefone: '(41) 99772-2222',
      salario: 1900,
      endereco: 'Avenida da Serra, 271',
      cidade: 'Pinhais',
      estado: 'PR',
      cep: '83320-271',
      gerenteCpf: '98574307084',
      gerenteNome: 'Geniéve',
      dataSolicitacao: '2026-04-05T14:40:00',
    },
    {
      cpf: '16180339000',
      nome: 'Celestino',
      email: 'celestino@exemplo.com',
      telefone: '(41) 99773-3333',
      salario: 4300,
      endereco: 'Rua da Música, 161',
      cidade: 'Campo Largo',
      estado: 'PR',
      cep: '83605-161',
      gerenteCpf: '64065268052',
      gerenteNome: 'Godophredo',
      dataSolicitacao: '2026-04-06T08:05:00',
    },
    {
      cpf: '14142135000',
      nome: 'Doralice',
      email: 'doralice@exemplo.com',
      telefone: '(41) 99774-4444',
      salario: 5200,
      endereco: 'Travessa da Lua, 141',
      cidade: 'São José dos Pinhais',
      estado: 'PR',
      cep: '83045-141',
      gerenteCpf: '23862179060',
      gerenteNome: 'Gyândula',
      dataSolicitacao: '2026-04-06T10:55:00',
    },
  ];

  private readonly solicitacoesRejeitadas: DemoSolicitacaoRejeitada[] = [];

  private readonly movimentacoes: DemoMovimentacao[] = [
    this.mov('m1', '2020-01-01T10:00:00', 'DEPOSITO', '1291', 'Catharyna', '12912861012', null, null, null, 1000),
    this.mov('m2', '2020-01-01T11:00:00', 'DEPOSITO', '1291', 'Catharyna', '12912861012', null, null, null, 900),
    this.mov('m3', '2020-01-01T12:00:00', 'SAQUE', '1291', 'Catharyna', '12912861012', null, null, null, 550),
    this.mov('m4', '2020-01-01T13:00:00', 'SAQUE', '1291', 'Catharyna', '12912861012', null, null, null, 350),
    this.mov('m5', '2020-01-10T15:00:00', 'DEPOSITO', '1291', 'Catharyna', '12912861012', null, null, null, 2000),
    this.mov('m6', '2020-01-15T08:00:00', 'SAQUE', '1291', 'Catharyna', '12912861012', null, null, null, 500),
    this.mov('m7', '2020-01-20T12:00:00', 'TRANSFERENCIA', '1291', 'Catharyna', '12912861012', '0950', 'Cleuddônio', '09506382000', 1700),
    this.mov('m8', '2025-01-01T12:00:00', 'DEPOSITO', '0950', 'Cleuddônio', '09506382000', null, null, null, 1000),
    this.mov('m9', '2025-01-02T10:00:00', 'DEPOSITO', '0950', 'Cleuddônio', '09506382000', null, null, null, 5000),
    this.mov('m10', '2025-01-10T10:00:00', 'SAQUE', '0950', 'Cleuddônio', '09506382000', null, null, null, 200),
    this.mov('m11', '2025-02-05T10:00:00', 'DEPOSITO', '0950', 'Cleuddônio', '09506382000', null, null, null, 7000),
    this.mov('m12', '2025-05-05T10:00:00', 'DEPOSITO', '8573', 'Catianna', '85733854057', null, null, null, 1000),
    this.mov('m13', '2025-05-06T10:00:00', 'SAQUE', '8573', 'Catianna', '85733854057', null, null, null, 2000),
    this.mov('m14', '2025-06-01T10:00:00', 'DEPOSITO', '5887', 'Cutardo', '58872160006', null, null, null, 150000),
    this.mov('m15', '2025-07-01T10:00:00', 'DEPOSITO', '7617', 'Coândrya', '76179646090', null, null, null, 1500),
  ];



  public listarGerentesDisponiveis(): Observable<DemoGerenteDisponivel[]> {
    const rows = this.gerentes
      .map((gerente) => ({
        cpf: gerente.cpf,
        nome: gerente.nome,
        email: gerente.email,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    return of(this.clone(rows)).pipe(delay(this.simulatedDelayMs));
  }

  public solicitarAutocadastro(payload: {
    nome: string;
    email: string;
    cpf: string;
    telefone: string;
    salario: number;
    endereco: string;
    cidade: string;
    estado: string;
    cep?: string;
    gerenteCpf: string;
  }): Observable<DemoAutocadastroSolicitacaoResponse> {
    const cpf = String(payload.cpf ?? '').replace(/\D/g, '');
    const email = String(payload.email ?? '').trim().toLowerCase();
    const gerenteCpf = String(payload.gerenteCpf ?? '').trim();

    if (!cpf || cpf.length !== 11) {
      return throwError(() => new Error('Informe um CPF válido para solicitar a abertura da conta.')).pipe(
        delay(this.simulatedDelayMs),
      );
    }

    if (!email) {
      return throwError(() => new Error('Informe um e-mail válido para solicitar a abertura da conta.')).pipe(
        delay(this.simulatedDelayMs),
      );
    }

    const gerente = this.buscarGerente(gerenteCpf);
    if (!gerente) {
      return throwError(() => new Error('Selecione um gerente responsável pela análise do cadastro.')).pipe(
        delay(this.simulatedDelayMs),
      );
    }

    const existeCliente = this.clientes.some((cliente) => cliente.cpf === cpf || cliente.email.toLowerCase() === email);
    if (existeCliente) {
      return throwError(() => new Error('Já existe uma conta cadastrada com este CPF ou e-mail.')).pipe(
        delay(this.simulatedDelayMs),
      );
    }

    const existePendente = this.solicitacoesPendentes.some(
      (solicitacao) => solicitacao.cpf === cpf || solicitacao.email.toLowerCase() === email,
    );
    if (existePendente) {
      return throwError(() => new Error('Já existe uma solicitação pendente para este CPF ou e-mail.')).pipe(
        delay(this.simulatedDelayMs),
      );
    }

    const dataSolicitacao = this.nowIso();
    const solicitacao: DemoSolicitacaoCliente = {
      cpf,
      nome: String(payload.nome ?? '').trim(),
      email,
      telefone: String(payload.telefone ?? '').trim(),
      salario: this.normalizarValor(Number(payload.salario ?? 0)),
      endereco: String(payload.endereco ?? '').trim(),
      cidade: String(payload.cidade ?? '').trim(),
      estado: String(payload.estado ?? '').trim().toUpperCase(),
      cep: this.optionalString(payload.cep),
      gerenteCpf: gerente.cpf,
      gerenteNome: gerente.nome,
      dataSolicitacao,
    };

    this.solicitacoesPendentes.unshift(solicitacao);

    return of({
      cpf: solicitacao.cpf,
      nome: solicitacao.nome,
      gerenteCpf: gerente.cpf,
      gerenteNome: gerente.nome,
      gerenteEmail: gerente.email,
      dataSolicitacao,
    }).pipe(delay(this.simulatedDelayMs));
  }

  public autenticar(credenciais: LoginRequest): Observable<LoginResponse> {
    const login = this.normalizarLogin(String(credenciais.login ?? ''));
    const senha = String(credenciais.senha ?? '').trim();

    const user = this.getAllUsers().find(
      (item) => item.email.toLowerCase() === login && item.senha === senha,
    );

    if (!user) {
      return throwError(() => new Error('Usuário ou senha inválidos.')).pipe(delay(this.simulatedDelayMs));
    }

    return of({
      token: `mock-token-${user.perfil.toLowerCase()}-${user.id}`,
      usuario: this.toUsuarioLogado(user),
    }).pipe(delay(this.simulatedDelayMs));
  }

  public buscarClientePorCpf(cpf: string): Observable<ClienteModel> {
    const cliente = this.clientes.find((item) => item.cpf === cpf);

    if (!cliente) {
      return throwError(() => new Error('Cliente não encontrado.')).pipe(delay(this.simulatedDelayMs));
    }

    return of(this.toClienteModel(cliente)).pipe(delay(this.simulatedDelayMs));
  }

  public listarClientes(): Observable<ClienteModel[]> {
    return of(this.clientes.map((item) => this.toClienteModel(item))).pipe(delay(120));
  }

  public listarFavorecidos(numeroContaOrigem?: string | null): Observable<DemoFavorecido[]> {
    const favorecidos = this.clientes
      .filter((cliente) => cliente.numeroConta !== (numeroContaOrigem ?? ''))
      .map((cliente) => ({
        cpf: cliente.cpf,
        nome: cliente.nome,
        conta: cliente.numeroConta,
        agencia: cliente.agencia,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    return of(this.clone(favorecidos)).pipe(delay(80));
  }

  public alterarPerfil(cpf: string, dados: Partial<ClienteModel>): Observable<ClienteModel> {
    const cliente = this.clientes.find((item) => item.cpf === cpf);

    if (!cliente) {
      return throwError(() => new Error('Cliente não encontrado.')).pipe(delay(this.simulatedDelayMs));
    }

    cliente.nome = dados.nome ?? cliente.nome;
    cliente.email = dados.email ?? cliente.email;
    cliente.telefone = dados.telefone ?? cliente.telefone;
    cliente.endereco = dados.endereco ?? cliente.endereco;
    cliente.cidade = dados.cidade ?? cliente.cidade;
    cliente.estado = dados.estado ?? cliente.estado;

    const cep = this.optionalString((dados as ClienteModel & { cep?: string }).cep);
    if (cep !== undefined) {
      cliente.cep = cep;
    }

    const salarioAtualizado = this.toNumber(dados.salario);
    if (salarioAtualizado !== undefined) {
      cliente.salario = salarioAtualizado;
      cliente.limite = this.calcularLimite(cliente.salario, cliente.saldo ?? 0);
    }

    return of(this.toClienteModel(cliente)).pipe(delay(this.simulatedDelayMs));
  }

  public depositar(numeroConta: string, valor: number): Observable<DemoOperacaoResponse> {
    const cliente = this.buscarClienteInternoPorConta(numeroConta);
    const valorNormalizado = this.normalizarValor(valor);

    if (!cliente) {
      return throwError(() => new Error('Conta não encontrada para depósito.')).pipe(delay(this.simulatedDelayMs));
    }

    if (valorNormalizado <= 0) {
      return throwError(() => new Error('Informe um valor válido para depósito.')).pipe(delay(this.simulatedDelayMs));
    }

    cliente.saldo = this.normalizarValor((cliente.saldo ?? 0) + valorNormalizado);

    const data = this.nowIso();
    this.movimentacoes.push(
      this.mov(this.buildMovementId(), data, 'DEPOSITO', cliente.numeroConta, cliente.nome, cliente.cpf, null, null, null, valorNormalizado),
    );

    return of({
      conta: cliente.numeroConta,
      data,
      saldo: cliente.saldo ?? 0,
      valor: valorNormalizado,
    }).pipe(delay(this.simulatedDelayMs));
  }

  public sacar(numeroConta: string, valor: number): Observable<DemoOperacaoResponse> {
    const cliente = this.buscarClienteInternoPorConta(numeroConta);
    const valorNormalizado = this.normalizarValor(valor);

    if (!cliente) {
      return throwError(() => new Error('Conta não encontrada para saque.')).pipe(delay(this.simulatedDelayMs));
    }

    if (valorNormalizado <= 0) {
      return throwError(() => new Error('Informe um valor válido para saque.')).pipe(delay(this.simulatedDelayMs));
    }

    const disponivel = (cliente.saldo ?? 0) + (cliente.limite ?? 0);
    if (disponivel < valorNormalizado) {
      return throwError(() => new Error('Saldo insuficiente para realizar o saque.')).pipe(delay(this.simulatedDelayMs));
    }

    cliente.saldo = this.normalizarValor((cliente.saldo ?? 0) - valorNormalizado);

    const data = this.nowIso();
    this.movimentacoes.push(
      this.mov(this.buildMovementId(), data, 'SAQUE', cliente.numeroConta, cliente.nome, cliente.cpf, null, null, null, valorNormalizado),
    );

    return of({
      conta: cliente.numeroConta,
      data,
      saldo: cliente.saldo ?? 0,
      valor: valorNormalizado,
    }).pipe(delay(this.simulatedDelayMs));
  }

  public transferir(
    numeroContaOrigem: string,
    destino: string,
    valor: number,
  ): Observable<TransferenciaResponseModel> {
    const origem = this.buscarClienteInternoPorConta(numeroContaOrigem);
    const favorecido = this.buscarClienteInternoPorConta(destino);
    const valorNormalizado = this.normalizarValor(valor);

    if (!origem) {
      return throwError(() => new Error('Conta de origem não encontrada.')).pipe(delay(this.simulatedDelayMs));
    }

    if (!favorecido) {
      return throwError(() => new Error('Conta destino não encontrada.')).pipe(delay(this.simulatedDelayMs));
    }

    if (origem.numeroConta === favorecido.numeroConta) {
      return throwError(() => new Error('Você não pode transferir para a própria conta.')).pipe(delay(this.simulatedDelayMs));
    }

    if (valorNormalizado <= 0) {
      return throwError(() => new Error('Informe um valor válido para transferência.')).pipe(delay(this.simulatedDelayMs));
    }

    const disponivel = (origem.saldo ?? 0) + (origem.limite ?? 0);
    if (disponivel < valorNormalizado) {
      return throwError(() => new Error('Saldo insuficiente para realizar a transferência.')).pipe(delay(this.simulatedDelayMs));
    }

    origem.saldo = this.normalizarValor((origem.saldo ?? 0) - valorNormalizado);
    favorecido.saldo = this.normalizarValor((favorecido.saldo ?? 0) + valorNormalizado);

    const data = this.nowIso();
    this.movimentacoes.push(
      this.mov(
        this.buildMovementId(),
        data,
        'TRANSFERENCIA',
        origem.numeroConta,
        origem.nome,
        origem.cpf,
        favorecido.numeroConta,
        favorecido.nome,
        favorecido.cpf,
        valorNormalizado,
      ),
    );

    return of({
      conta: origem.numeroConta,
      destino: favorecido.numeroConta,
      data,
      saldo: origem.saldo ?? 0,
      valor: valorNormalizado,
    }).pipe(delay(this.simulatedDelayMs));
  }

  public consultarExtrato(numeroConta: string, filtro: DemoExtratoFiltro): Observable<ExtratoResponseModel> {
    const cliente = this.buscarClienteInternoPorConta(numeroConta);

    if (!cliente) {
      return throwError(() => new Error('Conta não encontrada para consulta de extrato.')).pipe(delay(this.simulatedDelayMs));
    }

    const dataInicio = this.onlyDate(filtro.dataInicio);
    const dataFim = this.onlyDate(filtro.dataFim);

    if (!dataInicio || !dataFim) {
      return throwError(() => new Error('Informe um período válido para consulta do extrato.')).pipe(delay(this.simulatedDelayMs));
    }

    const dias = this.gerarExtratoPorPeriodo(cliente.numeroConta, dataInicio, dataFim);

    return of({
      conta: cliente.numeroConta,
      saldo: cliente.saldo ?? 0,
      dias,
    }).pipe(delay(this.simulatedDelayMs));
  }

  public obterResumoGerente(gerenteCpf: string): Observable<GerenteResumoModel> {
    const gerente = this.buscarGerente(gerenteCpf);

    if (!gerente) {
      return throwError(() => new Error('Gerente não encontrado.')).pipe(delay(this.simulatedDelayMs));
    }

    const carteira = this.clientes.filter((cliente) => cliente.gerente_cpf === gerenteCpf);
    const totalSaldoPositivo = carteira
      .filter((cliente) => (cliente.saldo ?? 0) >= 0)
      .reduce((acc, cliente) => acc + (cliente.saldo ?? 0), 0);
    const totalSaldoNegativo = carteira
      .filter((cliente) => (cliente.saldo ?? 0) < 0)
      .reduce((acc, cliente) => acc + (cliente.saldo ?? 0), 0);

    return of({
      cpf: gerente.cpf,
      nome: gerente.nome,
      email: gerente.email,
      telefone: gerente.telefone,
      totalClientes: carteira.length,
      totalSaldoPositivo: this.normalizarValor(totalSaldoPositivo),
      totalSaldoNegativo: this.normalizarValor(totalSaldoNegativo),
      totalPendencias: this.solicitacoesPendentes.filter((item) => item.gerenteCpf === gerenteCpf).length,
    }).pipe(delay(this.simulatedDelayMs));
  }

  public listarSolicitacoesPendentes(gerenteCpf: string): Observable<SolicitacaoClienteModel[]> {
    const rows = this.solicitacoesPendentes
      .filter((item) => item.gerenteCpf === gerenteCpf)
      .sort((a, b) => a.dataSolicitacao.localeCompare(b.dataSolicitacao))
      .map((item) => this.clone(item));

    return of(rows).pipe(delay(this.simulatedDelayMs));
  }

  public aprovarCliente(cpfSolicitacao: string): Observable<AprovacaoClienteModel> {
    const index = this.solicitacoesPendentes.findIndex((item) => item.cpf === cpfSolicitacao);

    if (index < 0) {
      return throwError(() => new Error('Solicitação não encontrada para aprovação.')).pipe(delay(this.simulatedDelayMs));
    }

    const solicitacao = this.solicitacoesPendentes.splice(index, 1)[0];
    const numeroConta = this.gerarNumeroConta();
    const senhaTemporaria = 'tads';
    const gerente = this.buscarGerente(solicitacao.gerenteCpf);

    const novoCliente: DemoCliente = {
      cpf: solicitacao.cpf,
      nome: solicitacao.nome,
      email: solicitacao.email,
      telefone: solicitacao.telefone,
      endereco: solicitacao.endereco,
      cidade: solicitacao.cidade,
      estado: solicitacao.estado,
      salario: solicitacao.salario,
      conta: numeroConta,
      numeroConta,
      saldo: 0,
      limite: this.calcularLimite(solicitacao.salario, 0),
      gerente_nome: solicitacao.gerenteNome,
      gerente_email: gerente?.email,
      gerente_cpf: solicitacao.gerenteCpf,
      situacao: 'APROVADO',
      senha: 'tads',
      agencia: this.agenciaPadrao,
      cep: solicitacao.cep ?? '',
      dataCriacao: this.onlyDate(this.nowIso()),
    };

    this.clientes.push(novoCliente);

    return of({
      cpf: novoCliente.cpf,
      nome: novoCliente.nome,
      email: novoCliente.email,
      numeroConta,
      agencia: novoCliente.agencia,
      senhaTemporaria,
      gerenteNome: novoCliente.gerente_nome,
    }).pipe(delay(this.simulatedDelayMs));
  }

  public rejeitarCliente(cpfSolicitacao: string, motivo: string): Observable<RejeicaoClienteModel> {
    const index = this.solicitacoesPendentes.findIndex((item) => item.cpf === cpfSolicitacao);

    if (index < 0) {
      return throwError(() => new Error('Solicitação não encontrada para rejeição.')).pipe(delay(this.simulatedDelayMs));
    }

    const solicitacao = this.solicitacoesPendentes.splice(index, 1)[0];
    const dataHora = this.nowIso();
    const registro = {
      cpf: solicitacao.cpf,
      nome: solicitacao.nome,
      motivo: motivo.trim(),
      dataHora,
    };
    this.solicitacoesRejeitadas.push(registro);

    return of(registro).pipe(delay(this.simulatedDelayMs));
  }

  public listarClientesDoGerente(gerenteCpf: string, filtro = ''): Observable<ClienteCarteiraModel[]> {
    const termo = filtro.trim().toLowerCase();

    const rows = this.clientes
      .filter((cliente) => cliente.gerente_cpf === gerenteCpf)
      .filter((cliente) => {
        if (!termo) return true;
        return cliente.nome.toLowerCase().includes(termo) || cliente.cpf.includes(termo);
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .map((cliente) => this.toClienteCarteira(cliente));

    return of(rows).pipe(delay(this.simulatedDelayMs));
  }

  public consultarClienteDoGerente(gerenteCpf: string, cpfCliente: string): Observable<ClienteCarteiraModel> {
    const cliente = this.clientes.find(
      (item) => item.gerente_cpf === gerenteCpf && item.cpf === cpfCliente,
    );

    if (!cliente) {
      return throwError(() => new Error('Cliente não encontrado na carteira deste gerente.')).pipe(delay(this.simulatedDelayMs));
    }

    return of(this.toClienteCarteira(cliente)).pipe(delay(this.simulatedDelayMs));
  }

  public listarMelhoresClientes(gerenteCpf?: string): Observable<ClienteCarteiraModel[]> {
    const rows = [...this.clientes]
      .filter((cliente) => !gerenteCpf || cliente.gerente_cpf === gerenteCpf)
      .sort((a, b) => (b.saldo ?? 0) - (a.saldo ?? 0))
      .slice(0, 3)
      .map((cliente) => this.toClienteCarteira(cliente));

    return of(rows).pipe(delay(this.simulatedDelayMs));
  }

  public obterDashboardAdmin(): Observable<AdminDashboardModel> {
    const gerentes = this.gerentes
      .map((gerente) => this.toAdminGerente(gerente))
      .sort((a, b) => {
        if (b.totalSaldoPositivo !== a.totalSaldoPositivo) {
          return b.totalSaldoPositivo - a.totalSaldoPositivo;
        }
        return a.nome.localeCompare(b.nome, 'pt-BR');
      });

    const totalClientes = gerentes.reduce((acc, gerente) => acc + gerente.totalClientes, 0);
    const totalSaldoPositivo = gerentes.reduce((acc, gerente) => acc + gerente.totalSaldoPositivo, 0);
    const totalSaldoNegativo = gerentes.reduce((acc, gerente) => acc + gerente.totalSaldoNegativo, 0);

    return of({
      totalGerentes: gerentes.length,
      totalClientes,
      totalSaldoPositivo: this.normalizarValor(totalSaldoPositivo),
      totalSaldoNegativo: this.normalizarValor(totalSaldoNegativo),
      gerentes,
    }).pipe(delay(this.simulatedDelayMs));
  }

  public listarRelatorioClientesAdmin(): Observable<AdminRelatorioClienteModel[]> {
    const rows = [...this.clientes]
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .map((cliente) => ({
        cpfCliente: cliente.cpf,
        nomeCliente: cliente.nome,
        emailCliente: cliente.email,
        salario: cliente.salario,
        numeroConta: cliente.numeroConta,
        saldo: cliente.saldo ?? 0,
        limite: cliente.limite ?? 0,
        cpfGerente: cliente.gerente_cpf,
        nomeGerente: cliente.gerente_nome,
      }));

    return of(this.clone(rows)).pipe(delay(this.simulatedDelayMs));
  }

  public listarGerentesAdmin(): Observable<AdminGerenteModel[]> {
    const rows = this.gerentes
      .map((gerente) => this.toAdminGerente(gerente))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    return of(this.clone(rows)).pipe(delay(this.simulatedDelayMs));
  }

  public inserirGerenteAdmin(payload: AdminGerenteFormModel): Observable<AdminGerenteMutationResponse> {
    const cpf = String(payload.cpf ?? '').replace(/\D/g, '');
    const nome = String(payload.nome ?? '').trim();
    const email = String(payload.email ?? '').trim().toLowerCase();
    const telefone = String(payload.telefone ?? '').trim();
    const senha = String(payload.senha ?? '').trim();

    if (cpf.length !== 11) {
      return throwError(() => new Error('Informe um CPF válido para o gerente.')).pipe(delay(this.simulatedDelayMs));
    }

    if (!nome || !email || !telefone || !senha) {
      return throwError(() => new Error('Preencha todos os dados do gerente.')).pipe(delay(this.simulatedDelayMs));
    }

    const cpfJaExiste = this.gerentes.some((gerente) => gerente.cpf === cpf);
    if (cpfJaExiste) {
      return throwError(() => new Error('Já existe um gerente cadastrado com este CPF.')).pipe(delay(this.simulatedDelayMs));
    }

    const emailJaExiste = this.getAllUsers().some((user) => user.email.toLowerCase() === email);
    if (emailJaExiste) {
      return throwError(() => new Error('Já existe um usuário cadastrado com este e-mail.')).pipe(delay(this.simulatedDelayMs));
    }

    const novoGerente: DemoGerente = {
      cpf,
      nome,
      email,
      telefone,
      senha,
      perfil: 'GERENTE',
    };

    const detalhes: string[] = [];
    const gerenteDoador = this.escolherGerenteDoadorParaNovoGerente();
    let clienteTransferido: DemoCliente | undefined;

    this.gerentes.push(novoGerente);

    if (gerenteDoador) {
      clienteTransferido = this.escolherContaParaNovoGerente(gerenteDoador.cpf);
      if (clienteTransferido) {
        this.reatribuirCliente(clienteTransferido, novoGerente);
        detalhes.push(
          `Conta ${clienteTransferido.numeroConta} de ${clienteTransferido.nome} foi transferida de ${gerenteDoador.nome} para ${novoGerente.nome}.`,
        );
      } else {
        detalhes.push(`Nenhuma conta precisou ser transferida de ${gerenteDoador.nome}.`);
      }
    } else {
      detalhes.push('Nenhuma conta foi transferida porque não havia gerente elegível para doação.');
    }

    return of({
      mensagem: `Gerente ${novoGerente.nome} inserido com sucesso.`,
      gerente: this.toAdminGerente(novoGerente),
      detalhes,
    }).pipe(delay(this.simulatedDelayMs));
  }

  public atualizarGerenteAdmin(
    cpf: string,
    payload: Pick<AdminGerenteFormModel, 'nome' | 'email' | 'senha'>,
  ): Observable<AdminGerenteMutationResponse> {
    const gerente = this.buscarGerente(cpf);

    if (!gerente) {
      return throwError(() => new Error('Gerente não encontrado para alteração.')).pipe(delay(this.simulatedDelayMs));
    }

    const nome = String(payload.nome ?? '').trim();
    const email = String(payload.email ?? '').trim().toLowerCase();
    const senha = String(payload.senha ?? '').trim();

    if (!nome || !email || !senha) {
      return throwError(() => new Error('Informe nome, e-mail e senha para alterar o gerente.')).pipe(delay(this.simulatedDelayMs));
    }

    const emailConflitante = this.getAllUsers().some(
      (user) => user.email.toLowerCase() === email && user.cpf !== gerente.cpf,
    );
    if (emailConflitante) {
      return throwError(() => new Error('Já existe outro usuário com este e-mail.')).pipe(delay(this.simulatedDelayMs));
    }

    gerente.nome = nome;
    gerente.email = email;
    gerente.senha = senha;

    this.clientes
      .filter((cliente) => cliente.gerente_cpf === gerente.cpf)
      .forEach((cliente) => {
        cliente.gerente_nome = gerente.nome;
        cliente.gerente_email = gerente.email;
      });

    return of({
      mensagem: `Gerente ${gerente.nome} atualizado com sucesso.`,
      gerente: this.toAdminGerente(gerente),
      detalhes: ['As contas vinculadas tiveram os dados de gerente atualizados no protótipo.'],
    }).pipe(delay(this.simulatedDelayMs));
  }

  public removerGerenteAdmin(cpf: string): Observable<AdminGerenteRemocaoResponse> {
    const gerente = this.buscarGerente(cpf);

    if (!gerente) {
      return throwError(() => new Error('Gerente não encontrado para remoção.')).pipe(delay(this.simulatedDelayMs));
    }

    if (this.gerentes.length <= 1) {
      return throwError(() => new Error('Não é permitido remover o último gerente do banco.')).pipe(delay(this.simulatedDelayMs));
    }

    const clientesDoGerente = this.clientes.filter((cliente) => cliente.gerente_cpf === gerente.cpf);
    const gerenteDestino = this.escolherGerenteDestinoRemocao(gerente.cpf);

    if (!gerenteDestino) {
      return throwError(() => new Error('Não foi possível escolher um gerente para receber as contas.')).pipe(delay(this.simulatedDelayMs));
    }

    clientesDoGerente.forEach((cliente) => this.reatribuirCliente(cliente, gerenteDestino));
    const indice = this.gerentes.findIndex((item) => item.cpf === gerente.cpf);
    this.gerentes.splice(indice, 1);

    return of({
      mensagem: `Gerente ${gerente.nome} removido com sucesso.`,
      gerenteRemovido: gerente.nome,
      gerenteDestino: gerenteDestino.nome,
      totalContasReatribuidas: clientesDoGerente.length,
      detalhes: [
        `${clientesDoGerente.length} conta(s) foram reatribuídas para ${gerenteDestino.nome}.`,
      ],
    }).pipe(delay(this.simulatedDelayMs));
  }

  private gerarExtratoPorPeriodo(numeroConta: string, dataInicio: string, dataFim: string): ExtratoDiaModel[] {
    const todas = this.movimentacoes
      .filter((mov) => this.movimentacaoEnvolveConta(mov, numeroConta))
      .sort((a, b) => a.dataHora.localeCompare(b.dataHora));

    const saldoInicial = this.calcularSaldoInicial(numeroConta, todas);
    const dias: ExtratoDiaModel[] = [];

    let saldoCorrente = saldoInicial;
    let dataCursor = new Date(`${dataInicio}T00:00:00`);
    const dataFinal = new Date(`${dataFim}T00:00:00`);

    while (dataCursor <= dataFinal) {
      const dia = this.formatDateOnly(dataCursor);
      const movimentosDoDia = todas.filter((mov) => this.onlyDate(mov.dataHora) === dia);

      const movimentacoes = movimentosDoDia.map((mov) => this.toExtratoMovimentacao(mov, numeroConta));
      const deltaDia = movimentacoes.reduce((acc, item) => {
        return acc + (item.natureza === 'ENTRADA' ? item.valor : -item.valor);
      }, 0);

      saldoCorrente = this.normalizarValor(saldoCorrente + deltaDia);
      dias.push({
        data: dia,
        saldoConsolidado: saldoCorrente,
        movimentacoes,
      });

      dataCursor.setDate(dataCursor.getDate() + 1);
    }

    return dias;
  }

  private calcularSaldoInicial(numeroConta: string, movimentacoes: DemoMovimentacao[]): number {
    const cliente = this.buscarClienteInternoPorConta(numeroConta);
    const saldoAtual = cliente?.saldo ?? 0;

    const deltaTotal = movimentacoes.reduce((acc, mov) => acc + this.getDeltaForConta(mov, numeroConta), 0);
    return this.normalizarValor(saldoAtual - deltaTotal);
  }

  private toExtratoMovimentacao(
    mov: DemoMovimentacao,
    numeroConta: string,
  ): ExtratoMovimentacaoModel {
    const natureza = this.getNatureza(mov, numeroConta);

    return {
      dataHora: mov.dataHora,
      operacao: mov.operacao,
      origem: mov.operacao === 'TRANSFERENCIA' ? mov.clienteOrigem : null,
      destino: mov.operacao === 'TRANSFERENCIA' ? mov.clienteDestino ?? null : null,
      valor: mov.valor,
      natureza,
    };
  }

  private getNatureza(mov: DemoMovimentacao, numeroConta: string): NaturezaLancamento {
    if (mov.operacao === 'DEPOSITO') {
      return 'ENTRADA';
    }

    if (mov.operacao === 'SAQUE') {
      return 'SAIDA';
    }

    return mov.contaOrigem === numeroConta ? 'SAIDA' : 'ENTRADA';
  }

  private getDeltaForConta(mov: DemoMovimentacao, numeroConta: string): number {
    if (mov.operacao === 'DEPOSITO') {
      return mov.contaOrigem === numeroConta ? mov.valor : 0;
    }

    if (mov.operacao === 'SAQUE') {
      return mov.contaOrigem === numeroConta ? -mov.valor : 0;
    }

    if (mov.contaOrigem === numeroConta) {
      return -mov.valor;
    }

    if (mov.contaDestino === numeroConta) {
      return mov.valor;
    }

    return 0;
  }

  private movimentacaoEnvolveConta(mov: DemoMovimentacao, numeroConta: string): boolean {
    return mov.contaOrigem === numeroConta || mov.contaDestino === numeroConta;
  }

  private normalizarLogin(login: string): string {
    const normalizado = login.trim().toLowerCase();

    if ([
      'adm1@bantas.com.br',
      'adminadm1@bantas.com.br',
      'adminadm1@bantads.com.br',
      'admin1@bantads.com.br',
    ].includes(normalizado)) {
      return 'adm1@bantads.com.br';
    }

    return normalizado;
  }

  private getAllUsers(): DemoUser[] {
    return [
      ...this.clientes.map((cliente) => ({
        id: cliente.cpf,
        cpf: cliente.cpf,
        nome: cliente.nome,
        email: cliente.email,
        senha: cliente.senha,
        perfil: 'CLIENTE' as const,
        numeroConta: cliente.numeroConta,
      })),
      ...this.gerentes.map((gerente) => ({
        id: gerente.cpf,
        cpf: gerente.cpf,
        nome: gerente.nome,
        email: gerente.email,
        senha: gerente.senha,
        perfil: gerente.perfil,
      })),
      ...this.administradores.map((admin) => ({
        id: admin.cpf,
        cpf: admin.cpf,
        nome: admin.nome,
        email: admin.email,
        senha: admin.senha,
        perfil: admin.perfil,
      })),
    ];
  }

  private toUsuarioLogado(user: DemoUser): UsuarioLogado {
    return {
      id: user.id,
      nome: user.nome,
      email: user.email,
      perfil: user.perfil,
      cpf: user.cpf,
      numeroConta: user.numeroConta,
    };
  }

  private toClienteModel(cliente: DemoCliente): ClienteModel {
    return this.clone({
      cpf: cliente.cpf,
      nome: cliente.nome,
      telefone: cliente.telefone,
      email: cliente.email,
      endereco: cliente.endereco,
      cidade: cliente.cidade,
      estado: cliente.estado,
      salario: cliente.salario,
      conta: cliente.numeroConta,
      saldo: cliente.saldo,
      limite: cliente.limite,
      gerente_nome: cliente.gerente_nome,
      situacao: cliente.situacao,
      agencia: cliente.agencia,
      gerente_email: cliente.gerente_email,
      cep: cliente.cep,
    } as ClienteModel & { agencia?: string; gerente_email?: string; cep?: string });
  }

  private toClienteCarteira(cliente: DemoCliente): ClienteCarteiraModel {
    return this.clone({
      cpf: cliente.cpf,
      nome: cliente.nome,
      email: cliente.email,
      telefone: cliente.telefone,
      cidade: cliente.cidade,
      estado: cliente.estado,
      endereco: cliente.endereco,
      salario: cliente.salario,
      conta: cliente.numeroConta,
      agencia: cliente.agencia,
      saldo: cliente.saldo ?? 0,
      limite: cliente.limite ?? 0,
      situacao: cliente.situacao,
      gerenteCpf: cliente.gerente_cpf,
      gerenteNome: cliente.gerente_nome,
      gerenteEmail: cliente.gerente_email,
      cep: cliente.cep,
    });
  }

  private toAdminGerente(gerente: DemoGerente): AdminGerenteModel {
    const carteira = this.clientes.filter((cliente) => cliente.gerente_cpf === gerente.cpf);
    const totalSaldoPositivo = carteira
      .filter((cliente) => (cliente.saldo ?? 0) >= 0)
      .reduce((acc, cliente) => acc + (cliente.saldo ?? 0), 0);
    const totalSaldoNegativo = carteira
      .filter((cliente) => (cliente.saldo ?? 0) < 0)
      .reduce((acc, cliente) => acc + (cliente.saldo ?? 0), 0);

    return {
      cpf: gerente.cpf,
      nome: gerente.nome,
      email: gerente.email,
      telefone: gerente.telefone,
      totalClientes: carteira.length,
      totalSaldoPositivo: this.normalizarValor(totalSaldoPositivo),
      totalSaldoNegativo: this.normalizarValor(totalSaldoNegativo),
    };
  }

  private escolherGerenteDoadorParaNovoGerente(): DemoGerente | undefined {
    if (!this.gerentes.length) {
      return undefined;
    }

    const candidatos = [...this.gerentes]
      .map((gerente) => {
        const resumo = this.toAdminGerente(gerente);
        return {
          gerente,
          totalClientes: resumo.totalClientes,
          totalSaldoPositivo: resumo.totalSaldoPositivo,
        };
      })
      .sort((a, b) => {
        if (b.totalClientes !== a.totalClientes) {
          return b.totalClientes - a.totalClientes;
        }
        if (a.totalSaldoPositivo !== b.totalSaldoPositivo) {
          return a.totalSaldoPositivo - b.totalSaldoPositivo;
        }
        return a.gerente.nome.localeCompare(b.gerente.nome, 'pt-BR');
      });

    const selecionado = candidatos[0];
    if (!selecionado || selecionado.totalClientes === 0) {
      return undefined;
    }

    if (this.gerentes.length === 1 && selecionado.totalClientes === 1) {
      return undefined;
    }

    return selecionado.gerente;
  }

  private escolherContaParaNovoGerente(gerenteCpf: string): DemoCliente | undefined {
    const carteira = this.clientes
      .filter((cliente) => cliente.gerente_cpf === gerenteCpf)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    return carteira[0];
  }

  private escolherGerenteDestinoRemocao(gerenteExcluidoCpf: string): DemoGerente | undefined {
    const candidatos = this.gerentes
      .filter((gerente) => gerente.cpf !== gerenteExcluidoCpf)
      .map((gerente) => ({ gerente, totalClientes: this.toAdminGerente(gerente).totalClientes }))
      .sort((a, b) => {
        if (a.totalClientes !== b.totalClientes) {
          return a.totalClientes - b.totalClientes;
        }
        return a.gerente.nome.localeCompare(b.gerente.nome, 'pt-BR');
      });

    return candidatos[0]?.gerente;
  }

  private reatribuirCliente(cliente: DemoCliente, gerente: DemoGerente): void {
    cliente.gerente_cpf = gerente.cpf;
    cliente.gerente_nome = gerente.nome;
    cliente.gerente_email = gerente.email;
  }

  private buscarClienteInternoPorConta(numeroConta: string): DemoCliente | undefined {
    return this.clientes.find((cliente) => cliente.numeroConta === String(numeroConta));
  }

  private buscarGerente(cpf: string): DemoGerente | undefined {
    return this.gerentes.find((gerente) => gerente.cpf === cpf);
  }

  private calcularLimite(salario: number, saldoAtual: number): number {
    const limiteBase = salario >= 2000 ? salario / 2 : 0;

    if (saldoAtual < 0 && limiteBase < Math.abs(saldoAtual)) {
      return this.normalizarValor(Math.abs(saldoAtual));
    }

    return this.normalizarValor(limiteBase);
  }

  private gerarNumeroConta(): string {
    let conta = '';
    do {
      conta = String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0');
    } while (this.clientes.some((cliente) => cliente.numeroConta === conta));

    return conta;
  }

  private gerarSenhaTemporaria(): string {
    return 'tads';
  }

  private mov(
    id: string,
    dataHora: string,
    operacao: DemoMovimentacao['operacao'],
    contaOrigem: string,
    clienteOrigem: string,
    cpfOrigem: string,
    contaDestino: string | null,
    clienteDestino: string | null,
    cpfDestino: string | null,
    valor: number,
  ): DemoMovimentacao {
    return {
      id,
      dataHora,
      operacao,
      contaOrigem,
      clienteOrigem,
      cpfOrigem,
      contaDestino,
      clienteDestino,
      cpfDestino,
      valor: this.normalizarValor(valor),
    };
  }

  private buildMovementId(): string {
    return `mov-${this.movimentacoes.length + 1}-${Date.now()}`;
  }

  private nowIso(): string {
    return new Date().toISOString();
  }

  private onlyDate(value: string): string {
    return String(value ?? '').slice(0, 10);
  }

  private formatDateOnly(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private normalizarValor(value: number): number {
    return Number(value.toFixed(2));
  }

  private toNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value.replace('.', '').replace(',', '.'));
      return Number.isFinite(parsed) ? parsed : undefined;
    }

    return undefined;
  }

  private optionalString(value: unknown): string | undefined {
    if (typeof value === 'string') {
      return value;
    }
    return undefined;
  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}
