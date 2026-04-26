// Fabrica de mundo de testes com repositorios em memoria + services prontos.

import { ProgressService } from "./progress.service.js";
import { RoadmapService } from "./roadmap.service.js";
import {
  InMemoryItemRepository,
  InMemoryProgressRepository,
  InMemoryRoadmapRepository,
  InMemoryStore,
  InMemoryTopicRepository,
  InMemoryUserRepository,
} from "./in-memory-repository.js";

export function buildTestWorld(now: () => Date = () => new Date()) {
  const store = new InMemoryStore();
  const repos = {
    users: new InMemoryUserRepository(store),
    roadmaps: new InMemoryRoadmapRepository(store),
    topics: new InMemoryTopicRepository(store),
    items: new InMemoryItemRepository(store),
    progress: new InMemoryProgressRepository(store),
  };
  const services = {
    roadmap: new RoadmapService({
      roadmaps: repos.roadmaps,
      topics: repos.topics,
      items: repos.items,
      progress: repos.progress,
    }),
    progress: new ProgressService({
      progress: repos.progress,
      items: repos.items,
      now,
    }),
  };
  return { store, repos, services };
}

export function seedOfficialEnemTrilha(store: InMemoryStore) {
  const curator = store.addUser({
    email: "curator@test.local",
    name: "Curadoria",
    role: "CURATOR",
  });
  const roadmap = store.addRoadmap({
    slug: "enem-test",
    title: "ENEM Test",
    source: "OFFICIAL",
    ownerId: curator.id,
  });
  const topic = store.addTopic({
    roadmapId: roadmap.id,
    title: "Matematica",
    subject: "Matematica",
    order: 1,
  });
  const item1 = store.addItem({
    roadmapId: roadmap.id,
    topicId: topic.id,
    youtubeVideoId: "VID0000001A",
    title: "Video 1",
    order: 1,
    durationSeconds: 600,
  });
  const item2 = store.addItem({
    roadmapId: roadmap.id,
    topicId: topic.id,
    youtubeVideoId: "VID0000002B",
    title: "Video 2",
    order: 2,
    durationSeconds: 600,
  });
  return { curator, roadmap, topic, items: [item1, item2] as const };
}
