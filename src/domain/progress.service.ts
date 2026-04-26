// Service de progresso de video. Foco do DEV-001 e idempotencia da conclusao.
// O endpoint POST /complete (DEV-003) sera uma fina casca em cima deste service.

import {
  RoadmapItemMismatchError,
  RoadmapItemNotFoundError,
} from "./errors.js";
import type {
  ProgressRepository,
  RoadmapItemRepository,
} from "./repositories.js";
import type { UserVideoProgress } from "./types.js";

export interface ProgressServiceDeps {
  progress: ProgressRepository;
  items: RoadmapItemRepository;
  /** Permite injetar um relogio nos testes para travar activityDate. */
  now?: () => Date;
}

export interface MarkVideoCompleteInput {
  userId: string;
  roadmapId: string;
  roadmapItemId: string;
}

export interface MarkVideoCompleteResult {
  progress: UserVideoProgress;
  /** True quando este chamado foi quem marcou como concluido. */
  firstCompletion: boolean;
}

export class ProgressService {
  private readonly now: () => Date;

  constructor(private readonly deps: ProgressServiceDeps) {
    this.now = deps.now ?? (() => new Date());
  }

  /**
   * Idempotente. Chamadas repetidas com o mesmo (userId, roadmapItemId)
   * retornam o registro existente e nao sobrescrevem completedAt.
   * Valida que o item realmente pertence ao roadmap informado.
   */
  async markVideoComplete(
    input: MarkVideoCompleteInput,
  ): Promise<MarkVideoCompleteResult> {
    const item = await this.deps.items.findById(input.roadmapItemId);
    if (!item) throw new RoadmapItemNotFoundError(input.roadmapItemId);
    if (item.roadmapId !== input.roadmapId) {
      throw new RoadmapItemMismatchError(input.roadmapItemId, input.roadmapId);
    }

    const existing = await this.deps.progress.findByUserAndItem(
      input.userId,
      input.roadmapItemId,
    );
    if (existing?.completedAt) {
      // Ja concluido. Idempotencia: nao toca completedAt nem activityDate.
      return { progress: existing, firstCompletion: false };
    }

    const completedAt = this.now();
    const result = await this.deps.progress.markVideoComplete({
      userId: input.userId,
      roadmapItemId: input.roadmapItemId,
      completedAt,
    });

    return { progress: result.progress, firstCompletion: true };
  }

  async getVideoProgress(
    userId: string,
    roadmapItemId: string,
  ): Promise<UserVideoProgress | null> {
    return this.deps.progress.findByUserAndItem(userId, roadmapItemId);
  }
}
