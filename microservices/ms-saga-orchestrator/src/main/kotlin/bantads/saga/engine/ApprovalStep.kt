package bantads.saga.engine

internal enum class ApprovalStep {
    AWAIT_GERENTE_LIST,
    AWAIT_COUNTS,
    AWAIT_CONTA_CREATE,
    AWAIT_AUTH,
    AWAIT_EMAIL,
    COMPENSATING_DELETE_AUTH,
    COMPENSATING_DELETE_CONTA,
    DONE,
}
