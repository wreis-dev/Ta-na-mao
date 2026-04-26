# DEV-002A - Notas de implementacao

Card: [DEV] - Configurar autorizacao OAuth 1.0 para integracoes compativeis
Branch sugerida: `feat/dev-002a-oauth1-trello`
Cobertura: requisito transversal de OAuth 1.0 para integracoes externas. Nao toca roadmaps/progresso.

## Decisoes de arquitetura

**Implementacao sobre `node:crypto`.** Sem dependencia externa nova. A spec OAuth 1.0 (RFC 5849) e pequena: percent-encoding RFC 3986, base string ordenada, HMAC-SHA1 e header builder.

**Modulo isolado.** Tudo vive em `src/integrations/oauth1/` (algoritmo puro) e `src/integrations/trello/` (config + adapter). Nada toca os fluxos de dominio nem a camada HTTP.

**Sem chamadas de rede.** O adapter `buildTrelloRequest` retorna `{ method, url, headers, signed }`; quem consome decide se passa para `fetch`.

**Determinismo nos testes.** `signRequest` aceita `nonce` e `timestamp` opcionais. Em producao, `randomBytes` + `Date.now()` cuidam disso. Em testes, fixamos os valores para validar assinatura byte-a-byte.

**Config segura.** `loadTrelloConfig` retorna `{ ok: true, credentials } | { ok: false, missing }`. A resposta de erro contem apenas nomes de envs faltantes, nunca valores parciais.

## Por que nao usar OAuth 1.0 com YouTube

A YouTube Data API nao suporta OAuth 1.0. Para metadados publicos, use API key (`YOUTUBE_API_KEY`). Para dados privados do usuario, use OAuth 2.0 em card proprio. O `.env.example` reforca essa separacao.

## DoD - status

| Item | Status | Evidencia |
|---|---|---|
| Modulo OAuth 1.0 HMAC-SHA1 implementado e isolado | OK | `src/integrations/oauth1/*` |
| Header `Authorization` deterministico em testes | OK | `oauth1.test.ts` |
| Credenciais Trello apenas via env, sem valores reais | OK | `loadTrelloConfig` + `.env.example` |
| Testes cobrem percent-encoding, base string, signature e header | OK | 16 testes em `oauth1.test.ts` |
| Adapter Trello monta requisicao assinada sem rede | OK | `buildTrelloRequest` + 6 testes em `trello.test.ts` |
| Documentacao diferencia Trello OAuth 1.0 de YouTube OAuth 2.0/API key | OK | README, `.env.example`, este arquivo |
| `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run build`, `npm.cmd audit --json` executados | OK | Saidas abaixo |
| Sem secrets/credenciais adicionados | OK | Scan dedicado nao encontrou tokens/chaves reais |

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
PASS src/integrations/oauth1/oauth1.test.ts (16 tests)
PASS src/integrations/trello/trello.test.ts (6 tests)
PASS src/http/http.test.ts (11 tests)
PASS src/domain/roadmap.service.test.ts (7 tests)
PASS src/domain/progress.service.test.ts (5 tests)
Test Files 5 passed (5)
Tests 45 passed (45)
```

Resumo do audit:

```text
info: 0 | low: 0 | moderate: 0 | high: 0 | critical: 0
```

## Lacunas conhecidas

1. **Sem fluxo completo de obtencao de token.** O modulo cobre assinatura com credenciais ja emitidas. O fluxo `request token -> authorize -> access token` exige UI/redirect e fica para card proprio.

2. **Sem retry/backoff/timeout.** O adapter so monta a requisicao; politica HTTP fica no consumidor.

3. **PLAINTEXT e RSA-SHA1 nao implementados.** Apenas HMAC-SHA1, suficiente para Trello.

## Como integrar

```ts
import { loadTrelloConfigOrThrow } from "./integrations/trello/config.js";
import { buildTrelloRequest } from "./integrations/trello/client.js";

const creds = loadTrelloConfigOrThrow();
const req = buildTrelloRequest(creds, {
  method: "GET",
  path: "/members/me/boards",
});

const res = await fetch(req.url, { method: req.method, headers: req.headers });
```
