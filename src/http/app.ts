// Builder do Fastify. Aceita injecao de services (essencial para os
// testes de contrato). O server.ts faz o wiring com Prisma; os testes
// passam a versao em memoria.

import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";

import type { ProgressService } from "../domain/progress.service.js";
import type { RoadmapService } from "../domain/roadmap.service.js";

import stubAuth from "./auth.js";
import { domainErrorHandler } from "./errors.js";
import { roadmapRoutes } from "./routes/roadmap.routes.js";

export interface BuildAppDeps {
  roadmapService: RoadmapService;
  progressService: ProgressService;
}

export async function buildApp(
  deps: BuildAppDeps,
  opts: FastifyServerOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opts.logger ?? false,
    ...opts,
  });

  app.setErrorHandler(domainErrorHandler);
  await app.register(stubAuth);

  app.get("/health", async () => ({ status: "ok" }));

  await app.register(roadmapRoutes({ roadmapService: deps.roadmapService }));

  return app;
}
