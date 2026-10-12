import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  GatewayDispatchEvents,
  GatewayOpcodes,
  InteractionType,
  Locale,
  type APIApplicationCommandInteractionDataBasicOption,
  type APIApplicationCommandInteractionDataOption,
  type APIChatInputApplicationCommandInteraction,
  type APIChatInputApplicationCommandInteractionDataResolved,
  type APIUser,
  type GatewayInteractionCreateDispatch,
} from "discord-api-types/v10";
import { DEFAULT_IDS, snowflake } from "./ids.js";
import { buildInteractionContext, type InteractionContextOverrides } from "./interaction-context.js";
import { buildMember } from "./member.js";
import { buildUser } from "./user.js";

/**
 * Wert einer User-Option (`.addUserOption(...)`) – wie bei Discord kommt der
 * Nutzer zusätzlich unter `resolved` mit, damit `options.getUser()`/
 * `options.getMember()` echte Objekte liefern.
 */
export interface SlashCommandUserOptionValue {
  user: Partial<APIUser>;
}

/**
 * Slash-Command-Optionen als Name→Wert-Paare; der Options-Typ wird aus dem
 * JS-Wert abgeleitet (`{ user }` → User-Option).
 */
export type SlashCommandOptionValues = Record<string, string | number | boolean | SlashCommandUserOptionValue>;

/** Fixture-Overrides für `buildSlashCommandInteractionDispatch` – jede Ebene einzeln überschreibbar. */
export interface SlashCommandInteractionOverrides extends InteractionContextOverrides {
  options?: SlashCommandOptionValues;
}

function toInteractionData(values: SlashCommandOptionValues): {
  options: APIApplicationCommandInteractionDataBasicOption[];
  resolved?: APIChatInputApplicationCommandInteractionDataResolved;
} {
  const users: Record<string, APIUser> = {};
  const options = Object.entries(values).map(([name, value]): APIApplicationCommandInteractionDataBasicOption => {
    if (typeof value === "number") {
      return { name, type: ApplicationCommandOptionType.Number, value };
    }
    if (typeof value === "boolean") {
      return { name, type: ApplicationCommandOptionType.Boolean, value };
    }
    if (typeof value === "object") {
      const user = buildUser(value.user);
      users[user.id] = user;
      return { name, type: ApplicationCommandOptionType.User, value: user.id };
    }
    return { name, type: ApplicationCommandOptionType.String, value };
  });

  if (Object.keys(users).length === 0) {
    return { options };
  }
  // resolved-Member tragen weder `user` noch `deaf`/`mute` (der Nutzer steht unter `resolved.users`)
  const { roles, flags, joined_at, permissions } = buildMember();
  const members = Object.fromEntries(Object.keys(users).map((id) => [id, { roles, flags, joined_at, permissions }]));
  return { options, resolved: { users, members } };
}

/** Packt die Optionen wie Discord in Subcommand (und ggf. Subcommand-Gruppe) – `path` ist `[]`, `[sub]` oder `[gruppe, sub]`. */
function nestInSubcommand(
  path: string[],
  options: APIApplicationCommandInteractionDataBasicOption[],
): APIApplicationCommandInteractionDataOption[] {
  const [first, second] = path;
  if (first === undefined) {
    return options;
  }
  if (second === undefined) {
    return [{ name: first, type: ApplicationCommandOptionType.Subcommand, options }];
  }
  return [
    {
      name: first,
      type: ApplicationCommandOptionType.SubcommandGroup,
      options: [{ name: second, type: ApplicationCommandOptionType.Subcommand, options }],
    },
  ];
}

/**
 * Baut ein rohes `INTERACTION_CREATE`-Gateway-Dispatch-Event für einen
 * Slash-Command. Die Interaction läuft standardmäßig in einer Guild (siehe
 * `buildGuild`/`buildMember`) – discord.js baut daraus ein echtes
 * `ChatInputCommandInteraction`. `name` darf wie in Discord einen Subcommand
 * (`"ticket close"`) oder Gruppe + Subcommand (`"ticket admin close"`)
 * enthalten; die Optionen landen dann im Subcommand.
 */
export function buildSlashCommandInteractionDispatch(
  name: string,
  overrides: SlashCommandInteractionOverrides = {},
): GatewayInteractionCreateDispatch {
  const { channel, guild, member } = buildInteractionContext(overrides);
  const [commandName = "", ...subcommandPath] = name.trim().split(/\s+/);
  if (subcommandPath.length > 2) {
    throw new Error(`probe.ts: "${name}" – Discord erlaubt höchstens Command, Subcommand-Gruppe und Subcommand`);
  }
  const { options, resolved } = toInteractionData(overrides.options ?? {});

  const interaction = {
    id: snowflake(),
    application_id: DEFAULT_IDS.application,
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
      id: DEFAULT_IDS.command,
      name: commandName,
      type: ApplicationCommandType.ChatInput,
      options: nestInSubcommand(subcommandPath, options),
      ...(resolved ? { resolved } : {}),
    },
  } satisfies APIChatInputApplicationCommandInteraction;

  return {
    op: GatewayOpcodes.Dispatch,
    s: 1,
    t: GatewayDispatchEvents.InteractionCreate,
    d: interaction,
  };
}
