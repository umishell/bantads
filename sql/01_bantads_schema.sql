-- =========================================================
-- BANTADS - 01_bantads_schema.sql
-- Ordem de execução sugerida:
--   1) 01_bantads_schema.sql
--   2) 02_bantads_logic_triggers.sql
--   3) 03_bantads_mock_data.sql
--
-- Observação: este arquivo cobre a parte relacional em PostgreSQL.
-- O serviço de autenticação fica fora daqui (MongoDB).
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP SCHEMA IF EXISTS conta_read CASCADE;
DROP SCHEMA IF EXISTS conta_cud CASCADE;
DROP SCHEMA IF EXISTS gerente CASCADE;
DROP SCHEMA IF EXISTS cliente CASCADE;

DROP TYPE IF EXISTS public.status_cliente CASCADE;
DROP TYPE IF EXISTS public.tipo_usuario_interno CASCADE;
DROP TYPE IF EXISTS public.status_conta CASCADE;
DROP TYPE IF EXISTS public.tipo_movimentacao CASCADE;
DROP TYPE IF EXISTS public.natureza_lancamento CASCADE;

CREATE SCHEMA cliente;
CREATE SCHEMA gerente;
CREATE SCHEMA conta_cud;
CREATE SCHEMA conta_read;

CREATE TYPE public.status_cliente AS ENUM (
    'PENDENTE',
    'APROVADO',
    'REJEITADO'
);

CREATE TYPE public.tipo_usuario_interno AS ENUM (
    'GERENTE',
    'ADMINISTRADOR'
);

CREATE TYPE public.status_conta AS ENUM (
    'ATIVA',
    'ENCERRADA'
);

CREATE TYPE public.tipo_movimentacao AS ENUM (
    'DEPOSITO',
    'SAQUE',
    'TRANSFERENCIA'
);

CREATE TYPE public.natureza_lancamento AS ENUM (
    'ENTRADA',
    'SAIDA'
);

-- =========================================================
-- SCHEMA CLIENTE
-- =========================================================

CREATE TABLE cliente.enderecos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    logradouro VARCHAR(150) NOT NULL,
    numero VARCHAR(20) NOT NULL,
    complemento VARCHAR(80),
    cep CHAR(8) NOT NULL,
    cidade VARCHAR(80) NOT NULL,
    estado CHAR(2) NOT NULL,

    CONSTRAINT ck_endereco_cep_8 CHECK (cep ~ '^[0-9]{8}$'),
    CONSTRAINT ck_endereco_estado_2 CHECK (estado ~ '^[A-Z]{2}$')
);

CREATE TABLE cliente.clientes (
    cpf CHAR(11) PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,
    telefone VARCHAR(20) NOT NULL,
    salario NUMERIC(14,2) NOT NULL,
    endereco_id BIGINT NOT NULL UNIQUE,
    status public.status_cliente NOT NULL DEFAULT 'PENDENTE',
    gerente_responsavel_cpf CHAR(11),
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    analisado_em TIMESTAMP,
    motivo_rejeicao VARCHAR(255),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_cliente_cpf_11 CHECK (cpf ~ '^[0-9]{11}$'),
    CONSTRAINT ck_cliente_salario_nao_negativo CHECK (salario >= 0),
    CONSTRAINT fk_cliente_endereco
        FOREIGN KEY (endereco_id)
        REFERENCES cliente.enderecos(id)
);

CREATE INDEX idx_cliente_nome ON cliente.clientes(nome);
CREATE INDEX idx_cliente_status ON cliente.clientes(status);
CREATE INDEX idx_cliente_gerente_resp ON cliente.clientes(gerente_responsavel_cpf);

-- =========================================================
-- SCHEMA GERENTE
-- =========================================================

CREATE TABLE gerente.usuarios_internos (
    cpf CHAR(11) PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,
    telefone VARCHAR(20) NOT NULL,
    tipo public.tipo_usuario_interno NOT NULL DEFAULT 'GERENTE',
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_usuario_interno_cpf_11 CHECK (cpf ~ '^[0-9]{11}$')
);

CREATE INDEX idx_gerente_nome ON gerente.usuarios_internos(nome);
CREATE INDEX idx_gerente_tipo ON gerente.usuarios_internos(tipo);
CREATE INDEX idx_gerente_ativo ON gerente.usuarios_internos(ativo);

-- =========================================================
-- SCHEMA CONTA_CUD
-- =========================================================

CREATE TABLE conta_cud.contas (
    numero CHAR(4) PRIMARY KEY,
    cliente_cpf CHAR(11) NOT NULL UNIQUE,
    gerente_cpf CHAR(11) NOT NULL,
    saldo NUMERIC(14,2) NOT NULL DEFAULT 0,
    limite NUMERIC(14,2) NOT NULL DEFAULT 0,
    status public.status_conta NOT NULL DEFAULT 'ATIVA',
    data_criacao TIMESTAMP NOT NULL,
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_conta_numero_4 CHECK (numero ~ '^[0-9]{4}$'),
    CONSTRAINT ck_conta_limite_nao_negativo CHECK (limite >= 0),
    CONSTRAINT ck_conta_saldo_dentro_do_limite CHECK (saldo >= (-1 * limite))
);

