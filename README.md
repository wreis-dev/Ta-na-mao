# Ta na mao

Plataforma de educacao com trilhas de YouTube, focada em ENEM. Backend Node + TypeScript ESM, com camada de dominio, Prisma + PostgreSQL e API HTTP em Fastify.

## Stack

- Node 20+, TypeScript ESM
- Prisma ORM com PostgreSQL
- Fastify v5
- Vitest
- OAuth 1.0 HMAC-SHA1 sobre `node:crypto` (integracoes externas como Trello)

## Setup

```bash
npm install
cp .env.example .env   # preencha DATABASE_URL local
npm run db:generate    # gera @prisma/client
npm run db:migrate     # aplica migration inicial em ambiente local
npm run db:seed        # popula trilha oficial ENEM de exemplo
npm run dev            # sobe a API em :3000 com hot reload
```

## Comandos

| Script | O que faz |
|---|---|
| `npm test` | Roda Vitest (services em memoria + contrato Fastify + OAuth 1.0). |
| `npm run typecheck` | TypeScript strict, sem emitir. |
| `npm run build` | Compila para `dist/`. |
| `npm run dev` | Sobe API em watch mode (tsx). |
| `npm start` | Sobe API a partir de `dist/`. |
| `npm run db:migrate` | Aplica migrations Prisma em DB local. |
| `npm run db:seed` | Cria trilha oficial ENEM de exemplo. |
| `npm run db:reset` | Drop + migrate + seed (uso local). |
| `npm audit` | Inventario de vulnerabilidades de dependencias. |

## Endpoints HTTP

`GET /health` - health check.

```http
GET /health
200 { "status": "ok" }
```

`GET /roadmaps/official` - lista trilhas oficiais publicadas.

```http
GET /roadmaps/official
200 {
  "data": [
    { "id": "...", "slug": "enem-trilha-oficial", "title": "ENEM - Trilha Oficial",
      "source": "OFFICIAL", "visibility": "PUBLIC", "publishedAt": "..." }
  ]
}
```

`GET /roadmaps/:id` - detalhe da trilha. Aceita header opcional `x-user-id` para anexar progresso.

```http
GET /roadmaps/<id>
# Sem usuario:
200 { "data": { ..., "progress": null, "topics": [{ "items": [{ "progress": null, ... }] }] } }

# Com header x-user-id:
GET /roadmaps/<id>
x-user-id: <userId>
200 { "data": { ..., "progress": { "totalItems": 2, "completedItems": 1, "percentComplete": 50, ... },
                "topics": [{ "items": [{ "progress": { "completedAt": "..." }, ... }] }] } }

# Inexistente:
404 { "error": { "code": "ROADMAP_NOT_FOUND", "message": "Roadmap <id> not found" } }
```

`POST /roadmaps/:roadmapId/items/:itemId/complete` - marca video como concluido. Requer `x-user-id`. Idempotente.

```http
POST /roadmaps/<roadmapId>/items/<itemId>/complete
x-user-id: <userId>

# Primeira conclusao -> 201
{ "data": { "videoProgress": { "completedAt": "...", "activityDate": "..." },
            "firstCompletion": true,
            "roadmapProgress": { "totalItems": 2, "completedItems": 1, "percentComplete": 50, ... } } }

# Repeticao idempotente -> 200, completedAt inalterado
{ "data": { ..., "firstCompletion": false } }

# Sem header:
401 { "error": { "code": "UNAUTHORIZED", ... } }

# Item inexistente:
404 { "error": { "code": "ROADMAP_ITEM_NOT_FOUND", ... } }

# Item nao pertence ao roadmap:
400 { "error": { "code": "ROADMAP_ITEM_MISMATCH", ... } }
```

> `x-user-id` e contrato **temporario**. Auth real (sessao/JWT) sera plugada em card seguinte; `request.userId` e o ponto de extensao.

## Integracoes externas (OAuth 1.0)

DEV-002A entrega um modulo isolado para assinar requisicoes OAuth 1.0 HMAC-SHA1 (RFC 5849). Foco inicial: Trello.

```ts
import { loadTrelloConfigOrThrow } from "./integrations/trello/config.js";
import { buildTrelloRequest } from "./integrations/trello/client.js";

const creds = loadTrelloConfigOrThrow();              // valida envs
const req = buildTrelloRequest(creds, {
  method: "GET",
  path: "/members/me/boards",
});
// req = { method, url, headers: { Authorization: "OAuth ..." }, signed }
const res = await fetch(req.url, { method: req.method, headers: req.headers });
```

> **Nao usar OAuth 1.0 com YouTube.** YouTube Data API usa API key (publico) ou OAuth 2.0 (privado).
> Detalhes em `docs/DEV-002A-NOTES.md`.

## Estrutura

```
src/
  domain/                 # tipos, services e contratos de repositorio
  infra/prisma/           # client e adapters Prisma
  http/                   # app, rotas, serializers, error handler, auth stub
  integrations/
    oauth1/               # algoritmo OAuth 1.0 HMAC-SHA1 puro
    trello/               # adapter + config validator (sem rede)
  server.ts               # entrypoint do listen
prisma/
  schema.prisma           # entidades base
  migrations/             # migration inicial versionada
  seed.ts                 # trilha oficial ENEM minima
docs/
  DEV-001-NOTES.md
  DEV-002-NOTES.md
  DEV-002A-NOTES.md
  DEV-003-NOTES.md
```

## Seguranca

- Sem secrets/tokens/keys no repositorio.
- `.env` no `.gitignore`. Use `.env.example` como referencia.
- Credenciais Trello validadas em runtime sem nunca aparecerem em logs ou respostas de erro.
- YouTube fica fora do OAuth 1.0 propositalmente.

## Status

DEV-001, DEV-002, DEV-002A e DEV-003 entregues. Proximo: DEV-004 (UI Mobile/Web).
