# Event-Handler testen

Neben Slash Commands kann probe.ts generische Gateway-Events injizieren –
`guildMemberAdd`, `guildMemberRemove`, `messageCreate`, `messageDelete`,
`messageReactionAdd`, `messageReactionRemove`. Das deckt den größten Teil
klassischer Hobby-Bot-Logik ab: Welcome-Messages, Goodbye-Messages,
Prefix-Commands, Reaction-Roles, einfache Logging-Handler.

**Prefix-Commands sind kein eigenes Event.** Anders als Slash Commands
(eine echte Discord-Interaction mit Callback-Contract) ist ein
Prefix-Command (`!ping`) nur eine normale Nachricht, die dein Bot-Code
selbst parst (`message.content.startsWith("!")`). Zum Testen reicht
`messageCreate` mit passendem `content` – kein eigener Fixture-Builder,
keine eigene `Probe`-Methode nötig:

```ts
probe.emit("messageCreate", { content: "!rollen" });
```

Auf echtem Discord braucht `message.content` außerhalb von DMs das
privilegierte `MessageContent`-Intent (`GatewayIntentBits.MessageContent`)
– probe.ts umgeht das (kein echter Intent-Filter beim Fake-Transport),
im echten Bot vergisst man's aber gern.

## Grundprinzip

```ts
probe.emit("guildMemberAdd", { user: { username: "anna" } });

await vi.waitFor(() => {
  expect(probe.capturedRequests()).toHaveLength(1);
});
```

`emit()` ist **synchron**, genau wie `injectDispatch()` – es injiziert das
Event und kehrt sofort zurück. Reagiert der Bot asynchron (z.B. via
`interaction.reply()` oder `channel.send()`), muss wie gewohnt mit
`vi.waitFor(...)` gewartet werden (siehe
`.claude/rules/test-conventions.md`).

Anders als bei `slashCommand().invoke()` gibt es hier kein `lastReply()` –
das ist nur für Interaction-Antworten (Callback/`editReply`) gebaut. Ein
`channel.send(...)` landet als eigener REST-Call in
`probe.capturedRequests()`; dessen `body` prüfen:

```ts
const body = probe.capturedRequests().at(-1)?.body as { content?: string };
expect(body.content).toBe("👋 Willkommen, <@1>!");
```

## Unterstützte Events

| Event               | Overrides                                    |
| ------------------- | --------------------------------------------- |
| `guildMemberAdd`    | `{ user?, guildId? }`                         |
| `guildMemberRemove` | `{ user?, guildId? }`                         |
| `messageCreate`     | `{ id?, content?, author?, channel?, guildId? }` |
| `messageDelete`     | `{ id?, channel?, guildId? }`                 |
| `messageReactionAdd` | `{ emoji?, user?, messageId?, channel?, guildId? }` |
| `messageReactionRemove` | `{ emoji?, user?, messageId?, channel?, guildId? }` |

Alle Felder sind optional und haben dieselben Defaults wie die übrigen
Fixture-Builder (z.B. `id: "1"`, `emoji: "👍"`).

## Die versteckte Discord-Regel: Guild muss bekannt sein

discord.js braucht eine im Client-Cache bekannte Guild (und für
Message-/Reaction-Events einen bekannten Channel + eine bekannte
Nachricht), bevor es `GUILD_MEMBER_ADD`, `GUILD_MEMBER_REMOVE`,
`MESSAGE_CREATE`, `MESSAGE_DELETE`, `MESSAGE_REACTION_ADD` oder
`MESSAGE_REACTION_REMOVE` überhaupt verarbeitet – ist die Guild/der
Channel/die Nachricht unbekannt, wird das Event stillschweigend ignoriert
(kein Fehler, kein emittiertes Client-Event).

`probe.emit()` nimmt einem das ab: es injiziert automatisch ein passendes
`GUILD_CREATE`-Event vor dem eigentlichen Event, unsichtbar für den
Testcode. Mehrere Sonderfälle, die genau die reale Discord-Reihenfolge
nachbilden:

- **`guildMemberRemove`**: discord.js emittiert nur ein echtes
  `GuildMember`, wenn das Mitglied vorher schon bekannt war. Der
  vorangestellte `GUILD_CREATE` enthält daher das Mitglied bereits in
  seiner Members-Liste.
- **`messageDelete`/`messageReactionAdd`/`messageReactionRemove`**:
  discord.js emittiert nur eine echte `Message`, wenn sie vorher schon im
  Cache war. `probe.emit(...)` injiziert deshalb zuerst ein
  `MESSAGE_CREATE` mit derselben `id` – wie in echt kann man ja auch keine
  Nachricht löschen oder mit ihr interagieren, die nie erstellt wurde.
- **`messageReactionRemove`**: discord.js löst den entfernenden Nutzer nur
  auf, wenn er schon *global* gecached ist (anders als bei
  `messageReactionAdd`, das dafür einen `member`-Block mitschickt).
  `probe.emit("messageReactionRemove", ...)` injiziert deshalb zusätzlich
  ein vorangestelltes `messageReactionAdd` mit demselben Nutzer/Emoji –
  wie in echt reagiert man ja erst, bevor man die Reaction zurückzieht.

Achtung bei alldem: löst dein Bot-Code über einen eigenen
`messageCreate`-/`messageReactionAdd`-Handler auf das vorangestellte
Seed-Event auch etwas aus, taucht dieser REST-Call ebenfalls in
`probe.capturedRequests()` auf – bei `messageReactionRemove` also ggf. auf
die *letzte* Antwort prüfen, nicht auf `capturedRequests()[0]`.

## Beispiele

- `examples/welcome-bot/` + `tests/gateway-events.e2e.test.ts` –
  `guildMemberAdd`/`guildMemberRemove`/`messageCreate`/`messageDelete`
- `examples/reaction-role-bot/` + `tests/reaction-events.e2e.test.ts` –
  Prefix-Command (`!rollen`) + Reaction-Role
  (`messageReactionAdd`/`messageReactionRemove`)

## Eigene Events

Fehlt ein Event? Neue Fixture-Builder in `src/fixtures/` ergänzen (siehe
`build-gateway-payload`-Skill) und in `src/events/gateway-event.ts`
verdrahten – der Fake-WS-Layer selbst (`src/transport/gateway-adapter.ts`)
muss dafür in aller Regel **nicht** angefasst werden.
