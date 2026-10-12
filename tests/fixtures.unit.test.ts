import { ApplicationCommandOptionType, ChannelType, InteractionType } from "discord-api-types/v10";
import { describe, expect, it } from "vitest";
import { buildChannel } from "../src/fixtures/channel.js";
import { buildGuild } from "../src/fixtures/guild.js";
import { DEFAULT_IDS, snowflake } from "../src/fixtures/ids.js";
import { buildSlashCommandInteractionDispatch } from "../src/fixtures/interaction.js";
import { buildMember } from "../src/fixtures/member.js";
import { buildUser } from "../src/fixtures/user.js";

describe("Fixture builders", () => {
  it("buildUser: has defaults, everything overridable", () => {
    expect(buildUser()).toMatchObject({ id: DEFAULT_IDS.user, username: "tester" });
    expect(buildUser({ username: "anna" })).toMatchObject({ id: DEFAULT_IDS.user, username: "anna" });
  });

  it("buildGuild: has defaults, everything overridable", () => {
    expect(buildGuild({ id: "42" })).toMatchObject({ id: "42", features: [] });
  });

  it("buildChannel: has defaults, everything overridable", () => {
    expect(buildChannel()).toMatchObject({ id: DEFAULT_IDS.channel, type: ChannelType.GuildText });
    expect(buildChannel({ type: ChannelType.GuildVoice })).toMatchObject({ type: ChannelType.GuildVoice });
  });

  it("buildMember: takes a given user instead of building the default user", () => {
    const member = buildMember({ user: buildUser({ id: "99" }) });
    expect(member.user.id).toBe("99");
    expect(member.roles).toEqual([]);
  });

  it("buildSlashCommandInteractionDispatch: builds a guild interaction with the given options", () => {
    const dispatch = buildSlashCommandInteractionDispatch("greet", { options: { name: "anna", loud: true, amount: 3 } });
    const interaction = dispatch.d;
    if (!("data" in interaction) || interaction.type !== InteractionType.ApplicationCommand || !interaction.data) {
      throw new Error("expected an ApplicationCommand interaction with data");
    }
    expect(interaction.data.name).toBe("greet");
    expect(interaction.guild_id).toBe(DEFAULT_IDS.guild);
    expect(interaction.member?.user.id).toBe(DEFAULT_IDS.user);
    expect(interaction.data).toMatchObject({
      options: [
        { name: "name", type: ApplicationCommandOptionType.String, value: "anna" },
        { name: "loud", type: ApplicationCommandOptionType.Boolean, value: true },
        { name: "amount", type: ApplicationCommandOptionType.Number, value: 3 },
      ],
    });
  });

  it("buildSlashCommandInteractionDispatch: nests options into subcommand group and subcommand", () => {
    const interaction = buildSlashCommandInteractionDispatch("ticket admin close", { options: { reason: "spam" } }).d;
    if (!("data" in interaction) || interaction.type !== InteractionType.ApplicationCommand || !interaction.data) {
      throw new Error("expected an ApplicationCommand interaction with data");
    }
    expect(interaction.data).toMatchObject({
      name: "ticket",
      options: [
        {
          name: "admin",
          type: ApplicationCommandOptionType.SubcommandGroup,
          options: [
            {
              name: "close",
              type: ApplicationCommandOptionType.Subcommand,
              options: [{ name: "reason", type: ApplicationCommandOptionType.String, value: "spam" }],
            },
          ],
        },
      ],
    });
    expect(() => buildSlashCommandInteractionDispatch("a b c d")).toThrow(/at most/);
  });

  it("snowflake: unique, with a readable timestamp", () => {
    const at = Date.UTC(2026, 0, 1);
    const ids = new Set([snowflake(at), snowflake(at), snowflake(at)]);
    expect(ids.size).toBe(3);
    for (const id of ids) {
      expect(Number((BigInt(id) >> 22n) + 1_420_070_400_000n)).toBe(at);
    }
  });

  it("buildSlashCommandInteractionDispatch: every interaction gets a fresh snowflake id", () => {
    const first = buildSlashCommandInteractionDispatch("ping").d.id;
    const second = buildSlashCommandInteractionDispatch("ping").d.id;
    expect(first).not.toBe(second);
    // discord.js' createdTimestamp comes from the id – otherwise bots drop "old" interactions
    expect(Date.now() - Number((BigInt(first) >> 22n) + 1_420_070_400_000n)).toBeLessThan(1_000);
  });
});
