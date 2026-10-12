# `src/core/`

The only public entry point: `createProbe(client)`.

## `probe.ts`

`createProbe()` wires the two fake adapters from `../transport/` into a real
discord.js `Client` **before** `setup()` calls `client.login()` – the bot
code itself (the client + its event listeners) stays completely untouched.

`Probe` is the only interface test code works with:

| Method                  | Purpose                                                             |
| ----------------------- | ------------------------------------------------------------------- |
| `setup()`/`teardown()`  | Lifecycle – fake login + ready handshake / clean teardown           |
| `login()` + `ready()`   | `setup()` in two steps – for bots that register handlers only after `client.login()` (login in the bot bootstrap, `ready()` afterwards) |
| `injectDispatch(...)`   | Inject a raw gateway dispatch (generic case)                        |
| `emit(name, overrides)` | Generic event via fixture builders (`guildMemberAdd`, ...) – see `../events/README.md` |
| `slashCommand(name)`    | Fluent slash command invocation – see `../interactions/README.md`   |
| `button(customId)`/`selectMenu(customId)`/`modal(customId)` | Fluent component/modal invocation – see `../interactions/README.md` |
| `capturedRequests()`    | All captured REST calls, raw                                        |
| `lastReply()`/`allReplies()` | Parsed interaction replies (`reply`/`editReply`)               |
| `lastModal()`/`allModals()` | Parsed `showModal(...)` calls                                   |

Slash command/button/select menu/modal invocations invisibly seed the
interaction's guild and channel first (`injectInteraction()`, uses
`buildGuildCreateDispatch` from `../fixtures/`) – otherwise
`interaction.channel`/`interaction.guild` don't resolve (see
`../events/README.md` for the same rule for gateway events). The raw
`injectDispatch()` deliberately stays without this seeding.

## Why here and not in `transport/`?

`transport/` only knows the two adapters, no slash command or event
semantics. `core/probe.ts` is the composition: adapters + interaction/event
helpers (`../interactions/`, `../events/`) into one simple `Probe` API. New
feature areas (prefix commands, reactions, ...) get their own helper modules
and are only wired up here – `createProbe()` itself should stay small.
