# Message Components testen

Buttons, Select Menus und Modals lassen sich genauso testen wie Slash
Commands – über die fluent API auf `probe`.

## Buttons

```ts
await probe.slashCommand("feedback").invoke();
await probe.button("open-feedback-modal").click();
```

`probe.button(customId)` klickt auf einen Button mit diesem `custom_id`.
Die `messageId` der Nachricht, an der der Button hängt, muss **nicht**
angegeben werden – Default `"1"` passt ohne weiteres Zutun, solange in
einem Test nur eine Nachricht im Spiel ist (der übliche Fall). Mehrere
Nachrichten gleichzeitig? Fixture-Builder direkt verwenden:

```ts
import { buildButtonInteractionDispatch } from "probe.ts";
probe.injectDispatch(buildButtonInteractionDispatch("customId", { messageId: "42" }));
```

## Select Menus

```ts
await probe.selectMenu("color-select").withValues(["gruen"]).select();
```

Deckt aktuell nur **String-Select** ab (der häufigste Fall). User-/Role-/
Mentionable-/Channel-Select folgen demselben Muster – noch nicht gebaut,
siehe `src/fixtures/README.md`.

## Modals

Zwei Richtungen: der Bot **zeigt** ein Modal (`interaction.showModal(...)`),
der Nutzer **submittet** es.

```ts
await probe.button("open-feedback-modal").click();

expect(probe.lastModal()).toMatchObject({ customId: "feedback-modal", title: "Dein Feedback" });

await probe.modal("feedback-modal").withFields({ "feedback-text": "mehr Kaffee bitte" }).submit();
```

`probe.lastModal()`/`probe.allModals()` prüfen, **ob und welches** Modal
gezeigt wurde – analog zu `lastReply()`/`allReplies()`, nur für
`InteractionResponseType.Modal` statt `ChannelMessageWithSource`.
`probe.modal(customId).submit()` selbst prüft das nicht, es injiziert
einfach den Submit (auch wenn kein passendes Modal gezeigt wurde – dein
Bot-Code entscheidet, was dann passiert).

`withFields({...})` erwartet Name→Wert-Paare: `custom_id` des Text-Inputs
→ eingegebener Text. `interaction.fields.getTextInputValue(customId)` im
Bot-Code liest das wieder aus.

## Component-Collectors

`channel.awaitMessageComponent(...)`, `channel.createMessageComponentCollector(...)`
und `interaction.awaitModalSubmit(...)` funktionieren unverändert – sie
sind discord.js-interner Code, der auf `client`-Events lauscht, und
reagieren auf injizierte Interactions genau wie auf echte. Siehe
`examples/feedback-bot/bot.ts` für ein vollständiges Beispiel: ein Button
wird per `awaitMessageComponent()` eingesammelt, ein Modal-Submit per
`awaitModalSubmit()`.

**Wichtig:** `message.createMessageComponentCollector()` (an eine
*bestimmte* Nachricht gebunden) braucht eine echte `Message` mit der ID
dieser Nachricht – aktuell liefert unser Fake-REST-Layer bei
`channel.send(...)`/`interaction.reply({ withResponse: true })` noch keine
brauchbare `Message` zurück (offener Punkt, siehe „Bekannte Lücken" in
`CLAUDE.md`). Bis dahin: `channel.awaitMessageComponent(...)`/
`channel.createMessageComponentCollector(...)` (Channel-weit, kein
Message-Binding nötig) oder `interaction.awaitModalSubmit(...)`
(Interaction-weit, nur Filter) verwenden – beides der ohnehin
gebräuchlichere Ansatz in discord.js-Bots.

## Components-V2-Container auswerten

Viele Bots antworten heute nicht mehr mit einfachem `content`, sondern mit
einem Components-V2-Container (`ContainerBuilder`/`TextDisplayBuilder`,
Flag `MessageFlags.IsComponentsV2`) – der sichtbare Text steckt dann tief
verschachtelt in `reply.components[].components[]...`. Von Hand durch den
Baum zu greifen ist genau die Art Test, die bei der kleinsten
UI-Umstrukturierung bricht, ohne dass sich der sichtbare Inhalt geändert
hätte.

`extractText(reply)` löst das: liest jedes `TextDisplay` rekursiv aus
Containern/Sections aus (in Lesereihenfolge, durch `"\n"` getrennt) –
funktioniert genauso für klassische `content`-Antworten, ohne dass der
Test wissen muss, welchen Stil der Bot intern verwendet:

```ts
import { extractText } from "probe.ts";

await probe.slashCommand("status").invoke();

expect(extractText(probe.lastReply()!)).toBe("🟢 Alle Systeme laufen\nUptime: 3 Tage");
```

Siehe `examples/status-bot/bot.ts` für ein vollständiges Beispiel.
Buttons/Select-Menus in einer `ActionRow` innerhalb des Containers werden
absichtlich ignoriert (kein `content`) – die testet man wie gewohnt über
`probe.button(...)`/`probe.selectMenu(...)`, unabhängig davon, in welchem
Container sie stecken.

## Die versteckte discord.js-Regel

Wie bei Gateway-Events (`docs/testing-event-handlers.md`) gilt: discord.js
braucht eine im Client-Cache bekannte Guild/einen bekannten Channel,
sonst löst `interaction.channel`/`interaction.guild` nicht auf.
`probe.slashCommand()`/`button()`/`selectMenu()`/`modal()` säen das
automatisch vor jeder Injektion – unsichtbar für den Testcode.
