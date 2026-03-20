-- =========================================================
-- BANTADS - 02_bantads_logic_triggers.sql
-- Lógica de apoio, rebuild do read model, triggers e funções
-- de operação (depósito, saque e transferência).
-- Execute depois do 01_bantads_schema.sql.
-- =========================================================

-- =========================================================
-- FUNÇÕES DE UPDATED_AT
-- =========================================================

CREATE OR REPLACE FUNCTION public.fn_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.atualizado_em := NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cliente_touch_updated_at
BEFORE UPDATE ON cliente.clientes
FOR EACH ROW
EXECUTE FUNCTION public.fn_touch_updated_at();

CREATE TRIGGER trg_gerente_touch_updated_at
BEFORE UPDATE ON gerente.usuarios_internos
FOR EACH ROW
EXECUTE FUNCTION public.fn_touch_updated_at();

CREATE TRIGGER trg_conta_touch_updated_at
BEFORE UPDATE ON conta_cud.contas
FOR EACH ROW
EXECUTE FUNCTION public.fn_touch_updated_at();

-- =========================================================
-- LOG DE MOVIMENTAÇÕES
-- =========================================================

CREATE OR REPLACE FUNCTION conta_cud.fn_log_movimentacao()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO conta_cud.log_operacoes (
            movimentacao_id, operacao_bd, tipo,
            conta_origem_numero, conta_destino_numero, valor, payload
        ) VALUES (
            NEW.id, TG_OP, NEW.tipo,
            NEW.conta_origem_numero, NEW.conta_destino_numero, NEW.valor,
            to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO conta_cud.log_operacoes (
            movimentacao_id, operacao_bd, tipo,
            conta_origem_numero, conta_destino_numero, valor, payload
        ) VALUES (
            NEW.id, TG_OP, NEW.tipo,
            NEW.conta_origem_numero, NEW.conta_destino_numero, NEW.valor,
            jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
        );
        RETURN NEW;
    ELSE
        INSERT INTO conta_cud.log_operacoes (
            movimentacao_id, operacao_bd, tipo,
            conta_origem_numero, conta_destino_numero, valor, payload
        ) VALUES (
            OLD.id, TG_OP, OLD.tipo,
            OLD.conta_origem_numero, OLD.conta_destino_numero, OLD.valor,
            to_jsonb(OLD)
        );
        RETURN OLD;
    END IF;
END;
$$;

CREATE TRIGGER trg_log_movimentacao
AFTER INSERT OR UPDATE OR DELETE ON conta_cud.movimentacoes
FOR EACH ROW
EXECUTE FUNCTION conta_cud.fn_log_movimentacao();

-- =========================================================
-- REBUILD DO READ MODEL
-- =========================================================

CREATE OR REPLACE FUNCTION conta_read.rebuild_from_cud()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    TRUNCATE TABLE conta_read.lancamentos_extrato;
    TRUNCATE TABLE conta_read.saldos_diarios;

    WITH movimentos_por_conta AS (
        -- Depósito: entra na conta destino
        SELECT
            m.id AS movimentacao_id,
            cd.numero AS conta_numero,
            cld.cpf AS cliente_cpf,
            cld.nome AS cliente_nome,
            m.data_hora,
            m.tipo,
            'ENTRADA'::public.natureza_lancamento AS natureza,
            m.valor,
            m.valor AS delta,
            NULL::CHAR(4) AS conta_contraparte_numero,
            NULL::CHAR(11) AS cliente_contraparte_cpf,
            NULL::VARCHAR(120) AS cliente_contraparte_nome
        FROM conta_cud.movimentacoes m
        JOIN conta_cud.contas cd
          ON cd.numero = m.conta_destino_numero
        JOIN cliente.clientes cld
          ON cld.cpf = cd.cliente_cpf
        WHERE m.tipo = 'DEPOSITO'

        UNION ALL

        -- Saque: sai da conta origem
        SELECT
            m.id AS movimentacao_id,
            co.numero AS conta_numero,
            clo.cpf AS cliente_cpf,
            clo.nome AS cliente_nome,
            m.data_hora,
            m.tipo,
            'SAIDA'::public.natureza_lancamento AS natureza,
            m.valor,
            (-1 * m.valor) AS delta,
            NULL::CHAR(4) AS conta_contraparte_numero,
            NULL::CHAR(11) AS cliente_contraparte_cpf,
            NULL::VARCHAR(120) AS cliente_contraparte_nome
        FROM conta_cud.movimentacoes m
        JOIN conta_cud.contas co
          ON co.numero = m.conta_origem_numero
        JOIN cliente.clientes clo
          ON clo.cpf = co.cliente_cpf
        WHERE m.tipo = 'SAQUE'

        UNION ALL

        -- Transferência: perspectiva de saída
        SELECT
            m.id AS movimentacao_id,
            co.numero AS conta_numero,
            clo.cpf AS cliente_cpf,
            clo.nome AS cliente_nome,
            m.data_hora,
            m.tipo,
            'SAIDA'::public.natureza_lancamento AS natureza,
            m.valor,
            (-1 * m.valor) AS delta,
            cd.numero AS conta_contraparte_numero,
            cld.cpf AS cliente_contraparte_cpf,
            cld.nome AS cliente_contraparte_nome
        FROM conta_cud.movimentacoes m
        JOIN conta_cud.contas co
          ON co.numero = m.conta_origem_numero
        JOIN cliente.clientes clo
          ON clo.cpf = co.cliente_cpf
        JOIN conta_cud.contas cd
          ON cd.numero = m.conta_destino_numero
        JOIN cliente.clientes cld
          ON cld.cpf = cd.cliente_cpf
        WHERE m.tipo = 'TRANSFERENCIA'

        UNION ALL

        -- Transferência: perspectiva de entrada
        SELECT
            m.id AS movimentacao_id,
            cd.numero AS conta_numero,
            cld.cpf AS cliente_cpf,
            cld.nome AS cliente_nome,
            m.data_hora,
            m.tipo,
            'ENTRADA'::public.natureza_lancamento AS natureza,
            m.valor,
            m.valor AS delta,
            co.numero AS conta_contraparte_numero,
            clo.cpf AS cliente_contraparte_cpf,
            clo.nome AS cliente_contraparte_nome
        FROM conta_cud.movimentacoes m
        JOIN conta_cud.contas co
          ON co.numero = m.conta_origem_numero
        JOIN cliente.clientes clo
          ON clo.cpf = co.cliente_cpf
        JOIN conta_cud.contas cd
          ON cd.numero = m.conta_destino_numero
        JOIN cliente.clientes cld
          ON cld.cpf = cd.cliente_cpf
        WHERE m.tipo = 'TRANSFERENCIA'
    ),
    saldo_abertura AS (
        SELECT
            c.numero AS conta_numero,
            c.saldo - COALESCE(SUM(mp.delta), 0) AS saldo_inicial
        FROM conta_cud.contas c
        LEFT JOIN movimentos_por_conta mp
          ON mp.conta_numero = c.numero
        GROUP BY c.numero, c.saldo
    ),
    lancamentos AS (
        SELECT
            mp.movimentacao_id,
            mp.conta_numero,
            mp.cliente_cpf,
            mp.cliente_nome,
            mp.data_hora,
            mp.tipo,
            mp.natureza,
            mp.valor,
            sa.saldo_inicial
              + SUM(mp.delta) OVER (
                    PARTITION BY mp.conta_numero
                    ORDER BY mp.data_hora, mp.movimentacao_id, mp.natureza
                ) AS saldo_apos,
            mp.conta_contraparte_numero,
            mp.cliente_contraparte_cpf,
            mp.cliente_contraparte_nome
        FROM movimentos_por_conta mp
        JOIN saldo_abertura sa
          ON sa.conta_numero = mp.conta_numero
    )
    INSERT INTO conta_read.lancamentos_extrato (
        movimentacao_id,
        conta_numero,
        cliente_cpf,
        cliente_nome,
        data_hora,
        tipo,
        natureza,
        valor,
        saldo_apos,
        conta_contraparte_numero,
        cliente_contraparte_cpf,
        cliente_contraparte_nome
    )
    SELECT
        movimentacao_id,
        conta_numero,
        cliente_cpf,
        cliente_nome,
        data_hora,
        tipo,
        natureza,
        valor,
        saldo_apos,
        conta_contraparte_numero,
        cliente_contraparte_cpf,
        cliente_contraparte_nome
    FROM lancamentos
    ORDER BY conta_numero, data_hora, movimentacao_id;

    WITH movimentos_por_conta AS (
        SELECT
            m.id AS movimentacao_id,
            cd.numero AS conta_numero,
            m.data_hora::date AS dia,
            m.valor AS delta
        FROM conta_cud.movimentacoes m
        JOIN conta_cud.contas cd
          ON cd.numero = m.conta_destino_numero
        WHERE m.tipo = 'DEPOSITO'

        UNION ALL

        SELECT
            m.id AS movimentacao_id,
            co.numero AS conta_numero,
            m.data_hora::date AS dia,
            (-1 * m.valor) AS delta
        FROM conta_cud.movimentacoes m
        JOIN conta_cud.contas co
          ON co.numero = m.conta_origem_numero
        WHERE m.tipo = 'SAQUE'

        UNION ALL

        SELECT
            m.id AS movimentacao_id,
            co.numero AS conta_numero,
            m.data_hora::date AS dia,
            (-1 * m.valor) AS delta
        FROM conta_cud.movimentacoes m
        JOIN conta_cud.contas co
          ON co.numero = m.conta_origem_numero
        WHERE m.tipo = 'TRANSFERENCIA'

        UNION ALL

        SELECT
            m.id AS movimentacao_id,
            cd.numero AS conta_numero,
            m.data_hora::date AS dia,
            m.valor AS delta
        FROM conta_cud.movimentacoes m
        JOIN conta_cud.contas cd
          ON cd.numero = m.conta_destino_numero
        WHERE m.tipo = 'TRANSFERENCIA'
    ),
    saldo_abertura AS (
        SELECT
            c.numero AS conta_numero,
            c.data_criacao::date AS data_inicio,
            c.saldo - COALESCE(SUM(mp.delta), 0) AS saldo_inicial
        FROM conta_cud.contas c
        LEFT JOIN movimentos_por_conta mp
          ON mp.conta_numero = c.numero
        GROUP BY c.numero, c.data_criacao, c.saldo
    ),
    serie AS (
        SELECT
            sa.conta_numero,
            gs::date AS dia,
            sa.saldo_inicial
        FROM saldo_abertura sa,
             generate_series(
                sa.data_inicio,
                GREATEST(
                    sa.data_inicio,
                    COALESCE((SELECT MAX(data_hora)::date FROM conta_cud.movimentacoes), CURRENT_DATE),
                    CURRENT_DATE
                ),
                interval '1 day'
             ) gs
    ),
    delta_diario AS (
        SELECT
            conta_numero,
            dia,
            SUM(delta) AS delta_dia
        FROM movimentos_por_conta
        GROUP BY conta_numero, dia
    ),
    fechamento AS (
        SELECT
            s.conta_numero,
            s.dia,
            s.saldo_inicial
              + COALESCE(
                    SUM(COALESCE(dd.delta_dia, 0)) OVER (
                        PARTITION BY s.conta_numero
                        ORDER BY s.dia
                        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                    ),
                    0
                ) AS saldo_fechamento
        FROM serie s
        LEFT JOIN delta_diario dd
          ON dd.conta_numero = s.conta_numero
         AND dd.dia = s.dia
    )
    INSERT INTO conta_read.saldos_diarios (
        conta_numero,
        data_referencia,
        saldo_fechamento
    )
    SELECT
        conta_numero,
        dia,
        saldo_fechamento
    FROM fechamento
    ORDER BY conta_numero, dia;
END;
$$;

-- =========================================================
-- TRIGGERS PARA MANTER O READ MODEL SINCRONIZADO
-- (simples e suficiente para o porte acadêmico do projeto)
-- =========================================================

CREATE OR REPLACE FUNCTION conta_read.fn_trigger_rebuild_from_cud()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM conta_read.rebuild_from_cud();
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_rebuild_read_on_contas
AFTER INSERT OR UPDATE OR DELETE ON conta_cud.contas
FOR EACH STATEMENT
EXECUTE FUNCTION conta_read.fn_trigger_rebuild_from_cud();

CREATE TRIGGER trg_rebuild_read_on_movimentacoes
AFTER INSERT OR UPDATE OR DELETE ON conta_cud.movimentacoes
FOR EACH STATEMENT
EXECUTE FUNCTION conta_read.fn_trigger_rebuild_from_cud();

CREATE TRIGGER trg_rebuild_read_on_clientes
AFTER UPDATE OF nome ON cliente.clientes
FOR EACH STATEMENT
EXECUTE FUNCTION conta_read.fn_trigger_rebuild_from_cud();

-- =========================================================
-- FUNÇÕES DE OPERAÇÃO
-- =========================================================

CREATE OR REPLACE FUNCTION conta_cud.sp_depositar(
    p_conta_numero CHAR(4),
    p_valor NUMERIC(14,2)
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_cliente_cpf CHAR(11);
    v_saldo_novo NUMERIC(14,2);
    v_mov_id UUID;
BEGIN
    IF p_valor IS NULL OR p_valor <= 0 THEN
        RAISE EXCEPTION 'Valor de depósito inválido.';
    END IF;

    SELECT cliente_cpf, saldo + p_valor
      INTO v_cliente_cpf, v_saldo_novo
      FROM conta_cud.contas
     WHERE numero = p_conta_numero
       AND status = 'ATIVA';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Conta % não encontrada ou inativa.', p_conta_numero;
    END IF;

    UPDATE conta_cud.contas
       SET saldo = v_saldo_novo
     WHERE numero = p_conta_numero;

    INSERT INTO conta_cud.movimentacoes (
        tipo,
        valor,
        cliente_origem_cpf,
        cliente_destino_cpf,
        conta_origem_numero,
        conta_destino_numero,
        saldo_resultante_destino
    ) VALUES (
        'DEPOSITO',
        p_valor,
        v_cliente_cpf,
        NULL,
        NULL,
        p_conta_numero,
        v_saldo_novo
    ) RETURNING id INTO v_mov_id;

    RETURN v_mov_id;
END;
$$;

CREATE OR REPLACE FUNCTION conta_cud.sp_sacar(
    p_conta_numero CHAR(4),
    p_valor NUMERIC(14,2)
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_cliente_cpf CHAR(11);
    v_saldo_atual NUMERIC(14,2);
    v_limite NUMERIC(14,2);
    v_saldo_novo NUMERIC(14,2);
    v_mov_id UUID;
BEGIN
    IF p_valor IS NULL OR p_valor <= 0 THEN
        RAISE EXCEPTION 'Valor de saque inválido.';
    END IF;

    SELECT cliente_cpf, saldo, limite
      INTO v_cliente_cpf, v_saldo_atual, v_limite
      FROM conta_cud.contas
     WHERE numero = p_conta_numero
       AND status = 'ATIVA';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Conta % não encontrada ou inativa.', p_conta_numero;
    END IF;

    v_saldo_novo := v_saldo_atual - p_valor;

    IF v_saldo_novo < (-1 * v_limite) THEN
        RAISE EXCEPTION 'Saldo insuficiente considerando o limite da conta.';
    END IF;

    UPDATE conta_cud.contas
       SET saldo = v_saldo_novo
     WHERE numero = p_conta_numero;

    INSERT INTO conta_cud.movimentacoes (
        tipo,
        valor,
        cliente_origem_cpf,
        cliente_destino_cpf,
        conta_origem_numero,
        conta_destino_numero,
        saldo_resultante_origem
    ) VALUES (
        'SAQUE',
        p_valor,
        v_cliente_cpf,
        NULL,
        p_conta_numero,
        NULL,
        v_saldo_novo
    ) RETURNING id INTO v_mov_id;

    RETURN v_mov_id;
END;
$$;

CREATE OR REPLACE FUNCTION conta_cud.sp_transferir(
    p_conta_origem CHAR(4),
    p_conta_destino CHAR(4),
    p_valor NUMERIC(14,2)
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_cliente_origem CHAR(11);
    v_cliente_destino CHAR(11);
    v_saldo_origem NUMERIC(14,2);
    v_limite_origem NUMERIC(14,2);
    v_saldo_destino NUMERIC(14,2);
    v_saldo_origem_novo NUMERIC(14,2);
    v_saldo_destino_novo NUMERIC(14,2);
    v_mov_id UUID;
BEGIN
    IF p_valor IS NULL OR p_valor <= 0 THEN
        RAISE EXCEPTION 'Valor de transferência inválido.';
    END IF;

    IF p_conta_origem = p_conta_destino THEN
        RAISE EXCEPTION 'Conta de origem e destino não podem ser iguais.';
    END IF;

    SELECT cliente_cpf, saldo, limite
      INTO v_cliente_origem, v_saldo_origem, v_limite_origem
      FROM conta_cud.contas
     WHERE numero = p_conta_origem
       AND status = 'ATIVA'
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Conta de origem % não encontrada ou inativa.', p_conta_origem;
    END IF;

    SELECT cliente_cpf, saldo
      INTO v_cliente_destino, v_saldo_destino
      FROM conta_cud.contas
     WHERE numero = p_conta_destino
       AND status = 'ATIVA'
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Conta de destino % não encontrada ou inativa.', p_conta_destino;
    END IF;

    v_saldo_origem_novo := v_saldo_origem - p_valor;
    v_saldo_destino_novo := v_saldo_destino + p_valor;

    IF v_saldo_origem_novo < (-1 * v_limite_origem) THEN
        RAISE EXCEPTION 'Saldo insuficiente para transferência considerando o limite.';
    END IF;

    UPDATE conta_cud.contas
       SET saldo = v_saldo_origem_novo
     WHERE numero = p_conta_origem;

    UPDATE conta_cud.contas
       SET saldo = v_saldo_destino_novo
     WHERE numero = p_conta_destino;

    INSERT INTO conta_cud.movimentacoes (
        tipo,
        valor,
        cliente_origem_cpf,
        cliente_destino_cpf,
        conta_origem_numero,
        conta_destino_numero,
        saldo_resultante_origem,
        saldo_resultante_destino
    ) VALUES (
        'TRANSFERENCIA',
        p_valor,
        v_cliente_origem,
        v_cliente_destino,
        p_conta_origem,
        p_conta_destino,
        v_saldo_origem_novo,
        v_saldo_destino_novo
    ) RETURNING id INTO v_mov_id;

    RETURN v_mov_id;
END;
$$;
