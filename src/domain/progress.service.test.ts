import { describe, expect, it } from "vitest";

import {
  RoadmapItemMismatchError,
  RoadmapItemNotFoundError,
} from "./errors.js";
import {
  buildTestWorld,
  seedOfficialEnemTrilha,
} from "./test-helpers.js";

describe("ProgressService.markVideoComplete", () => {
  it("primeira chamada cria progresso completo e retorna firstCompletion=true", async () => {
    const fixedNow = new Date("2026-04-26T08:30:00.000Z");
    const { store, services } = buildTestWorld(() => fixedNow);
    const { roadmap, items } = seedOfficialEnemTrilha(store);
    const student = store.addUser({ email: "ana@test.local", name: "Ana" });

    const result = await services.progress.markVideoComplete({
      userId: student.id,
      roadmapId: roadmap.id,
      roadmapItemId: items[0].id,
    });

    expect(result.firstCompletion).toBe(true);
    expect(result.progress.completedAt).toEqual(fixedNow);
    // activityDate normalizada para o inicio do dia em UTC.
    expect(result.progress.activityDate).toEqual(
      new Date("2026-04-26T00:00:00.000Z"),
    );
  });

  it("e idempotente: segunda chamada nao altera completedAt e retorna firstCompletion=false", async () => {
    let now = new Date("2026-04-26T08:30:00.000Z");
    const { store, services } = buildTestWorld(() => now);
    const { roadmap, items } = seedOfficialEnemTrilha(store);
    const student = store.addUser({ email: "ana@test.local", name: "Ana" });

    const first = await services.progress.markVideoComplete({
      userId: student.id,
      roadmapId: roadmap.id,
      roadmapItemId: items[0].id,
    });

    // Avanca o relogio. Mesmo assim a 2a conclusao nao pode sobrescrever.
    now = new Date("2026-04-27T11:00:00.000Z");
    const second = await services.progress.markVideoComplete({
      userId: student.id,
      roadmapId: roadmap.id,
      roadmapItemId: items[0].id,
    });

    expect(second.firstCompletion).toBe(false);
    expect(second.progress.id).toBe(first.progress.id);
    expect(second.progress.completedAt).toEqual(first.progress.completedAt);
  });

  it("nao gera duplicidade na tabela: apenas um registro por (user,item)", async () => {
    const { store, services } = buildTestWorld();
    const { roadmap, items } = seedOfficialEnemTrilha(store);
    const student = store.addUser({ email: "ana@test.local", name: "Ana" });

    await services.progress.markVideoComplete({
      userId: student.id,
      roadmapId: roadmap.id,
      roadmapItemId: items[0].id,
    });
    await services.progress.markVideoComplete({
      userId: student.id,
      roadmapId: roadmap.id,
      roadmapItemId: items[0].id,
    });
    await services.progress.markVideoComplete({
      userId: student.id,
      roadmapId: roadmap.id,
      roadmapItemId: items[0].id,
    });

    const all = [...store.progress.values()].filter(
      (p) =>
        p.userId === student.id && p.roadmapItemId === items[0].id,
    );
    expect(all).toHaveLength(1);
  });

  it("rejeita item inexistente", async () => {
    const { store, services } = buildTestWorld();
    const { roadmap } = seedOfficialEnemTrilha(store);
    const student = store.addUser({ email: "x@test.local", name: "X" });

    await expect(
      services.progress.markVideoComplete({
        userId: student.id,
        roadmapId: roadmap.id,
        roadmapItemId: "missing",
      }),
    ).rejects.toBeInstanceOf(RoadmapItemNotFoundError);
  });

  it("rejeita item que nao pertence ao roadmap informado", async () => {
    const { store, services } = buildTestWorld();
    const { items } = seedOfficialEnemTrilha(store);
    const otherRoadmap = store.addRoadmap({
      slug: "outro",
      title: "Outro",
      source: "OFFICIAL",
    });
    const student = store.addUser({ email: "x@test.local", name: "X" });

    await expect(
      services.progress.markVideoComplete({
        userId: student.id,
        roadmapId: otherRoadmap.id,
        roadmapItemId: items[0].id,
      }),
    ).rejects.toBeInstanceOf(RoadmapItemMismatchError);
  });
});
