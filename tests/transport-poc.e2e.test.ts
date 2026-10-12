import { Client, GatewayIntentBits } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import { createProbe, DEFAULT_IDS } from "../src/index.js";
import { createPingBot } from "../examples/ping-bot/bot.js";

/**
 * Reference example for probe.ts's slash command API: injects interactions
 * via the fluent API (`probe.slashCommand(...).invoke()`) and checks the
 * replies via `lastReply()`/`allReplies()`. No network, no mocked discord.js
 * models.
 */
describe("slashCommand()", () => {
  it("answers /ping right away", async () => {
    const probe = createProbe(createPingBot());
    await probe.setup();

    await probe.slashCommand("ping").invoke();

    expect(probe.lastReply()).toMatchObject({ content: "🏓 Pong!" });
    expect(probe.allReplies()).toHaveLength(1);

    await probe.teardown();
  });

  it("passes options to /echo", async () => {
    const probe = createProbe(createPingBot());
    await probe.setup();

    await probe.slashCommand("echo").withOptions({ message: "hello" }).invoke();

    expect(probe.lastReply()).toMatchObject({ content: "hello" });

    await probe.teardown();
  });

  it("/slow: deferReply() + editReply() are visible via allReplies()", async () => {
    const probe = createProbe(createPingBot());
    await probe.setup();

    await probe.slashCommand("slow").invoke();

    // invoke() only waits for the first REST call (the deferral) – the
    // following editReply() has to be awaited separately as usual.
    await vi.waitFor(() => {
      expect(probe.allReplies()).toHaveLength(1);
    });

    expect(probe.lastReply()).toMatchObject({ content: "🐢 Done!" });
    expect(probe.capturedRequests()).toHaveLength(2);

    await probe.teardown();
  });

  it("login() + ready(): handlers registered only after login see clientReady", async () => {
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    const probe = createProbe(client);

    await probe.login();
    // like a bot that sets up DB & handlers only after `await client.login()`
    let readyAs: string | undefined;
    client.once("clientReady", (c) => {
      readyAs = c.user.id;
    });
    probe.ready();

    expect(readyAs).toBe(DEFAULT_IDS.bot);

    await probe.teardown();
  });

  it("withContext() + user option: bot sees guild, caller and the resolved user", async () => {
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    client.on("interactionCreate", async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      const target = interaction.options.getUser("member", true);
      const targetMember = interaction.options.getMember("member");
      await interaction.reply(`${interaction.guildId}|${interaction.user.id}|${target.username}|${targetMember ? "member" : "none"}`);
    });
    const probe = createProbe(client);
    await probe.setup();

    await probe
      .slashCommand("whois")
      .withContext({ guild: { id: "1200000000000000001" }, user: { id: "1200000000000000002" } })
      .withOptions({ member: { user: { id: "1200000000000000003", username: "anna" } } })
      .invoke();

    expect(probe.lastReply()?.content).toBe("1200000000000000001|1200000000000000002|anna|member");

    await probe.teardown();
  });

  it("subcommands: bot sees group, subcommand and their options", async () => {
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    client.on("interactionCreate", async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      const { options } = interaction;
      await interaction.reply(`${interaction.commandName}|${options.getSubcommandGroup()}|${options.getSubcommand()}|${options.getString("reason")}`);
    });
    const probe = createProbe(client);
    await probe.setup();

    await probe.slashCommand("ticket close").withOptions({ reason: "done" }).invoke();
    expect(probe.lastReply()?.content).toBe("ticket|null|close|done");

    await probe.slashCommand("ticket admin close").withOptions({ reason: "spam" }).invoke();
    expect(probe.lastReply()?.content).toBe("ticket|admin|close|spam");

    await probe.teardown();
  });
});
