export type OAuth1SignatureMethod = "HMAC-SHA1";

export interface OAuth1ClientCredentials {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  tokenSecret: string;
}

export interface SignRequestInput {
  method: string;
  url: string;
  /**
   * Parametros adicionais (query da URL + corpo x-www-form-urlencoded).
   * Nao incluir oauth_*, eles sao adicionados pelo signer.
   */
  params?: Record<string, string | string[]>;
  /** Realm opcional, sai como `realm="..."` no header. Nao entra na assinatura. */
  realm?: string;
  /** Permite injecao deterministica nos testes. */
  nonce?: string;
  timestamp?: string;
}

export interface SignedRequest {
  method: string;
  url: string;
  authorizationHeader: string;
  baseString: string;
  signature: string;
  oauthParams: Record<string, string>;
}
