import {
  GatewayDispatchEvents,
  GatewayOpcodes,
  type APIUser,
  type GatewayMessageCreateDispatch,
  type GatewayMessageCreateDispatchData,
  type GatewayMessageDeleteDispatch,
  type GatewayMessageDeleteDispatchData,
} from "discord-api-types/v10";
import { buildChannel, type ChannelFixture } from "./channel.js";
import { buildMessage } from "./message.js";

/** Fixture-Overrides für `buildMessageCreateDispatch`. */
export interface MessageCreateOverrides {
  id?: string;
  content?: string;
  author?: Partial<APIUser>;
  channel?: Partial<ChannelFixture>;
  guildId?: string;
}

/** Fixture-Overrides für `buildMessageDeleteDispatch` – kein `content`/`author`, eine gelöschte Nachricht braucht nur ihre Identität. */
export interface MessageDeleteOverrides {
  id?: string;
  channel?: Partial<ChannelFixture>;
  guildId?: string;
}

/**
 * Baut ein rohes `MESSAGE_CREATE`-Gateway-Dispatch-Event. Setzt voraus, dass
 * der Channel bereits im Client-Cache bekannt ist (siehe
 * `buildGuildCreateDispatch`) – `probe.emit("messageCreate", ...)`
 * übernimmt das automatisch.
 */
export function buildMessageCreateDispatch(overrides: MessageCreateOverrides = {}): GatewayMessageCreateDispatch {
  const base = buildMessage(overrides);
  const message = { ...base, guild_id: overrides.guildId ?? "1" } satisfies GatewayMessageCreateDispatchData;

  return {
    op: GatewayOpcodes.Dispatch,
    s: 1,
    t: GatewayDispatchEvents.MessageCreate,
    d: message,
  };
}

/**
 * Baut ein rohes `MESSAGE_DELETE`-Gateway-Dispatch-Event. discord.js
 * emittiert nur eine echte `Message`, wenn die Nachricht schon im
 * Channel-Messages-Cache bekannt war – `probe.emit("messageDelete", ...)`
 * stellt das über ein vorangestelltes `MESSAGE_CREATE` sicher (mit gleicher
 * `id`), exakt die Reihenfolge, in der es auch auf echtem Discord passiert
 * wäre.
 */
export function buildMessageDeleteDispatch(overrides: MessageDeleteOverrides = {}): GatewayMessageDeleteDispatch {
  const channel = buildChannel(overrides.channel);

  const data = {
    id: overrides.id ?? "1",
    channel_id: channel.id,
    guild_id: overrides.guildId ?? "1",
  } satisfies GatewayMessageDeleteDispatchData;

  return {
    op: GatewayOpcodes.Dispatch,
    s: 1,
    t: GatewayDispatchEvents.MessageDelete,
    d: data,
  };
}
