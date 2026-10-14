# `src/interactions/`

Helpers specifically for Discord **interactions**: slash commands, buttons,
select menus, modal submits.

For generic gateway events (member join, message create, ...) that aren't
interactions, see `../events/` instead.

## `slash-command.ts`

`createSlashCommandInvocation` builds the fluent API behind
`probe.slashCommand(name)`:

```ts
await probe.slashCommand("echo").withOptions({ message: "hello" }).invoke();

// user option: `{ user }` instead of a string – like on Discord it also lands
// under `resolved`, `options.getUser()`/`getMember()` return real objects
await probe.slashCommand("warn").withOptions({ member: { user: { username: "anna" } } }).invoke();

// the member behind a user option: what Discord sends along (e.g. `roles`) –
// discord.js caches it, so without `roles` the member has none
await probe.slashCommand("warn").withOptions({ target: { user: { id: "42" }, member: { roles: [modRoleId] } } }).invoke();

// a plain number is a number option (`getNumber()`), `{ integer }` an integer option (`getInteger()`)
await probe.slashCommand("timeout").withOptions({ days: { integer: 3 } }).invoke();

// subcommand (and group) separated by spaces like in Discord – the options
// go into the subcommand, `options.getSubcommand()` works
await probe.slashCommand("ticket close").withOptions({ reason: "done" }).invoke();
await probe.slashCommand("ticket admin close").invoke();
```

## `message-component.ts`

`createButtonInvocation`/`createSelectMenuInvocation` build the fluent API
behind `probe.button(customId)`/`probe.selectMenu(customId)`:

```ts
await probe.button("open-feedback-modal").click();
await probe.selectMenu("color-select").withValues(["green"]).select();
```

`button()`/`selectMenu()` need no `messageId` in test code – they target
the message the bot sent last (`lastMessageId` of the fake REST layer, see
`../transport/README.md`; before the first one: `DEFAULT_IDS.message`). For
an older message: use the fixture builder directly with a `messageId`
override + `probe.injectDispatch(...)`.

## `modal.ts`

`createModalSubmitInvocation` builds the fluent API behind
`probe.modal(customId)`:

```ts
await probe.modal("feedback-modal").withFields({ "feedback-text": "more coffee please" }).submit();
```

Whether the bot really called `interaction.showModal(...)` with this
`customId` beforehand is checked by `probe.lastModal()`/`probe.allModals()`
(`replies.ts`) – `probe.modal(...).submit()` itself doesn't check that, it
just injects the submit.

## `context-menu.ts`

`createContextMenuInvocation` builds the fluent API behind
`probe.contextMenu(name)` – the target decides the command type:

```ts
await probe.contextMenu("Warn").onUser({ id: "42" }, { roles: [modRoleId] }); // 2nd argument: the target's member
await probe.contextMenu("Report").onMessage({ content: "spam" });
```

## Shared behavior of `slashCommand`/`contextMenu`/`button`/`selectMenu`/`modal`

All five:

- take who triggers the interaction where via
  `.withContext({ user, member, guild, channel })` (default: `DEFAULT_IDS`),
  e.g. `probe.button("ok").withContext({ user: { id: adminId } }).click()` –
  or `.withContext({ dm: true, user })` for the user's DM with the bot
  (`user` instead of `guild`/`member`, DM channel `DEFAULT_IDS.dmChannel`)
- invisibly inject the interaction's guild and channel first, except in a DM (see
  `buildGuildCreateDispatch`) so `interaction.channel`/`interaction.guild`
  resolve for real – the same hidden discord.js rule as for gateway events
  (`../events/README.md`), here just for interactions
- then wait for at least one new REST call (`waitForNextRequest` in
  `../core/probe.ts`) – unlike `Probe.emit()`/`injectDispatch()`, which
  deliberately stay synchronous and leave waiting to the test code. The
  difference is intentional: interactions are the core case we want to cover
  with as little test boilerplate as possible.

## `replies.ts`

`parseReply(request)` reads the visible reply content from a captured REST
call – POST `.../interactions/.../callback` (response type
`ChannelMessageWithSource`) or PATCH `.../webhooks/.../@original`
(`editReply()`). A plain `deferReply()` without content returns `undefined`.
`parseModal(request)` likewise reads a modal shown via `showModal(...)`
(response type `Modal`) – `customId` + `title`.

Both are only relevant for interaction replies, not for generic REST calls
like `channel.send(...)` – those end up unchanged in
`probe.capturedRequests()`.

`extractText(reply)` reads the visible text from a `ReplyContent` – classic
`content` as well as a Components V2 container (`TextDisplay` collected
recursively from `Container`/`Section`). See
`docs/testing-message-components.md`.

## Adding a new interaction kind

1. Fixture builder in `../fixtures/` (see its `README.md` – reuse
   `buildInteractionContext` as the foundation).
2. Fluent invocation here: `create<Name>Invocation(customId, inject, waitForReply)`
   following the pattern above (message components additionally get a
   `defaultMessageId` getter) – it gets `inject`/`waitForReply` injected by
   `../core/probe.ts`, don't build them yourself.
3. Add the method + export to `Probe` (`../core/probe.ts`).
4. Add the export to `src/index.ts`.
