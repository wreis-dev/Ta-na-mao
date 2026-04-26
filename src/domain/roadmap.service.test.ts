import { describe, expect, it } from "vitest";

import {
  RoadmapNotFoundError,
} from "./errors.js";
import {
  buildTestWorld,
  seedOfficialEnemTrilha,
} from "./test-helpers.js";

describe("RoadmapService.listOfficial", () => {
  it("retorna apenas trilhas com source OFFICIAL e nao privadas", async () => {
    const { store, services } = buildTestWorld();
    seedOfficialEnemTrilha(store);
    store.addRoadmap({
      slug: "user-roadmap",
      title: "Trilha do usuario",
      source: "USER",
    });
    store.addRoadmap({
      slug: "official-private",
      title: "Oficial privada",
      source: "OFFICIAL",
      visibility: "PRIVATE",
    });

    const list = await services.roadmap.listOfficial();

    expect(list).toHaveLength(1);
    expect(list[0]?.slug).toBe("enem-test");
  });

  it("ordena por publishedAt desc", async () => {
    const { store, services } = buildTestWorld();
    const old = new Date("2026-01-01");
    const recent = new Date("2026-04-01");
    store.addRoadmap({
      slug: "old",
      title: "Antiga",
      source: "OFFICIAL",
      publishedAt: old,
    });
    store.addRoadmap({
      slug: "recent",
      title: "Recente",
      source: "OFFICIAL",
      publishedAt: recent,
    });

    const list = await services.roadmap.listOfficial();
    expect(list.map((r) => r.slug)).toEqual(["recent", "old"]);
  });
});

describe("RoadmapService.getDetail", () => {
  it("retorna 404 de dominio quando roadmap nao existe", async () => {
    const { services } = buildTestWorld();
    await expect(services.roadmap.getDetail("missing")).rejects.toBeInstanceOf(
      RoadmapNotFoundError,
    );
  });

  it("monta topicos com itens em ordem e progress null sem usuario", async () => {
    const { store, services } = buildTestWorld();
    const { roadmap } = seedOfficialEnemTrilha(store);

    const detail = await services.roadmap.getDetail(roadmap.id);

    expect(detail.roadmap.id).toBe(roadmap.id);
    expect(detail.topics).toHaveLength(1);
    expect(detail.topics[0]?.items.map((i) => i.order)).toEqual([1, 2]);
    expect(detail.topics[0]?.items.every((i) => i.progress === null)).toBe(
      true,
    );
    expect(detail.unassignedItems).toEqual([]);
    expect(detail.progress).toBeNull();
  });

  it("anexa progresso por video e resumo agregado quando ha userId", async () => {
    const fixedNow = new Date("2026-04-26T10:00:00.000Z");
    const { store, services } = buildTestWorld(() => fixedNow);
    const { roadmap, items } = seedOfficialEnemTrilha(store);
    const student = store.addUser({
      email: "ana@test.local",
      name: "Ana",
    });

    await services.progress.markVideoComplete({
      userId: student.id,
      roadmapId: roadmap.id,
      roadmapItemId: items[0].id,
    });

    const detail = await services.roadmap.getDetail(roadmap.id, student.id);

    const firstItem = detail.topics[0]?.items[0];
    const secondItem = detail.topics[0]?.items[1];
    expect(firstItem?.progress?.completedAt).toEqual(fixedNow);
    expect(secondItem?.progress).toBeNull();

    expect(detail.progress).not.toBeNull();
    expect(detail.progress?.totalItems).toBe(2);
    expect(detail.progress?.completedItems).toBe(1);
    expect(detail.progress?.percentComplete).toBe(50);
    expect(detail.progress?.completedAt).toBeNull();
  });
});

describe("RoadmapService.computeProgressSummary", () => {
  it("retorna percentual 0 quando trilha nao tem itens", async () => {
    const { store, services } = buildTestWorld();
    const empty = store.addRoadmap({
      slug: "empty",
      title: "Trilha vazia",
      source: "OFFICIAL",
    });
    const student = store.addUser({ email: "x@test.local", name: "X" });
    const summary = await services.roadmap.computeProgressSummary(
      empty.id,
      student.id,
    );
    expect(summary.totalItems).toBe(0);
    expect(summary.completedItems).toBe(0);
    expect(summary.percentComplete).toBe(0);
  });

  it("marca completedAt da trilha quando todos os videos estao concluidos", async () => {
    const fixedNow = new Date("2026-04-26T12:00:00.000Z");
    const { store, services } = buildTestWorld(() => fixedNow);
    const { roadmap, items } = seedOfficialEnemTrilha(store);
    const student = store.addUser({ email: "ana@test.local", name: "Ana" });

    for (const it of items) {
      await services.progress.markVideoComplete({
        userId: student.id,
        roadmapId: roadmap.id,
        roadmapItemId: it.id,
      });
    }

    const summary = await services.roadmap.computeProgressSummary(
      roadmap.id,
      student.id,
    );
    expect(summary.percentComplete).toBe(100);
    expect(summary.completedAt).toEqual(fixedNow);
  });
});
