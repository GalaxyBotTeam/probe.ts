import type { InteractionContextOverrides } from "../fixtures/interaction-context.js";
import { buildSlashCommandInteractionDispatch, type SlashCommandOptionValues } from "../fixtures/interaction.js";

/** Fluent Builder für einen einzelnen Slash-Command-Aufruf, von `Probe.slashCommand()` zurückgegeben. */
export interface SlashCommandInvocation {
  /** Setzt die Command-Optionen (z.B. `{ menge: 5 }`). Gibt sich selbst zurück, zum Verketten. */
  withOptions(options: SlashCommandOptionValues): SlashCommandInvocation;
  /** Setzt, wer den Command wo ausführt (User, Member, Guild, Channel). Gibt sich selbst zurück, zum Verketten. */
  withContext(context: InteractionContextOverrides): SlashCommandInvocation;
  /** Injiziert die Interaction und wartet, bis der Bot mindestens einmal geantwortet hat. */
  invoke(): Promise<void>;
}

/**
 * Baut eine `SlashCommandInvocation`. Nicht Teil der öffentlichen API – nur
 * intern via `Probe.slashCommand()` verwendet, das `inject`/`waitForReply`
 * aus dem Probe-internen Zustand schließt.
 */
export function createSlashCommandInvocation(
  name: string,
  inject: (dispatch: ReturnType<typeof buildSlashCommandInteractionDispatch>) => void,
  waitForReply: () => Promise<void>,
): SlashCommandInvocation {
  let options: SlashCommandOptionValues | undefined;
  let context: InteractionContextOverrides = {};

  const invocation: SlashCommandInvocation = {
    withOptions(newOptions) {
      options = newOptions;
      return invocation;
    },
    withContext(newContext) {
      context = newContext;
      return invocation;
    },
    async invoke() {
      inject(buildSlashCommandInteractionDispatch(name, { ...context, ...(options ? { options } : {}) }));
      await waitForReply();
    },
  };

  return invocation;
}
