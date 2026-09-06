import { Client, GatewayIntentBits } from "discord.js";

/**
 * Minimaler Beispiel-Bot: "ping" antwortet sofort, "echo" zeigt Optionen,
 * "slow" zeigt `deferReply()` + `editReply()` – dient als Referenz-Beispiel
 * für die Slash-Command-API von probe.ts.
 */
export function createPingBot(): Client {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "ping") {
      await interaction.reply("🏓 Pong!");
      return;
    }

    if (interaction.commandName === "echo") {
      await interaction.reply(interaction.options.getString("message", true));
      return;
    }

    if (interaction.commandName === "slow") {
      await interaction.deferReply();
      await interaction.editReply("🐢 Fertig!");
      return;
    }
  });

  return client;
}
