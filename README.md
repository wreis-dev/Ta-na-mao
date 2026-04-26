# Ta na mao

Plataforma de educacao com trilhas de YouTube, focada em ENEM. Backend Node + TypeScript ESM, com camada de dominio, Prisma + PostgreSQL e API HTTP em Fastify.

## Stack

- Node 20+, TypeScript ESM
- Prisma ORM com PostgreSQL
- Fastify v5
- Vitest

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
| `npm test` | Roda Vitest (services em memoria + contrato Fastify, sem banco). |
| `npm run typecheck` | TypeScript strict, sem emitir. |
| `npm run build` | Compila para `dist/`. |
| `npm run dev` | Sobe API em watch mode (tsx). |
| `npm start` | Sobe API a partir de `dist/`. |
| `npm run db:migrate` | Aplica migrations Prisma em DB local. |
| `npm run db:seed` | Cria trilha oficial ENEM de exemplo. |
| `npm run db:reset` | Drop + migrate + seed (uso local). |

## Endpoints HTTP

`GET /health` — health check.

```http
GET /health
200 { "status": "ok" }
```

`GET /roadmaps/official` — lista trilhas oficiais publicadas.

```http
GET /roadmaps/official
200 {
  "data": [
    { "id": "...", "slug": "enem-trilha-oficial", "title": "ENEM - Trilha Oficial",
      "source": "OFFICIAL", "visibility": "PUBLIC", "publishedAt": "..." }
  ]
}
```

`GET /roadmaps/:id` — detalhe da trilha. Aceita header opcional `x-user-id` para anexar progresso.

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

> `x-user-id` e contrato **temporario**. Auth real (sessao/JWT) sera plugada em card seguinte; `request.userId` e o ponto de extensao.

## Estrutura

```
src/
  domain/                 # tipos, services e contratos de repositorio
  infra/prisma/           # client e adapters Prisma
  http/                   # app, rotas, serializers, error handler, auth stub
  server.ts               # entrypoint do listen
prisma/
  schema.prisma           # entidades base
  migrations/             # migration inicial versionada
  seed.ts                 # trilha oficial ENEM minima
docs/
  DEV-001-NOTES.md
  DEV-002-NOTES.md
```

## Seguranca

- Sem secrets/tokens/keys no repositorio.
- `.env` no `.gitignore`. Use `.env.example` como referencia.
- YouTube Data API e OAuth 1.0 (Trello) sao tratados em outros cards (DEV-002A).

## Status

DEV-001 e DEV-002 entregues. Proximos: DEV-002A (OAuth 1.0), DEV-003 (POST complete + agregacao), DEV-004 (UI).
