import { MessageType, type APIMessage, type APIUser } from "discord-api-types/v10";
import { buildChannel, type ChannelFixture } from "./channel.js";
import { buildUser } from "./user.js";

/** Fixture-Overrides für `buildMessage` – jedes Feld einzeln überschreibbar. */
export interface MessageOverrides {
  id?: string;
  content?: string;
  author?: Partial<APIUser>;
  channel?: Partial<ChannelFixture>;
}

/**
 * Baut eine rohe `APIMessage` mit sinnvollen Defaults. Gemeinsamer Unterbau
 * für `MESSAGE_CREATE`-Dispatches (`message-events.ts`) und für das
 * `message`-Feld einer Component-Interaction (`message-component-interaction.ts`) –
 * discord.js verlangt dort jeweils eine vollständige `APIMessage`.
 */
export function buildMessage(overrides: MessageOverrides = {}): APIMessage {
  const channel = buildChannel(overrides.channel);

  return {
    id: overrides.id ?? "1",
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
