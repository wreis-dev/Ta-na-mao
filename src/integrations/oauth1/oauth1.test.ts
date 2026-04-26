import { describe, expect, it } from "vitest";

import {
  buildAuthorizationHeader,
  buildParameterString,
  buildSignatureBaseString,
  buildSigningKey,
  hmacSha1Base64,
  normalizeBaseUrl,
  percentEncode,
  signRequest,
} from "./index.js";

describe("percentEncode (RFC 3986)", () => {
  it("preserva caracteres unreserved", () => {
    expect(percentEncode("AZaz09-._~")).toBe("AZaz09-._~");
  });

  it("encoda espaco como %20 (nao +) e simbolos especiais", () => {
    expect(percentEncode("a b")).toBe("a%20b");
    expect(percentEncode("!*\u0027()")).toBe("%21%2A%27%28%29");
  });

  it("encoda UTF-8 corretamente", () => {
    expect(percentEncode("ç")).toBe("%C3%A7");
    expect(percentEncode("você")).toBe("voc%C3%AA");
  });

  it("e estavel em chamadas repetidas (sem flag /g stateful)", () => {
    for (let i = 0; i < 5; i++) {
      expect(percentEncode("a b")).toBe("a%20b");
    }
  });
});

describe("normalizeBaseUrl (RFC 5849 §3.4.1.2)", () => {
  it("remove porta default, lowercase host e descarta querystring", () => {
    const r = normalizeBaseUrl("HTTPS://API.Example.COM:443/Resource?a=1&b=2");
    expect(r.baseUrl).toBe("https://api.example.com/Resource");
    expect(r.queryParams).toEqual([
      ["a", "1"],
      ["b", "2"],
    ]);
  });

  it("preserva porta nao-default", () => {
    const r = normalizeBaseUrl("http://example.com:8080/x");
    expect(r.baseUrl).toBe("http://example.com:8080/x");
  });
});

describe("buildParameterString", () => {
  it("ordena por chave e por valor secundariamente", () => {
    const out = buildParameterString([
      ["b", "2"],
      ["a", "x"],
      ["a", "1"],
    ]);
    expect(out).toBe("a=1&a=x&b=2");
  });

  it("aplica percent-encoding antes de ordenar", () => {
    const out = buildParameterString([
      ["a", "hello world"],
      ["b", "foo"],
    ]);
    expect(out).toBe("a=hello%20world&b=foo");
  });
});

describe("buildSigningKey", () => {
  it("inclui o & mesmo com tokenSecret vazio", () => {
    expect(buildSigningKey("cs", "")).toBe("cs&");
    expect(buildSigningKey("cs", "ts")).toBe("cs&ts");
  });

  it("encoda os secrets", () => {
    expect(buildSigningKey("c s", "t&s")).toBe("c%20s&t%26s");
  });
});

describe("hmacSha1Base64 (vetor conhecido RFC 2202)", () => {
  // HMAC-SHA1("key", "The quick brown fox jumps over the lazy dog")
  // = de7c9b85b8b78aa6bc8a7a36f70a90701c9db4d9 (hex)
  it("calcula HMAC-SHA1 corretamente", () => {
    const out = hmacSha1Base64(
      "key",
      "The quick brown fox jumps over the lazy dog",
    );
    expect(out).toBe("3nybhbi3iqa8ino29wqQcBydtNk=");
  });
});

describe("signRequest determinismo (vetor A custom)", () => {
  it("produz baseString e signature esperadas", () => {
    const result = signRequest(
      {
        consumerKey: "ckey",
        consumerSecret: "csecret",
        accessToken: "tkey",
        tokenSecret: "tsecret",
      },
      {
        method: "GET",
        url: "https://api.example.com/resource",
        params: { a: "hello world", b: "foo" },
        nonce: "nonce123",
        timestamp: "1700000000",
      },
    );

    expect(result.baseString).toBe(
      "GET&https%3A%2F%2Fapi.example.com%2Fresource&a%3Dhello%2520world%26b%3Dfoo%26oauth_consumer_key%3Dckey%26oauth_nonce%3Dnonce123%26oauth_signature_method%3DHMAC-SHA1%26oauth_timestamp%3D1700000000%26oauth_token%3Dtkey%26oauth_version%3D1.0",
    );
    expect(result.signature).toBe("2x1IuTHoKJter1XUkPPJ8bL1HUw=");
    expect(result.authorizationHeader).toContain('oauth_signature_method="HMAC-SHA1"');
    expect(result.authorizationHeader).toContain('oauth_consumer_key="ckey"');
    expect(result.authorizationHeader).toContain('oauth_signature="2x1IuTHoKJter1XUkPPJ8bL1HUw%3D"');
  });

  it("aceita realm opcional sem incluir na assinatura", () => {
    const a = signRequest(
      { consumerKey: "ckey", consumerSecret: "csecret", accessToken: "tkey", tokenSecret: "tsecret" },
      { method: "GET", url: "https://api.example.com/resource", nonce: "n", timestamp: "1" },
    );
    const b = signRequest(
      { consumerKey: "ckey", consumerSecret: "csecret", accessToken: "tkey", tokenSecret: "tsecret" },
      { method: "GET", url: "https://api.example.com/resource", nonce: "n", timestamp: "1", realm: "MyRealm" },
    );
    expect(a.signature).toBe(b.signature);
    expect(b.authorizationHeader.startsWith('OAuth realm="MyRealm"')).toBe(true);
    expect(a.authorizationHeader.startsWith('OAuth realm="')).toBe(false);
  });
});

describe("signRequest fluxo request-token (oauth_token vazio)", () => {
  it("omite oauth_token na assinatura quando accessToken esta vazio", () => {
    const result = signRequest(
      {
        consumerKey: "9djdj82h48djs9d2",
        consumerSecret: "j49sk3j29djd",
        accessToken: "",
        tokenSecret: "",
      },
      {
        method: "POST",
        url: "http://example.com/request",
        nonce: "7d8f3e4a",
        timestamp: "137131201",
      },
    );

    expect(result.baseString).toBe(
      "POST&http%3A%2F%2Fexample.com%2Frequest&oauth_consumer_key%3D9djdj82h48djs9d2%26oauth_nonce%3D7d8f3e4a%26oauth_signature_method%3DHMAC-SHA1%26oauth_timestamp%3D137131201%26oauth_version%3D1.0",
    );
    expect(result.signature).toBe("iOIxHeWxzeLwUBP7FBb2zhJDQAI=");
    expect(result.authorizationHeader).not.toContain("oauth_token=");
  });
});

describe("buildAuthorizationHeader", () => {
  it("ordena oauth_* alfabeticamente", () => {
    const header = buildAuthorizationHeader({
      oauth_signature: "abc",
      oauth_consumer_key: "ck",
      oauth_nonce: "n",
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: "1",
      oauth_token: "t",
      oauth_version: "1.0",
    });
    expect(header.indexOf("oauth_consumer_key")).toBeLessThan(
      header.indexOf("oauth_nonce"),
    );
    expect(header.indexOf("oauth_signature_method")).toBeGreaterThan(
      header.indexOf("oauth_signature"),
    );
  });

  it("ignora chaves que nao sao oauth_*", () => {
    const header = buildAuthorizationHeader({
      foo: "bar",
      oauth_consumer_key: "ck",
    } as Record<string, string>);
    expect(header).toContain("oauth_consumer_key");
    expect(header).not.toContain("foo=");
  });
});
