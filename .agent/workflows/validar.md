---
description: Valida o código atual (Lint, Typescript, Segurança e Convenções)
---

Executa uma verificação completa de Garantia de Qualidade (QA) no ficheiro aberto ou no componente especificado pelo utilizador.

1.  **Contexto**: Identificar o ficheiro ativo ou componente alvo.

2.  **Passo 1: Validação de Código e Typescript**
    *   Verificar se existem tipos `any` explícitos ou implícitos.
    *   Verificar se há imports declarados mas não utilizados.
    *   Verificar a correta tipagem de props em componentes React.

3.  **Passo 2: Verificação de Segurança**
    *   Procurar por utilização de `dangerouslySetInnerHTML`. Se encontrado, verificar se é justificado e seguro.
    *   Verificar se tags `<a>` com `target="_blank"` possuem `rel="noopener noreferrer"`.
    *   Verificar sanitização básica de inputs se houver formulários.

4.  **Passo 3: Melhores Práticas Next.js & React**
    *   Verificar se imagens usam o componente `<Image />` do Next.js em vez de `<img>`.
    *   Verificar se links internos usam `<Link>` do Next.js.
    *   Verificar dependências de `useEffect` (se parecem corretas/completas).

5.  **Passo 4: Styling (Tailwind CSS)**
    *   Verificar se existem estilos inline (`style=...`) que poderiam ser classes do Tailwind.
    *   Verificar consistência de espaçamentos ou cores (ex: usar variáveis do tema se possível).

6.  **Relatório Final**:
    Apresentar um resumo em Markdown:
    *   ✅ **Passou**: Listar verificações bem sucedidas.
    *   ⚠️ **Avisos**: Listar pontos de atenção que não são erros críticos.
    *   ❌ **Erros**: Listar problemas que requerem correção imediata.
    *   **Sugestão de Correção**: Apresentar código corrigido se aplicável.
