// Leitura e validacao das credenciais do Trello a partir de variaveis de
// ambiente. NUNCA logar nem serializar valores - so reportamos quais
// chaves estao ausentes.

import type { OAuth1ClientCredentials } from "../oauth1/index.js";

export const TRELLO_ENV_KEYS = [
  "TRELLO_OAUTH_CONSUMER_KEY",
  "TRELLO_OAUTH_CONSUMER_SECRET",
  "TRELLO_OAUTH_ACCESS_TOKEN",
  "TRELLO_OAUTH_TOKEN_SECRET",
] as const;

export type TrelloEnvKey = (typeof TRELLO_ENV_KEYS)[number];

export interface TrelloConfigSuccess {
  ok: true;
  credentials: OAuth1ClientCredentials;
}

export interface TrelloConfigFailure {
  ok: false;
  /** Apenas o nome das envs faltando - sem valores parciais. */
  missing: TrelloEnvKey[];
}

export type TrelloConfigResult = TrelloConfigSuccess | TrelloConfigFailure;

export function loadTrelloConfig(
  env: NodeJS.ProcessEnv = process.env,
): TrelloConfigResult {
  const values: Partial<Record<TrelloEnvKey, string>> = {};
  const missing: TrelloEnvKey[] = [];

  for (const key of TRELLO_ENV_KEYS) {
    const v = env[key];
    if (typeof v !== "string" || v.trim().length === 0) {
      missing.push(key);
    } else {
      values[key] = v;
    }
  }

  if (missing.length > 0) {
    return { ok: false, missing };
  }

  return {
    ok: true,
    credentials: {
      consumerKey: values["TRELLO_OAUTH_CONSUMER_KEY"]!,
      consumerSecret: values["TRELLO_OAUTH_CONSUMER_SECRET"]!,
      accessToken: values["TRELLO_OAUTH_ACCESS_TOKEN"]!,
      tokenSecret: values["TRELLO_OAUTH_TOKEN_SECRET"]!,
    },
  };
}

/**
 * Helper: lanca se faltar credencial. Util para entrypoints onde Trello
 * e obrigatorio. A mensagem nunca contem valores - apenas nomes de envs.
 */
export function loadTrelloConfigOrThrow(
  env: NodeJS.ProcessEnv = process.env,
): OAuth1ClientCredentials {
  const result = loadTrelloConfig(env);
  if (!result.ok) {
    throw new Error(
      `Missing Trello OAuth env vars: ${result.missing.join(", ")}`,
    );
  }
  return result.credentials;
}
