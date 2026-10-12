import type { RESTOptions, ResponseLike } from "@discordjs/rest";
import { DEFAULT_IDS, snowflake } from "../fixtures/ids.js";
import { buildMessage } from "../fixtures/message.js";

/** Copied from `RESTOptions.makeRequest` to take over the exact undici `RequestInit` type. */
type MakeRequest = RESTOptions["makeRequest"];

/** A captured outgoing REST call, prepared for test assertions. */
export interface CapturedRequest {
  method: string;
  url: string;
  /** JSON-parsed body, if present (discord.js sends REST bodies as JSON). */
  body: unknown;
}

/** What a responder learns about the call it answers. */
export interface RestResponderContext {
  /** Match of the path pattern – capture groups are e.g. a channel or guild id. */
  match: RegExpMatchArray;
  request: CapturedRequest;
}

/**
 * Returns the JSON body Discord would have answered a call with.
 * `undefined` means: this responder isn't responsible, the next one (or the
 * empty 204 response) takes over.
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
 * Fake `RESTOptions.makeRequest` – replaces `@discordjs/rest`'s real undici
 * transport. Records every outgoing call and answers it without any network
 * request: routes Discord answers with a message get a real `APIMessage`
 * (otherwise e.g. `channel.send()` fails while building its return value),
 * everything else an empty 204 response – unless a test registered more via
 * `respond()`.
 *
 * Not part of the public probe.ts API – only used internally via
 * `createProbe`.
 */
export class RestAdapter {
  readonly requests: CapturedRequest[] = [];

  /** Id of the message the bot created last – default `messageId` for `probe.button()`/`selectMenu()`. */
  lastMessageId: string | undefined;

  /** `client.login()` fetches this before the actual gateway connect. */
  private readonly gatewayBotInfo = {
    url: "wss://gateway.discord.gg/",
    shards: 1,
    session_start_limit: { total: 1000, remaining: 1000, reset_after: 0, max_concurrency: 1 },
  };

  /** Routes registered by tests first, then the built-in message routes. */
  private readonly routes: Route[] = [
    { method: "POST", path: /\/channels\/(\d+)\/messages$/, respond: ({ match, request }) => this.message(match[1], request.body) },
    { method: "PATCH", path: /\/channels\/(\d+)\/messages\/(\d+)$/, respond: ({ match, request }) => this.message(match[1], request.body, match[2]) },
    // interaction follow-ups (`followUp()`) and edits of the reply (`editReply()`)
    { method: "POST", path: /\/webhooks\/\d+\/[^/]+$/, respond: ({ request }) => this.message(undefined, request.body) },
    { method: "PATCH", path: /\/webhooks\/\d+\/[^/]+\/messages\/[^/]+$/, respond: ({ request }) => this.message(undefined, request.body) },
  ];

  /** Registers a response for `method` + path pattern; takes precedence over the built-in routes. */
  respond(method: string, path: RegExp, responder: RestResponder): void {
    this.routes.unshift({ method: method.toUpperCase(), path, respond: responder });
  }

  /** Passed to the discord.js client as `RESTOptions.makeRequest`. */
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

  /** The message Discord returns for a send/edit: the sent body on top of a complete `APIMessage`. */
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
