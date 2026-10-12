import { Locale, type APIPartialInteractionGuild } from "discord-api-types/v10";
import { DEFAULT_IDS } from "./ids.js";

/**
 * Builds the `guild` payload of an interaction (`APIPartialInteractionGuild`)
 * with sensible defaults. Every field can be changed via `overrides`.
 */
export function buildGuild(overrides: Partial<APIPartialInteractionGuild> = {}): APIPartialInteractionGuild {
  return {
    id: DEFAULT_IDS.guild,
    features: [],
    locale: Locale.EnglishUS,
    ...overrides,
  };
}
