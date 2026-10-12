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
 * Overrides für `buildGuildCreateDispatch` – die Guild dient als
 * Cache-Vorbereitung für Member-/Message-Events und Interactions (siehe
 * `src/events/gateway-event.ts`): eine `id`, ein Default-Channel, die Rollen
 * und optional schon bekannte Members (der Bot selbst ist immer dabei).
 */
export interface GuildCreateOverrides {
  id?: string;
  name?: string;
  ownerId?: string;
  channel?: Partial<ChannelFixture>;
  /** Zusätzlich zu `@everyone` (ohne Rechte) und der Administrator-Rolle des Bots (`DEFAULT_IDS.botRole`). */
  roles?: (Partial<APIRole> & Pick<APIRole, "id">)[];
  members?: APIGuildMember[];
}

/** Baut eine `APIRole` mit sinnvollen Defaults; `colors` braucht discord.js ab 14.21, `color` die älteren. */
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

/** Der Bot als Guild-Member – Bots prüfen ihre eigenen Rechte über `guild.members.me`. */
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
 * Baut ein rohes `GUILD_CREATE`-Gateway-Dispatch-Event. discord.js braucht
 * dieses Event, bevor irgendein guild-/channel-bezogenes Event (Member-Join,
 * Message-Create, ...) etwas Sichtbares tut – ohne eine im Client-Cache
 * bekannte Guild ignorieren `GUILD_MEMBER_ADD`/`MESSAGE_CREATE`/... das Event
 * stillschweigend (kein Fehler, kein emittiertes Client-Event; siehe
 * `node_modules/discord.js/src/client/websocket/handlers/GUILD_MEMBER_ADD.js`
 * und `.../client/actions/Action.js#getChannel`). `probe.emit()` injiziert
 * dieses Event automatisch als Vorbereitung – eigenständig nützlich, um
 * einen `guildCreate`-Handler zu testen.
 *
 * Gesetzt sind die Felder, die discord.js' `Guild`/`AnonymousGuild`-`_patch()`
 * ungeschützt liest, plus das, was Bots typischerweise prüfen: Name, Owner
 * (`DEFAULT_IDS.owner`, nicht der Default-Nutzer), `@everyone` ohne Rechte und
 * der Bot selbst als Member mit Administrator-Rolle – sonst scheitert jeder
 * `guild.members.me.permissions`-Check. Der Rest von `APIGuild` (~30 weitere
 * Pflichtfelder wie `verification_level`, `mfa_level`, ...) steht hinter
 * `'feld' in data`-Checks und ist von Hand nicht sinnvoll konstruierbar – der
 * `as`-Cast ist hier die dokumentierte Ausnahme.
 *
 * Für eine schon verfügbare Guild ignoriert discord.js jedes weitere
 * `GUILD_CREATE` komplett (`handlers/GUILD_CREATE.js`) – wer vorab eine eigene
 * Guild injiziert, behält sie also, auch wenn `emit()` danach erneut seedet.
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
      // @everyone hat dieselbe Id wie die Guild
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
