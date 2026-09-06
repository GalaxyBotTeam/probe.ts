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
import { buildInteractionContext, type InteractionContextOverrides } from "./interaction-context.js";
import { buildMessage } from "./message.js";

/**
 * Fixture-Overrides für Button-/Select-Menu-Interactions: wer klickt/wählt,
 * plus die `messageId` der Nachricht, an der die Komponente hängt (Default
 * `"1"` – passt ohne weiteres Zutun zu einer zuvor über `channel.send(...)`
 * oder `interaction.reply(...)` verschickten Nachricht, solange in einem
 * Test nur eine Nachricht im Spiel ist).
 */
export interface MessageComponentOverrides extends InteractionContextOverrides {
  messageId?: string;
}

function buildComponentInteractionBase(overrides: MessageComponentOverrides) {
  const { channel, guild, member } = buildInteractionContext(overrides);
  const message = buildMessage({
    ...(overrides.messageId ? { id: overrides.messageId } : {}),
    ...(overrides.channel ? { channel: overrides.channel } : {}),
  });
  return { channel, guild, member, message };
}

/**
 * Baut ein rohes `INTERACTION_CREATE`-Gateway-Dispatch-Event für einen
 * Button-Klick. discord.js baut daraus eine echte `ButtonInteraction`.
 */
export function buildButtonInteractionDispatch(
  customId: string,
  overrides: MessageComponentOverrides = {},
): GatewayInteractionCreateDispatch {
  const { channel, guild, member, message } = buildComponentInteractionBase(overrides);

  const interaction = {
    id: "2",
    application_id: "0",
    type: InteractionType.MessageComponent,
    token: "interaction-token",
    version: 1,
    locale: Locale.EnglishUS,
    app_permissions: "0",
    entitlements: [],
    authorizing_integration_owners: {},
    attachment_size_limit: 26_214_400,
    channel_id: channel.id,
    // Siehe interaction.ts: discord-api-types unterscheidet APIChannel je nach
    // `type` in ~10 konkrete Channel-Interfaces; unser Fixture bleibt bewusst
    // generisch (nur id/type nötig für discord.js).
    channel: channel as APIMessageComponentButtonInteraction["channel"],
    guild_id: guild.id,
    guild,
    member,
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
 * Baut ein rohes `INTERACTION_CREATE`-Gateway-Dispatch-Event für eine
 * String-Select-Menu-Auswahl. discord.js baut daraus eine echte
 * `StringSelectMenuInteraction`.
 *
 * Andere Select-Typen (User/Role/Mentionable/Channel-Select) sind noch nicht
 * abgedeckt – String-Select ist der mit Abstand häufigste Fall. Neuen Typ
 * ergänzen: gleiches Muster, anderer `component_type` + `resolved`-Block
 * (siehe `discord-api-types/v10`'s `APIMessage*SelectInteractionData`).
 */
export function buildSelectMenuInteractionDispatch(
  customId: string,
  values: string[],
  overrides: MessageComponentOverrides = {},
): GatewayInteractionCreateDispatch {
  const { channel, guild, member, message } = buildComponentInteractionBase(overrides);

  const interaction = {
    id: "2",
    application_id: "0",
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
    guild_id: guild.id,
    guild,
    member,
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
