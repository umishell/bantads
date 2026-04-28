package bantads.conta.exception

class ContaNaoEncontradaException(msg: String = "Conta não encontrada") : RuntimeException(msg)
class ContaInativaException(msg: String = "Conta inativa") : RuntimeException(msg)
class SaldoInsuficienteException(msg: String = "Saldo insuficiente") : RuntimeException(msg)
class OperacaoInvalidaException(msg: String) : RuntimeException(msg)
