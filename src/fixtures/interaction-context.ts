import type { APIInteractionGuildMember, APIPartialInteractionGuild, APIUser } from "discord-api-types/v10";
import { buildChannel, type ChannelFixture } from "./channel.js";
import { buildGuild } from "./guild.js";
import { buildMember } from "./member.js";
import { buildUser } from "./user.js";

/**
 * Gemeinsame Overrides für jede Art von Interaction (Slash Command,
 * Button-Klick, Select-Menu-Auswahl, Modal-Submit): wer sie ausgelöst hat
 * und in welchem Channel/welcher Guild. Jede Interaction-Art ergänzt eigene
 * Felder (z.B. `options` bei Slash Commands, `values` bei Select Menus).
 */
export interface InteractionContextOverrides {
  user?: Partial<APIUser>;
  channel?: Partial<ChannelFixture>;
  guild?: Partial<APIPartialInteractionGuild>;
  member?: Partial<APIInteractionGuildMember>;
}

/**
 * Baut Channel/Guild/Member für eine Interaction – der gemeinsame Unterbau,
 * den jeder Interaction-Fixture-Builder (`interaction.ts`,
 * `message-component-interaction.ts`, `modal-interaction.ts`) braucht.
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
