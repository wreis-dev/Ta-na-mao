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

// Erro transversal usado pela camada HTTP. Mantemos no dominio para que
// o mapeador centralize a traducao em status code, mesmo que a validacao
// real venha do plugin/middleware de auth.
export class UnauthorizedError extends DomainError {
  constructor(message = "Authentication required") {
    super("UNAUTHORIZED", message);
  }
}
