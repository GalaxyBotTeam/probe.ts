import {
  GatewayDispatchEvents,
  GatewayOpcodes,
  GuildMemberFlags,
  Locale,
  PermissionFlagsBits,
  type APIGuildMember,
  type APIRole,
  type RoleFlags,
  type GatewayGuildCreateDispatch,
  type GatewayGuildCreateDispatchData,
} from "discord-api-types/v10";
import { buildChannel, type ChannelFixture } from "./channel.js";
import { DEFAULT_IDS } from "./ids.js";
import { buildUser } from "./user.js";

/**
 * Overrides for `buildGuildCreateDispatch` – the guild serves as cache
 * preparation for member/message events and interactions (see
 * `src/events/gateway-event.ts`): an `id`, a default channel, the roles and
 * optionally already-known members (the bot itself is always included).
 */
export interface GuildCreateOverrides {
  id?: string;
  name?: string;
  ownerId?: string;
  channel?: Partial<ChannelFixture>;
  /** In addition to `@everyone` (no permissions) and the bot's administrator role (`DEFAULT_IDS.botRole`). */
  roles?: (Partial<APIRole> & Pick<APIRole, "id">)[];
  members?: APIGuildMember[];
}

/** Builds an `APIRole` with sensible defaults; discord.js 14.21+ needs `colors`, older versions `color`. */
export function buildRole(overrides: Partial<APIRole> & Pick<APIRole, "id">): APIRole {
  return {
    name: "role",
    permissions: "0",
    position: 1,
    color: 0,
    colors: { primary_color: 0, secondary_color: null, tertiary_color: null },
    hoist: false,
    managed: false,
    mentionable: false,
    flags: 0 as RoleFlags,
    ...overrides,
  };
}

/** The bot as a guild member – bots check their own permissions via `guild.members.me`. */
function buildBotMember(): APIGuildMember {
  return {
    user: buildUser({ id: DEFAULT_IDS.bot, username: "probe", bot: true }),
    roles: [DEFAULT_IDS.botRole],
    joined_at: "2024-01-01T00:00:00.000Z",
    deaf: false,
    mute: false,
    flags: GuildMemberFlags.CompletedOnboarding,
  };
}

/**
 * Builds a raw `GUILD_CREATE` gateway dispatch event. discord.js needs this
 * event before any guild/channel-related event (member join, message create,
 * ...) does anything visible – without a guild known in the client cache,
 * `GUILD_MEMBER_ADD`/`MESSAGE_CREATE`/... silently ignore the event (no
 * error, no emitted client event; see
 * `node_modules/discord.js/src/client/websocket/handlers/GUILD_MEMBER_ADD.js`
 * and `.../client/actions/Action.js#getChannel`). `probe.emit()` injects this
 * event automatically as preparation – useful on its own to test a
 * `guildCreate` handler.
 *
 * Set are the fields discord.js' `Guild`/`AnonymousGuild` `_patch()` reads
 * unguarded, plus what bots typically check: name, owner
 * (`DEFAULT_IDS.owner`, not the default user), `@everyone` without
 * permissions and the bot itself as a member with an administrator role –
 * otherwise every `guild.members.me.permissions` check fails. The rest of
 * `APIGuild` (~30 more required fields like `verification_level`,
 * `mfa_level`, ...) sits behind `'field' in data` checks and can't sensibly
 * be built by hand – the `as` cast is the documented exception here.
 *
 * For a guild that is already available, discord.js ignores every further
 * `GUILD_CREATE` completely (`handlers/GUILD_CREATE.js`) – whoever injects
 * their own guild beforehand keeps it, even if `emit()` seeds again later.
 */
export function buildGuildCreateDispatch(overrides: GuildCreateOverrides = {}): GatewayGuildCreateDispatch {
  const id = overrides.id ?? DEFAULT_IDS.guild;
  const channel = buildChannel(overrides.channel);
  const members = [buildBotMember(), ...(overrides.members ?? [])];

  const guild = {
    id,
    name: overrides.name ?? "probe guild",
    owner_id: overrides.ownerId ?? DEFAULT_IDS.owner,
    member_count: members.length,
    joined_at: "2024-01-01T00:00:00.000Z",
    preferred_locale: Locale.EnglishUS,
    roles: [
      // @everyone has the same id as the guild
      buildRole({ id, name: "@everyone", position: 0 }),
      buildRole({ id: DEFAULT_IDS.botRole, name: "probe", permissions: PermissionFlagsBits.Administrator.toString(), managed: true }),
      ...(overrides.roles ?? []).map((role, index) => buildRole({ position: index + 2, ...role })),
    ],
    channels: [{ ...channel, name: "general", position: 0, permission_overwrites: [] }],
    members,
  } as unknown as GatewayGuildCreateDispatchData;

  return {
    op: GatewayOpcodes.Dispatch,
    s: 1,
    t: GatewayDispatchEvents.GuildCreate,
    d: guild,
  };
}
