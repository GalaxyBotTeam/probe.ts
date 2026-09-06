import type { RESTOptions, ResponseLike } from "@discordjs/rest";

/** Kopiert von `RESTOptions.makeRequest`, um den exakten undici-`RequestInit`-Typ zu übernehmen. */
type MakeRequest = RESTOptions["makeRequest"];

/** Ein abgefangener ausgehender REST-Call, für Test-Assertions aufbereitet. */
export interface CapturedRequest {
  method: string;
  url: string;
  /** JSON-geparster Body, falls vorhanden (discord.js sendet REST-Bodies als JSON). */
  body: unknown;
}

function jsonResponse(status: number, data: unknown): ResponseLike {
  const text = JSON.stringify(data);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "",
    bodyUsed: false,
    body: null,
    headers: {
      get: (name: string) => (name.toLowerCase() === "content-type" ? "application/json" : null),
    } as unknown as ResponseLike["headers"],
    json: async () => data,
    text: async () => text,
    arrayBuffer: async () => new TextEncoder().encode(text).buffer,
  };
}

const emptyResponse: ResponseLike = {
  ok: true,
  status: 204,
  statusText: "No Content",
  bodyUsed: false,
  body: null,
  headers: { get: () => null } as unknown as ResponseLike["headers"],
  json: async () => {
    throw new Error("no body");
  },
  text: async () => "",
  arrayBuffer: async () => new ArrayBuffer(0),
};

/**
 * Fake `RESTOptions.makeRequest` – ersetzt `@discordjs/rest`'s echten
 * undici-Transport. Zeichnet jeden ausgehenden Call auf und beantwortet ihn,
 * ohne dass ein Netzwerk-Request stattfindet.
 *
 * Nicht Teil der öffentlichen probe.ts-API – nur intern via `createProbe`
 * verwendet.
 */
export class RestAdapter {
  readonly requests: CapturedRequest[] = [];

  /** `client.login()` ruft das vor dem eigentlichen Gateway-Connect ab. */
  private readonly gatewayBotInfo = {
    url: "wss://gateway.discord.gg/",
    shards: 1,
    session_start_limit: { total: 1000, remaining: 1000, reset_after: 0, max_concurrency: 1 },
  };

  /** Als `RESTOptions.makeRequest` an den discord.js-Client übergeben. */
  makeRequest: MakeRequest = async (url, init) => {
    if (url.includes("/gateway/bot")) {
      return jsonResponse(200, this.gatewayBotInfo);
    }

    this.requests.push({
      method: init.method ?? "GET",
      url,
      body: typeof init.body === "string" ? JSON.parse(init.body) : null,
    });

    return emptyResponse;
  };
}
