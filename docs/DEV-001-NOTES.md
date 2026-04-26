# DEV-001 - Notas de implementacao

Card: [DEV] - Modelar trilhas, videos e progresso base
Branch sugerida: `feat/dev-001-data-model`
Cobertura: P1 (trilhas oficiais ENEM) e P2 (progresso de video).

## Decisoes de arquitetura

**Stack escolhida.** Repo estava vazio. Optei por Node + TypeScript ESM com Prisma + PostgreSQL — alinhado a "premissa tecnica" do workflow. Mobile/Web (Expo + React Native) entra em DEV-004.

**Camadas.** Domain (puro) + adapters Prisma. Services dependem de interfaces de repositorio, com duas implementacoes:
- `InMemory*` em `src/domain/in-memory-repository.ts` para testes rapidos sem banco.
- `Prisma*` em `src/infra/prisma/repositories.ts` para producao.

Esse desacoplamento permite que os 12 testes rodem em ~10ms sem dependencia de Postgres, e ainda assim a logica testada e exatamente a que vai a producao (services nao mudam).

**Idempotencia da conclusao.** Implementada em duas barreiras complementares:
1. Banco — `@@unique([userId, roadmapItemId])` em `user_video_progress`.
2. Service — `markVideoComplete` so atualiza `completedAt` se ainda for null. Chamadas repetidas retornam o registro existente com `firstCompletion: false`.

**Progresso agregado.** Existe a tabela `user_roadmap_progress` (snapshot materializado para acelerar Home/P5), mas o calculo no service e feito por query (`countCompletedByUserAndRoadmap`). Atualizar o snapshot em transacao com a conclusao fica para DEV-003. Contrato esta congelado em `RoadmapProgressSummary`.

**Origem oficial vs user-generated.** `Roadmap.source` (`OFFICIAL` | `USER`) + `ownerId` nullable. Trilha oficial nao precisa de owner. Curador interno (`UserRole.CURATOR`) e quem publica/edita oficiais. Seed cria um curador `curadoria@tanamao.local` apenas como referencia de auditoria — nao e credencial.

## DoD - status

| Item | Status | Evidencia |
|---|---|---|
| Migration/schema para roadmaps, topicos, itens, progresso | OK | `prisma/schema.prisma` + `prisma/migrations/20260426000000_init/migration.sql` |
| Constraints anti-duplicidade | OK | `@@unique([userId, roadmapItemId])` (item) e `@@unique([userId, roadmapId])` (roadmap) |
| Seed inicial trilha oficial ENEM | OK | `prisma/seed.ts` cria 1 trilha + 1 topico + 2 videos placeholder |
| Testes de criacao/listagem + idempotencia | OK | 12 testes Vitest em `src/domain/*.test.ts` |
| Sem secrets/credenciais | OK | `.env.example` apenas; `.env` no `.gitignore`; sem keys no codigo |
| Comandos + lacunas documentados | OK | Este arquivo + `README.md` |

## Comandos executados

```bash
npm install                          # instala deps
npx tsc -p tsconfig.json --noEmit    # typecheck OK
npx vitest run                       # 12 testes, todos passam
```

Saida dos testes:

```
 ✓ src/domain/roadmap.service.test.ts (7 tests)
 ✓ src/domain/progress.service.test.ts (5 tests)
 Test Files  2 passed (2)
      Tests  12 passed (12)
```

## Lacunas conhecidas

1. **`prisma generate` nao foi executado neste sandbox** — a rede do ambiente bloqueia o download dos engines binarios da Prisma (`binaries.prisma.sh` retornou 403). O schema e a migration estao corretos; em qualquer ambiente local com rede livre, basta `npm run db:generate && npm run db:migrate`. Os testes nao dependem desse passo porque usam repositorios em memoria.

2. **Snapshot `UserRoadmapProgress` nao e atualizado automaticamente.** Para DEV-001 isso esta OK — o calculo e feito por query. DEV-003 deve fazer o update transacional ao concluir um video, ou manter o calculo por query se a leitura for barata o suficiente.

3. **Sem HTTP layer.** Endpoints sao escopo de DEV-002 (listagem/detalhe) e DEV-003 (POST complete). Os services ja expoem o contrato pronto para essas cascas.

4. **YouTube Data API.** Nao foi tocada neste card. `RoadmapItem` aceita `title`, `channel`, `thumbnailUrl`, `durationSeconds` como nullable, prontos para serem hidratados pela integracao em card seguinte. Sem `YOUTUBE_API_KEY` no repo (ver `.env.example` comentado).

5. **OAuth 1.0 (Trello).** Nao implementado — DEV-002A. Variaveis comentadas em `.env.example` apenas como referencia. Nada de OAuth 1.0 vai para YouTube por incompatibilidade do provider.

6. **Sem CI configurado.** Pipeline (lint/test/migration check) fica para um card de plataforma posterior.

## Como validar localmente

```bash
git clone https://github.com/wreis-dev/Ta-na-mao.git
cd Ta-na-mao
npm install
npm run typecheck
npm test
# Para validar com Postgres real:
cp .env.example .env  # ajuste DATABASE_URL
npm run db:generate
npm run db:migrate
npm run db:seed
```
