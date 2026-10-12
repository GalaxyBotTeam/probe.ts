import { GuildMemberFlags, type APIInteractionGuildMember } from "discord-api-types/v10";
import { buildUser } from "./user.js";

/**
 * Builds the `member` payload of a guild interaction (`APIInteractionGuildMember`)
 * with sensible defaults. Every field can be changed via `overrides`; without
 * `overrides.user`, `buildUser()` is used.
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