CREATE INDEX idx_conta_cliente ON conta_cud.contas(cliente_cpf);
CREATE INDEX idx_conta_gerente ON conta_cud.contas(gerente_cpf);
CREATE INDEX idx_conta_status ON conta_cud.contas(status);
CREATE INDEX idx_conta_data_criacao ON conta_cud.contas(data_criacao);

CREATE TABLE conta_cud.movimentacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_hora TIMESTAMP NOT NULL DEFAULT NOW(),
    tipo public.tipo_movimentacao NOT NULL,
    valor NUMERIC(14,2) NOT NULL,

    -- Seguem a apresentação do enunciado / mock
    cliente_origem_cpf CHAR(11),
    cliente_destino_cpf CHAR(11),

    -- Apoio técnico para identificar as contas
    conta_origem_numero CHAR(4),
    conta_destino_numero CHAR(4),

    saldo_resultante_origem NUMERIC(14,2),
    saldo_resultante_destino NUMERIC(14,2),

    CONSTRAINT ck_mov_valor_positivo CHECK (valor > 0),
    CONSTRAINT ck_mov_tipo_campos CHECK (
        (tipo = 'DEPOSITO'
            AND cliente_origem_cpf IS NOT NULL
            AND cliente_destino_cpf IS NULL
            AND conta_origem_numero IS NULL
            AND conta_destino_numero IS NOT NULL)
        OR
        (tipo = 'SAQUE'
            AND cliente_origem_cpf IS NOT NULL
            AND cliente_destino_cpf IS NULL
            AND conta_origem_numero IS NOT NULL
            AND conta_destino_numero IS NULL)
        OR
        (tipo = 'TRANSFERENCIA'
            AND cliente_origem_cpf IS NOT NULL
            AND cliente_destino_cpf IS NOT NULL
            AND conta_origem_numero IS NOT NULL
            AND conta_destino_numero IS NOT NULL
            AND conta_origem_numero <> conta_destino_numero)
    )
);

CREATE INDEX idx_mov_data_hora ON conta_cud.movimentacoes(data_hora);
CREATE INDEX idx_mov_tipo ON conta_cud.movimentacoes(tipo);
CREATE INDEX idx_mov_conta_origem ON conta_cud.movimentacoes(conta_origem_numero);
CREATE INDEX idx_mov_conta_destino ON conta_cud.movimentacoes(conta_destino_numero);
CREATE INDEX idx_mov_cliente_origem ON conta_cud.movimentacoes(cliente_origem_cpf);
CREATE INDEX idx_mov_cliente_destino ON conta_cud.movimentacoes(cliente_destino_cpf);

CREATE TABLE conta_cud.log_operacoes (
    log_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    movimentacao_id UUID,
    operacao_bd VARCHAR(10) NOT NULL,
    tipo public.tipo_movimentacao,
    conta_origem_numero CHAR(4),
    conta_destino_numero CHAR(4),
    valor NUMERIC(14,2),
    executado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    payload JSONB
);

CREATE INDEX idx_log_operacoes_movimentacao ON conta_cud.log_operacoes(movimentacao_id);
CREATE INDEX idx_log_operacoes_data ON conta_cud.log_operacoes(executado_em);

-- =========================================================
-- SCHEMA CONTA_READ
-- =========================================================

CREATE TABLE conta_read.lancamentos_extrato (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    movimentacao_id UUID NOT NULL,
    conta_numero CHAR(4) NOT NULL,
    cliente_cpf CHAR(11) NOT NULL,
    cliente_nome VARCHAR(120) NOT NULL,
    data_hora TIMESTAMP NOT NULL,
    tipo public.tipo_movimentacao NOT NULL,
    natureza public.natureza_lancamento NOT NULL,
    valor NUMERIC(14,2) NOT NULL,
    saldo_apos NUMERIC(14,2) NOT NULL,
    conta_contraparte_numero CHAR(4),
    cliente_contraparte_cpf CHAR(11),
    cliente_contraparte_nome VARCHAR(120),

    CONSTRAINT uq_lancamento_extrato UNIQUE (movimentacao_id, conta_numero)
);

CREATE INDEX idx_extrato_conta_data ON conta_read.lancamentos_extrato(conta_numero, data_hora);
CREATE INDEX idx_extrato_cliente_data ON conta_read.lancamentos_extrato(cliente_cpf, data_hora);

CREATE TABLE conta_read.saldos_diarios (
    conta_numero CHAR(4) NOT NULL,
    data_referencia DATE NOT NULL,
    saldo_fechamento NUMERIC(14,2) NOT NULL,
    PRIMARY KEY (conta_numero, data_referencia),

    CONSTRAINT ck_saldos_diarios_numero_4 CHECK (conta_numero ~ '^[0-9]{4}$')
);

CREATE INDEX idx_saldos_diarios_data ON conta_read.saldos_diarios(data_referencia);
