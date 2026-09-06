# `src/core/`

Der einzige öffentliche Einstiegspunkt: `createProbe(client)`.

## `probe.ts`

`createProbe()` verdrahtet die zwei Fake-Adapter aus `../transport/` in
einen echten discord.js-`Client`, **bevor** `setup()` `client.login()`
aufruft – der Bot-Code selbst (der Client + seine Event-Listener) bleibt
komplett unangetastet.

`Probe` ist die einzige Schnittstelle, mit der Testcode arbeitet:

| Methode                | Zweck                                                              |
| ----------------------- | ------------------------------------------------------------------- |
| `setup()`/`teardown()`  | Lifecycle – Fake-Login + Ready-Handshake / sauberes Abräumen        |
| `injectDispatch(...)`   | Rohes Gateway-Dispatch injizieren (generischer Fall)                |
| `emit(name, overrides)` | Generisches Event über Fixture-Builder (`guildMemberAdd`, ...) – siehe `../events/README.md` |
| `slashCommand(name)`    | Fluent Slash-Command-Aufruf – siehe `../interactions/README.md`     |
| `button(customId)`/`selectMenu(customId)`/`modal(customId)` | Fluent Component-/Modal-Aufruf – siehe `../interactions/README.md` |
| `capturedRequests()`    | Alle abgefangenen REST-Calls, roh                                   |
| `lastReply()`/`allReplies()` | Geparste Interaction-Antworten (`reply`/`editReply`)           |
| `lastModal()`/`allModals()` | Geparste `showModal(...)`-Aufrufe                               |

Slash-Command-/Button-/Select-Menu-/Modal-Aufrufe sähen dabei intern
unsichtbar eine Guild mit Default-Channel vor (`injectInteraction()`,
verwendet `buildGuildCreateDispatch` aus `../fixtures/`) – sonst löst
`interaction.channel`/`interaction.guild` nicht auf (siehe
`../events/README.md` für dieselbe Regel bei Gateway-Events). Der rohe
`injectDispatch()` bleibt bewusst ohne dieses Seeding.

## Warum hier und nicht in `transport/`?

`transport/` kennt nur die zwei Adapter, keine Slash-Command- oder
Event-Semantik. `core/probe.ts` ist die Komposition: Adapter +
Interaction-/Event-Helfer (`../interactions/`, `../events/`) zu einer
einzigen, einfachen `Probe`-API. Neue Feature-Bereiche (Prefix-Commands,
Reactions, ...) bekommen eigene Helfer-Module und werden hier nur
verdrahtet – `createProbe()` selbst soll klein bleiben.
