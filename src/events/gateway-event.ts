import type { GatewayDispatchPayload } from "discord-api-types/v10";
import { DEFAULT_IDS } from "../fixtures/ids.js";
import { buildGuildCreateDispatch } from "../fixtures/guild-create.js";
import {
  buildGuildMemberAddDispatch,
  buildGuildMemberRemoveDispatch,
  type GuildMemberAddOverrides,
  type GuildMemberRemoveOverrides,
} from "../fixtures/guild-member-events.js";
import {
  buildMessageCreateDispatch,
  buildMessageDeleteDispatch,
  type MessageCreateOverrides,
  type MessageDeleteOverrides,
} from "../fixtures/message-events.js";
import { buildMember } from "../fixtures/member.js";
import {
  buildMessageReactionAddDispatch,
  buildMessageReactionRemoveDispatch,
  type ReactionOverrides,
} from "../fixtures/reaction-events.js";
import { buildUser } from "../fixtures/user.js";

/** Override types per event name supported by `Probe.emit()`. */
export interface GatewayEventOverrides {
  guildMemberAdd: GuildMemberAddOverrides;
  guildMemberRemove: GuildMemberRemoveOverrides;
  messageCreate: MessageCreateOverrides;
  messageDelete: MessageDeleteOverrides;
  messageReactionAdd: ReactionOverrides;
  messageReactionRemove: ReactionOverrides;
}

/** Builds the `MessageCreateOverrides` that seed the message behind a reaction – the same `id`/`channel`/`guildId` the reaction references. */
function messageSeedFor(overrides: ReactionOverrides): MessageCreateOverrides {
  return {
    ...(overrides.messageId ? { id: overrides.messageId } : {}),
    ...(overrides.channel ? { channel: overrides.channel } : {}),
    ...(overrides.guildId ? { guildId: overrides.guildId } : {}),
  };
}

/** discord.js event names supported by `Probe.emit()` (camelCase, like `client.on(...)`). */
export type GatewayEventName = keyof GatewayEventOverrides;

/**
 * Builds the sequence of raw gateway dispatch events for a `Probe.emit()`.
 * Member/message/reaction events need a guild known in the client cache
 * (otherwise discord.js silently ignores them, see
 * `src/fixtures/guild-create.ts`) – it is prepended here, invisible to the
 * caller: `guildMemberRemove` gets its member known beforehand via the
 * `GUILD_CREATE` members list, `messageDelete`/`messageReactionAdd`/
 * `messageReactionRemove` their message via a preceding `MESSAGE_CREATE`,
 * `messageReactionRemove` additionally the reacting user via a preceding
 * `MESSAGE_REACTION_ADD` – exactly the order it would happen in on real
 * Discord.
 */
export function buildGatewayEventDispatches<K extends GatewayEventName>(
  eventName: K,
  overrides?: GatewayEventOverrides[K],
): GatewayDispatchPayload[] {
  switch (eventName) {
    case "guildMemberAdd": {
      // The switch on `eventName` doesn't narrow `K` to the matching
      // overrides type automatically – the cast is safe here because every
      // overrides type has only optional fields (so a `{}` default always
      // fits).
      const o = (overrides ?? {}) as GuildMemberAddOverrides;
      const guildId = o.guildId ?? DEFAULT_IDS.guild;
      return [buildGuildCreateDispatch({ id: guildId }), buildGuildMemberAddDispatch(o)];
    }
    case "guildMemberRemove": {
      const o = (overrides ?? {}) as GuildMemberRemoveOverrides;
      const guildId = o.guildId ?? DEFAULT_IDS.guild;
      const member = buildMember(o.user ? { user: buildUser(o.user) } : {});
      return [buildGuildCreateDispatch({ id: guildId, members: [member] }), buildGuildMemberRemoveDispatch(o)];
    }
    case "messageCreate": {
      const o = (overrides ?? {}) as MessageCreateOverrides;
      return [buildGuildCreateDispatch(o.channel ? { channel: o.channel } : {}), buildMessageCreateDispatch(o)];
    }
    case "messageDelete": {
      const o = (overrides ?? {}) as MessageDeleteOverrides;
      return [
        buildGuildCreateDispatch(o.channel ? { channel: o.channel } : {}),
        buildMessageCreateDispatch(o),
        buildMessageDeleteDispatch(o),
      ];
    }
    case "messageReactionAdd": {
      const o = (overrides ?? {}) as ReactionOverrides;
      return [
        buildGuildCreateDispatch(o.channel ? { channel: o.channel } : {}),
        buildMessageCreateDispatch(messageSeedFor(o)),
        buildMessageReactionAddDispatch(o),
      ];
    }
    case "messageReactionRemove": {
      const o = (overrides ?? {}) as ReactionOverrides;
      return [
        buildGuildCreateDispatch(o.channel ? { channel: o.channel } : {}),
        buildMessageCreateDispatch(messageSeedFor(o)),
        buildMessageReactionAddDispatch(o),
        buildMessageReactionRemoveDispatch(o),
      ];
    }
    default:
      throw new Error(`probe.ts: unknown event name "${eventName as string}"`);
  }
}
