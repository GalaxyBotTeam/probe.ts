import type { REST } from "@discordjs/rest";
import type { Client } from "discord.js";
import type {
  ApplicationFlags,
  GatewayDispatchPayload,
  GatewayInteractionCreateDispatch,
  GatewayReadyDispatchData,
} from "discord-api-types/v10";
import { buildGatewayEventDispatches, type GatewayEventName, type GatewayEventOverrides } from "../events/gateway-event.js";
import { buildGuildCreateDispatch } from "../fixtures/guild-create.js";
import { DEFAULT_IDS } from "../fixtures/ids.js";
import { createContextMenuInvocation, type ContextMenuInvocation } from "../interactions/context-menu.js";
import { createButtonInvocation, createSelectMenuInvocation, type ButtonInvocation, type SelectMenuInvocation } from "../interactions/message-component.js";
import { createModalSubmitInvocation, type ModalSubmitInvocation } from "../interactions/modal.js";
import { parseModal, parseReply, type ModalContent, type ReplyContent } from "../interactions/replies.js";
import { createSlashCommandInvocation, type SlashCommandInvocation } from "../interactions/slash-command.js";
import { GatewayAdapter } from "../transport/gateway-adapter.js";
import { type CapturedRequest, RestAdapter, type RestResponder } from "../transport/rest-adapter.js";
import { Timeline, type TimelineEntry } from "./timeline.js";

