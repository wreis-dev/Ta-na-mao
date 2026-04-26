# Ta na mao

Plataforma de educacao com trilhas de YouTube, focada em ENEM. Este repositorio contem a base do backend (data model + dominio).

## Stack

- Node 20+, TypeScript ESM
- Prisma ORM com PostgreSQL
- Vitest

## Setup

```bash
npm install
cp .env.example .env   # preencha DATABASE_URL local
npm run db:generate    # gera @prisma/client
npm run db:migrate     # aplica migration inicial em ambiente local
npm run db:seed        # popula trilha oficial ENEM de exemplo
```

## Comandos

| Script | O que faz |
|---|---|
| `npm test` | Roda a suite Vitest (services em memoria, sem banco). |
| `npm run typecheck` | TypeScript strict, sem emitir. |
| `npm run build` | Compila para `dist/`. |
| `npm run db:migrate` | Aplica migrations Prisma em DB local. |
| `npm run db:seed` | Cria trilha oficial ENEM de exemplo. |
| `npm run db:reset` | Drop + migrate + seed (uso local). |

## Estrutura

```
src/
  domain/                 # tipos, services e contratos de repositorio
  infra/prisma/           # client e adapters Prisma dos repositorios
prisma/
  schema.prisma           # entidades base
  migrations/             # migration inicial versionada
  seed.ts                 # trilha oficial ENEM minima
```

## Seguranca

- Sem secrets/tokens/keys no repositorio.
- `.env` no `.gitignore`. Use `.env.example` como referencia.
- YouTube Data API e OAuth 1.0 (Trello) sao tratados em outros cards (DEV-002, DEV-002A).

## Status

DEV-001 entregue. Cards seguintes (DEV-002, DEV-002A, DEV-003, DEV-004) ficam para PRs proximos.
