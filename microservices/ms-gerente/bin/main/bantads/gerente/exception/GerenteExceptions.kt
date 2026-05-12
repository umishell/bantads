package bantads.gerente.exception

class GerenteNaoEncontradoException(msg: String = "Gerente não encontrado") : RuntimeException(msg)
class CpfJaCadastradoException(msg: String = "CPF já cadastrado para outro gerente") : RuntimeException(msg)
class UltimoGerenteException(msg: String = "Não é permitido remover o último gerente ativo do banco") : RuntimeException(msg)
