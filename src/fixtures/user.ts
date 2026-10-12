import type { APIUser } from "discord-api-types/v10";
import { DEFAULT_IDS } from "./ids.js";

/**
 * Builds an `APIUser` payload with sensible defaults. Every field can be
 * changed via `overrides`.
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
