// Tradutor de erros de dominio para HTTP. Mantemos um unico ponto de
// mapeamento para evitar vazamento da camada de dominio nas rotas.

import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";

import {
  DomainError,
  RoadmapItemMismatchError,
  RoadmapItemNotFoundError,
  RoadmapNotFoundError,
} from "../domain/errors.js";

interface HttpErrorBody {
  error: {
    code: string;
    message: string;
  };
}

export function domainErrorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  if (error instanceof RoadmapNotFoundError) {
    reply.status(404).send(buildBody(error));
    return;
  }
  if (error instanceof RoadmapItemNotFoundError) {
    reply.status(404).send(buildBody(error));
    return;
  }
  if (error instanceof RoadmapItemMismatchError) {
    reply.status(400).send(buildBody(error));
    return;
  }
  if (error instanceof DomainError) {
    reply.status(400).send(buildBody(error));
    return;
  }

  // Validation errors do Fastify (zod schema). Preservamos a mensagem.
  if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
    reply.status(error.statusCode).send({
      error: {
        code: error.code ?? "VALIDATION_ERROR",
        message: error.message,
      },
    });
    return;
  }

  request.log.error(
    { err: error },
    "Unhandled error in route - returning 500",
  );
  reply.status(500).send({
    error: { code: "INTERNAL_ERROR", message: "Internal server error" },
  });
}

function buildBody(error: DomainError): HttpErrorBody {
  return { error: { code: error.code, message: error.message } };
}
