import { Client, GatewayIntentBits } from "discord.js";
import { describe, expect, it } from "vitest";
import { createProbe, DEFAULT_IDS } from "../src/index.js";

/**
 * Reference example for context menu commands ("Apps" on a user or message):
 * discord.js builds a real `UserContextMenuCommandInteraction`/
 * `MessageContextMenuCommandInteraction` with resolved targets.
 */
describe("contextMenu()", () => {
  it("onUser(): the bot gets the target user and member", async () => {
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    client.on("interactionCreate", async (interaction) => {
      if (!interaction.isUserContextMenuCommand()) return;
      const hasMember = interaction.targetMember !== null;
      await interaction.reply(`${interaction.commandName} ${interaction.targetUser.username} member:${hasMember}`);
    });
    const probe = createProbe(client);
    await probe.setup();

    await probe.contextMenu("Warn").onUser({ id: "42", username: "anna" });

    expect(probe.lastReply()?.content).toBe("Warn anna member:true");

    await probe.teardown();
  });

  it("onMessage(): the bot gets the target message, opened by the given user", async () => {
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    client.on("interactionCreate", async (interaction) => {
      if (!interaction.isMessageContextMenuCommand()) return;
      const { targetMessage, user } = interaction;
      await interaction.reply(`${user.id} reported "${targetMessage.content}" in ${targetMessage.channelId}`);
    });
    const probe = createProbe(client);
    await probe.setup();

    await probe.contextMenu("Report").withContext({ user: { id: "7" } }).onMessage({ content: "spam" });

    expect(probe.lastReply()?.content).toBe(`7 reported "spam" in ${DEFAULT_IDS.channel}`);

    await probe.teardown();
  });
});
