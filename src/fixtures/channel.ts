import { ChannelType } from "discord-api-types/v10";

/** Der `channel`-Payload einer Interaction – discord.js braucht nur `id` + `type`. */
export interface ChannelFixture {
  id: string;
  type: ChannelType;
}

/**
 * Baut den `channel`-Payload einer Interaction mit sinnvollen Defaults. Jedes
 * Feld ist über `overrides` änderbar.
 */
export function buildChannel(overrides: Partial<ChannelFixture> = {}): ChannelFixture {
  return {
    id: "1",
    type: ChannelType.GuildText,
    ...overrides,
  };
}
