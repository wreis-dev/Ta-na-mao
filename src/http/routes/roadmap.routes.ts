// Rotas HTTP de trilhas. Cobrem DEV-002:
//   GET  /roadmaps/official  - lista trilhas curadas
//   GET  /roadmaps/:id       - detalhe com topicos, videos e (se ha userId) progresso
//
// Autenticacao real fica para outro card. Por enquanto, a presenca de
// `request.userId` (preenchido pelo plugin stub) controla se o detalhe
// inclui progresso ou nao.

import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";

import type { RoadmapService } from "../../domain/roadmap.service.js";
import {
  serializeRoadmapDetail,
  serializeRoadmapSummary,
} from "../serializers.js";

interface Deps {
  roadmapService: RoadmapService;
}

const detailParamsSchema = z.object({
  id: z.string().min(1).max(64),
});

export const roadmapRoutes: (deps: Deps) => FastifyPluginAsync =
  ({ roadmapService }) =>
  async (app: FastifyInstance) => {
    app.get("/roadmaps/official", async () => {
      const roadmaps = await roadmapService.listOfficial();
      return {
        data: roadmaps.map(serializeRoadmapSummary),
      };
    });

    app.get("/roadmaps/:id", async (request) => {
      const { id } = detailParamsSchema.parse(request.params);
      // Quando nao ha userId, getDetail retorna progress null em todos os
      // niveis - estado "ainda nao iniciado" exigido pela spec.
      const detail = await roadmapService.getDetail(
        id,
        request.userId ?? undefined,
      );
      return { data: serializeRoadmapDetail(detail) };
    });
  };
