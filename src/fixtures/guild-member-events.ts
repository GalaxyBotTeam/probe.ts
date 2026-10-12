import {
  GatewayDispatchEvents,
  GatewayOpcodes,
  type APIUser,
  type GatewayGuildMemberAddDispatch,
  type GatewayGuildMemberAddDispatchData,
  type GatewayGuildMemberRemoveDispatch,
  type GatewayGuildMemberRemoveDispatchData,
} from "discord-api-types/v10";
import { DEFAULT_IDS } from "./ids.js";
import { buildMember } from "./member.js";
import { buildUser } from "./user.js";

/** Fixture overrides for `buildGuildMemberAddDispatch`/`buildGuildMemberRemoveDispatch`. */
export interface GuildMemberAddOverrides {
  user?: Partial<APIUser>;
  guildId?: string;
}

/** `GuildMemberRemoveOverrides` has the same shape as `GuildMemberAddOverrides` – its own name for clarity at the call sites. */
export type GuildMemberRemoveOverrides = GuildMemberAddOverrides;

/**
 * Builds a raw `GUILD_MEMBER_ADD` gateway dispatch event. Requires the guild
 * to be known in the client cache already (see `buildGuildCreateDispatch`) –
 * `probe.emit("guildMemberAdd", ...)` takes care of that automatically.
 */
export function buildGuildMemberAddDispatch(overrides: GuildMemberAddOverrides = {}): GatewayGuildMemberAddDispatch {
  const member = buildMember(overrides.user ? { user: buildUser(overrides.user) } : {});
  const data = { ...member, guild_id: overrides.guildId ?? DEFAULT_IDS.guild } satisfies GatewayGuildMemberAddDispatchData;

  return {
    op: GatewayOpcodes.Dispatch,
    s: 1,
    t: GatewayDispatchEvents.GuildMemberAdd,
    d: data,
  };
}

/**
 * Builds a raw `GUILD_MEMBER_REMOVE` gateway dispatch event. discord.js only
 * emits a real `GuildMember` object if the member was already known in the
 * guild members cache – `probe.emit("guildMemberRemove", ...)` seeds that
 * beforehand via `buildGuildCreateDispatch({ members: [...] })`.
 */
export function buildGuildMemberRemoveDispatch(
  overrides: GuildMemberRemoveOverrides = {},
): GatewayGuildMemberRemoveDispatch {
  const data = {
    guild_id: overrides.guildId ?? DEFAULT_IDS.guild,
    user: buildUser(overrides.user),
  } satisfies GatewayGuildMemberRemoveDispatchData;

  return {
    op: GatewayOpcodes.Dispatch,
    s: 1,
    t: GatewayDispatchEvents.GuildMemberRemove,
    d: data,
  };
}
