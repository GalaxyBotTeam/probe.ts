import type { InteractionContextOverrides } from "../fixtures/interaction-context.js";
import { buildSlashCommandInteractionDispatch, type SlashCommandOptionValues } from "../fixtures/interaction.js";

/** Fluent builder for a single slash command invocation, returned by `Probe.slashCommand()`. */
export interface SlashCommandInvocation {
  /** Sets the command options (e.g. `{ amount: 5 }`). Returns itself, for chaining. */
  withOptions(options: SlashCommandOptionValues): SlashCommandInvocation;
  /** Sets who runs the command where (user, member, guild, channel). Returns itself, for chaining. */
  withContext(context: InteractionContextOverrides): SlashCommandInvocation;
  /** Injects the interaction and waits until the bot has responded at least once. */
  invoke(): Promise<void>;
}

/**
 * Builds a `SlashCommandInvocation`. Not part of the public API – only used
 * internally via `Probe.slashCommand()`, which closes over
 * `inject`/`waitForReply` from the probe's internal state.
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
