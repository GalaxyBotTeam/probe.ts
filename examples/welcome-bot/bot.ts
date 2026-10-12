import { Client, GatewayIntentBits } from "discord.js";

/**
 * Minimaler Beispiel-Bot: begrüßt neu beigetretene Mitglieder in einem
 * festen Channel – dient als Referenz-Beispiel für die generische
 * Event-API von probe.ts (`probe.emit("guildMemberAdd", ...)`). Der Channel
 * kommt wie bei echten Bots aus der Config.
 */
export function createWelcomeBot(welcomeChannelId: string): Client {
  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

  client.on("guildMemberAdd", async (member) => {
    const channel = member.guild.channels.cache.get(welcomeChannelId);
    if (channel?.isTextBased()) {
      await channel.send(`👋 Willkommen, ${member}!`);
    }
  });

  return client;
}
