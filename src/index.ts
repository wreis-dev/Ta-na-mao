// Entry point apenas para wiring de dependencias. APIs/HTTP ficam em DEV-002.

import { ProgressService } from "./domain/progress.service.js";
import { RoadmapService } from "./domain/roadmap.service.js";
import { prisma } from "./infra/prisma/client.js";
import {
  PrismaItemRepository,
  PrismaProgressRepository,
  PrismaRoadmapRepository,
  PrismaTopicRepository,
  PrismaUserRepository,
} from "./infra/prisma/repositories.js";

export const repositories = {
  users: new PrismaUserRepository(prisma),
  roadmaps: new PrismaRoadmapRepository(prisma),
  topics: new PrismaTopicRepository(prisma),
  items: new PrismaItemRepository(prisma),
  progress: new PrismaProgressRepository(prisma),
};

export const services = {
  roadmap: new RoadmapService({
    roadmaps: repositories.roadmaps,
    topics: repositories.topics,
    items: repositories.items,
    progress: repositories.progress,
  }),
  progress: new ProgressService({
    progress: repositories.progress,
    items: repositories.items,
  }),
};

export { prisma };
