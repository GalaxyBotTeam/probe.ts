import {
  ComponentType,
  InteractionType,
  type APIMessageComponentButtonInteraction,
  type APIMessageComponentSelectMenuInteraction,
  type GatewayInteractionCreateDispatch,
} from "discord-api-types/v10";
import { buildInteractionBase, buildInteractionCreateDispatch, type InteractionContextOverrides } from "./interaction-context.js";
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
  const base = buildInteractionBase(overrides);
  const message = buildMessage({
    ...(overrides.messageId ? { id: overrides.messageId } : {}),
    channel: { id: base.channel_id },
  });
  return { ...base, type: InteractionType.MessageComponent as const, message };
}

/**
 * Builds a raw `INTERACTION_CREATE` gateway dispatch event for a button
 * click. discord.js builds a real `ButtonInteraction` from it.
 */
export function buildButtonInteractionDispatch(
  customId: string,
  overrides: MessageComponentOverrides = {},
): GatewayInteractionCreateDispatch {
  const base = buildComponentInteractionBase(overrides);

  return buildInteractionCreateDispatch({
    ...base,
    // see `buildInteractionBase` for the cast
    channel: base.channel as APIMessageComponentButtonInteraction["channel"],
    data: { custom_id: customId, component_type: ComponentType.Button },
  } satisfies APIMessageComponentButtonInteraction);
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
  const base = buildComponentInteractionBase(overrides);

  return buildInteractionCreateDispatch({
    ...base,
    channel: base.channel as APIMessageComponentSelectMenuInteraction["channel"],
    data: { custom_id: customId, component_type: ComponentType.StringSelect, values },
  } satisfies APIMessageComponentSelectMenuInteraction);
}
