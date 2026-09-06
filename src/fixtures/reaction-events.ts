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
import { buildChannel, type ChannelFixture } from "./channel.js";
import { buildMember } from "./member.js";
import { buildUser } from "./user.js";

/** Fixture-Overrides für Reaction-Events: welches Emoji, wer reagiert, auf welche Nachricht. */
export interface ReactionOverrides {
  emoji?: string;
  user?: Partial<APIUser>;
  messageId?: string;
  channel?: Partial<ChannelFixture>;
  guildId?: string;
}

/** Baut ein unicode-`APIEmoji` (kein custom Server-Emoji – dafür bräuchte es eine echte Emoji-`id`). */
function buildEmoji(name: string): APIEmoji {
  return { id: null, name };
}

/**
 * Baut ein rohes `MESSAGE_REACTION_ADD`-Gateway-Dispatch-Event. Setzt
 * voraus, dass die Nachricht bereits im Channel-Cache bekannt ist (siehe
 * `buildMessageCreateDispatch`) – `probe.emit("messageReactionAdd", ...)`
 * übernimmt das automatisch.
 */
export function buildMessageReactionAddDispatch(overrides: ReactionOverrides = {}): GatewayMessageReactionAddDispatch {
  const channel = buildChannel(overrides.channel);
  const member = buildMember(overrides.user ? { user: buildUser(overrides.user) } : {});

  const data = {
    user_id: member.user.id,
    channel_id: channel.id,
    message_id: overrides.messageId ?? "1",
    guild_id: overrides.guildId ?? "1",
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
 * Baut ein rohes `MESSAGE_REACTION_REMOVE`-Gateway-Dispatch-Event.
 * discord.js löst den Nutzer nur auf, wenn er schon global gecached ist
 * (anders als bei `MESSAGE_REACTION_ADD`, das dafür extra den `member`-Block
 * hat) – `probe.emit("messageReactionRemove", ...)` stellt das über ein
 * vorangestelltes `MESSAGE_REACTION_ADD` mit demselben Nutzer/Emoji sicher.
 */
export function buildMessageReactionRemoveDispatch(
  overrides: ReactionOverrides = {},
): GatewayMessageReactionRemoveDispatch {
  const channel = buildChannel(overrides.channel);
  const user = buildUser(overrides.user);

  const data = {
    user_id: user.id,
    channel_id: channel.id,
    message_id: overrides.messageId ?? "1",
    guild_id: overrides.guildId ?? "1",
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
