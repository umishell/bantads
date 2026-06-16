"""Gera CPF válido (dígitos verificadores) para autocadastro sem colisão frequente."""


def gerar_cpf_valido() -> str:
    import random

    nums = [random.randint(0, 9) for _ in range(9)]
    s1 = sum((10 - i) * nums[i] for i in range(9))
    d1 = 0 if (s1 % 11) < 2 else 11 - (s1 % 11)
    nums.append(d1)
    s2 = sum((11 - i) * nums[i] for i in range(10))
    d2 = 0 if (s2 % 11) < 2 else 11 - (s2 % 11)
    nums.append(d2)
    return "".join(str(x) for x in nums)
