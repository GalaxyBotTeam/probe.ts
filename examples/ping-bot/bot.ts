import { Client, GatewayIntentBits } from "discord.js";

/**
 * Minimal example bot: "ping" replies right away, "echo" shows options,
 * "slow" shows `deferReply()` + `editReply()` – serves as the reference
 * example for probe.ts's slash command API.
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
      await interaction.editReply("🐢 Done!");
      return;
    }
  });

  return client;
}
