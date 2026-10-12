import { Client, GatewayIntentBits } from "discord.js";

/**
 * Minimal example bot: greets newly joined members in a fixed channel –
 * serves as the reference example for probe.ts's generic event API
 * (`probe.emit("guildMemberAdd", ...)`). Like with real bots, the channel
 * comes from the config.
 */
export function createWelcomeBot(welcomeChannelId: string): Client {
  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

  client.on("guildMemberAdd", async (member) => {
    const channel = member.guild.channels.cache.get(welcomeChannelId);
    if (channel?.isTextBased()) {
      await channel.send(`👋 Welcome, ${member}!`);
    }
  });

  return client;
}
