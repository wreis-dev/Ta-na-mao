import { describe, expect, it } from "vitest";

import { buildTrelloRequest } from "./client.js";
import { loadTrelloConfig } from "./config.js";

const FAKE_CREDS = {
  consumerKey: "fake_ckey",
  consumerSecret: "fake_csecret",
  accessToken: "fake_token",
  tokenSecret: "fake_tsecret",
};

describe("loadTrelloConfig", () => {
  it("retorna ok=true com credenciais quando todas as envs presentes", () => {
    const result = loadTrelloConfig({
      TRELLO_OAUTH_CONSUMER_KEY: "ck",
      TRELLO_OAUTH_CONSUMER_SECRET: "cs",
      TRELLO_OAUTH_ACCESS_TOKEN: "at",
      TRELLO_OAUTH_TOKEN_SECRET: "ts",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.credentials.consumerKey).toBe("ck");
      expect(result.credentials.tokenSecret).toBe("ts");
    }
  });

  it("retorna missing[] sem expor valores parciais", () => {
    const result = loadTrelloConfig({
      TRELLO_OAUTH_CONSUMER_KEY: "ck",
      TRELLO_OAUTH_CONSUMER_SECRET: "  ",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missing).toEqual([
        "TRELLO_OAUTH_CONSUMER_SECRET",
        "TRELLO_OAUTH_ACCESS_TOKEN",
        "TRELLO_OAUTH_TOKEN_SECRET",
      ]);
      // Garantir que valores nunca aparecem na resposta de erro
      expect(JSON.stringify(result)).not.toContain("ck");
    }
  });
});

describe("buildTrelloRequest", () => {
  it("monta URL absoluta a partir do path relativo", () => {
    const req = buildTrelloRequest(FAKE_CREDS, {
      method: "GET",
      path: "/members/me",
      nonce: "n",
      timestamp: "1700000000",
    });
    expect(req.url).toBe("https://api.trello.com/1/members/me");
    expect(req.method).toBe("GET");
  });

  it("inclui Authorization header OAuth", () => {
    const req = buildTrelloRequest(FAKE_CREDS, {
      method: "GET",
      path: "/members/me",
      nonce: "n",
      timestamp: "1700000000",
    });
    expect(req.headers.Authorization).toMatch(/^OAuth /);
    expect(req.headers.Authorization).toContain('oauth_consumer_key="fake_ckey"');
    expect(req.headers.Authorization).toContain('oauth_signature_method="HMAC-SHA1"');
    expect(req.headers.Authorization).toContain("oauth_signature=");
  });

  it("e deterministico com mesmos nonce/timestamp/params", () => {
    const a = buildTrelloRequest(FAKE_CREDS, {
      method: "POST",
      path: "/cards",
      params: { name: "Card X", idList: "abc123" },
      nonce: "stable",
      timestamp: "1700000000",
    });
    const b = buildTrelloRequest(FAKE_CREDS, {
      method: "POST",
      path: "/cards",
      params: { name: "Card X", idList: "abc123" },
      nonce: "stable",
      timestamp: "1700000000",
    });
    expect(a.signed.signature).toBe(b.signed.signature);
    expect(a.headers.Authorization).toBe(b.headers.Authorization);
  });

  it("nao executa rede: retorno e apenas a descricao da requisicao", () => {
    // Nao espiamos fetch porque nao chamamos. Garantia estrutural:
    const req = buildTrelloRequest(FAKE_CREDS, {
      method: "GET",
      path: "/members/me",
      nonce: "n",
      timestamp: "1",
    });
    // Estrutura simples - sem promises pendentes, sem stream.
    expect(typeof req.method).toBe("string");
    expect(typeof req.url).toBe("string");
    expect(typeof req.headers.Authorization).toBe("string");
  });
});
