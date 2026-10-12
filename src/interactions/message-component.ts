import type { InteractionContextOverrides } from "../fixtures/interaction-context.js";
import {
  buildButtonInteractionDispatch,
  buildSelectMenuInteractionDispatch,
} from "../fixtures/message-component-interaction.js";

/** `messageId` override only once the bot has sent a message – otherwise the fixture default stays. */
function withMessageId(messageId: string | undefined): { messageId?: string } {
  return messageId ? { messageId } : {};
}

/** Fluent builder for a button click, returned by `Probe.button()`. */
export interface ButtonInvocation {
  /** Sets who clicks where (user, member, guild, channel). Returns itself, for chaining. */
  withContext(context: InteractionContextOverrides): ButtonInvocation;
  /** Injects the click and waits until the bot has responded at least once. */
  click(): Promise<void>;
}

/**
 * Builds a `ButtonInvocation`. Not part of the public API – only used
 * internally via `Probe.button()`.
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

/** Fluent builder for a select menu choice, returned by `Probe.selectMenu()`. */
export interface SelectMenuInvocation {
  /** Sets the selected values. Returns itself, for chaining. */
  withValues(values: string[]): SelectMenuInvocation;
  /** Sets who chooses where (user, member, guild, channel). Returns itself, for chaining. */
  withContext(context: InteractionContextOverrides): SelectMenuInvocation;
  /** Injects the choice and waits until the bot has responded at least once. */
  select(): Promise<void>;
}

/**
 * Builds a `SelectMenuInvocation`. Not part of the public API – only used
 * internally via `Probe.selectMenu()`. Currently covers string selects only
 * (see `fixtures/message-component-interaction.ts`).
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
