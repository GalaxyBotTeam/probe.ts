import {
  GatewayDispatchEvents,
  GatewayOpcodes,
  type APIGuildMember,
  type GatewayGuildCreateDispatch,
  type GatewayGuildCreateDispatchData,
} from "discord-api-types/v10";
import { buildChannel, type ChannelFixture } from "./channel.js";

/**
 * Overrides für `buildGuildCreateDispatch` – die Guild dient nur als
 * Cache-Vorbereitung für Member-/Message-Events (siehe
 * `src/events/gateway-event.ts`), daher bewusst minimal: nur `id`, ein
 * Default-Channel und optional schon bekannte Members.
 */
export interface GuildCreateOverrides {
  id?: string;
  channel?: Partial<ChannelFixture>;
  members?: APIGuildMember[];
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
 * Nur die Felder, die discord.js' `Guild`/`AnonymousGuild`-`_patch()`
 * tatsächlich ungeschützt lesen (alles andere steht hinter `'feld' in
 * data`-Checks, verifiziert in `node_modules/discord.js/src/structures/
 * {Guild,AnonymousGuild}.js`), sind gesetzt. Der Rest von `APIGuild` (~30
 * weitere Pflichtfelder wie `verification_level`, `mfa_level`, ...) ist von
 * Hand nicht sinnvoll konstruierbar – der `as`-Cast ist hier die
 * dokumentierte Ausnahme (siehe `.claude/rules/typescript-conventions.md`).
 */
export function buildGuildCreateDispatch(overrides: GuildCreateOverrides = {}): GatewayGuildCreateDispatch {
  const channel = buildChannel(overrides.channel);

  const guild = {
    id: overrides.id ?? "1",
    channels: [channel],
    members: overrides.members ?? [],
  } as GatewayGuildCreateDispatchData;

  return {
    op: GatewayOpcodes.Dispatch,
    s: 1,
    t: GatewayDispatchEvents.GuildCreate,
    d: guild,
  };
}
