package bantads.saga.engine

internal enum class ApprovalStep {
    AWAIT_GERENTE_LIST,
    AWAIT_COUNTS,
    AWAIT_CONTA_CREATE,
    AWAIT_AUTH,
    AWAIT_EMAIL,
    COMPENSATING,
    DONE,
}
