import { ChannelType, type APIUser } from "discord-api-types/v10";
import { DEFAULT_IDS } from "./ids.js";

/** The `channel` payload of an interaction – discord.js only needs `id` + `type` (plus `recipients` for a DM). */
export interface ChannelFixture {
  id: string;
  type: ChannelType;
  recipients?: APIUser[];
}

/**
 * Builds the `channel` payload of an interaction with sensible defaults.
 * Every field can be changed via `overrides`.
 */
export function buildChannel(overrides: Partial<ChannelFixture> = {}): ChannelFixture {
  return {
    id: DEFAULT_IDS.channel,
    type: ChannelType.GuildText,
    ...overrides,
  };
}
