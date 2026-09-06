import {
  GatewayDispatchEvents,
  GatewayOpcodes,
  type APIUser,
  type GatewayGuildMemberAddDispatch,
  type GatewayGuildMemberAddDispatchData,
  type GatewayGuildMemberRemoveDispatch,
  type GatewayGuildMemberRemoveDispatchData,
} from "discord-api-types/v10";
import { buildMember } from "./member.js";
import { buildUser } from "./user.js";

/** Fixture-Overrides für `buildGuildMemberAddDispatch`/`buildGuildMemberRemoveDispatch`. */
export interface GuildMemberAddOverrides {
  user?: Partial<APIUser>;
  guildId?: string;
}

/** `GuildMemberRemoveOverrides` hat dieselbe Form wie `GuildMemberAddOverrides` – eigener Name für Klarheit an den Call-Sites. */
export type GuildMemberRemoveOverrides = GuildMemberAddOverrides;

/**
 * Baut ein rohes `GUILD_MEMBER_ADD`-Gateway-Dispatch-Event. Setzt voraus,
 * dass die Guild bereits im Client-Cache bekannt ist (siehe
 * `buildGuildCreateDispatch`) – `probe.emit("guildMemberAdd", ...)`
 * übernimmt das automatisch.
 */
export function buildGuildMemberAddDispatch(overrides: GuildMemberAddOverrides = {}): GatewayGuildMemberAddDispatch {
  const member = buildMember(overrides.user ? { user: buildUser(overrides.user) } : {});
  const data = { ...member, guild_id: overrides.guildId ?? "1" } satisfies GatewayGuildMemberAddDispatchData;

  return {
    op: GatewayOpcodes.Dispatch,
    s: 1,
    t: GatewayDispatchEvents.GuildMemberAdd,
    d: data,
  };
}

/**
 * Baut ein rohes `GUILD_MEMBER_REMOVE`-Gateway-Dispatch-Event. discord.js
 * emittiert nur ein echtes `GuildMember`-Objekt, wenn das Mitglied schon im
 * Guild-Members-Cache bekannt war – `probe.emit("guildMemberRemove", ...)`
 * sät dafür passend über `buildGuildCreateDispatch({ members: [...] })` vor.
 */
export function buildGuildMemberRemoveDispatch(
  overrides: GuildMemberRemoveOverrides = {},
): GatewayGuildMemberRemoveDispatch {
  const data = {
    guild_id: overrides.guildId ?? "1",
    user: buildUser(overrides.user),
  } satisfies GatewayGuildMemberRemoveDispatchData;

  return {
    op: GatewayOpcodes.Dispatch,
    s: 1,
    t: GatewayDispatchEvents.GuildMemberRemove,
    d: data,
  };
}
