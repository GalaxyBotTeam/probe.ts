import { Client, ContainerBuilder, GatewayIntentBits, MessageFlags, SeparatorBuilder, TextDisplayBuilder } from "discord.js";

/**
 * Minimaler Beispiel-Bot: `/status` antwortet mit einem Components-V2-
 * Container (`ContainerBuilder`/`TextDisplayBuilder`/`SeparatorBuilder`)
 * statt einfachem `content` – dient als Referenz-Beispiel für
 * `extractText()` aus `src/interactions/replies.ts`, das solche
 * Container-Antworten für Assertions sinnvoll auswertbar macht.
 */
export function createStatusBot(): Client {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== "status") return;

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent("🟢 Alle Systeme laufen"))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent("Uptime: 3 Tage"));

    await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  });

  return client;
}
