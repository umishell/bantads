package bantads.conta.messaging

import bantads.conta.config.RabbitConfig
import bantads.conta.model.Conta
import bantads.conta.repository.ContaRepository
import bantads.conta.service.ContaCommandService
import bantads.conta.service.ContaLimiteCalculator
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.amqp.rabbit.annotation.RabbitListener
import org.springframework.stereotype.Component
import java.math.BigDecimal
import java.math.RoundingMode
import java.util.UUID
import kotlin.random.Random

@Component
class ContaCommandListener(
    private val repository: ContaRepository,
    private val commandService: ContaCommandService,
    private val responses: SagaResponsePublisher,
    private val objectMapper: ObjectMapper,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @RabbitListener(queues = [RabbitConfig.QUEUE_CMD], containerFactory = "rawJsonListenerContainerFactory")
    fun onMessage(body: String) {
        val root = objectMapper.readTree(body)
        val cmd = root.path("command").asText()
        val correlationId = root.path("correlationId").asText()
        val sagaId = root.path("sagaId").asText()
        try {
            when (cmd) {
                "CONTA_COUNTS_BY_GERENTE" -> handleCounts(root, correlationId, sagaId)
                "CONTA_CREATE" -> handleCreate(root, correlationId, sagaId)
                "CONTA_DELETE" -> handleDelete(root, correlationId, sagaId)
                "CONTA_TRANSFER_DEBIT" -> handleTransferDebit(root, correlationId, sagaId)
                "CONTA_TRANSFER_CREDIT" -> handleTransferCredit(root, correlationId, sagaId)
                else -> log.warn("Comando conta desconhecido: {}", cmd)
            }
        } catch (ex: Exception) {
            log.warn("Erro ao processar comando conta: {}", ex.message)
            responses.publish(
                "resp.conta",
                mapOf(
                    "correlationId" to correlationId,
                    "sagaId" to sagaId,
                    "success" to false,
                    "source" to "CONTA",
                    "intent" to inferIntent(cmd),
                    "error" to (ex.message ?: "erro"),
                ),
            )
        }
    }

    private fun inferIntent(cmd: String): String = when (cmd) {
        "CONTA_COUNTS_BY_GERENTE" -> "COUNTS"
        "CONTA_CREATE" -> "CREATE"
        "CONTA_DELETE" -> "DELETE"
        "CONTA_TRANSFER_DEBIT" -> "TRANSFER_DEBIT"
        "CONTA_TRANSFER_CREDIT" -> "TRANSFER_CREDIT"
        else -> "UNKNOWN"
    }

    private fun handleCounts(root: JsonNode, correlationId: String, sagaId: String) {
        val ids = root.path("gerenteIds")
        val counts = mutableMapOf<String, Long>()
        if (ids.isArray) {
            for (n in ids) {
                val gid = UUID.fromString(n.asText())
                counts[gid.toString()] = repository.countByGerenteIdAndAtiva(gid, true)
            }
        }
        responses.publish(
            "resp.conta",
            mapOf(
                "correlationId" to correlationId,
                "sagaId" to sagaId,
                "success" to true,
                "source" to "CONTA",
                "intent" to "COUNTS",
                "counts" to counts,
            ),
        )
    }

    private fun handleCreate(root: JsonNode, correlationId: String, sagaId: String) {
        val sagaUuid = UUID.fromString(sagaId)
        val existing = repository.findBySagaId(sagaUuid)
        if (existing != null) {
            val eid = existing.id ?: return
            responses.publish(
                "resp.conta",
                mapOf(
                    "correlationId" to correlationId,
                    "sagaId" to sagaId,
                    "success" to true,
                    "source" to "CONTA",
                    "intent" to "CREATE",
                    "contaId" to eid.toString(),
                    "numero" to existing.numero,
                ),
            )
            return
        }
        val salario = BigDecimal(root.path("salario").asText())
        val limite = ContaLimiteCalculator.calcularLimitePorSalario(salario, BigDecimal.ZERO)
        val numero = gerarNumeroConta4Digitos()
        val cpfNode = root.get("cpf")
        val clienteCpf = if (cpfNode == null || cpfNode.isNull) {
            null
        } else {
            cpfNode.asText().takeIf { it.isNotBlank() }
        }
        val conta = Conta(
            numero = numero,
            saldo = BigDecimal.ZERO,
            limite = limite,
            clienteId = UUID.fromString(root.path("clienteId").asText()),
            clienteCpf = clienteCpf,
            gerenteId = UUID.fromString(root.path("gerenteId").asText()),
            sagaId = sagaUuid,
            ativa = true,
        )
        val saved = repository.save(conta)
        val sid = saved.id ?: error("conta sem id")
        responses.publish(
            "resp.conta",
            mapOf(
                "correlationId" to correlationId,
                "sagaId" to sagaId,
                "success" to true,
                "source" to "CONTA",
                "intent" to "CREATE",
                "contaId" to sid.toString(),
                "numero" to saved.numero,
                "dataCriacao" to saved.dataCriacao.toString(),
            ),
        )
    }

    private fun gerarNumeroConta4Digitos(): String {
        repeat(50) {
            val n = Random.nextInt(1000, 10000).toString()
            if (!repository.existsByNumero(n)) return n
        }
        error("não foi possível gerar número de conta único")
    }

    private fun handleTransferDebit(root: JsonNode, correlationId: String, sagaId: String) {
        commandService.sagaTransferDebito(
            sagaId = sagaId,
            numeroContaOrigem = root.path("numeroOrigem").asText(),
            numeroDestino = root.path("numeroDestino").asText(),
            valor = BigDecimal(root.path("valor").asText()),
        )
        responses.publish(
            "resp.conta",
            mapOf(
                "correlationId" to correlationId,
                "sagaId" to sagaId,
                "success" to true,
                "source" to "CONTA",
                "intent" to "TRANSFER_DEBIT",
            ),
        )
    }

    private fun handleTransferCredit(root: JsonNode, correlationId: String, sagaId: String) {
        try {
            val op = commandService.sagaTransferCredito(sagaId)
            responses.publish(
                "resp.conta",
                mapOf(
                    "correlationId" to correlationId,
                    "sagaId" to sagaId,
                    "success" to true,
                    "source" to "CONTA",
                    "intent" to "TRANSFER_CREDIT",
                    "movimentacaoId" to op.movimentacaoId.toString(),
                    "valor" to op.valor.toPlainString(),
                    "saldoOrigem" to op.saldoOrigem!!.toPlainString(),
                    "saldoDestino" to op.saldoDestino!!.toPlainString(),
                    "dataHora" to op.dataHora.toString(),
                ),
            )
        } catch (ex: Exception) {
            commandService.sagaTransferCompensarDebito(sagaId)
            throw ex
        }
    }

    private fun handleDelete(root: JsonNode, correlationId: String, sagaId: String) {
        val id = UUID.fromString(root.path("contaId").asText())
        repository.findById(id).ifPresent { c ->
            c.ativa = false
            repository.save(c)
        }
        responses.publish(
            "resp.conta",
            mapOf(
                "correlationId" to correlationId,
                "sagaId" to sagaId,
                "success" to true,
                "source" to "CONTA",
                "intent" to "DELETE",
            ),
        )
    }
}
