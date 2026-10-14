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
  type APIInteractionDataResolvedGuildMember,
  type APIUser,
  type GatewayInteractionCreateDispatch,
} from "discord-api-types/v10";
import { DEFAULT_IDS, snowflake } from "./ids.js";
import { buildInteractionContext, type InteractionContextOverrides } from "./interaction-context.js";
import { buildMember } from "./member.js";
import { buildUser } from "./user.js";

/**
 * Value of a user option (`.addUserOption(...)`) – like on Discord, the user
 * also comes along under `resolved`, so `options.getUser()`/
 * `options.getMember()` return real objects. `member` sets the fields
 * Discord sends for the guild member behind the user (e.g. `roles`, `nick`) –
 * discord.js puts them into the member cache, so a member without `roles`
 * has none afterwards. In a DM there is no member, like on Discord.
 */
export interface SlashCommandUserOptionValue {
  user: Partial<APIUser>;
  member?: Partial<APIInteractionDataResolvedGuildMember>;
}

/**
 * Value of an integer option (`.addIntegerOption(...)`) – a plain JS number
 * becomes a number option (`.addNumberOption(...)`), and discord.js'
 * `options.getInteger()` rejects that type.
 */
export interface SlashCommandIntegerOptionValue {
  integer: number;
}

/**
 * Slash command options as name→value pairs; the option type is derived from
 * the JS value (`5` → number option, `{ integer: 5 }` → integer option,
 * `{ user }` → user option).
 */
export type SlashCommandOptionValues = Record<
  string,
  string | number | boolean | SlashCommandIntegerOptionValue | SlashCommandUserOptionValue
>;

/** Fixture overrides for `buildSlashCommandInteractionDispatch` – every level overridable on its own. */
export interface SlashCommandInteractionOverrides extends InteractionContextOverrides {
  options?: SlashCommandOptionValues;
}

function toInteractionData(
  values: SlashCommandOptionValues,
  inGuild: boolean,
): {
  options: APIApplicationCommandInteractionDataBasicOption[];
  resolved?: APIChatInputApplicationCommandInteractionDataResolved;
} {
  const users: Record<string, APIUser> = {};
  const members: Record<string, APIInteractionDataResolvedGuildMember> = {};
  const options = Object.entries(values).map(([name, value]): APIApplicationCommandInteractionDataBasicOption => {
    if (typeof value === "number") {
      return { name, type: ApplicationCommandOptionType.Number, value };
    }
    if (typeof value === "boolean") {
      return { name, type: ApplicationCommandOptionType.Boolean, value };
    }
    if (typeof value === "string") {
      return { name, type: ApplicationCommandOptionType.String, value };
    }
    if ("integer" in value) {
      if (!Number.isInteger(value.integer)) {
        throw new Error(`probe.ts: option "${name}" – { integer: ${value.integer} } isn't an integer, Discord never sends that`);
      }
      return { name, type: ApplicationCommandOptionType.Integer, value: value.integer };
    }
    const user = buildUser(value.user);
    users[user.id] = user;
    if (inGuild) {
      // resolved members carry neither `user` nor `deaf`/`mute` (the user lives under `resolved.users`)
      const { roles, flags, joined_at, permissions } = buildMember();
      members[user.id] = { roles, flags, joined_at, permissions, ...value.member };
    }
    return { name, type: ApplicationCommandOptionType.User, value: user.id };
  });

  if (Object.keys(users).length === 0) {
    return { options };
  }
  return { options, resolved: inGuild ? { users, members } : { users } };
}

/** Wraps the options in a subcommand (and subcommand group, if given) like Discord does – `path` is `[]`, `[sub]` or `[group, sub]`. */
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
 * Builds a raw `INTERACTION_CREATE` gateway dispatch event for a slash
 * command. By default the interaction runs in a guild (see
 * `buildGuild`/`buildMember`), with `dm: true` in the user's DM with the
 * bot – discord.js builds a real
 * `ChatInputCommandInteraction` from it. Like in Discord, `name` may contain
 * a subcommand (`"ticket close"`) or group + subcommand
 * (`"ticket admin close"`); the options then go into the subcommand.
 */
export function buildSlashCommandInteractionDispatch(
  name: string,
  overrides: SlashCommandInteractionOverrides = {},
): GatewayInteractionCreateDispatch {
  const { channel, origin } = buildInteractionContext(overrides);
  const [commandName = "", ...subcommandPath] = name.trim().split(/\s+/);
  if (subcommandPath.length > 2) {
    throw new Error(`probe.ts: "${name}" – Discord allows at most command, subcommand group and subcommand`);
  }
  const { options, resolved } = toInteractionData(overrides.options ?? {}, "guild_id" in origin);

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
    // discord-api-types splits APIChannel by `type` into ~10 concrete channel
    // interfaces; our fixture deliberately stays generic (discord.js only
    // needs id/type) – the cast is the only way to pass it through without a
    // channel type parameter.
    channel: channel as APIChatInputApplicationCommandInteraction["channel"],
    ...origin,
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
