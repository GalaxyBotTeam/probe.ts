# `src/interactions/`

Helfer speziell für Discord-**Interactions**: Slash Commands, Buttons,
Select Menus, Modal-Submits.

Für generische Gateway-Events (Member-Join, Message-Create, ...), die
keine Interactions sind, siehe stattdessen `../events/`.

## `slash-command.ts`

`createSlashCommandInvocation` baut die fluent API hinter
`probe.slashCommand(name)`:

```ts
await probe.slashCommand("echo").withOptions({ message: "hallo" }).invoke();
```

## `message-component.ts`

`createButtonInvocation`/`createSelectMenuInvocation` bauen die fluent API
hinter `probe.button(customId)`/`probe.selectMenu(customId)`:

```ts
await probe.button("open-feedback-modal").click();
await probe.selectMenu("color-select").withValues(["gruen"]).select();
```

`button()` braucht keine `messageId`-Angabe im Testcode – Default `"1"`
(siehe `MessageComponentOverrides` in `../fixtures/message-component-interaction.ts`)
passt ohne weiteres Zutun, solange in einem Test nur eine Nachricht im
Spiel ist. Für mehrere Nachrichten gleichzeitig: den Fixture-Builder direkt
mit `messageId`-Override + `probe.injectDispatch(...)` verwenden.

## `modal.ts`

`createModalSubmitInvocation` baut die fluent API hinter
`probe.modal(customId)`:

```ts
await probe.modal("feedback-modal").withFields({ "feedback-text": "mehr Kaffee bitte" }).submit();
```

Ob der Bot vorher wirklich `interaction.showModal(...)` mit diesem
`customId` aufgerufen hat, prüft `probe.lastModal()`/`probe.allModals()`
(`replies.ts`) – `probe.modal(...).submit()` selbst prüft das nicht, es
injiziert einfach den Submit.

## Gemeinsames Verhalten von `slashCommand`/`button`/`selectMenu`/`modal`

Alle vier:

- injizieren vorher unsichtbar eine Guild mit Default-Channel (siehe
  `buildGuildCreateDispatch`), damit `interaction.channel`/`interaction.guild`
  echt auflösen – dieselbe versteckte discord.js-Regel wie bei
  Gateway-Events (`../events/README.md`), hier nur für Interactions
- warten anschließend auf mindestens einen neuen REST-Call (`waitForNextRequest`
  in `../core/probe.ts`) – anders als `Probe.emit()`/`injectDispatch()`, die
  bewusst synchron bleiben und das Warten dem Testcode überlassen. Der
  Unterschied ist Absicht: Interactions sind der Kernfall, den wir mit
  möglichst wenig Testcode-Boilerplate abdecken wollen.

## `replies.ts`

`parseReply(request)` liest den sichtbaren Antwort-Inhalt aus einem
abgefangenen REST-Call – POST `.../interactions/.../callback` (Antwort-Typ
`ChannelMessageWithSource`) oder PATCH `.../webhooks/.../@original`
(`editReply()`). Ein reines `deferReply()` ohne Inhalt liefert `undefined`.
`parseModal(request)` liest analog dazu ein per `showModal(...)` gezeigtes
Modal (Antwort-Typ `Modal`) – `customId` + `title`.

Beide sind nur für Interaction-Antworten relevant, nicht für generische
REST-Calls wie `channel.send(...)` – die landen unverändert in
`probe.capturedRequests()`.

`extractText(reply)` liest den sichtbaren Text aus einem `ReplyContent` –
klassisches `content` genauso wie ein Components-V2-Container
(`TextDisplay` rekursiv aus `Container`/`Section` geholt). Siehe
`docs/testing-message-components.md`.

## Neue Interaction-Art hinzufügen

1. Fixture-Builder in `../fixtures/` (siehe dessen `README.md` –
   `buildInteractionContext` als Unterbau wiederverwenden).
2. Fluent-Invocation hier: `create<Name>Invocation(customId, inject, waitForReply)`
   nach obigem Muster – `inject`/`waitForReply` bekommt sie von
   `../core/probe.ts` injiziert, nicht selbst bauen.
3. Methode + Export in `Probe` (`../core/probe.ts`) ergänzen.
4. Export in `src/index.ts` ergänzen.
