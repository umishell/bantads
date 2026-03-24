-- =========================================================
-- BANTADS - 03_bantads_mock_data.sql
-- Dados mock alinhados com o enunciado discutido.
-- Execute depois de:
--   1) 01_bantads_schema.sql
--   2) 02_bantads_logic_triggers.sql
-- =========================================================

-- =========================================================
-- GERENTES / ADMINISTRADOR
-- =========================================================

INSERT INTO gerente.usuarios_internos (
    cpf, nome, email, telefone, tipo, ativo, criado_em, atualizado_em
) VALUES
    ('98574307084', 'Geniéve',    'ger1@bantads.com.br', '(41) 99991-0001', 'GERENTE',       TRUE, NOW(), NOW()),
    ('64065268052', 'Godophredo', 'ger2@bantads.com.br', '(41) 99991-0002', 'GERENTE',       TRUE, NOW(), NOW()),
    ('23862179060', 'Gyândula',   'ger3@bantads.com.br', '(41) 99991-0003', 'GERENTE',       TRUE, NOW(), NOW()),
    ('40501740066', 'Adamântio',  'adm1@bantads.com.br', '(41) 99991-0004', 'ADMINISTRADOR', TRUE, NOW(), NOW());

-- =========================================================
-- ENDEREÇOS (o enunciado permite escolher)
-- =========================================================

INSERT INTO cliente.enderecos (
    logradouro, numero, complemento, cep, cidade, estado
) VALUES
    ('Rua das Araucárias', '101', 'Apto 11', '80000001', 'Curitiba', 'PR'),
    ('Avenida do Bosque',  '202', 'Casa',    '80000002', 'Curitiba', 'PR'),
    ('Rua das Flores',     '303', NULL,      '80000003', 'Curitiba', 'PR'),
    ('Travessa do Sol',    '404', 'Fundos',  '80000004', 'Curitiba', 'PR'),
    ('Alameda da Serra',   '505', 'Bloco B', '80000005', 'Curitiba', 'PR');

-- =========================================================
-- CLIENTES
-- =========================================================

INSERT INTO cliente.clientes (
    cpf, nome, email, telefone, salario, endereco_id, status,
    gerente_responsavel_cpf, criado_em, analisado_em, motivo_rejeicao, atualizado_em
) VALUES
    ('12912861012', 'Catharyna',  'cli1@bantads.com.br', '(41) 99999-1001', 10000.00, 1, 'APROVADO', '98574307084', '2000-01-01 00:00:00', '2000-01-01 00:00:00', NULL, NOW()),
    ('09506382000', 'Cleuddônio', 'cli2@bantads.com.br', '(41) 99999-1002', 20000.00, 2, 'APROVADO', '64065268052', '1990-10-10 00:00:00', '1990-10-10 00:00:00', NULL, NOW()),
    ('85733854057', 'Catianna',   'cli3@bantads.com.br', '(41) 99999-1003',  3000.00, 3, 'APROVADO', '23862179060', '2012-12-12 00:00:00', '2012-12-12 00:00:00', NULL, NOW()),
    ('58872160006', 'Cutardo',    'cli4@bantads.com.br', '(41) 99999-1004',   500.00, 4, 'APROVADO', '98574307084', '2022-02-22 00:00:00', '2022-02-22 00:00:00', NULL, NOW()),
    ('76179646090', 'Coândrya',   'cli5@bantads.com.br', '(41) 99999-1005',  1500.00, 5, 'APROVADO', '64065268052', '2025-01-01 00:00:00', '2025-01-01 00:00:00', NULL, NOW());

-- =========================================================
-- CONTAS
-- =========================================================

