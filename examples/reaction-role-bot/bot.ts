import { Client, GatewayIntentBits } from "discord.js";

const PREFIX = "!";

/**
 * Minimal example bot: classic prefix command (`!roles`) + reaction role
 * pattern (add/remove 🎮). Shows that both run through the same generic
 * gateway events as everything else in probe.ts – `messageCreate` and
 * `messageReactionAdd`/`messageReactionRemove`, no Discord API interaction
 * type of their own. Reference example for `docs/testing-event-handlers.md`.
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

    if (command === "roles") {
      await message.channel.send("React with 🎮 to this message for the gamer role!");
    }
  });

  client.on("messageReactionAdd", async (reaction, user) => {
    if (user.bot || reaction.emoji.name !== "🎮") return;
    const channel = reaction.message.channel;
    if (channel.isSendable()) await channel.send(`${user} now has the gamer role! 🎮`);
  });

  client.on("messageReactionRemove", async (reaction, user) => {
    if (user.bot || reaction.emoji.name !== "🎮") return;
    const channel = reaction.message.channel;
    if (channel.isSendable()) await channel.send(`${user} lost the gamer role again.`);
  });

  return client;
}
