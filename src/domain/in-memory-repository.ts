// Repositorios em memoria. Servem aos testes e como referencia executavel
// do contrato esperado pelo Prisma adapter.

import type {
  ProgressRepository,
  RoadmapItemRepository,
  RoadmapRepository,
  RoadmapTopicRepository,
  UserRepository,
} from "./repositories.js";
import type {
  Roadmap,
  RoadmapItem,
  RoadmapTopic,
  User,
  UserVideoProgress,
} from "./types.js";

let idSeed = 0;
const nextId = (prefix: string) => `${prefix}_${++idSeed}`;

export class InMemoryStore {
  users = new Map<string, User>();
  roadmaps = new Map<string, Roadmap>();
  topics = new Map<string, RoadmapTopic>();
  items = new Map<string, RoadmapItem>();
  progress = new Map<string, UserVideoProgress>();

  reset(): void {
    this.users.clear();
    this.roadmaps.clear();
    this.topics.clear();
    this.items.clear();
    this.progress.clear();
  }

  // Helpers de seed para testes.
  addUser(input: Partial<User> & Pick<User, "email" | "name">): User {
    const now = new Date();
    const user: User = {
      id: input.id ?? nextId("usr"),
      email: input.email,
      name: input.name,
      role: input.role ?? "STUDENT",
      createdAt: input.createdAt ?? now,
      updatedAt: input.updatedAt ?? now,
    };
    this.users.set(user.id, user);
    return user;
  }

  addRoadmap(
    input: Partial<Roadmap> & Pick<Roadmap, "slug" | "title" | "source">,
  ): Roadmap {
    const now = new Date();
    const roadmap: Roadmap = {
      id: input.id ?? nextId("rdm"),
      slug: input.slug,
      title: input.title,
      description: input.description ?? null,
      source: input.source,
      visibility: input.visibility ?? "PUBLIC",
      ownerId: input.ownerId ?? null,
      publishedAt: input.publishedAt ?? now,
      createdAt: input.createdAt ?? now,
      updatedAt: input.updatedAt ?? now,
    };
    this.roadmaps.set(roadmap.id, roadmap);
    return roadmap;
  }

  addTopic(
    input: Partial<RoadmapTopic> &
      Pick<RoadmapTopic, "roadmapId" | "title" | "order">,
  ): RoadmapTopic {
    const now = new Date();
    const topic: RoadmapTopic = {
      id: input.id ?? nextId("tpc"),
      roadmapId: input.roadmapId,
      title: input.title,
      subject: input.subject ?? null,
      order: input.order,
      createdAt: input.createdAt ?? now,
      updatedAt: input.updatedAt ?? now,
    };
    this.topics.set(topic.id, topic);
    return topic;
  }

  addItem(
    input: Partial<RoadmapItem> &
      Pick<
        RoadmapItem,
        "roadmapId" | "youtubeVideoId" | "title" | "order"
      >,
  ): RoadmapItem {
    const now = new Date();
    const item: RoadmapItem = {
      id: input.id ?? nextId("itm"),
      roadmapId: input.roadmapId,
      topicId: input.topicId ?? null,
      youtubeVideoId: input.youtubeVideoId,
      title: input.title,
      channel: input.channel ?? null,
      thumbnailUrl: input.thumbnailUrl ?? null,
      durationSeconds: input.durationSeconds ?? null,
      order: input.order,
      status: input.status ?? "PUBLISHED",
      createdAt: input.createdAt ?? now,
      updatedAt: input.updatedAt ?? now,
    };
    this.items.set(item.id, item);
    return item;
  }
}

export class InMemoryRoadmapRepository implements RoadmapRepository {
  constructor(private readonly store: InMemoryStore) {}

  async findOfficial(): Promise<Roadmap[]> {
    return [...this.store.roadmaps.values()]
      .filter((r) => r.source === "OFFICIAL" && r.visibility !== "PRIVATE")
      .sort(
        (a, b) =>
          (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0),
      );
  }

