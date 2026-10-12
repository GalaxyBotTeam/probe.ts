import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, GatewayIntentBits, type Message } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import { createProbe, DEFAULT_IDS } from "../src/index.js";

/**
 * Reference example for probe.ts's REST responses: routes Discord answers
 * with a message return a real `Message`; everything else the test registers
 * via `probe.respond(...)`. No network, no mocked discord.js models.
 */
describe("REST responses", () => {
  it("channel.send(): returns a real Message with the sent content", async () => {
    const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
    let sent: Message | undefined;
    client.on("guildMemberAdd", async (member) => {
      const channel = member.guild.channels.cache.get(DEFAULT_IDS.channel);
      if (channel?.isTextBased()) sent = await channel.send("hello");
    });
    const probe = createProbe(client);
    await probe.setup();

    probe.emit("guildMemberAdd");

    await vi.waitFor(() => {
      expect(sent).toBeDefined();
    });
    expect(sent?.content).toBe("hello");
    expect(sent?.channelId).toBe(DEFAULT_IDS.channel);
    expect(sent?.author.id).toBe(DEFAULT_IDS.bot);

    await probe.teardown();
  });

  it("button(): clicks the message sent last – collectors bound to it fire", async () => {
    const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
    let clickedBy: string | undefined;
    client.on("guildMemberAdd", async (member) => {
      const channel = member.guild.channels.cache.get(DEFAULT_IDS.channel);
      if (!channel?.isTextBased()) return;
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("rules-ok").setLabel("OK").setStyle(ButtonStyle.Secondary),
      );
      const message = await channel.send({ content: "Read the rules?", components: [row] });
      const click = await message.awaitMessageComponent({ time: 1_000 });
      clickedBy = click.user.id;
      await click.reply("thanks");
    });
    const probe = createProbe(client);
    await probe.setup();

    probe.emit("guildMemberAdd");
    await vi.waitFor(() => {
      expect(probe.capturedRequests()).toHaveLength(1);
    });
    await probe.button("rules-ok").click();

    expect(clickedBy).toBe(DEFAULT_IDS.user);
    expect(probe.lastReply()?.content).toBe("thanks");

    await probe.teardown();
  });

  it("respond(): custom response for a route where the bot expects a body", async () => {
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    client.on("interactionCreate", async (interaction) => {
      if (!interaction.isChatInputCommand() || !interaction.guild) return;
      const invites = await interaction.guild.invites.fetch();
      await interaction.reply(`${invites.size} invites`);
    });
    const probe = createProbe(client);
    probe.respond("GET", /\/guilds\/\d+\/invites$/, () => []);
    await probe.setup();

    await probe.slashCommand("invites").invoke();

    expect(probe.lastReply()?.content).toBe("0 invites");

    await probe.teardown();
  });
});
