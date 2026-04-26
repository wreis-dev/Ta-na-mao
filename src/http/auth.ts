// Autenticacao stub. No MVP a sessao real virá em outro card; por enquanto
// o app aceita um header `x-user-id` para que o frontend possa exercitar
// os contratos com usuario logado vs anonimo.
//
// Em producao, este arquivo sera substituido por um plugin de sessao real
// (JWT, cookie, etc). A assinatura `request.userId` permanece estavel.

import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

declare module "fastify" {
  interface FastifyRequest {
    userId: string | null;
  }
}

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
