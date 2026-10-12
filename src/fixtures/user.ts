import type { APIUser } from "discord-api-types/v10";
import { DEFAULT_IDS } from "./ids.js";

/**
 * Baut einen `APIUser`-Payload mit sinnvollen Defaults. Jedes Feld ist über
 * `overrides` änderbar.
 */
export function buildUser(overrides: Partial<APIUser> = {}): APIUser {
  return {
    id: DEFAULT_IDS.user,
    username: "tester",
    discriminator: "0000",
    global_name: null,
    avatar: null,
    ...overrides,
  };
}
