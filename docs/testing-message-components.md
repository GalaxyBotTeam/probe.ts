# Testing message components

Buttons, select menus and modals can be tested just like slash commands –
via the fluent API on `probe`.

## Buttons

```ts
await probe.slashCommand("feedback").invoke();
await probe.button("open-feedback-modal").click();
```

`probe.button(customId)` clicks a button with this `custom_id`. The
`messageId` of the message the button is attached to does **not** have to
be given – the default `DEFAULT_IDS.message` fits without further ado as
long as only one message is involved in a test (the usual case). Several
messages at once? Use the fixture builder directly:

```ts
import { buildButtonInteractionDispatch } from "probe.ts";
probe.injectDispatch(buildButtonInteractionDispatch("customId", { messageId: "42" }));
```

## Select menus

```ts
await probe.selectMenu("color-select").withValues(["green"]).select();
```

Currently covers only **string selects** (the most common case).
User/role/mentionable/channel selects follow the same pattern – not built
yet, see `src/fixtures/README.md`.

## Modals

Two directions: the bot **shows** a modal (`interaction.showModal(...)`),
the user **submits** it.

```ts
await probe.button("open-feedback-modal").click();

expect(probe.lastModal()).toMatchObject({ customId: "feedback-modal", title: "Your feedback" });

await probe.modal("feedback-modal").withFields({ "feedback-text": "more coffee please" }).submit();
```

`probe.lastModal()`/`probe.allModals()` check **whether and which** modal
was shown – like `lastReply()`/`allReplies()`, just for
`InteractionResponseType.Modal` instead of `ChannelMessageWithSource`.
`probe.modal(customId).submit()` itself doesn't check that, it just injects
the submit (even if no matching modal was shown – your bot code decides
what happens then).

`withFields({...})` expects name→value pairs: `custom_id` of the text input
→ entered text. `interaction.fields.getTextInputValue(customId)` in the bot
code reads it back.

## Component collectors

`channel.awaitMessageComponent(...)`,
`channel.createMessageComponentCollector(...)` and
`interaction.awaitModalSubmit(...)` work unchanged – they are discord.js
internal code listening to `client` events, and react to injected
interactions exactly like to real ones. See `examples/feedback-bot/bot.ts`
for a complete example: a button is collected via `awaitMessageComponent()`,
a modal submit via `awaitModalSubmit()`.

Collectors bound to a *specific* message
(`(await channel.send(...)).awaitMessageComponent()`/
`createMessageComponentCollector()`) work too: `channel.send()` gets a real
`Message` back, and `probe.button()`/`selectMenu()` click the message the bot
sent last by default (see `tests/rest-responder.e2e.test.ts`).

**Still open:** `interaction.reply({ withResponse: true })` doesn't return a
`Message` yet (open item, see "Known gaps" in `CLAUDE.md`) – use
`channel.awaitMessageComponent(...)` or `interaction.awaitModalSubmit(...)`
there.

## Evaluating Components V2 containers

Many bots no longer reply with plain `content` today but with a Components
V2 container (`ContainerBuilder`/`TextDisplayBuilder`, flag
`MessageFlags.IsComponentsV2`) – the visible text then sits deeply nested in
`reply.components[].components[]...`. Reaching through the tree by hand is
exactly the kind of test that breaks on the smallest UI restructuring
without the visible content having changed.

`extractText(reply)` solves that: it reads every `TextDisplay` recursively
from containers/sections (in reading order, joined with `"\n"`) – and works
the same for classic `content` replies, without the test having to know
which style the bot uses internally:

```ts
import { extractText } from "probe.ts";

await probe.slashCommand("status").invoke();

expect(extractText(probe.lastReply()!)).toBe("🟢 All systems operational\nUptime: 3 days");
```

See `examples/status-bot/bot.ts` for a complete example. Buttons/select
menus in an `ActionRow` inside the container are deliberately ignored (no
`content`) – test those as usual via `probe.button(...)`/
`probe.selectMenu(...)`, regardless of which container they sit in.

## The hidden discord.js rule

As with gateway events (`docs/testing-event-handlers.md`): discord.js needs
a guild/channel known in the client cache, otherwise
`interaction.channel`/`interaction.guild` don't resolve.
`probe.slashCommand()`/`button()`/`selectMenu()`/`modal()` seed that
automatically before every injection – invisible to the test code.
