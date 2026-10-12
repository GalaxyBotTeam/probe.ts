import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, GatewayIntentBits, type Message } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import { createProbe, DEFAULT_IDS } from "../src/index.js";

/**
 * Referenz-Beispiel für die REST-Antworten von probe.ts: Routen, auf die
 * Discord mit einer Nachricht antwortet, liefern eine echte `Message`; alles
 * andere hinterlegt der Test über `probe.respond(...)`. Kein Netzwerk, keine
 * gemockten discord.js-Models.
 */
describe("REST-Antworten", () => {
  it("channel.send(): liefert eine echte Message mit dem gesendeten Inhalt", async () => {
    const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
    let sent: Message | undefined;
    client.on("guildMemberAdd", async (member) => {
      const channel = member.guild.channels.cache.get(DEFAULT_IDS.channel);
      if (channel?.isTextBased()) sent = await channel.send("hallo");
    });
    const probe = createProbe(client);
    await probe.setup();

    probe.emit("guildMemberAdd");

    await vi.waitFor(() => {
      expect(sent).toBeDefined();
    });
    expect(sent?.content).toBe("hallo");
    expect(sent?.channelId).toBe(DEFAULT_IDS.channel);
    expect(sent?.author.id).toBe(DEFAULT_IDS.bot);

    await probe.teardown();
  });

  it("button(): klickt auf die zuletzt gesendete Nachricht – an sie gebundene Collectors greifen", async () => {
    const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
    let clickedBy: string | undefined;
    client.on("guildMemberAdd", async (member) => {
      const channel = member.guild.channels.cache.get(DEFAULT_IDS.channel);
      if (!channel?.isTextBased()) return;
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("rules-ok").setLabel("OK").setStyle(ButtonStyle.Secondary),
      );
      const message = await channel.send({ content: "Regeln gelesen?", components: [row] });
      const click = await message.awaitMessageComponent({ time: 1_000 });
      clickedBy = click.user.id;
      await click.reply("danke");
    });
    const probe = createProbe(client);
    await probe.setup();

    probe.emit("guildMemberAdd");
    await vi.waitFor(() => {
      expect(probe.capturedRequests()).toHaveLength(1);
    });
    await probe.button("rules-ok").click();

    expect(clickedBy).toBe(DEFAULT_IDS.user);
    expect(probe.lastReply()?.content).toBe("danke");

    await probe.teardown();
  });

  it("respond(): eigene Antwort für eine Route, die der Bot mit Body erwartet", async () => {
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    client.on("interactionCreate", async (interaction) => {
      if (!interaction.isChatInputCommand() || !interaction.guild) return;
      const invites = await interaction.guild.invites.fetch();
      await interaction.reply(`${invites.size} Einladungen`);
    });
    const probe = createProbe(client);
    probe.respond("GET", /\/guilds\/\d+\/invites$/, () => []);
    await probe.setup();

    await probe.slashCommand("invites").invoke();

    expect(probe.lastReply()?.content).toBe("0 Einladungen");

    await probe.teardown();
  });
});
