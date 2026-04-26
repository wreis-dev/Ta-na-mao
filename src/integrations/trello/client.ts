// Adapter minimo do Trello sobre OAuth 1.0. Constroi requisicao
// assinada sem executar nenhuma chamada de rede - quem consome decide
// se passa para fetch/got/etc.
//
// Trello aceita OAuth 1.0 com HMAC-SHA1. NAO usar este modulo para
// YouTube: YouTube Data API usa API key (publico) ou OAuth 2.0 (privado).

import { signRequest } from "../oauth1/index.js";
import type {
  OAuth1ClientCredentials,
  SignedRequest,
} from "../oauth1/index.js";

export const TRELLO_BASE_URL = "https://api.trello.com/1";

export interface BuildTrelloRequestInput {
  method: string;
  /** Caminho relativo, ex.: "/members/me/boards" ou URL absoluta. */
  path: string;
  /** Query string ou body x-www-form-urlencoded. */
  params?: Record<string, string | string[]>;
  /** Permite injecao deterministica nos testes. */
  nonce?: string;
  timestamp?: string;
}

export interface TrelloHttpRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  signed: SignedRequest;
}

function joinPath(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/")) return `${TRELLO_BASE_URL}${path}`;
  return `${TRELLO_BASE_URL}/${path}`;
}

/**
 * Monta uma requisicao assinada para a API do Trello. Nao executa fetch.
 * Retorna o objeto pronto para qualquer cliente HTTP do consumidor.
 */
export function buildTrelloRequest(
  credentials: OAuth1ClientCredentials,
  input: BuildTrelloRequestInput,
): TrelloHttpRequest {
  const url = joinPath(input.path);
  const signed = signRequest(credentials, {
    method: input.method,
    url,
    params: input.params,
    nonce: input.nonce,
    timestamp: input.timestamp,
  });

  return {
    method: signed.method,
    url,
    headers: { Authorization: signed.authorizationHeader },
    signed,
  };
}
