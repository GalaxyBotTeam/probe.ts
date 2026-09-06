import { REST } from "@discordjs/rest";
import type { Client } from "discord.js";
import type { ApplicationFlags, GatewayDispatchPayload, GatewayReadyDispatchData } from "discord-api-types/v10";
import { buildGatewayEventDispatches, type GatewayEventName, type GatewayEventOverrides } from "../events/gateway-event.js";
import { buildGuildCreateDispatch } from "../fixtures/guild-create.js";
import { createButtonInvocation, createSelectMenuInvocation, type ButtonInvocation, type SelectMenuInvocation } from "../interactions/message-component.js";
import { createModalSubmitInvocation, type ModalSubmitInvocation } from "../interactions/modal.js";
import { parseModal, parseReply, type ModalContent, type ReplyContent } from "../interactions/replies.js";
import { createSlashCommandInvocation, type SlashCommandInvocation } from "../interactions/slash-command.js";
import { GatewayAdapter } from "../transport/gateway-adapter.js";
import { type CapturedRequest, RestAdapter } from "../transport/rest-adapter.js";

/** Wartet, bis `condition()` wahr wird, oder wirft nach `timeoutMs` (Standard: 1000ms). */
async function waitUntil(condition: () => boolean, timeoutMs = 1000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() >= deadline) {
      throw new Error(`probe.ts: Timeout (${timeoutMs}ms) beim Warten auf eine Antwort des Bots`);
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

/** Minimaler READY-Payload – reicht discord.js, um sofort "AllReady" zu melden. */
const FAKE_READY_DATA = {
  v: 10,
  user: { id: "0", username: "probe", discriminator: "0000", global_name: null, avatar: null, bot: true },
  guilds: [],
  session_id: "probe-session",
  resume_gateway_url: "wss://gateway.discord.gg",
  shard: [0, 1],
  application: { id: "0", flags: 0 as ApplicationFlags, flags_new: "0" },
} satisfies GatewayReadyDispatchData;

/**
 * Steuert einen discord.js-`Client` über den Fake-Transport-Layer: injiziert
 * Gateway-Events, statt zu verbinden, und fängt REST-Calls ab, statt sie zu
 * senden. Siehe `src/transport/README.md` für die Architektur-Begründung.
 */
export interface Probe {
  /** Loggt den Client gegen den Fake-Transport ein und wartet auf "Ready". */
  setup(): Promise<void>;
  /** Räumt den Client sauber ab (kein echter Socket, aber Timer/Listener). */
  teardown(): Promise<void>;
  /** Injiziert ein rohes Gateway-Dispatch-Event (z.B. `INTERACTION_CREATE`). */
  injectDispatch(payload: GatewayDispatchPayload): void;
  /**
   * Injiziert ein generisches Gateway-Event (z.B. `guildMemberAdd`,
   * `messageCreate`) über passende Fixture-Builder – baut bei Bedarf
   * automatisch eine Guild/einen Channel im Client-Cache vor (siehe
   * `src/events/gateway-event.ts`). Synchron wie `injectDispatch()`: auf
   * asynchrone Bot-Reaktionen (z.B. eine gesendete Willkommensnachricht) mit
   * `vi.waitFor(...)` warten.
   */
  emit<K extends GatewayEventName>(eventName: K, overrides?: GatewayEventOverrides[K]): void;
  /** Alle bisher abgefangenen ausgehenden REST-Calls, in Reihenfolge. */
  capturedRequests(): readonly CapturedRequest[];
  /** Baut einen Slash-Command-Aufruf (`.withOptions(...).invoke()`). */
  slashCommand(name: string): SlashCommandInvocation;
  /** Baut einen Button-Klick (`.click()`) – Default-`messageId` `"1"` (siehe `MessageComponentOverrides`). */
  button(customId: string): ButtonInvocation;
  /** Baut eine Select-Menu-Auswahl (`.withValues([...]).select()`). Deckt aktuell nur String-Select ab. */
  selectMenu(customId: string): SelectMenuInvocation;
  /** Baut einen Modal-Submit (`.withFields({...}).submit()`). */
  modal(customId: string): ModalSubmitInvocation;
  /** Der Inhalt der zuletzt gesendeten Antwort (`reply`/`editReply`), oder `undefined` falls noch keine kam. */
  lastReply(): ReplyContent | undefined;
  /** Die Inhalte aller bisher gesendeten Antworten, in Reihenfolge. */
  allReplies(): ReplyContent[];
  /** Das zuletzt per `interaction.showModal(...)` gezeigte Modal, oder `undefined` falls noch keins kam. */
  lastModal(): ModalContent | undefined;
  /** Alle bisher gezeigten Modals, in Reihenfolge. */
  allModals(): ModalContent[];
}

/**
 * Baut eine Probe um einen discord.js-`Client`. Ersetzt `client.rest` und
 * `client.options.ws.buildStrategy`, bevor `setup()` `login()` aufruft – der
 * Bot-Code selbst bleibt unverändert und bekommt echte discord.js-Objekte.
 */
export function createProbe(client: Client): Probe {
  const rest = new RestAdapter();
  client.rest = new REST({ ...client.options.rest, makeRequest: rest.makeRequest });

  let gateway: GatewayAdapter | undefined;
  client.options.ws = {
    ...client.options.ws,
    buildStrategy: (manager) => {
      gateway = new GatewayAdapter(manager);
      return gateway;
    },
  };

  function requireGateway(): GatewayAdapter {
    if (!gateway) {
      throw new Error("probe.ts: setup() muss vor injectDispatch()/emit() aufgerufen werden");
    }
    return gateway;
  }

  function allReplies(): ReplyContent[] {
    return rest.requests.map(parseReply).filter((reply): reply is ReplyContent => reply !== undefined);
  }

  function allModals(): ModalContent[] {
    return rest.requests.map(parseModal).filter((modal): modal is ModalContent => modal !== undefined);
  }

  /** Wartet auf mindestens einen neuen REST-Call – gemeinsame Basis für jede Fluent-Invocation (Slash Command, Button, Select Menu, Modal). */
  async function waitForNextRequest(): Promise<void> {
    const baseline = rest.requests.length;
    await waitUntil(() => rest.requests.length > baseline);
  }

  /**
   * Injiziert eine Interaction (Slash Command, Button, Select Menu, Modal) –
   * sät davor unsichtbar eine Guild mit Default-Channel (siehe
   * `buildGuildCreateDispatch`), damit `interaction.channel` echt auflöst
   * (discord.js cached den Channel sonst nicht, siehe
   * `src/events/README.md` für dieselbe Regel bei Gateway-Events). Nur für
   * die Fluent-Invocations (`slashCommand`/`button`/`selectMenu`/`modal`) –
   * der rohe `injectDispatch()` bleibt bewusst ohne Seeding.
   */
  function injectInteraction(dispatch: GatewayDispatchPayload): void {
    const gateway = requireGateway();
    gateway.injectDispatch(buildGuildCreateDispatch());
    gateway.injectDispatch(dispatch);
  }

  return {
    async setup() {
      await client.login("probe.ts-fake-token");
      requireGateway().injectReady(FAKE_READY_DATA);
    },
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
    slashCommand(name) {
      return createSlashCommandInvocation(name, injectInteraction, waitForNextRequest);
    },
    button(customId) {
      return createButtonInvocation(customId, injectInteraction, waitForNextRequest);
    },
    selectMenu(customId) {
      return createSelectMenuInvocation(customId, injectInteraction, waitForNextRequest);
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
