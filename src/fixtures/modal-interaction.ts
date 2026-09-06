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
import { buildInteractionContext, type InteractionContextOverrides } from "./interaction-context.js";

/**
 * Fixture-Overrides für `buildModalSubmitInteractionDispatch`: wer
 * absendet, plus die `fields` – Name→Wert-Paare, ein Eintrag pro
 * Text-Input im Modal (`custom_id` → eingegebener Text).
 */
export interface ModalSubmitOverrides extends InteractionContextOverrides {
  fields?: Record<string, string>;
}

/**
 * Baut ein rohes `INTERACTION_CREATE`-Gateway-Dispatch-Event für einen
 * Modal-Submit. discord.js baut daraus eine echte `ModalSubmitInteraction`;
 * `interaction.fields.getTextInputValue(customId)` liest die übergebenen
 * `fields` aus. Jedes Feld landet als eigene `ActionRow` mit einem
 * `TextInput` darin – das klassische, seit Modals stabile Format (nicht das
 * neuere Components-v2-`Label`-Wrapping).
 */
export function buildModalSubmitInteractionDispatch(
  customId: string,
  overrides: ModalSubmitOverrides = {},
): GatewayInteractionCreateDispatch {
  const { channel, guild, member } = buildInteractionContext(overrides);
  const fields = overrides.fields ?? {};

  const interaction = {
    id: "3",
    application_id: "0",
    type: InteractionType.ModalSubmit,
    token: "interaction-token",
    version: 1,
    locale: Locale.EnglishUS,
    app_permissions: "0",
    entitlements: [],
    authorizing_integration_owners: {},
    attachment_size_limit: 26_214_400,
    channel_id: channel.id,
    // Anders als bei Slash-Command-/Component-Interactions ist `channel` in
    // `APIModalSubmitInteraction` optional – hier trotzdem gesetzt (Realismus,
    // `interaction.channel` funktioniert nach dem Submit), daher der Cast auf
    // die konkrete (nicht-optionale) Channel-Shape statt auf den Interaction-
    // eigenen (optionalen) Feldtyp.
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
