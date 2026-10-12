import { ApplicationCommandOptionType, ChannelType, InteractionType } from "discord-api-types/v10";
import { describe, expect, it } from "vitest";
import { buildChannel } from "../src/fixtures/channel.js";
import { buildGuild } from "../src/fixtures/guild.js";
import { DEFAULT_IDS, snowflake } from "../src/fixtures/ids.js";
import { buildSlashCommandInteractionDispatch } from "../src/fixtures/interaction.js";
import { buildMember } from "../src/fixtures/member.js";
import { buildUser } from "../src/fixtures/user.js";

describe("Fixture-Builder", () => {
  it("buildUser: hat Defaults, alles überschreibbar", () => {
    expect(buildUser()).toMatchObject({ id: DEFAULT_IDS.user, username: "tester" });
    expect(buildUser({ username: "anna" })).toMatchObject({ id: DEFAULT_IDS.user, username: "anna" });
  });

  it("buildGuild: hat Defaults, alles überschreibbar", () => {
    expect(buildGuild({ id: "42" })).toMatchObject({ id: "42", features: [] });
  });

  it("buildChannel: hat Defaults, alles überschreibbar", () => {
    expect(buildChannel()).toMatchObject({ id: DEFAULT_IDS.channel, type: ChannelType.GuildText });
    expect(buildChannel({ type: ChannelType.GuildVoice })).toMatchObject({ type: ChannelType.GuildVoice });
  });

  it("buildMember: übernimmt einen übergebenen User statt den Default-User zu bauen", () => {
    const member = buildMember({ user: buildUser({ id: "99" }) });
    expect(member.user.id).toBe("99");
    expect(member.roles).toEqual([]);
  });

  it("buildSlashCommandInteractionDispatch: baut eine Guild-Interaction mit den übergebenen Optionen", () => {
    const dispatch = buildSlashCommandInteractionDispatch("greet", { options: { name: "anna", laut: true, menge: 3 } });
    const interaction = dispatch.d;
    if (!("data" in interaction) || interaction.type !== InteractionType.ApplicationCommand || !interaction.data) {
      throw new Error("erwartete eine ApplicationCommand-Interaction mit data");
    }
    expect(interaction.data.name).toBe("greet");
    expect(interaction.guild_id).toBe(DEFAULT_IDS.guild);
    expect(interaction.member?.user.id).toBe(DEFAULT_IDS.user);
    expect(interaction.data).toMatchObject({
      options: [
        { name: "name", type: ApplicationCommandOptionType.String, value: "anna" },
        { name: "laut", type: ApplicationCommandOptionType.Boolean, value: true },
        { name: "menge", type: ApplicationCommandOptionType.Number, value: 3 },
      ],
    });
  });

  it("snowflake: eindeutig, mit lesbarem Zeitstempel", () => {
    const at = Date.UTC(2026, 0, 1);
    const ids = new Set([snowflake(at), snowflake(at), snowflake(at)]);
    expect(ids.size).toBe(3);
    for (const id of ids) {
      expect(Number((BigInt(id) >> 22n) + 1_420_070_400_000n)).toBe(at);
    }
  });

  it("buildSlashCommandInteractionDispatch: jede Interaction bekommt eine frische Snowflake-Id", () => {
    const first = buildSlashCommandInteractionDispatch("ping").d.id;
    const second = buildSlashCommandInteractionDispatch("ping").d.id;
    expect(first).not.toBe(second);
    // discord.js' createdTimestamp kommt aus der Id – Bots verwerfen sonst "alte" Interactions
    expect(Date.now() - Number((BigInt(first) >> 22n) + 1_420_070_400_000n)).toBeLessThan(1_000);
  });
});
