import type { APIUser } from "discord-api-types/v10";

/**
 * Baut einen `APIUser`-Payload mit sinnvollen Defaults. Jedes Feld ist über
 * `overrides` änderbar.
 */
export function buildUser(overrides: Partial<APIUser> = {}): APIUser {
  return {
    id: "1",
    username: "tester",
    discriminator: "0000",
    global_name: null,
    avatar: null,
    ...overrides,
  };
}
