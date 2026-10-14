import {
  AuditLogEvent,
  GatewayDispatchEvents,
  GatewayOpcodes,
  type APIAuditLogChange,
  type APIAuditLogOptions,
  type GatewayGuildAuditLogEntryCreateDispatch,
  type GatewayGuildAuditLogEntryCreateDispatchData,
} from "discord-api-types/v10";
import { DEFAULT_IDS, snowflake } from "./ids.js";

/** Fixture overrides for `buildGuildAuditLogEntryCreateDispatch`. */
export interface AuditLogEntryOverrides {
  /** What happened (default: `AuditLogEvent.MemberBanAdd`). */
  actionType?: AuditLogEvent;
  /** Who or what it happened to – user, role, channel, webhook, ... (default: `DEFAULT_IDS.user`). */
  targetId?: string | null;
  /** Who did it (default: `DEFAULT_IDS.owner`). */
  executorId?: string | null;
  /** Changed fields, e.g. `[{ key: "communication_disabled_until", new_value: "2030-01-01T00:00:00.000Z" }]`. */
  changes?: APIAuditLogChange[];
  /** Extra info of some action types, e.g. `delete_member_days` for a prune. */
  options?: APIAuditLogOptions;
  reason?: string;
  guildId?: string;
}

/**
 * Builds a raw `GUILD_AUDIT_LOG_ENTRY_CREATE` gateway dispatch event – what a
 * bot with the `GuildModeration` intent sees when someone acts directly in
 * Discord (ban, timeout, role change, ...). Requires the guild to be known in
 * the client cache already – `probe.emit("guildAuditLogEntryCreate", ...)`
 * takes care of that automatically.
 */
export function buildGuildAuditLogEntryCreateDispatch(
  overrides: AuditLogEntryOverrides = {},
): GatewayGuildAuditLogEntryCreateDispatch {
  const data = {
    id: snowflake(),
    guild_id: overrides.guildId ?? DEFAULT_IDS.guild,
    action_type: overrides.actionType ?? AuditLogEvent.MemberBanAdd,
    target_id: overrides.targetId === undefined ? DEFAULT_IDS.user : overrides.targetId,
    user_id: overrides.executorId === undefined ? DEFAULT_IDS.owner : overrides.executorId,
    ...(overrides.changes ? { changes: overrides.changes } : {}),
    ...(overrides.options ? { options: overrides.options } : {}),
    ...(overrides.reason ? { reason: overrides.reason } : {}),
  } satisfies GatewayGuildAuditLogEntryCreateDispatchData;

  return {
    op: GatewayOpcodes.Dispatch,
    s: 1,
    t: GatewayDispatchEvents.GuildAuditLogEntryCreate,
    d: data,
  };
}
