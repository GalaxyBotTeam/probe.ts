import type { InteractionContextOverrides } from "../fixtures/interaction-context.js";
import { buildModalSubmitInteractionDispatch } from "../fixtures/modal-interaction.js";

/** Fluent builder for a modal submit, returned by `Probe.modal()`. */
export interface ModalSubmitInvocation {
  /** Sets the entered fields (`custom_id` → text). Returns itself, for chaining. */
  withFields(fields: Record<string, string>): ModalSubmitInvocation;
  /** Sets who submits where (user, member, guild, channel). Returns itself, for chaining. */
  withContext(context: InteractionContextOverrides): ModalSubmitInvocation;
  /** Injects the submit and waits until the bot has responded at least once. */
  submit(): Promise<void>;
}

/**
 * Builds a `ModalSubmitInvocation`. Not part of the public API – only used
 * internally via `Probe.modal()`.
 */
export function createModalSubmitInvocation(
  customId: string,
  inject: (dispatch: ReturnType<typeof buildModalSubmitInteractionDispatch>) => void,
  waitForReply: () => Promise<void>,
): ModalSubmitInvocation {
  let fields: Record<string, string> = {};
  let context: InteractionContextOverrides = {};

  const invocation: ModalSubmitInvocation = {
    withFields(newFields) {
      fields = newFields;
      return invocation;
    },
    withContext(newContext) {
      context = newContext;
      return invocation;
    },
    async submit() {
      inject(buildModalSubmitInteractionDispatch(customId, { ...context, fields }));
      await waitForReply();
    },
  };

  return invocation;
}
