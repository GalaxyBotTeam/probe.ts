import {
  ComponentType,
  GatewayDispatchEvents,
  GatewayOpcodes,
  InteractionType,
  Locale,
  type APIMessageComponentButtonInteraction,
  type APIMessageComponentSelectMenuInteraction,
  type GatewayInteractionCreateDispatch,
} from "discord-api-types/v10";
import { DEFAULT_IDS, snowflake } from "./ids.js";
import { buildInteractionContext, type InteractionContextOverrides } from "./interaction-context.js";
import { buildMessage } from "./message.js";

/**
 * Fixture overrides for button/select menu interactions: who clicks/chooses,
 * plus the `messageId` of the message the component is attached to (default
 * `DEFAULT_IDS.message` – matches a message sent earlier via
 * `channel.send(...)` or `interaction.reply(...)` without further ado, as
 * long as only one message is involved in a test).
 */
export interface MessageComponentOverrides extends InteractionContextOverrides {
  messageId?: string;
}

function buildComponentInteractionBase(overrides: MessageComponentOverrides) {
  const { channel, origin } = buildInteractionContext(overrides);
  const message = buildMessage({
    ...(overrides.messageId ? { id: overrides.messageId } : {}),
    channel: { id: channel.id },
  });
  return { channel, origin, message };
}

/**
 * Builds a raw `INTERACTION_CREATE` gateway dispatch event for a button
 * click. discord.js builds a real `ButtonInteraction` from it.
 */
export function buildButtonInteractionDispatch(
  customId: string,
  overrides: MessageComponentOverrides = {},
): GatewayInteractionCreateDispatch {
  const { channel, origin, message } = buildComponentInteractionBase(overrides);

  const interaction = {
    id: snowflake(),
    application_id: DEFAULT_IDS.application,
    type: InteractionType.MessageComponent,
    token: "interaction-token",
    version: 1,
    locale: Locale.EnglishUS,
    app_permissions: "0",
    entitlements: [],
    authorizing_integration_owners: {},
    attachment_size_limit: 26_214_400,
    channel_id: channel.id,
    // See interaction.ts: discord-api-types splits APIChannel by `type` into
    // ~10 concrete channel interfaces; our fixture deliberately stays generic
    // (discord.js only needs id/type).
    channel: channel as APIMessageComponentButtonInteraction["channel"],
    ...origin,
    message,
    data: { custom_id: customId, component_type: ComponentType.Button },
  } satisfies APIMessageComponentButtonInteraction;

  return {
    op: GatewayOpcodes.Dispatch,
    s: 1,
    t: GatewayDispatchEvents.InteractionCreate,
    d: interaction,
  };
}

/**
 * Builds a raw `INTERACTION_CREATE` gateway dispatch event for a string
 * select menu choice. discord.js builds a real `StringSelectMenuInteraction`
 * from it.
 *
 * Other select types (user/role/mentionable/channel select) aren't covered
 * yet – string select is by far the most common case. To add a new type:
 * same pattern, different `component_type` + `resolved` block (see
 * `discord-api-types/v10`'s `APIMessage*SelectInteractionData`).
 */
export function buildSelectMenuInteractionDispatch(
  customId: string,
  values: string[],
  overrides: MessageComponentOverrides = {},
): GatewayInteractionCreateDispatch {
  const { channel, origin, message } = buildComponentInteractionBase(overrides);

  const interaction = {
    id: snowflake(),
    application_id: DEFAULT_IDS.application,
    type: InteractionType.MessageComponent,
    token: "interaction-token",
    version: 1,
    locale: Locale.EnglishUS,
    app_permissions: "0",
    entitlements: [],
    authorizing_integration_owners: {},
    attachment_size_limit: 26_214_400,
    channel_id: channel.id,
    channel: channel as APIMessageComponentSelectMenuInteraction["channel"],
    ...origin,
    message,
    data: { custom_id: customId, component_type: ComponentType.StringSelect, values },
  } satisfies APIMessageComponentSelectMenuInteraction;

  return {
    op: GatewayOpcodes.Dispatch,
    s: 1,
    t: GatewayDispatchEvents.InteractionCreate,
    d: interaction,
  };
}