  async findById(id: string): Promise<Roadmap | null> {
    return this.store.roadmaps.get(id) ?? null;
  }

  async findBySlug(slug: string): Promise<Roadmap | null> {
    for (const r of this.store.roadmaps.values()) {
      if (r.slug === slug) return r;
    }
    return null;
  }
}

export class InMemoryTopicRepository implements RoadmapTopicRepository {
  constructor(private readonly store: InMemoryStore) {}

  async findByRoadmap(roadmapId: string): Promise<RoadmapTopic[]> {
    return [...this.store.topics.values()]
      .filter((t) => t.roadmapId === roadmapId)
      .sort((a, b) => a.order - b.order);
  }
}

export class InMemoryItemRepository implements RoadmapItemRepository {
  constructor(private readonly store: InMemoryStore) {}

  async findByRoadmap(roadmapId: string): Promise<RoadmapItem[]> {
    return [...this.store.items.values()]
      .filter((i) => i.roadmapId === roadmapId)
      .sort((a, b) => a.order - b.order);
  }

  async findById(id: string): Promise<RoadmapItem | null> {
    return this.store.items.get(id) ?? null;
  }

  async countByRoadmap(roadmapId: string): Promise<number> {
    let n = 0;
    for (const i of this.store.items.values()) {
      if (i.roadmapId === roadmapId) n++;
    }
    return n;
  }
}

export class InMemoryProgressRepository implements ProgressRepository {
  constructor(private readonly store: InMemoryStore) {}

  private key(userId: string, itemId: string): string {
    return `${userId}::${itemId}`;
  }

  async markVideoComplete(input: {
    userId: string;
    roadmapItemId: string;
    completedAt: Date;
  }): Promise<{ progress: UserVideoProgress; created: boolean }> {
    const k = this.key(input.userId, input.roadmapItemId);
    const existing = this.store.progress.get(k);
    const activityDate = startOfDay(input.completedAt);

    if (existing) {
      // Idempotencia: nao sobrescreve completedAt se ja existe.
      if (existing.completedAt) {
        return { progress: existing, created: false };
      }
      const updated: UserVideoProgress = {
        ...existing,
        completedAt: input.completedAt,
        activityDate,
        updatedAt: input.completedAt,
      };
      this.store.progress.set(k, updated);
      return { progress: updated, created: false };
    }

    const created: UserVideoProgress = {
      id: nextId("uvp"),
      userId: input.userId,
      roadmapItemId: input.roadmapItemId,
      completedAt: input.completedAt,
      activityDate,
      createdAt: input.completedAt,
      updatedAt: input.completedAt,
    };
    this.store.progress.set(k, created);
    return { progress: created, created: true };
  }

  async findByUserAndItem(
    userId: string,
    roadmapItemId: string,
  ): Promise<UserVideoProgress | null> {
    return this.store.progress.get(this.key(userId, roadmapItemId)) ?? null;
  }

  async findByUserAndRoadmap(
    userId: string,
    roadmapId: string,
  ): Promise<UserVideoProgress[]> {
    const itemIds = new Set<string>();
    for (const i of this.store.items.values()) {
      if (i.roadmapId === roadmapId) itemIds.add(i.id);
    }
    return [...this.store.progress.values()].filter(
      (p) => p.userId === userId && itemIds.has(p.roadmapItemId),
    );
  }

  async countCompletedByUserAndRoadmap(
    userId: string,
    roadmapId: string,
  ): Promise<number> {
    const list = await this.findByUserAndRoadmap(userId, roadmapId);
    return list.filter((p) => p.completedAt !== null).length;
  }
}

export class InMemoryUserRepository implements UserRepository {
  constructor(private readonly store: InMemoryStore) {}
  async findById(id: string): Promise<User | null> {
    return this.store.users.get(id) ?? null;
  }
}

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}
