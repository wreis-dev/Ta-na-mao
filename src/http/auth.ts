// Autenticacao stub. No MVP a sessao real virá em outro card; por enquanto
// o app aceita um header `x-user-id` para que o frontend possa exercitar
// os contratos com usuario logado vs anonimo.
//
// Em producao, este arquivo sera substituido por um plugin de sessao real
// (JWT, cookie, etc). A assinatura `request.userId` permanece estavel.

import type {
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
  preHandlerHookHandler,
} from "fastify";
import fp from "fastify-plugin";

import { UnauthorizedError } from "../domain/errors.js";

declare module "fastify" {
  interface FastifyRequest {
    userId: string | null;
  }
}

/**
 * preHandler que exige `x-user-id`. Use nas rotas que precisam de
 * usuario autenticado (ex.: POST de conclusao de video).
 * Sem header, lanca `UnauthorizedError` -> 401 via error handler.
 */
export const requireAuth: preHandlerHookHandler = async (
  request: FastifyRequest,
  _reply: FastifyReply,
) => {
  if (!request.userId) {
    throw new UnauthorizedError("Missing x-user-id header");
  }
};

const stubAuthPlugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest("userId", null);

  app.addHook("preHandler", async (request: FastifyRequest) => {
    const header = request.headers["x-user-id"];
    if (typeof header === "string" && header.trim().length > 0) {
      request.userId = header.trim();
    } else {
      request.userId = null;
    }
  });
};

// fastify-plugin garante que o decorator/hook fique disponivel em toda a app.
export default fp(stubAuthPlugin, {
  name: "stub-auth",
  fastify: "5.x",
});