INSERT INTO conta_cud.contas (
    numero, cliente_cpf, gerente_cpf, saldo, limite, status, data_criacao, atualizado_em
) VALUES
    ('1291', '12912861012', '98574307084',    800.00,  5000.00, 'ATIVA', '2000-01-01 00:00:00', NOW()),
    ('0950', '09506382000', '64065268052', -10000.00, 10000.00, 'ATIVA', '1990-10-10 00:00:00', NOW()),
    ('8573', '85733854057', '23862179060',  -1000.00,  1500.00, 'ATIVA', '2012-12-12 00:00:00', NOW()),
    ('5887', '58872160006', '98574307084', 150000.00,     0.00, 'ATIVA', '2022-02-22 00:00:00', NOW()),
    ('7617', '76179646090', '64065268052',   1500.00,     0.00, 'ATIVA', '2025-01-01 00:00:00', NOW());

-- =========================================================
-- MOVIMENTAÇÕES
-- =========================================================

INSERT INTO conta_cud.movimentacoes (
    id, data_hora, tipo, valor,
    cliente_origem_cpf, cliente_destino_cpf,
    conta_origem_numero, conta_destino_numero,
    saldo_resultante_origem, saldo_resultante_destino
) VALUES
    ('11111111-1111-1111-1111-111111111111', '2020-01-01 10:00:00', 'DEPOSITO',      1000.00, '12912861012', NULL, NULL,   '1291', NULL, NULL),
    ('11111111-1111-1111-1111-111111111112', '2020-01-01 11:00:00', 'DEPOSITO',       900.00, '12912861012', NULL, NULL,   '1291', NULL, NULL),
    ('11111111-1111-1111-1111-111111111113', '2020-01-01 12:00:00', 'SAQUE',          550.00, '12912861012', NULL, '1291', NULL,   NULL, NULL),
    ('11111111-1111-1111-1111-111111111114', '2020-01-01 13:00:00', 'SAQUE',          350.00, '12912861012', NULL, '1291', NULL,   NULL, NULL),
    ('11111111-1111-1111-1111-111111111115', '2020-01-10 15:00:00', 'DEPOSITO',      2000.00, '12912861012', NULL, NULL,   '1291', NULL, NULL),
    ('11111111-1111-1111-1111-111111111116', '2020-01-15 08:00:00', 'SAQUE',          500.00, '12912861012', NULL, '1291', NULL,   NULL, NULL),
    ('11111111-1111-1111-1111-111111111117', '2020-01-20 12:00:00', 'TRANSFERENCIA', 1700.00, '12912861012', '09506382000', '1291', '0950', NULL, NULL),
    ('11111111-1111-1111-1111-111111111118', '2025-01-01 12:00:00', 'DEPOSITO',      1000.00, '09506382000', NULL, NULL,   '0950', NULL, NULL),
    ('11111111-1111-1111-1111-111111111119', '2025-01-02 10:00:00', 'DEPOSITO',      5000.00, '09506382000', NULL, NULL,   '0950', NULL, NULL),
    ('11111111-1111-1111-1111-111111111120', '2025-01-10 10:00:00', 'SAQUE',          200.00, '09506382000', NULL, '0950', NULL,   NULL, NULL),
    ('11111111-1111-1111-1111-111111111121', '2025-02-05 10:00:00', 'DEPOSITO',      7000.00, '09506382000', NULL, NULL,   '0950', NULL, NULL),
    ('11111111-1111-1111-1111-111111111122', '2025-05-05 10:00:00', 'DEPOSITO',      1000.00, '85733854057', NULL, NULL,   '8573', NULL, NULL),
    ('11111111-1111-1111-1111-111111111123', '2025-05-06 10:00:00', 'SAQUE',         2000.00, '85733854057', NULL, '8573', NULL,   NULL, NULL),
    ('11111111-1111-1111-1111-111111111124', '2025-06-01 10:00:00', 'DEPOSITO',    150000.00, '58872160006', NULL, NULL,   '5887', NULL, NULL),
    ('11111111-1111-1111-1111-111111111125', '2025-07-01 10:00:00', 'DEPOSITO',      1500.00, '76179646090', NULL, NULL,   '7617', NULL, NULL);

-- Garante que o read model ficará coerente com a carga inicial.
SELECT conta_read.rebuild_from_cud();
