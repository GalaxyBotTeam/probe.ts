import { Client, GatewayIntentBits } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import { createProbe, DEFAULT_IDS } from "../src/index.js";
import { createPingBot } from "../examples/ping-bot/bot.js";

/**
 * Referenz-Beispiel für die Slash-Command-API von probe.ts: injiziert
 * Interactions über die fluent API (`probe.slashCommand(...).invoke()`) und
 * prüft die Antworten über `lastReply()`/`allReplies()`. Kein Netzwerk, keine
 * gemockten discord.js-Models.
 */
describe("slashCommand()", () => {
  it("beantwortet /ping sofort", async () => {
    const probe = createProbe(createPingBot());
    await probe.setup();

    await probe.slashCommand("ping").invoke();

    expect(probe.lastReply()).toMatchObject({ content: "🏓 Pong!" });
    expect(probe.allReplies()).toHaveLength(1);

    await probe.teardown();
  });

  it("übergibt Optionen an /echo", async () => {
    const probe = createProbe(createPingBot());
    await probe.setup();

    await probe.slashCommand("echo").withOptions({ message: "hallo" }).invoke();

    expect(probe.lastReply()).toMatchObject({ content: "hallo" });

    await probe.teardown();
  });

  it("/slow: deferReply() + editReply() sind über allReplies() sichtbar", async () => {
    const probe = createProbe(createPingBot());
    await probe.setup();

    await probe.slashCommand("slow").invoke();

    // invoke() wartet nur auf den ersten REST-Call (die Deferral) – auf die
    // anschließende editReply() muss wie gewohnt separat gewartet werden.
    await vi.waitFor(() => {
      expect(probe.allReplies()).toHaveLength(1);
    });

    expect(probe.lastReply()).toMatchObject({ content: "🐢 Fertig!" });
    expect(probe.capturedRequests()).toHaveLength(2);

    await probe.teardown();
  });

  it("login() + ready(): Handler, die erst nach dem Login registriert werden, sehen clientReady", async () => {
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    const probe = createProbe(client);

    await probe.login();
    // wie ein Bot, der nach `await client.login()` erst DB & Handler aufsetzt
    let readyAs: string | undefined;
    client.once("clientReady", (c) => {
      readyAs = c.user.id;
    });
    probe.ready();

    expect(readyAs).toBe(DEFAULT_IDS.bot);

    await probe.teardown();
  });

  it("withContext() + User-Option: Bot sieht Guild, Aufrufer und den aufgelösten Nutzer", async () => {
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

  it("Subcommands: Bot sieht Gruppe, Subcommand und deren Optionen", async () => {
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    client.on("interactionCreate", async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      const { options } = interaction;
      await interaction.reply(`${interaction.commandName}|${options.getSubcommandGroup()}|${options.getSubcommand()}|${options.getString("grund")}`);
    });
    const probe = createProbe(client);
    await probe.setup();

    await probe.slashCommand("ticket close").withOptions({ grund: "erledigt" }).invoke();
    expect(probe.lastReply()?.content).toBe("ticket|null|close|erledigt");

    await probe.slashCommand("ticket admin close").withOptions({ grund: "spam" }).invoke();
    expect(probe.lastReply()?.content).toBe("ticket|admin|close|spam");

    await probe.teardown();
  });
});
