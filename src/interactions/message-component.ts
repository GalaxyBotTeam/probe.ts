import type { InteractionContextOverrides } from "../fixtures/interaction-context.js";
import {
  buildButtonInteractionDispatch,
  buildSelectMenuInteractionDispatch,
} from "../fixtures/message-component-interaction.js";

/** `messageId`-Override nur, wenn der Bot schon eine Nachricht gesendet hat – sonst bleibt der Fixture-Default. */
function withMessageId(messageId: string | undefined): { messageId?: string } {
  return messageId ? { messageId } : {};
}

/** Fluent Builder für einen Button-Klick, von `Probe.button()` zurückgegeben. */
export interface ButtonInvocation {
  /** Setzt, wer wo klickt (User, Member, Guild, Channel). Gibt sich selbst zurück, zum Verketten. */
  withContext(context: InteractionContextOverrides): ButtonInvocation;
  /** Injiziert den Klick und wartet, bis der Bot mindestens einmal geantwortet hat. */
  click(): Promise<void>;
}

/**
 * Baut eine `ButtonInvocation`. Nicht Teil der öffentlichen API – nur
 * intern via `Probe.button()` verwendet.
 */
export function createButtonInvocation(
  customId: string,
  inject: (dispatch: ReturnType<typeof buildButtonInteractionDispatch>) => void,
  waitForReply: () => Promise<void>,
  defaultMessageId: () => string | undefined,
): ButtonInvocation {
  let context: InteractionContextOverrides = {};

  const invocation: ButtonInvocation = {
    withContext(newContext) {
      context = newContext;
      return invocation;
    },
    async click() {
      inject(buildButtonInteractionDispatch(customId, { ...withMessageId(defaultMessageId()), ...context }));
      await waitForReply();
    },
  };

  return invocation;
}

/** Fluent Builder für eine Select-Menu-Auswahl, von `Probe.selectMenu()` zurückgegeben. */
export interface SelectMenuInvocation {
  /** Setzt die ausgewählten Werte. Gibt sich selbst zurück, zum Verketten. */
  withValues(values: string[]): SelectMenuInvocation;
  /** Setzt, wer wo auswählt (User, Member, Guild, Channel). Gibt sich selbst zurück, zum Verketten. */
  withContext(context: InteractionContextOverrides): SelectMenuInvocation;
  /** Injiziert die Auswahl und wartet, bis der Bot mindestens einmal geantwortet hat. */
  select(): Promise<void>;
}

/**
 * Baut eine `SelectMenuInvocation`. Nicht Teil der öffentlichen API – nur
 * intern via `Probe.selectMenu()` verwendet. Deckt aktuell nur
 * String-Select ab (siehe `fixtures/message-component-interaction.ts`).
 */
export function createSelectMenuInvocation(
  customId: string,
  inject: (dispatch: ReturnType<typeof buildSelectMenuInteractionDispatch>) => void,
  waitForReply: () => Promise<void>,
  defaultMessageId: () => string | undefined,
): SelectMenuInvocation {
  let values: string[] = [];
  let context: InteractionContextOverrides = {};

  const invocation: SelectMenuInvocation = {
    withValues(newValues) {
      values = newValues;
      return invocation;
    },
    withContext(newContext) {
      context = newContext;
      return invocation;
    },
    async select() {
      inject(buildSelectMenuInteractionDispatch(customId, values, { ...withMessageId(defaultMessageId()), ...context }));
      await waitForReply();
    },
  };

  return invocation;
}
