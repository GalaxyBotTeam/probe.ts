import { MessageType, type APIMessage, type APIUser } from "discord-api-types/v10";
import { DEFAULT_IDS } from "./ids.js";
import { buildChannel, type ChannelFixture } from "./channel.js";
import { buildUser } from "./user.js";

/** Fixture overrides for `buildMessage` – every field overridable on its own. */
export interface MessageOverrides {
  id?: string;
  content?: string;
  author?: Partial<APIUser>;
  channel?: Partial<ChannelFixture>;
}

/**
 * Builds a raw `APIMessage` with sensible defaults. Shared foundation for
 * `MESSAGE_CREATE` dispatches (`message-events.ts`) and for the `message`
 * field of a component interaction (`message-component-interaction.ts`) –
 * discord.js requires a complete `APIMessage` in both places.
 */
export function buildMessage(overrides: MessageOverrides = {}): APIMessage {
  const channel = buildChannel(overrides.channel);

  return {
    id: overrides.id ?? DEFAULT_IDS.message,
    channel_id: channel.id,
    author: buildUser(overrides.author),
    content: overrides.content ?? "",
    timestamp: "2024-01-01T00:00:00.000Z",
    edited_timestamp: null,
    tts: false,
    mention_everyone: false,
    mentions: [],
    mention_roles: [],
    attachments: [],
    embeds: [],
    pinned: false,
    type: MessageType.Default,
  } satisfies APIMessage;
}
