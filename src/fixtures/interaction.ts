import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  GatewayDispatchEvents,
  GatewayOpcodes,
  InteractionType,
  Locale,
  type APIApplicationCommandInteractionDataOption,
  type APIChatInputApplicationCommandInteraction,
  type GatewayInteractionCreateDispatch,
} from "discord-api-types/v10";
import { buildInteractionContext, type InteractionContextOverrides } from "./interaction-context.js";

/** Slash-Command-Optionen als Name→Wert-Paare; der Options-Typ wird aus dem JS-Wert abgeleitet. */
export type SlashCommandOptionValues = Record<string, string | number | boolean>;

/** Fixture-Overrides für `buildSlashCommandInteractionDispatch` – jede Ebene einzeln überschreibbar. */
export interface SlashCommandInteractionOverrides extends InteractionContextOverrides {
  options?: SlashCommandOptionValues;
}

function toInteractionDataOptions(values: SlashCommandOptionValues): APIApplicationCommandInteractionDataOption[] {
  return Object.entries(values).map(([name, value]) => {
    if (typeof value === "number") {
      return { name, type: ApplicationCommandOptionType.Number, value };
    }
    if (typeof value === "boolean") {
      return { name, type: ApplicationCommandOptionType.Boolean, value };
    }
    return { name, type: ApplicationCommandOptionType.String, value };
  });
}

/**
 * Baut ein rohes `INTERACTION_CREATE`-Gateway-Dispatch-Event für einen
 * Slash-Command. Die Interaction läuft standardmäßig in einer Guild (siehe
 * `buildGuild`/`buildMember`) – discord.js baut daraus ein echtes
 * `ChatInputCommandInteraction`.
 */
export function buildSlashCommandInteractionDispatch(
  name: string,
  overrides: SlashCommandInteractionOverrides = {},
): GatewayInteractionCreateDispatch {
  const { channel, guild, member } = buildInteractionContext(overrides);

  const interaction = {
    id: "1",
    application_id: "0",
    type: InteractionType.ApplicationCommand,
    token: "interaction-token",
    version: 1,
    locale: Locale.EnglishUS,
    app_permissions: "0",
    entitlements: [],
    authorizing_integration_owners: {},
    attachment_size_limit: 26_214_400,
    channel_id: channel.id,
    // discord-api-types unterscheidet APIChannel je nach `type` in ~10 konkrete
    // Channel-Interfaces; unser Fixture bleibt bewusst generisch (nur id/type
    // nötig für discord.js) – der Cast ist der einzige Weg, das ohne einen
    // Channel-Typ-Parameter durchzureichen.
    channel: channel as APIChatInputApplicationCommandInteraction["channel"],
    guild_id: guild.id,
    guild,
    member,
    data: {
      id: "100",
      name,
      type: ApplicationCommandType.ChatInput,
      options: overrides.options ? toInteractionDataOptions(overrides.options) : [],
    },
  } satisfies APIChatInputApplicationCommandInteraction;

  return {
    op: GatewayOpcodes.Dispatch,
    s: 1,
    t: GatewayDispatchEvents.InteractionCreate,
    d: interaction,
  };
}
