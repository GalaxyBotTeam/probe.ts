import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  DiscordAPIError,
  GatewayIntentBits,
  RESTEvents,
  type Message,
} from "discord.js";
import { describe, expect, it, vi } from "vitest";
import { createProbe, DEFAULT_IDS, restError } from "../src/index.js";

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

  it("restError(): the bot gets a real DiscordAPIError with Discord's code", async () => {
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    client.on("interactionCreate", async (interaction) => {
      if (!interaction.isChatInputCommand() || !interaction.guild) return;
      try {
        await interaction.guild.channels.fetch("42");
      } catch (error) {
        await interaction.reply(error instanceof DiscordAPIError ? `failed: ${error.code}` : "unexpected error");
      }
    });
    const probe = createProbe(client);
    probe.respond("GET", /\/channels\/42$/, () => restError(404, { code: 10003, message: "Unknown Channel" }));
    await probe.setup();

    await probe.slashCommand("channel").invoke();

    expect(probe.lastReply()?.content).toBe("failed: 10003");
    expect(probe.timeline().find((entry) => entry.kind === "request")).toMatchObject({ status: 404 });

    await probe.teardown();
  });

  it("restError(): a reply that failed doesn't count as a reply", async () => {
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    client.on("interactionCreate", async (interaction) => {
      if (!interaction.isChatInputCommand() || !interaction.channel?.isSendable()) return;
      try {
        await interaction.reply("hi");
      } catch {
        await interaction.channel.send("the interaction expired");
      }
    });
    const probe = createProbe(client);
    probe.respond("POST", /\/interactions\/.*\/callback$/, () => restError(404, { code: 10062, message: "Unknown interaction" }));
    await probe.setup();

    // invoke() waits past the failed reply for the bot's channel.send()
    await probe.slashCommand("hi").invoke();

    expect(probe.capturedRequests()).toHaveLength(2);
    expect(probe.capturedRequests()[0]).toMatchObject({ status: 404 });
    expect(probe.lastReply()).toBeUndefined();

    await probe.teardown();
  });

  it("restError(): a one-time 429 makes discord.js wait for Retry-After and send the call again", async () => {
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    const statuses: number[] = [];
    client.on("interactionCreate", async (interaction) => {
      if (!interaction.isChatInputCommand() || !interaction.channel?.isSendable()) return;
      await interaction.channel.send("after the rate limit");
    });
    const probe = createProbe(client);
    // after createProbe(): it replaces client.rest – the 429 is only visible on this event, like for real bots
    client.rest.on(RESTEvents.Response, (_request, response) => statuses.push(response.status));
    let limited = false;
    probe.respond("POST", /\/channels\/\d+\/messages$/, () => {
      if (limited) return undefined;
      limited = true;
      return restError(429, { message: "You are being rate limited.", retry_after: 0.01, global: false }, { "Retry-After": "0.01" });
    });
    await probe.setup();

    // invoke() waits past the 429 for the retried call
    await probe.slashCommand("send").invoke();

    expect(probe.capturedRequests()).toHaveLength(2);
    // the first 200 is `/gateway/bot` from setup()
    expect(statuses).toEqual([200, 429, 200]);
    expect((probe.capturedRequests()[1]?.body as { content?: string }).content).toBe("after the rate limit");

    await probe.teardown();
  });
});
