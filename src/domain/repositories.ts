// Contratos de persistencia. As implementacoes vivem em src/infra/prisma
// (producao) e em src/domain/in-memory-repository.ts (testes).

import type {
  Roadmap,
  RoadmapItem,
  RoadmapTopic,
  User,
  UserVideoProgress,
} from "./types.js";

export interface RoadmapRepository {
  findOfficial(): Promise<Roadmap[]>;
  findById(id: string): Promise<Roadmap | null>;
  findBySlug(slug: string): Promise<Roadmap | null>;
}

export interface RoadmapTopicRepository {
  findByRoadmap(roadmapId: string): Promise<RoadmapTopic[]>;
}

export interface RoadmapItemRepository {
  findByRoadmap(roadmapId: string): Promise<RoadmapItem[]>;
  findById(id: string): Promise<RoadmapItem | null>;
  countByRoadmap(roadmapId: string): Promise<number>;
}

export interface ProgressRepository {
  /**
   * Idempotente: se ja existe progresso completo, retorna o mesmo registro
   * sem atualizar completedAt. Caso contrario cria/marca como concluido.
   */
  markVideoComplete(input: {
    userId: string;
    roadmapItemId: string;
    completedAt: Date;
  }): Promise<{ progress: UserVideoProgress; created: boolean }>;

  findByUserAndItem(
    userId: string,
    roadmapItemId: string,
  ): Promise<UserVideoProgress | null>;

  findByUserAndRoadmap(
    userId: string,
    roadmapId: string,
  ): Promise<UserVideoProgress[]>;

  countCompletedByUserAndRoadmap(
    userId: string,
    roadmapId: string,
  ): Promise<number>;
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
}
