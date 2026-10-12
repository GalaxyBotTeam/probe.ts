import {
  GatewayDispatchEvents,
  GatewayOpcodes,
  ReactionType,
  type APIEmoji,
  type APIUser,
  type GatewayMessageReactionAddDispatch,
  type GatewayMessageReactionAddDispatchData,
  type GatewayMessageReactionRemoveDispatch,
  type GatewayMessageReactionRemoveDispatchData,
} from "discord-api-types/v10";
import { DEFAULT_IDS } from "./ids.js";
import { buildChannel, type ChannelFixture } from "./channel.js";
import { buildMember } from "./member.js";
import { buildUser } from "./user.js";

/** Fixture overrides for reaction events: which emoji, who reacts, on which message. */
export interface ReactionOverrides {
  emoji?: string;
  user?: Partial<APIUser>;
  messageId?: string;
  channel?: Partial<ChannelFixture>;
  guildId?: string;
}

/** Builds a unicode `APIEmoji` (no custom server emoji – that would need a real emoji `id`). */
function buildEmoji(name: string): APIEmoji {
  return { id: null, name };
}

/**
 * Builds a raw `MESSAGE_REACTION_ADD` gateway dispatch event. Requires the
 * message to be known in the channel cache already (see
 * `buildMessageCreateDispatch`) – `probe.emit("messageReactionAdd", ...)`
 * takes care of that automatically.
 */
export function buildMessageReactionAddDispatch(overrides: ReactionOverrides = {}): GatewayMessageReactionAddDispatch {
  const channel = buildChannel(overrides.channel);
  const member = buildMember(overrides.user ? { user: buildUser(overrides.user) } : {});

  const data = {
    user_id: member.user.id,
    channel_id: channel.id,
    message_id: overrides.messageId ?? DEFAULT_IDS.message,
    guild_id: overrides.guildId ?? DEFAULT_IDS.guild,
    member,
    emoji: buildEmoji(overrides.emoji ?? "👍"),
    burst: false,
    type: ReactionType.Normal,
  } satisfies GatewayMessageReactionAddDispatchData;

  return {
    op: GatewayOpcodes.Dispatch,
    s: 1,
    t: GatewayDispatchEvents.MessageReactionAdd,
    d: data,
  };
}

/**
 * Builds a raw `MESSAGE_REACTION_REMOVE` gateway dispatch event. discord.js
 * only resolves the user if they are already cached globally (unlike
 * `MESSAGE_REACTION_ADD`, which has the extra `member` block for that) –
 * `probe.emit("messageReactionRemove", ...)` ensures this with a preceding
 * `MESSAGE_REACTION_ADD` with the same user/emoji.
 */
export function buildMessageReactionRemoveDispatch(
  overrides: ReactionOverrides = {},
): GatewayMessageReactionRemoveDispatch {
  const channel = buildChannel(overrides.channel);
  const user = buildUser(overrides.user);

  const data = {
    user_id: user.id,
    channel_id: channel.id,
    message_id: overrides.messageId ?? DEFAULT_IDS.message,
    guild_id: overrides.guildId ?? DEFAULT_IDS.guild,
    emoji: buildEmoji(overrides.emoji ?? "👍"),
    burst: false,
    type: ReactionType.Normal,
  } satisfies GatewayMessageReactionRemoveDispatchData;

  return {
    op: GatewayOpcodes.Dispatch,
    s: 1,
    t: GatewayDispatchEvents.MessageReactionRemove,
    d: data,
  };
}
