# Testing event handlers

Besides slash commands, probe.ts can inject generic gateway events –
`guildMemberAdd`, `guildMemberRemove`, `messageCreate`, `messageDelete`,
`messageReactionAdd`, `messageReactionRemove`, `guildAuditLogEntryCreate`. That covers most classic
hobby bot logic: welcome messages, goodbye messages, prefix commands,
reaction roles, simple logging handlers.

**Prefix commands aren't an event of their own.** Unlike slash commands (a
real Discord interaction with a callback contract), a prefix command
(`!ping`) is just a normal message your bot code parses itself
(`message.content.startsWith("!")`). To test it, `messageCreate` with the
matching `content` is enough – no fixture builder or `Probe` method of its
own needed:

```ts
probe.emit("messageCreate", { content: "!roles" });
```

On real Discord, `message.content` outside of DMs needs the privileged
`MessageContent` intent (`GatewayIntentBits.MessageContent`) – probe.ts
bypasses that (no real intent filter in the fake transport), but it's easy
to forget in the real bot.

## Basic principle

```ts
probe.emit("guildMemberAdd", { user: { username: "anna" } });

await vi.waitFor(() => {
  expect(probe.capturedRequests()).toHaveLength(1);
});
```

`emit()` is **synchronous**, just like `injectDispatch()` – it injects the
event and returns right away. If the bot reacts asynchronously (e.g. via
`interaction.reply()` or `channel.send()`), wait as usual with
`vi.waitFor(...)`.

Unlike `slashCommand().invoke()`, there's no `lastReply()` here – that's
built for interaction replies only (callback/`editReply`). A
`channel.send(...)` ends up as its own REST call in
`probe.capturedRequests()`; check its `body`:

```ts
const body = probe.capturedRequests().at(-1)?.body as { content?: string };
expect(body.content).toBe(`👋 Welcome, <@${DEFAULT_IDS.user}>!`);
```

## Supported events

| Event                   | Overrides                                           |
| ----------------------- | --------------------------------------------------- |
| `guildMemberAdd`        | `{ user?, guildId? }`                               |
| `guildMemberRemove`     | `{ user?, guildId? }`                               |
| `messageCreate`         | `{ id?, content?, author?, channel?, guildId? }`    |
| `messageDelete`         | `{ id?, channel?, guildId? }`                       |
| `messageReactionAdd`    | `{ emoji?, user?, messageId?, channel?, guildId? }` |
| `messageReactionRemove` | `{ emoji?, user?, messageId?, channel?, guildId? }` |
| `guildAuditLogEntryCreate` | `{ actionType?, targetId?, executorId?, changes?, options?, reason?, guildId? }` |

All fields are optional and have the same defaults as the other fixture
builders (IDs from `DEFAULT_IDS`, `emoji: "👍"`). `guildAuditLogEntryCreate` defaults to a ban
(`AuditLogEvent.MemberBanAdd`) of `DEFAULT_IDS.user` by `DEFAULT_IDS.owner`; the bot needs the
`GuildModeration` intent to receive it on real Discord.

## The hidden Discord rule: the guild must be known

discord.js needs a guild known in the client cache (and for
message/reaction events a known channel + a known message) before it
processes `GUILD_MEMBER_ADD`, `GUILD_MEMBER_REMOVE`, `MESSAGE_CREATE`,
`MESSAGE_DELETE`, `MESSAGE_REACTION_ADD` or `MESSAGE_REACTION_REMOVE` at all
– if the guild/channel/message is unknown, the event is silently ignored (no
error, no emitted client event).

`probe.emit()` takes care of that: it automatically injects a matching
`GUILD_CREATE` event before the actual event, invisible to the test code.
Several special cases that mirror the real Discord order exactly:

- **`guildMemberRemove`**: discord.js only emits a real `GuildMember` if the
  member was known before. The preceding `GUILD_CREATE` therefore already
  contains the member in its members list.
- **`messageDelete`/`messageReactionAdd`/`messageReactionRemove`**:
  discord.js only emits a real `Message` if it was in the cache before.
  `probe.emit(...)` therefore first injects a `MESSAGE_CREATE` with the same
  `id` – just like in reality, you can't delete or interact with a message
  that was never created.
- **`messageReactionRemove`**: discord.js only resolves the removing user if
  they are already cached *globally* (unlike `messageReactionAdd`, which
  sends a `member` block for that). `probe.emit("messageReactionRemove", ...)`
  therefore additionally injects a preceding `messageReactionAdd` with the
  same user/emoji – just like in reality, you react before you take the
  reaction back.

Watch out with all of this: if your bot code also triggers something on the
preceding seed event via its own `messageCreate`/`messageReactionAdd`
handler, that REST call also shows up in `probe.capturedRequests()` – so for
`messageReactionRemove`, check the *last* response, not
`capturedRequests()[0]`.

## Examples

- `examples/welcome-bot/` + `tests/gateway-events.e2e.test.ts` –
  `guildMemberAdd`/`guildMemberRemove`/`messageCreate`/`messageDelete`
- `examples/reaction-role-bot/` + `tests/reaction-events.e2e.test.ts` –
  prefix command (`!roles`) + reaction role
  (`messageReactionAdd`/`messageReactionRemove`)

## Custom events

Missing an event? Add new fixture builders in `src/fixtures/` (see
`src/fixtures/README.md`) and wire them up in
`src/events/gateway-event.ts` – the fake WS layer itself
(`src/transport/gateway-adapter.ts`) usually does **not** need to be touched
for this.
