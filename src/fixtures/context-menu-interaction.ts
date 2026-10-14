import {
  ApplicationCommandType,
  GatewayDispatchEvents,
  GatewayOpcodes,
  InteractionType,
  Locale,
  type APIInteractionDataResolvedGuildMember,
  type APIMessageApplicationCommandInteraction,
  type APIUser,
  type APIUserApplicationCommandInteraction,
  type GatewayInteractionCreateDispatch,
} from "discord-api-types/v10";
import { DEFAULT_IDS, snowflake } from "./ids.js";
import { buildInteractionContext, type InteractionContextOverrides } from "./interaction-context.js";
import { buildMember } from "./member.js";
import { buildMessage, type MessageOverrides } from "./message.js";
import { buildUser } from "./user.js";

/** Fixture overrides for `buildUserContextMenuInteractionDispatch`. */
export interface UserContextMenuOverrides extends InteractionContextOverrides {
  /** The user the menu was opened on (default: `DEFAULT_IDS.user`). */
  target?: Partial<APIUser>;
  /**
   * The fields Discord sends for the target's guild member (e.g. `roles`) –
   * discord.js puts them into the member cache. No member in a DM.
   */
  targetMember?: Partial<APIInteractionDataResolvedGuildMember>;
}

/** Fixture overrides for `buildMessageContextMenuInteractionDispatch`. */
export interface MessageContextMenuOverrides extends InteractionContextOverrides {
  /** The message the menu was opened on (default: `buildMessage()`). */
  target?: MessageOverrides;
}

/** The fields every context menu interaction shares with a slash command – only `data` differs. */
function baseInteraction(overrides: InteractionContextOverrides) {
  const { channel, origin } = buildInteractionContext(overrides);
  return {
    id: snowflake(),
    application_id: DEFAULT_IDS.application,
    type: InteractionType.ApplicationCommand as const,
    token: "interaction-token",
    version: 1 as const,
    locale: Locale.EnglishUS,
    app_permissions: "0",
    entitlements: [],
    authorizing_integration_owners: {},
    attachment_size_limit: 26_214_400,
    channel_id: channel.id,
    // same generic channel fixture as in `interaction.ts` – see the cast there
    channel: channel as APIUserApplicationCommandInteraction["channel"],
    ...origin,
  };
}

function dispatch(d: GatewayInteractionCreateDispatch["d"]): GatewayInteractionCreateDispatch {
  return { op: GatewayOpcodes.Dispatch, s: 1, t: GatewayDispatchEvents.InteractionCreate, d };
}

/**
 * Builds a raw `INTERACTION_CREATE` gateway dispatch event for a user context
 * menu command ("Apps" → `name` on a user). Like on Discord, the target user
 * and (in a guild) their member come along under `resolved` –
 * `interaction.targetUser`/`targetMember` are real objects.
 */
export function buildUserContextMenuInteractionDispatch(
  name: string,
  overrides: UserContextMenuOverrides = {},
): GatewayInteractionCreateDispatch {
  const base = baseInteraction(overrides);
  const user = buildUser(overrides.target);
  // resolved members carry neither `user` nor `deaf`/`mute` (the user lives under `resolved.users`)
  const { roles, flags, joined_at, permissions } = buildMember();
  const member = { roles, flags, joined_at, permissions, ...overrides.targetMember };

  return dispatch({
    ...base,
    data: {
      id: DEFAULT_IDS.command,
      name,
      type: ApplicationCommandType.User,
      target_id: user.id,
      resolved: { users: { [user.id]: user }, ...("guild_id" in base ? { members: { [user.id]: member } } : {}) },
    },
  } satisfies APIUserApplicationCommandInteraction);
}

/**
 * Builds a raw `INTERACTION_CREATE` gateway dispatch event for a message
 * context menu command ("Apps" → `name` on a message). The target message
 * comes along under `resolved` – `interaction.targetMessage` is a real
 * `Message`.
 */
export function buildMessageContextMenuInteractionDispatch(
  name: string,
  overrides: MessageContextMenuOverrides = {},
): GatewayInteractionCreateDispatch {
  const base = baseInteraction(overrides);
  const message = buildMessage({ ...overrides.target, channel: { id: base.channel_id, ...overrides.target?.channel } });

  return dispatch({
    ...base,
    data: {
      id: DEFAULT_IDS.command,
      name,
      type: ApplicationCommandType.Message,
      target_id: message.id,
      resolved: { messages: { [message.id]: message } },
    },
  } satisfies APIMessageApplicationCommandInteraction);
}
