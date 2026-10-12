import {
  ComponentType,
  GatewayDispatchEvents,
  GatewayOpcodes,
  InteractionType,
  Locale,
  type APIChannel,
  type APIModalSubmitInteraction,
  type GatewayInteractionCreateDispatch,
} from "discord-api-types/v10";
import { DEFAULT_IDS, snowflake } from "./ids.js";
import { buildInteractionContext, type InteractionContextOverrides } from "./interaction-context.js";

/**
 * Fixture overrides for `buildModalSubmitInteractionDispatch`: who submits,
 * plus the `fields` – name→value pairs, one entry per text input in the modal
 * (`custom_id` → entered text).
 */
export interface ModalSubmitOverrides extends InteractionContextOverrides {
  fields?: Record<string, string>;
}

/**
 * Builds a raw `INTERACTION_CREATE` gateway dispatch event for a modal
 * submit. discord.js builds a real `ModalSubmitInteraction` from it;
 * `interaction.fields.getTextInputValue(customId)` reads the given `fields`.
 * Each field becomes its own `ActionRow` with a `TextInput` inside – the
 * classic format, stable since modals exist (not the newer Components v2
 * `Label` wrapping).
 */
export function buildModalSubmitInteractionDispatch(
  customId: string,
  overrides: ModalSubmitOverrides = {},
): GatewayInteractionCreateDispatch {
  const { channel, guild, member } = buildInteractionContext(overrides);
  const fields = overrides.fields ?? {};

  const interaction = {
    id: snowflake(),
    application_id: DEFAULT_IDS.application,
    type: InteractionType.ModalSubmit,
    token: "interaction-token",
    version: 1,
    locale: Locale.EnglishUS,
    app_permissions: "0",
    entitlements: [],
    authorizing_integration_owners: {},
    attachment_size_limit: 26_214_400,
    channel_id: channel.id,
    // Unlike slash command/component interactions, `channel` is optional in
    // `APIModalSubmitInteraction` – set anyway here (realism,
    // `interaction.channel` works after the submit), hence the cast to the
    // concrete (non-optional) channel shape instead of the interaction's own
    // (optional) field type.
    channel: channel as Partial<APIChannel> & Pick<APIChannel, "id" | "type">,
    guild_id: guild.id,
    guild,
    member,
    data: {
      custom_id: customId,
      components: Object.entries(fields).map(([fieldCustomId, value]) => ({
        type: ComponentType.ActionRow as const,
        components: [{ type: ComponentType.TextInput as const, custom_id: fieldCustomId, value }],
      })),
    },
  } satisfies APIModalSubmitInteraction;

  return {
    op: GatewayOpcodes.Dispatch,
    s: 1,
    t: GatewayDispatchEvents.InteractionCreate,
    d: interaction,
  };
}
