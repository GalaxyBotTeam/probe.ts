import { Locale, type APIPartialInteractionGuild } from "discord-api-types/v10";
import { DEFAULT_IDS } from "./ids.js";

/**
 * Baut den `guild`-Payload einer Interaction (`APIPartialInteractionGuild`)
 * mit sinnvollen Defaults. Jedes Feld ist über `overrides` änderbar.
 */
export function buildGuild(overrides: Partial<APIPartialInteractionGuild> = {}): APIPartialInteractionGuild {
  return {
    id: DEFAULT_IDS.guild,
    features: [],
    locale: Locale.EnglishUS,
    ...overrides,
  };
}
