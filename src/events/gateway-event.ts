import type { GatewayDispatchPayload } from "discord-api-types/v10";
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

/** Overrides-Typen je von `Probe.emit()` unterstütztem Event-Namen. */
export interface GatewayEventOverrides {
  guildMemberAdd: GuildMemberAddOverrides;
  guildMemberRemove: GuildMemberRemoveOverrides;
  messageCreate: MessageCreateOverrides;
  messageDelete: MessageDeleteOverrides;
  messageReactionAdd: ReactionOverrides;
  messageReactionRemove: ReactionOverrides;
}

/** Baut die `MessageCreateOverrides`, mit denen die Nachricht hinter einer Reaction geseedet wird – dieselbe `id`/`channel`/`guildId`, die die Reaction referenziert. */
function messageSeedFor(overrides: ReactionOverrides): MessageCreateOverrides {
  return {
    ...(overrides.messageId ? { id: overrides.messageId } : {}),
    ...(overrides.channel ? { channel: overrides.channel } : {}),
    ...(overrides.guildId ? { guildId: overrides.guildId } : {}),
  };
}

/** Von `Probe.emit()` unterstützte discord.js-Event-Namen (camelCase, wie `client.on(...)`). */
export type GatewayEventName = keyof GatewayEventOverrides;

/**
 * Baut die Sequenz roher Gateway-Dispatch-Events für ein `Probe.emit()`.
 * Member-/Message-/Reaction-Events brauchen eine im Client-Cache bekannte
 * Guild (sonst ignoriert discord.js sie stillschweigend, siehe
 * `src/fixtures/guild-create.ts`) – die wird hier vorangestellt, unsichtbar
 * für den Aufrufer: `guildMemberRemove` bekommt sein Mitglied vorab über die
 * `GUILD_CREATE`-Members-Liste bekannt, `messageDelete`/`messageReactionAdd`/
 * `messageReactionRemove` ihre Nachricht über ein vorangestelltes
 * `MESSAGE_CREATE`, `messageReactionRemove` zusätzlich den reagierenden
 * Nutzer über ein vorangestelltes `MESSAGE_REACTION_ADD` – exakt die
 * Reihenfolge, in der es auch auf echtem Discord passiert wäre.
 */
export function buildGatewayEventDispatches<K extends GatewayEventName>(
  eventName: K,
  overrides?: GatewayEventOverrides[K],
): GatewayDispatchPayload[] {
  switch (eventName) {
    case "guildMemberAdd": {
      // Der Switch auf `eventName` narrowt `K` nicht automatisch auf den
      // passenden Overrides-Typ – der Cast ist hier sicher, weil jeder
      // Overrides-Typ ausschließlich optionale Felder hat (ein
      // `{}`-Default passt also immer).
      const o = (overrides ?? {}) as GuildMemberAddOverrides;
      const guildId = o.guildId ?? "1";
      return [buildGuildCreateDispatch({ id: guildId }), buildGuildMemberAddDispatch(o)];
    }
    case "guildMemberRemove": {
      const o = (overrides ?? {}) as GuildMemberRemoveOverrides;
      const guildId = o.guildId ?? "1";
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
      throw new Error(`probe.ts: unbekannter Event-Name "${eventName as string}"`);
  }
}
