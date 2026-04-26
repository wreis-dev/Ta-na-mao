# DEV-003 - Notas de implementacao

Card: [DEV] - Implementar conclusao de video e calculo de progresso
Branch sugerida: `feat/dev-003-complete-endpoint`
Cobertura: P2 (estudante marca video como concluido) sobre a base DEV-001/DEV-002.

## Decisoes de arquitetura

**Rota estreita.** `POST /roadmaps/:roadmapId/items/:itemId/complete` aceita params, obriga `x-user-id` via `requireAuth`, chama `progressService.markVideoComplete(...)` e logo apos pede `roadmapService.computeProgressSummary(roadmapId, userId)` para devolver o resumo agregado atualizado. Esse pareamento evita um GET extra do cliente.

**Idempotencia preservada.** Toda a logica de "ja concluido nao sobrescreve completedAt" vive no `ProgressService` do DEV-001. A rota e uma fina casca; nao ha estado proprio na camada HTTP.

**`requireAuth` sem auth real.** O plugin de auth continua aceitando `x-user-id` opcional para GETs. Para o POST, o preHandler `requireAuth` lanca `UnauthorizedError` quando `request.userId` for null, traduzido para 401 pelo error handler. Quando substituirmos por sessao real, `request.userId` permanece o ponto de extensao.

**Status codes intencionais.** 201 na primeira conclusao (cria recurso), 200 nas chamadas idempotentes seguintes (recurso pre-existente). Isso tambem fica visivel no payload via `firstCompletion`.

**DTO dedicado.** `serializeVideoCompleteResult` produz `{ videoProgress, firstCompletion, roadmapProgress }`. Datas em ISO; `null` quando nao houver. Mantem o contrato estavel mesmo se o dominio mudar.

## DoD - status

| Item | Status | Evidencia |
|---|---|---|
| `POST /roadmaps/:roadmapId/items/:itemId/complete` implementado | OK | `src/http/routes/roadmap.routes.ts` |
| `x-user-id` obrigatorio (401 sem header) | OK | `requireAuth` em `src/http/auth.ts` + teste "retorna 401 quando x-user-id ausente" |
| Idempotencia: `firstCompletion: false` na repeticao, mesmo `completedAt` | OK | Teste "e idempotente: segunda chamada..." |
| Resposta inclui video + resumo do roadmap | OK | `serializeVideoCompleteResult` + assertion em `roadmapProgress` |
| Testes cobrem sucesso, repeticao, sem usuario, item inexistente, item-mismatch | OK | 5 novos casos no `http.test.ts`; total no projeto: 23 |
| `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run build`, `npm.cmd audit --json` executados | OK | Saidas abaixo |
| Sem secrets/credenciais | OK | Scan encontra apenas placeholders/comentarios em `.env.example` e docs |
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

Saida dos testes:

```text
PASS src/http/http.test.ts (11 tests)
PASS src/domain/roadmap.service.test.ts (7 tests)
PASS src/domain/progress.service.test.ts (5 tests)
Test Files 3 passed (3)
Tests 23 passed (23)
```

Resumo do audit:

```text
info: 0 | low: 0 | moderate: 0 | high: 0 | critical: 0
```

## Lacunas conhecidas

1. **XP/streak nao sao concedidos.** Card P4. O `activityDate` ja e preenchido na conclusao, deixando o ledger pronto.

2. **`userId` nao e validado contra a tabela de usuarios.** Como o stub aceita qualquer string, nao verificamos se o usuario existe. Quando o auth real entrar, `request.userId` so existira pos-login.

3. **Sem rate limit / replay protection.** Conclusao repetida e idempotente, entao chamadas repetidas nao aumentam progresso. Ainda assim, vale considerar limite em card de hardening.

4. **Nao ha endpoint para desfazer conclusao.** Fora do escopo; a regra de negocio do MVP nao preve undo.

## Contrato HTTP

Request:

```http
POST /roadmaps/:roadmapId/items/:itemId/complete
x-user-id: <userId>
```

Resposta de sucesso (201 na primeira, 200 idempotente):

```json
{
  "data": {
    "videoProgress": {
      "completedAt": "2026-04-26T18:42:00.000Z",
      "activityDate": "2026-04-26T00:00:00.000Z"
    },
    "firstCompletion": true,
    "roadmapProgress": {
      "totalItems": 2,
      "completedItems": 1,
      "percentComplete": 50,
      "startedAt": "2026-04-26T18:42:00.000Z",
      "lastActivityAt": "2026-04-26T18:42:00.000Z",
      "completedAt": null
    }
  }
}
```

Erros:
- 401 `{ error: { code: "UNAUTHORIZED", message: "..." } }`
- 404 `{ error: { code: "ROADMAP_ITEM_NOT_FOUND", ... } }`
- 400 `{ error: { code: "ROADMAP_ITEM_MISMATCH", ... } }`
- 500 `{ error: { code: "INTERNAL_ERROR", message: "Internal server error" } }`
