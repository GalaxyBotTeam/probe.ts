import type { RESTOptions, ResponseLike } from "@discordjs/rest";
import { DEFAULT_IDS, snowflake } from "../fixtures/ids.js";
import { buildMessage } from "../fixtures/message.js";

/** Kopiert von `RESTOptions.makeRequest`, um den exakten undici-`RequestInit`-Typ zu übernehmen. */
type MakeRequest = RESTOptions["makeRequest"];

/** Ein abgefangener ausgehender REST-Call, für Test-Assertions aufbereitet. */
export interface CapturedRequest {
  method: string;
  url: string;
  /** JSON-geparster Body, falls vorhanden (discord.js sendet REST-Bodies als JSON). */
  body: unknown;
}

/** Was ein Responder über den Call erfährt, den er beantwortet. */
export interface RestResponderContext {
  /** Treffer des Pfad-Patterns – Capture-Gruppen sind z.B. Channel- oder Guild-Id. */
  match: RegExpMatchArray;
  request: CapturedRequest;
}

/**
 * Liefert den JSON-Body, mit dem Discord auf einen Call geantwortet hätte.
 * `undefined` heißt: dieser Responder ist nicht zuständig, der nächste (oder
 * die leere 204-Antwort) übernimmt.
 */
export type RestResponder = (context: RestResponderContext) => unknown;

interface Route {
  method: string;
  path: RegExp;
  respond: RestResponder;
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
 * ohne dass ein Netzwerk-Request stattfindet: Routen, auf die Discord mit
 * einer Nachricht antwortet, bekommen eine echte `APIMessage` (sonst scheitert
 * z.B. `channel.send()` beim Bauen seines Rückgabewerts), alles andere eine
 * leere 204-Antwort – außer ein Test hat über `respond()` mehr hinterlegt.
 *
 * Nicht Teil der öffentlichen probe.ts-API – nur intern via `createProbe`
 * verwendet.
 */
export class RestAdapter {
  readonly requests: CapturedRequest[] = [];

  /** Id der zuletzt vom Bot erstellten Nachricht – Default-`messageId` für `probe.button()`/`selectMenu()`. */
  lastMessageId: string | undefined;

  /** `client.login()` ruft das vor dem eigentlichen Gateway-Connect ab. */
  private readonly gatewayBotInfo = {
    url: "wss://gateway.discord.gg/",
    shards: 1,
    session_start_limit: { total: 1000, remaining: 1000, reset_after: 0, max_concurrency: 1 },
  };

  /** Selbst hinterlegte Routen zuerst, dann die eingebauten Nachrichten-Routen. */
  private readonly routes: Route[] = [
    { method: "POST", path: /\/channels\/(\d+)\/messages$/, respond: ({ match, request }) => this.message(match[1], request.body) },
    { method: "PATCH", path: /\/channels\/(\d+)\/messages\/(\d+)$/, respond: ({ match, request }) => this.message(match[1], request.body, match[2]) },
    // Interaction-Follow-ups (`followUp()`) und Edits der Antwort (`editReply()`)
    { method: "POST", path: /\/webhooks\/\d+\/[^/]+$/, respond: ({ request }) => this.message(undefined, request.body) },
    { method: "PATCH", path: /\/webhooks\/\d+\/[^/]+\/messages\/[^/]+$/, respond: ({ request }) => this.message(undefined, request.body) },
  ];

  /** Hinterlegt eine Antwort für `method` + Pfad-Pattern; hat Vorrang vor den eingebauten Routen. */
  respond(method: string, path: RegExp, responder: RestResponder): void {
    this.routes.unshift({ method: method.toUpperCase(), path, respond: responder });
  }

  /** Als `RESTOptions.makeRequest` an den discord.js-Client übergeben. */
  makeRequest: MakeRequest = async (url, init) => {
    if (url.includes("/gateway/bot")) {
      return jsonResponse(200, this.gatewayBotInfo);
    }

    const request: CapturedRequest = {
      method: init.method ?? "GET",
      url,
      body: typeof init.body === "string" ? JSON.parse(init.body) : null,
    };
    this.requests.push(request);

    const path = new URL(url).pathname;
    for (const route of this.routes) {
      const match = route.method === request.method ? path.match(route.path) : null;
      if (!match) continue;
      const data = route.respond({ match, request });
      if (data !== undefined) return jsonResponse(200, data);
    }
    return emptyResponse;
  };

  /** Die Nachricht, die Discord für einen Send/Edit zurückgibt: der gesendete Body auf einer vollständigen `APIMessage`. */
  private message(channelId: string | undefined, body: unknown, id: string = snowflake()): unknown {
    const message = {
      ...buildMessage({ id, channel: { id: channelId ?? DEFAULT_IDS.channel }, author: { id: DEFAULT_IDS.bot, username: "probe", bot: true } }),
      timestamp: new Date().toISOString(),
      ...(typeof body === "object" && body !== null ? body : {}),
    };
    this.lastMessageId = id;
    return message;
  }
}
