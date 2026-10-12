# `src/events/`

Composition layer for `Probe.emit(eventName, overrides)`: translates a
friendly, discord.js-style event name (`guildMemberAdd`, like
`client.on("guildMemberAdd", ...)`) into the right sequence of raw gateway
dispatch events.

## Why a sequence and not a single event?

discord.js only processes `GUILD_MEMBER_ADD`/`_REMOVE`, `MESSAGE_CREATE`/
`_DELETE`, `MESSAGE_REACTION_ADD`/`_REMOVE` if the affected
guild/channel/member/message/reacting user is already known in its client
cache – otherwise the event is silently ignored (no error, no emitted client
event). `gateway-event.ts` sets that up automatically, invisible to the test
code:

- **every member/message/reaction event**: first a `GUILD_CREATE` (see
  `../fixtures/guild-create.ts`) that puts guild + channel into the cache
- **`guildMemberRemove`**: the `GUILD_CREATE` already gets the member in its
  members list (otherwise discord.js emits no real `GuildMember`)
- **`messageDelete`/`messageReactionAdd`/`messageReactionRemove`**: a
  preceding `MESSAGE_CREATE` with the same `id` (otherwise discord.js emits
  no real `Message`)
- **`messageReactionRemove`**: additionally a preceding
  `MESSAGE_REACTION_ADD` with the same user/emoji (discord.js only resolves
  the removing user if they are already cached globally)

Details + the exact spot in discord.js: `docs/testing-event-handlers.md`.

## Supporting a new event

1. Fixture builder in `../fixtures/` (if not there yet).
2. Add the overrides type to `GatewayEventOverrides` (`gateway-event.ts`).
3. Add a `case` to the `switch` in `buildGatewayEventDispatches` – usually
   just "seed guild/channel/message first if needed, then the event itself".
4. Export the overrides types from `src/index.ts`.

`../transport/gateway-adapter.ts` itself usually does **not** need to be
touched for this – `injectDispatch()` is generic enough already.
