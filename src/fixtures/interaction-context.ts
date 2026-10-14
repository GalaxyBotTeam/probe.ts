import {
  ChannelType,
  InteractionContextType,
  type APIInteractionGuildMember,
  type APIPartialInteractionGuild,
  type APIUser,
} from "discord-api-types/v10";
import { buildChannel, type ChannelFixture } from "./channel.js";
import { buildGuild } from "./guild.js";
import { DEFAULT_IDS } from "./ids.js";
import { buildMember } from "./member.js";
import { buildUser } from "./user.js";

/**
 * Shared overrides for every kind of interaction (slash command, button
 * click, select menu choice, modal submit): who triggered it and in which
 * channel/guild. Each interaction kind adds its own fields (e.g. `options`
 * for slash commands, `values` for select menus).
 */
export interface InteractionContextOverrides {
  user?: Partial<APIUser>;
  channel?: Partial<ChannelFixture>;
  guild?: Partial<APIPartialInteractionGuild>;
  member?: Partial<APIInteractionGuildMember>;
  /**
   * Runs the interaction in the user's DM with the bot instead of a guild –
   * like on Discord, it then carries `user` instead of `guild`/`member`
   * (both overrides are ignored) and a DM channel
   * (default id `DEFAULT_IDS.dmChannel`).
   */
  dm?: boolean;
}

/** Where an interaction happened – spread into the interaction payload. */
export type InteractionOrigin =
  | {
      context: InteractionContextType.Guild;
      guild_id: string;
      guild: APIPartialInteractionGuild;
      member: APIInteractionGuildMember;
    }
  | { context: InteractionContextType.BotDM; user: APIUser };

/**
 * Builds channel and origin (guild + member, or the DM user) for an
 * interaction – the shared foundation every interaction fixture builder
 * (`interaction.ts`, `message-component-interaction.ts`,
 * `modal-interaction.ts`, `context-menu-interaction.ts`) needs.
 */
export function buildInteractionContext(overrides: InteractionContextOverrides = {}): {
  channel: ChannelFixture;
  origin: InteractionOrigin;
} {
  if (overrides.dm) {
    const user = buildUser(overrides.user);
    const channel = buildChannel({ id: DEFAULT_IDS.dmChannel, type: ChannelType.DM, ...overrides.channel, recipients: [user] });
    return { channel, origin: { context: InteractionContextType.BotDM, user } };
  }

  const channel = buildChannel(overrides.channel);
  const guild = buildGuild(overrides.guild);
  const member = buildMember({
    ...overrides.member,
    ...(overrides.user ? { user: buildUser(overrides.user) } : {}),
  });
  return { channel, origin: { context: InteractionContextType.Guild, guild_id: guild.id, guild, member } };
}
