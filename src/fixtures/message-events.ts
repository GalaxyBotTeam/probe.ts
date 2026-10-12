import {
  GatewayDispatchEvents,
  GatewayOpcodes,
  type APIUser,
  type GatewayMessageCreateDispatch,
  type GatewayMessageCreateDispatchData,
  type GatewayMessageDeleteDispatch,
  type GatewayMessageDeleteDispatchData,
} from "discord-api-types/v10";
import { DEFAULT_IDS } from "./ids.js";
import { buildChannel, type ChannelFixture } from "./channel.js";
import { buildMessage } from "./message.js";

/** Fixture overrides for `buildMessageCreateDispatch`. */
export interface MessageCreateOverrides {
  id?: string;
  content?: string;
  author?: Partial<APIUser>;
  channel?: Partial<ChannelFixture>;
  guildId?: string;
}

/** Fixture overrides for `buildMessageDeleteDispatch` – no `content`/`author`, a deleted message only needs its identity. */
export interface MessageDeleteOverrides {
  id?: string;
  channel?: Partial<ChannelFixture>;
  guildId?: string;
}

/**
 * Builds a raw `MESSAGE_CREATE` gateway dispatch event. Requires the channel
 * to be known in the client cache already (see `buildGuildCreateDispatch`) –
 * `probe.emit("messageCreate", ...)` takes care of that automatically.
 */
export function buildMessageCreateDispatch(overrides: MessageCreateOverrides = {}): GatewayMessageCreateDispatch {
  const base = buildMessage(overrides);
  const message = { ...base, guild_id: overrides.guildId ?? DEFAULT_IDS.guild } satisfies GatewayMessageCreateDispatchData;

  return {
    op: GatewayOpcodes.Dispatch,
    s: 1,
    t: GatewayDispatchEvents.MessageCreate,
    d: message,
  };
}

/**
 * Builds a raw `MESSAGE_DELETE` gateway dispatch event. discord.js only
 * emits a real `Message` if the message was already known in the channel
 * messages cache – `probe.emit("messageDelete", ...)` ensures that with a
 * preceding `MESSAGE_CREATE` (same `id`), exactly the order it would happen
 * in on real Discord.
 */
export function buildMessageDeleteDispatch(overrides: MessageDeleteOverrides = {}): GatewayMessageDeleteDispatch {
  const channel = buildChannel(overrides.channel);

  const data = {
    id: overrides.id ?? DEFAULT_IDS.message,
    channel_id: channel.id,
    guild_id: overrides.guildId ?? DEFAULT_IDS.guild,
  } satisfies GatewayMessageDeleteDispatchData;

  return {
    op: GatewayOpcodes.Dispatch,
    s: 1,
    t: GatewayDispatchEvents.MessageDelete,
    d: data,
  };
}
