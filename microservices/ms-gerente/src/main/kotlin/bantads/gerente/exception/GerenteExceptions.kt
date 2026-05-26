package bantads.gerente.exception

class GerenteNaoEncontradoException(msg: String = "Gerente não encontrado") : RuntimeException(msg)
class CpfJaCadastradoException(msg: String = "CPF já cadastrado para outro gerente") : RuntimeException(msg)
class EmailJaCadastradoException(msg: String = "E-mail já cadastrado") : RuntimeException(msg)
class UltimoGerenteException(msg: String = "Não é permitido remover o último gerente ativo do banco") : RuntimeException(msg)
class FalhaCredencialAuthException(
    msg: String = "Não foi possível criar ou atualizar credenciais de acesso no ms-auth",
) : RuntimeException(msg)