/** Waits until `condition()` becomes true, or throws after `timeoutMs` (default: 1000ms). */
async function waitUntil(condition: () => boolean, timeoutMs = 1000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() >= deadline) {
      throw new Error(`probe.ts: timeout (${timeoutMs}ms) while waiting for a response from the bot`);
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

/** Minimal READY payload – enough for discord.js to report "AllReady" right away. */
const FAKE_READY_DATA = {
  v: 10,
  user: { id: DEFAULT_IDS.bot, username: "probe", discriminator: "0000", global_name: null, avatar: null, bot: true },
  guilds: [],
  session_id: "probe-session",
  resume_gateway_url: "wss://gateway.discord.gg",
  shard: [0, 1],
  application: { id: DEFAULT_IDS.application, flags: 0 as ApplicationFlags, flags_new: "0" },
} satisfies GatewayReadyDispatchData;

/**
 * Drives a discord.js `Client` through the fake transport layer: injects
 * gateway events instead of connecting, and captures REST calls instead of
 * sending them. See `src/transport/README.md` for the architecture rationale.
 */
export interface Probe {
  /** Logs the client in against the fake transport and reports it "Ready" – `login()` + `ready()` in one. */
  setup(): Promise<void>;
  /**
   * Only the login against the fake transport, without READY. For bots that
   * register their event handlers only after `client.login()`: let the bot
   * finish booting first, then call `ready()`.
   */
  login(): Promise<void>;
  /** Reports the logged-in client "Ready" (fires `clientReady`). */
  ready(): void;
  /** Tears the client down cleanly (no real socket, but timers/listeners). */
  teardown(): Promise<void>;
  /** Injects a raw gateway dispatch event (e.g. `INTERACTION_CREATE`). */
  injectDispatch(payload: GatewayDispatchPayload): void;
  /**
   * Injects a generic gateway event (e.g. `guildMemberAdd`, `messageCreate`)
   * through the matching fixture builders – seeds a guild/channel into the
   * client cache first when needed (see `src/events/gateway-event.ts`).
   * Synchronous like `injectDispatch()`: wait for asynchronous bot reactions
   * (e.g. a sent welcome message) with `vi.waitFor(...)`.
   */
  emit<K extends GatewayEventName>(eventName: K, overrides?: GatewayEventOverrides[K]): void;
  /** All outgoing REST calls captured so far, in order. */
  capturedRequests(): readonly CapturedRequest[];
  /**
   * Everything that crossed the fake transport so far – injected gateway
   * events and the bot's REST calls with probe.ts's answers – in order, with
   * `at` in ms since `createProbe()`. For debugging a failing test.
   */
  timeline(): readonly TimelineEntry[];
  /**
   * Writes `timeline()` as JSON to `filePath` (folders are created), e.g. in
   * an `afterEach` hook: `await probe.exportTimeline(\`traces/${name}.json\`)`.
   */
  exportTimeline(filePath: string): Promise<void>;
  /** Builds a slash command invocation (`.withOptions(...).invoke()`). Subcommands as in Discord: `"ticket close"`, `"ticket admin close"`. */
  slashCommand(name: string): SlashCommandInvocation;
  /** Builds a context menu command (`.onUser(...)` / `.onMessage(...)`), e.g. `probe.contextMenu("Warn").onUser({ id: "42" })`. */
  contextMenu(name: string): ContextMenuInvocation;
  /**
   * Builds a button click (`.click()`) on the message the bot sent last
   * (before the first one: `DEFAULT_IDS.message`) – so collectors bound to
   * that message fire too.
   */
  button(customId: string): ButtonInvocation;
  /** Builds a select menu choice (`.withValues([...]).select()`), like `button()` on the message sent last. Currently covers string selects only. */
  selectMenu(customId: string): SelectMenuInvocation;
  /**
   * Registers what Discord answers for `method` + path (regex against the URL
   * path) – for routes where the bot expects a body, e.g.
   * `probe.respond("GET", /\/guilds\/\d+\/invites$/, () => [])`. Takes
   * precedence over the built-in message routes; without a matching route
   * the response is an empty 204. Return `restError(status, body)` to let
   * the call fail like Discord would (404, 403, 429, ...).
   */
  respond(method: string, path: RegExp, responder: RestResponder): void;
  /** Builds a modal submit (`.withFields({...}).submit()`). */
  modal(customId: string): ModalSubmitInvocation;
  /** The content of the reply sent last (`reply`/`editReply`), or `undefined` if none came yet. */
  lastReply(): ReplyContent | undefined;
  /** The contents of all replies sent so far, in order. */
  allReplies(): ReplyContent[];
  /** The modal shown last via `interaction.showModal(...)`, or `undefined` if none came yet. */
  lastModal(): ModalContent | undefined;
  /** All modals shown so far, in order. */
  allModals(): ModalContent[];
}

/**
 * Builds a probe around a discord.js `Client`. Replaces `client.rest` and
 * `client.options.ws.buildStrategy` before `setup()` calls `login()` – the
 * bot code itself stays unchanged and gets real discord.js objects.
 */
export function createProbe(client: Client): Probe {
  const timeline = new Timeline();
  const rest = new RestAdapter(timeline.record);
  // The client's own REST class, not our import: with ESM and CJS copies of @discordjs/rest
  // side by side, `error instanceof DiscordAPIError` in bot code would fail otherwise.
  const ClientREST = client.rest.constructor as typeof REST;
  client.rest = new ClientREST({ ...client.options.rest, makeRequest: rest.makeRequest });

  let gateway: GatewayAdapter | undefined;
  client.options.ws = {
    ...client.options.ws,
    buildStrategy: (manager) => {
      gateway = new GatewayAdapter(manager, timeline.record);
      return gateway;
    },
  };

  function requireGateway(): GatewayAdapter {
    if (!gateway) {
      throw new Error("probe.ts: setup() or login() must be called before injectDispatch()/emit()/ready()");
    }
    return gateway;
  }

  function allReplies(): ReplyContent[] {
    return rest.requests.map(parseReply).filter((reply): reply is ReplyContent => reply !== undefined);
  }

  function allModals(): ModalContent[] {
    return rest.requests.map(parseModal).filter((modal): modal is ModalContent => modal !== undefined);
  }

  /** Waits for at least one new REST call – shared base of every fluent invocation (slash command, button, select menu, modal). */
  async function waitForNextRequest(): Promise<void> {
    const baseline = rest.requests.length;
    await waitUntil(() => rest.requests.length > baseline);
  }

  /**
   * Injects an interaction (slash command, button, select menu, modal) –
   * invisibly seeds the interaction's guild and channel first (see
   * `buildGuildCreateDispatch`) so `interaction.channel` resolves for real
   * (discord.js doesn't cache the channel otherwise, see
   * `src/events/README.md` for the same rule for gateway events). Only for
   * the fluent invocations (`slashCommand`/`button`/`selectMenu`/`modal`) –
   * the raw `injectDispatch()` deliberately stays without seeding.
   */
  function injectInteraction(dispatch: GatewayInteractionCreateDispatch): void {
    const gateway = requireGateway();
    const { guild_id: guildId, channel } = dispatch.d;
    gateway.injectDispatch(
      buildGuildCreateDispatch({
        ...(guildId ? { id: guildId } : {}),
        ...(channel ? { channel: { id: channel.id, type: channel.type } } : {}),
      }),
    );
    gateway.injectDispatch(dispatch);
  }

  async function login(): Promise<void> {
    await client.login("probe.ts-fake-token");
  }

  function ready(): void {
    requireGateway().injectReady(FAKE_READY_DATA);
  }

  return {
    async setup() {
      await login();
      ready();
    },
    login,
    ready,
    async teardown() {
      await client.destroy();
    },
    injectDispatch(payload) {
      requireGateway().injectDispatch(payload);
    },
    emit(eventName, overrides) {
      const gateway = requireGateway();
      for (const dispatch of buildGatewayEventDispatches(eventName, overrides)) {
        gateway.injectDispatch(dispatch);
      }
    },
    capturedRequests() {
      return rest.requests;
    },
    timeline() {
      return timeline.entries;
    },
    exportTimeline(filePath) {
      return timeline.export(filePath);
    },
    slashCommand(name) {
      return createSlashCommandInvocation(name, injectInteraction, waitForNextRequest);
    },
    contextMenu(name) {
      return createContextMenuInvocation(name, injectInteraction, waitForNextRequest);
    },
    button(customId) {
      return createButtonInvocation(customId, injectInteraction, waitForNextRequest, () => rest.lastMessageId);
    },
    selectMenu(customId) {
      return createSelectMenuInvocation(customId, injectInteraction, waitForNextRequest, () => rest.lastMessageId);
    },
    respond(method, path, responder) {
      rest.respond(method, path, responder);
    },
    modal(customId) {
      return createModalSubmitInvocation(customId, injectInteraction, waitForNextRequest);
    },
    lastReply() {
      return allReplies().at(-1);
    },
    allReplies,
    lastModal() {
      return allModals().at(-1);
    },
    allModals,
  };
}
