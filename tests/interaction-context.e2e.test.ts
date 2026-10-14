import { Client, GatewayIntentBits, type Interaction } from "discord.js";
import { describe, expect, it } from "vitest";
import { buildGuildCreateDispatch, createProbe, DEFAULT_IDS } from "../src/index.js";

/** A bot that answers every interaction with where it came from and who sent it. */
function createWhereBot(): Client {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  client.on("interactionCreate", async (interaction: Interaction) => {
    if (!interaction.isRepliable()) return;
    const where = interaction.inGuild() ? `guild ${interaction.guildId}` : `dm ${interaction.channelId}`;
    await interaction.reply(`${where} from ${interaction.user.id}`);
  });
  return client;
}

/**
 * Reference example for where an interaction runs and what Discord sends
 * along with it: DMs via `withContext({ dm: true })`, integer options and
 * the guild member behind a user option or context menu target.
 */
describe("Interaction context and options", () => {
  it("withContext({ dm: true }): every interaction kind arrives as a DM from the given user", async () => {
    const probe = createProbe(createWhereBot());
    await probe.setup();
    const dm = { dm: true, user: { id: "42" } };
    const expected = `dm ${DEFAULT_IDS.dmChannel} from 42`;

    await probe.slashCommand("where").withContext(dm).invoke();
    expect(probe.lastReply()?.content).toBe(expected);
    await probe.button("rate-5").withContext(dm).click();
    expect(probe.lastReply()?.content).toBe(expected);
    await probe.selectMenu("pick").withValues(["a"]).withContext(dm).select();
    expect(probe.lastReply()?.content).toBe(expected);
    await probe.modal("form").withContext(dm).submit();
    expect(probe.lastReply()?.content).toBe(expected);
    await probe.contextMenu("Info").withContext(dm).onUser({ id: "7" });
    expect(probe.lastReply()?.content).toBe(expected);

    await probe.slashCommand("where").invoke();
    expect(probe.lastReply()?.content).toBe(`guild ${DEFAULT_IDS.guild} from ${DEFAULT_IDS.user}`);

    await probe.teardown();
  });

  it("withOptions(): `{ integer }` is an integer option, a plain number a number option", async () => {
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    client.on("interactionCreate", async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      const days = interaction.options.getInteger("days", true);
      const factor = interaction.options.getNumber("factor", true);
      await interaction.reply(`${days} days × ${factor}`);
    });
    const probe = createProbe(client);
    await probe.setup();

    await probe.slashCommand("timeout").withOptions({ days: { integer: 3 }, factor: 1.5 }).invoke();

    expect(probe.lastReply()?.content).toBe("3 days × 1.5");
    await probe.teardown();
  });

  it("withOptions(): the member behind a user option keeps the given roles", async () => {
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    client.on("interactionCreate", async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      const member = interaction.options.getMember("target");
      const roles = member && "roles" in member && !Array.isArray(member.roles) ? [...member.roles.cache.keys()] : [];
      await interaction.reply(`roles: ${roles.filter((id) => id !== interaction.guildId).join(",")}`);
    });
    const probe = createProbe(client);
    await probe.setup();

    probe.injectDispatch(buildGuildCreateDispatch({ roles: [{ id: "77" }] }));

    await probe.slashCommand("warn").withOptions({ target: { user: { id: "42" }, member: { roles: ["77"] } } }).invoke();

    expect(probe.lastReply()?.content).toBe("roles: 77");
    await probe.teardown();
  });

  it("withOptions(): a user option in a DM has no member, like on Discord", async () => {
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    client.on("interactionCreate", async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      const user = interaction.options.getUser("target", true);
      await interaction.reply(`${user.id} member:${interaction.options.getMember("target") !== null}`);
    });
    const probe = createProbe(client);
    await probe.setup();

    await probe.slashCommand("info").withOptions({ target: { user: { id: "42" } } }).withContext({ dm: true }).invoke();

    expect(probe.lastReply()?.content).toBe("42 member:false");
    await probe.teardown();
  });

  it("contextMenu().onUser(): the target member keeps the given roles", async () => {
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    client.on("interactionCreate", async (interaction) => {
      if (!interaction.isUserContextMenuCommand()) return;
      const member = interaction.targetMember;
      const roles = member && "roles" in member && !Array.isArray(member.roles) ? [...member.roles.cache.keys()] : [];
      await interaction.reply(`roles: ${roles.filter((id) => id !== interaction.guildId).join(",")}`);
    });
    const probe = createProbe(client);
    await probe.setup();

    probe.injectDispatch(buildGuildCreateDispatch({ roles: [{ id: "77" }] }));

    await probe.contextMenu("Warn").onUser({ id: "42" }, { roles: ["77"] });

    expect(probe.lastReply()?.content).toBe("roles: 77");
    await probe.teardown();
  });
});
