// Rotas HTTP de trilhas. Cobrem DEV-002 (listagem/detalhe) e DEV-003
// (conclusao de video).
//
//   GET  /roadmaps/official  - lista trilhas curadas
//   GET  /roadmaps/:id       - detalhe com topicos, videos e (se ha userId) progresso
//   POST /roadmaps/:roadmapId/items/:itemId/complete - marca video como concluido

import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";

import type { ProgressService } from "../../domain/progress.service.js";
import type { RoadmapService } from "../../domain/roadmap.service.js";
import { requireAuth } from "../auth.js";
import {
  serializeRoadmapDetail,
  serializeRoadmapSummary,
  serializeVideoCompleteResult,
} from "../serializers.js";

interface Deps {
  roadmapService: RoadmapService;
  progressService: ProgressService;
}

const detailParamsSchema = z.object({
  id: z.string().min(1).max(64),
});

const completeParamsSchema = z.object({
  roadmapId: z.string().min(1).max(64),
  itemId: z.string().min(1).max(64),
});

export const roadmapRoutes: (deps: Deps) => FastifyPluginAsync =
  ({ roadmapService, progressService }) =>
  async (app: FastifyInstance) => {
    app.get("/roadmaps/official", async () => {
      const roadmaps = await roadmapService.listOfficial();
      return {
        data: roadmaps.map(serializeRoadmapSummary),
      };
    });

    app.get("/roadmaps/:id", async (request) => {
      const { id } = detailParamsSchema.parse(request.params);
      const detail = await roadmapService.getDetail(
        id,
        request.userId ?? undefined,
      );
      return { data: serializeRoadmapDetail(detail) };
    });

    app.post(
      "/roadmaps/:roadmapId/items/:itemId/complete",
      { preHandler: requireAuth },
      async (request, reply) => {
        const { roadmapId, itemId } = completeParamsSchema.parse(request.params);
        const userId = request.userId as string;

        const result = await progressService.markVideoComplete({
          userId,
          roadmapId,
          roadmapItemId: itemId,
        });

        const roadmapProgress = await roadmapService.computeProgressSummary(
          roadmapId,
          userId,
        );

        const status = result.firstCompletion ? 201 : 200;
        reply.status(status);
        return {
          data: serializeVideoCompleteResult({
            progress: result.progress,
            firstCompletion: result.firstCompletion,
            roadmapProgress,
          }),
        };
      },
    );
  };
