import type { APIInteractionGuildMember, APIPartialInteractionGuild, APIUser } from "discord-api-types/v10";
import { buildChannel, type ChannelFixture } from "./channel.js";
import { buildGuild } from "./guild.js";
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
}

/**
 * Builds channel/guild/member for an interaction – the shared foundation
 * every interaction fixture builder (`interaction.ts`,
 * `message-component-interaction.ts`, `modal-interaction.ts`) needs.
 */
export function buildInteractionContext(overrides: InteractionContextOverrides = {}): {
  channel: ChannelFixture;
  guild: APIPartialInteractionGuild;
  member: APIInteractionGuildMember;
} {
  const channel = buildChannel(overrides.channel);
  const guild = buildGuild(overrides.guild);
  const member = buildMember({
    ...overrides.member,
    ...(overrides.user ? { user: buildUser(overrides.user) } : {}),
  });
  return { channel, guild, member };
}
