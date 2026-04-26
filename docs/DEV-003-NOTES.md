# DEV-003 - Notas de implementacao

Card: [DEV] - Implementar conclusao de video e calculo de progresso
Branch sugerida: `feat/dev-003-complete-endpoint`
Cobertura: P2 (estudante marca video como concluido) sobre a base DEV-001/DEV-002.

## Decisoes de arquitetura

**Rota estreita.** `POST /roadmaps/:roadmapId/items/:itemId/complete` aceita params, obriga `x-user-id` via `requireAuth`, chama `progressService.markVideoComplete(...)` e logo apos pede `roadmapService.computeProgressSummary(roadmapId, userId)` para devolver o resumo agregado atualizado. Esse pareamento evita um GET extra do cliente.

**Idempotencia preservada.** Toda a logica de "ja concluido nao sobrescreve completedAt" vive no `ProgressService` do DEV-001. A rota e uma fina casca; nao ha estado proprio na camada HTTP.

**`requireAuth` sem auth real.** O plugin de auth continua aceitando `x-user-id` opcional para GETs. Para o POST, o preHandler `requireAuth` lanca `UnauthorizedError` quando `request.userId` for null, traduzido para 401 pelo error handler.

**Status codes intencionais.** 201 na primeira conclusao, 200 nas chamadas idempotentes seguintes. Isso tambem fica visivel no payload via `firstCompletion`.

## DoD - status

| Item | Status | Evidencia |
|---|---|---|
| `POST /roadmaps/:roadmapId/items/:itemId/complete` implementado | OK | `src/http/routes/roadmap.routes.ts` |
| `x-user-id` obrigatorio (401 sem header) | OK | `requireAuth` em `src/http/auth.ts` |
| Idempotencia: `firstCompletion: false` na repeticao, mesmo `completedAt` | OK | Testes em `src/http/http.test.ts` |
| Resposta inclui video + resumo do roadmap | OK | `serializeVideoCompleteResult` |
| Testes cobrem sucesso, repeticao, sem usuario, item inexistente, item-mismatch | OK | 5 novos casos no `http.test.ts` |
| `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run build`, `npm.cmd audit --json` executados | OK | Saidas abaixo |
| Sem secrets/credenciais | OK | Scan encontra apenas placeholders/comentarios |
| README/docs atualizados | OK | `README.md` + este arquivo |

## Comandos executados

```bash
npm install
npm install --save-dev vitest@4.1.5
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd audit --json
```

Resumo do audit:

```text
info: 0 | low: 0 | moderate: 0 | high: 0 | critical: 0
```

## Lacunas conhecidas

1. **XP/streak nao sao concedidos.** Card P4. O `activityDate` ja e preenchido na conclusao, deixando o ledger pronto.

2. **`userId` nao e validado contra a tabela de usuarios.** Como o stub aceita qualquer string, nao verificamos se o usuario existe. Quando o auth real entrar, `request.userId` so existira pos-login.

3. **Sem rate limit / replay protection.** Conclusao repetida e idempotente; ainda assim, vale considerar limite em card de hardening.
