# DEV-002 - Notas de implementacao

Card: [DEV] - Expor APIs de trilhas oficiais e detalhe de roadmap
Branch sugerida: `feat/dev-002-http-api`
Cobertura: P1 (catalogo de trilhas oficiais), P2 (detalhe com progresso opcional).

## Decisoes de arquitetura

**Fastify v5** como camada HTTP. Razoes: TypeScript nativo, schema validation acoplada, e principalmente `app.inject()`, que permite testes de contrato sem subir socket nem mockar HTTP. `fastify-plugin@5` registra o plugin de auth de forma estavel.

**Auth stub.** O card explicita que auth real fica fora deste escopo. O plugin `src/http/auth.ts` le um header opcional `x-user-id` e popula `request.userId`. Sem header, `userId` e `null` e o detalhe responde com `progress: null`. Esse header e contrato temporario, documentado no README e no proprio comentario do plugin.

**Mappers/DTOs.** `src/http/serializers.ts` faz o mapeamento dominio -> HTTP. Datas sempre saem como ISO string. `progress` quando ausente e sempre `null`, nunca omitido, o que simplifica o cliente Mobile/Web.

**Erros centralizados.** `src/http/errors.ts` traduz `DomainError` em status codes. `RoadmapNotFoundError` -> 404, `RoadmapItemMismatchError` -> 400, `DomainError` generico -> 400, qualquer outra excecao -> 500 generico sem stack trace em resposta.

**Wiring.** `src/http/app.ts` recebe os services por injecao. Producao (`src/server.ts`) usa Prisma; testes (`src/http/http.test.ts`) usam `buildTestWorld()` em memoria. O contrato e o mesmo, garantindo paridade.

## DoD - status

| Item | Status | Evidencia |
|---|---|---|
| `GET /health`, `GET /roadmaps/official`, `GET /roadmaps/:id` implementados | OK | `src/http/routes/roadmap.routes.ts`, `src/http/app.ts` |
| `x-user-id` opcional + `progress: null` quando anonimo | OK | `src/http/auth.ts`, teste "retorna detalhe sem progresso quando anonimo" |
| 404 para roadmap inexistente | OK | `src/http/errors.ts` + teste "retorna 404 quando roadmap nao existe" |
| Testes de API cobrem fluxo principal e erro relevante | OK | 6 testes em `src/http/http.test.ts` |
| `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd audit --json` executados e documentados | OK | Saida abaixo |
| Sem secrets/credenciais | OK | Scan encontra apenas placeholders/comentarios em `.env.example` e docs |
| README/docs atualizados | OK | `README.md` + este arquivo |

## Comandos executados

```bash
npm install
npm install --save-dev vitest@4.1.5
npm.cmd run typecheck
npm.cmd test
npm.cmd audit --json
```

Saida do audit (resumo):

```text
info: 0 | low: 0 | moderate: 0 | high: 0 | critical: 0
```

## Lacunas conhecidas

1. **`x-user-id` e contrato temporario.** Real auth (sessao/JWT) entra em card proprio. O plugin `stub-auth` foi escrito para que possa ser substituido sem mudar o resto da app; `request.userId` e o ponto de extensao.

2. **Sem rate limiting / CORS.** Adicionar antes de expor publicamente; fica para card de hardening.

3. **Spec OpenAPI / contrato formal** nao foi gerado. Pode ser feito automaticamente via `@fastify/swagger` em outro card; aqui o resumo no README + tipos TS de `serializers.ts` servem como contrato implicito.
