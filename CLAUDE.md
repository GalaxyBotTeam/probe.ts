# CLAUDE.md

Dieses Dokument gibt Claude Code (und menschlichen Entwicklern) den nötigen
Kontext, um an **probe.ts** produktiv mitzuarbeiten.

## Was ist probe.ts?

`probe.ts` ist ein Testframework für Discord-Bots, die mit **discord.js**
gebaut sind. Es erlaubt Bot-Entwicklern, ihre Commands und Interaktionen zu
testen, **ohne** sich mit Discord zu verbinden – schnell, deterministisch und
integriert in **Vitest**.

Teil des GalaxyBot-Ökosystems (siehe auch `galactic.ts`).

## Kern-Prinzip: Mock am Transport-Layer, nicht an den Models

**WICHTIG:** Wir mocken NIEMALS discord.js-Model-Klassen (`Message`,
`Interaction`, `Guild`, ...) einzeln. Das wäre nicht wartbar.

Stattdessen mocken wir nur die zwei Grenzen von discord.js:
- **`@discordjs/ws`** → wir injizieren Fake-Gateway-Events (eingehend)
- **`@discordjs/rest`** → wir fangen alle REST-Calls ab (ausgehend)

discord.js baut daraus selbst echte Model-Objekte. Vorteile:
- Kein Model-Wartungsaufwand bei discord.js-Updates
- Realistisches Verhalten (echte Objekte im Bot-Code)
- Einfache Assertions über abgefangene REST-Calls

Alles, was Nutzer schreiben, sollte über **Fixture-Builder** laufen, die rohe
Gateway-Payloads erzeugen – Nutzer schreiben nie manuell JSON.

## Leitprinzipien

- **Batterien inklusive, aber leicht.** Sinnvolle Defaults, minimaler
  Boilerplate.
- **Vertraute Tools.** Baut auf Vitest auf, statt ein eigenes
  Test-Ökosystem zu erfinden.
- **Für Hobby-Entwickler gemacht.** Einfacher Einstieg, gute Docs,
  freundliche API.
- **Zukunftssicher.** discord.js-Updates sollen probe.ts nicht brechen –
  genau deshalb der Mock-am-Transport-Layer-Ansatz oben.

## Nicht-Ziele

- Kein Ersatz für Vitest – wir integrieren uns, ersetzen nichts.
- Kein Testing gegen die echte Discord-API (das ist E2E, ein anderes
  Problem).
- Keine Unterstützung anderer Bot-Libraries als discord.js (erstmal).

## Tech-Stack

- **Sprache:** TypeScript (strict mode + `noUncheckedIndexedAccess` +
  `exactOptionalPropertyTypes`, s. `.claude/rules/typescript-conventions.md`)
- **Target-Library:** discord.js v14+ (`peerDependency` – der Host bringt
  seins mit, s. `.claude/rules/dependency-management.md`)
- **Test-Runner:** Vitest (probe.ts integriert sich, ersetzt es nicht)
- **Package-Manager:** npm (`package-lock.json` ist das echte Lockfile)
- **Lizenz:** MIT

## Projekt-Struktur

```
src/
  core/           Probe-Instanz, Lifecycle – der öffentliche Einstiegspunkt
  transport/      Fake-WS-Layer + Fake-REST-Layer (die einzigen zwei Mocks)
  fixtures/       Builder für rohe Gateway-/REST-Payloads
  events/         probe.emit() – generische Gateway-Events
  interactions/   Slash-Command-/Button-/Select-Menu-/Modal-Helfer
  index.ts        Public API
tests/            Tests des Frameworks selbst
examples/         Beispiel-Bots + Beispiel-Tests
docs/             Vertiefende Guides (Events, Message Components)
```

Jeder `src/`-Unterordner hat sein eigenes `README.md` mit Details zu
Zweck, Konventionen und Erweiterungspunkten – dort nachsehen, bevor etwas
Neues gebaut wird, nicht raten.

## Public API (Auszug)

```ts
import { createProbe } from "probe.ts";

const probe = createProbe(client);
await probe.setup();

await probe.slashCommand("ping").invoke();
expect(probe.lastReply()).toMatchObject({ content: "🏓 Pong!" });

probe.emit("guildMemberAdd", { user: { username: "anna" } });
await probe.button("open-feedback-modal").click();
```

Vollständige Übersicht + weitere Beispiele: `README.md`.

## Coding-Konventionen

- Strikte TypeScript-Typen, keine `any` ohne Kommentar-Begründung
- Öffentliche API klein & intuitiv halten – Komplexität nach innen kapseln
- Jede öffentliche Funktion hat TSDoc-Kommentare
- Naming darf gern zum Space-Theme passen, aber **Klarheit geht vor Wortspiel**
- Fixture-Builder haben sinnvolle Defaults, alles überschreibbar

## Architektur-Erweiterungspunkte

Eine neue Interaction-/Event-Art (z.B. Autocomplete, Threads) braucht in
aller Regel **keinen** Umbau, nur:

1. Fixture-Builder in `src/fixtures/` (Konventionen: `src/fixtures/README.md`)
2. Composition-Logik in `src/events/` (generische Gateway-Events, wie
   `probe.emit()`) oder `src/interactions/` (echte Discord-Interactions,
   wie `probe.slashCommand()`/`button()`) – Unterschied + Muster in den
   jeweiligen `README.md`
3. Der Fake-WS-Layer selbst (`src/transport/gateway-adapter.ts`) muss dafür
   fast nie angefasst werden – siehe `transport-boundary-check`-Skill

## Befehle

```bash
npm install       # Dependencies
npm test          # Vitest ausführen
npm run typecheck # tsc --noEmit
npm run build     # Build erstellen
npm run lint      # Linting
```

Vor jeder Aussage "funktioniert"/"passt": `verify`-Skill (alle vier
Kommandos, in der Reihenfolge) – Vitest allein typecheckt nicht.

## Definition of Done

- Feature hat Tests
- Öffentliche API ist typisiert & dokumentiert (TSDoc)
- Beispiel in `examples/` bei größeren Features
- README bleibt aktuell

## Bekannte Lücken (offen für Beiträge)

- Custom Vitest-Matcher (z.B. `toHaveReplied`, `toHaveRepliedWith`) –
  aktuell nur einfache Assertions auf `lastReply()`/`allReplies()`/etc.
- Weitere Select-Menu-Typen (User-/Role-/Mentionable-/Channel-Select) –
  aktuell nur String-Select (`src/fixtures/message-component-interaction.ts`)
- Fake-REST-Layer gibt bei `channel.send(...)`/`interaction.reply({withResponse:true})`
  noch keine echte, brauchbare `Message` zurück – blockiert
  `message.createMessageComponentCollector()` (an eine bestimmte Nachricht
  gebunden statt channel-weit), s. `docs/testing-message-components.md`
- `followUp()` wird von `parseReply()` noch nicht separat erkannt (landet
  aber roh in `probe.capturedRequests()`)
- Snapshot-Testing für Embeds, Zeit-/Timer-Kontrolle für Collectors,
  mehrere simulierte Nutzer pro Test, Permissions-/Rollen-Simulation
- npm-Veröffentlichung + Ankündigung in der GalaxyBot-Community stehen
  noch aus – `package.json` bleibt bewusst bei `version: "0.0.0"`, die
  echte Version setzt `.github/workflows/release.yml` dynamisch aus dem
  GitHub-Release-Tag

Nutzerseitige Fassung derselben Liste: `README.md` (Abschnitt „Umfang“).
