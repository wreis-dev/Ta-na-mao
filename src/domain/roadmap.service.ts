// Service do dominio de trilhas. Cobre listagem de oficiais e detalhe
// com progresso (P1/P2). Mantemos pequeno e focado para o DEV-001.

import { RoadmapNotFoundError } from "./errors.js";
import type {
  ProgressRepository,
  RoadmapItemRepository,
  RoadmapRepository,
  RoadmapTopicRepository,
} from "./repositories.js";
import type {
  Roadmap,
  RoadmapDetail,
  RoadmapItemWithProgress,
  RoadmapProgressSummary,
} from "./types.js";

export interface RoadmapServiceDeps {
  roadmaps: RoadmapRepository;
  topics: RoadmapTopicRepository;
  items: RoadmapItemRepository;
  progress: ProgressRepository;
}

export class RoadmapService {
  constructor(private readonly deps: RoadmapServiceDeps) {}

  /** Lista trilhas oficiais publicadas. P1: catalogo ENEM. */
  async listOfficial(): Promise<Roadmap[]> {
    return this.deps.roadmaps.findOfficial();
  }

  /**
   * Detalhe da trilha. Quando userId e fornecido, anexa progresso
   * por video e o resumo agregado da trilha.
   */
  async getDetail(roadmapId: string, userId?: string): Promise<RoadmapDetail> {
    const roadmap = await this.deps.roadmaps.findById(roadmapId);
    if (!roadmap) throw new RoadmapNotFoundError(roadmapId);

    const [topics, items] = await Promise.all([
      this.deps.topics.findByRoadmap(roadmapId),
      this.deps.items.findByRoadmap(roadmapId),
    ]);

    const progressByItem = new Map<string, RoadmapItemWithProgress["progress"]>();
    if (userId) {
      const progressList = await this.deps.progress.findByUserAndRoadmap(
        userId,
        roadmapId,
      );
      for (const p of progressList) progressByItem.set(p.roadmapItemId, p);
    }

    const decorate = (id: string): RoadmapItemWithProgress["progress"] =>
      progressByItem.get(id) ?? null;

    const itemsWithProgress: RoadmapItemWithProgress[] = items
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((item) => ({ ...item, progress: decorate(item.id) }));

    const topicsView = topics
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((topic) => ({
        ...topic,
        items: itemsWithProgress.filter((i) => i.topicId === topic.id),
      }));

    const unassignedItems = itemsWithProgress.filter((i) => i.topicId === null);

    const progress = userId
      ? await this.computeProgressSummary(roadmapId, userId, items.length)
      : null;

    return { roadmap, topics: topicsView, unassignedItems, progress };
  }

  /**
   * Calcula o resumo de progresso da trilha para um usuario.
   * Contrato simples: percentComplete = round(completed/total * 100), 0..100.
   */
  async computeProgressSummary(
    roadmapId: string,
    userId: string,
    totalItemsHint?: number,
  ): Promise<RoadmapProgressSummary> {
    const totalItems =
      totalItemsHint ?? (await this.deps.items.countByRoadmap(roadmapId));

    const completedItems =
      await this.deps.progress.countCompletedByUserAndRoadmap(userId, roadmapId);

    const percentComplete =
      totalItems > 0
        ? Math.min(100, Math.round((completedItems / totalItems) * 100))
        : 0;

    const progressList = await this.deps.progress.findByUserAndRoadmap(
      userId,
      roadmapId,
    );

    const completedDates = progressList
      .map((p) => p.completedAt)
      .filter((d): d is Date => d !== null);

    const lastActivityAt = progressList.reduce<Date | null>((acc, p) => {
      const ref = p.completedAt ?? p.updatedAt;
      if (!acc || ref > acc) return ref;
      return acc;
    }, null);

    const startedAt = progressList.reduce<Date | null>((acc, p) => {
      if (!acc || p.createdAt < acc) return p.createdAt;
      return acc;
    }, null);

    const allCompleted =
      totalItems > 0 && completedItems >= totalItems && completedDates.length > 0;
    const completedAt = allCompleted
      ? completedDates.reduce((acc, d) => (d > acc ? d : acc))
      : null;

    return {
      roadmapId,
      userId,
      totalItems,
      completedItems,
      percentComplete,
      startedAt,
      lastActivityAt,
      completedAt,
    };
  }
}
