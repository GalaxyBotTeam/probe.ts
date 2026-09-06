import { Client, GatewayIntentBits } from "discord.js";

const PREFIX = "!";

/**
 * Minimaler Beispiel-Bot: klassischer Prefix-Command (`!rollen`) +
 * Reaction-Role-Muster (🎮 hinzufügen/entfernen). Zeigt, dass beides über
 * dieselben generischen Gateway-Events läuft wie alles andere in
 * probe.ts – `messageCreate` bzw. `messageReactionAdd`/`messageReactionRemove`,
 * kein eigener Discord-API-Interaction-Typ. Referenz-Beispiel für
 * `docs/testing-event-handlers.md`.
 */
export function createReactionRoleBot(): Client {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMessageReactions,
    ],
  });

  client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;
    const command = message.content.slice(PREFIX.length).trim();

    if (command === "rollen") {
      await message.channel.send("Reagiere mit 🎮 auf diese Nachricht für die Gamer-Rolle!");
    }
  });

  client.on("messageReactionAdd", async (reaction, user) => {
    if (user.bot || reaction.emoji.name !== "🎮") return;
    const channel = reaction.message.channel;
    if (channel.isSendable()) await channel.send(`${user} hat jetzt die Gamer-Rolle! 🎮`);
  });

  client.on("messageReactionRemove", async (reaction, user) => {
    if (user.bot || reaction.emoji.name !== "🎮") return;
    const channel = reaction.message.channel;
    if (channel.isSendable()) await channel.send(`${user} hat die Gamer-Rolle wieder verloren.`);
  });

  return client;
}
