import { GuildMemberFlags, type APIInteractionGuildMember } from "discord-api-types/v10";
import { buildUser } from "./user.js";

/**
 * Baut den `member`-Payload einer Guild-Interaction (`APIInteractionGuildMember`)
 * mit sinnvollen Defaults. Jedes Feld ist über `overrides` änderbar; ohne
 * `overrides.user` wird `buildUser()` verwendet.
 */
export function buildMember(overrides: Partial<APIInteractionGuildMember> = {}): APIInteractionGuildMember {
  const { user, ...rest } = overrides;
  return {
    roles: [],
    deaf: false,
    mute: false,
    flags: GuildMemberFlags.CompletedOnboarding,
    joined_at: "2024-01-01T00:00:00.000Z",
    permissions: "0",
    user: user ?? buildUser(),
    ...rest,
  } satisfies APIInteractionGuildMember;
}
