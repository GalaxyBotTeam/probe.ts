import { Client, DiscordAPIError, GatewayIntentBits, MessageFlags, RESTJSONErrorCodes } from "discord.js";

/**
 * Example bot: "Apps → Report message/Report user" forwards a report to the
 * moderators' channel – serves as the reference example for context menu
 * commands (`probe.contextMenu(...)`), DM interactions
 * (`withContext({ dm: true })`) and Discord errors (`restError(...)`). Like
 * with real bots, the report channel comes from the config.
 */
export function createReportBot(reportChannelId: string): Client {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isContextMenuCommand()) return;
    if (!interaction.inGuild()) {
      await interaction.reply("Reports only work in a server.");
      return;
    }

    let channel;
    try {
      channel = await client.channels.fetch(reportChannelId);
    } catch (error) {
      if (!(error instanceof DiscordAPIError) || error.code !== RESTJSONErrorCodes.UnknownChannel) throw error;
      await interaction.reply({ content: "The report channel is gone – please tell an admin.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (!channel?.isSendable()) return;

    const reported = interaction.isMessageContextMenuCommand()
      ? `message ${interaction.targetId}: "${interaction.targetMessage.content}"`
      : `user ${interaction.targetUser}`;
    await channel.send(`🚩 ${interaction.user} reported ${reported}`);
    await interaction.reply({ content: "Thanks, the moderators will take a look.", flags: MessageFlags.Ephemeral });
  });

  return client;
}
