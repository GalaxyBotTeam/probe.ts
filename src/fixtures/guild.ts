import { Locale, type APIPartialInteractionGuild } from "discord-api-types/v10";

/**
 * Baut den `guild`-Payload einer Interaction (`APIPartialInteractionGuild`)
 * mit sinnvollen Defaults. Jedes Feld ist über `overrides` änderbar.
 */
export function buildGuild(overrides: Partial<APIPartialInteractionGuild> = {}): APIPartialInteractionGuild {
  return {
    id: "1",
    features: [],
    locale: Locale.EnglishUS,
    ...overrides,
  };
}
