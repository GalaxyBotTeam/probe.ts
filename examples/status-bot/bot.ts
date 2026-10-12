import { Client, ContainerBuilder, GatewayIntentBits, MessageFlags, SeparatorBuilder, TextDisplayBuilder } from "discord.js";

/**
 * Minimal example bot: `/status` replies with a Components V2 container
 * (`ContainerBuilder`/`TextDisplayBuilder`/`SeparatorBuilder`) instead of
 * plain `content` – serves as the reference example for `extractText()` from
 * `src/interactions/replies.ts`, which makes such container replies usable in
 * assertions.
 */
export function createStatusBot(): Client {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== "status") return;

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent("🟢 All systems operational"))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent("Uptime: 3 days"));

    await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  });

  return client;
}
