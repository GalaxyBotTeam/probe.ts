/** Discord epoch (2015-01-01T00:00:00Z) – reference point of every snowflake. */
const DISCORD_EPOCH = 1_420_070_400_000n;

/**
 * Default IDs of all fixture builders – real snowflakes instead of `"1"`,
 * because bots often validate IDs (length 17–20, timestamp) and silently
 * drop short ones. Consistent across all builders: a `buildGuild()` and a
 * `buildChannel()` without overrides fit together, `buildMessage()` lives in
 * the default channel, etc.
 */
export const DEFAULT_IDS = {
  guild: "1100000000000000001",
  channel: "1100000000000000002",
  user: "1100000000000000003",
  message: "1100000000000000004",
  /** The bot itself (`client.user`) – comes from the READY payload of `setup()`. */
  bot: "1100000000000000005",
  application: "1100000000000000006",
  /** Role the bot holds in every seeded guild (Administrator). */
  botRole: "1100000000000000007",
  command: "1100000000000000008",
  /** Owner of every seeded guild – deliberately not `user`, otherwise the default user would pass every permission check. */
  owner: "1100000000000000009",
  /** The DM channel between the user and the bot – used by interactions with `dm: true`. */
  dmChannel: "1100000000000000010",
} as const;

let sequence = 0n;

/**
 * Creates a new, unique snowflake with the timestamp `date` (default: now).
 * discord.js reads `createdTimestamp` from the ID – bots that drop
 * interactions that are too old see a fresh interaction this way.
 */
export function snowflake(date: number = Date.now()): string {
  sequence = (sequence + 1n) & 0xfffn;
  return (((BigInt(date) - DISCORD_EPOCH) << 22n) | sequence).toString();
}
