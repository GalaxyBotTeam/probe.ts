# `src/fixtures/`

Builder für rohe Gateway-/REST-Payloads. Nutzer von probe.ts schreiben nie
manuell JSON – jede Interaktion oder jedes Event läuft über einen Builder
aus diesem Ordner.

## Konvention

Jeder Builder:

- nimmt ein optionales `overrides`-Objekt (Default `{}`), jedes Feld
  einzeln überschreibbar
- hat sinnvolle Defaults (`id: "1"` etc. – konsistent über alle Builder,
  damit z.B. `buildUser({ id: "42" })` und `buildGuild()` ohne weiteres
  Zutun zusammenpassen)
- ist typisiert gegen `discord-api-types/v10`, nie gegen eine
  handgerollte Shape (siehe `build-gateway-payload`-Skill)

## Builder-Übersicht

| Datei                              | Builder                                                          | Baut                                    |
| ----------------------------------- | ------------------------------------------------------------------ | ----------------------------------------- |
| `user.ts`                           | `buildUser`                                                       | `APIUser`                                 |
| `guild.ts`                          | `buildGuild`                                                       | `APIPartialInteractionGuild`              |
| `channel.ts`                        | `buildChannel`                                                     | Minimaler Channel-Payload (`id`, `type`)   |
| `member.ts`                         | `buildMember`                                                      | `APIInteractionGuildMember`               |
| `message.ts`                        | `buildMessage`                                                     | `APIMessage`                              |
| `interaction-context.ts`            | `buildInteractionContext`                                          | Channel/Guild/Member – Unterbau jeder Interaction |
| `interaction.ts`                    | `buildSlashCommandInteractionDispatch`                             | `INTERACTION_CREATE` (Slash Command)      |
| `message-component-interaction.ts`  | `buildButtonInteractionDispatch`, `buildSelectMenuInteractionDispatch` | `INTERACTION_CREATE` (Button-Klick, String-Select) |
| `modal-interaction.ts`              | `buildModalSubmitInteractionDispatch`                              | `INTERACTION_CREATE` (Modal-Submit)       |
| `guild-create.ts`                   | `buildGuildCreateDispatch`                                         | `GUILD_CREATE` – Cache-Vorbereitung       |
| `guild-member-events.ts`            | `buildGuildMemberAddDispatch`, `buildGuildMemberRemoveDispatch`    | `GUILD_MEMBER_ADD`/`_REMOVE`              |
| `message-events.ts`                 | `buildMessageCreateDispatch`, `buildMessageDeleteDispatch`         | `MESSAGE_CREATE`/`_DELETE`                |
| `reaction-events.ts`                | `buildMessageReactionAddDispatch`, `buildMessageReactionRemoveDispatch` | `MESSAGE_REACTION_ADD`/`_REMOVE` (nur Unicode-Emoji, kein custom Server-Emoji) |

`interaction-context.ts` ist der gemeinsame Unterbau für **jede**
Interaction-Art (Slash Command, Button, Select Menu, Modal-Submit): wer sie
ausgelöst hat, in welchem Channel/welcher Guild. Neuer Interaction-Typ?
Erst hier nachsehen, ob `buildInteractionContext` schon reicht, bevor
Channel/Guild/Member erneut von Hand zusammengebaut werden.

`message-component-interaction.ts` deckt bei Select Menus aktuell nur
String-Select ab (der mit Abstand häufigste Fall) – User-/Role-/
Mentionable-/Channel-Select folgen demselben Muster, nur anderer
`component_type` + `resolved`-Block.

`guild-create.ts` ist ein Sonderfall: die volle `APIGuild`-Form hat ~30
Pflichtfelder, die zu Ende zu konstruieren praktisch keinen Sinn ergibt.
Nur die Felder, die discord.js' `Guild._patch()` tatsächlich ungeschützt
liest, sind gesetzt – der Rest ist gecastet (`as`, mit Begründung im
Datei-Kommentar). Das ist die einzige dokumentierte Ausnahme von
"immer `satisfies`" in diesem Ordner (siehe
`.claude/rules/typescript-conventions.md`).

## Neuen Builder hinzufügen

1. Rohen Payload-Typ aus `discord-api-types/v10` importieren (nicht
   raten).
2. `overrides`-Interface + Funktion nach obigem Muster.
3. `satisfies <ExactType>` statt `as` – außer der Typ ist strukturell zu
   breit, um praktikabel konstruiert zu werden (dann: `as` + Kommentar).
4. Export in `src/index.ts` ergänzen.

Composition-Logik (welche Builder für welches `probe.emit(...)`-Event in
welcher Reihenfolge injiziert werden) lebt **nicht** hier, sondern in
`../events/gateway-event.ts` – Fixtures bauen genau einen Payload, nichts
weiter.
