// Implementacao dos repositorios usando Prisma. As assinaturas espelham
// `src/domain/repositories.ts`.

import type { PrismaClient } from "@prisma/client";

import type {
  ProgressRepository,
  RoadmapItemRepository,
  RoadmapRepository,
  RoadmapTopicRepository,
  UserRepository,
} from "../../domain/repositories.js";
import type {
  Roadmap,
  RoadmapItem,
  RoadmapTopic,
  User,
  UserVideoProgress,
} from "../../domain/types.js";

export class PrismaRoadmapRepository implements RoadmapRepository {
  constructor(private readonly db: PrismaClient) {}

  async findOfficial(): Promise<Roadmap[]> {
    return this.db.roadmap.findMany({
      where: { source: "OFFICIAL", visibility: { not: "PRIVATE" } },
      orderBy: { publishedAt: "desc" },
    });
  }

  async findById(id: string): Promise<Roadmap | null> {
    return this.db.roadmap.findUnique({ where: { id } });
  }

  async findBySlug(slug: string): Promise<Roadmap | null> {
    return this.db.roadmap.findUnique({ where: { slug } });
  }
}

export class PrismaTopicRepository implements RoadmapTopicRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByRoadmap(roadmapId: string): Promise<RoadmapTopic[]> {
    return this.db.roadmapTopic.findMany({
      where: { roadmapId },
      orderBy: { order: "asc" },
    });
  }
}

export class PrismaItemRepository implements RoadmapItemRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByRoadmap(roadmapId: string): Promise<RoadmapItem[]> {
    return this.db.roadmapItem.findMany({
      where: { roadmapId },
      orderBy: { order: "asc" },
    });
  }

  async findById(id: string): Promise<RoadmapItem | null> {
    return this.db.roadmapItem.findUnique({ where: { id } });
  }

  async countByRoadmap(roadmapId: string): Promise<number> {
    return this.db.roadmapItem.count({ where: { roadmapId } });
  }
}

export class PrismaProgressRepository implements ProgressRepository {
  constructor(private readonly db: PrismaClient) {}

  async markVideoComplete(input: {
    userId: string;
    roadmapItemId: string;
    completedAt: Date;
  }): Promise<{ progress: UserVideoProgress; created: boolean }> {
    // Atomico via upsert. A unique (userId, roadmapItemId) impede duplicidade.
    // O update so toca completedAt/activityDate quando ainda nao concluido.
    const activityDate = startOfDay(input.completedAt);

    const existing = await this.db.userVideoProgress.findUnique({
      where: {
        userId_roadmapItemId: {
          userId: input.userId,
          roadmapItemId: input.roadmapItemId,
        },
      },
    });

    if (existing?.completedAt) {
      return { progress: existing, created: false };
    }

    if (existing) {
      const progress = await this.db.userVideoProgress.update({
        where: { id: existing.id },
        data: { completedAt: input.completedAt, activityDate },
      });
      return { progress, created: false };
    }

    const progress = await this.db.userVideoProgress.create({
      data: {
        userId: input.userId,
        roadmapItemId: input.roadmapItemId,
        completedAt: input.completedAt,
        activityDate,
      },
    });
    return { progress, created: true };
  }

  async findByUserAndItem(
    userId: string,
    roadmapItemId: string,
  ): Promise<UserVideoProgress | null> {
    return this.db.userVideoProgress.findUnique({
      where: { userId_roadmapItemId: { userId, roadmapItemId } },
    });
  }

  async findByUserAndRoadmap(
    userId: string,
    roadmapId: string,
  ): Promise<UserVideoProgress[]> {
    return this.db.userVideoProgress.findMany({
      where: { userId, roadmapItem: { roadmapId } },
    });
  }

  async countCompletedByUserAndRoadmap(
    userId: string,
    roadmapId: string,
  ): Promise<number> {
    return this.db.userVideoProgress.count({
      where: {
        userId,
        completedAt: { not: null },
        roadmapItem: { roadmapId },
      },
    });
  }
}

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly db: PrismaClient) {}
  async findById(id: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { id } });
  }
}

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}
