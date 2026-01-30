---
description: Corre a suite completa de testes de segurança do checkout (Zod, Honeypot, URL Tampering)
---

Executa todos os testes de segurança automáticos para validar a integridade do fluxo de reserva.

1.  **Execução**:
    // turbo
    *   Executar o comando: `npx tsx scripts/test-security.ts`

2.  **Verificações Incluídas**:
    *   **Test 1**: Reserva Válida (Baseline)
    *   **Test 2**: Proteção Honeypot (Bloqueio de Bots)
    *   **Test 3**: Capacidade da Propriedade (Prevenção de over-booking via URL)
    *   **Test 4**: Existência da Propriedade (Prevenção de slugs falsos)
    *   **Test 5**: Integridade de Datas (Check-out após Check-in)
    *   **Test 6**: Validação Temporal (Impedir datas no passado)
    *   **Test 7-9**: Validação Zod (Email, Nome, Telefone)

3.  **Resultado Esperado**:
    *   Todos os testes exceto o Teste 1 devem ser bloqueados pelo servidor com os erros correspondentes.
    *   Apresentar o log de execução e confirmar que as 9 defesas estão operacionais.
