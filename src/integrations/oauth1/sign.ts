// Implementacao OAuth 1.0 HMAC-SHA1 (RFC 5849). Sem dependencias alem
// de node:crypto. Os secrets nunca sao logados nem serializados.

import { createHmac, randomBytes } from "node:crypto";

import { percentEncode } from "./percent-encoding.js";
import type {
  OAuth1ClientCredentials,
  SignRequestInput,
  SignedRequest,
} from "./types.js";

const OAUTH_VERSION = "1.0";
const SIGNATURE_METHOD = "HMAC-SHA1";

/** Normaliza a URL conforme RFC 5849 §3.4.1.2. Remove porta default e querystring. */
export function normalizeBaseUrl(rawUrl: string): {
  baseUrl: string;
  queryParams: Array<[string, string]>;
} {
  const url = new URL(rawUrl);
  const scheme = url.protocol.replace(":", "").toLowerCase();
  const host = url.hostname.toLowerCase();
  const port = url.port;
  const isDefaultPort =
    (scheme === "http" && (port === "" || port === "80")) ||
    (scheme === "https" && (port === "" || port === "443"));
  const portSegment = isDefaultPort ? "" : `:${port}`;
  const path = url.pathname || "/";
  const baseUrl = `${scheme}://${host}${portSegment}${path}`;

  const queryParams: Array<[string, string]> = [];
  for (const [k, v] of url.searchParams.entries()) {
    queryParams.push([k, v]);
  }
  return { baseUrl, queryParams };
}

function flattenParams(
  input: Record<string, string | string[]> | undefined,
): Array<[string, string]> {
  if (!input) return [];
  const out: Array<[string, string]> = [];
  for (const [k, v] of Object.entries(input)) {
    if (Array.isArray(v)) {
      for (const item of v) out.push([k, item]);
    } else {
      out.push([k, v]);
    }
  }
  return out;
}

/** Concatena, percent-encoda e ordena os parametros. RFC 5849 §3.4.1.3.2. */
export function buildParameterString(
  params: Array<[string, string]>,
): string {
  const encoded = params.map<[string, string]>(([k, v]) => [
    percentEncode(k),
    percentEncode(v),
  ]);
  encoded.sort((a, b) => {
    if (a[0] !== b[0]) return a[0] < b[0] ? -1 : 1;
    return a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0;
  });
  return encoded.map(([k, v]) => `${k}=${v}`).join("&");
}

export function buildSignatureBaseString(
  method: string,
  baseUrl: string,
  parameterString: string,
): string {
  return [
    method.toUpperCase(),
    percentEncode(baseUrl),
    percentEncode(parameterString),
  ].join("&");
}

export function buildSigningKey(
  consumerSecret: string,
  tokenSecret: string,
): string {
  // Mesmo com tokenSecret vazio, o "&" deve estar presente.
  return `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
}

export function hmacSha1Base64(key: string, message: string): string {
  return createHmac("sha1", key).update(message).digest("base64");
}

function newNonce(): string {
  return randomBytes(16).toString("hex");
}

function newTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

/**
 * Gera um request assinado para OAuth 1.0 HMAC-SHA1. Determinismo nos
 * testes: passe `nonce` e `timestamp` via input. A funcao nao executa
 * nenhuma chamada de rede.
 */
export function signRequest(
  credentials: OAuth1ClientCredentials,
  input: SignRequestInput,
): SignedRequest {
  const { baseUrl, queryParams } = normalizeBaseUrl(input.url);
  const bodyParams = flattenParams(input.params);

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: credentials.consumerKey,
    oauth_nonce: input.nonce ?? newNonce(),
    oauth_signature_method: SIGNATURE_METHOD,
    oauth_timestamp: input.timestamp ?? newTimestamp(),
    oauth_version: OAUTH_VERSION,
  };
  // oauth_token e omitido no fluxo de "request token" (RFC 5849 §2.1).
  // Quando vazio, nao entra nem na assinatura nem no header.
  if (credentials.accessToken !== "") {
    oauthParams["oauth_token"] = credentials.accessToken;
  }

  // Junta todos os params (query + body + oauth) para a assinatura.
  const allParams: Array<[string, string]> = [
    ...queryParams,
    ...bodyParams,
    ...Object.entries(oauthParams),
  ];

  const parameterString = buildParameterString(allParams);
  const baseString = buildSignatureBaseString(
    input.method,
    baseUrl,
    parameterString,
  );
  const signingKey = buildSigningKey(
    credentials.consumerSecret,
    credentials.tokenSecret,
  );
  const signature = hmacSha1Base64(signingKey, baseString);

  oauthParams["oauth_signature"] = signature;

  const authorizationHeader = buildAuthorizationHeader(
    oauthParams,
    input.realm,
  );

  return {
    method: input.method.toUpperCase(),
    url: input.url,
    authorizationHeader,
    baseString,
    signature,
    oauthParams: { ...oauthParams },
  };
}

/** RFC 5849 §3.5.1. Apenas oauth_* + realm vao no header. */
export function buildAuthorizationHeader(
  oauthParams: Record<string, string>,
  realm?: string,
): string {
  const pairs: string[] = [];
  if (realm !== undefined) pairs.push(`realm="${percentEncode(realm)}"`);
  const sortedKeys = Object.keys(oauthParams).sort();
  for (const k of sortedKeys) {
    if (!k.startsWith("oauth_")) continue;
    const v = oauthParams[k];
    if (v === undefined) continue;
    pairs.push(`${percentEncode(k)}="${percentEncode(v)}"`);
  }
  return `OAuth ${pairs.join(", ")}`;
}
