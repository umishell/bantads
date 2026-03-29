package bantads.cliente.saga

import bantads.cliente.model.StatusCliente

/**
 * Decisões únicas de produto/arquitetura para a saga de aprovação de cliente (Fase 2).
 *
 * **Métrica de “menor carga” do gerente (R1)**  
 * - **Definição:** número de **contas ativas** no `ms-conta` cujo `gerente_responsavel_id` (ou campo equivalente)
 *   aponta para aquele gerente. A fonte de verdade da métrica é o **PostgreSQL do ms-conta**, não um contador
 *   isolado no `ms-gerente`, para refletir “responsável pela conta”.  
 * - **Empate:** entre gerentes com a mesma contagem, escolher o de **menor CPF** (11 dígitos, ordem lexicográfica
 *   coincide com ordem numérica).
 *
 * **Política única de falha, retry e status do cliente**  
 * - **Passo e-mail (`ms-email`):** a saga aplica até [EMAIL_STEP_MAX_ATTEMPTS] tentativas antes de considerar
 *   falha terminal desse passo.  
 * - **Falha terminal (qualquer passo após compensações necessárias):** o `ms-cliente` deve transicionar
 *   `PROCESSANDO_APROVACAO` → `PENDENTE_APROVACAO` (idempotente), permitindo nova tentativa de aprovação.
 *   **Não** usamos estado `ERRO_PROCESSAMENTO` neste projeto.  
 * - **Compensação:** ordem inversa ao fluxo feliz (ex.: após conta criada e falha no auth, saga ordena remoção
 *   ou inativação da conta no `ms-conta`; se auth existir e e-mail falhar após retries, compensar auth e conta).
 *
 * Implementações de `ms-saga`, `ms-gerente`, `ms-conta`, `ms-auth` e `ms-email` devem seguir estes valores
 * e textos; detalhes operacionais também estão no README da raiz do repositório (seção Saga BANTADS).
 */
object SagaAprovacaoClientePolicy {

    /** Tentativas do passo de envio de e-mail antes de falha terminal e compensação em cadeia. */
    const val EMAIL_STEP_MAX_ATTEMPTS: Int = 3

    /** Estado após falha da saga (após compensação quando aplicável): cliente volta à fila de aprovação. */
    val STATUS_AFTER_SAGA_FAILURE: StatusCliente = StatusCliente.PENDENTE_APROVACAO
}
