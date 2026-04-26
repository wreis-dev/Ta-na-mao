// Erros de dominio. O transporte (HTTP) traduz para status codes em outro card.

export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export class RoadmapNotFoundError extends DomainError {
  constructor(roadmapId: string) {
    super("ROADMAP_NOT_FOUND", `Roadmap ${roadmapId} not found`);
  }
}

export class RoadmapItemNotFoundError extends DomainError {
  constructor(itemId: string) {
    super("ROADMAP_ITEM_NOT_FOUND", `Roadmap item ${itemId} not found`);
  }
}

export class RoadmapItemMismatchError extends DomainError {
  constructor(itemId: string, roadmapId: string) {
    super(
      "ROADMAP_ITEM_MISMATCH",
      `Roadmap item ${itemId} does not belong to roadmap ${roadmapId}`,
    );
  }
}
