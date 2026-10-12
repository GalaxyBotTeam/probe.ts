import { Client, GatewayIntentBits, PermissionFlagsBits } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import { createWelcomeBot } from "../examples/welcome-bot/bot.js";
import { createProbe, DEFAULT_IDS } from "../src/index.js";

/**
 * Reference example for probe.ts's generic event API: injects gateway events
 * via `probe.emit(...)` and checks real discord.js objects (`GuildMember`,
 * `Message`) as well as captured REST calls. No network, no mocked
 * discord.js models.
 */
describe("emit()", () => {
  it("guildMemberAdd: welcome bot greets in the right channel", async () => {
    const probe = createProbe(createWelcomeBot(DEFAULT_IDS.channel));
    await probe.setup();

    probe.emit("guildMemberAdd", { user: { username: "anna" } });

    await vi.waitFor(() => {
      expect(probe.capturedRequests()).toHaveLength(1);
    });
    const body = probe.capturedRequests()[0]?.body as { content?: string } | undefined;
    expect(body?.content).toBe(`👋 Welcome, <@${DEFAULT_IDS.user}>!`);

    await probe.teardown();
  });

  it("guildMemberRemove: emits a real GuildMember with the given user id", async () => {
    const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
    let removedId: string | undefined;
    client.on("guildMemberRemove", (member) => {
      removedId = member.id;
    });
    const probe = createProbe(client);
    await probe.setup();

    probe.emit("guildMemberRemove", { user: { id: "42" } });

    await vi.waitFor(() => {
      expect(removedId).toBe("42");
    });

    await probe.teardown();
  });

  it("messageCreate: bot replies in the same channel", async () => {
    const client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    });
    client.on("messageCreate", async (message) => {
      if (message.author.bot) return;
      await message.channel.send(`echo: ${message.content}`);
    });
    const probe = createProbe(client);
    await probe.setup();

    probe.emit("messageCreate", { content: "hello" });

    await vi.waitFor(() => {
      expect(probe.capturedRequests()).toHaveLength(1);
    });
    const body = probe.capturedRequests()[0]?.body as { content?: string } | undefined;
    expect(body?.content).toBe("echo: hello");

    await probe.teardown();
  });

  it("messageDelete: emits the previously created message", async () => {
    const client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    });
    let deletedId: string | undefined;
    client.on("messageDelete", (message) => {
      deletedId = message.id;
    });
    const probe = createProbe(client);
    await probe.setup();

    probe.emit("messageDelete", { id: "99" });

    await vi.waitFor(() => {
      expect(deletedId).toBe("99");
    });

    await probe.teardown();
  });

  it("seeded guild: owner, @everyone without permissions, the bot as administrator", async () => {
    const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
    const probe = createProbe(client);
    await probe.setup();

    probe.emit("guildMemberAdd", { user: { username: "anna" } });

    const guild = client.guilds.cache.get(DEFAULT_IDS.guild);
    expect(guild?.ownerId).toBe(DEFAULT_IDS.owner);
    expect(guild?.roles.everyone.permissions.bitfield).toBe(0n);
    expect(guild?.members.me?.permissions.has(PermissionFlagsBits.Administrator)).toBe(true);
    // the new member only has @everyone – no admin, unless the test says otherwise
    expect(guild?.members.cache.get(DEFAULT_IDS.user)?.permissions.has(PermissionFlagsBits.Administrator)).toBe(false);

    await probe.teardown();
  });
});
