package bantads.cliente.model

/**
 * Estados do cliente no autocadastro / aprovação.
 *
 * Transições esperadas (Fase 2): [PENDENTE_APROVACAO] → [PROCESSANDO_APROVACAO] → [APROVADO],
 * ou [PENDENTE_APROVACAO] → [REJEITADO]. Em falha da saga após PROCESSANDO, ver
 * [bantads.cliente.saga.SagaAprovacaoClientePolicy].
 */
enum class StatusCliente {
    /** Cadastro inicial; aguardando ação do gerente. */
    PENDENTE_APROVACAO,

    /** Aprovação iniciada; saga em andamento — não iniciar nova aprovação para o mesmo cliente. */
    PROCESSANDO_APROVACAO,

    /** Somente após e-mail com credenciais enviado com sucesso (decisão de produto BANTADS). */
    APROVADO,

    /** Reprovação manual (R11). */
    REJEITADO,
}
