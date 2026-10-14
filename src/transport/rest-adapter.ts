import type { RESTOptions, ResponseLike } from "@discordjs/rest";
import { DEFAULT_IDS, snowflake } from "../fixtures/ids.js";
import { buildMessage } from "../fixtures/message.js";
import type { TimelineEvent } from "../core/timeline.js";

/** Copied from `RESTOptions.makeRequest` to take over the exact undici `RequestInit` type. */
type MakeRequest = RESTOptions["makeRequest"];

/** A captured outgoing REST call, prepared for test assertions. */
export interface CapturedRequest {
  method: string;
  url: string;
  /** JSON-parsed body, if present (discord.js sends REST bodies as JSON). */
  body: unknown;
  /** Status probe.ts answered with – 4xx/5xx for a `restError()`, otherwise 200/204. */
  status: number;
}

/** What a responder learns about the call it answers. */
export interface RestResponderContext {
  /** Match of the path pattern – capture groups are e.g. a channel or guild id. */
  match: RegExpMatchArray;
  request: Omit<CapturedRequest, "status">;
}

/**
 * Returns the JSON body Discord would have answered a call with, or a
 * `restError(...)` for a failed call. `undefined` means: this responder isn't
 * responsible, the next one (or the empty 204 response) takes over.
 */
export type RestResponder = (context: RestResponderContext) => unknown;

/** A failed Discord answer, created by `restError()`. */
export class RestErrorResponse {
  constructor(
    readonly status: number,
    readonly body: unknown,
    readonly headers: Readonly<Record<string, string>>,
  ) {}
}

/**
 * Lets a `probe.respond()` responder fail the call like Discord would –
 * discord.js then throws a real `DiscordAPIError` (or handles a 429 itself):
 *
 * ```ts
 * probe.respond("GET", /\/channels\/\d+$/, () => restError(404, { code: 10003, message: "Unknown Channel" }));
 * ```
 *
 * A 429 needs a `Retry-After` header (seconds) – discord.js waits that long
 * and sends the call again, so let the responder fail only once (return
 * `undefined` afterwards), otherwise it retries forever.
 *
 * A 5xx is no `DiscordAPIError`: `@discordjs/rest` retries it
 * (`rest.retries`, default 3) and then throws an `HTTPError` – pass
 * `rest: { retries: 0 }` to the client to fail on the first call.
 */
export function restError(status: number, body: unknown = {}, headers: Record<string, string> = {}): RestErrorResponse {
  return new RestErrorResponse(status, body, headers);
}

interface Route {
  method: string;
  path: RegExp;
  respond: RestResponder;
}

function jsonResponse(status: number, data: unknown, headers: Record<string, string> = {}): ResponseLike {
  const text = JSON.stringify(data);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "",
    bodyUsed: false,
    body: null,
    // undici's `Headers` type differs from the global one only in its iterator typings
    headers: new Headers({ ...headers, "content-type": "application/json" }) as unknown as ResponseLike["headers"],
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
  headers: new Headers() as unknown as ResponseLike["headers"],
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

  constructor(private readonly record: (event: TimelineEvent) => void) {}

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

    const request = {
      method: init.method ?? "GET",
      url,
      body: typeof init.body === "string" ? JSON.parse(init.body) : null,
    };
    const answer = (status: number, response: unknown): void => {
      this.requests.push({ ...request, status });
      this.record({ kind: "request", ...request, status, response });
    };

    const path = new URL(url).pathname;
    for (const route of this.routes) {
      const match = route.method === request.method ? path.match(route.path) : null;
      if (!match) continue;
      const data = route.respond({ match, request });
      if (data instanceof RestErrorResponse) {
        answer(data.status, data.body);
        return jsonResponse(data.status, data.body, { ...data.headers });
      }
      if (data !== undefined) {
        answer(200, data);
        return jsonResponse(200, data);
      }
    }
    answer(204, null);
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
