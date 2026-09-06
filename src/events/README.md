# `src/events/`

Composition-Layer für `Probe.emit(eventName, overrides)`: übersetzt einen
freundlichen, discord.js-üblichen Event-Namen (`guildMemberAdd`, wie
`client.on("guildMemberAdd", ...)`) in die richtige Sequenz roher
Gateway-Dispatch-Events.

## Warum eine Sequenz und nicht ein einzelnes Event?

discord.js verarbeitet `GUILD_MEMBER_ADD`/`_REMOVE`, `MESSAGE_CREATE`/
`_DELETE`, `MESSAGE_REACTION_ADD`/`_REMOVE` nur, wenn die betroffene
Guild/der Channel/das Mitglied/die Nachricht/der reagierende Nutzer schon
in seinem Client-Cache bekannt ist – sonst wird das Event stillschweigend
ignoriert (kein Fehler, kein emittiertes Client-Event). `gateway-event.ts`
stellt das automatisch her, unsichtbar für den Testcode:

- **jedes Member-/Message-/Reaction-Event**: erst ein `GUILD_CREATE`
  (siehe `../fixtures/guild-create.ts`), das Guild + Channel im Cache
  anlegt
- **`guildMemberRemove`**: das `GUILD_CREATE` bekommt das Mitglied schon
  in seiner Members-Liste (discord.js emittiert sonst kein echtes
  `GuildMember`)
- **`messageDelete`/`messageReactionAdd`/`messageReactionRemove`**:
  vorangestelltes `MESSAGE_CREATE` mit derselben `id` (discord.js
  emittiert sonst keine echte `Message`)
- **`messageReactionRemove`**: zusätzlich ein vorangestelltes
  `MESSAGE_REACTION_ADD` mit demselben Nutzer/Emoji (discord.js löst den
  entfernenden Nutzer nur auf, wenn er schon global gecached ist)

Details + die genaue Fundstelle in discord.js: `docs/testing-event-handlers.md`.

## Neues Event unterstützen

1. Fixture-Builder in `../fixtures/` (falls noch nicht vorhanden).
2. Overrides-Typ in `GatewayEventOverrides` (`gateway-event.ts`) ergänzen.
3. `case` im `switch` in `buildGatewayEventDispatches` ergänzen – meist
   nur "Guild/Channel/Message seed davor, falls nötig, dann das Event
   selbst".
4. Export der Overrides-Typen in `src/index.ts` ergänzen.

`../transport/gateway-adapter.ts` selbst muss dafür in aller Regel
**nicht** angefasst werden – `injectDispatch()` ist bereits generisch
genug.
