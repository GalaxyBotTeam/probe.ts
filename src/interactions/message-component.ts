import {
  buildButtonInteractionDispatch,
  buildSelectMenuInteractionDispatch,
} from "../fixtures/message-component-interaction.js";

/** Fluent Builder für einen Button-Klick, von `Probe.button()` zurückgegeben. */
export interface ButtonInvocation {
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
): ButtonInvocation {
  return {
    async click() {
      inject(buildButtonInteractionDispatch(customId));
      await waitForReply();
    },
  };
}

/** Fluent Builder für eine Select-Menu-Auswahl, von `Probe.selectMenu()` zurückgegeben. */
export interface SelectMenuInvocation {
  /** Setzt die ausgewählten Werte. Gibt sich selbst zurück, zum Verketten. */
  withValues(values: string[]): SelectMenuInvocation;
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
): SelectMenuInvocation {
  let values: string[] = [];

  const invocation: SelectMenuInvocation = {
    withValues(newValues) {
      values = newValues;
      return invocation;
    },
    async select() {
      inject(buildSelectMenuInteractionDispatch(customId, values));
      await waitForReply();
    },
  };

  return invocation;
}
