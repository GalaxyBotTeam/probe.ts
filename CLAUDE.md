# CLAUDE.md

This document gives Claude Code (and human developers) the context needed
to work productively on **probe.ts**.

## What is probe.ts?

`probe.ts` is a testing framework for Discord bots built with
**discord.js**. It lets bot developers test their commands and interactions
**without** connecting to Discord – fast, deterministic and integrated into
**Vitest**.

Part of the GalaxyBot ecosystem (see also `galactic.ts`).

## Core principle: mock at the transport layer, not the models

**IMPORTANT:** We NEVER mock discord.js model classes (`Message`,
`Interaction`, `Guild`, ...) individually. That wouldn't be maintainable.

Instead we only mock the two boundaries of discord.js:
- **`@discordjs/ws`** → we inject fake gateway events (incoming)
- **`@discordjs/rest`** → we capture all REST calls (outgoing)

discord.js builds real model objects from that itself. Benefits:
- No model maintenance on discord.js updates
- Realistic behavior (real objects in the bot code)
- Simple assertions on captured REST calls

Everything users write should go through **fixture builders** that produce
raw gateway payloads – users never write JSON by hand.

## Guiding principles

- **Batteries included, but light.** Sensible defaults, minimal
  boilerplate.
- **Familiar tools.** Builds on Vitest instead of inventing its own test
  ecosystem.
- **Made for hobby developers.** Easy start, good docs, friendly API.
- **Future-proof.** discord.js updates shouldn't break probe.ts – that's
  exactly why we mock at the transport layer (see above).

## Non-goals

- No replacement for Vitest – we integrate, we don't replace.
- No testing against the real Discord API (that's E2E, a different
  problem).
- No support for bot libraries other than discord.js (for now).

## Tech stack

- **Language:** TypeScript (strict mode + `noUncheckedIndexedAccess` +
  `exactOptionalPropertyTypes`, see `.claude/rules/typescript-conventions.md`)
- **Target library:** discord.js v14+ (`peerDependency` – the host brings
  its own, see `.claude/rules/dependency-management.md`)
- **Test runner:** Vitest (probe.ts integrates, doesn't replace it)
- **Package manager:** npm (`package-lock.json` is the real lockfile)
- **License:** MIT

## Project structure

```
src/
  core/           Probe instance, lifecycle – the public entry point
  transport/      Fake WS layer + fake REST layer (the only two mocks)
  fixtures/       Builders for raw gateway/REST payloads
  events/         probe.emit() – generic gateway events
  interactions/   Slash command/button/select menu/modal helpers
  index.ts        Public API
tests/            Tests of the framework itself
examples/         Example bots + example tests
docs/             In-depth guides (events, message components)
```

Every `src/` subfolder has its own `README.md` with details on purpose,
conventions and extension points – look there before building something
new, don't guess.

## Public API (excerpt)

```ts
import { createProbe } from "probe.ts";

const probe = createProbe(client);
await probe.setup();

await probe.slashCommand("ping").invoke();
expect(probe.lastReply()).toMatchObject({ content: "🏓 Pong!" });

probe.emit("guildMemberAdd", { user: { username: "anna" } });
await probe.button("open-feedback-modal").click();
```

Full overview + more examples: `README.md`.

## Coding conventions

- Everything in English: code, comments, TSDoc, docs, test names, example bot texts
- Strict TypeScript types, no `any` without a comment explaining why
- Keep the public API small & intuitive – encapsulate complexity inside
- Every public function has TSDoc comments
- Naming may fit the space theme, but **clarity beats wordplay**
- Fixture builders have sensible defaults, everything overridable

## Architecture extension points

A new interaction/event kind (e.g. autocomplete, threads) usually needs
**no** restructuring, only:

1. Fixture builder in `src/fixtures/` (conventions: `src/fixtures/README.md`)
2. Composition logic in `src/events/` (generic gateway events, like
   `probe.emit()`) or `src/interactions/` (real Discord interactions, like
   `probe.slashCommand()`/`button()`) – difference + patterns in the
   respective `README.md`
3. The fake WS layer itself (`src/transport/gateway-adapter.ts`) almost never
   needs to be touched for this – see the `transport-boundary-check` skill

## Commands

```bash
npm install       # dependencies
npm test          # run Vitest
npm run typecheck # tsc --noEmit
npm run build     # create build
npm run lint      # linting
```

Before every "works"/"done" claim: `verify` skill (all four commands, in
order) – Vitest alone doesn't typecheck.

## Definition of done

- Feature has tests
- Public API is typed & documented (TSDoc)
- Example in `examples/` for bigger features
- README stays up to date

## Known gaps (open for contributions)

- Custom Vitest matchers (e.g. `toHaveReplied`, `toHaveRepliedWith`) –
  currently only simple assertions on `lastReply()`/`allReplies()`/etc.
- More select menu types (user/role/mentionable/channel select) – currently
  only string select (`src/fixtures/message-component-interaction.ts`)
- The fake REST layer doesn't return a `Message` for
  `interaction.reply({withResponse:true})` yet (`channel.send()`,
  `followUp()`, `editReply()` already do), see
  `docs/testing-message-components.md`
- `followUp()` isn't recognized separately by `parseReply()` yet (but ends
  up raw in `probe.capturedRequests()`)
- Snapshot testing for embeds, time/timer control for collectors,
  permission/role simulation
- npm release + announcement in the GalaxyBot community are still pending –
  `package.json` deliberately stays at `version: "0.0.0"`, the real version
  is set dynamically by `.github/workflows/release.yml` from the GitHub
  release tag

User-facing version of the same list: `README.md` (section "Current Status").
