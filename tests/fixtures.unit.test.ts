import { ApplicationCommandOptionType, ChannelType, InteractionType } from "discord-api-types/v10";
import { describe, expect, it } from "vitest";
import { buildChannel } from "../src/fixtures/channel.js";
import { buildGuild } from "../src/fixtures/guild.js";
import { buildSlashCommandInteractionDispatch } from "../src/fixtures/interaction.js";
import { buildMember } from "../src/fixtures/member.js";
import { buildUser } from "../src/fixtures/user.js";

describe("Fixture-Builder", () => {
  it("buildUser: hat Defaults, alles überschreibbar", () => {
    expect(buildUser()).toMatchObject({ id: "1", username: "tester" });
    expect(buildUser({ username: "anna" })).toMatchObject({ id: "1", username: "anna" });
  });

  it("buildGuild: hat Defaults, alles überschreibbar", () => {
    expect(buildGuild({ id: "42" })).toMatchObject({ id: "42", features: [] });
  });

  it("buildChannel: hat Defaults, alles überschreibbar", () => {
    expect(buildChannel()).toMatchObject({ id: "1", type: ChannelType.GuildText });
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
    expect(interaction.guild_id).toBe("1");
    expect(interaction.member?.user.id).toBe("1");
    expect(interaction.data).toMatchObject({
      options: [
        { name: "name", type: ApplicationCommandOptionType.String, value: "anna" },
        { name: "laut", type: ApplicationCommandOptionType.Boolean, value: true },
        { name: "menge", type: ApplicationCommandOptionType.Number, value: 3 },
      ],
    });
  });
});
