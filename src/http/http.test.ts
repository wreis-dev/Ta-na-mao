// Testes de contrato com fastify.inject. Sem rede, sem banco - usam
// repositorios em memoria via buildTestWorld.

import { describe, expect, it } from "vitest";

import {
  buildTestWorld,
  seedOfficialEnemTrilha,
} from "../domain/test-helpers.js";

import { buildApp } from "./app.js";

async function setup() {
  const world = buildTestWorld();
  seedOfficialEnemTrilha(world.store);
  const app = await buildApp({
    roadmapService: world.services.roadmap,
    progressService: world.services.progress,
  });
  return { app, world };
}

describe("GET /roadmaps/official", () => {
  it("lista somente trilhas oficiais", async () => {
    const { app, world } = await setup();
    world.store.addRoadmap({
      slug: "user-roadmap",
      title: "Trilha do usuario",
      source: "USER",
    });

    const res = await app.inject({ method: "GET", url: "/roadmaps/official" });

    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: Array<{ slug: string; source: string }> };
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.slug).toBe("enem-test");
    expect(body.data[0]?.source).toBe("OFFICIAL");
  });

  it("nao retorna trilhas oficiais privadas", async () => {
    const { app, world } = await setup();
    world.store.addRoadmap({
      slug: "official-private",
      title: "Privada",
      source: "OFFICIAL",
      visibility: "PRIVATE",
    });

    const res = await app.inject({ method: "GET", url: "/roadmaps/official" });
    const body = res.json() as { data: Array<{ slug: string }> };
    expect(body.data.map((r) => r.slug)).toEqual(["enem-test"]);
  });
});

describe("GET /roadmaps/:id", () => {
  it("retorna detalhe sem progresso quando anonimo", async () => {
    const { app, world } = await setup();
    const roadmap = await world.repos.roadmaps.findBySlug("enem-test");

    const res = await app.inject({
      method: "GET",
      url: `/roadmaps/${roadmap!.id}`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      data: {
        slug: string;
        topics: Array<{ items: Array<{ progress: unknown; order: number }> }>;
        progress: unknown;
      };
    };
    expect(body.data.slug).toBe("enem-test");
    expect(body.data.progress).toBeNull();
    expect(body.data.topics).toHaveLength(1);
    expect(body.data.topics[0]?.items.map((i) => i.order)).toEqual([1, 2]);
    expect(body.data.topics[0]?.items.every((i) => i.progress === null)).toBe(
      true,
    );
  });

  it("anexa progresso quando header x-user-id presente", async () => {
    const { app, world } = await setup();
    const roadmap = await world.repos.roadmaps.findBySlug("enem-test");
    const items = await world.repos.items.findByRoadmap(roadmap!.id);
    const student = world.store.addUser({
      email: "ana@test.local",
      name: "Ana",
    });
    await world.services.progress.markVideoComplete({
      userId: student.id,
      roadmapId: roadmap!.id,
      roadmapItemId: items[0]!.id,
    });

    const res = await app.inject({
      method: "GET",
      url: `/roadmaps/${roadmap!.id}`,
      headers: { "x-user-id": student.id },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      data: {
        topics: Array<{
          items: Array<{ progress: { completedAt: string | null } | null }>;
        }>;
        progress: { totalItems: number; completedItems: number; percentComplete: number } | null;
      };
    };
    const itemProgress = body.data.topics[0]?.items.map(
      (i) => i.progress?.completedAt ?? null,
    );
    expect(itemProgress?.[0]).not.toBeNull();
    expect(itemProgress?.[1]).toBeNull();
    expect(body.data.progress).toEqual({
      totalItems: 2,
      completedItems: 1,
      percentComplete: 50,
      startedAt: expect.any(String),
      lastActivityAt: expect.any(String),
      completedAt: null,
    });
  });

  it("retorna 404 quando roadmap nao existe", async () => {
    const { app } = await setup();
    const res = await app.inject({
      method: "GET",
      url: "/roadmaps/nope-id",
    });
    expect(res.statusCode).toBe(404);
    const body = res.json() as { error: { code: string } };
    expect(body.error.code).toBe("ROADMAP_NOT_FOUND");
  });
});

describe("GET /health", () => {
  it("retorna 200 ok", async () => {
    const { app } = await setup();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });
});
