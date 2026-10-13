# `src/fixtures/`

Builders for raw gateway/REST payloads. probe.ts users never write JSON by
hand – every interaction or event goes through a builder from this folder.

## Convention

Every builder:

- takes an optional `overrides` object (default `{}`), every field
  overridable on its own
- has sensible defaults (`DEFAULT_IDS` from `ids.ts`: real snowflakes,
  consistent across all builders, so e.g. `buildUser({ id: "42" })` and
  `buildGuild()` fit together without further ado)
- is typed against `discord-api-types/v10`, never against a hand-rolled
  shape

## Builder overview

| File                                | Builder                                                            | Builds                                    |
| ----------------------------------- | ------------------------------------------------------------------ | ----------------------------------------- |
| `ids.ts`                            | `DEFAULT_IDS`, `snowflake`                                         | Default snowflakes, fresh IDs             |
| `user.ts`                           | `buildUser`                                                        | `APIUser`                                 |
| `guild.ts`                          | `buildGuild`                                                       | `APIPartialInteractionGuild`              |
| `channel.ts`                        | `buildChannel`                                                     | Minimal channel payload (`id`, `type`)    |
| `member.ts`                         | `buildMember`                                                      | `APIInteractionGuildMember`               |
| `message.ts`                        | `buildMessage`                                                     | `APIMessage`                              |
| `interaction-context.ts`            | `buildInteractionContext`                                          | Channel/guild/member – foundation of every interaction |
| `interaction.ts`                    | `buildSlashCommandInteractionDispatch`                             | `INTERACTION_CREATE` (slash command, incl. subcommands) |
| `message-component-interaction.ts`  | `buildButtonInteractionDispatch`, `buildSelectMenuInteractionDispatch` | `INTERACTION_CREATE` (button click, string select) |
| `modal-interaction.ts`              | `buildModalSubmitInteractionDispatch`                              | `INTERACTION_CREATE` (modal submit)       |
| `context-menu-interaction.ts`       | `buildUserContextMenuInteractionDispatch`, `buildMessageContextMenuInteractionDispatch` | `INTERACTION_CREATE` (user/message context menu, target under `resolved`) |
| `guild-create.ts`                   | `buildGuildCreateDispatch`, `buildRole`                            | `GUILD_CREATE` – cache preparation (owner, `@everyone`, bot as admin member) |
| `guild-member-events.ts`            | `buildGuildMemberAddDispatch`, `buildGuildMemberRemoveDispatch`    | `GUILD_MEMBER_ADD`/`_REMOVE`              |
| `message-events.ts`                 | `buildMessageCreateDispatch`, `buildMessageDeleteDispatch`         | `MESSAGE_CREATE`/`_DELETE`                |
| `reaction-events.ts`                | `buildMessageReactionAddDispatch`, `buildMessageReactionRemoveDispatch` | `MESSAGE_REACTION_ADD`/`_REMOVE` (unicode emoji only, no custom server emoji) |
| `audit-log-events.ts`               | `buildGuildAuditLogEntryCreateDispatch`                            | `GUILD_AUDIT_LOG_ENTRY_CREATE`            |

`interaction-context.ts` is the shared foundation for **every** interaction
kind (slash command, button, select menu, modal submit): who triggered it,
in which channel/guild. New interaction type? Check here first whether
`buildInteractionContext` already suffices before building
channel/guild/member by hand again.

`message-component-interaction.ts` currently covers only string selects for
select menus (by far the most common case) – user/role/mentionable/channel
selects follow the same pattern, just a different `component_type` +
`resolved` block.

`guild-create.ts` is a special case: the full `APIGuild` shape has ~30
required fields, and building them all out makes practically no sense. Only
the fields discord.js' `Guild._patch()` actually reads unguarded are set –
the rest is cast (`as`, with the rationale in the file comment). This is the
only documented exception to "always `satisfies`" in this folder.

## Adding a new builder

1. Import the raw payload type from `discord-api-types/v10` (don't guess).
2. `overrides` interface + function following the pattern above.
3. `satisfies <ExactType>` instead of `as` – unless the type is structurally
   too wide to construct practically (then: `as` + comment).
4. Add the export to `src/index.ts`.

Composition logic (which builders get injected in which order for which
`probe.emit(...)` event) does **not** live here but in
`../events/gateway-event.ts` – fixtures build exactly one payload, nothing
more.
