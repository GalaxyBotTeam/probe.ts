import { Client, GatewayIntentBits } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import { createWelcomeBot } from "../examples/welcome-bot/bot.js";
import { createProbe } from "../src/index.js";

/**
 * Referenz-Beispiel für die generische Event-API von probe.ts: injiziert
 * Gateway-Events über `probe.emit(...)` und prüft echte discord.js-Objekte
 * (`GuildMember`, `Message`) sowie abgefangene REST-Calls. Kein Netzwerk,
 * keine gemockten discord.js-Models.
 */
describe("emit()", () => {
  it("guildMemberAdd: Welcome-Bot begrüßt im richtigen Channel", async () => {
    const probe = createProbe(createWelcomeBot());
    await probe.setup();

    probe.emit("guildMemberAdd", { user: { username: "anna" } });

    await vi.waitFor(() => {
      expect(probe.capturedRequests()).toHaveLength(1);
    });
    const body = probe.capturedRequests()[0]?.body as { content?: string } | undefined;
    expect(body?.content).toBe("👋 Willkommen, <@1>!");

    await probe.teardown();
  });

  it("guildMemberRemove: emittiert ein echtes GuildMember mit der übergebenen User-Id", async () => {
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

  it("messageCreate: Bot antwortet im gleichen Channel", async () => {
    const client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    });
    client.on("messageCreate", async (message) => {
      if (message.author.bot) return;
      await message.channel.send(`echo: ${message.content}`);
    });
    const probe = createProbe(client);
    await probe.setup();

    probe.emit("messageCreate", { content: "hallo" });

    await vi.waitFor(() => {
      expect(probe.capturedRequests()).toHaveLength(1);
    });
    const body = probe.capturedRequests()[0]?.body as { content?: string } | undefined;
    expect(body?.content).toBe("echo: hallo");

    await probe.teardown();
  });

  it("messageDelete: emittiert die zuvor erstellte Nachricht", async () => {
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
});
