import type { InteractionContextOverrides } from "../fixtures/interaction-context.js";
import { buildModalSubmitInteractionDispatch } from "../fixtures/modal-interaction.js";

/** Fluent Builder für einen Modal-Submit, von `Probe.modal()` zurückgegeben. */
export interface ModalSubmitInvocation {
  /** Setzt die eingegebenen Felder (`custom_id` → Text). Gibt sich selbst zurück, zum Verketten. */
  withFields(fields: Record<string, string>): ModalSubmitInvocation;
  /** Setzt, wer wo absendet (User, Member, Guild, Channel). Gibt sich selbst zurück, zum Verketten. */
  withContext(context: InteractionContextOverrides): ModalSubmitInvocation;
  /** Injiziert den Submit und wartet, bis der Bot mindestens einmal geantwortet hat. */
  submit(): Promise<void>;
}

/**
 * Baut eine `ModalSubmitInvocation`. Nicht Teil der öffentlichen API – nur
 * intern via `Probe.modal()` verwendet.
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
