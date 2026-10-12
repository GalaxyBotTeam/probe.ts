/** Discord-Epoche (2015-01-01T00:00:00Z) – Bezugspunkt jeder Snowflake. */
const DISCORD_EPOCH = 1_420_070_400_000n;

/**
 * Default-IDs aller Fixture-Builder – echte Snowflakes statt `"1"`, weil Bots
 * IDs oft validieren (Länge 17–20, Zeitstempel) und kurze IDs dann still
 * verwerfen. Konsistent über alle Builder: ein `buildGuild()` und ein
 * `buildChannel()` ohne Overrides passen zueinander, `buildMessage()` liegt
 * im Default-Channel usw.
 */
export const DEFAULT_IDS = {
  guild: "1100000000000000001",
  channel: "1100000000000000002",
  user: "1100000000000000003",
  message: "1100000000000000004",
  /** Der Bot selbst (`client.user`) – kommt aus dem READY-Payload von `setup()`. */
  bot: "1100000000000000005",
  application: "1100000000000000006",
  /** Rolle, die der Bot in jeder geseedeten Guild trägt (Administrator). */
  botRole: "1100000000000000007",
  command: "1100000000000000008",
  /** Owner jeder geseedeten Guild – bewusst nicht `user`, sonst bestünde der Default-Nutzer jeden Rechte-Check. */
  owner: "1100000000000000009",
} as const;

let sequence = 0n;

/**
 * Erzeugt eine neue, eindeutige Snowflake mit dem Zeitstempel `date`
 * (Default: jetzt). discord.js liest `createdTimestamp` aus der ID – Bots, die
 * zu alte Interactions verwerfen, sehen so eine frische Interaction.
 */
export function snowflake(date: number = Date.now()): string {
  sequence = (sequence + 1n) & 0xfffn;
  return (((BigInt(date) - DISCORD_EPOCH) << 22n) | sequence).toString();
}
